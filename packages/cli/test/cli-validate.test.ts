import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateCommand } from "../src/commands/validate.js";

describe("validateCommand", () => {
  it("validates a transaction document", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sprigcode-cli-"));
    const transactionPath = path.join(root, "transaction.sprigcode.json");
    await writeFile(
      transactionPath,
      JSON.stringify(
        {
          version: "0.1",
          language: "typescript",
          ops: [{ id: "add-import", op: "add_import", file: "src/index.ts", from: "./dep", named: ["thing"] }]
        },
        null,
        2
      ),
      "utf8"
    );

    const result = await validateCommand(transactionPath);
    expect(result.ok).toBe(true);
  });
});
