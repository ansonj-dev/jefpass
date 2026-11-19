import { verifyEvent, type Event as NostrEvent } from "nostr-tools";
import { z } from "zod";
import { ApiError, hash, randomToken } from "./auth";
import { deleteDocument, getDb, readDocument, writeDocument } from "./db";
import type { Job } from "./types";

export const actionSchema = z.enum(["accept", "acknowledge", "dispute"]);
export type CustomerAction = z.infer<typeof actionSchema>;
export const nostrEventSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/), pubkey: z.string().regex(/^[a-f0-9]{64}$/),
  sig: z.string().regex(/^[a-f0-9]{128}$/), created_at: z.number().int().safe().nonnegative(),
  kind: z.number().int().nonnegative(), content: z.string().max(8192),
  tags: z.array(z.array(z.string().max(1024)).max(8)).max(32),
}).strict();
export type Challenge = { jobId: string; scopeHash: string; action: CustomerAction; nonce: string };
type NonceRecord = Challenge & { expiresAt: number; tokenHash: string };

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isSafeInteger(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  throw new Error("Canonical JSON accepts only JSON values and safe integers");
}

export function scopeHash(job: Job): string {
  return hash(canonicalJson({ jobId: job.id, workerId: job.workerId, title: job.title,
    description: job.description, category: job.category, amountSats: job.amountSats,
    currency: job.currency, dueDate: job.dueDate ?? null }));
}

export function challengeFor(job: Job): Challenge {
  getDb().prepare("DELETE FROM documents WHERE kind = 'nonces' AND json_extract(body, '$.expiresAt') <= ?").run(Date.now());
  const action = job.state === "QUOTED" ? "accept" : job.state === "COMPLETED" ? "acknowledge" : "dispute";
  const challenge: Challenge = { jobId: job.id, scopeHash: scopeHash(job), action, nonce: randomToken() };
  writeDocument("nonces", hash(challenge.nonce), { ...challenge, tokenHash: job.tokenHash, expiresAt: Date.now() + 5 * 60_000 });
  return challenge;
}

export function verifiedNostrEvent(input: unknown, kind: number): NostrEvent {
  const event = nostrEventSchema.parse(input);
  if (event.kind !== kind || !verifyEvent(event)) throw new ApiError(400, "Invalid Nostr event signature or kind");
  return event;
}

export function consumeCustomerProof(job: Job, action: CustomerAction, input: unknown): NostrEvent {
  const event = verifiedNostrEvent(input, 27235);
  if (Math.abs(event.created_at * 1000 - Date.now()) > 5 * 60_000) throw new ApiError(400, "Customer proof is outside the five-minute window");
  let content: unknown;
  try { content = JSON.parse(event.content); } catch { throw new ApiError(400, "Invalid customer proof content"); }
  const proof = z.object({ jobId: z.string(), scopeHash: z.string(), action: actionSchema, nonce: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(content);
  const nonce = readDocument<NonceRecord>("nonces", hash(proof.nonce));
  if (!nonce || nonce.expiresAt <= Date.now() || nonce.tokenHash !== job.tokenHash ||
      proof.jobId !== job.id || proof.scopeHash !== scopeHash(job) || proof.action !== action ||
      nonce.jobId !== proof.jobId || nonce.scopeHash !== proof.scopeHash || (nonce.action !== action && action !== "dispute")) {
    throw new ApiError(400, "Expired, replayed or mismatched customer challenge");
  }
  if (job.customerPubkey && job.customerPubkey !== event.pubkey) throw new ApiError(403, "Customer key does not match acceptance");
  if (action === "acknowledge" && !job.customerPubkey) throw new ApiError(409, "Customer acceptance is required first");
  deleteDocument("nonces", hash(proof.nonce));
  return event;
}