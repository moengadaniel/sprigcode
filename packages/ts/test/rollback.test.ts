import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createTransaction, validateTransactionDocument } from "../../core/src/index.js";
import { typescriptAdapter } from "../src/index.js";

describe("rollback", () => {
  it("restores touched files", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "sprigcode-ts-"));
    await mkdir(path.join(workspace, "src"), { recursive: true });
    const file = path.join(workspace, "src", "index.ts");
    await writeFile(file, "export const value = 1;\n", "utf8");

    const tx = await createTransaction({
      document: validateTransactionDocument({
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
      }),
      workspace,
      adapters: [typescriptAdapter()]
    });

    await tx.plan();
    await tx.apply();
    await tx.rollback();

    const contents = await readFile(file, "utf8");
    expect(contents).toBe("export const value = 1;\n");
  });

  it("restores all touched files for a multi-file edit", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "sprigcode-ts-"));
    await mkdir(path.join(workspace, "src"), { recursive: true });
    const primary = path.join(workspace, "src", "reset.ts");
    const caller = path.join(workspace, "src", "route.ts");
    await writeFile(
      primary,
      "export function requestPasswordReset(email: string) { return email; }\n",
      "utf8"
    );
    await writeFile(
      caller,
      'import { requestPasswordReset } from "./reset";\nexport function handle(email: string, tenantId: string) { return requestPasswordReset(email); }\n',
      "utf8"
    );

    const tx = await createTransaction({
      document: validateTransactionDocument({
        version: "0.1",
        language: "typescript",
        ops: [
          {
            id: "add-param",
            op: "add_required_parameter",
            anchor: {
              type: "symbol",
              name: "requestPasswordReset",
              file: "src/reset.ts",
              kind: "function"
            },
            parameterName: "tenantId",
            parameterType: "string",
            value: "tenantId",
            updateCallSites: true
          }
        ]
      }),
      workspace,
      adapters: [typescriptAdapter()]
    });

    await tx.plan();
    await tx.apply();
    await tx.rollback();

    expect(await readFile(primary, "utf8")).toBe(
      "export function requestPasswordReset(email: string) { return email; }\n"
    );
    expect(await readFile(caller, "utf8")).toBe(
      'import { requestPasswordReset } from "./reset";\nexport function handle(email: string, tenantId: string) { return requestPasswordReset(email); }\n'
    );
  });
});
