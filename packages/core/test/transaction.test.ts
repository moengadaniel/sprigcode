import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { describe, expect, it } from "vitest";
import { createTransaction } from "../src/transaction.js";
import { validateTransactionDocument } from "../src/transaction-document.js";

describe("Transaction", () => {
  it("applies edits and records diffs", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "sprigcode-core-"));
    await mkdir(path.join(workspace, "src"), { recursive: true });
    await writeFile(path.join(workspace, "src", "index.ts"), "export const value = 1;\n", "utf8");

    const tx = await createTransaction({
      document: validateTransactionDocument({
        version: "0.1",
        language: "typescript",
        ops: [{ id: "noop", op: "add_import", file: "src/index.ts", from: "./dep", named: ["thing"] }]
      }),
      workspace,
      adapters: [
        {
          language: "typescript",
          async plan() {
            return {
              operations: [
                {
                  opId: "noop",
                  op: "add_import",
                  matchCount: 1,
                  edits: [{ filePath: "src/index.ts", start: 0, end: 0, replacement: 'import { thing } from "./dep";\n' }]
                }
              ],
              diagnostics: []
            };
          }
        }
      ]
    });

    await tx.validate();
    await tx.plan();
    await tx.apply();
    await tx.verify();

    const updated = await readFile(path.join(workspace, "src", "index.ts"), "utf8");
    expect(updated).toContain('import { thing } from "./dep";');
    expect(tx.getResult().diffs).toHaveLength(1);
  });
});
