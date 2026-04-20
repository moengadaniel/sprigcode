import { describe, expect, it } from "vitest";
import { validateTransactionShape } from "../src/index.js";

describe("validateTransactionShape", () => {
  it("accepts a minimal transaction shape", () => {
    const result = validateTransactionShape({
      version: "0.1",
      language: "typescript",
      ops: [{ id: "a", op: "add_import" }]
    });

    expect(result.valid).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = validateTransactionShape({
      language: "typescript",
      ops: []
    });

    expect(result.valid).toBe(false);
  });
});
