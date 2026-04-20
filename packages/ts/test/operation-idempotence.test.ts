import { describe, expect, it } from "vitest";
import { createTsTransaction, createTsWorkspace } from "./helpers.js";

describe("operation idempotence", () => {
  it("add_import is idempotent", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "export const value = 1;\n"
    });
    const document = {
      version: "0.1" as const,
      language: "typescript",
      ops: [
        {
          id: "add-import",
          op: "add_import" as const,
          file: "src/index.ts",
          from: "./dep",
          named: ["thing"]
        }
      ],
      constraints: []
    };

    const first = await createTsTransaction(document, workspace);
    await first.plan();
    await first.apply();

    const second = await createTsTransaction(document, workspace);
    const plan = await second.plan();
    expect(plan.flatMap((operation) => operation.edits)).toHaveLength(0);
  });

  it("remove_import is idempotent", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": 'import { thing } from "./dep";\nexport const value = 1;\n'
    });
    const document = {
      version: "0.1" as const,
      language: "typescript",
      ops: [
        {
          id: "remove-import",
          op: "remove_import" as const,
          file: "src/index.ts",
          from: "./dep",
          named: ["thing"]
        }
      ],
      constraints: []
    };

    const first = await createTsTransaction(document, workspace);
    await first.plan();
    await first.apply();

    const second = await createTsTransaction(document, workspace);
    const plan = await second.plan();
    expect(plan.flatMap((operation) => operation.edits)).toHaveLength(0);
  });

  it("rename_symbol is idempotent", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "function getUser() { return 1; }\nconst value = getUser();\n"
    });
    const document = {
      version: "0.1" as const,
      language: "typescript",
      ops: [
        {
          id: "rename",
          op: "rename_symbol" as const,
          anchor: {
            type: "symbol" as const,
            name: "getUser",
            file: "src/index.ts",
            kind: "function" as const
          },
          newName: "loadUser"
        }
      ],
      constraints: []
    };

    const first = await createTsTransaction(document, workspace);
    await first.plan();
    await first.apply();

    const second = await createTsTransaction(document, workspace);
    const plan = await second.plan();
    expect(plan.flatMap((operation) => operation.edits)).toHaveLength(0);
  });

  it("add_required_parameter is idempotent", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "function getUser(id: string) { return id; }\nconst value = getUser(\"1\");\n"
    });
    const document = {
      version: "0.1" as const,
      language: "typescript",
      ops: [
        {
          id: "add-param",
          op: "add_required_parameter" as const,
          anchor: {
            type: "symbol" as const,
            name: "getUser",
            file: "src/index.ts",
            kind: "function" as const
          },
          parameterName: "tenantId",
          parameterType: "string",
          value: "\"tenant-1\"",
          updateCallSites: true
        }
      ],
      constraints: []
    };

    const first = await createTsTransaction(document, workspace);
    await first.plan();
    await first.apply();

    const second = await createTsTransaction(document, workspace);
    const plan = await second.plan();
    expect(plan.flatMap((operation) => operation.edits)).toHaveLength(0);
  });

  it("update_call_sites is idempotent", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "function getUser(id: string) { return id; }\nconst value = getUser(\"1\");\n"
    });
    const document = {
      version: "0.1" as const,
      language: "typescript",
      ops: [
        {
          id: "update-call-sites",
          op: "update_call_sites" as const,
          anchor: {
            type: "symbol" as const,
            name: "getUser",
            file: "src/index.ts",
            kind: "function" as const
          },
          value: "\"tenant-1\""
        }
      ],
      constraints: []
    };

    const first = await createTsTransaction(document, workspace);
    await first.plan();
    await first.apply();

    const second = await createTsTransaction(document, workspace);
    const plan = await second.plan();
    expect(plan.flatMap((operation) => operation.edits)).toHaveLength(0);
  });

  it("extend_object_literal is idempotent", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "const query = { where: { id: userId } };\n"
    });
    const document = {
      version: "0.1" as const,
      language: "typescript",
      ops: [
        {
          id: "extend",
          op: "extend_object_literal" as const,
          anchor: {
            type: "objectProperty" as const,
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
    };

    const first = await createTsTransaction(document, workspace);
    await first.plan();
    await first.apply();

    const second = await createTsTransaction(document, workspace);
    const plan = await second.plan();
    expect(plan.flatMap((operation) => operation.edits)).toHaveLength(0);
  });

  it("replace_call_expression is idempotent", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "const value = sendEmail(user);\n"
    });
    const document = {
      version: "0.1" as const,
      language: "typescript",
      ops: [
        {
          id: "replace",
          op: "replace_call_expression" as const,
          anchor: {
            type: "call" as const,
            callee: "sendEmail",
            file: "src/index.ts"
          },
          replacement: "sendEmail(user, auditContext)"
        }
      ],
      constraints: []
    };

    const first = await createTsTransaction(document, workspace);
    await first.plan();
    await first.apply();

    const second = await createTsTransaction(document, workspace);
    const plan = await second.plan();
    expect(plan.flatMap((operation) => operation.edits)).toHaveLength(0);
  });

  it("insert_statement_before_call is idempotent", async () => {
    const workspace = await createTsWorkspace({
      "src/index.ts": "async function run() {\n  await sendEmail(user);\n}\n"
    });
    const document = {
      version: "0.1" as const,
      language: "typescript",
      ops: [
        {
          id: "insert",
          op: "insert_statement_before_call" as const,
          anchor: {
            type: "call" as const,
            callee: "sendEmail",
            file: "src/index.ts",
            enclosingFunction: "run"
          },
          statement: "await guard(user)"
        }
      ],
      constraints: []
    };

    const first = await createTsTransaction(document, workspace);
    await first.plan();
    await first.apply();

    const second = await createTsTransaction(document, workspace);
    const plan = await second.plan();
    expect(plan.flatMap((operation) => operation.edits)).toHaveLength(0);
  });
});
