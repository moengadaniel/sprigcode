import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyCommand } from "../src/commands/apply.js";
import { formatFailure, formatFailureWithContext, formatSuccess } from "../src/output.js";

describe("CLI JSON output", () => {
  it("emits machine-readable transaction metadata for apply", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sprigcode-cli-json-"));
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
    if (!result.ok) {
      throw new Error("Expected applyCommand to succeed.");
    }

    const payload = JSON.parse(formatSuccess("apply", result.result, true)) as {
      ok: boolean;
      command: string;
      transaction: {
        status: string;
        changedFiles: string[];
        operationResults: Array<{ opId: string; diagnostics: Array<{ message: string }> }>;
        diffSummary: {
          fileCount: number;
        };
      };
    };

    expect(payload.ok).toBe(true);
    expect(payload.command).toBe("apply");
    expect(payload.transaction.status).toBe("verified");
    expect(payload.transaction.changedFiles).toContain("src/index.ts");
    expect(payload.transaction.operationResults[0]?.opId).toBe("add-import");
    expect(payload.transaction.operationResults[0]?.diagnostics[0]?.message).toContain("Operation add-import");
    expect(payload.transaction.diffSummary.fileCount).toBe(1);
  });

  it("emits typed errors in JSON envelopes", () => {
    const payload = JSON.parse(
      formatFailure(
        "apply",
        {
          code: "ANCHOR_NOT_FOUND",
          message: "Missing anchor."
        },
        true
      )
    ) as {
      ok: boolean;
      command: string;
      error: {
        code: string;
      };
    };

    expect(payload.ok).toBe(false);
    expect(payload.command).toBe("apply");
    expect(payload.error.code).toBe("ANCHOR_NOT_FOUND");
  });

  it("makes ambiguous anchors read like a deliberate refusal in human output", () => {
    const output = formatFailureWithContext(
      "apply",
      {
        code: "ANCHOR_NOT_UNIQUE",
        message: "Found 2 matching calls to sendPasswordResetEmail."
      },
      {
        status: "validated",
        changedFiles: [],
        rollbackOccurred: false
      },
      false
    );

    expect(output).toContain("ANCHOR_NOT_UNIQUE");
    expect(output).toContain("Sprigcode refused to guess.");
    expect(output).toContain("Status: validated");
  });
});
