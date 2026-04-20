import path from "node:path";
import {
  copyWorkspaceToTemp,
  createTransaction,
  loadTransactionDocument,
  removeTempWorkspace,
  toSprigcodeError,
  type Transaction,
  type SprigcodeError,
  type TransactionResult
} from "@sprigcode/core";
import { typescriptAdapter } from "@sprigcode/ts";

export type ApplyOptions = {
  transactionPath: string;
  workspace: string;
  dryRun?: boolean;
};

export async function applyCommand(
  options: ApplyOptions
): Promise<
  | { ok: true; result: TransactionResult }
  | {
      ok: false;
      error: SprigcodeError;
      transaction?: Partial<TransactionResult>;
    }
> {
  const targetWorkspace = path.resolve(options.workspace);
  const executionWorkspace = options.dryRun ? await copyWorkspaceToTemp(targetWorkspace) : targetWorkspace;
  let tx: Transaction | undefined;

  try {
    tx = await createTransaction({
      document: await loadTransactionDocument(path.resolve(options.transactionPath)),
      workspace: executionWorkspace,
      adapters: [typescriptAdapter()]
    });
    await tx.validate();
    await tx.plan();
    await tx.apply();
    const result = await tx.verify();
    return { ok: true, result };
  } catch (error) {
    if (tx && tx.status === "applied" && !options.dryRun) {
      await tx.rollback();
    }

    return {
      ok: false,
      error: toSprigcodeError(error),
      ...(tx
        ? {
            transaction: {
              transactionId: tx.id,
              language: tx.document.language,
              status: tx.status,
              changedFiles: tx.diffs.map((diff) => diff.filePath),
              touchedFiles: tx.touchedFiles,
              rollbackOccurred: tx.rollbackOccurred
            }
          }
        : {})
    };
  } finally {
    if (options.dryRun) {
      await removeTempWorkspace(executionWorkspace);
    }
  }
}
