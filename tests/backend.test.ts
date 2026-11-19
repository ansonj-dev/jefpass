import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { closeDatabases, listDocuments, readDocument, transaction, writeDocument } from "../lib/db";
import { boundedJson, decryptWallet, encryptWallet, hash, login, logout, rateLimit, register, sessionWorker } from "../lib/auth";
import { canonicalJson, type Challenge } from "../lib/customer-proof";
import { attachNostrReceipt, getReceipt, receiptCommitment, receiptPublicKey, verifyReceipt } from "../lib/receipt";
import { completeJob, createJob, createReceipt, customerAction, disconnectWallet, getCustomer, invoiceJob, ownedJob, passport, reserveInvoice, sanitizeJob, saveWallet, setVisibility, shareJob, updateProfile } from "../lib/service";
import { handleRequest } from "../app/api/[...path]/route";
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools";
import { CUSTOMER_PROOF_KIND, type Job, type Worker } from "../lib/types";

const directory = mkdtempSync(join(tmpdir(), "jefpass-backend-"));
process.env.DB_PATH = join(directory, "test.sqlite");
let owner: Worker;
let other: Worker;
let ownerToken: string;
const secret = generateSecretKey();
const draft = { title: "Private client project", description: "Confidential work details", category: "Design", amountSats: 2500, currency: "SAT" as const };

beforeAll(async () => {
  const first = await register({ name: "Awa", email: "awa@example.test", password: "a-long-test-password", occupation: "Designer" });
  owner = first.worker;
  ownerToken = first.token;
  other = (await register({ name: "Moussa", email: "moussa@example.test", password: "another-long-password", occupation: "Builder" })).worker;
});

function signed(challenge: Challenge, key = secret, createdAt = Math.floor(Date.now() / 1000)) {
  return finalizeEvent({ kind: CUSTOMER_PROOF_KIND, created_at: createdAt, tags: [], content: JSON.stringify(challenge) }, key);
}

function acceptedJob(workerId = owner.id) {
  const result = createJob(workerId, draft);
  const { challenge } = getCustomer(result.token);
  customerAction(result.token, { action: "accept", event: signed(challenge) });
  return result;
}

function completedJob() {
  const result = acceptedJob();
  completeJob(owner.id, result.job.id);
  return result;
}

function api(path: string, method = "GET", body?: unknown, token?: string, headers: Record<string, string> = {}) {
  return handleRequest(new Request(`http://localhost:3000/api/${path}`, {
    method, headers: { origin: "http://localhost:3000", "X-Jefpass": "1", "Content-Type": "application/json",
      ...(token ? { cookie: `jefpass_session=${token}` } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
}

afterAll(() => {
  closeDatabases();
  rmSync(directory, { recursive: true, force: true });
});

describe("durable storage", () => {
  it("persists committed documents across connections and rolls back failed mutations", () => {
    transaction(() => writeDocument("test", "one", { value: 1 }));
    expect(() => transaction(() => {
      writeDocument("test", "one", { value: 2 });
      throw new Error("abort");
    })).toThrow("abort");
    closeDatabases();
    expect(readDocument("test", "one")).toEqual({ value: 1 });
  });
});

describe("passwords and sessions", () => {
  it("salts password hashes and persists only session token hashes", async () => {
    const accounts = listDocuments<{ passwordHash: string; salt: string }>("accounts");
    expect(accounts[0].salt).not.toEqual(accounts[1].salt);
    expect(accounts[0].passwordHash).not.toContain("a-long-test-password");
    expect(readDocument("sessions", ownerToken)).toBeUndefined();
    expect(readDocument("sessions", hash(ownerToken))).toBeDefined();
    closeDatabases();
    expect(sessionWorker(ownerToken)?.id).toBe(owner.id);
    await expect(login({ email: "awa@example.test", password: "wrong-password" })).rejects.toThrow("Invalid email or password");
    await expect(register({ name: "Duplicate", occupation: "Test", email: "AWA@example.test", password: "long-enough-password" })).rejects.toThrow("already registered");
    const result = await login({ email: "awa@example.test", password: "a-long-test-password" });
    expect(result.worker.id).toBe(owner.id);
    logout(result.token);
    expect(sessionWorker(result.token)).toBeNull();
  });

  it("rejects expired sessions", () => {
    writeDocument("sessions", hash("a".repeat(64)), { workerId: owner.id, expiresAt: Date.now() - 1 });
    expect(sessionWorker("a".repeat(64))).toBeNull();
  });

  it("authenticates wallet ciphertext and keeps the key across database reconnects", () => {
    const encrypted = encryptWallet("nostr+walletconnect://private-wallet-secret", "worker-one");
    expect(encrypted).not.toContain("private-wallet-secret");
    closeDatabases();
    expect(decryptWallet(encrypted, "worker-one")).toBe("nostr+walletconnect://private-wallet-secret");
    expect(() => decryptWallet(encrypted, "worker-two")).toThrow();
    const damaged = `${encrypted.slice(0, -1)}${encrypted.endsWith("A") ? "B" : "A"}`;
    expect(() => decryptWallet(damaged, "worker-one")).toThrow();
  });
});

describe("customer capabilities and service state", () => {
  it("deduplicates offline retries without rotating the customer capability", () => {
    const first = createJob(owner.id, { ...draft, clientId: "offline-draft-1" });
    const retry = createJob(owner.id, { ...draft, clientId: "offline-draft-1" });
    expect(retry.job.id).toBe(first.job.id);
    expect(retry.token).toBe("");
    expect(getCustomer(first.token).job.id).toBe(first.job.id);
    expect(() => createJob(owner.id, { ...draft, title: "Changed terms", clientId: "offline-draft-1" })).toThrow("different terms");
    expect(createJob(other.id, { ...draft, clientId: "offline-draft-1" }).job.id).not.toBe(first.job.id);
  });

  it("allows a signed correction request instead of acknowledging completed work", () => {
    const { job, token } = completedJob();
    const { challenge } = getCustomer(token);
    const event = signed({ ...challenge, action: "dispute" });
    expect(customerAction(token, { action: "dispute", event }).state).toBe("DISPUTED");
    expect(ownedJob(owner.id, job.id).acknowledgedAt).toBeUndefined();
  });

  it("rotates hashed seven-day tokens and rejects expired links", () => {
    const { job, token } = createJob(owner.id, draft);
    expect(job.tokenHash).toBe(hash(token));
    expect(job.tokenExpiresAt - Date.now()).toBeGreaterThan(6 * 24 * 60 * 60_000);
    const next = shareJob(owner.id, job.id);
    expect(next).not.toBe(token);
    expect(() => getCustomer(token)).toThrow("expired");
    const updated = ownedJob(owner.id, job.id);
    updated.tokenExpiresAt = Date.now() - 1;
    writeDocument("jobs", job.id, updated);
    expect(() => getCustomer(next)).toThrow("expired");
  });

  it("pins acceptance to a signed browser key, requires that key for acknowledgement, and prevents replay", () => {
    const { job, token } = acceptedJob();
    expect(ownedJob(owner.id, job.id).customerPubkey).toBe(getPublicKey(secret));
    completeJob(owner.id, job.id);
    const { challenge } = getCustomer(token);
    closeDatabases();
    expect(() => customerAction(token, { action: "acknowledge", event: signed(challenge, generateSecretKey()) })).toThrow("does not match");
    const event = signed(challenge);
    const acknowledged = customerAction(token, { action: "acknowledge", event });
    expect(acknowledged.state).toBe("ACKNOWLEDGED");
    expect(acknowledged.payment).toBeUndefined();
    expect(() => customerAction(token, { action: "acknowledge", event })).toThrow();
  });

  it("rejects stale, forged, changed-scope and rotated-token challenges", () => {
    const { job, token } = createJob(owner.id, draft);
    const { challenge } = getCustomer(token);
    expect(() => customerAction(token, { action: "accept", event: signed(challenge, secret, Math.floor(Date.now() / 1000) - 301) })).toThrow("five-minute");
    const nip98 = finalizeEvent({ kind: 27235, created_at: Math.floor(Date.now() / 1000), tags: [], content: JSON.stringify(challenge) }, secret);
    expect(() => customerAction(token, { action: "accept", event: nip98 })).toThrow("signature or kind");
    const forged = { ...signed(challenge), sig: "0".repeat(128) };
    expect(() => customerAction(token, { action: "accept", event: forged })).toThrow("signature");
    expect(() => customerAction(token, { action: "accept", event: signed({ ...challenge, scopeHash: "0".repeat(64) }) })).toThrow("mismatched");
    const next = shareJob(owner.id, job.id);
    expect(() => customerAction(next, { action: "accept", event: signed(challenge) })).toThrow("mismatched");
    expect(customerAction(next, { action: "accept", event: signed(getCustomer(next).challenge) }).state).toBe("ACCEPTED");
  });

  it("consumes dispute nonces once and preserves append-only signed dispute history", () => {
    const { job, token } = completedJob();
    const acknowledged = customerAction(token, { action: "acknowledge", event: signed(getCustomer(token).challenge) });
    expect(acknowledged.state).toBe("ACKNOWLEDGED");
    const first = signed(getCustomer(token).challenge);
    const disputed = customerAction(token, { action: "dispute", event: first });
    expect(disputed.state).toBe("DISPUTED");
    expect(() => customerAction(token, { action: "dispute", event: first })).toThrow("replayed");
    customerAction(token, { action: "dispute", event: signed(getCustomer(token).challenge) });
    expect(ownedJob(owner.id, job.id).acknowledgements).toHaveLength(4);
    expect(completeJob(owner.id, job.id).state).toBe("DISPUTED");
  });

  it("enforces ownership and state transitions", () => {
    const { job } = createJob(owner.id, draft);
    expect(() => ownedJob(other.id, job.id)).toThrow("not found");
    expect(() => completeJob(other.id, job.id)).toThrow("not found");
    expect(() => shareJob(other.id, job.id)).toThrow("not found");
    expect(() => createReceipt(other.id, job.id)).toThrow("not found");
    expect(() => completeJob(owner.id, job.id)).toThrow("accepted");
    expect(() => createReceipt(owner.id, job.id)).toThrow("Complete");
    expect(() => setVisibility(owner.id, job.id, { shared: true })).toThrow("completed");
  });
});

describe("receipts and public privacy", () => {
  it("signs immutable unpaid snapshots, detects tampering and keeps an install-stable issuer", () => {
    const { job } = completedJob();
    const receipt = createReceipt(owner.id, job.id);
    const publicKey = receiptPublicKey();
    expect(receipt.payment.state).toBe("NOT_REQUESTED");
    expect(receipt.payment.preimageVerification).toBe("NOT_VERIFIED");
    expect(receipt.payment.paymentHash).toBeNull();
    expect(receipt.issuer.type).toBe("server");
    expect(verifyReceipt(receipt).valid).toBe(true);
    expect(verifyReceipt({ ...receipt, amountSats: 1 }).valid).toBe(false);
    expect(verifyReceipt(receipt).settlement).toContain("not an independent proof");
    closeDatabases();
    expect(receiptPublicKey()).toBe(publicKey);
    expect(getReceipt(receipt.id)).toEqual(receipt);
    const updated = ownedJob(owner.id, job.id);
    updated.payment = { state: "SETTLED", operationId: "test-operation", source: "test-evidence", network: "regtest",
      walletFingerprint: "test-wallet", expectedMsat: 2_500_000, verifiedAt: new Date().toISOString(),
      settledAt: Math.floor(Date.now() / 1000), preimage: "11".repeat(32), invoice: "private-invoice",
      paymentHash: createHash("sha256").update(Buffer.from("11".repeat(32), "hex")).digest("hex") };
    writeDocument("jobs", job.id, updated);
    const settled = createReceipt(owner.id, job.id);
    expect(settled.id).not.toBe(receipt.id);
    expect(settled.payment.state).toBe("SETTLED");
    expect(getReceipt(receipt.id).payment.state).toBe("NOT_REQUESTED");
    const serialized = JSON.stringify(settled);
    for (const secretValue of [draft.title, draft.description, "private-preimage", "private-invoice", getPublicKey(secret)]) expect(serialized).not.toContain(secretValue);
  });

  it("canonicalizes deterministically with sorted keys and safe integer fields", () => {
    expect(canonicalJson({ z: 2, a: { c: 3, b: "text" } })).toBe(canonicalJson({ a: { b: "text", c: 3 }, z: 2 }));
    expect(() => canonicalJson({ amount: 0.1 })).toThrow("safe integers");
    expect(() => createJob(owner.id, { ...draft, amountSats: Number.MAX_SAFE_INTEGER })).toThrow();
  });

  it("publishes only opted-in completed receipts and removes private job and payment material", () => {
    expect(() => passport(other.id)).toThrow("No public passport");
    const { job, token } = completedJob();
    const updated = ownedJob(owner.id, job.id);
    updated.payment = { state: "PENDING", operationId: "public-test", source: "test", network: "regtest", walletFingerprint: "secret-fingerprint",
      expectedMsat: 2_500_000, invoice: "ln-invoice-for-customer", preimage: "secret-preimage" };
    writeDocument("jobs", job.id, updated);
    createReceipt(owner.id, job.id);
    const customer = getCustomer(token);
    expect(customer.job.payment?.invoice).toBe("ln-invoice-for-customer");
    const customerJson = JSON.stringify(customer);
    expect(customerJson).not.toContain("tokenHash");
    expect(customerJson).not.toContain("secret-preimage");
    expect(customerJson).not.toContain("secret-fingerprint");
    setVisibility(owner.id, job.id, { shared: true });
    const publicData = passport(owner.id);
    expect(publicData.jobs.some((entry) => entry.id === job.id)).toBe(true);
    const publicJson = JSON.stringify(publicData);
    for (const privateValue of [draft.title, draft.description, "ln-invoice-for-customer", "secret-preimage", "tokenHash", "acknowledgements", "customerPubkey"]) expect(publicJson).not.toContain(privateValue);
    setVisibility(owner.id, job.id, { shared: false });
    expect(() => passport(owner.id)).toThrow("No public passport");
  });

  it("stores only verified worker Nostr commitment events with minimal non-PII tags", () => {
    const worker = updateProfile(owner.id, { name: owner.name, occupation: owner.occupation, bio: "", pubkey: getPublicKey(secret) });
    const { job } = completedJob();
    const receipt = createReceipt(owner.id, job.id);
    const template = { kind: 30078, created_at: Math.floor(Date.now() / 1000), tags: [["d", receipt.id]], content: receiptCommitment(receipt) };
    const event = finalizeEvent(structuredClone(template), secret);
    expect(() => attachNostrReceipt(other, receipt.id, { event, relays: [] })).toThrow("not found");
    expect(() => attachNostrReceipt(worker, receipt.id, { event: finalizeEvent(structuredClone(template), generateSecretKey()), relays: [] })).toThrow("Worker signature");
    expect(() => attachNostrReceipt(worker, receipt.id, { event: finalizeEvent({ ...template, content: draft.title }, secret), relays: [] })).toThrow();
    expect(() => attachNostrReceipt(worker, receipt.id, { event: finalizeEvent({ ...template, tags: [...template.tags, ["customer", "private"]] }, secret), relays: [] })).toThrow();
    expect(readDocument("receiptNostr", receipt.id)).toBeUndefined();
    expect(attachNostrReceipt(worker, receipt.id, { event, relays: ["wss://relay.example.test"] }).event.id).toBe(event.id);
    expect(readDocument("receiptNostr", receipt.id)).toBeDefined();
    expect(verifyReceipt(receipt).workerSignature?.valid).toBe(true);
    expect(verifyReceipt(receipt).workerSignature?.publicKey).toBe(getPublicKey(secret));
    const attachment = readDocument<{ event: unknown; relays: string[]; workerPubkey?: string }>("receiptNostr", receipt.id)!;
    writeDocument("receiptNostr", receipt.id, { ...attachment, workerPubkey: getPublicKey(generateSecretKey()) });
    expect(verifyReceipt(receipt).workerSignature?.valid).toBe(false);
    expect(verifyReceipt({ ...receipt, amountSats: 10 }).workerSignature?.valid).toBe(false);
  });
});

describe("durable invoice reservation without external API calls", () => {
  it("classifies a locally undecryptable wallet credential as a safe preflight failure", async () => {
    const { job } = acceptedJob(other.id);
    completeJob(other.id, job.id);
    writeDocument("wallets", other.id, { encryptedUri: "invalid-ciphertext", fingerprint: "wallet-one", source: "NWC", network: "regtest" });
    const result = await invoiceJob(other.id, job.id);
    expect(result.payment?.state).toBe("FAILED");
    expect(result.payment?.invoice).toBeUndefined();
    expect(result.payment?.paymentHash).toBeUndefined();
    expect(result.payment?.error).toContain("No invoice request was sent");
  });
  it("allows a new invoice attempt only after a confirmed preflight failure with no invoice identity", () => {
    const { job } = acceptedJob(other.id);
    completeJob(other.id, job.id);
    writeDocument("wallets", other.id, { encryptedUri: encryptWallet("nostr+walletconnect://test-only", other.id), fingerprint: "wallet-one", source: "NWC", network: "regtest" });
    const updated = ownedJob(other.id, job.id);
    updated.payment = { state: "FAILED", operationId: "known-preflight-failure", source: "NWC", network: "regtest",
      walletFingerprint: "wallet-one", expectedMsat: draft.amountSats * 1000, error: "Preflight failed before dispatch" };
    writeDocument("jobs", job.id, updated);
    const retry = reserveInvoice(other.id, job.id);
    expect(retry.wallet).not.toBeNull();
    expect(retry.job.payment?.state).toBe("UNKNOWN");
    expect(retry.job.payment?.operationId).not.toBe("known-preflight-failure");
  });
  it("reserves UNKNOWN once, survives a crash, never reissues and blocks wallet changes", async () => {
    const { job } = acceptedJob(other.id);
    completeJob(other.id, job.id);
    writeDocument("wallets", other.id, { encryptedUri: encryptWallet("nostr+walletconnect://test-only", other.id), fingerprint: "wallet-one", source: "NWC", network: "regtest" });
    const first = reserveInvoice(other.id, job.id);
    expect(first.wallet).not.toBeNull();
    expect(first.job.payment).toMatchObject({ state: "UNKNOWN", expectedMsat: draft.amountSats * 1000, network: "regtest", walletFingerprint: "wallet-one" });
    closeDatabases();
    const second = reserveInvoice(other.id, job.id);
    expect(second.wallet).toBeNull();
    expect(second.job.payment?.operationId).toBe(first.job.payment?.operationId);
    const third = await invoiceJob(other.id, job.id);
    expect(third.payment).toEqual(first.job.payment);
    expect(() => disconnectWallet(other.id)).toThrow("unresolved");
    await expect(saveWallet(other.id, { uri: "nostr+walletconnect://test-only" })).rejects.toThrow("unresolved");
    expect(sanitizeJob(third)).not.toHaveProperty("tokenHash");
  });
});

describe("HTTP security and response contracts", () => {
  it("returns direct JSON envelopes and never creates seeded credentials", async () => {
    const anonymous = await api("session");
    expect(anonymous.status).toBe(200);
    expect(await anonymous.json()).toMatchObject({ worker: null, wallet: null });
    const session = await api("session", "GET", undefined, ownerToken);
    expect(await session.json()).toMatchObject({ worker: { id: owner.id }, receiptPublicKey: receiptPublicKey() });
    expect((await api("jobs")).status).toBe(401);
    const foreign = createJob(other.id, draft);
    expect((await api(`jobs/${foreign.job.id}`, "GET", undefined, ownerToken)).status).toBe(404);
    const response = await api("jobs", "POST", draft, ownerToken);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ job: { title: draft.title }, customerUrl: expect.stringContaining("/confirm/") });
  });

  it("requires exact same origin and the custom header on mutations", async () => {
    expect((await api("jobs", "POST", draft, ownerToken, { origin: "https://attacker.test" })).status).toBe(403);
    expect((await api("jobs", "POST", draft, ownerToken, { "X-Jefpass": "0" })).status).toBe(403);
    const response = await handleRequest(new Request("http://localhost:3000/api/jobs", { method: "POST", headers: { "X-Jefpass": "1" }, body: "{}" }));
    expect(response.status).toBe(403);
    expect(await response.json()).toHaveProperty("error");
  });

  it("bounds actual streamed JSON bytes and rejects unknown fields and invalid prices", async () => {
    const response = await api("jobs", "POST", { ...draft, description: "x".repeat(33_000) }, ownerToken);
    expect(response.status).toBe(413);
    expect((await api("jobs", "POST", { ...draft, state: "ACKNOWLEDGED" }, ownerToken)).status).toBe(400);
    expect((await api("jobs", "POST", { ...draft, amountSats: 1.5 }, ownerToken)).status).toBe(400);
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(32 * 1024 + 1)); controller.close(); } });
    await expect(boundedJson(new Request("http://localhost/", { method: "POST", headers: { "Content-Type": "application/json" }, body: stream, duplex: "half" } as RequestInit))).rejects.toThrow("32KB");
  });

  it("issues HttpOnly same-site cookies and revokes them on logout", async () => {
    const response = await api("auth/login", "POST", { email: "awa@example.test", password: "a-long-test-password" });
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    const token = cookie.split(";")[0].split("=")[1];
    expect(sessionWorker(token)?.id).toBe(owner.id);
    const result = await api("auth/logout", "POST", {}, token);
    expect(result.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(sessionWorker(token)).toBeNull();
  });

  it("enforces a durable request budget", () => {
    rateLimit("test-budget", 1);
    closeDatabases();
    expect(() => rateLimit("test-budget", 1)).toThrow("Too many requests");
  });
});