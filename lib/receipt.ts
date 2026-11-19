import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomUUID, sign, verify } from "node:crypto";
import { ApiError, hash, installSecret } from "./auth";
import { canonicalJson, scopeHash, verifiedNostrEvent } from "./customer-proof";
import { insertDocument, listDocuments, readDocument, transaction, writeDocument } from "./db";
import type { Job, Worker } from "./types";
import { z } from "zod";

export interface ReceiptPayload {
  version: 1;
  id: string;
  issuedAt: string;
  issuer: { type: "server"; algorithm: "Ed25519"; publicKey: string };
  workerId: string;
  jobId: string;
  scopeHash: string;
  serviceState: Job["state"];
  amountSats: number;
  currency: "SAT";
  completedAt: string | null;
  acknowledgedAt: string | null;
  payment: { state: string; expectedMsat: number; network: string | null; source: string | null;
    paymentHash: string | null; preimageVerification: "SHA256_MATCH" | "NOT_VERIFIED";
    verifiedAt: string | null; settledAt: number | null };
}
export interface Receipt extends ReceiptPayload { commitment: string; signature: string }
type NostrAttachment = { event: ReturnType<typeof verifiedNostrEvent>; relays: string[]; workerPubkey?: string };

function issuerKey() {
  return createPrivateKey(installSecret("issuer-private.pem", () => {
    const { privateKey } = generateKeyPairSync("ed25519");
    return Buffer.from(privateKey.export({ type: "pkcs8", format: "pem" }));
  }));
}

export function receiptPublicKey(): string {
  return createPublicKey(issuerKey()).export({ type: "spki", format: "der" }).toString("base64");
}

export function issueReceipt(job: Job): Receipt {
  if (!job.completedAt || !["COMPLETED", "ACKNOWLEDGED", "DISPUTED"].includes(job.state)) {
    throw new ApiError(409, "Complete the job before issuing a receipt");
  }
  if (job.payment?.state === "SETTLED" && (!job.payment.verifiedAt || !job.payment.preimage ||
      !/^[a-f0-9]{64}$/.test(job.payment.preimage) || !job.payment.paymentHash ||
      createHash("sha256").update(Buffer.from(job.payment.preimage, "hex")).digest("hex") !== job.payment.paymentHash)) {
    throw new ApiError(409, "Stored settlement evidence is incomplete or invalid");
  }
  const payload: ReceiptPayload = {
    version: 1, id: randomUUID(), issuedAt: new Date().toISOString(),
    issuer: { type: "server", algorithm: "Ed25519", publicKey: receiptPublicKey() },
    workerId: job.workerId, jobId: job.id, scopeHash: scopeHash(job), serviceState: job.state,
    amountSats: job.amountSats, currency: job.currency,
    completedAt: job.completedAt ?? null, acknowledgedAt: job.acknowledgedAt ?? null,
    payment: { state: job.payment?.state ?? "NOT_REQUESTED", expectedMsat: job.amountSats * 1000,
      network: job.payment?.network ?? null, verifiedAt: job.payment?.verifiedAt ?? null,
      source: job.payment?.source ?? null, paymentHash: job.payment?.paymentHash ?? null,
      preimageVerification: job.payment?.state === "SETTLED" && !!job.payment.verifiedAt ? "SHA256_MATCH" : "NOT_VERIFIED",
      settledAt: job.payment?.settledAt ?? null },
  };
  const canonical = canonicalJson(payload);
  const receipt: Receipt = { ...payload, commitment: hash(canonical), signature: sign(null, Buffer.from(canonical), issuerKey()).toString("base64") };
  insertDocument("receipts", receipt.id, receipt);
  return receipt;
}

export function verifyReceipt(receipt: Receipt) {
  let signatureValid = false;
  let commitmentValid = false;
  try {
    const { signature, commitment, ...payload } = receipt;
    const canonical = canonicalJson(payload);
    commitmentValid = hash(canonical) === commitment;
    signatureValid = verify(null, Buffer.from(canonical), createPublicKey({
      key: Buffer.from(receipt.issuer.publicKey, "base64"), type: "spki", format: "der",
    }), Buffer.from(signature, "base64"));
  } catch { signatureValid = false; }
  const trustedIssuer = receipt.issuer?.publicKey === receiptPublicKey() && receipt.issuer?.type === "server" && receipt.issuer?.algorithm === "Ed25519";
  const attachment = readDocument<NostrAttachment>("receiptNostr", receipt.id);
  const worker = readDocument<Worker>("workers", receipt.workerId);
  const workerPubkey = attachment?.workerPubkey ?? worker?.pubkey ?? null;
  let workerSignatureValid = false;
  if (attachment) {
    try {
      const event = verifiedNostrEvent(attachment.event, 30078);
      workerSignatureValid = commitmentValid && !!workerPubkey && event.pubkey === workerPubkey &&
        event.content === receiptCommitment(receipt) && event.tags.length === 1 &&
        event.tags[0].length === 2 && event.tags[0][0] === "d" && event.tags[0][1] === receipt.id;
    } catch { workerSignatureValid = false; }
  }
  return {
    valid: signatureValid && commitmentValid && trustedIssuer,
    signatureValid, commitmentValid, trustedIssuer,
    issuer: "Application server, not the worker or customer. A worker Nostr attachment is verified separately.",
    settlement: "Payment status is a server snapshot of wallet evidence at issuance, not an independent proof of Lightning settlement. Service completion and customer acknowledgement do not prove payment.",
    workerSignature: attachment ? { valid: workerSignatureValid, publicKey: workerPubkey, ...attachment,
      meaning: "Optional worker signature over the receipt commitment only. The worker key was checked when attached; this does not independently prove service delivery or payment." } : null,
  };
}

export function getReceipt(id: string): Receipt {
  const receipt = readDocument<Receipt>("receipts", id);
  if (!receipt) throw new ApiError(404, "Receipt not found");
  return receipt;
}

export function workerReceipts(workerId: string): Receipt[] {
  return listDocuments<Receipt>("receipts").filter((receipt) => receipt.workerId === workerId);
}

export function receiptCommitment(receipt: Receipt): string {
  return canonicalJson({ receiptId: receipt.id, commitment: receipt.commitment });
}

export function attachNostrReceipt(worker: Worker, id: string, input: unknown) {
  const data = z.object({ event: z.unknown(), relays: z.array(z.string().url().max(500).refine((url) => new URL(url).protocol === "wss:")).max(8) }).strict().parse(input);
  const event = verifiedNostrEvent(data.event, 30078);
  return transaction(() => {
    const receipt = getReceipt(id);
    if (receipt.workerId !== worker.id) throw new ApiError(404, "Receipt not found");
    if (!worker.pubkey || event.pubkey !== worker.pubkey || event.content !== receiptCommitment(receipt) ||
        event.tags.length !== 1 || event.tags[0].length !== 2 || event.tags[0][0] !== "d" || event.tags[0][1] !== receipt.id) {
      throw new ApiError(400, "Worker signature, minimal commitment and d tag naming receipt are required");
    }
    writeDocument("receiptNostr", id, { event, relays: data.relays, workerPubkey: worker.pubkey });
    return { event, relays: data.relays };
  });
}