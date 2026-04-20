import path from "node:path";
import type { LanguageAdapter } from "@sprigcode/core";
import { createTransaction, loadTransactionDocument } from "@sprigcode/core";
import { expectDirectoriesToMatch } from "./assertions.js";
import { createTempProject, removeTempProject } from "./temp-project.js";

export async function runGoldenCase(exampleRoot: string, adapters: LanguageAdapter[]): Promise<void> {
  const beforeRoot = path.join(exampleRoot, "before");
  const afterRoot = path.join(exampleRoot, "after");
  const transactionPath = path.join(exampleRoot, "transaction.sprigcode.json");
  const workspace = await createTempProject(beforeRoot);

  try {
    const tx = await createTransaction({
      document: await loadTransactionDocument(transactionPath),
      workspace,
      adapters
    });

    await tx.plan();
    await tx.apply();
    await tx.verify();
    await expectDirectoriesToMatch(workspace, afterRoot);
  } finally {
    await removeTempProject(workspace);
  }
}
