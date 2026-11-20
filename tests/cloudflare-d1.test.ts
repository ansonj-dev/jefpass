import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { login, register, sessionWorker } from "../lib/auth";
import {
  D1AccountConflictError,
  getRequestSecret,
  insertDocument,
  listDocuments,
  readDocument,
  transaction,
  withRequestDatabase,
  writeDocument,
} from "../lib/db";

type D1Document = { kind: string; id: string; body: string };
type D1RateLimit = { id: string; count: number; reset_at: number };
type D1Secret = { name: string; value: string };
type MockStatement = {
  sql: string;
  values: unknown[];
  bind: (...values: unknown[]) => MockStatement;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[]; success: boolean }>;
  run: () => Promise<{ success: boolean; meta: { changes: number } }>;
};

function createD1Mock() {
  const documents = new Map<string, D1Document>();
  const rateLimits = new Map<string, D1RateLimit>();
  const secrets = new Map<string, D1Secret>();
  let schemaExecCount = 0;

  const docKey = (kind: string, id: string) => kind + "\u0000" + id;

  function execute(sql: string, values: unknown[]) {
    const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
    if (normalized === "insert or ignore into app_secrets(name,value) values(?,?)") {
      const name = String(values[0]);
      if (!secrets.has(name)) secrets.set(name, { name, value: String(values[1]) });
      return { changes: 1 };
    }
    if (normalized === "insert into documents(kind,id,body) values(?,?,?)") {
      const [kindValue, idValue, bodyValue] = values;
      const kind = String(kindValue);
      const id = String(idValue);
      const key = docKey(kind, id);
      if (documents.has(key)) throw new Error("UNIQUE constraint failed: documents.kind, documents.id");
      documents.set(key, { kind, id, body: String(bodyValue) });
      return { changes: 1 };
    }
    if (normalized === "insert into documents(kind,id,body) values(?,?,?) on conflict(kind,id) do update set body = excluded.body") {
      const [kindValue, idValue, bodyValue] = values;
      const kind = String(kindValue);
      const id = String(idValue);
      documents.set(docKey(kind, id), { kind, id, body: String(bodyValue) });
      return { changes: 1 };
    }
    if (normalized === "delete from documents where kind = ? and id = ?") {
      const changes = documents.delete(docKey(String(values[0]), String(values[1]))) ? 1 : 0;
      return { changes };
    }
    if (normalized === "delete from rate_limits where reset_at <= ?") {
      const cutoff = Number(values[0]);
      let changes = 0;
      for (const [id, row] of rateLimits) {
        if (row.reset_at <= cutoff) {
          rateLimits.delete(id);
          changes += 1;
        }
      }
      return { changes };
    }
    if (normalized === "delete from rate_limits where id = ?") {
      return { changes: rateLimits.delete(String(values[0])) ? 1 : 0 };
    }
    if (normalized === "insert into rate_limits(id,count,reset_at) values(?,1,?) on conflict(id) do update set count = count + 1, reset_at = excluded.reset_at") {
      const id = String(values[0]);
      const previous = rateLimits.get(id);
      rateLimits.set(id, { id, count: (previous?.count ?? 0) + 1, reset_at: Number(values[1]) });
      return { changes: 1 };
    }
    throw new Error("Unexpected D1 statement in test: " + normalized);
  }

  function makeStatement(sql: string, values: unknown[] = []): MockStatement {
    return {
      sql,
      values,
      bind: (...nextValues: unknown[]) => makeStatement(sql, nextValues),
      all: async <T = Record<string, unknown>>() => {
        const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
        let results: unknown[];
        if (normalized === "select kind, id, body from documents order by rowid") {
          results = [...documents.values()];
        } else if (normalized === "select id, count, reset_at from rate_limits") {
          results = [...rateLimits.values()];
        } else if (normalized === "select name, value from app_secrets") {
          results = [...secrets.values()];
        } else {
          throw new Error("Unexpected D1 SELECT in test: " + normalized);
        }
        return { results: results as T[], success: true };
      },
      run: async () => {
        const result = execute(sql, values);
        return { success: true, meta: { changes: result.changes } };
      },
    };
  }

  const db = {
    prepare: (sql: string) => makeStatement(sql),
    exec: async (_sql: string) => {
      schemaExecCount += 1;
      return { count: 0, duration: 0 };
    },
    batch: async (statements: MockStatement[]) => {
      const documentsBefore = new Map(documents);
      const rateLimitsBefore = new Map(rateLimits);
      const secretsBefore = new Map(secrets);
      try {
        const results = [];
        for (const statement of statements) {
          results.push(await statement.run());
        }
        return results;
      } catch (error) {
        documents.clear();
        rateLimits.clear();
        secrets.clear();
        for (const [key, row] of documentsBefore) documents.set(key, row);
        for (const [key, row] of rateLimitsBefore) rateLimits.set(key, row);
        for (const [key, row] of secretsBefore) secrets.set(key, row);
        throw error;
      }
    },
  };

  return { db, documents, rateLimits, secrets, get schemaExecCount() { return schemaExecCount; } };
}

describe("Cloudflare D1 persistence adapter", () => {
  let storage: ReturnType<typeof createD1Mock>;

  beforeEach(() => {
    storage = createD1Mock();
    vi.stubGlobal("__JEFPASS_D1__", storage.db);
    vi.stubGlobal("__JEFPASS_D1_SCHEMA_READY__", false);
    vi.stubEnv("JEFPASS_CLOUDFLARE", "true");
    vi.stubEnv("APP_ENCRYPTION_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("persists documents across requests and reuses durable encryption and issuer keys", async () => {
    let encryptionKeyFirst = "";
    let issuerKeyFirst = "";

    await withRequestDatabase(new Request("https://jefpass.example/api/session"), async () => {
      encryptionKeyFirst = getRequestSecret("key")!.toString("hex");
      issuerKeyFirst = getRequestSecret("issuer-private.pem")!.toString("base64");
      transaction(() => {
        insertDocument("accounts", "email-hash", { workerId: "worker-123", passwordHash: "salted-hash" });
        insertDocument("workers", "worker-123", { id: "worker-123", name: "Awa" });
      });
    });

    expect(storage.secrets.size).toBe(2);
    expect(storage.documents.size).toBe(2);

    let storedWorker: unknown;
    await withRequestDatabase(new Request("https://jefpass.example/api/session"), async () => {
      storedWorker = readDocument("workers", "worker-123");
      expect(readDocument("accounts", "email-hash")).toEqual({
        workerId: "worker-123",
        passwordHash: "salted-hash",
      });
      expect(getRequestSecret("key")!.toString("hex")).toBe(encryptionKeyFirst);
      expect(getRequestSecret("issuer-private.pem")!.toString("base64")).toBe(issuerKeyFirst);
      transaction(() => writeDocument("workers", "worker-123", { id: "worker-123", name: "Awa Updated" }));
    });

    expect(storedWorker).toEqual({ id: "worker-123", name: "Awa" });
    await withRequestDatabase(new Request("https://jefpass.example/api/session"), async () => {
      expect(readDocument<{ name: string }>("workers", "worker-123")?.name).toBe("Awa Updated");
    });
    expect(storage.schemaExecCount).toBe(1);
  });

  it("loads more than 100 documents from D1 without an Appwrite-style page limit", async () => {
    for (let index = 0; index < 105; index += 1) {
      const id = String(index);
      storage.documents.set("jobs\u0000" + id, {
        kind: "jobs",
        id,
        body: JSON.stringify({ id: index }),
      });
    }

    let loadedCount = 0;
    await withRequestDatabase(new Request("https://jefpass.example/api/session"), async () => {
      loadedCount = listDocuments("jobs").length;
    });

    expect(loadedCount).toBe(105);
    expect(storage.documents.size).toBe(105);
    expect(storage.secrets.size).toBe(2);
  });

  it("registers and logs in across separate D1-backed requests", async () => {
    const credentials = {
      name: "Awa Diallo",
      occupation: "Phone repair technician",
      email: "awa@example.test",
      password: "strong-demo-password-2026",
    };

    let workerId = "";
    let sessionToken = "";

    await withRequestDatabase(new Request("https://jefpass.example/api/session"), async () => {
      const result = await register(credentials);
      workerId = result.worker.id;
      sessionToken = result.token;
      expect(sessionWorker(sessionToken)?.id).toBe(workerId);
    });

    expect(storage.documents.size).toBeGreaterThanOrEqual(3);

    await withRequestDatabase(new Request("https://jefpass.example/api/session"), async () => {
      expect(sessionWorker(sessionToken)?.id).toBe(workerId);
      const result = await login({ email: credentials.email, password: credentials.password });
      expect(result.worker.id).toBe(workerId);
      sessionToken = result.token;
    });

    await withRequestDatabase(new Request("https://jefpass.example/api/session"), async () => {
      expect(sessionWorker(sessionToken)?.id).toBe(workerId);
      expect(listDocuments("accounts")).toHaveLength(1);
      expect(listDocuments("workers")).toHaveLength(1);
    });
  });

  it("rolls back application changes when the request fails before the D1 batch", async () => {
    await expect(withRequestDatabase(new Request("https://jefpass.example/api/session"), async () => {
      transaction(() => insertDocument("accounts", "must-rollback", { value: 1 }));
      throw new Error("request failed");
    })).rejects.toThrow("request failed");

    expect([...storage.documents.values()].some((row) => row.kind === "accounts" && row.id === "must-rollback")).toBe(false);
    expect(storage.secrets.size).toBe(2);
  });

  it("maps a concurrent duplicate-account insert to a registration conflict", async () => {
    await expect(withRequestDatabase(new Request("https://jefpass.example/api/session"), async () => {
      // Simulate another Worker isolate committing the same email after this
      // request has loaded its snapshot but before its D1 batch commits.
      transaction(() => insertDocument("accounts", "existing", { value: false }));
      storage.documents.set("accounts\u0000existing", {
        kind: "accounts",
        id: "existing",
        body: JSON.stringify({ value: true }),
      });
    })).rejects.toBeInstanceOf(D1AccountConflictError);
  });

  it("fails closed on Cloudflare when the D1 binding is missing", async () => {
    vi.stubGlobal("__JEFPASS_D1__", undefined);
    await expect(withRequestDatabase(new Request("https://jefpass.example/api/session"), async () => "must not run"))
      .rejects.toThrow("Cloudflare D1 binding is unavailable");
  });
});
