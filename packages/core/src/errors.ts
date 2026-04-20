export const ERROR_CODES = {
  INVALID_TRANSACTION_DOCUMENT: "INVALID_TRANSACTION_DOCUMENT",
  UNSUPPORTED_LANGUAGE: "UNSUPPORTED_LANGUAGE",
  UNSUPPORTED_OPERATION: "UNSUPPORTED_OPERATION",
  UNSUPPORTED_SYNTAX: "UNSUPPORTED_SYNTAX",
  ANCHOR_NOT_FOUND: "ANCHOR_NOT_FOUND",
  ANCHOR_NOT_UNIQUE: "ANCHOR_NOT_UNIQUE",
  MATCH_COUNT_FAILED: "MATCH_COUNT_FAILED",
  CONFLICTING_EDITS: "CONFLICTING_EDITS",
  VALUE_NOT_AVAILABLE_IN_CALLER_SCOPE: "VALUE_NOT_AVAILABLE_IN_CALLER_SCOPE",
  PUBLIC_API_BOUNDARY: "PUBLIC_API_BOUNDARY",
  TYPECHECK_FAILED: "TYPECHECK_FAILED",
  FORMAT_FAILED: "FORMAT_FAILED",
  NON_IDEMPOTENT_TRANSACTION: "NON_IDEMPOTENT_TRANSACTION",
  ROLLBACK_FAILED: "ROLLBACK_FAILED",
  WORKSPACE_PATH_ESCAPE: "WORKSPACE_PATH_ESCAPE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  GENERATED_FILE_BLOCKED: "GENERATED_FILE_BLOCKED"
} as const;

export type SprigcodeErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type SprigcodeError = {
  code: SprigcodeErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
  cause?: unknown;
};

export class SprigcodeFailure extends Error {
  readonly error: SprigcodeError;

  constructor(error: SprigcodeError) {
    super(error.message);
    this.name = "SprigcodeFailure";
    this.error = error;
  }
}

export function sprigcodeError(
  code: SprigcodeErrorCode | string,
  message: string,
  details?: Record<string, unknown>,
  cause?: unknown
): SprigcodeFailure {
  return new SprigcodeFailure({
    code,
    message,
    ...(details ? { details } : {}),
    ...(cause !== undefined ? { cause } : {})
  });
}

export function toSprigcodeError(error: unknown): SprigcodeError {
  if (error instanceof SprigcodeFailure) {
    return error.error;
  }

  if (error instanceof Error) {
    return {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: error.message,
      cause: {
        name: error.name,
        stack: error.stack
      }
    };
  }

  return {
    code: ERROR_CODES.INTERNAL_ERROR,
    message: "Unknown internal error.",
    cause: error
  };
}
