import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "../../core/src/index.js";
import { createTsTransaction, createTsWorkspace, expectSprigcodeFailure } from "./helpers.js";

describe("insert_statement_before_call", () => {
  it("inserts a statement before the matched call", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "async function run() {\n  await sendEmail(user);\n}\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "insert",
            op: "insert_statement_before_call",
            anchor: {
              type: "call",
              callee: "sendEmail",
              file: "src/index.ts",
              enclosingFunction: "run"
            },
            statement: "await guard(user)"
          }
        ],
        constraints: []
      },
      workspace
    );

    await tx.plan();
    await tx.apply();
    const contents = await readFile(path.join(workspace, "src", "index.ts"), "utf8");
    expect(contents).toContain("await guard(user);");
    expect(contents.indexOf("await guard(user);")).toBeLessThan(contents.indexOf("await sendEmail(user);"));
  });

  it("fails when the call anchor is missing", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "async function run() {\n  await queueEmail(user);\n}\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "missing",
            op: "insert_statement_before_call",
            anchor: {
              type: "call",
              callee: "sendEmail",
              file: "src/index.ts",
              enclosingFunction: "run"
            },
            statement: "await guard(user)"
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
      "src/index.ts": "async function run() {\n  await sendEmail(user);\n  await sendEmail(admin);\n}\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "ambiguous",
            op: "insert_statement_before_call",
            anchor: {
              type: "call",
              callee: "sendEmail",
              file: "src/index.ts",
              enclosingFunction: "run"
            },
            statement: "await guard(user)"
          }
        ],
        constraints: []
      },
      workspace
    );

    await expectSprigcodeFailure(() => tx.plan(), ERROR_CODES.ANCHOR_NOT_UNIQUE);
  });
});
