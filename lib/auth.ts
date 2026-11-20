import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { linkSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { databasePath, deleteDocument, getDb, getRequestSecret, insertDocument, isRemoteDatabaseRequest, readDocument, transaction, writeDocument } from "./db";
import type { Worker } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(32).toString("hex");
const derive = promisify(scrypt);
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(12).max(256);
export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100), email, password,
  occupation: z.string().trim().min(1).max(120),
}).strict();
export const loginSchema = z.object({ email, password: z.string().min(1).max(256) }).strict();
type Account = { workerId: string; email: string; salt: string; passwordHash: string };
type Session = { workerId: string; expiresAt: number };
export const SESSION_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_COOKIE = "jefpass_session";

function newSession(workerId: string): string {
  const token = randomToken();
  insertDocument("sessions", hash(token), { workerId, expiresAt: Date.now() + SESSION_SECONDS * 1000 });
  return token;
}

export async function register(input: unknown): Promise<{ worker: Worker; token: string }> {
  const data = registerSchema.parse(input);
  const salt = randomBytes(32).toString("hex");
  const passwordHash = (await derive(data.password, salt, 64) as Buffer).toString("hex");
  return transaction(() => {
    const accountId = hash(data.email);
    if (readDocument("accounts", accountId)) throw new ApiError(409, "Email is already registered");
    const worker: Worker = { id: randomUUID(), name: data.name, occupation: data.occupation, bio: "" };
    insertDocument("accounts", accountId, { workerId: worker.id, email: data.email, salt, passwordHash });
    insertDocument("workers", worker.id, worker);
    return { worker, token: newSession(worker.id) };
  });
}

export async function login(input: unknown): Promise<{ worker: Worker; token: string }> {
  const data = loginSchema.parse(input);
  const account = readDocument<Account>("accounts", hash(data.email));
  const candidate = await derive(data.password, account?.salt ?? "0".repeat(64), 64) as Buffer;
  const expected = Buffer.from(account?.passwordHash ?? "0".repeat(128), "hex");
  if (!timingSafeEqual(candidate, expected) || !account) throw new ApiError(401, "Invalid email or password");
  return transaction(() => {
    const worker = readDocument<Worker>("workers", account.workerId);
    if (!worker) throw new ApiError(401, "Account unavailable");
    return { worker, token: newSession(worker.id) };
  });
}

export function sessionWorker(token?: string): Worker | null {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = readDocument<Session>("sessions", hash(token));
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    deleteDocument("sessions", hash(token));
    return null;
  }
  return readDocument<Worker>("workers", session.workerId) ?? null;
}

export function logout(token?: string): void {
  if (token) deleteDocument("sessions", hash(token));
}

export function installSecret(filename: string, generate: () => Buffer): Buffer {
  if (isRemoteDatabaseRequest()) {
    const secret = getRequestSecret(filename);
    if (!secret) throw new Error(`Persistent Appwrite secret "${filename}" is unavailable`);
    return secret;
  }
  getDb();
  const path = join(dirname(databasePath()), filename);
  try { return readFileSync(path); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const generated = generate();
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, generated, { flag: "wx", mode: 0o600, flush: true });
  try {
    linkSync(temporary, path);
    return generated;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    return readFileSync(path);
  } finally { unlinkSync(temporary); }
}

function encryptionKey(): Buffer {
  const configured = process.env.APP_ENCRYPTION_KEY;
  const key = configured
    ? Buffer.from(configured, /^[a-fA-F0-9]{64}$/.test(configured) ? "hex" : "base64")
    : installSecret("key", () => randomBytes(32));
  if (key.length !== 32) throw new Error("APP_ENCRYPTION_KEY must encode exactly 32 bytes (hex or base64)");
  return key;
}

function walletAad(workerId: string): Buffer {
  return Buffer.from(`jefpass:nwc:v1:${workerId}`, "utf8");
}

export function encryptWallet(uri: string, workerId = "legacy"): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  cipher.setAAD(walletAad(workerId));
  const ciphertext = Buffer.concat([cipher.update(uri, "utf8"), cipher.final()]);
  return `v1.${Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString("base64")}`;
}

export function decryptWallet(encrypted: string, workerId = "legacy"): string {
  if (encrypted.startsWith("v1.")) {
    const bytes = Buffer.from(encrypted.slice(3), "base64");
    if (bytes.length < 29) throw new Error("Invalid encrypted wallet envelope");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), bytes.subarray(0, 12));
    decipher.setAAD(walletAad(workerId));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8");
  }
  // Backward-compatible reader for ciphertext written before worker-bound AAD.
  const bytes = Buffer.from(encrypted, "base64");
  if (bytes.length < 29) throw new Error("Invalid legacy encrypted wallet envelope");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8");
}

export function rateLimit(key: string, limit = 120, intervalMs = 60_000): void {
  const remote = isRemoteDatabaseRequest();
  // A single global counter would serialize every Appwrite request and create
  // unnecessary database writes. Per-caller and per-action limits remain.
  if (remote && key === "global") return;

  transaction(() => {
    const database = getDb();
    const now = Date.now();
    if (!remote) database.prepare("DELETE FROM rate_limits WHERE reset_at <= ?").run(now);
    let row = database.prepare("SELECT count, reset_at FROM rate_limits WHERE id = ?").get(key) as
      { count: number; reset_at: number } | undefined;
    if (remote && row && Number(row.reset_at) <= now) {
      database.prepare("DELETE FROM rate_limits WHERE id = ?").run(key);
      row = undefined;
    }
    if (row && Number(row.count) >= limit) throw new ApiError(429, "Too many requests; try again later");
    database.prepare(`INSERT INTO rate_limits(id,count,reset_at) VALUES(?,1,?)
      ON CONFLICT(id) DO UPDATE SET count = count + 1, reset_at = excluded.reset_at`).run(key, now + intervalMs);
  });
}

export function requestOrigin(request: Request): string {
  const configured = process.env.APP_ORIGIN?.trim();
  if (configured) {
    let origin: URL;
    try { origin = new URL(configured); } catch { throw new ApiError(500, "APP_ORIGIN must be an absolute origin URL"); }
    if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password ||
        origin.pathname !== "/" || origin.search || origin.hash) {
      throw new ApiError(500, "APP_ORIGIN must contain only the application origin");
    }
    if (process.env.NODE_ENV === "production" && origin.protocol !== "https:") {
      throw new ApiError(500, "Production APP_ORIGIN must use HTTPS");
    }
    return origin.origin;
  }
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(500, "APP_ORIGIN must be configured explicitly in production");
  }
  const url = new URL(request.url);
  return new URL(`${url.protocol}//${request.headers.get("host") || url.host}`).origin;
}

export function validateMutation(request: Request): void {
  if (request.headers.get("origin") !== requestOrigin(request) || request.headers.get("x-jefpass") !== "1") {
    throw new ApiError(403, "Same-origin request with X-Jefpass: 1 required");
  }
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw new ApiError(403, "Cross-site request rejected");
}

export async function boundedJson(request: Request): Promise<unknown> {
  const maximum = 32 * 1024;
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") ?? "")) {
    throw new ApiError(415, "Content-Type must be application/json");
  }
  if (Number(request.headers.get("content-length")) > maximum) throw new ApiError(413, "JSON body exceeds 32KB");
  if (!request.body) throw new ApiError(400, "JSON body required");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) {
        await reader.cancel();
        throw new ApiError(413, "JSON body exceeds 32KB");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
  catch { throw new ApiError(400, "Invalid JSON body"); }
}