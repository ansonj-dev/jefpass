import { afterEach, describe, expect, it, vi } from "vitest";
import { draftOutput, localDraft, suggestDraft } from "../lib/ai";

afterEach(() => vi.unstubAllEnvs());
describe("draft assistant authority boundary", () => {
  it("is usable with no provider or paid API call", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const request = vi.fn();
    const result = await suggestDraft({ text: "Replaced the laptop battery.", language: "en" }, request);
    expect(result.mode).toBe("Local draft, no AI");
    expect(result.draft.description).toBe("Replaced the laptop battery.");
    expect(request).not.toHaveBeenCalled();
  });
  it("rejects financial fields and credentials", () => {
    expect(() => draftOutput.parse({ title: "Repair", description: "Battery", category: "repair", state: "SETTLED" })).toThrow();
    expect(() => localDraft({ text: "nostr+walletconnect://secret" })).toThrow("Remove");
    expect(() => localDraft({ text: "Repair", payment: { state: "SETTLED" } })).toThrow();
  });
  it("falls back when a provider injects financial authority", async () => {
    vi.stubEnv("AI_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "unit-test-placeholder-not-a-real-key");
    const request = vi.fn(async () => Response.json({ choices: [{ message: { content: JSON.stringify({ title: "Repair", description: "Battery", category: "repair", payment: "SETTLED" }) } }] }));
    const result = await suggestDraft({ text: "Repair battery", language: "en" }, request);
    expect(result.mode).toBe("Local draft, no AI");
    expect(result.draft).not.toHaveProperty("payment");
  });
  it("does not consume an inherited API key without explicit opt-in", async () => {
    vi.stubEnv("AI_ENABLED", "false");
    vi.stubEnv("OPENAI_API_KEY", "unit-test-placeholder-not-a-real-key");
    const request = vi.fn();
    expect((await suggestDraft({ text: "Repair battery", language: "en" }, request)).mode).toBe("Local draft, no AI");
    expect(request).not.toHaveBeenCalled();
  });
});