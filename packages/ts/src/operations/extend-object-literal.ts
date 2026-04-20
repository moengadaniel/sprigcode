import type { ExtendObjectLiteralOperation, PlannedOperation, TextEdit } from "@sprigcode/core";
import { ERROR_CODES, sprigcodeError } from "@sprigcode/core";
import ts from "typescript";
import {
  requireUniqueCallAnchor,
  requireUniqueObjectPropertyAnchor
} from "../anchors.js";
import { getIndentation } from "../parser.js";
import type { TsProject } from "../project.js";
import { relativeFromWorkspace } from "../project.js";

function resolveObjectLiteral(project: TsProject, operation: ExtendObjectLiteralOperation): ts.ObjectLiteralExpression {
  if (operation.anchor.type === "call") {
    const call = requireUniqueCallAnchor(project, operation.anchor);
    const argument = call.arguments[operation.argumentIndex ?? 0];
    if (!argument || !ts.isObjectLiteralExpression(argument)) {
      throw sprigcodeError(
        ERROR_CODES.UNSUPPORTED_SYNTAX,
        "Target call argument is not a direct object literal.",
        { opId: operation.id }
      );
    }

    return argument;
  }

  const property = requireUniqueObjectPropertyAnchor(project, operation.anchor);
  if (!ts.isObjectLiteralExpression(property.initializer)) {
    throw sprigcodeError(
      ERROR_CODES.UNSUPPORTED_SYNTAX,
      "Target property initializer is not an object literal.",
      { opId: operation.id }
    );
  }

  return property.initializer;
}

export function planExtendObjectLiteralOperation(
  project: TsProject,
  operation: ExtendObjectLiteralOperation
): PlannedOperation {
  const objectLiteral = resolveObjectLiteral(project, operation);
  if (objectLiteral.properties.some(ts.isSpreadAssignment)) {
    throw sprigcodeError(
      ERROR_CODES.UNSUPPORTED_SYNTAX,
      "Spread-heavy object literals are not supported for extend_object_literal."
    );
  }

  const sourceFile = objectLiteral.getSourceFile();
  const existing = objectLiteral.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === operation.property.key
  );

  const edits: TextEdit[] = [];
  if (existing) {
    const current = existing.initializer.getText(sourceFile);
    if (current !== operation.property.value) {
      edits.push({
        filePath: relativeFromWorkspace(project, sourceFile.fileName),
        start: existing.initializer.getStart(sourceFile),
        end: existing.initializer.getEnd(),
        replacement: operation.property.value
      });
    }
  } else {
    const indentation = getIndentation(sourceFile, objectLiteral.getStart(sourceFile));
    const innerIndent = `${indentation}  `;
    const hasProperties = objectLiteral.properties.length > 0;
    const prefix = hasProperties ? ",\n" : "\n";
    const suffix = hasProperties ? "" : `\n${indentation}`;
    edits.push({
      filePath: relativeFromWorkspace(project, sourceFile.fileName),
      start: objectLiteral.properties.end,
      end: objectLiteral.properties.end,
      replacement: `${prefix}${innerIndent}${operation.property.key}: ${operation.property.value}${suffix}`
    });
  }

  return {
    opId: operation.id,
    op: operation.op,
    edits,
    matchCount: 1
  };
}
