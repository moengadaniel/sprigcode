import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "../../core/src/index.js";
import { createTsTransaction, createTsWorkspace, expectSprigcodeFailure } from "./helpers.js";

describe("constraints", () => {
  it("records a passing typecheck constraint", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts":
        'import { thing } from "./dep";\nexport function getUser(id: string) { return id; }\nconst value = getUser("1");\nvoid thing;\n',
      "src/dep.ts": "export const thing = 1;\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "safe-add-import",
            op: "add_import",
            file: "src/index.ts",
            from: "./dep",
            named: ["thing"]
          }
        ],
        constraints: [{ type: "typecheck" }]
      },
      workspace
    );

    await tx.plan();
    await tx.apply();
    const result = await tx.verify();
    expect(result.constraintResults.some((constraint) => constraint.type === "typecheck")).toBe(true);
  });

  it("returns TYPECHECK_FAILED when typecheck verification fails", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "export function getUser(id: string) { return id; }\nconst value = getUser(\"1\");\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "break-call-site",
            op: "add_required_parameter",
            anchor: {
              type: "symbol",
              name: "getUser",
              file: "src/index.ts",
              kind: "function"
            },
            parameterName: "tenantId",
            parameterType: "string",
            value: "\"tenant-1\""
          }
        ],
        constraints: [{ type: "typecheck" }]
      },
      workspace
    );

    await tx.plan();
    await tx.apply();
    await expectSprigcodeFailure(() => tx.verify(), ERROR_CODES.TYPECHECK_FAILED);
  });

  it("returns PUBLIC_API_BOUNDARY when no_public_api_change is requested", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "export function getUser(id: string) { return id; }\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "public-api-change",
            op: "add_required_parameter",
            anchor: {
              type: "symbol",
              name: "getUser",
              file: "src/index.ts",
              kind: "function"
            },
            parameterName: "tenantId",
            parameterType: "string",
            value: "\"tenant-1\""
          }
        ],
        constraints: [{ type: "no_public_api_change" }]
      },
      workspace
    );

    await expectSprigcodeFailure(() => tx.plan(), ERROR_CODES.PUBLIC_API_BOUNDARY);
  });

  it("records a passing no_public_api_change constraint for internal-only edits", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "function getUser(id: string) { return id; }\nconst value = getUser(\"1\");\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "internal-api-change",
            op: "add_required_parameter",
            anchor: {
              type: "symbol",
              name: "getUser",
              file: "src/index.ts",
              kind: "function"
            },
            parameterName: "tenantId",
            parameterType: "string",
            value: "\"tenant-1\"",
            updateCallSites: true
          }
        ],
        constraints: [{ type: "no_public_api_change" }]
      },
      workspace
    );

    const plan = await tx.plan();
    expect(plan[0]?.edits.length).toBeGreaterThan(0);
    expect(tx.getResult().constraintResults.some((constraint) => constraint.type === "no_public_api_change")).toBe(true);
  });

  it("blocks edits to generated files when no_generated_files is enabled", async () => {
    const workspace = await createTsWorkspace({
      "src/client.generated.ts": "export const client = createClient();\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "generated-file",
            op: "add_import",
            file: "src/client.generated.ts",
            from: "./dep",
            named: ["thing"]
          }
        ],
        constraints: [{ type: "no_generated_files" }]
      },
      workspace
    );

    await tx.plan();
    await expectSprigcodeFailure(() => tx.apply(), ERROR_CODES.GENERATED_FILE_BLOCKED);
  });

  it("records a passing no_generated_files constraint for normal source files", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "export const value = 1;\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "normal-file",
            op: "add_import",
            file: "src/index.ts",
            from: "./dep",
            named: ["thing"]
          }
        ],
        constraints: [{ type: "no_generated_files" }]
      },
      workspace
    );

    await tx.plan();
    const result = await tx.apply();
    expect(result.constraintResults.some((constraint) => constraint.type === "no_generated_files")).toBe(true);
  });

  it("returns MATCH_COUNT_FAILED when a match_count constraint does not hold", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": 'import { thing } from "./dep";\nexport const value = thing;\n'
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "already-present",
            op: "add_import",
            file: "src/index.ts",
            from: "./dep",
            named: ["thing"]
          }
        ],
        constraints: [
          {
            type: "match_count",
            opId: "already-present",
            exactly: 1
          }
        ]
      },
      workspace
    );

    await expectSprigcodeFailure(() => tx.plan(), ERROR_CODES.MATCH_COUNT_FAILED);
  });

  it("records a passing match_count constraint", async () => {
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
        constraints: [{ type: "match_count", opId: "insert", exactly: 1 }]
      },
      workspace
    );

    const plan = await tx.plan();
    expect(plan[0]?.matchCount).toBe(1);
    expect(tx.getResult().constraintResults.some((constraint) => constraint.type === "match_count")).toBe(true);
  });

  it("reports idempotent transactions cleanly when the workspace is stable", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "export const value = 1;\n"
    });
    const tx = await createTsTransaction(
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
        ],
        constraints: [{ type: "idempotent" }]
      },
      workspace
    );

    await tx.plan();
    await tx.apply();
    const result = await tx.verify();

    expect(result.status).toBe("verified");
    expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes("idempotent"))).toBe(false);
    const contents = await readFile(path.join(workspace, "src", "index.ts"), "utf8");
    expect(contents).toContain('import { thing } from "./dep";');
  });
});
