import type { Anchor, CallAnchor, ObjectPropertyAnchor, SymbolAnchor } from "./anchors.js";

export type AddImportOperation = {
  id: string;
  op: "add_import";
  file: string;
  from: string;
  named?: string[];
  default?: string;
  namespace?: string;
};

export type RemoveImportOperation = {
  id: string;
  op: "remove_import";
  file: string;
  from: string;
  named?: string[];
  default?: string;
  namespace?: string;
};

export type RenameSymbolOperation = {
  id: string;
  op: "rename_symbol";
  anchor: SymbolAnchor;
  newName: string;
};

export type UpdateCallSitesOperation = {
  id: string;
  op: "update_call_sites";
  anchor: SymbolAnchor;
  argumentIndex?: number;
  value: string;
};

export type AddRequiredParameterOperation = {
  id: string;
  op: "add_required_parameter";
  anchor: SymbolAnchor;
  parameterName: string;
  parameterType?: string;
  value: string;
  position?: number;
  updateCallSites?: boolean;
};

export type ExtendObjectLiteralOperation = {
  id: string;
  op: "extend_object_literal";
  anchor: ObjectPropertyAnchor | CallAnchor;
  argumentIndex?: number;
  property: {
    key: string;
    value: string;
  };
};

export type ReplaceCallExpressionOperation = {
  id: string;
  op: "replace_call_expression";
  anchor: CallAnchor;
  replacement: string;
};

export type InsertStatementBeforeCallOperation = {
  id: string;
  op: "insert_statement_before_call";
  anchor: CallAnchor;
  statement: string;
};

export type Operation =
  | AddImportOperation
  | RemoveImportOperation
  | RenameSymbolOperation
  | UpdateCallSitesOperation
  | AddRequiredParameterOperation
  | ExtendObjectLiteralOperation
  | ReplaceCallExpressionOperation
  | InsertStatementBeforeCallOperation;

export type OperationName = Operation["op"];

export function isAnchorLike(value: unknown): value is Anchor {
  return typeof value === "object" && value !== null && "type" in value;
}

