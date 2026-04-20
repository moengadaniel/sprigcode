import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyCommand } from "../src/commands/apply.js";

describe("applyCommand", () => {
  it("applies a transaction to a workspace", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sprigcode-cli-"));
    await mkdir(path.join(root, "src"), { recursive: true });
    await writeFile(path.join(root, "src", "index.ts"), "export const value = 1;\n", "utf8");

    const transactionPath = path.join(root, "transaction.sprigcode.json");
    await writeFile(
      transactionPath,
      JSON.stringify(
        {
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
        },
        null,
        2
      ),
      "utf8"
    );

    const result = await applyCommand({
      transactionPath,
      workspace: root
    });

    expect(result.ok).toBe(true);
    const contents = await readFile(path.join(root, "src", "index.ts"), "utf8");
    expect(contents).toContain("thing");
  });
});

