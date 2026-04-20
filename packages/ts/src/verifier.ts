import { ERROR_CODES, sprigcodeError, type Diagnostic } from "@sprigcode/core";
import ts from "typescript";
import { loadProject, relativeFromWorkspace } from "./project.js";

export async function verifyTypecheck(workspacePath: string): Promise<Diagnostic[]> {
  const project = await loadProject(workspacePath);
  const diagnostics = ts.getPreEmitDiagnostics(project.program).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );

  if (diagnostics.length > 0) {
    throw sprigcodeError(
      ERROR_CODES.TYPECHECK_FAILED,
      "TypeScript typecheck failed after applying the transaction.",
      {
        diagnostics: diagnostics.map((diagnostic) => ({
          file: diagnostic.file ? relativeFromWorkspace(project, diagnostic.file.fileName) : undefined,
          message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
          line: diagnostic.file
            ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line + 1
            : undefined,
          column: diagnostic.file
            ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0).character + 1
            : undefined
        }))
      }
    );
  }

  return [{ level: "info", message: "Typecheck passed." }];
}
