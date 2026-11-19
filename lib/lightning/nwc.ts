import { createHash } from "node:crypto";
import { NWCClient } from "@getalby/sdk/nwc";
import { decode } from "bolt11";
import type { Payment } from "../types";

export interface WalletResult {
  type?: string; state?: string; invoice?: string; payment_hash?: string;
  amount?: number; preimage?: string; settled_at?: number; expires_at?: number;
}
export interface WalletClient {
  getInfo(): Promise<{ network: string; methods: string[] }>;
  makeInvoice(request: { amount: number; description: string; expiry: number }): Promise<WalletResult>;
  lookupInvoice(request: { payment_hash: string }): Promise<WalletResult>;
  close(): void;
}
type ClientFactory = (uri: string) => WalletClient;
const digest = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const hex32 = /^[a-f0-9]{64}$/;
const networks = new Set(["regtest", "signet", "testnet", "mainnet"]);
const silentLogger = { debug() {} };

export function configuredNetwork(): string {
  const network = process.env.LIGHTNING_NETWORK || "regtest";
  if (!networks.has(network)) throw new Error("Unsupported Lightning network");
  if (network === "mainnet") throw new Error("Mainnet is disabled in this MVP");
  return network;
}

export function validateConnection(uri: string) {
  const url = new URL(uri);
  if (url.protocol !== "nostr+walletconnect:" || !hex32.test(url.hostname) || url.username || url.password || (url.pathname && url.pathname !== "/")) {
    throw new Error("Invalid NWC connection");
  }
  const secret = url.searchParams.get("secret");
  if (!secret || !hex32.test(secret) || /^0+$/.test(secret)) throw new Error("Invalid NWC credential");
  const relays = url.searchParams.getAll("relay");
  const allowlist = (process.env.NWC_ALLOWED_RELAYS || "").split(",").map(value => value.trim()).filter(Boolean);
  if (!relays.length || relays.length > 4 || !allowlist.length) throw new Error("Configure NWC_ALLOWED_RELAYS before connecting a wallet");
  for (const relay of relays) {
    const target = new URL(relay);
    if (target.protocol !== "wss:" || target.username || target.password || target.hash || !allowlist.includes(target.href)) {
      throw new Error("Wallet relay is not explicitly allowed");
    }
  }
  return { fingerprint: digest(`${url.hostname}:${digest(secret)}`), source: `NWC ${url.hostname.slice(0, 12)}` };
}

export function validateCapabilities(info: { network: string; methods: string[] }, expected = configuredNetwork()) {
  if (info.network !== expected) throw new Error("Wallet network differs from configured network");
  if (!Array.isArray(info.methods) || !["get_info", "make_invoice", "lookup_invoice"].every(method => info.methods.includes(method))) {
    throw new Error("Wallet needs get_info, make_invoice and lookup_invoice");
  }
  if (info.methods.some(method => !["get_info", "make_invoice", "lookup_invoice"].includes(method))) {
    throw new Error("Use a least-privilege receive-only connection with exactly get_info, make_invoice and lookup_invoice");
  }
}

export function validateInvoice(invoice: string, expectedMsat: number, network: string, allowExpired = false, now = Date.now()) {
  if (typeof invoice !== "string" || invoice.length > 20000) throw new Error("Missing or oversized BOLT11 invoice");
  const decoded = decode(invoice);
  const expectedPrefix = network === "regtest" ? "bcrt" : network === "mainnet" ? "bc" : "tb";
  if (!networks.has(network) || decoded.network?.bech32 !== expectedPrefix) throw new Error("Invoice network mismatch");
  if (!Number.isSafeInteger(expectedMsat) || expectedMsat <= 0 || decoded.millisatoshis !== String(expectedMsat)) throw new Error("Invoice amount mismatch");
  const paymentHash = decoded.tagsObject.payment_hash;
  if (!paymentHash || !hex32.test(paymentHash) || !decoded.signature || !decoded.payeeNodeKey) throw new Error("Incomplete signed BOLT11 invoice");
  const expiresAt = decoded.timeExpireDate ?? (decoded.timestamp !== undefined ? decoded.timestamp + 3600 : undefined);
  if (!expiresAt || !Number.isSafeInteger(expiresAt) || (!allowExpired && expiresAt * 1000 <= now)) throw new Error("Invoice expired");
  return { paymentHash, expiresAt, payeeNodeKey: decoded.payeeNodeKey };
}

export function assessSettlement(payment: Payment, result: WalletResult, now = Date.now()): Payment {
  if (!payment.invoice || !payment.paymentHash) throw new Error("Cannot reconcile without the original invoice identity");
  const invoice = validateInvoice(payment.invoice, payment.expectedMsat, payment.network, true, now);
  if (invoice.paymentHash !== payment.paymentHash || result.payment_hash !== payment.paymentHash || result.type !== "incoming" ||
      (result.invoice && result.invoice.toLowerCase() !== payment.invoice.toLowerCase())) throw new Error("Wallet response does not match the original invoice");
  const base = { ...payment, error: undefined, verifiedAt: undefined, preimage: undefined };
  if (result.state && !["settled", "pending", "accepted", "expired", "failed", "cancelled"].includes(result.state)) {
    return { ...base, state: "UNKNOWN", error: "Wallet returned an unrecognized invoice state" };
  }
  if (!Number.isSafeInteger(result.amount) || (result.amount ?? 0) <= 0) throw new Error("Wallet amount is missing");
  if (result.amount !== payment.expectedMsat) return { ...base, state: result.amount! < payment.expectedMsat ? "UNDERPAID" : "OVERPAID", error: "Wallet amount differs from agreed invoice" };
  const reportsSettlement = result.state === "settled" || (!result.state && !!result.settled_at);
  if (reportsSettlement) {
    if (!result.preimage || !hex32.test(result.preimage) || digest(Buffer.from(result.preimage, "hex")) !== payment.paymentHash ||
        !Number.isSafeInteger(result.settled_at) || result.settled_at! <= 0 || result.settled_at! * 1000 > now + 300000) {
      return { ...base, state: "UNKNOWN", error: "Wallet reported settlement but exact preimage evidence is unavailable or invalid" };
    }
    return { ...base, state: "SETTLED", preimage: result.preimage, settledAt: result.settled_at, verifiedAt: new Date(now).toISOString() };
  }
  if (result.state === "failed") return { ...base, state: "FAILED" };
  if (result.state === "cancelled") return { ...base, state: "CANCELLED" };
  if (result.state === "expired") return { ...base, state: "EXPIRED" };
  if (["pending", "accepted"].includes(result.state || "") || (!result.state && !result.settled_at)) return { ...base, state: "PENDING" };
  return { ...base, state: "UNKNOWN", error: "Wallet returned an ambiguous invoice state" };
}

const defaultFactory: ClientFactory = uri => new NWCClient({ nostrWalletConnectUrl: uri, logger: silentLogger });

async function usingClient<T>(uri: string, factory: ClientFactory, operation: (client: WalletClient) => Promise<T>): Promise<T> {
  validateConnection(uri);
  const client = factory(uri);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation(client), new Promise<never>((_, reject) => {
      timer = setTimeout(() => { client.close(); reject(new Error("Wallet outcome unknown after timeout")); }, 20000);
    })]);
  } finally { if (timer) clearTimeout(timer); client.close(); }
}

export async function connectWallet(uri: string, factory = defaultFactory) {
  const identity = validateConnection(uri);
  const network = configuredNetwork();
  await usingClient(uri, factory, async client => validateCapabilities(await client.getInfo(), network));
  return { ...identity, network };
}

function pinWallet(uri: string, payment: Payment) {
  const identity = validateConnection(uri);
  if (identity.fingerprint !== payment.walletFingerprint || payment.network !== configuredNetwork()) throw new Error("Original wallet and network required");
}

export async function createInvoice(uri: string, payment: Payment, factory = defaultFactory): Promise<Payment> {
  if (payment.invoice || payment.paymentHash) return payment;
  try {
    pinWallet(uri, payment);
    return await usingClient(uri, factory, async client => {
      validateCapabilities(await client.getInfo(), payment.network);
      const result = await client.makeInvoice({ amount: payment.expectedMsat, description: `JefPass ${payment.operationId}`, expiry: 3600 });
      if (!result.invoice) throw new Error("Wallet did not return an invoice");
      const identity = validateInvoice(result.invoice, payment.expectedMsat, payment.network);
      if (result.type !== "incoming" || result.amount !== payment.expectedMsat || result.payment_hash !== identity.paymentHash) throw new Error("Wallet invoice identity mismatch");
      return { ...payment, state: "INVOICE_CREATED", invoice: result.invoice, paymentHash: identity.paymentHash, expiresAt: identity.expiresAt, error: undefined };
    });
  } catch {
    return { ...payment, state: "UNKNOWN", error: "Invoice creation outcome unknown. Do not create another request; inspect the original wallet operation." };
  }
}

export async function reconcilePayment(uri: string, payment: Payment, factory = defaultFactory): Promise<Payment> {
  if (payment.state === "SETTLED") return payment;
  if (!payment.paymentHash || !payment.invoice) return { ...payment, state: "UNKNOWN", error: "Original invoice missing; wallet-side investigation required. Automatic creation is blocked." };
  try {
    pinWallet(uri, payment);
    return await usingClient(uri, factory, async client => {
      validateCapabilities(await client.getInfo(), payment.network);
      return assessSettlement(payment, await client.lookupInvoice({ payment_hash: payment.paymentHash! }));
    });
  } catch {
    return { ...payment, state: "UNKNOWN", verifiedAt: undefined, error: "Wallet could not confirm the original invoice. Reconcile again; do not pay a replacement." };
  }
}