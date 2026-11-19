import type { Job, Worker } from "./types";
import type { Event, EventTemplate } from "nostr-tools";
import { verifyEvent } from "nostr-tools";

export interface Session {
  worker: Worker | null;
  network: string;
  wallet: { connected: boolean; source?: string; network?: string } | null;
  receiptPublicKey?: string;
}

export interface Receipt {
  id: string;
  commitment: string;
  signature: string;
  issuer: { type: "server"; algorithm: "Ed25519"; publicKey: string };
  payment: { state: string; expectedMsat: number; network: string | null; verifiedAt: string | null; settledAt: number | null };
  [key: string]: unknown;
}

export interface ReceiptVerificationRecord {
  workerSignature: { event: Event; relays: string[]; valid: boolean; meaning: string } | null;
  [key: string]: unknown;
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isSafeInteger(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  throw new Error("Canonical JSON accepts only JSON values and safe integers");
}

export const receiptCommitmentContent = (receipt: Receipt) => canonicalJson({ commitment: receipt.commitment, receiptId: receipt.id });

export function verifyReceiptEvent(event: Event, receipt: Receipt, expectedPubkey?: string): boolean {
  try {
    return Object.keys(event).sort().join(",") === "content,created_at,id,kind,pubkey,sig,tags" &&
      /^[a-f0-9]{64}$/.test(event.id) && /^[a-f0-9]{64}$/.test(event.pubkey) && /^[a-f0-9]{128}$/.test(event.sig) &&
      Number.isSafeInteger(event.created_at) && event.created_at >= 0 &&
      event.kind === 30078 && event.content.length <= 8192 && event.content === receiptCommitmentContent(receipt) &&
      event.tags.length === 1 && event.tags[0].length === 2 && event.tags[0][0] === "d" && event.tags[0][1] === receipt.id &&
      event.tags[0][1].length <= 1024 &&
      (!expectedPubkey || event.pubkey === expectedPubkey) && verifyEvent(JSON.parse(JSON.stringify(event)));
  } catch { return false; }
}

export async function verifyReceiptInBrowser(receipt: Receipt) {
  const { signature, commitment, ...payload } = receipt;
  const canonical = new TextEncoder().encode(canonicalJson(payload));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", canonical));
  const commitmentValid = Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("") === commitment;
  const decode = (value: string) => Uint8Array.from(atob(value), character => character.charCodeAt(0));
  const key = await crypto.subtle.importKey("spki", decode(receipt.issuer.publicKey), { name: "Ed25519" }, false, ["verify"]);
  const signatureValid = await crypto.subtle.verify("Ed25519", key, decode(signature), canonical);
  return { commitmentValid, signatureValid };
}

export interface JobInput {
  title: string;
  description: string;
  category: string;
  amountSats: number;
  currency: "SAT";
  displayAmount?: string;
  dueDate?: string;
  clientId?: string;
}

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: EventTemplate): Promise<Event>;
    };
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(["POST", "DELETE"].includes(method) ? { "X-Jefpass": "1" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.error || `Request failed (${response.status})`, response.status);
  if (data === null && response.status !== 204) throw new ApiError("The server returned an invalid response.", response.status);
  return data as T;
}

export const getJob = (id: string) => api<{ job: Job }>(`/api/jobs/${encodeURIComponent(id)}`);
export const absoluteUrl = (path: string) => new URL(path, window.location.origin).href;

export function customerConfirmationUrl(path: string) {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) throw new Error("The customer link must belong to this application.");
  if (url.pathname.startsWith("/customer/")) url.pathname = url.pathname.replace(/^\/customer\//, "/confirm/");
  return url.href;
}

export function safeUrl(value: string): string | null {
  try {
    const url = new URL(value, window.location.origin);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}