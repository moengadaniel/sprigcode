import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "../../core/src/index.js";
import { createTsTransaction, createTsWorkspace, expectSprigcodeFailure } from "./helpers.js";

describe("replace_call_expression", () => {
  it("replaces a targeted call", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "const value = sendEmail(user);\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "replace",
            op: "replace_call_expression",
            anchor: {
              type: "call",
              callee: "sendEmail",
              file: "src/index.ts"
            },
            replacement: "queueEmail(user)"
          }
        ],
        constraints: []
      },
      workspace
    );

    await tx.plan();
    await tx.apply();
    const contents = await readFile(path.join(workspace, "src", "index.ts"), "utf8");
    expect(contents).toContain("queueEmail(user)");
  });

  it("fails when the call anchor is missing", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "const value = queueEmail(user);\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "missing",
            op: "replace_call_expression",
            anchor: {
              type: "call",
              callee: "sendEmail",
              file: "src/index.ts"
            },
            replacement: "queueEmail(user)"
          }
        ],
        constraints: []
      },
      workspace
    );

    await expectSprigcodeFailure(() => tx.plan(), ERROR_CODES.ANCHOR_NOT_FOUND);
  });

  it("fails closed when the call anchor is ambiguous", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "sendEmail(user);\nsendEmail(admin);\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "ambiguous",
            op: "replace_call_expression",
            anchor: {
              type: "call",
              callee: "sendEmail"
            },
            replacement: "queueEmail(user)"
          }
        ],
        constraints: []
      },
      workspace
    );

    await expectSprigcodeFailure(() => tx.plan(), ERROR_CODES.ANCHOR_NOT_UNIQUE);
  });
});
