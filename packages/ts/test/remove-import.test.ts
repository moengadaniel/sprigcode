import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "../../core/src/index.js";
import { createTsTransaction, createTsWorkspace, expectSprigcodeFailure } from "./helpers.js";

describe("remove_import", () => {
  it("removes the import", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": 'import { thing } from "./dep";\nexport const value = thing;\n'
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "remove-import",
            op: "remove_import",
            file: "src/index.ts",
            from: "./dep",
            named: ["thing"]
          }
        ],
        constraints: []
      },
      workspace
    );

    await tx.plan();
    await tx.apply();

    const contents = await readFile(path.join(workspace, "src", "index.ts"), "utf8");
    expect(contents).not.toContain('from "./dep"');
  });

  it("fails when the target file is missing", async () => {
    const workspace = await createTsWorkspace({});
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "missing-file",
            op: "remove_import",
            file: "src/missing.ts",
            from: "./dep",
            named: ["thing"]
          }
        ],
        constraints: []
      },
      workspace
    );

    await expectSprigcodeFailure(() => tx.plan(), ERROR_CODES.ANCHOR_NOT_FOUND);
  });

  it("fails closed when multiple matching import declarations exist", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": 'import { a } from "./dep";\nimport { b } from "./dep";\nexport const value = a + b;\n'
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "ambiguous-import",
            op: "remove_import",
            file: "src/index.ts",
            from: "./dep",
            named: ["a"]
          }
        ],
        constraints: []
      },
      workspace
    );

    await expectSprigcodeFailure(() => tx.plan(), ERROR_CODES.ANCHOR_NOT_UNIQUE);
  });
});
