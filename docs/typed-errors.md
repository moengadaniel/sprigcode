# Typed Errors

## Problem

If semantic editing fails with generic strings, tools cannot classify the
failure and humans cannot trust the refusal.

## Design

Every Sprigcode error is JSON-serializable:

```ts
export type SprigcodeError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  cause?: unknown;
};
```

Errors are part of the public contract.

Important codes include:

- `ANCHOR_NOT_FOUND`
- `ANCHOR_NOT_UNIQUE`
- `MATCH_COUNT_FAILED`
- `TYPECHECK_FAILED`
- `PUBLIC_API_BOUNDARY`
- `NON_IDEMPOTENT_TRANSACTION`
- `ROLLBACK_FAILED`
- `UNSUPPORTED_SYNTAX`
- `UNSUPPORTED_OPERATION`

Example:

```json
{
  "code": "ANCHOR_NOT_UNIQUE",
  "message": "Found 2 matching calls to sendPasswordResetEmail.",
  "details": {
    "candidates": [
      { "file": "src/auth/reset-password.ts", "line": 6, "column": 9 }
    ]
  }
}
```

## Why this matters

Sprigcode is allowed to refuse. It is not allowed to guess silently.

That means the error model has to be legible for:

- CLIs
- CI systems
- editors
- agent runtimes
- humans reading logs

## Limitation

Typed errors do not guarantee the repository supports every requested edit.
They guarantee that unsupported work fails in a classifiable way.

## What to read next

- `docs/accuracy-contract.md`
- `docs/cli.md`
