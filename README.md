# Sprigcode

Typed semantic code-edit transactions for tools and agents.

> Stop giving agents `write_file`. Give them typed code-edit transactions.

Agents can decide what should change. Raw file writes are a bad mutation
boundary: they force the caller to locate the edit, handle ambiguity, preserve
unrelated code, and classify failure. Sprigcode gives tools a narrower
interface: typed operations, semantic anchors, constraints, deterministic edit
planning, rollback, and typed refusal.

```json
{
  "version": "0.1",
  "language": "typescript",
  "ops": [
    {
      "id": "add-rate-limit-import",
      "op": "add_import",
      "file": "src/auth/reset-password.ts",
      "from": "@/lib/rate-limit",
      "named": ["rateLimit"]
    },
    {
      "id": "insert-rate-limit-check",
      "op": "insert_statement_before_call",
      "anchor": {
        "type": "call",
        "callee": "sendPasswordResetEmail",
        "file": "src/auth/reset-password.ts",
        "enclosingFunction": "requestPasswordReset"
      },
      "statement": "await rateLimit.check(email);"
    }
  ],
  "constraints": [
    { "type": "match_count", "opId": "insert-rate-limit-check", "exactly": 1 },
    { "type": "idempotent" }
  ]
}
```

Run the demo:

```bash
npx @sprigcode/cli apply examples/password-reset-rate-limit/transaction.sprigcode.json --workspace examples/password-reset-rate-limit/before
```

If an anchor is ambiguous, Sprigcode refuses with a typed error such as
`ANCHOR_NOT_UNIQUE` and writes nothing.

## What Sprigcode is

Sprigcode is a transaction engine for semantic code edits.

The caller describes intent in typed operations such as:

- `add_import`
- `remove_import`
- `rename_symbol`
- `add_required_parameter`
- `update_call_sites`
- `extend_object_literal`
- `replace_call_expression`
- `insert_statement_before_call`

Sprigcode resolves anchors, plans minimal text edits, verifies constraints, and
returns either a deterministic diff or a typed failure.

This repository is not an AI wrapper, chatbot, SaaS dashboard, codemod
marketplace, or universal AST transformation framework.

## Why this exists

Raw file mutation is flexible, but it is a weak boundary for automated code
editing.

With `write_file`, the caller has to:

- find the exact edit location
- decide whether multiple matches are safe
- preserve imports, formatting, and unrelated code
- make retries idempotent
- avoid silently touching code outside the requested change
- classify failures in a way a tool or CI system can consume

Those are engine responsibilities, not prompt responsibilities. Sprigcode moves
the burden into a narrow edit engine that can validate the transaction, resolve
semantic anchors, detect conflicts, check constraints, and fail closed.

## Who should care?

Sprigcode is for people building systems that need to edit code without
guessing.

- AI coding agents that should emit intent, not overwrite files
- IDE assistants and MCP tools that need a safer mutation boundary
- TypeScript platform teams running repeated migrations
- maintainers who want automated changes to be reviewable and fail-closed
- security and compliance tooling that needs predictable patches with typed failures
- automated PR systems that need deterministic diffs and machine-readable errors

## Who should not use this yet?

- If you need broad language support today, Sprigcode is not there yet.
- If you need arbitrary AST rewrites, a codemod framework may be a better fit.
- If you need a general AI application, this is not one.
- If you need broad syntax support immediately, wait until the TypeScript slice
  is stronger.

## The 60-second demo

The flagship demo lives in `examples/password-reset-rate-limit/`.

It changes one file in one realistic way:

- adds an import
- inserts a statement before one call
- checks that exactly one anchor matched
- checks that the transaction is idempotent

### Command

```bash
npx @sprigcode/cli apply examples/password-reset-rate-limit/transaction.sprigcode.json --workspace examples/password-reset-rate-limit/before
```

### Before

```ts
import { sendPasswordResetEmail } from "@/lib/mail";

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(email);
}
```

### After

```ts
import { sendPasswordResetEmail } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";

export async function requestPasswordReset(email: string) {
  await rateLimit.check(email);
  await sendPasswordResetEmail(email);
}
```

### CLI output

```text
Transaction verified.
Lifecycle: validated -> planned -> applied -> verified
Typed operations: 2
Files changed: 1
Rollback: no
Diff summary:
  src/auth/reset-password.ts (+2 -0)
Operation results:
  add-rate-limit-import [add_import]: changed, 1 edit(s), 1 file(s), matched 1 node(s)
  insert-rate-limit-check [insert_statement_before_call]: changed, 1 edit(s), 1 file(s), matched 1 node(s)
Constraint checks:
  match_count: passed
    Operation insert-rate-limit-check matched 1 node.
  idempotent: passed
    Applying the transaction a second time produced no further edits.
Diagnostics:
  [info] TypeScript adapter planning started.
```

The caller asked for a typed change. The engine made a minimal edit only after
it could prove where that edit belonged.

### Ambiguous anchors

Run the failure demo:

```bash
npx @sprigcode/cli apply examples/ambiguous-anchor-failure/transaction.sprigcode.json --workspace examples/ambiguous-anchor-failure/before --json
```

Sprigcode refuses:

```json
{
  "ok": false,
  "command": "apply",
  "transaction": {
    "status": "validated",
    "changedFiles": [],
    "touchedFiles": [],
    "rollbackOccurred": false
  },
  "error": {
    "code": "ANCHOR_NOT_UNIQUE",
    "message": "Found 2 matching calls to sendPasswordResetEmail."
  }
}
```

This is a good failure. Guessing would be unsafe.

## How is this different from codemods?

Codemods and AST tools are useful. Sprigcode does not replace every codemod
workflow.

| Tool / approach | Good at | Tradeoff | Where Sprigcode fits |
| --- | --- | --- | --- |
| raw `write_file` | Maximum flexibility and simple file replacement | The caller must locate edits, handle ambiguity, preserve unrelated code, and classify failure | More constrained mutation boundary with typed operations, anchors, rollback, and machine-readable errors |
| `jscodeshift` | Large JavaScript/TypeScript codemods with custom AST transforms | Callers still write transformation code and own the failure model | Useful when a tool should emit a transaction instead of a bespoke transform script |
| `ast-grep` | Pattern-based structural search and rewrite | Pattern precision and rewrite safety remain caller concerns | Useful when semantic anchors and fail-closed transaction results matter more than flexible pattern matching |
| `ts-morph` | Rich TypeScript compiler API wrapper for custom tooling | Powerful, but callers write and maintain edit logic directly | Higher-level protocol for repeated, reviewable edits with deterministic diffs |
| custom scripts | One-off migrations tailored to a codebase | Hard to reuse, audit, or expose safely to agents | A reusable transaction layer for common semantic edits and typed failures |

Sprigcode is lower-level than an AI coding assistant, higher-level than raw AST
scripting, more constrained than unconstrained file writes, and focused on
typed transactions, semantic anchors, fail-closed behavior, deterministic diffs,
rollback, and machine-readable errors.

## Safety model

Wrong edit = critical bug.

Typed refusal = acceptable.

Sprigcode is intentionally conservative:

- ambiguous anchors fail closed
- unsupported syntax fails closed
- unsupported operations fail closed
- conflicting edits fail before writing
- rollback is part of the transaction lifecycle
- tests are part of the public contract
- a green demo is evidence, not marketing

See `docs/accuracy-contract.md` for the full contract.

## For agent and tool authors

Use the model for planning. Use Sprigcode for editing.

```ts
import { createTransaction, validateTransactionDocument } from "@sprigcode/core";
import { typescriptAdapter } from "@sprigcode/ts";

const document = validateTransactionDocument({
  version: "0.1",
  language: "typescript",
  description: "Insert a rate-limit check before a password reset email.",
  ops: [
    {
      id: "add-rate-limit-import",
      op: "add_import",
      file: "src/auth/reset-password.ts",
      from: "@/lib/rate-limit",
      named: ["rateLimit"]
    },
    {
      id: "insert-rate-limit-check",
      op: "insert_statement_before_call",
      anchor: {
        type: "call",
        callee: "sendPasswordResetEmail",
        file: "src/auth/reset-password.ts",
        enclosingFunction: "requestPasswordReset"
      },
      statement: "await rateLimit.check(email);"
    }
  ],
  constraints: [{ type: "idempotent" }]
});

const tx = await createTransaction({
  document,
  workspace: process.cwd(),
  adapters: [typescriptAdapter()]
});

await tx.validate();
await tx.plan();
await tx.apply();
const result = await tx.verify();

console.log(result.status);
console.log(result.diffSummary);
```

See `docs/agent-integration.md` for an integration guide.

## For humans

Sprigcode is useful even if you never involve an LLM.

It gives human engineers:

- safer repeated edits
- reviewable transaction documents
- codified migrations with a clear failure model
- testable source transformations
- predictable CLI output for CI and scripts

If you want a scriptable edit primitive that is smaller and more explicit than a
full codemod stack, that is the use case.

## Supported today

Sprigcode v0.1 supports TypeScript and TSX only.

Supported operations:

- `add_import`
- `remove_import`
- `rename_symbol`
- `add_required_parameter`
- `update_call_sites`
- `extend_object_literal`
- `replace_call_expression`
- `insert_statement_before_call`

Packages in this repository:

- `@sprigcode/core`
- `@sprigcode/ts`
- `@sprigcode/cli`
- `@sprigcode/schema`
- `@sprigcode/testkit`

CLI binary:

- `sprigcode`

## Installation

Core usage:

```bash
npm install @sprigcode/core @sprigcode/ts
```

CLI usage:

```bash
npm install -D @sprigcode/cli
```

Other published packages:

- `@sprigcode/schema`
- `@sprigcode/testkit`

After local install:

```bash
npx sprigcode --help
npx sprigcode validate transaction.sprigcode.json
npx sprigcode apply transaction.sprigcode.json --workspace .
```

One-off use without installing:

```bash
npx @sprigcode/cli --help
npx @sprigcode/cli validate transaction.sprigcode.json
npx @sprigcode/cli apply transaction.sprigcode.json --workspace .
```

## Limitations

Sprigcode is intentionally narrow.

- only one real adapter exists today: TypeScript and TSX
- supported syntax shapes are conservative by design
- typed refusal is expected behavior, not an edge case
- Sprigcode does not replace every codemod workflow
- Sprigcode does not promise universal semantic editing

## Documentation

- `docs/why-sprigcode.md`
- `docs/agent-integration.md`
- `docs/philosophy.md`
- `docs/architecture.md`
- `docs/sprigcode-ir.md`
- `docs/transactions.md`
- `docs/typed-errors.md`
- `docs/accuracy-contract.md`
- `docs/cli.md`
- `docs/testing-strategy.md`
- `docs/adapters.md`
- `docs/recipes.md`

## Contributing

Small, reviewable changes with tests are preferred.

Before claiming work is complete:

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run test:golden
npm run test:smoke
npm run test:npm-smoke
npm run build
```

See `CONTRIBUTING.md`.

## Governance

Sprigcode uses a BDFL model with `moengadaniel` as final authority on project
direction, public API design, architecture, and release approval.

See `GOVERNANCE.md`.

## License

Apache-2.0. See `LICENSE` and `NOTICE`.
