import type { PlannedOperation, RemoveImportOperation } from "@sprigcode/core";
import { planRemoveImport } from "../imports.js";
import type { TsProject } from "../project.js";

export function planRemoveImportOperation(
  project: TsProject,
  operation: RemoveImportOperation
): PlannedOperation {
  const edits = planRemoveImport(project, operation);
  return {
    opId: operation.id,
    op: operation.op,
    edits,
    matchCount: edits.length > 0 ? 1 : 0
  };
}
