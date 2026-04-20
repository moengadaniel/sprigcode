import type { SprigcodeError, TransactionResult } from "@sprigcode/core";
import { formatHumanResult } from "@sprigcode/core";

export function formatSuccess(
  command: string,
  payload: TransactionResult | Record<string, unknown>,
  json: boolean
): string {
  if (json) {
    return JSON.stringify(
      {
        ok: true,
        command,
        ...("transactionId" in payload ? { transaction: payload } : { result: payload })
      },
      null,
      2
    );
  }

  return "transactionId" in payload ? formatHumanResult(payload as TransactionResult) : JSON.stringify(payload, null, 2);
}

export function formatValidationSuccess(
  payload: {
    status: "validated";
    language: string;
    operationCount: number;
  },
  json: boolean
): string {
  if (json) {
    return formatSuccess("validate", payload, true);
  }

  return [
    "Transaction document is valid.",
    `Language: ${payload.language}`,
    `Operations: ${payload.operationCount}`
  ].join("\n");
}

export function formatFailure(command: string, error: SprigcodeError, json: boolean): string {
  return formatFailureWithContext(command, error, undefined, json);
}

export function formatFailureWithContext(
  command: string,
  error: SprigcodeError,
  transaction: Record<string, unknown> | undefined,
  json: boolean
): string {
  if (json) {
    return JSON.stringify(
      {
        ok: false,
        command,
        ...(transaction ? { transaction } : {}),
        error
      },
      null,
      2
    );
  }

  const lines = [`${error.code}: ${error.message}`];
  if (error.code === "ANCHOR_NOT_UNIQUE") {
    lines.push("Sprigcode refused to guess.");
  } else if (
    error.code === "ANCHOR_NOT_FOUND" ||
    error.code === "UNSUPPORTED_SYNTAX" ||
    error.code === "UNSUPPORTED_OPERATION"
  ) {
    lines.push("Sprigcode refused the edit before mutating files.");
  }
  if (transaction && "status" in transaction) {
    lines.push(`Status: ${String(transaction.status)}`);
  }
  if (transaction && "rollbackOccurred" in transaction) {
    lines.push(`Rollback: ${transaction.rollbackOccurred ? "yes" : "no"}`);
  }
  if (transaction && "changedFiles" in transaction && Array.isArray(transaction.changedFiles)) {
    const changedFiles = transaction.changedFiles as string[];
    if (changedFiles.length > 0) {
      lines.push("Changed files:");
      for (const file of changedFiles) {
        lines.push(`  ${file}`);
      }
    }
  }

  return lines.join("\n");
}
