import { describe, expect, it } from "vitest";
import { formatHumanResult } from "../src/reporter.js";
import type { TransactionResult } from "../src/transaction.js";

describe("formatHumanResult", () => {
  it("makes the verification path and diff summary obvious", () => {
    const result: TransactionResult = {
      transactionId: "tx-demo",
      language: "typescript",
      status: "verified",
      operationCount: 2,
      changedFiles: ["src/auth/reset-password.ts"],
      touchedFiles: ["src/auth/reset-password.ts"],
      rollbackOccurred: false,
      diagnostics: [{ level: "info", message: "TypeScript adapter planning started." }],
      constraintResults: [
        {
          type: "match_count",
          status: "passed",
          message: "Operation insert-rate-limit-check matched 1 node."
        },
        {
          type: "idempotent",
          status: "passed",
          message: "Applying the transaction a second time produced no further edits."
        }
      ],
      operationResults: [
        {
          opId: "add-rate-limit-import",
          op: "add_import",
          status: "changed",
          editCount: 1,
          changedFiles: ["src/auth/reset-password.ts"],
          matchCount: 0,
          diagnostics: []
        },
        {
          opId: "insert-rate-limit-check",
          op: "insert_statement_before_call",
          status: "changed",
          editCount: 1,
          changedFiles: ["src/auth/reset-password.ts"],
          matchCount: 1,
          diagnostics: []
        }
      ],
      diffs: [
        {
          filePath: "src/auth/reset-password.ts",
          diff: "--- src/auth/reset-password.ts\n+++ src/auth/reset-password.ts\n@@\n+import { rateLimit } from '@/lib/rate-limit';\n"
        }
      ],
      diffSummary: {
        fileCount: 1,
        addedLineCount: 2,
        removedLineCount: 0,
        files: [
          {
            filePath: "src/auth/reset-password.ts",
            addedLineCount: 2,
            removedLineCount: 0
          }
        ]
      }
    };

    const output = formatHumanResult(result);

    expect(output).toContain("Transaction verified.");
    expect(output).toContain("Lifecycle: validated -> planned -> applied -> verified");
    expect(output).toContain("Diff summary:");
    expect(output).toContain("add-rate-limit-import [add_import]");
    expect(output).toContain("insert-rate-limit-check [insert_statement_before_call]");
    expect(output).toContain("matched 1 node(s)");
    expect(output).toContain("Constraint checks:");
  });
});
