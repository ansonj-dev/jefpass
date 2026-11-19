import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError, decryptWallet, encryptWallet, hash, randomToken } from "./auth";
import { actionSchema, challengeFor, consumeCustomerProof } from "./customer-proof";
import { deleteDocument, insertDocument, listDocuments, readDocument, transaction, writeDocument } from "./db";
import { issueReceipt, receiptPublicKey, workerReceipts } from "./receipt";
import type { Job, Payment, Worker } from "./types";

const timestamp = () => new Date().toISOString();
const maximumSats = Math.floor(Number.MAX_SAFE_INTEGER / 1000);
export const jobSchema = z.object({
  title: z.string().trim().min(1).max(200), description: z.string().trim().min(1).max(8000),
  category: z.string().trim().min(1).max(100), amountSats: z.number().int().positive().max(maximumSats),
  currency: z.literal("SAT"), displayAmount: z.string().trim().max(100).optional(),
  dueDate: z.string().max(40).refine((value) => Number.isFinite(Date.parse(value)), "Invalid date").optional(),
  clientId: z.string().trim().min(1).max(200).optional(),
}).strict();
export const emptySchema = z.object({}).strict();
type Wallet = { encryptedUri: string; fingerprint: string; source: string; network: string };

export function ownedJob(workerId: string, id: string): Job {
  const job = readDocument<Job>("jobs", id);
  if (!job || job.workerId !== workerId) throw new ApiError(404, "Job not found");
  return job;
}

function newShare(job: Job): string {
  const token = randomToken();
  job.tokenHash = hash(token);
  job.tokenExpiresAt = Date.now() + 7 * 24 * 60 * 60_000;
  return token;
}

export function createJob(workerId: string, input: unknown) {
  const { clientId, ...data } = jobSchema.parse(input);
  return transaction(() => {
    const clientKey = clientId ? hash(`${workerId}:${clientId}`) : undefined;
    const previous = clientKey ? readDocument<{ jobId: string; inputHash: string }>("jobClients", clientKey) : undefined;
    const inputHash = hash(JSON.stringify(data));
    if (previous) {
      if (previous.inputHash !== inputHash) throw new ApiError(409, "This draft ID was already used with different terms");
      return { job: ownedJob(workerId, previous.jobId), token: "" };
    }
    const job: Job = { ...data, id: randomUUID(), workerId, state: "QUOTED", createdAt: timestamp(),
      tokenHash: "", tokenExpiresAt: 0, acknowledgements: [], shared: false };
    const token = newShare(job);
    insertDocument("jobs", job.id, job);
    if (clientKey) insertDocument("jobClients", clientKey, { jobId: job.id, inputHash });
    return { job, token };
  });
}

export function jobsFor(workerId: string): Job[] {
  return listDocuments<Job>("jobs").filter((job) => job.workerId === workerId);
}

export function shareJob(workerId: string, id: string): string {
  return transaction(() => {
    const job = ownedJob(workerId, id);
    const token = newShare(job);
    writeDocument("jobs", id, job);
    return token;
  });
}

function customerJob(token: string): Job {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new ApiError(404, "Customer link not found or expired");
  const tokenHash = hash(token);
  const job = listDocuments<Job>("jobs").find((entry) => entry.tokenHash === tokenHash);
  if (!job || job.tokenExpiresAt <= Date.now()) throw new ApiError(404, "Customer link not found or expired");
  return job;
}

export function sanitizeJob(job: Job, audience: "owner" | "customer" | "public" = "owner") {
  const { tokenHash, tokenExpiresAt, customerPubkey, acknowledgements, payment, ...safe } = job;
  void tokenHash; void tokenExpiresAt; void customerPubkey; void acknowledgements;
  const safePayment = payment ? (() => {
    const { preimage, ...rest } = payment;
    void preimage;
    return rest;
  })() : undefined;
  if (audience === "public") {
    return { id: job.id, workerId: job.workerId, category: job.category, amountSats: job.amountSats,
      currency: job.currency, state: job.state, createdAt: job.createdAt, completedAt: job.completedAt,
      acknowledgedAt: job.acknowledgedAt, receiptId: job.receiptId, shared: true,
      payment: payment ? { state: payment.state, expectedMsat: payment.expectedMsat, network: payment.network,
        verifiedAt: payment.verifiedAt, settledAt: payment.settledAt } : undefined };
  }
  if (audience === "customer" && safePayment) {
    return { ...safe, payment: { state: safePayment.state, invoice: safePayment.invoice,
      paymentHash: safePayment.paymentHash, expectedMsat: safePayment.expectedMsat,
      network: safePayment.network, expiresAt: safePayment.expiresAt, verifiedAt: safePayment.verifiedAt } };
  }
  return { ...safe, ...(safePayment ? { payment: safePayment } : {}) };
}

export function getCustomer(token: string) {
  return transaction(() => {
    const job = customerJob(token);
    const worker = readDocument<Worker>("workers", job.workerId);
    if (!worker) throw new ApiError(404, "Worker not found");
    return { job: sanitizeJob(job, "customer"), worker, challenge: challengeFor(job) };
  });
}

export function customerAction(token: string, input: unknown): Job {
  const data = z.object({ action: actionSchema, event: z.unknown() }).strict().parse(input);
  return transaction(() => {
    const job = customerJob(token);
    if ((data.action === "accept" && job.state !== "QUOTED") ||
        (data.action === "acknowledge" && job.state !== "COMPLETED") ||
        (data.action === "dispute" && !["QUOTED", "ACCEPTED", "COMPLETED", "ACKNOWLEDGED", "DISPUTED"].includes(job.state))) throw new ApiError(409, "Invalid service state for this action");
    const event = consumeCustomerProof(job, data.action, data.event);
    if (data.action === "accept") {
      job.customerPubkey = event.pubkey;
      job.acceptedAt = timestamp();
      job.state = "ACCEPTED";
    } else if (data.action === "acknowledge") {
      job.acknowledgedAt = timestamp();
      job.state = "ACKNOWLEDGED";
    } else job.state = "DISPUTED";
    job.acknowledgements.push({ action: data.action, event, recordedAt: timestamp() });
    writeDocument("jobs", job.id, job);
    return job;
  });
}

export function completeJob(workerId: string, id: string): Job {
  return transaction(() => {
    const job = ownedJob(workerId, id);
    if (job.completedAt) return job;
    if (job.state !== "ACCEPTED") throw new ApiError(409, "Only an accepted job can be completed");
    job.state = "COMPLETED";
    job.completedAt = timestamp();
    writeDocument("jobs", id, job);
    return job;
  });
}

export function setVisibility(workerId: string, id: string, input: unknown): Job {
  const { shared } = z.object({ shared: z.boolean() }).strict().parse(input);
  return transaction(() => {
    const job = ownedJob(workerId, id);
    if (shared && (!job.completedAt || !job.receiptId)) throw new ApiError(409, "Only completed jobs with a receipt can be public");
    job.shared = shared;
    writeDocument("jobs", id, job);
    return job;
  });
}

export function createReceipt(workerId: string, id: string) {
  return transaction(() => {
    const job = ownedJob(workerId, id);
    const receipt = issueReceipt(job);
    job.receiptId = receipt.id;
    writeDocument("jobs", id, job);
    return receipt;
  });
}

export function updateProfile(workerId: string, input: unknown): Worker {
  const data = z.object({ name: z.string().trim().min(1).max(100), occupation: z.string().trim().min(1).max(120),
    bio: z.string().trim().max(2000), pubkey: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict().parse(input);
  return transaction(() => {
    const worker = readDocument<Worker>("workers", workerId);
    if (!worker) throw new ApiError(401, "Authentication required");
    const updated = { id: workerId, ...data };
    writeDocument("workers", workerId, updated);
    return updated;
  });
}

export function passport(workerId: string) {
  const worker = readDocument<Worker>("workers", workerId);
  const jobs = jobsFor(workerId).filter((job) => job.shared && job.completedAt && job.receiptId);
  if (!worker || jobs.length === 0) throw new ApiError(404, "No public passport");
  const ids = new Set(jobs.map((job) => job.id));
  return { worker, jobs: jobs.map((job) => sanitizeJob(job, "public")), receipts: workerReceipts(workerId).filter((receipt) => ids.has(receipt.jobId)) };
}

export function exportWorker(worker: Worker) {
  const receipts = workerReceipts(worker.id);
  return { worker, jobs: jobsFor(worker.id).map((job) => {
    const { tokenHash, tokenExpiresAt, ...privateJob } = job;
    void tokenHash; void tokenExpiresAt;
    return privateJob;
  }), receipts, nostr: receipts.flatMap(receipt => {
    const attachment = readDocument<{ event: unknown; relays: string[] }>("receiptNostr", receipt.id);
    return attachment ? [{ receiptId: receipt.id, ...attachment }] : [];
  }) };
}

function walletFor(workerId: string): Wallet {
  const wallet = readDocument<Wallet>("wallets", workerId);
  if (!wallet) throw new ApiError(409, "Connect a wallet first");
  return wallet;
}

export function sessionStatus(worker: Worker | null) {
  const wallet = worker ? readDocument<Wallet>("wallets", worker.id) : undefined;
  return { worker, network: wallet?.network ?? process.env.LIGHTNING_NETWORK ?? "regtest",
    wallet: wallet ? { connected: true, source: wallet.source, network: wallet.network } : null,
    receiptPublicKey: receiptPublicKey() };
}

function assertWalletMutable(workerId: string): void {
  const unresolved = jobsFor(workerId).some((job) => job.payment &&
    !["SETTLED", "EXPIRED", "FAILED", "CANCELLED"].includes(job.payment.state));
  if (unresolved) throw new ApiError(409, "Wallet cannot change while invoices or operations remain unresolved");
}

export async function saveWallet(workerId: string, input: unknown) {
  const { uri } = z.object({ uri: z.string().min(1).max(4096).refine((value) => {
    try { return new URL(value).protocol === "nostr+walletconnect:"; } catch { return false; }
  }, "Nostr Wallet Connect URI required") }).strict().parse(input);
  assertWalletMutable(workerId);
  const { connectWallet } = await import("@/lib/lightning/nwc");
  let connection;
  try { connection = await connectWallet(uri); } catch { throw new ApiError(400, "Wallet connection or validation failed"); }
  const validated = z.object({ fingerprint: z.string().min(1).max(256), source: z.string().min(1).max(100), network: z.string().min(1).max(100) }).parse(connection);
  const encryptedUri = encryptWallet(uri, workerId);
  return transaction(() => {
    assertWalletMutable(workerId);
    writeDocument("wallets", workerId, { ...validated, encryptedUri });
    return { wallet: { connected: true, source: validated.source, network: validated.network } };
  });
}

export function disconnectWallet(workerId: string) {
  return transaction(() => {
    assertWalletMutable(workerId);
    deleteDocument("wallets", workerId);
    return { wallet: null };
  });
}

const paymentSchema = z.object({
  state: z.enum(["NOT_REQUESTED", "INVOICE_CREATED", "PENDING", "UNKNOWN", "SETTLED", "EXPIRED", "FAILED", "CANCELLED", "UNDERPAID", "OVERPAID"]),
  operationId: z.string(), source: z.string(), network: z.string(), walletFingerprint: z.string(),
  expectedMsat: z.number().int().positive().safe(), invoice: z.string().max(20000).optional(),
  paymentHash: z.string().regex(/^[a-f0-9]{64}$/).optional(), preimage: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  expiresAt: z.number().int().safe().nonnegative().optional(), settledAt: z.number().int().safe().nonnegative().optional(),
  verifiedAt: z.string().datetime().optional(), error: z.string().max(1000).optional(),
}).strict();

function checkedPayment(value: unknown, reserved: Payment): Payment {
  const payment = paymentSchema.parse(value);
  if (payment.operationId !== reserved.operationId || payment.walletFingerprint !== reserved.walletFingerprint ||
      payment.network !== reserved.network || payment.source !== reserved.source || payment.expectedMsat !== reserved.expectedMsat ||
      (reserved.paymentHash && payment.paymentHash !== reserved.paymentHash) ||
      (reserved.invoice && payment.invoice !== reserved.invoice) || payment.state === "NOT_REQUESTED") throw new Error("Wallet changed reserved payment identity");
  if (payment.state === "SETTLED" && (!payment.verifiedAt || !payment.preimage || !payment.paymentHash ||
      !payment.settledAt || hashPreimage(payment.preimage) !== payment.paymentHash)) throw new Error("Invalid settlement evidence");
  if (["INVOICE_CREATED", "PENDING", "SETTLED", "UNDERPAID", "OVERPAID"].includes(payment.state) && (!payment.invoice || !payment.paymentHash)) {
    throw new Error("Missing invoice identity");
  }
  if (payment.state !== "SETTLED") delete payment.verifiedAt;
  return payment;
}

const hashPreimage = (preimage: string) => createHash("sha256").update(Buffer.from(preimage, "hex")).digest("hex");

function savePayment(workerId: string, id: string, before: Payment, payment: Payment): Job {
  return transaction(() => {
    const current = ownedJob(workerId, id);
    if (JSON.stringify(current.payment) === JSON.stringify(before)) {
      current.payment = payment;
      writeDocument("jobs", id, current);
    }
    return current;
  });
}

export function reserveInvoice(workerId: string, id: string) {
  return transaction(() => {
    const job = ownedJob(workerId, id);
    const retryKnownPreflightFailure = job.payment?.state === "FAILED" && !job.payment.invoice && !job.payment.paymentHash;
    if (job.payment && !retryKnownPreflightFailure) return { job, wallet: null };
    if (!job.completedAt || !["COMPLETED", "ACKNOWLEDGED"].includes(job.state)) {
      throw new ApiError(409, "Complete the accepted work before requesting payment");
    }
    if (!job.acceptedAt) throw new ApiError(409, "Customer acceptance is required before payment");
    const wallet = walletFor(workerId);
    job.payment = { state: "UNKNOWN", operationId: randomUUID(), source: wallet.source, network: wallet.network,
      walletFingerprint: wallet.fingerprint, expectedMsat: job.amountSats * 1000 };
    writeDocument("jobs", id, job);
    return { job, wallet };
  });
}

export async function invoiceJob(workerId: string, id: string): Promise<Job> {
  const reservation = reserveInvoice(workerId, id);
  if (!reservation.wallet) return reservation.job;
  const before = reservation.job.payment!;
  let payment: Payment;
  try {
    const { createInvoice } = await import("@/lib/lightning/nwc");
    payment = checkedPayment(await createInvoice(decryptWallet(reservation.wallet.encryptedUri, workerId), { ...before }), before);
  } catch {
    payment = { ...before, state: "UNKNOWN", error: "Invoice creation outcome is unknown; automatic retry is disabled" };
  }
  return savePayment(workerId, id, before, payment);
}

export async function reconcileJob(workerId: string, id: string): Promise<Job> {
  const job = ownedJob(workerId, id);
  if (!job.payment) throw new ApiError(409, "No payment has been requested");
  if (!job.payment.paymentHash || !job.payment.invoice) {
    throw new ApiError(409, "No original invoice identity is available. Do not retry automatically; resolve the original wallet operation first.");
  }
  if (job.payment.state === "SETTLED") return job;
  const wallet = walletFor(workerId);
  if (wallet.fingerprint !== job.payment.walletFingerprint || wallet.network !== job.payment.network) {
    throw new ApiError(409, "Reconnect the original invoice wallet and network");
  }
  const before = job.payment;
  let payment: Payment;
  try {
    const { reconcilePayment } = await import("@/lib/lightning/nwc");
    payment = checkedPayment(await reconcilePayment(decryptWallet(wallet.encryptedUri, workerId), { ...before }), before);
  } catch { throw new ApiError(502, "Wallet reconciliation could not be verified"); }
  return savePayment(workerId, id, before, payment);
}