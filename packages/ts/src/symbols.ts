import path from "node:path";
import { ERROR_CODES, sprigcodeError, type TextEdit } from "@sprigcode/core";
import ts from "typescript";
import { findAncestor } from "./parser.js";
import type { TsProject } from "./project.js";
import { relativeFromWorkspace } from "./project.js";

export function renameDeclaration(project: TsProject, declaration: ts.Declaration, newName: string): TextEdit[] {
  const namedDeclaration = declaration as ts.NamedDeclaration;
  if (!namedDeclaration.name || !ts.isIdentifier(namedDeclaration.name)) {
    throw sprigcodeError(ERROR_CODES.UNSUPPORTED_SYNTAX, "Selected symbol cannot be renamed safely.");
  }

  if (namedDeclaration.name.text === newName) {
    return [];
  }

  const locations = project.languageService.findRenameLocations(
    declaration.getSourceFile().fileName,
    namedDeclaration.name.getStart(),
    false,
    false
  );

  if (!locations || locations.length === 0) {
    throw sprigcodeError(ERROR_CODES.ANCHOR_NOT_FOUND, "No rename locations were found.");
  }

  return locations.map((location) => ({
    filePath: relativeFromWorkspace(project, location.fileName),
    start: location.textSpan.start,
    end: location.textSpan.start + location.textSpan.length,
    replacement: newName
  }));
}

export function isExported(declaration: ts.Declaration): boolean {
  const modifiers = ts.canHaveModifiers(declaration) ? ts.getModifiers(declaration) : undefined;
  return Boolean(modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

export function addArgumentAtCallSites(
  project: TsProject,
  declaration: ts.Declaration,
  value: string,
  argumentIndex?: number
): TextEdit[] {
  const namedDeclaration = declaration as ts.NamedDeclaration;
  if (!namedDeclaration.name || !ts.isIdentifier(namedDeclaration.name)) {
    throw sprigcodeError(ERROR_CODES.UNSUPPORTED_SYNTAX, "Call-site updates require an identifier declaration.");
  }

  const references = project.languageService.findReferences(
    declaration.getSourceFile().fileName,
    namedDeclaration.name.getStart()
  );
  const edits: TextEdit[] = [];

  for (const referenceGroup of references ?? []) {
    for (const reference of referenceGroup.references) {
      if (reference.isDefinition) {
        continue;
      }

      const sourceFile = project.program.getSourceFile(reference.fileName);
      if (!sourceFile) {
        continue;
      }

      const token = findTokenAtPosition(sourceFile, reference.textSpan.start);
      const call = token ? findAncestor(token, ts.isCallExpression) : undefined;
      if (!call) {
        if (token && isImportLikeReference(token)) {
          continue;
        }

        throw sprigcodeError(
          ERROR_CODES.UNSUPPORTED_SYNTAX,
          "Encountered a non-call reference while updating call sites.",
          {
            file: relativeFromWorkspace(project, reference.fileName),
            position: reference.textSpan.start
          }
        );
      }

      const args = [...call.arguments];
      const insertIndex = argumentIndex ?? args.length;
      const existing = args[insertIndex];
      if (existing && existing.getText(sourceFile) === value) {
        continue;
      }

      if (!existing && args[insertIndex - 1]?.getText(sourceFile) === value) {
        continue;
      }

      if (insertIndex > args.length) {
        throw sprigcodeError(
          ERROR_CODES.VALUE_NOT_AVAILABLE_IN_CALLER_SCOPE,
          "Requested call-site argument position is outside the supported direct call range.",
          { insertIndex, args: args.length }
        );
      }

      if (args.length === 0) {
        edits.push({
          filePath: relativeFromWorkspace(project, reference.fileName),
          start: call.arguments.pos,
          end: call.arguments.end,
          replacement: value
        });
        continue;
      }

      if (insertIndex === args.length) {
        edits.push({
          filePath: relativeFromWorkspace(project, reference.fileName),
          start: call.arguments.end,
          end: call.arguments.end,
          replacement: `${args.length > 0 ? ", " : ""}${value}`
        });
        continue;
      }

      edits.push({
        filePath: relativeFromWorkspace(project, reference.fileName),
        start: args[insertIndex]!.getStart(sourceFile),
        end: args[insertIndex]!.getStart(sourceFile),
        replacement: `${value}, `
      });
    }
  }

  return edits;
}

function isImportLikeReference(node: ts.Node): boolean {
  return Boolean(
    findAncestor(node, ts.isImportSpecifier) ||
      findAncestor(node, ts.isImportClause) ||
      findAncestor(node, ts.isNamespaceImport) ||
      findAncestor(node, ts.isImportEqualsDeclaration) ||
      findAncestor(node, ts.isExportSpecifier)
  );
}

function findTokenAtPosition(sourceFile: ts.SourceFile, position: number): ts.Node | undefined {
  let current: ts.Node = sourceFile;
  while (true) {
    const children = current.getChildren(sourceFile) as ts.Node[];
    const child = children.find(
      (candidate) => position >= candidate.getFullStart() && position < candidate.getEnd()
    );
    if (!child) {
      return current;
    }
    current = child;
  }
}
