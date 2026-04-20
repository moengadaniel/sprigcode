import type { AddImportOperation, PlannedOperation } from "@sprigcode/core";
import { planAddImport } from "../imports.js";
import type { TsProject } from "../project.js";

export function planAddImportOperation(
  project: TsProject,
  operation: AddImportOperation
): PlannedOperation {
  const edits = planAddImport(project, operation);
  return {
    opId: operation.id,
    op: operation.op,
    edits,
    matchCount: edits.length > 0 ? 1 : 0
  };
}
