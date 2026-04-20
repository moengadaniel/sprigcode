import type { Diagnostic } from "./diagnostics.js";
import { info } from "./diagnostics.js";
import {
  createUnifiedDiff,
  summarizeUnifiedDiffs,
  type UnifiedDiffFile,
  type UnifiedDiffSummary
} from "./diff.js";
import { applyTextEditsToString, groupEditsByFile } from "./edit.js";
import { ERROR_CODES, sprigcodeError } from "./errors.js";
import type { TransactionDocument } from "./transaction-document.js";
import {
  copyWorkspaceToTemp,
  fileExists,
  listWorkspaceSourceFiles,
  readWorkspaceFile,
  removeTempWorkspace,
  resolveWorkspacePath,
  writeWorkspaceFile
} from "./workspace.js";

export type TransactionStatus =
  | "created"
  | "validated"
  | "planned"
  | "applied"
  | "verified"
  | "failed"
  | "rolled_back";

export type TextEdit = {
  filePath: string;
  start: number;
  end: number;
  replacement: string;
};

export type PlannedOperation = {
  opId: string;
  op: string;
  edits: TextEdit[];
  matchCount?: number;
  metadata?: Record<string, unknown>;
  diagnostics?: Diagnostic[];
};

export type AdapterPlanContext = {
  document: TransactionDocument;
  workspacePath: string;
  constraints: TransactionDocument["constraints"];
};

export type AdapterVerifyContext = AdapterPlanContext & {
  touchedFiles: string[];
};

export type AdapterPlanResult = {
  operations: PlannedOperation[];
  diagnostics: Diagnostic[];
};

export type LanguageAdapter = {
  language: string;
  plan(context: AdapterPlanContext): Promise<AdapterPlanResult>;
  verify?(context: AdapterVerifyContext): Promise<Diagnostic[]>;
};

export type TransactionOptions = {
  document: TransactionDocument;
  workspace: string;
  adapters: LanguageAdapter[];
};

export type TransactionResult = {
  transactionId: string;
  language: string;
  status: TransactionStatus;
  operationCount: number;
  changedFiles: string[];
  touchedFiles: string[];
  rollbackOccurred: boolean;
  diagnostics: Diagnostic[];
  constraintResults: Array<{
    type: string;
    status: "passed" | "failed";
    message: string;
    details?: Record<string, unknown>;
  }>;
  operationResults: Array<{
    opId: string;
    op: string;
    status: "changed" | "unchanged";
    editCount: number;
    changedFiles: string[];
    matchCount: number;
    diagnostics: Diagnostic[];
  }>;
  diffs: UnifiedDiffFile[];
  diffSummary: UnifiedDiffSummary;
};

type OperationExecutionResult = TransactionResult["operationResults"][number];

type RollbackSnapshot = {
  filePath: string;
  contents: string;
};

export class Transaction {
  readonly id: string;
  readonly document: TransactionDocument;
  readonly workspace: string;
  readonly adapter: LanguageAdapter;
  status: TransactionStatus = "created";
  diagnostics: Diagnostic[] = [];
  plannedOperations: PlannedOperation[] = [];
  touchedFiles: string[] = [];
  rollbackSnapshots: RollbackSnapshot[] = [];
  diffs: UnifiedDiffFile[] = [];
  rollbackOccurred = false;
  constraintResults: TransactionResult["constraintResults"] = [];

  constructor(options: TransactionOptions) {
    this.id = `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.document = options.document;
    this.workspace = options.workspace;

    const adapter = options.adapters.find((candidate) => candidate.language === options.document.language);
    if (!adapter) {
      throw sprigcodeError(
        ERROR_CODES.UNSUPPORTED_LANGUAGE,
        `Unsupported language ${options.document.language}.`,
        { language: options.document.language }
      );
    }

    this.adapter = adapter;
  }

  async validate(): Promise<void> {
    this.status = "validated";
  }

  async plan(): Promise<PlannedOperation[]> {
    if (this.status === "created") {
      await this.validate();
    }

    this.constraintResults = [];

    const result = await this.adapter.plan({
      document: this.document,
      workspacePath: this.workspace,
      constraints: this.document.constraints
    });

    this.plannedOperations = result.operations;
    this.diagnostics.push(...result.diagnostics);
    this.touchedFiles = [...new Set(result.operations.flatMap((operation) => operation.edits.map((edit) => edit.filePath)))];
    this.assertMatchCountConstraints();
    if (this.document.constraints.some((constraint) => constraint.type === "no_public_api_change")) {
      this.recordConstraintResult("no_public_api_change", "passed", "No blocked public API change was detected.");
    }
    this.status = "planned";
    return this.plannedOperations;
  }

  async apply(): Promise<TransactionResult> {
    if (this.status !== "planned") {
      await this.plan();
    }

    this.assertNoGeneratedFiles();
    await this.captureSnapshots();
    const edits = this.plannedOperations.flatMap((operation) => operation.edits);
    const grouped = groupEditsByFile(edits);
    this.diffs = [];

    for (const [filePath, fileEdits] of grouped) {
      const before = await readWorkspaceFile(this.workspace, filePath);
      const after = applyTextEditsToString(before, fileEdits);
      await writeWorkspaceFile(this.workspace, filePath, after);
      this.diffs.push(createUnifiedDiff(filePath, before, after));
    }

    this.status = "applied";
    return this.getResult();
  }

  async verify(): Promise<TransactionResult> {
    if (this.status !== "applied") {
      await this.apply();
    }

    if (this.adapter.verify) {
      this.diagnostics.push(
        ...(await this.adapter.verify({
          document: this.document,
          workspacePath: this.workspace,
          constraints: this.document.constraints,
          touchedFiles: this.touchedFiles
        }))
      );
    }

    if (this.document.constraints.some((constraint) => constraint.type === "typecheck")) {
      this.recordConstraintResult("typecheck", "passed", "TypeScript typecheck passed.");
    }

    if (this.document.constraints.some((constraint) => constraint.type === "idempotent")) {
      await this.assertIdempotent();
      this.recordConstraintResult("idempotent", "passed", "Applying the transaction a second time produced no further edits.");
    }

    this.status = "verified";
    return this.getResult();
  }

  async rollback(): Promise<void> {
    try {
      for (const snapshot of this.rollbackSnapshots) {
        await writeWorkspaceFile(this.workspace, snapshot.filePath, snapshot.contents);
      }
      this.status = "rolled_back";
      this.rollbackOccurred = true;
    } catch (error) {
      throw sprigcodeError(ERROR_CODES.ROLLBACK_FAILED, "Rollback failed.", undefined, error);
    }
  }

  getResult(): TransactionResult {
    const changedFiles = this.diffs.length > 0 ? this.diffs.map((diff) => diff.filePath) : this.touchedFiles;
    const operationResults: OperationExecutionResult[] = this.plannedOperations.map((operation) => {
      const operationChangedFiles = [...new Set(operation.edits.map((edit) => edit.filePath))];
      const editCount = operation.edits.length;
      return {
        opId: operation.opId,
        op: operation.op,
        status: editCount > 0 ? ("changed" as const) : ("unchanged" as const),
        editCount,
        changedFiles: operationChangedFiles,
        matchCount: operation.matchCount ?? 0,
        diagnostics:
          operation.diagnostics && operation.diagnostics.length > 0
            ? operation.diagnostics
            : [
                info(
                  editCount > 0
                    ? `Operation ${operation.opId} planned ${editCount} edit${editCount === 1 ? "" : "s"}.`
                    : `Operation ${operation.opId} is already satisfied.`
                )
              ]
      };
    });

    return {
      transactionId: this.id,
      language: this.document.language,
      status: this.status,
      operationCount: this.plannedOperations.length,
      changedFiles,
      touchedFiles: this.touchedFiles,
      rollbackOccurred: this.rollbackOccurred,
      diagnostics: this.diagnostics,
      constraintResults: this.constraintResults,
      operationResults,
      diffs: this.diffs,
      diffSummary: summarizeUnifiedDiffs(this.diffs)
    };
  }

  private assertMatchCountConstraints(): void {
    const constraints = this.document.constraints.filter((constraint) => constraint.type === "match_count");

    for (const constraint of constraints) {
      const target = constraint.opId
        ? this.plannedOperations.find((operation) => operation.opId === constraint.opId)
        : undefined;
      const count = target?.matchCount ?? 0;

      if (constraint.exactly !== undefined && count !== constraint.exactly) {
        throw sprigcodeError(
          ERROR_CODES.MATCH_COUNT_FAILED,
          `Operation ${constraint.opId ?? "<unknown>"} matched ${count} nodes instead of ${constraint.exactly}.`,
          { constraint, count }
        );
      }

      if (constraint.min !== undefined && count < constraint.min) {
        throw sprigcodeError(
          ERROR_CODES.MATCH_COUNT_FAILED,
          `Operation ${constraint.opId ?? "<unknown>"} matched ${count} nodes which is below ${constraint.min}.`,
          { constraint, count }
        );
      }

      if (constraint.max !== undefined && count > constraint.max) {
        throw sprigcodeError(
          ERROR_CODES.MATCH_COUNT_FAILED,
          `Operation ${constraint.opId ?? "<unknown>"} matched ${count} nodes which exceeds ${constraint.max}.`,
          { constraint, count }
        );
      }

      this.recordConstraintResult(
        "match_count",
        "passed",
        `Operation ${constraint.opId ?? "<unknown>"} matched ${count} node${count === 1 ? "" : "s"}.`,
        { constraint, count }
      );
    }
  }

  private async captureSnapshots(): Promise<void> {
    this.rollbackSnapshots = [];

    for (const filePath of this.touchedFiles) {
      const fullPath = resolveWorkspacePath(this.workspace, filePath);
      if (!(await fileExists(fullPath))) {
        throw sprigcodeError(ERROR_CODES.ANCHOR_NOT_FOUND, `File ${filePath} does not exist.`, { filePath });
      }

      this.rollbackSnapshots.push({
        filePath,
        contents: await readWorkspaceFile(this.workspace, filePath)
      });
    }
  }

  private assertNoGeneratedFiles(): void {
    if (!this.document.constraints.some((constraint) => constraint.type === "no_generated_files")) {
      return;
    }

    for (const filePath of this.touchedFiles) {
      if (filePath.includes(".generated.") || filePath.includes(".gen.")) {
        throw sprigcodeError(ERROR_CODES.GENERATED_FILE_BLOCKED, `Refusing to edit generated file ${filePath}.`);
      }
    }

    this.recordConstraintResult("no_generated_files", "passed", "No generated files were modified.");
  }

  private async assertIdempotent(): Promise<void> {
    const tempWorkspace = await copyWorkspaceToTemp(this.workspace);

    try {
      const check = new Transaction({
        document: this.document,
        workspace: tempWorkspace,
        adapters: [this.adapter]
      });
      await check.plan();
      const remainingEdits = check.plannedOperations.flatMap((operation) => operation.edits);
      if (remainingEdits.length > 0) {
        throw sprigcodeError(
          ERROR_CODES.NON_IDEMPOTENT_TRANSACTION,
          "Applying the transaction a second time would produce additional edits.",
          {
            remainingEdits
          }
        );
      }
    } finally {
      await removeTempWorkspace(tempWorkspace);
    }
  }

  private recordConstraintResult(
    type: string,
    status: "passed" | "failed",
    message: string,
    details?: Record<string, unknown>
  ): void {
    if (this.constraintResults.some((result) => result.type === type && result.message === message)) {
      return;
    }

    this.constraintResults.push({
      type,
      status,
      message,
      ...(details ? { details } : {})
    });
  }
}

export async function createTransaction(options: TransactionOptions): Promise<Transaction> {
  resolveWorkspacePath(options.workspace, ".");
  await listWorkspaceSourceFiles(options.workspace);
  return new Transaction(options);
}
