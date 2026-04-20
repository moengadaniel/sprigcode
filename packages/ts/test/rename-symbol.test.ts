import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "../../core/src/index.js";
import { createTsTransaction, createTsWorkspace, expectSprigcodeFailure } from "./helpers.js";

describe("rename_symbol", () => {
  it("renames a local function and references", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "function getUser() { return 1; }\nconst value = getUser();\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "rename",
            op: "rename_symbol",
            anchor: {
              type: "symbol",
              name: "getUser",
              file: "src/index.ts",
              kind: "function"
            },
            newName: "loadUser"
          }
        ],
        constraints: []
      },
      workspace
    );

    await tx.plan();
    await tx.apply();
    const contents = await readFile(path.join(workspace, "src", "index.ts"), "utf8");
    expect(contents).toContain("loadUser");
    expect(contents).not.toContain("getUser()");
  });

  it("fails when the symbol anchor is missing", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "function getUser() { return 1; }\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "missing",
            op: "rename_symbol",
            anchor: {
              type: "symbol",
              name: "missing",
              file: "src/index.ts",
              kind: "function"
            },
            newName: "loadUser"
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
        "function getUser() { return 1; }\nfunction wrapper() { function getUser() { return 2; } return getUser(); }\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "ambiguous",
            op: "rename_symbol",
            anchor: {
              type: "symbol",
              name: "getUser",
              kind: "function"
            },
            newName: "loadUser"
          }
        ],
        constraints: []
      },
      workspace
    );

    await expectSprigcodeFailure(() => tx.plan(), ERROR_CODES.ANCHOR_NOT_UNIQUE);
  });
});
