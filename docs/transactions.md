# Transactions

## Problem

Tools need to know not just whether an edit succeeded, but how far the engine
got before it failed.

## Design

A Sprigcode transaction moves through explicit states:

- `created`
- `validated`
- `planned`
- `applied`
- `verified`
- `failed`
- `rolled_back`

These states are evidence, not decoration.

Typical lifecycle:

1. validate the document shape
2. resolve anchors and plan edits
3. apply sorted, non-conflicting edits
4. verify constraints
5. roll back if post-apply verification fails

## Why this matters

Without explicit states, tools cannot tell whether they are looking at:

- a malformed request
- an ambiguous plan
- a partially applied transaction
- a rolled-back failure
- a verified result

## Limitation

Transaction states are only useful if the engine refuses to collapse them into
best-effort success. Failed planning and failed verification are different
things, and Sprigcode needs to keep them different.

## What to read next

- `docs/architecture.md`
- `docs/typed-errors.md`
