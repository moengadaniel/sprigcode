import { readFile } from "node:fs/promises";
import type { Constraint } from "./constraints.js";
import { ERROR_CODES, sprigcodeError } from "./errors.js";
import type { Operation, OperationName } from "./operations.js";

export type TransactionDocument = {
  version: "0.1";
  language: string;
  description?: string;
  ops: Operation[];
  constraints: Constraint[];
};

const SUPPORTED_OPERATIONS: ReadonlySet<OperationName> = new Set([
  "add_import",
  "remove_import",
  "rename_symbol",
  "add_required_parameter",
  "update_call_sites",
  "extend_object_literal",
  "replace_call_expression",
  "insert_statement_before_call"
]);

export async function loadTransactionDocument(filePath: string): Promise<TransactionDocument> {
  const text = await readFile(filePath, "utf8");
  const parsed = JSON.parse(text) as unknown;
  return validateTransactionDocument(parsed);
}

export function validateTransactionDocument(value: unknown): TransactionDocument {
  if (typeof value !== "object" || value === null) {
    throw sprigcodeError(ERROR_CODES.INVALID_TRANSACTION_DOCUMENT, "Transaction document must be an object.");
  }

  const candidate = value as Partial<TransactionDocument> & { ops?: Array<{ id?: string; op?: string }> };

  if (candidate.version !== "0.1") {
    throw sprigcodeError(ERROR_CODES.INVALID_TRANSACTION_DOCUMENT, "Transaction version must be 0.1.");
  }

  if (typeof candidate.language !== "string" || candidate.language.length === 0) {
    throw sprigcodeError(ERROR_CODES.INVALID_TRANSACTION_DOCUMENT, "Transaction language is required.");
  }

  if (!Array.isArray(candidate.ops)) {
    throw sprigcodeError(ERROR_CODES.INVALID_TRANSACTION_DOCUMENT, "Transaction ops must be an array.");
  }

  const ids = new Set<string>();
  for (const op of candidate.ops) {
    if (!op || typeof op.id !== "string" || op.id.length === 0) {
      throw sprigcodeError(ERROR_CODES.INVALID_TRANSACTION_DOCUMENT, "Every operation must include a stable id.", {
        op
      });
    }

    if (ids.has(op.id)) {
      throw sprigcodeError(ERROR_CODES.INVALID_TRANSACTION_DOCUMENT, `Duplicate operation id ${op.id}.`);
    }

    ids.add(op.id);

    if (typeof op.op !== "string" || !SUPPORTED_OPERATIONS.has(op.op as OperationName)) {
      throw sprigcodeError(ERROR_CODES.UNSUPPORTED_OPERATION, `Unsupported operation ${String(op.op)}.`, {
        opId: op.id,
        op: op.op
      });
    }
  }

  return {
    version: "0.1",
    language: candidate.language,
    ...(candidate.description ? { description: candidate.description } : {}),
    ops: candidate.ops as Operation[],
    constraints: Array.isArray(candidate.constraints) ? (candidate.constraints as Constraint[]) : []
  };
}
