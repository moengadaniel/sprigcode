# AGENTS.md

This file provides repository guidance for coding agents and contributors
working in Sprigcode.

## Project

Sprigcode is a transaction engine for semantic code edits.

It accepts typed edit operations, resolves them against a codebase, applies
minimal safe edits, verifies constraints, and returns either a deterministic
diff or a typed failure.

Sprigcode is not:

- an AI agent
- a chatbot
- a SaaS product
- a dashboard
- a generic codemod marketplace

## Public Identity

Use these names consistently:

- Project: `Sprigcode`
- Repository: `eat-apples/sprigcode`
- CLI: `sprigcode`
- Transaction file example: `transaction.sprigcode.json`
- Protocol: `Sprigcode Transaction Format`
- npm scope: `@sprigcode`
- Packages:
  - `@sprigcode/core`
  - `@sprigcode/ts`
  - `@sprigcode/cli`
  - `@sprigcode/schema`
  - `@sprigcode/testkit`

## Repository Layout

- `packages/core`: language-agnostic engine, errors, diagnostics, text edits,
  diffing, rollback, and reporting
- `packages/ts`: TypeScript and TSX adapter
- `packages/cli`: command-line interface
- `packages/schema`: transaction document schema
- `packages/testkit`: golden-test and fixture utilities
- `docs`: architecture, lifecycle, errors, testing, CLI, and governance docs
- `examples`: runnable examples and failure demos

## Engineering Rules

### Core

`@sprigcode/core` must remain language-agnostic.

Core owns:

- transaction document types
- anchors
- constraints
- lifecycle
- typed errors and diagnostics
- low-level text edits
- conflict detection
- rollback
- diff reporting
- JSON-serializable results

Core must not import from language adapters.

### Adapters

Language adapters own:

- parsing
- source-file loading
- syntax-aware anchor resolution
- symbol resolution
- language-specific planning
- language-specific verification

Adapters must fail closed when an edit is ambiguous or unsupported.

### CLI

The CLI is a client of the engine.

The CLI may handle:

- argument parsing
- loading transaction files
- loading workspaces
- invoking the engine
- formatting human-readable output
- emitting JSON output
- setting exit codes

The CLI must not contain semantic edit logic.

## Supported Scope

v0.1 focuses on TypeScript and TSX.

Supported operations:

- `add_import`
- `remove_import`
- `rename_symbol`
- `add_required_parameter`
- `update_call_sites`
- `extend_object_literal`
- `replace_call_expression`
- `insert_statement_before_call`

Do not claim support for other languages or operations unless they are
implemented and tested.

## Failure Model

Unsupported or ambiguous edits must fail closed.

Important rules:

- a wrong edit is a critical bug
- a typed refusal is acceptable
- do not guess when anchors are ambiguous
- do not silently skip failed operations

Required typed error codes include:

- `INVALID_TRANSACTION_DOCUMENT`
- `UNSUPPORTED_LANGUAGE`
- `UNSUPPORTED_OPERATION`
- `UNSUPPORTED_SYNTAX`
- `ANCHOR_NOT_FOUND`
- `ANCHOR_NOT_UNIQUE`
- `MATCH_COUNT_FAILED`
- `CONFLICTING_EDITS`
- `VALUE_NOT_AVAILABLE_IN_CALLER_SCOPE`
- `PUBLIC_API_BOUNDARY`
- `TYPECHECK_FAILED`
- `FORMAT_FAILED`
- `NON_IDEMPOTENT_TRANSACTION`
- `ROLLBACK_FAILED`
- `WORKSPACE_PATH_ESCAPE`
- `INTERNAL_ERROR`

## Public API Discipline

Do not change public APIs casually.

Any public API change must include:

- tests
- documentation
- clear design reasoning
- example updates when needed

## Documentation Standards

Write documentation like a senior software engineer:

- precise
- honest
- calm
- practical
- no hype
- no unsupported claims
- limitations clearly documented

Do not claim Sprigcode is perfect or universally correct.

## Security Rules

- treat transaction files as untrusted input
- validate paths to avoid workspace escape
- do not execute arbitrary project scripts unless explicitly required
- do not read secrets unless required for the task and explicitly provided
- prefer least privilege in examples and tests

## Verification

Coding agents must run the verification loop before reporting completion:

```bash
corepack pnpm install
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:golden
corepack pnpm build
```

If the task touches demos, packaging, or installation flows, also run any
relevant smoke or pack commands.

If a command fails:

1. identify the root cause
2. fix it
3. rerun the failed command
4. rerun the full verification loop

## Release Rules

Do not release v0.1 until:

- all packages build
- CLI validate, check, and apply work
- examples run end to end
- supported operations have tests
- rollback is tested
- ambiguous and missing anchors return typed failures
- README and governance docs are present and honest

## Related Docs

For deeper detail, see:

- `README.md`
- `docs/architecture.md`
- `docs/sprigcode-ir.md`
- `docs/transactions.md`
- `docs/typed-errors.md`
- `docs/testing-strategy.md`
- `docs/accuracy-contract.md`
- `docs/cli.md`
- `docs/launch-readiness.md`
