import { AsyncLocalStorage } from "node:async_hooks";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

type D1DocumentRow = { kind: string; id: string; body: string };
type D1RateLimitRow = { id: string; count: number; reset_at: number };
type D1SecretRow = { name: string; value: string };

type D1Result<T = unknown> = { results?: T[]; success?: boolean };
type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
};
type D1Binding = {
  prepare(sql: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(sql: string): Promise<unknown>;
};

declare global {
  // Set by worker.js before OpenNext dispatches each request.
  // The binding is a capability supplied by Cloudflare, never by the browser.
  var __JEFPASS_D1__: D1Binding | undefined;
  var __JEFPASS_D1_SCHEMA_READY__: boolean | undefined;
}

type D1Operation = {
  sql: string;
  values: unknown[];
  label: "document-insert" | "other";
};

type RemoteContext = {
  database: DatabaseSync;
  d1: D1Binding;
  secrets: Map<string, Buffer>;
  operations: D1Operation[];
};

const requestContext = new AsyncLocalStorage<RemoteContext>();
const databases = new Map<string, DatabaseSync>();
const MAX_D1_BATCH_OPERATIONS = 100;

const D1_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS documents (kind TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL CHECK(json_valid(body)), PRIMARY KEY(kind, id));",
  "CREATE TABLE IF NOT EXISTS rate_limits (id TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);",
  "CREATE TABLE IF NOT EXISTS app_secrets (name TEXT PRIMARY KEY, value TEXT NOT NULL);",
].join("\n");

export class D1DatabaseUnavailableError extends Error {
  constructor(message = "The Cloudflare D1 binding is unavailable") {
    super(message);
    this.name = "D1DatabaseUnavailableError";
  }
}

export class D1AccountConflictError extends Error {
  constructor() {
    super("Email is already registered");
    this.name = "D1AccountConflictError";
  }
}

export function databasePath(): string {
  return process.env.DB_PATH || join(process.cwd(), "data", "jefpass.sqlite");
}

function createDatabase(filename: string): DatabaseSync {
  const database = new DatabaseSync(filename);
  if (filename !== ":memory:") {
    database.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 5000;");
  }
  database.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      kind TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL CHECK(json_valid(body)),
      PRIMARY KEY(kind, id)
    );
    CREATE TABLE IF NOT EXISTS rate_limits (
      id TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL
    );
  `);
  return database;
}

function documentKey(kind: string, id: string): string {
  return kind + "\u0000" + id;
}

function cloneMap<T>(source: Map<string, T>): Map<string, T> {
  return new Map(source);
}

/**
 * Implements only the small synchronous SQL surface used by the existing
 * service layer. All reads are hydrated from D1 at request start, and every
 * write is recorded as a prepared D1 statement for one atomic D1 batch.
 *
 * This compatibility layer deliberately does not expose a general SQL engine.
 * Add a matching implementation and a test whenever the service SQL changes.
 */
class D1SynchronousDatabase {
  private documents = new Map<string, D1DocumentRow>();
  private rateLimits = new Map<string, D1RateLimitRow>();
  private snapshots: Array<{
    documents: Map<string, D1DocumentRow>;
    rateLimits: Map<string, D1RateLimitRow>;
    operationLength: number;
  }> = [];
  readonly operations: D1Operation[] = [];

  constructor(documents: D1DocumentRow[], rateLimits: D1RateLimitRow[]) {
    for (const row of documents) this.documents.set(documentKey(row.kind, row.id), { ...row });
    for (const row of rateLimits) this.rateLimits.set(row.id, { ...row });
  }

  exec(sql: string): void {
    const normalized = sql.trim().replace(/\s+/g, " ").toUpperCase();
    if (normalized === "BEGIN IMMEDIATE" || normalized === "BEGIN") {
      this.snapshots.push({
        documents: cloneMap(this.documents),
        rateLimits: cloneMap(this.rateLimits),
        operationLength: this.operations.length,
      });
      return;
    }
    if (normalized === "COMMIT") {
      if (!this.snapshots.length) throw new Error("No active transaction to commit");
      this.snapshots.pop();
      return;
    }
    if (normalized === "ROLLBACK") {
      const snapshot = this.snapshots.pop();
      if (!snapshot) throw new Error("No active transaction to roll back");
      this.documents = snapshot.documents;
      this.rateLimits = snapshot.rateLimits;
      this.operations.length = snapshot.operationLength;
      return;
    }
    throw new Error("Unsupported SQL command in the Cloudflare D1 compatibility layer");
  }

  prepare(sql: string): ReturnType<DatabaseSync["prepare"]> {
    const database = this;
    const statement = {
      get: (...values: unknown[]) => database.get(sql, values),
      all: (...values: unknown[]) => database.all(sql, values),
      run: (...values: unknown[]) => database.run(sql, values),
    };
    return statement as unknown as ReturnType<DatabaseSync["prepare"]>;
  }

  private get(sql: string, values: unknown[]): unknown {
    const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
    if (normalized === "select body from documents where kind = ? and id = ?") {
      const row = this.documents.get(documentKey(String(values[0]), String(values[1])));
      return row ? { body: row.body } : undefined;
    }
    if (normalized === "select count, reset_at from rate_limits where id = ?") {
      const row = this.rateLimits.get(String(values[0]));
      return row ? { count: row.count, reset_at: row.reset_at } : undefined;
    }
    throw new Error("Unsupported SELECT query in the Cloudflare D1 compatibility layer");
  }

  private all(sql: string, values: unknown[]): unknown[] {
    const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
    if (normalized === "select body from documents where kind = ? order by rowid") {
      const kind = String(values[0]);
      return [...this.documents.values()]
        .filter((row) => row.kind === kind)
        .map((row) => ({ body: row.body }));
    }
    throw new Error("Unsupported SELECT query in the Cloudflare D1 compatibility layer");
  }

  private queue(sql: string, values: unknown[], label: D1Operation["label"] = "other"): void {
    this.operations.push({ sql, values: [...values], label });
  }

  private run(sql: string, values: unknown[]): { changes: number; lastInsertRowid: number } {
    const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();

    if (normalized === "insert into documents(kind,id,body) values(?,?,?)") {
      const [kindValue, idValue, bodyValue] = values;
      const kind = String(kindValue);
      const id = String(idValue);
      const body = String(bodyValue);
      const key = documentKey(kind, id);
      if (this.documents.has(key)) {
        throw new Error("UNIQUE constraint failed: documents.kind, documents.id");
      }
      this.documents.set(key, { kind, id, body });
      this.queue("INSERT INTO documents(kind,id,body) VALUES(?,?,?)", [kind, id, body], "document-insert");
      return { changes: 1, lastInsertRowid: 0 };
    }

    if (normalized === "insert into documents(kind,id,body) values(?,?,?) on conflict(kind,id) do update set body = excluded.body") {
      const [kindValue, idValue, bodyValue] = values;
      const kind = String(kindValue);
      const id = String(idValue);
      const body = String(bodyValue);
      const key = documentKey(kind, id);
      const changes = 1;
      this.documents.set(key, { kind, id, body });
      this.queue(
        "INSERT INTO documents(kind,id,body) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET body = excluded.body",
        [kind, id, body],
      );
      return { changes, lastInsertRowid: 0 };
    }

    if (normalized === "delete from documents where kind = ? and id = ?") {
      const [kind, id] = values.map(String);
      const changes = this.documents.delete(documentKey(kind, id)) ? 1 : 0;
      this.queue("DELETE FROM documents WHERE kind = ? AND id = ?", [kind, id]);
      return { changes, lastInsertRowid: 0 };
    }

    if (normalized === "delete from documents where kind = 'nonces' and json_extract(body, '$.expiresat') <= ?") {
      const expiresBefore = Number(values[0]);
      let changes = 0;
      for (const [key, row] of this.documents) {
        if (row.kind !== "nonces") continue;
        const value = JSON.parse(row.body) as { expiresAt?: number };
        if (typeof value.expiresAt === "number" && value.expiresAt <= expiresBefore) {
          this.documents.delete(key);
          this.queue("DELETE FROM documents WHERE kind = ? AND id = ?", [row.kind, row.id]);
          changes += 1;
        }
      }
      return { changes, lastInsertRowid: 0 };
    }

    if (normalized === "delete from rate_limits where reset_at <= ?") {
      const cutoff = Number(values[0]);
      let changes = 0;
      for (const [id, row] of this.rateLimits) {
        if (row.reset_at <= cutoff) {
          this.rateLimits.delete(id);
          changes += 1;
        }
      }
      this.queue("DELETE FROM rate_limits WHERE reset_at <= ?", [cutoff]);
      return { changes, lastInsertRowid: 0 };
    }

    if (normalized === "delete from rate_limits where id = ?") {
      const id = String(values[0]);
      const changes = this.rateLimits.delete(id) ? 1 : 0;
      this.queue("DELETE FROM rate_limits WHERE id = ?", [id]);
      return { changes, lastInsertRowid: 0 };
    }

    if (normalized === "insert into rate_limits(id,count,reset_at) values(?,1,?) on conflict(id) do update set count = count + 1, reset_at = excluded.reset_at") {
      const id = String(values[0]);
      const resetAt = Number(values[1]);
      const previous = this.rateLimits.get(id);
      this.rateLimits.set(id, { id, count: (previous?.count ?? 0) + 1, reset_at: resetAt });
      this.queue(
        "INSERT INTO rate_limits(id,count,reset_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count = count + 1, reset_at = excluded.reset_at",
        [id, resetAt],
      );
      return { changes: 1, lastInsertRowid: 0 };
    }

    throw new Error("Unsupported SQL statement in the Cloudflare D1 compatibility layer");
  }

  close(): void {
    this.documents.clear();
    this.rateLimits.clear();
    this.operations.length = 0;
    this.snapshots.length = 0;
  }
}

export function getDb(): DatabaseSync {
  const active = requestContext.getStore();
  if (active) return active.database;
  if (process.env.JEFPASS_CLOUDFLARE === "true") {
    throw new D1DatabaseUnavailableError("D1 database access is only available inside a Cloudflare request context");
  }

  const filename = databasePath();
  const existing = databases.get(filename);
  if (existing) return existing;
  mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const database = createDatabase(filename);
  databases.set(filename, database);
  return database;
}

export function isRemoteDatabaseRequest(): boolean {
  return requestContext.getStore() !== undefined;
}

export function getRequestSecret(filename: string): Buffer | undefined {
  const secret = requestContext.getStore()?.secrets.get(filename);
  return secret ? Buffer.from(secret) : undefined;
}

async function loadPersistentSecrets(d1: D1Binding, secrets: Map<string, Buffer>): Promise<void> {
  const load = async () => {
    const result = await d1.prepare("SELECT name, value FROM app_secrets").all<D1SecretRow>();
    for (const row of result.results ?? []) {
      if (typeof row.name === "string" && typeof row.value === "string") {
        const value = Buffer.from(row.value, "base64");
        if (value.length) secrets.set(row.name, value);
      }
    }
  };

  await load();

  const missing: Array<{ name: string; value: Buffer }> = [];
  if (!process.env.APP_ENCRYPTION_KEY && !secrets.has("key")) {
    missing.push({ name: "key", value: randomBytes(32) });
  }
  if (!secrets.has("issuer-private.pem")) {
    const pair = generateKeyPairSync("ed25519");
    missing.push({
      name: "issuer-private.pem",
      value: Buffer.from(pair.privateKey.export({ type: "pkcs8", format: "pem" })),
    });
  }

  if (missing.length) {
    await d1.batch(missing.map(({ name, value }) =>
      d1.prepare("INSERT OR IGNORE INTO app_secrets(name,value) VALUES(?,?)")
        .bind(name, value.toString("base64")),
    ));
    // Another isolate may have won the first-write race. Always reload the
    // committed values so this request uses the same durable keys as others.
    secrets.clear();
    await load();
  }

  if (!process.env.APP_ENCRYPTION_KEY && secrets.get("key")?.length !== 32) {
    throw new Error("The persistent JëfPass encryption key is missing or invalid");
  }
  if (!secrets.has("issuer-private.pem")) {
    throw new Error("The persistent JëfPass receipt signing key is unavailable");
  }
}

async function persistD1Operations(context: RemoteContext): Promise<void> {
  if (!context.operations.length) return;
  if (context.operations.length > MAX_D1_BATCH_OPERATIONS) {
    throw new Error(
      "This request requires " + context.operations.length +
      " D1 writes; the per-request safety limit is " + MAX_D1_BATCH_OPERATIONS,
    );
  }

  const insertsAccount = context.operations.some(
    (operation) => operation.label === "document-insert" && operation.values[0] === "accounts",
  );
  const statements = context.operations.map((operation) =>
    context.d1.prepare(operation.sql).bind(...operation.values),
  );
  try {
    await context.d1.batch(statements);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (insertsAccount && /unique|constraint/i.test(message)) throw new D1AccountConflictError();
    throw error;
  }
}

export async function withRequestDatabase<T>(
  request: Request,
  operation: () => Promise<T>,
): Promise<T> {
  void request;
  const d1 = globalThis.__JEFPASS_D1__;
  if (!d1) {
    if (process.env.JEFPASS_CLOUDFLARE === "true") throw new D1DatabaseUnavailableError();
    return operation();
  }

  if (!globalThis.__JEFPASS_D1_SCHEMA_READY__) {
    await d1.exec(D1_SCHEMA);
    globalThis.__JEFPASS_D1_SCHEMA_READY__ = true;
  }

  const [documentResult, rateLimitResult] = await Promise.all([
    d1.prepare("SELECT kind, id, body FROM documents ORDER BY rowid").all<D1DocumentRow>(),
    d1.prepare("SELECT id, count, reset_at FROM rate_limits").all<D1RateLimitRow>(),
  ]);

  const database = new D1SynchronousDatabase(
    documentResult.results ?? [],
    rateLimitResult.results ?? [],
  );
  const context: RemoteContext = {
    database: database as unknown as DatabaseSync,
    d1,
    secrets: new Map(),
    operations: database.operations,
  };

  try {
    await loadPersistentSecrets(d1, context.secrets);
    return await requestContext.run(context, async () => {
      const result = await operation();
      await persistD1Operations(context);
      return result;
    });
  } finally {
    database.close();
    context.secrets.clear();
  }
}

export function transaction<T>(operation: () => T): T {
  const database = getDb();
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    if (result instanceof Promise) throw new Error("SQLite transactions must be synchronous");
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function readDocument<T>(kind: string, id: string): T | undefined {
  const row = getDb().prepare("SELECT body FROM documents WHERE kind = ? AND id = ?").get(kind, id);
  return row ? JSON.parse(row.body as string) as T : undefined;
}

export function listDocuments<T>(kind: string): T[] {
  return getDb().prepare("SELECT body FROM documents WHERE kind = ? ORDER BY rowid").all(kind)
    .map((row) => JSON.parse(row.body as string) as T);
}

export function writeDocument<T>(kind: string, id: string, value: T): void {
  getDb().prepare(`INSERT INTO documents(kind,id,body) VALUES(?,?,?)
    ON CONFLICT(kind,id) DO UPDATE SET body = excluded.body`).run(kind, id, JSON.stringify(value));
}

export function insertDocument<T>(kind: string, id: string, value: T): void {
  getDb().prepare("INSERT INTO documents(kind,id,body) VALUES(?,?,?)").run(kind, id, JSON.stringify(value));
}

export function deleteDocument(kind: string, id: string): void {
  getDb().prepare("DELETE FROM documents WHERE kind = ? AND id = ?").run(kind, id);
}

export function closeDatabases(): void {
  for (const database of databases.values()) database.close();
  databases.clear();
}
