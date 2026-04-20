import { describe, expect, it } from "vitest";
import { SprigcodeFailure } from "../src/errors.js";
import { validateTransactionDocument } from "../src/transaction-document.js";

describe("validateTransactionDocument", () => {
  it("accepts a valid document", () => {
    const document = validateTransactionDocument({
      version: "0.1",
      language: "typescript",
      ops: [
        {
          id: "add-import",
          op: "add_import",
          file: "src/index.ts",
          from: "./dep",
          named: ["thing"]
        }
      ]
    });

    expect(document.constraints).toEqual([]);
  });

  it("fails on unsupported operations", () => {
    expect(() =>
      validateTransactionDocument({
        version: "0.1",
        language: "typescript",
        ops: [{ id: "oops", op: "unknown" }]
      })
    ).toThrow(SprigcodeFailure);
  });
});

