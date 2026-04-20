import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createTransaction, validateTransactionDocument } from "../../core/src/index.js";
import { typescriptAdapter } from "../src/index.js";

describe("idempotence", () => {
  it("verifies idempotent add_import", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "sprigcode-ts-"));
    await mkdir(path.join(workspace, "src"), { recursive: true });
    await writeFile(path.join(workspace, "src", "index.ts"), "export const value = 1;\n", "utf8");

    const tx = await createTransaction({
      document: validateTransactionDocument({
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
        ],
        constraints: [{ type: "idempotent" }]
      }),
      workspace,
      adapters: [typescriptAdapter()]
    });

    await tx.plan();
    await tx.apply();
    await expect(tx.verify()).resolves.toBeDefined();
  });
});
