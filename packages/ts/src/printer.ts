import type ts from "typescript";

export function printNode(node: ts.Node, sourceFile: ts.SourceFile): string {
  return node.getText(sourceFile);
}
