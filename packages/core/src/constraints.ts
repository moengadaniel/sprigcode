export type TypecheckConstraint = {
  type: "typecheck";
};

export type MatchCountConstraint = {
  type: "match_count";
  opId?: string;
  anchor?: string;
  exactly?: number;
  min?: number;
  max?: number;
};

export type IdempotentConstraint = {
  type: "idempotent";
};

export type NoPublicApiChangeConstraint = {
  type: "no_public_api_change";
};

export type NoGeneratedFilesConstraint = {
  type: "no_generated_files";
};

export type Constraint =
  | TypecheckConstraint
  | MatchCountConstraint
  | IdempotentConstraint
  | NoPublicApiChangeConstraint
  | NoGeneratedFilesConstraint;

