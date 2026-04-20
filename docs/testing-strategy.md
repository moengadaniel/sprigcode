# Testing Strategy

## Problem

A semantic edit engine cannot be trusted because it has a lot of tests. It can
be trusted only if the tests prove the failure model and the edit model.

## What Sprigcode tests must prove

- deterministic edits
- missing anchors refused
- ambiguous anchors refused
- constraint failures are typed
- rollback restores touched files
- idempotence is enforced
- golden examples stay stable
- CLI JSON output is machine-readable
- the flagship demo works
- the failure demo refuses with `ANCHOR_NOT_UNIQUE`

## Current test layers

- core unit tests
- adapter operation tests
- golden before/after tests
- rollback tests
- idempotence tests
- CLI output tests
- smoke tests over the example demos

## Limitation

A green suite does not mean Sprigcode supports every syntax shape. It means the
supported slice is backed by explicit proof.

## What to read next

- `docs/accuracy-contract.md`
- `README.md`
