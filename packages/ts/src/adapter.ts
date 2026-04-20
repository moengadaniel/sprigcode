import type {
  AdapterPlanContext,
  AdapterPlanResult,
  Diagnostic,
  LanguageAdapter,
  Operation,
  PlannedOperation
} from "@sprigcode/core";
import { info } from "@sprigcode/core";
import { loadProject } from "./project.js";
import { planAddImportOperation } from "./operations/add-import.js";
import { planAddRequiredParameterOperation } from "./operations/add-required-parameter.js";
import { planExtendObjectLiteralOperation } from "./operations/extend-object-literal.js";
import { planInsertStatementBeforeCallOperation } from "./operations/insert-statement-before-call.js";
import { planRemoveImportOperation } from "./operations/remove-import.js";
import { planRenameSymbolOperation } from "./operations/rename-symbol.js";
import { planReplaceCallExpressionOperation } from "./operations/replace-call-expression.js";
import { planUpdateCallSitesOperation } from "./operations/update-call-sites.js";
import { verifyTypecheck } from "./verifier.js";

async function planOperation(
  context: AdapterPlanContext,
  operation: Operation
): Promise<PlannedOperation> {
  const project = await loadProject(context.workspacePath);
  const noPublicApiChange = context.constraints.some((constraint) => constraint.type === "no_public_api_change");

  switch (operation.op) {
    case "add_import":
      return planAddImportOperation(project, operation);
    case "remove_import":
      return planRemoveImportOperation(project, operation);
    case "rename_symbol":
      return planRenameSymbolOperation(project, operation);
    case "add_required_parameter":
      return planAddRequiredParameterOperation(project, operation, noPublicApiChange);
    case "update_call_sites":
      return planUpdateCallSitesOperation(project, operation);
    case "extend_object_literal":
      return planExtendObjectLiteralOperation(project, operation);
    case "replace_call_expression":
      return planReplaceCallExpressionOperation(project, operation);
    case "insert_statement_before_call":
      return planInsertStatementBeforeCallOperation(project, operation);
    default: {
      const neverOperation: never = operation;
      return neverOperation;
    }
  }
}

export function typescriptAdapter(): LanguageAdapter {
  return {
    language: "typescript",
    async plan(context): Promise<AdapterPlanResult> {
      const operations: PlannedOperation[] = [];
      const diagnostics: Diagnostic[] = [info("TypeScript adapter planning started.")];

      for (const operation of context.document.ops) {
        operations.push(await planOperation(context, operation));
      }

      return { operations, diagnostics };
    },
    async verify(context): Promise<Diagnostic[]> {
      const diagnostics: Diagnostic[] = [];
      if (context.constraints.some((constraint) => constraint.type === "typecheck")) {
        diagnostics.push(...(await verifyTypecheck(context.workspacePath)));
      }
      return diagnostics;
    }
  };
}
