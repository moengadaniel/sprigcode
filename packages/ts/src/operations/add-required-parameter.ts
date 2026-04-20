import type { AddRequiredParameterOperation, PlannedOperation, TextEdit } from "@sprigcode/core";
import { ERROR_CODES, sprigcodeError } from "@sprigcode/core";
import ts from "typescript";
import { requireUniqueSymbolAnchor } from "../anchors.js";
import type { TsProject } from "../project.js";
import { relativeFromWorkspace } from "../project.js";
import { addArgumentAtCallSites, isExported } from "../symbols.js";

function supportedFunction(
  declaration: ts.Declaration
):
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration {
  if (
    ts.isFunctionDeclaration(declaration) ||
    ts.isFunctionExpression(declaration) ||
    ts.isArrowFunction(declaration) ||
    ts.isMethodDeclaration(declaration)
  ) {
    return declaration;
  }

  throw sprigcodeError(ERROR_CODES.UNSUPPORTED_SYNTAX, "Selected symbol is not a supported function-like target.");
}

function parameterText(operation: AddRequiredParameterOperation): string {
  return operation.parameterType
    ? `${operation.parameterName}: ${operation.parameterType}`
    : operation.parameterName;
}

function planParameterEdit(
  project: TsProject,
  operation: AddRequiredParameterOperation,
  declaration: ts.SignatureDeclarationBase
): TextEdit[] {
  const sourceFile = declaration.getSourceFile();
  const params = [...declaration.parameters];
  const requested = parameterText(operation);
  const existing = params.find((parameter) => parameter.name.getText(sourceFile) === operation.parameterName);
  if (existing) {
    return [];
  }

  const insertIndex = operation.position ?? params.length;
  if (insertIndex > params.length) {
    throw sprigcodeError(
      ERROR_CODES.UNSUPPORTED_SYNTAX,
      `Requested parameter position ${insertIndex} exceeds supported parameter count ${params.length}.`
    );
  }

  if (params.length === 0) {
    return [
      {
        filePath: relativeFromWorkspace(project, sourceFile.fileName),
        start: declaration.parameters.pos,
        end: declaration.parameters.end,
        replacement: requested
      }
    ];
  }

  if (insertIndex === params.length) {
    return [
      {
        filePath: relativeFromWorkspace(project, sourceFile.fileName),
        start: declaration.parameters.end,
        end: declaration.parameters.end,
        replacement: `, ${requested}`
      }
    ];
  }

  return [
    {
      filePath: relativeFromWorkspace(project, sourceFile.fileName),
      start: params[insertIndex]!.getStart(sourceFile),
      end: params[insertIndex]!.getStart(sourceFile),
      replacement: `${requested}, `
    }
  ];
}

export function planAddRequiredParameterOperation(
  project: TsProject,
  operation: AddRequiredParameterOperation,
  disallowPublicApiChange: boolean
): PlannedOperation {
  const declaration = supportedFunction(requireUniqueSymbolAnchor(project, operation.anchor));
  if (disallowPublicApiChange && isExported(declaration)) {
    throw sprigcodeError(
      ERROR_CODES.PUBLIC_API_BOUNDARY,
      `Refusing to change exported function ${operation.anchor.name} while no_public_api_change is enabled.`,
      { symbol: operation.anchor.name }
    );
  }

  const edits = planParameterEdit(project, operation, declaration);
  if (operation.updateCallSites) {
    edits.push(...addArgumentAtCallSites(project, declaration, operation.value, operation.position));
  }

  return {
    opId: operation.id,
    op: operation.op,
    edits,
    matchCount: 1
  };
}
