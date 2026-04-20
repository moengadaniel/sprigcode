import path from "node:path";
import { loadTransactionDocument, toSprigcodeError } from "@sprigcode/core";
import { validateTransactionShape } from "@sprigcode/schema";

export async function validateCommand(transactionPath: string): Promise<{
  ok: boolean;
  output:
    | {
        status: "validated";
        language: string;
        operationCount: number;
      }
    | {
        code: string;
        message: string;
        details?: Record<string, unknown>;
      };
}> {
  try {
    const document = await loadTransactionDocument(path.resolve(transactionPath));
    const schema = validateTransactionShape(document);
    return {
      ok: schema.valid,
      output: schema.valid
        ? {
            status: "validated",
            language: document.language,
            operationCount: document.ops.length
          }
        : {
            code: "INVALID_TRANSACTION_DOCUMENT",
            message: "Transaction document failed schema validation.",
            details: { errors: schema.errors }
          }
    };
  } catch (error) {
    return {
      ok: false,
      output: toSprigcodeError(error)
    };
  }
}
