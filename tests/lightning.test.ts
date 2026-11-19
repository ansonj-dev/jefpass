import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { encode, sign } from "bolt11";
import { assessSettlement, configuredNetwork, connectWallet, createInvoice, reconcilePayment, validateCapabilities, validateConnection, validateInvoice, type WalletClient, type WalletResult } from "../lib/lightning/nwc";
import type { Payment } from "../lib/types";

const preimage = "42".repeat(32);
const paymentHash = createHash("sha256").update(Buffer.from(preimage, "hex")).digest("hex");
const uri = `nostr+walletconnect://${"a".repeat(64)}?relay=wss%3A%2F%2Frelay.example.test%2F&secret=${"b".repeat(64)}`;
const methods = ["get_info", "make_invoice", "lookup_invoice"];
const network = { bech32: "bcrt", pubKeyHash: 111, scriptHash: 196, validWitnessVersions: [0, 1] };

function fixtureInvoice(amount = "1000000", timestamp = Math.floor(Date.now() / 1000)) {
  return sign(encode({ network, millisatoshis: amount, timestamp, tags: [
    { tagName: "payment_hash", data: paymentHash }, { tagName: "description", data: "UNIT TEST FIXTURE - NOT A REAL WALLET INVOICE" },
    { tagName: "expire_time", data: 3600 },
  ] }), "01".repeat(32)).paymentRequest!;
}
function payment(): Payment {
  return { state: "PENDING", operationId: "unit-test-not-a-payment", source: validateConnection(uri).source,
    network: "regtest", walletFingerprint: validateConnection(uri).fingerprint, expectedMsat: 1000000,
    invoice: fixtureInvoice(), paymentHash };
}
function client(result: WalletResult): WalletClient {
  return { getInfo: vi.fn(async () => ({ network: "regtest", methods })), makeInvoice: vi.fn(async () => result), lookupInvoice: vi.fn(async () => result), close: vi.fn() };
}
const settled = (): WalletResult => ({ type: "incoming", state: "settled", payment_hash: paymentHash, amount: 1000000, preimage, settled_at: Math.floor(Date.now() / 1000) });

beforeEach(() => { vi.stubEnv("LIGHTNING_NETWORK", "regtest"); vi.stubEnv("NWC_ALLOWED_RELAYS", "wss://relay.example.test/"); });
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("BOLT11 validation with explicitly synthetic signed unit fixtures", () => {
  it("applies the standard one-hour expiry when the optional expiry tag is absent", () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const invoice = sign(encode({ network, millisatoshis: "1000000", timestamp, tags: [
      { tagName: "payment_hash", data: paymentHash }, { tagName: "description", data: "TEST fixture" },
    ] }, false), "01".repeat(32)).paymentRequest!;
    expect(validateInvoice(invoice, 1000000, "regtest").expiresAt).toBe(timestamp + 3600);
    expect(() => validateInvoice(invoice, 1000000, "regtest", false, (timestamp + 3601) * 1000)).toThrow("expired");
  });
  it("accepts an exact signed regtest invoice", () => expect(validateInvoice(fixtureInvoice(), 1000000, "regtest").paymentHash).toBe(paymentHash));
  it("rejects invalid invoices, wrong amount, network and expired requests", () => {
    expect(() => validateInvoice("not-an-invoice", 1000000, "regtest")).toThrow();
    expect(() => validateInvoice(fixtureInvoice(), 999999, "regtest")).toThrow("amount");
    expect(() => validateInvoice(fixtureInvoice(), 1000000, "signet")).toThrow("network");
    expect(() => validateInvoice(fixtureInvoice("1000000", 100), 1000000, "regtest")).toThrow("expired");
  });
  it("rejects mainnet even with a nominal enable flag", () => {
    vi.stubEnv("LIGHTNING_NETWORK", "mainnet"); vi.stubEnv("ALLOW_MAINNET", "true");
    expect(configuredNetwork).toThrow("disabled");
  });
});

describe("least-privilege wallet connection", () => {
  it("fails closed without an exact relay allowlist", () => {
    vi.stubEnv("NWC_ALLOWED_RELAYS", ""); expect(() => validateConnection(uri)).toThrow("Configure");
  });
  it("rejects spending scopes and wrong networks", () => {
    expect(() => validateCapabilities({ network: "regtest", methods: [...methods, "pay_invoice"] })).toThrow("receive-only");
    expect(() => validateCapabilities({ network: "mainnet", methods })).toThrow("network");
  });
  it("connects using the client capability query", async () => {
    const wallet = client({});
    expect(await connectWallet(uri, () => wallet)).toMatchObject({ network: "regtest", fingerprint: validateConnection(uri).fingerprint });
    expect(wallet.getInfo).toHaveBeenCalledOnce(); expect(wallet.close).toHaveBeenCalled();
  });
});

describe("authoritative settlement checks using fixture wallet responses only", () => {
  it("requires exact preimage, hash, amount and incoming settlement", () => {
    expect(assessSettlement(payment(), settled())).toMatchObject({ state: "SETTLED", preimage });
    expect(assessSettlement(payment(), { ...settled(), preimage: "00".repeat(32) }).state).toBe("UNKNOWN");
    expect(assessSettlement(payment(), { ...settled(), preimage: undefined }).state).toBe("UNKNOWN");
    expect(() => assessSettlement(payment(), { ...settled(), payment_hash: "ff".repeat(32) })).toThrow("match");
    expect(() => assessSettlement(payment(), { ...settled(), type: "outgoing" })).toThrow();
    expect(assessSettlement(payment(), { ...settled(), amount: 999999 }).state).toBe("UNDERPAID");
    expect(assessSettlement(payment(), { ...settled(), amount: 1000001 }).state).toBe("OVERPAID");
  });
  it("does not expire a genuinely settled invoice when checking later", () => {
    const old = { ...payment(), invoice: fixtureInvoice("1000000", Math.floor(Date.now() / 1000) - 7200) };
    expect(assessSettlement(old, settled()).state).toBe("SETTLED");
    expect(assessSettlement(old, { ...settled(), state: "pending", settled_at: undefined }).state).toBe("PENDING");
    expect(assessSettlement(old, { ...settled(), state: "accepted", settled_at: undefined }).state).toBe("PENDING");
    expect(assessSettlement(old, { ...settled(), state: "expired", settled_at: undefined }).state).toBe("EXPIRED");
  });
  it("creates an invoice through the SDK interface and preserves its identity", async () => {
    const reserved = { ...payment(), state: "UNKNOWN" as const, invoice: undefined, paymentHash: undefined };
    const wallet = client({ ...settled(), state: "pending", invoice: fixtureInvoice() });
    const result = await createInvoice(uri, reserved, () => wallet);
    expect(result.state).toBe("INVOICE_CREATED");
    expect(wallet.makeInvoice).toHaveBeenCalledExactlyOnceWith({ amount: 1000000, description: `JefPass ${reserved.operationId}`, expiry: 3600 });
    await createInvoice(uri, result, () => wallet);
    expect(wallet.makeInvoice).toHaveBeenCalledOnce();
  });
  it("reconciles UNKNOWN against the same hash without creating or spending", async () => {
    const wallet = client(settled());
    vi.mocked(wallet.lookupInvoice).mockRejectedValueOnce(new Error("network timeout"));
    const unknown = await reconcilePayment(uri, payment(), () => wallet);
    expect(unknown.state).toBe("UNKNOWN");
    const recovered = await reconcilePayment(uri, unknown, () => wallet);
    expect(recovered.state).toBe("SETTLED");
    expect(wallet.lookupInvoice).toHaveBeenNthCalledWith(1, { payment_hash: paymentHash });
    expect(wallet.lookupInvoice).toHaveBeenNthCalledWith(2, { payment_hash: paymentHash });
    expect(wallet.makeInvoice).not.toHaveBeenCalled();
  });
  it("turns a creation timeout into UNKNOWN without generating a replacement", async () => {
    const reserved = { ...payment(), state: "UNKNOWN" as const, invoice: undefined, paymentHash: undefined };
    const wallet = client({}); vi.mocked(wallet.makeInvoice).mockRejectedValue(new Error("timeout"));
    const result = await createInvoice(uri, reserved, () => wallet);
    expect(result.state).toBe("UNKNOWN");
    expect((await reconcilePayment(uri, result, () => wallet)).state).toBe("UNKNOWN");
    expect(wallet.makeInvoice).toHaveBeenCalledOnce();
  });
});