export type DiagnosticLevel = "info" | "warning" | "error";

export type Diagnostic = {
  level: DiagnosticLevel;
  message: string;
  details?: Record<string, unknown>;
};

export function info(message: string, details?: Record<string, unknown>): Diagnostic {
  return details ? { level: "info", message, details } : { level: "info", message };
}
