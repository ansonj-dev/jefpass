import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { login, register, sessionWorker } from "../lib/auth";
import {
  getRequestSecret,
  insertDocument,
  listDocuments,
  readDocument,
  transaction,
  withRequestDatabase,
  writeDocument,
} from "../lib/db";

type StoredRow = { $id: string; data: Record<string, unknown> };
type StagedOperation = Record<string, unknown>;

const tables = new Map<string, Map<string, StoredRow>>();
const staged = new Map<string, StagedOperation[]>();
let transactionNumber = 0;

function table(id: string): Map<string, StoredRow> {
  let rows = tables.get(id);
  if (!rows) {
    rows = new Map();
    tables.set(id, rows);
  }
  return rows;
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function installAppwriteMock() {
  const mockedFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = input instanceof Request ? input.url : String(input);
    const url = new URL(rawUrl);
    const headers = new Headers(init?.headers);
    if (headers.get("x-appwrite-key") !== "ephemeral-site-key") {
      return jsonResponse({ message: "Missing request-scoped Site key" }, 401);
    }

    const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    const serviceIndex = parts.indexOf("tablesdb");
    if (serviceIndex < 0) return jsonResponse({ message: "Unknown path" }, 404);
    const path = parts.slice(serviceIndex + 1);
    const method = init?.method ?? "GET";

    if (path[0] === "transactions" && path.length === 1 && method === "POST") {
      const id = `tx-${++transactionNumber}`;
      staged.set(id, []);
      return jsonResponse({ $id: id, status: "pending" });
    }

    if (path[0] === "transactions" && path[2] === "operations" && method === "POST") {
      const txId = path[1];
      const body = JSON.parse(String(init?.body ?? "{}")) as { operations?: StagedOperation[] };
      staged.get(txId)?.push(...(body.operations ?? []));
      return jsonResponse({ $id: txId, status: "pending" });
    }

    if (path[0] === "transactions" && path.length === 2 && method === "PATCH") {
      const txId = path[1];
      const body = JSON.parse(String(init?.body ?? "{}")) as { commit?: boolean; rollback?: boolean };
      if (body.commit) {
        for (const operation of staged.get(txId) ?? []) {
          const tableId = String(operation.tableId);
          const rowId = String(operation.rowId);
          const rows = table(tableId);
          switch (operation.action) {
            case "create":
            case "upsert":
            case "update":
              rows.set(rowId, { $id: rowId, data: operation.data as Record<string, unknown> });
              break;
            case "delete":
              rows.delete(rowId);
              break;
            default:
              return jsonResponse({ message: "Unsupported mock operation" }, 400);
          }
        }
      }
      staged.delete(txId);
      return jsonResponse({ $id: txId, status: body.commit ? "committed" : "rolledBack" });
    }

    if (path.length === 4 && path[1] === "tables" && path[3] === "rows" && method === "GET") {
      const rows = [...table(path[2]).values()];
      const queryValues = url.searchParams.getAll("queries[]");
      const cursor = queryValues.find((query) => query.startsWith("cursorAfter("));
      const cursorId = cursor?.slice("cursorAfter(".length, -1).replace(/^"|"$/g, "");
      const cursorIndex = cursorId ? rows.findIndex((row) => row.$id === cursorId) : -1;
      const after = cursorIndex >= 0 ? rows.slice(cursorIndex + 1) : rows;
      const limitQuery = queryValues.find((query) => query.startsWith("limit("));
      const requestedLimit = limitQuery ? Number(limitQuery.slice("limit(".length, -1)) : 25;
      // Mirror the Appwrite TablesDB API cap so tests catch oversized pagination.
      if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
        return jsonResponse({ message: "Invalid query: limit must be between 1 and 100" }, 400);
      }
      return jsonResponse({ total: after.length, rows: after.slice(0, requestedLimit) });
    }

    return jsonResponse({ message: `Unhandled mock request: ${method} ${url.pathname}` }, 404);
  });
  vi.stubGlobal("fetch", mockedFetch);
  return mockedFetch;
}

function request(apiKey = "ephemeral-site-key"): Request {
  return new Request("https://jefpass.example/api/session", {
    headers: { "x-appwrite-key": apiKey },
  });
}

describe("Appwrite TablesDB persistence adapter", () => {
  beforeEach(() => {
    tables.clear();
    staged.clear();
    transactionNumber = 0;
    vi.stubEnv("APPWRITE_SITE_ID", "jefpass");
    vi.stubEnv("APPWRITE_SITE_API_ENDPOINT", "https://sgp.cloud.appwrite.io/v1");
    vi.stubEnv("APPWRITE_SITE_PROJECT_ID", "project-test");
    vi.stubEnv("APPWRITE_DATABASE_ID", "jefpass-db");
    vi.stubEnv("APPWRITE_TABLE_ID", "records");
    vi.stubEnv("APPWRITE_SECRETS_TABLE_ID", "secrets");
    vi.stubEnv("APP_ENCRYPTION_KEY", "");
    installAppwriteMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("persists documents across independent SSR requests and reuses durable system keys", async () => {
    let encryptionKeyFirst = "";
    let issuerKeyFirst = "";

    await withRequestDatabase(request(), async () => {
      encryptionKeyFirst = getRequestSecret("key")!.toString("hex");
      issuerKeyFirst = getRequestSecret("issuer-private.pem")!.toString("base64");
      transaction(() => {
        insertDocument("accounts", "email-hash", { workerId: "worker-123", passwordHash: "salted-hash" });
        insertDocument("workers", "worker-123", { id: "worker-123", name: "Awa" });
      });
    });

    expect(table("secrets").size).toBe(2);
    expect(table("records").size).toBe(2);

    let storedWorker: unknown;
    await withRequestDatabase(request(), async () => {
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
    await withRequestDatabase(request(), async () => {
      expect(readDocument<{ name: string }>("workers", "worker-123")?.name).toBe("Awa Updated");
    });
  });

  it("paginates TablesDB reads in batches no larger than Appwrite's 100-row limit", async () => {
    const records = table("records");
    for (let index = 0; index < 105; index += 1) {
      const key = `jobs:${index}`;
      const id = (await import("node:crypto")).createHash("sha256")
        .update(`document:${key}`).digest("hex").slice(0, 36);
      records.set(id, {
        $id: id,
        data: {
          record_type: "document",
          record_key: key,
          payload: JSON.stringify({ id: index }),
        },
      });
    }

    let loadedCount = 0;
    await withRequestDatabase(request(), async () => {
      loadedCount = (await import("../lib/db")).listDocuments("jobs").length;
    });

    expect(loadedCount).toBe(105);
    // No document changes were made by the read-only operation.
    expect(records.size).toBe(105);
    expect(table("secrets").size).toBe(2);
  });

  it("registers and logs in across separate Appwrite-backed requests", async () => {
    const credentials = {
      name: "Awa Diallo",
      occupation: "Phone repair technician",
      email: "awa@example.test",
      password: "strong-demo-password-2026",
    };

    let workerId = "";
    let sessionToken = "";

    await withRequestDatabase(request(), async () => {
      const result = await register(credentials);
      workerId = result.worker.id;
      sessionToken = result.token;
      expect(sessionWorker(sessionToken)?.id).toBe(workerId);
    });

    expect(table("records").size).toBeGreaterThanOrEqual(3);

    await withRequestDatabase(request(), async () => {
      expect(sessionWorker(sessionToken)?.id).toBe(workerId);
      const result = await login({ email: credentials.email, password: credentials.password });
      expect(result.worker.id).toBe(workerId);
      sessionToken = result.token;
    });

    await withRequestDatabase(request(), async () => {
      expect(sessionWorker(sessionToken)?.id).toBe(workerId);
      expect(listDocuments("accounts")).toHaveLength(1);
      expect(listDocuments("workers")).toHaveLength(1);
    });
  });

  it("rolls back application changes when a request fails before its database commit", async () => {
    await expect(withRequestDatabase(request(), async () => {
      transaction(() => insertDocument("accounts", "must-rollback", { value: 1 }));
      throw new Error("request failed");
    })).rejects.toThrow("request failed");

    expect([...table("records").values()].some((row) => row.data.record_key === "accounts:must-rollback")).toBe(false);
    expect(table("secrets").size).toBe(2);
  });

  it("fails closed when Appwrite's per-request ephemeral key is missing", async () => {
    await expect(withRequestDatabase(request(""), async () => "must not run"))
      .rejects.toThrow("request-scoped Site API key");
  });
});
