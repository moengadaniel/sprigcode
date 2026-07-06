# Ambiguous Anchor Failure

This example is supposed to fail.

The source file contains two calls to `sendPasswordResetEmail`:

```ts
export async function requestPasswordReset(primaryEmail: string, backupEmail: string) {
  await sendPasswordResetEmail(primaryEmail);
  await sendPasswordResetEmail(backupEmail);
}
```

The transaction asks Sprigcode to insert a rate-limit check before
`sendPasswordResetEmail`, but it does not provide enough anchor information to
identify which call should receive the new statement.

## Why refusal is correct

Both calls match the anchor. Inserting before the first call may be correct in
one product flow, while inserting before the second call may be correct in
another. Sprigcode does not have enough information to choose.

Guessing would be unsafe because the edit would still look plausible in review.
The correct result is a typed refusal before any file is written.

## Run it

```bash
npx @sprigcode/cli apply examples/ambiguous-anchor-failure/transaction.sprigcode.json --workspace examples/ambiguous-anchor-failure/before --json
```

From a local build, use:

```bash
node packages/cli/dist/index.js apply examples/ambiguous-anchor-failure/transaction.sprigcode.json --workspace examples/ambiguous-anchor-failure/before --json
```

## Machine-readable error

Sprigcode returns `ANCHOR_NOT_UNIQUE`:

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

The compact expected fixture is also recorded in `expected-error.json`.

## Why writing nothing is correct

No safe edit was planned. The transaction remains at the validated stage, no
files are touched, and the caller receives a stable error code it can handle.

That is the safety contract: ambiguous anchors fail closed.
