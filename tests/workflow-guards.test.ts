import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { finalizeEvent, generateSecretKey } from "nostr-tools";
import { closeDatabases, writeDocument } from "../lib/db";
import { createJob, createReceipt, customerAction, getCustomer, reserveInvoice } from "../lib/service";
import { CUSTOMER_PROOF_KIND, isWorkCompleted } from "../lib/types";

const directory = mkdtempSync(join(tmpdir(), "jefpass-guard-"));
process.env.DB_PATH = join(directory, "test.sqlite");
afterAll(() => { closeDatabases(); rmSync(directory, { recursive: true, force: true }); });

describe("rejected quote is not completed work", () => {
  it("classifies work by its completion fact, not its dispute status", () => {
    expect(isWorkCompleted({})).toBe(false);
    expect(isWorkCompleted({ completedAt: "2026-11-19T10:00:00.000Z" })).toBe(true);
  });
  it("rejects invoice creation through the service layer until accepted work is completed", () => {
    writeDocument("workers", "worker", { id: "worker", name: "Test worker", occupation: "Repair", bio: "" });
    const { job, token } = createJob("worker", { title: "Quote", description: "Proposed repair", category: "repair", amountSats: 1000, currency: "SAT" });
    const challenge = getCustomer(token).challenge;
    const event = finalizeEvent({ kind: CUSTOMER_PROOF_KIND, created_at: Math.floor(Date.now() / 1000), tags: [], content: JSON.stringify(challenge) }, generateSecretKey());
    customerAction(token, { action: "accept", event });
    expect(() => reserveInvoice("worker", job.id)).toThrow("Complete the accepted work");
  });

  it("keeps rejection distinct from completion, payment request and receipt eligibility", () => {
    writeDocument("workers", "worker", { id: "worker", name: "Test worker", occupation: "Repair", bio: "" });
    const { job, token } = createJob("worker", { title: "Quote", description: "Proposed repair", category: "repair", amountSats: 1000, currency: "SAT" });
    const challenge = getCustomer(token).challenge;
    const event = finalizeEvent({ kind: CUSTOMER_PROOF_KIND, created_at: Math.floor(Date.now() / 1000), tags: [], content: JSON.stringify({ ...challenge, action: "dispute" }) }, generateSecretKey());
    expect(customerAction(token, { action: "dispute", event }).state).toBe("DISPUTED");
    expect(() => createReceipt("worker", job.id)).toThrow("Complete the job");
    expect(() => reserveInvoice("worker", job.id)).toThrow("Complete the accepted work");
  });
});