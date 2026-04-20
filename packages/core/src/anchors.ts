export type FileAnchor = {
  type: "file";
  path: string;
};

export type SymbolAnchor = {
  type: "symbol";
  name: string;
  file?: string;
  kind?: "function" | "const" | "class" | "method" | "type";
};

export type CallAnchor = {
  type: "call";
  callee: string;
  file?: string;
  enclosingFunction?: string;
};

export type ObjectPropertyAnchor = {
  type: "objectProperty";
  key: string;
  file?: string;
  enclosingCall?: string;
};

export type Anchor = FileAnchor | SymbolAnchor | CallAnchor | ObjectPropertyAnchor;

export type AnchorCandidate = {
  file: string;
  line: number;
  column: number;
  context?: string;
};

