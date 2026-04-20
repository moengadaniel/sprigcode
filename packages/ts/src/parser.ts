import path from "node:path";
import type ts from "typescript";
import { ERROR_CODES, sprigcodeError } from "@sprigcode/core";
import type { TsProject } from "./project.js";

export function getSourceFile(project: TsProject, relativePath: string): ts.SourceFile {
  const absolute = path.join(project.workspaceRoot, relativePath);
  const sourceFile = project.program.getSourceFile(absolute);
  if (!sourceFile) {
    throw sprigcodeError(ERROR_CODES.ANCHOR_NOT_FOUND, `File ${relativePath} was not found in the project.`, {
      file: relativePath
    });
  }

  return sourceFile;
}

export function nodeLineColumn(sourceFile: ts.SourceFile, node: ts.Node): { line: number; column: number } {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: line + 1, column: character + 1 };
}

export function nodeContext(sourceFile: ts.SourceFile, node: ts.Node): string {
  const text = sourceFile.getFullText().split("\n");
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return text[line]?.trim() ?? "";
}

export function findAncestor<T extends ts.Node>(
  node: ts.Node | undefined,
  predicate: (candidate: ts.Node) => candidate is T
): T | undefined {
  let current = node?.parent;
  while (current) {
    if (predicate(current)) {
      return current;
    }
    current = current.parent;
  }

  return undefined;
}

export function getIndentation(sourceFile: ts.SourceFile, position: number): string {
  const text = sourceFile.getFullText();
  let cursor = position;
  while (cursor > 0 && text[cursor - 1] !== "\n") {
    cursor -= 1;
  }

  const match = /^[ \t]*/.exec(text.slice(cursor));
  return match?.[0] ?? "";
}

export function getNodeText(sourceFile: ts.SourceFile, node: ts.Node): string {
  return sourceFile.getFullText().slice(node.getStart(sourceFile), node.getEnd());
}
