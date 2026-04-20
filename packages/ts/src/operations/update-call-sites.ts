import type { PlannedOperation, UpdateCallSitesOperation } from "@sprigcode/core";
import { requireUniqueSymbolAnchor } from "../anchors.js";
import type { TsProject } from "../project.js";
import { addArgumentAtCallSites } from "../symbols.js";

export function planUpdateCallSitesOperation(
  project: TsProject,
  operation: UpdateCallSitesOperation
): PlannedOperation {
  const declaration = requireUniqueSymbolAnchor(project, operation.anchor);
  const edits = addArgumentAtCallSites(project, declaration, operation.value, operation.argumentIndex);
  return {
    opId: operation.id,
    op: operation.op,
    edits,
    matchCount: edits.length
  };
}
