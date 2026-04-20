import type { InsertStatementBeforeCallOperation, PlannedOperation } from "@sprigcode/core";
import { ERROR_CODES, sprigcodeError } from "@sprigcode/core";
import ts from "typescript";
import { requireUniqueCallAnchor } from "../anchors.js";
import { findAncestor, getIndentation } from "../parser.js";
import type { TsProject } from "../project.js";
import { relativeFromWorkspace } from "../project.js";

export function planInsertStatementBeforeCallOperation(
  project: TsProject,
  operation: InsertStatementBeforeCallOperation
): PlannedOperation {
  const call = requireUniqueCallAnchor(project, operation.anchor);
  const statement = findAncestor(call, ts.isStatement);
  if (!statement || !ts.isBlock(statement.parent)) {
    throw sprigcodeError(
      ERROR_CODES.UNSUPPORTED_SYNTAX,
      "Call is not in a supported statement position for insert_statement_before_call."
    );
  }

  const block = statement.parent;
  const index = block.statements.findIndex((candidate) => candidate === statement);
  const previous = index > 0 ? block.statements[index - 1] : undefined;
  const sourceFile = call.getSourceFile();
  const normalizedStatement = operation.statement.trim().replace(/;?$/, ";");
  if (previous && previous.getText(sourceFile).trim() === normalizedStatement) {
    return {
      opId: operation.id,
      op: operation.op,
      edits: [],
      matchCount: 1
    };
  }

  const indentation = getIndentation(sourceFile, statement.getStart(sourceFile));
  const insertionStart = statement.getStart(sourceFile) - indentation.length;
  return {
    opId: operation.id,
    op: operation.op,
    edits: [
      {
        filePath: relativeFromWorkspace(project, sourceFile.fileName),
        start: insertionStart,
        end: insertionStart,
        replacement: `${indentation}${normalizedStatement}\n`
      }
    ],
    matchCount: 1
  };
}
