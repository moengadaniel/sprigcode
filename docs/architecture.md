# Architecture

## Problem

If tools edit code through raw file rewrites, every caller has to rediscover the
same hard parts: where to edit, how to avoid conflicts, how to prove
idempotence, and when to stop instead of guessing.

## Design

Sprigcode splits that work into three layers:

1. `@sprigcode/core`
2. language adapters such as `@sprigcode/ts`
3. clients such as `@sprigcode/cli`

Core owns:

- transaction lifecycle
- typed errors and diagnostics
- text edit sorting and conflict detection
- diff generation
- rollback
- result objects for humans and machines

Adapters own:

- parsing
- anchor resolution
- symbol-aware planning
- language-specific verification such as typechecking

The CLI owns:

- argument parsing
- loading transactions and workspaces
- invoking the engine
- formatting output

The important line is that semantic planning does not live in the CLI.

## Execution flow

```text
transaction document
  -> validate
  -> resolve anchors
  -> plan minimal edits
  -> detect conflicts
  -> apply edits
  -> verify constraints
  -> return diff or typed failure
```

## Limitation

This split does not make every edit safe automatically. It makes the failure
model explicit for supported operations and forces unsupported cases to fail
closed instead of being hidden in ad hoc caller logic.

## What to read next

- `docs/sprigcode-ir.md`
- `docs/transactions.md`
- `docs/accuracy-contract.md`
