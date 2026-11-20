import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

type RemoteRecord = {
  record_type: string;
  record_key: string;
  payload: string;
};

type RemoteContext = {
  database: DatabaseSync;
  endpoint: string;
  projectId: string;
  apiKey: string;
  databaseId: string;
  tableId: string;
  secretsTableId: string;
  baseline: Map<string, RemoteRecord>;
  secrets: Map<string, Buffer>;
  transactionId?: string;
  transactionFinished: boolean;
};

const requestContext = new AsyncLocalStorage<RemoteContext>();
const databases = new Map<string, DatabaseSync>();
const PAGE_SIZE = 5000;
const MAX_TRANSACTION_OPERATIONS = 100;

export class AppwriteDatabaseError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "AppwriteDatabaseError";
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

export function getDb(): DatabaseSync {
  const active = requestContext.getStore();
  if (active) return active.database;

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

function rowId(recordType: string, recordKey: string): string {
  return createHash("sha256").update(`${recordType}:${recordKey}`).digest("hex").slice(0, 36);
}

function endpointUrl(context: RemoteContext, path: string): string {
  return `${context.endpoint.replace(/\/+$/, "")}${path}`;
}

async function appwriteRequest<T>(
  context: RemoteContext,
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(endpointUrl(context, path), {
    method,
    headers: {
      "X-Appwrite-Project": context.projectId,
      "X-Appwrite-Key": context.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });

  const text = await response.text();
  let parsed: unknown;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { message: text }; }
  if (!response.ok) {
    const details = parsed && typeof parsed === "object" && "message" in parsed
      ? String((parsed as { message: unknown }).message)
      : "Appwrite request failed";
    throw new AppwriteDatabaseError(`Appwrite TablesDB request failed (${response.status}): ${details}`, response.status);
  }
  return parsed as T;
}

async function listTableRows(context: RemoteContext, tableId: string, transactionId?: string): Promise<Record<string, unknown>[]> {
  const output: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  for (;;) {
    const query = new URLSearchParams();
    query.append("queries[]", `limit(${PAGE_SIZE})`);
    if (cursor) query.append("queries[]", `cursorAfter("${cursor}")`);
    query.set("total", "false");
    if (transactionId) query.set("transactionId", transactionId);
    const result = await appwriteRequest<{ rows?: Record<string, unknown>[] }>(
      context,
      `/tablesdb/${encodeURIComponent(context.databaseId)}/tables/${encodeURIComponent(tableId)}/rows?${query.toString()}`,
    );
    const rows = Array.isArray(result.rows) ? result.rows : [];
    output.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    const lastId = rows[rows.length - 1]?.$id;
    if (typeof lastId !== "string" || lastId === cursor) {
      throw new AppwriteDatabaseError("Appwrite returned an invalid pagination cursor");
    }
    cursor = lastId;
  }
  return output;
}

function rowData(row: Record<string, unknown>): Record<string, unknown> {
  const data = row.data;
  return data && typeof data === "object" && !Array.isArray(data)
    ? data as Record<string, unknown>
    : row;
}

async function createTransaction(context: RemoteContext): Promise<string> {
  const transaction = await appwriteRequest<{ $id?: string }>(context, "/tablesdb/transactions", "POST", { ttl: 60 });
  if (!transaction.$id) throw new AppwriteDatabaseError("Appwrite did not return a transaction ID");
  return transaction.$id;
}

async function stageOperations(
  context: RemoteContext,
  transactionId: string,
  operations: Record<string, unknown>[],
): Promise<void> {
  if (!operations.length) return;
  if (operations.length > MAX_TRANSACTION_OPERATIONS) {
    throw new AppwriteDatabaseError(
      `This request needs ${operations.length} database changes; the current Appwrite transaction limit is ${MAX_TRANSACTION_OPERATIONS}. Retry after the stale records are cleaned up.`,
    );
  }
  await appwriteRequest(
    context,
    `/tablesdb/transactions/${encodeURIComponent(transactionId)}/operations`,
    "POST",
    { operations },
  );
}

async function finishTransaction(context: RemoteContext, transactionId: string, commit: boolean): Promise<void> {
  await appwriteRequest(
    context,
    `/tablesdb/transactions/${encodeURIComponent(transactionId)}`,
    "PATCH",
    commit ? { commit: true } : { rollback: true },
  );
}

async function persistSecretRows(context: RemoteContext, entries: { name: string; value: Buffer }[]): Promise<void> {
  if (!entries.length) return;
  const transactionId = await createTransaction(context);
  const operations = entries.map(({ name, value }) => ({
    action: "create",
    databaseId: context.databaseId,
    tableId: context.secretsTableId,
    rowId: rowId("secret", name),
    data: { secret_name: name, secret_value: value.toString("base64") },
  }));
  try {
    await stageOperations(context, transactionId, operations);
    await finishTransaction(context, transactionId, true);
  } catch (error) {
    try { await finishTransaction(context, transactionId, false); } catch { /* The transaction may already be committed or expired. */ }
    // A concurrent SSR instance may have initialized the same key first. Only
    // accept that outcome after re-reading the committed secret rows.
    const rows = await listTableRows(context, context.secretsTableId);
    for (const row of rows) {
      const data = rowData(row);
      if (typeof data.secret_name === "string" && typeof data.secret_value === "string") {
        context.secrets.set(data.secret_name, Buffer.from(data.secret_value, "base64"));
      }
    }
    if (entries.every((entry) => context.secrets.has(entry.name))) return;
    throw error;
  }
  for (const entry of entries) context.secrets.set(entry.name, Buffer.from(entry.value));
}

async function loadSecrets(context: RemoteContext): Promise<void> {
  const rows = await listTableRows(context, context.secretsTableId);
  for (const row of rows) {
    const data = rowData(row);
    if (typeof data.secret_name !== "string" || typeof data.secret_value !== "string") continue;
    const value = Buffer.from(data.secret_value, "base64");
    if (value.length) context.secrets.set(data.secret_name, value);
  }

  const missing: { name: string; value: Buffer }[] = [];
  if (!process.env.APP_ENCRYPTION_KEY && !context.secrets.has("key")) {
    missing.push({ name: "key", value: randomBytes(32) });
  }
  if (!context.secrets.has("issuer-private.pem")) {
    const pair = generateKeyPairSync("ed25519");
    missing.push({
      name: "issuer-private.pem",
      value: Buffer.from(pair.privateKey.export({ type: "pkcs8", format: "pem" })),
    });
  }
  await persistSecretRows(context, missing);
  if (!process.env.APP_ENCRYPTION_KEY && context.secrets.get("key")?.length !== 32) {
    throw new AppwriteDatabaseError("The persistent JëfPass encryption key is missing or invalid");
  }
  if (!context.secrets.has("issuer-private.pem")) {
    throw new AppwriteDatabaseError("The persistent JëfPass receipt signing key is unavailable");
  }
}

function hydrateDatabase(database: DatabaseSync, rows: Record<string, unknown>[], baseline: Map<string, RemoteRecord>): void {
  for (const row of rows) {
    const id = row.$id;
    const data = rowData(row);
    if (typeof id !== "string" || typeof data.record_type !== "string" ||
        typeof data.record_key !== "string" || typeof data.payload !== "string") continue;

    const record: RemoteRecord = {
      record_type: data.record_type,
      record_key: data.record_key,
      payload: data.payload,
    };
    baseline.set(id, record);

    if (record.record_type === "document") {
      const separator = record.record_key.indexOf(":");
      if (separator <= 0) throw new AppwriteDatabaseError("A JëfPass document row has an invalid key");
      const kind = record.record_key.slice(0, separator);
      const documentId = record.record_key.slice(separator + 1);
      // Validate stored JSON before making it visible to application code.
      JSON.parse(record.payload);
      database.prepare("INSERT INTO documents(kind,id,body) VALUES(?,?,?)")
        .run(kind, documentId, record.payload);
    } else if (record.record_type === "rate_limit") {
      const value = JSON.parse(record.payload) as { count?: number; reset_at?: number };
      if (typeof value.count !== "number" || !Number.isSafeInteger(value.count) ||
          typeof value.reset_at !== "number" || !Number.isSafeInteger(value.reset_at)) {
        throw new AppwriteDatabaseError("A JëfPass rate-limit row is malformed");
      }
      database.prepare("INSERT INTO rate_limits(id,count,reset_at) VALUES(?,?,?)")
        .run(record.record_key, value.count, value.reset_at);
    }
  }
}

function currentRecords(database: DatabaseSync): Map<string, RemoteRecord> {
  const records = new Map<string, RemoteRecord>();
  const documents = database.prepare("SELECT kind, id, body FROM documents").all() as
    { kind: string; id: string; body: string }[];
  for (const document of documents) {
    const key = `${document.kind}:${document.id}`;
    records.set(rowId("document", key), {
      record_type: "document",
      record_key: key,
      payload: document.body,
    });
  }

  const rateLimits = database.prepare("SELECT id, count, reset_at FROM rate_limits").all() as
    { id: string; count: number; reset_at: number }[];
  for (const limit of rateLimits) {
    records.set(rowId("rate_limit", limit.id), {
      record_type: "rate_limit",
      record_key: limit.id,
      payload: JSON.stringify({ count: limit.count, reset_at: limit.reset_at }),
    });
  }
  return records;
}

async function persistDatabaseChanges(context: RemoteContext): Promise<void> {
  if (!context.transactionId) throw new AppwriteDatabaseError("The Appwrite request transaction was not started");
  const current = currentRecords(context.database);
  const operations: Record<string, unknown>[] = [];

  for (const [id, previous] of context.baseline) {
    if (!current.has(id)) {
      operations.push({
        action: "delete",
        databaseId: context.databaseId,
        tableId: context.tableId,
        rowId: id,
      });
    }
  }

  for (const [id, record] of current) {
    const previous = context.baseline.get(id);
    if (previous && previous.record_type === record.record_type &&
        previous.record_key === record.record_key && previous.payload === record.payload) continue;
    if (Buffer.byteLength(record.payload, "utf8") > 60000) {
      throw new AppwriteDatabaseError("A JëfPass record exceeds the Appwrite row payload limit");
    }
    operations.push({
      action: "upsert",
      databaseId: context.databaseId,
      tableId: context.tableId,
      rowId: id,
      data: record,
    });
  }

  try {
    if (operations.length) {
      await stageOperations(context, context.transactionId, operations);
    }
    await finishTransaction(context, context.transactionId, true);
    context.transactionFinished = true;
  } catch (error) {
    try { await finishTransaction(context, context.transactionId, false); } catch { /* It may already be committed or expired. */ }
    context.transactionFinished = true;
    throw error;
  }
}

export async function withRequestDatabase<T>(
  request: Request,
  operation: () => Promise<T>,
): Promise<T> {
  // Local development keeps using the durable on-disk SQLite database exactly
  // as before. Appwrite Sites must never silently fall back to ephemeral disk.
  if (!process.env.APPWRITE_SITE_ID) return operation();

  const apiKey = request.headers.get("x-appwrite-key");
  const endpoint = process.env.APPWRITE_SITE_API_ENDPOINT;
  const projectId = process.env.APPWRITE_SITE_PROJECT_ID;
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const tableId = process.env.APPWRITE_TABLE_ID;
  const secretsTableId = process.env.APPWRITE_SECRETS_TABLE_ID;
  if (!apiKey || !endpoint || !projectId || !databaseId || !tableId || !secretsTableId) {
    throw new AppwriteDatabaseError("Appwrite database settings or the request-scoped Site API key are missing");
  }

  const context: RemoteContext = {
    database: createDatabase(":memory:"),
    endpoint,
    projectId,
    apiKey,
    databaseId,
    tableId,
    secretsTableId,
    baseline: new Map(),
    secrets: new Map(),
    transactionFinished: false,
  };

  try {
    // Secrets are initialized first in their own short transaction so every
    // request uses the same persistent encryption and issuer keys.
    await loadSecrets(context);
    context.transactionId = await createTransaction(context);
    const rows = await listTableRows(context, tableId, context.transactionId);
    hydrateDatabase(context.database, rows, context.baseline);
    return await requestContext.run(context, async () => {
      const result = await operation();
      await persistDatabaseChanges(context);
      return result;
    });
  } catch (error) {
    if (context.transactionId && !context.transactionFinished) {
      try { await finishTransaction(context, context.transactionId, false); } catch { /* Best-effort rollback for failed requests. */ }
      context.transactionFinished = true;
    }
    throw error;
  } finally {
    context.database.close();
    context.secrets.clear();
    context.baseline.clear();
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
