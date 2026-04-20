import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "../../core/src/index.js";
import { createTsTransaction, createTsWorkspace, expectSprigcodeFailure } from "./helpers.js";

describe("add_required_parameter", () => {
  it("adds a parameter and updates direct call sites", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "function getUser(id: string) { return id; }\nconst value = getUser(\"1\");\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "add-param",
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
        constraints: []
      },
      workspace
    );

    await tx.plan();
    await tx.apply();
    const contents = await readFile(path.join(workspace, "src", "index.ts"), "utf8");
    expect(contents).toContain("tenantId: string");
    expect(contents).toContain("getUser(\"1\", \"tenant-1\")");
  });

  it("fails when the symbol anchor is missing", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "function getUser(id: string) { return id; }\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "missing",
            op: "add_required_parameter",
            anchor: {
              type: "symbol",
              name: "missing",
              file: "src/index.ts",
              kind: "function"
            },
            parameterName: "tenantId",
            parameterType: "string",
            value: "\"tenant-1\""
          }
        ],
        constraints: []
      },
      workspace
    );

    await expectSprigcodeFailure(() => tx.plan(), ERROR_CODES.ANCHOR_NOT_FOUND);
  });

  it("fails closed when the symbol anchor is ambiguous", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts":
        "function getUser(id: string) { return id; }\nfunction wrapper() { function getUser(id: string) { return id; } return getUser(\"x\"); }\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "ambiguous",
            op: "add_required_parameter",
            anchor: {
              type: "symbol",
              name: "getUser",
              kind: "function"
            },
            parameterName: "tenantId",
            parameterType: "string",
            value: "\"tenant-1\""
          }
        ],
        constraints: []
      },
      workspace
    );

    await expectSprigcodeFailure(() => tx.plan(), ERROR_CODES.ANCHOR_NOT_UNIQUE);
  });
});
