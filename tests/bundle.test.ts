import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonical, verifyBundle } from "../scripts/verify-bundle.mjs";

function bundle() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const job = { id: "job", workerId: "worker", title: "Repair", description: "Replace battery", category: "repair", amountSats: 1000, currency: "SAT", dueDate: null };
  const scope = { jobId: job.id, workerId: job.workerId, title: job.title, description: job.description, category: job.category, amountSats: job.amountSats, currency: job.currency, dueDate: null };
  const payload = { id: "receipt", workerId: job.workerId, jobId: job.id, scopeHash: createHash("sha256").update(canonical(scope)).digest("hex"), amountSats: 1000,
    issuer: { type: "server", algorithm: "Ed25519", publicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64") }, payment: { state: "NOT_REQUESTED" } };
  const serialized = canonical(payload);
  const receipt = { ...payload, commitment: createHash("sha256").update(serialized).digest("hex"), signature: sign(null, Buffer.from(serialized), privateKey).toString("base64") };
  return { worker: { id: "worker" }, jobs: [job], receipts: [receipt], nostr: [] };
}
describe("portable private proof verification", () => {
  it("verifies a bundle outside the database and reports unpinned issuer trust", () => {
    expect(verifyBundle(bundle()).receipts[0]).toMatchObject({ valid: true, issuerTrusted: "NOT_PINNED", paymentEvidence: "NOT_CLAIMED" });
  });
  it("rejects edited private scope and untrusted issuer pins", () => {
    const data = bundle(); data.jobs[0].description = "Edited after signing";
    expect(verifyBundle(data).valid).toBe(false);
    expect(verifyBundle(bundle(), "different-issuer").valid).toBe(false);
  });
});