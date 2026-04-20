import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "../../core/src/index.js";
import { createTsTransaction, createTsWorkspace, expectSprigcodeFailure } from "./helpers.js";

describe("extend_object_literal", () => {
  it("extends a nested object literal", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "const query = { where: { id: userId } };\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "extend",
            op: "extend_object_literal",
            anchor: {
              type: "objectProperty",
              key: "where",
              file: "src/index.ts"
            },
            property: {
              key: "tenantId",
              value: "tenantId"
            }
          }
        ],
        constraints: []
      },
      workspace
    );

    await tx.plan();
    await tx.apply();
    const contents = await readFile(path.join(workspace, "src", "index.ts"), "utf8");
    expect(contents).toContain("tenantId: tenantId");
  });

  it("fails when the object property anchor is missing", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "const query = { filters: { id: userId } };\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "missing",
            op: "extend_object_literal",
            anchor: {
              type: "objectProperty",
              key: "where",
              file: "src/index.ts"
            },
            property: {
              key: "tenantId",
              value: "tenantId"
            }
          }
        ],
        constraints: []
      },
      workspace
    );

    await expectSprigcodeFailure(() => tx.plan(), ERROR_CODES.ANCHOR_NOT_FOUND);
  });

  it("fails closed when the object property anchor is ambiguous", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts":
        "const a = { where: { id: userId } };\nconst b = { where: { id: otherUserId } };\n"
    });
    const tx = await createTsTransaction(
      {
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "ambiguous",
            op: "extend_object_literal",
            anchor: {
              type: "objectProperty",
              key: "where"
            },
            property: {
              key: "tenantId",
              value: "tenantId"
            }
          }
        ],
        constraints: []
      },
      workspace
    );

    await expectSprigcodeFailure(() => tx.plan(), ERROR_CODES.ANCHOR_NOT_UNIQUE);
  });
});
