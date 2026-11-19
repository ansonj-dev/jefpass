import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const databases = new Map<string, DatabaseSync>();

export function databasePath(): string {
  return process.env.DB_PATH || join(process.cwd(), "data", "jefpass.sqlite");
}

export function getDb(): DatabaseSync {
  const filename = databasePath();
  const existing = databases.get(filename);
  if (existing) return existing;
  mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(filename);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS documents (
      kind TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL CHECK(json_valid(body)),
      PRIMARY KEY(kind, id)
    );
    CREATE TABLE IF NOT EXISTS rate_limits (
      id TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL
    );
  `);
  databases.set(filename, database);
  return database;
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