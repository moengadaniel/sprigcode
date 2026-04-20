# Sprigcode

Typed semantic code-edit transactions for tools and agents.

Stop giving tools `write_file`.

A raw file write forces the caller to guess where a change belongs, avoid
touching unrelated code, and decide whether ambiguity is safe. Sprigcode gives
tools a narrower mutation interface: typed operations, semantic anchors,
constraints, deterministic edit planning, rollback, and typed refusal.

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
  ]
}
```

If that anchor is ambiguous, Sprigcode returns `ANCHOR_NOT_UNIQUE` and writes
nothing.

Run the demo:

```bash
npx @sprigcode/cli apply examples/password-reset-rate-limit/transaction.sprigcode.json --workspace examples/password-reset-rate-limit/before
```

## What Sprigcode Is

Sprigcode is a transaction engine for semantic code edits.

The caller describes intent in typed operations such as:

- `add_import`
- `rename_symbol`
- `insert_statement_before_call`
- `extend_object_literal`
- `replace_call_expression`

Sprigcode resolves anchors, plans minimal text edits, verifies constraints, and
returns either a deterministic diff or a typed failure.

This repository is not an AI wrapper, chatbot, SaaS dashboard, or codemod
marketplace.

## Why Raw `write_file` Is Unsafe

Raw file mutation is too much power and too little structure.

With `write_file`, the caller has to:

- find the right location
- avoid overlapping unrelated changes
- preserve formatting and imports
- decide whether multiple matches are safe
- notice when a change crossed a public API boundary
- prove idempotence on retries

That interface is flexible, but it makes the caller responsible for the
failure model. Sprigcode moves that burden into the edit engine.

## The 60-second Demo

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

### File that changes

`src/auth/reset-password.ts`

### Before

```ts
import { sendPasswordResetEmail } from "@/lib/mail";

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(email);
}
```

### Transaction

```json
{
  "version": "0.1",
  "language": "typescript",
  "description": "Insert a rate-limit check before sending a password reset email.",
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
    {
      "type": "match_count",
      "opId": "insert-rate-limit-check",
      "exactly": 1
    },
    {
      "type": "idempotent"
    }
  ]
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

That is the point of the project: the caller asked for a typed change, and the
engine made a minimal edit only after it could prove where that edit belonged.

### What happens when the anchor is ambiguous

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

This is a good failure. Sprigcode refused to guess.

## Why Not Just Use a Codemod?

Codemods are useful. Sprigcode is not trying to replace every codemod tool.

Sprigcode is aiming at a lower-level primitive:

- typed edit operations instead of one-off transformation scripts
- semantic anchors instead of ad hoc traversal logic in every caller
- explicit constraints such as `match_count`, `typecheck`, and `idempotent`
- deterministic edit planning and conflict detection
- typed machine-readable failures
- rollback for touched files
- JSON output that tools can consume directly

If you already have a custom codemod pipeline, Sprigcode is not a mandatory
replacement. If you need a reusable mutation protocol for tools and agents,
Sprigcode is a much better fit than handing them unconstrained file writes.

## Why Not Just Let an AI Edit the File?

Agents are good at deciding what should change.

Raw file writes are a bad mutation interface for them.

The problem is not whether an agent can describe the intended edit. The problem
is that `write_file` gives it too much room to:

- overwrite unrelated code
- guess when anchors are ambiguous
- miss idempotence issues
- silently change public API shape
- fail in ways that are hard to classify programmatically

Sprigcode gives tools and agents a safer protocol:

1. the agent decides intent
2. the tool emits a typed transaction
3. Sprigcode resolves anchors
4. Sprigcode applies minimal edits or returns a typed refusal
5. the caller gets a diff summary or a machine-readable error

## Trust Model

Wrong edit = critical bug.

Typed refusal = acceptable.

Public trust in Sprigcode depends on these rules:

- unsupported syntax should fail closed
- ambiguous anchors should fail closed
- unsupported operations should fail closed
- tests are part of the public contract
- a green demo is evidence, not marketing copy

See `docs/accuracy-contract.md` for the full contract.

## For Agent and Tool Authors

Sprigcode is relevant to AI-era tools because it narrows the mutation boundary.

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

## For Humans

Sprigcode is useful even if you never involve an LLM.

It gives human engineers:

- safer repeated edits
- reviewable transaction documents
- codified migrations with a clear failure model
- testable source transformations
- predictable CLI output for CI and scripts

If you want a scriptable edit primitive that is smaller and more explicit than a
full codemod stack, that is the use case.

## Supported Today

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

- `docs/philosophy.md`
- `docs/architecture.md`
- `docs/sprigcode-ir.md`
- `docs/transactions.md`
- `docs/typed-errors.md`
- `docs/accuracy-contract.md`
- `docs/cli.md`
- `docs/testing-strategy.md`
- `docs/adapters.md`

## Contributing

Small, reviewable changes with tests are preferred.

Before claiming work is complete:

```bash
corepack pnpm install
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:golden
corepack pnpm test:smoke
corepack pnpm build
```

See `CONTRIBUTING.md`.

## Governance

Sprigcode uses a BDFL model with `eat-apples` as final authority on project
direction, public API design, architecture, and release approval.

See `GOVERNANCE.md`.

## License

Apache-2.0. See `LICENSE` and `NOTICE`.
