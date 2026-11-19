import { describe, expect, it } from "vitest";
import { isPaymentVerified } from "../lib/types";

describe("separate evidence layers", () => {
  it("completion cannot verify a payment", () => {
    expect(isPaymentVerified(undefined)).toBe(false);
  });
  it("a frontend-like settled label without verification is insufficient", () => {
    expect(isPaymentVerified({ state: "SETTLED" } as never)).toBe(false);
  });
});