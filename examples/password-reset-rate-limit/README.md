# Password Reset Rate Limit

This is the smallest success demo that still shows why Sprigcode exists.

The transaction hardens a password reset flow by inserting a rate-limit check
before the email is sent.

## What changed

`src/auth/reset-password.ts` starts with one import and one call:

```ts
import { sendPasswordResetEmail } from "@/lib/mail";

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(email);
}
```

Sprigcode applies two typed operations:

- `add_import` adds `rateLimit` from `@/lib/rate-limit`
- `insert_statement_before_call` inserts `await rateLimit.check(email);` before
  the uniquely matched `sendPasswordResetEmail` call

The expected result is:

```ts
import { sendPasswordResetEmail } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";

export async function requestPasswordReset(email: string) {
  await rateLimit.check(email);
  await sendPasswordResetEmail(email);
}
```

## Why this example is realistic

Password reset handlers are a common place for automated hardening work. The
desired change is small, but a raw file rewrite would still need to preserve the
existing import, find the correct call, avoid unrelated code, and avoid
duplicating the guard on retry.

This is the kind of edit an AI coding agent, IDE assistant, or migration tool
can describe as intent. Sprigcode turns that intent into a checked edit.

## What Sprigcode proves

This example proves that Sprigcode can:

- add an import without rewriting the whole file
- resolve a call anchor inside a specific function
- insert one statement before that call
- enforce a `match_count` constraint
- verify that the transaction is idempotent
- return a deterministic diff summary

## Run it

```bash
npx @sprigcode/cli apply examples/password-reset-rate-limit/transaction.sprigcode.json --workspace examples/password-reset-rate-limit/before
```

From a local build, use:

```bash
node packages/cli/dist/index.js apply examples/password-reset-rate-limit/transaction.sprigcode.json --workspace examples/password-reset-rate-limit/before
```

## Success output

The human output should include:

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
  idempotent: passed
```

The exact diagnostics may grow over time, but success should mean one changed
file, two changed operations, and passed `match_count` and `idempotent`
constraints.

## What failure would mean

A failure is useful if Sprigcode can name why it refused. For example:

- `ANCHOR_NOT_FOUND` would mean the target call is missing
- `ANCHOR_NOT_UNIQUE` would mean the call anchor was not specific enough
- `MATCH_COUNT_FAILED` would mean the transaction did not match the expected
  number of nodes
- `NON_IDEMPOTENT_TRANSACTION` would mean retrying the transaction would produce
  another edit

Those failures should leave the workspace unchanged or rolled back. A silent
wrong edit would be a bug.
