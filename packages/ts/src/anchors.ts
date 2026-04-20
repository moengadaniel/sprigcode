import type { AnchorCandidate, CallAnchor, ObjectPropertyAnchor, SymbolAnchor } from "@sprigcode/core";
import { ERROR_CODES, sprigcodeError } from "@sprigcode/core";
import ts from "typescript";
import { getSourceFile, nodeContext, nodeLineColumn } from "./parser.js";
import type { TsProject } from "./project.js";
import { relativeFromWorkspace } from "./project.js";

function callCalleeName(expression: ts.LeftHandSideExpression): string | undefined {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }

  return undefined;
}

function nearestFunctionName(node: ts.Node): string | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isFunctionExpression(current) ||
      ts.isArrowFunction(current)
    ) {
      const parent = current.parent;
      if ("name" in current && current.name && ts.isIdentifier(current.name)) {
        return current.name.text;
      }

      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        return parent.name.text;
      }
    }
    current = current.parent;
  }

  return undefined;
}

function hasIdentifierName(node: ts.Node): node is ts.NamedDeclaration & { name: ts.Identifier } {
  const name = (node as ts.NamedDeclaration).name;
  return Boolean(name) && ts.isIdentifier(name as ts.Node);
}

function toCandidate(project: TsProject, sourceFile: ts.SourceFile, node: ts.Node): AnchorCandidate {
  const { line, column } = nodeLineColumn(sourceFile, node);
  return {
    file: relativeFromWorkspace(project, sourceFile.fileName),
    line,
    column,
    context: nodeContext(sourceFile, node)
  };
}

export function resolveCallAnchor(project: TsProject, anchor: CallAnchor): ts.CallExpression[] {
  const matches: ts.CallExpression[] = [];
  const files = anchor.file ? [getSourceFile(project, anchor.file)] : project.program.getSourceFiles();

  for (const sourceFile of files) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const callee = callCalleeName(node.expression);
        if (callee === anchor.callee) {
          const enclosing = anchor.enclosingFunction ? nearestFunctionName(node) : undefined;
          if (!anchor.enclosingFunction || enclosing === anchor.enclosingFunction) {
            matches.push(node);
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return matches;
}

export function requireUniqueCallAnchor(project: TsProject, anchor: CallAnchor): ts.CallExpression {
  const matches = resolveCallAnchor(project, anchor);
  if (matches.length === 0) {
    throw sprigcodeError(ERROR_CODES.ANCHOR_NOT_FOUND, `No matching calls to ${anchor.callee} were found.`, {
      anchor
    });
  }

  if (matches.length > 1) {
    throw sprigcodeError(
      ERROR_CODES.ANCHOR_NOT_UNIQUE,
      `Found ${matches.length} matching calls to ${anchor.callee}.`,
      {
        anchor,
        candidates: matches.map((node) => toCandidate(project, node.getSourceFile(), node))
      }
    );
  }

  return matches[0]!;
}

function matchesDeclarationKind(node: ts.Node, kind?: SymbolAnchor["kind"]): boolean {
  if (!kind) {
    return true;
  }

  switch (kind) {
    case "function":
      return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node);
    case "const":
      return ts.isVariableDeclaration(node);
    case "class":
      return ts.isClassDeclaration(node);
    case "method":
      return ts.isMethodDeclaration(node);
    case "type":
      return ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node);
    default:
      return false;
  }
}

export function resolveSymbolAnchor(project: TsProject, anchor: SymbolAnchor): ts.Declaration[] {
  const matches: ts.Declaration[] = [];
  const files = anchor.file ? [getSourceFile(project, anchor.file)] : project.program.getSourceFiles();

  for (const sourceFile of files) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    const visit = (node: ts.Node): void => {
      if (hasIdentifierName(node) && node.name.text === anchor.name) {
        if (matchesDeclarationKind(node, anchor.kind)) {
          matches.push(node as unknown as ts.Declaration);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return matches;
}

export function requireUniqueSymbolAnchor(project: TsProject, anchor: SymbolAnchor): ts.Declaration {
  const matches = resolveSymbolAnchor(project, anchor);
  if (matches.length === 0) {
    throw sprigcodeError(ERROR_CODES.ANCHOR_NOT_FOUND, `No symbol named ${anchor.name} was found.`, {
      anchor
    });
  }

  if (matches.length > 1) {
    throw sprigcodeError(
      ERROR_CODES.ANCHOR_NOT_UNIQUE,
      `Found ${matches.length} matching symbols named ${anchor.name}.`,
      {
        anchor,
        candidates: matches.map((node) => toCandidate(project, node.getSourceFile(), node))
      }
    );
  }

  return matches[0]!;
}

export function resolveObjectPropertyAnchor(
  project: TsProject,
  anchor: ObjectPropertyAnchor
): ts.PropertyAssignment[] {
  const matches: ts.PropertyAssignment[] = [];
  const files = anchor.file ? [getSourceFile(project, anchor.file)] : project.program.getSourceFiles();

  for (const sourceFile of files) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === anchor.key) {
        if (!anchor.enclosingCall) {
          matches.push(node);
        } else {
          const call = findEnclosingCall(node);
          if (call && callCalleeName(call.expression) === anchor.enclosingCall) {
            matches.push(node);
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return matches;
}

function findEnclosingCall(node: ts.Node): ts.CallExpression | undefined {
  let current = node.parent;
  while (current) {
    if (ts.isCallExpression(current)) {
      return current;
    }
    current = current.parent;
  }

  return undefined;
}

export function requireUniqueObjectPropertyAnchor(
  project: TsProject,
  anchor: ObjectPropertyAnchor
): ts.PropertyAssignment {
  const matches = resolveObjectPropertyAnchor(project, anchor);
  if (matches.length === 0) {
    throw sprigcodeError(ERROR_CODES.ANCHOR_NOT_FOUND, `No object property named ${anchor.key} was found.`, {
      anchor
    });
  }

  if (matches.length > 1) {
    throw sprigcodeError(
      ERROR_CODES.ANCHOR_NOT_UNIQUE,
      `Found ${matches.length} matching object properties named ${anchor.key}.`,
      {
        anchor,
        candidates: matches.map((node) => toCandidate(project, node.getSourceFile(), node))
      }
    );
  }

  return matches[0]!;
}
