import type { PlannedOperation, ReplaceCallExpressionOperation } from "@sprigcode/core";
import { requireUniqueCallAnchor } from "../anchors.js";
import type { TsProject } from "../project.js";
import { relativeFromWorkspace } from "../project.js";

export function planReplaceCallExpressionOperation(
  project: TsProject,
  operation: ReplaceCallExpressionOperation
): PlannedOperation {
  const call = requireUniqueCallAnchor(project, operation.anchor);
  const sourceFile = call.getSourceFile();
  const current = call.getText(sourceFile);
  const edits =
    current === operation.replacement
      ? []
      : [
          {
            filePath: relativeFromWorkspace(project, sourceFile.fileName),
            start: call.getStart(sourceFile),
            end: call.getEnd(),
            replacement: operation.replacement
          }
        ];

  return {
    opId: operation.id,
    op: operation.op,
    edits,
    matchCount: 1
  };
}
