import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools";
import { canonicalJson, receiptCommitmentContent, verifyReceiptEvent, verifyReceiptInBrowser, type Receipt } from "../lib/client";

function signedReceipt(): Receipt {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const payload = {
    version: 1, id: "receipt-123", issuedAt: "2026-11-19T10:00:00.000Z",
    issuer: { type: "server" as const, algorithm: "Ed25519" as const, publicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64") },
    workerId: "worker-123", jobId: "job-123", scopeHash: "a".repeat(64), serviceState: "COMPLETED",
    amountSats: 1200, currency: "SAT", completedAt: "2026-11-19T09:00:00.000Z", acknowledgedAt: null,
    payment: { state: "PENDING", expectedMsat: 1200000, network: "signet", verifiedAt: null, settledAt: null },
  };
  const canonical = canonicalJson(payload);
  return { ...payload, commitment: createHash("sha256").update(canonical).digest("hex"), signature: sign(null, Buffer.from(canonical), privateKey).toString("base64") };
}

describe("browser receipt canonical JSON", () => {
  it("sorts nested keys while retaining array order and Unicode", () => {
    expect(canonicalJson({ zebra: [3, { zebra: null, alpha: "réçu" }], alpha: true }))
      .toBe('{"alpha":true,"zebra":[3,{"alpha":"réçu","zebra":null}]}');
  });

  it.each([undefined, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])("rejects unsupported canonical values: %s", value => {
    expect(() => canonicalJson({ value })).toThrow();
  });

  it("matches the backend's minimal sorted commitment content", () => {
    const receipt = signedReceipt();
    expect(receiptCommitmentContent(receipt)).toBe(`{"commitment":"${receipt.commitment}","receiptId":"receipt-123"}`);
  });
});

describe("independent browser Ed25519 verification", () => {
  it("checks a real server-format SPKI signature and SHA-256 commitment", async () => {
    expect(await verifyReceiptInBrowser(signedReceipt())).toEqual({ commitmentValid: true, signatureValid: true });
  });

  it("does not depend on JSON property insertion order", async () => {
    const receipt = signedReceipt();
    const reordered = Object.fromEntries(Object.entries(receipt).reverse()) as Receipt;
    expect(await verifyReceiptInBrowser(reordered)).toEqual({ commitmentValid: true, signatureValid: true });
  });

  it("rejects changed payment evidence", async () => {
    const receipt = signedReceipt();
    receipt.payment.state = "SETTLED";
    expect(await verifyReceiptInBrowser(receipt)).toEqual({ commitmentValid: false, signatureValid: false });
  });

  it("detects a false commitment despite a valid payload signature", async () => {
    expect(await verifyReceiptInBrowser({ ...signedReceipt(), commitment: "0".repeat(64) }))
      .toEqual({ commitmentValid: false, signatureValid: true });
  });

  it("detects a false signature despite a correct commitment", async () => {
    expect(await verifyReceiptInBrowser({ ...signedReceipt(), signature: Buffer.alloc(64).toString("base64") }))
      .toEqual({ commitmentValid: true, signatureValid: false });
  });
});

describe("Nostr receipt binding before publication", () => {
  const secret = generateSecretKey();
  const workerKey = getPublicKey(secret);
  const receipt = signedReceipt();
  const template = () => ({ kind: 30078, created_at: 1795082400, content: receiptCommitmentContent(receipt), tags: [["d", receipt.id]] });

  it("accepts the exact signed backend contract", () => {
    expect(verifyReceiptEvent(finalizeEvent(template(), secret), receipt, workerKey)).toBe(true);
  });

  it.each([
    { tags: [] },
    { tags: [["d", "another-receipt"]] },
    { tags: [["d", receipt.id, "extra"]] },
    { tags: [["d", receipt.id], ["extra"]] },
    { content: JSON.stringify({ schema: "jefpass.commitment.v1", commitment: receipt.commitment }) },
    { content: JSON.stringify({ receiptId: receipt.id, commitment: receipt.commitment }) },
    { content: canonicalJson({ commitment: "0".repeat(64), receiptId: receipt.id }) },
    { kind: 1 },
    { created_at: -1 },
  ])("rejects a valid signature on the wrong event contract: %j", change => {
    expect(verifyReceiptEvent(finalizeEvent({ ...template(), ...change }, secret), receipt, workerKey)).toBe(false);
  });

  it("rejects a different worker key", () => {
    expect(verifyReceiptEvent(finalizeEvent(template(), generateSecretKey()), receipt, workerKey)).toBe(false);
  });

  it("rejects extra root fields rejected by the strict backend schema", () => {
    const event = { ...finalizeEvent(template(), secret), extra: "unattachable" };
    expect(verifyReceiptEvent(event, receipt, workerKey)).toBe(false);
  });

  it("does not trust nostr-tools' cached verification after mutation", () => {
    const event = finalizeEvent(template(), secret);
    expect(verifyReceiptEvent(event, receipt, workerKey)).toBe(true);
    event.sig = "0".repeat(128);
    expect(verifyReceiptEvent(event, receipt, workerKey)).toBe(false);
  });
});