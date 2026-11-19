import { afterEach, describe, expect, it, vi } from "vitest";
import { requestOrigin, validateMutation } from "../lib/auth";

afterEach(() => vi.unstubAllEnvs());
describe("Next.js bind address and external origin", () => {
  it("compares browser origin against Host rather than the internal bind address", () => {
    vi.stubEnv("APP_ORIGIN", "");
    const request = new Request("http://0.0.0.0:3100/api/jobs", { method: "POST", headers: { host: "localhost:3100", origin: "http://localhost:3100", "X-Jefpass": "1" } });
    expect(requestOrigin(request)).toBe("http://localhost:3100");
    expect(() => validateMutation(request)).not.toThrow();
  });
  it("pins configured deployment origins and rejects cross-site origins", () => {
    vi.stubEnv("APP_ORIGIN", "https://jefpass.example");
    const request = new Request("http://0.0.0.0:3100/api/jobs", { method: "POST", headers: { host: "attacker.example", origin: "https://attacker.example", "X-Jefpass": "1" } });
    expect(() => validateMutation(request)).toThrow("Same-origin");
  });
});