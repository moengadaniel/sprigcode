import { applyCommand } from "./apply.js";

export async function checkCommand(transactionPath: string, workspace: string) {
  return applyCommand({
    transactionPath,
    workspace,
    dryRun: true
  });
}

