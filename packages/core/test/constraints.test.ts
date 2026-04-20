import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { describe, expect, it } from "vitest";
import { ERROR_CODES, createTransaction, toSprigcodeError } from "../src/index.js";
import { validateTransactionDocument } from "../src/transaction-document.js";

describe("core constraints", () => {
  it("returns NON_IDEMPOTENT_TRANSACTION when a second application would still produce edits", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "sprigcode-core-idempotent-"));
    await mkdir(path.join(workspace, "src"), { recursive: true });
    await writeFile(path.join(workspace, "src", "index.ts"), "export const value = 1;\n", "utf8");

    const tx = await createTransaction({
      document: validateTransactionDocument({
        version: "0.1",
        language: "typescript",
        ops: [{ id: "always-edit", op: "add_import", file: "src/index.ts", from: "./dep", named: ["thing"] }],
        constraints: [{ type: "idempotent" }]
      }),
      workspace,
      adapters: [
        {
          language: "typescript",
          async plan() {
            return {
              operations: [
                {
                  opId: "always-edit",
                  op: "add_import",
                  matchCount: 1,
                  edits: [
                    {
                      filePath: "src/index.ts",
                      start: 0,
                      end: 0,
                      replacement: "// edit\n"
                    }
                  ]
                }
              ],
              diagnostics: []
            };
          }
        }
      ]
    });

    await tx.plan();
    await tx.apply();

    try {
      await tx.verify();
      throw new Error("Expected verify() to fail.");
    } catch (error) {
      expect(toSprigcodeError(error).code).toBe(ERROR_CODES.NON_IDEMPOTENT_TRANSACTION);
    }
  });
});
