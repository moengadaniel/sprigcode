import type { TransactionResult } from "./transaction.js";

export function formatHumanResult(result: TransactionResult): string {
  const lines = [
    `Transaction ${result.status}.`,
    "Lifecycle: validated -> planned -> applied -> verified",
    `Typed operations: ${result.operationCount}`,
    `Files changed: ${result.changedFiles.length}`,
    `Rollback: ${result.rollbackOccurred ? "yes" : "no"}`
  ];

  if (result.diffs.length > 0) {
    lines.push("Diff summary:");
    for (const file of result.diffSummary.files) {
      lines.push(`  ${file.filePath} (+${file.addedLineCount} -${file.removedLineCount})`);
    }
  }

  if (result.operationResults.length > 0) {
    lines.push("Operation results:");
    for (const operation of result.operationResults) {
      const matchText =
        operation.matchCount > 0 ? `, matched ${operation.matchCount} node(s)` : "";
      lines.push(
        `  ${operation.opId} [${operation.op}]: ${operation.status}, ${operation.editCount} edit(s), ${operation.changedFiles.length} file(s)${matchText}`
      );
    }
  }

  if (result.constraintResults.length > 0) {
    lines.push("Constraint checks:");
    for (const constraint of result.constraintResults) {
      lines.push(`  ${constraint.type}: ${constraint.status}`);
      lines.push(`    ${constraint.message}`);
    }
  }

  if (result.diagnostics.length > 0) {
    lines.push("Diagnostics:");
    for (const diagnostic of result.diagnostics) {
      lines.push(`  [${diagnostic.level}] ${diagnostic.message}`);
    }
  }

  return lines.join("\n");
}
