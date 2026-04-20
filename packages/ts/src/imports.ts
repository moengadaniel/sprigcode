import type { AddImportOperation, AnchorCandidate, RemoveImportOperation, TextEdit } from "@sprigcode/core";
import { ERROR_CODES, sprigcodeError } from "@sprigcode/core";
import ts from "typescript";
import { getSourceFile, getNodeText, nodeContext, nodeLineColumn } from "./parser.js";
import type { TsProject } from "./project.js";
import { relativeFromWorkspace } from "./project.js";

type ImportShape = {
  default?: string;
  namespace?: string;
  named: string[];
};

function extractImportShape(declaration: ts.ImportDeclaration): ImportShape {
  const clause = declaration.importClause;
  const shape: ImportShape = { named: [] };

  if (!clause) {
    return shape;
  }

  if (clause.name) {
    shape.default = clause.name.text;
  }

  if (clause.namedBindings) {
    if (ts.isNamespaceImport(clause.namedBindings)) {
      shape.namespace = clause.namedBindings.name.text;
    } else {
      shape.named = clause.namedBindings.elements.map((element) => element.name.text);
    }
  }

  return shape;
}

function buildImportText(from: string, shape: ImportShape): string {
  const parts: string[] = [];
  if (shape.default) {
    parts.push(shape.default);
  }

  if (shape.namespace) {
    parts.push(`* as ${shape.namespace}`);
  } else if (shape.named.length > 0) {
    parts.push(`{ ${shape.named.join(", ")} }`);
  }

  if (parts.length === 0) {
    return `import "${from}";`;
  }

  return `import ${parts.join(", ")} from "${from}";`;
}

function mergeAddImport(shape: ImportShape, operation: AddImportOperation): ImportShape {
  const next: ImportShape = {
    default: shape.default,
    namespace: shape.namespace,
    named: [...shape.named]
  };

  if (operation.default) {
    if (next.default && next.default !== operation.default) {
      throw sprigcodeError(
        ERROR_CODES.UNSUPPORTED_SYNTAX,
        `Import from ${operation.from} already has a different default binding.`
      );
    }
    next.default = operation.default;
  }

  if (operation.namespace) {
    if (next.namespace && next.namespace !== operation.namespace) {
      throw sprigcodeError(
        ERROR_CODES.UNSUPPORTED_SYNTAX,
        `Import from ${operation.from} already has a different namespace binding.`
      );
    }
    next.namespace = operation.namespace;
  }

  for (const name of operation.named ?? []) {
    if (!next.named.includes(name)) {
      next.named.push(name);
    }
  }

  return next;
}

function importCandidate(project: TsProject, sourceFile: ts.SourceFile, declaration: ts.ImportDeclaration): AnchorCandidate {
  const { line, column } = nodeLineColumn(sourceFile, declaration);
  return {
    file: relativeFromWorkspace(project, sourceFile.fileName),
    line,
    column,
    context: nodeContext(sourceFile, declaration)
  };
}

export function planAddImport(project: TsProject, operation: AddImportOperation): TextEdit[] {
  const sourceFile = getSourceFile(project, operation.file);
  const declarations = sourceFile.statements.filter(
    (statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === operation.from
  );

  if (declarations.length > 1) {
    throw sprigcodeError(
      ERROR_CODES.ANCHOR_NOT_UNIQUE,
      `Found ${declarations.length} matching imports from ${operation.from}.`,
      {
        file: operation.file,
        candidates: declarations.map((declaration) => importCandidate(project, sourceFile, declaration))
      }
    );
  }

  if (declarations.length === 1) {
    const existing = declarations[0]!;
    const merged = mergeAddImport(extractImportShape(existing), operation);
    const nextText = buildImportText(operation.from, merged);
    const currentText = getNodeText(sourceFile, existing);
    if (currentText === nextText) {
      return [];
    }

    return [
      {
        filePath: operation.file,
        start: existing.getStart(sourceFile),
        end: existing.getEnd(),
        replacement: nextText
      }
    ];
  }

  const importShape = mergeAddImport({ named: [] }, operation);
  const body = buildImportText(operation.from, importShape);
  const importStatements = sourceFile.statements.filter(ts.isImportDeclaration);
  const lastImport = importStatements.length > 0 ? importStatements[importStatements.length - 1] : undefined;
  if (lastImport) {
    const position = lastImport.getEnd();
    return [
      {
        filePath: operation.file,
        start: position,
        end: position,
        replacement: `\n${body}`
      }
    ];
  }

  const position = 0;
  const suffix = sourceFile.statements.length > 0 ? "\n\n" : "\n";
  return [
    {
      filePath: operation.file,
      start: position,
      end: position,
      replacement: `${body}${suffix}`
    }
  ];
}

function removeNames(shape: ImportShape, names: string[]): ImportShape {
  return {
    default: names.includes(shape.default ?? "") ? undefined : shape.default,
    namespace: names.includes(shape.namespace ?? "") ? undefined : shape.namespace,
    named: shape.named.filter((name) => !names.includes(name))
  };
}

export function planRemoveImport(project: TsProject, operation: RemoveImportOperation): TextEdit[] {
  const sourceFile = getSourceFile(project, operation.file);
  const declarations = sourceFile.statements.filter(
    (statement): statement is ts.ImportDeclaration =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === operation.from
  );

  if (declarations.length === 0) {
    return [];
  }

  if (declarations.length > 1) {
    throw sprigcodeError(
      ERROR_CODES.ANCHOR_NOT_UNIQUE,
      `Found ${declarations.length} matching imports from ${operation.from}.`,
      {
        file: operation.file,
        candidates: declarations.map((declaration) => importCandidate(project, sourceFile, declaration))
      }
    );
  }

  const declaration = declarations[0]!;

  const namesToRemove = [
    ...(operation.named ?? []),
    ...(operation.default ? [operation.default] : []),
    ...(operation.namespace ? [operation.namespace] : [])
  ];
  const current = extractImportShape(declaration);
  const next = removeNames(current, namesToRemove);

  if (!next.default && !next.namespace && next.named.length === 0) {
    return [
      {
        filePath: operation.file,
        start: declaration.getFullStart(),
        end: declaration.getEnd(),
        replacement: ""
      }
    ];
  }

  const nextText = buildImportText(operation.from, next);
  const currentText = getNodeText(sourceFile, declaration);
  if (nextText === currentText) {
    return [];
  }

  return [
    {
      filePath: operation.file,
      start: declaration.getStart(sourceFile),
      end: declaration.getEnd(),
      replacement: nextText
    }
  ];
}
