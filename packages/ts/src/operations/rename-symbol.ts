import type { PlannedOperation, RenameSymbolOperation } from "@sprigcode/core";
import { ERROR_CODES, SprigcodeFailure } from "@sprigcode/core";
import { requireUniqueSymbolAnchor, resolveSymbolAnchor } from "../anchors.js";
import type { TsProject } from "../project.js";
import { renameDeclaration } from "../symbols.js";

export function planRenameSymbolOperation(
  project: TsProject,
  operation: RenameSymbolOperation
): PlannedOperation {
  let declaration;
  try {
    declaration = requireUniqueSymbolAnchor(project, operation.anchor);
  } catch (error) {
    if (
      error instanceof SprigcodeFailure &&
      error.error.code === ERROR_CODES.ANCHOR_NOT_FOUND &&
      resolveSymbolAnchor(project, {
        ...operation.anchor,
        name: operation.newName
      }).length === 1
    ) {
      return {
        opId: operation.id,
        op: operation.op,
        edits: [],
        matchCount: 1
      };
    }

    throw error;
  }
  const edits = renameDeclaration(project, declaration, operation.newName);
  return {
    opId: operation.id,
    op: operation.op,
    edits,
    matchCount: 1
  };
}
