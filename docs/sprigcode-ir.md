# Sprigcode Transaction Format

## Problem

Tools need a mutation protocol that is specific enough to review and verify,
but small enough to emit programmatically.

## Design

A Sprigcode transaction document is JSON-compatible:

```json
{
  "version": "0.1",
  "language": "typescript",
  "description": "Insert a rate-limit check before a password reset email.",
  "ops": [],
  "constraints": []
}
```

Required fields:

- `version`
- `language`
- `ops`

`constraints` defaults to an empty array.

Each operation must include:

- a stable `id`
- an `op` name
- operation-specific fields

Anchors describe the semantic target. v0.1 supports:

- file anchors
- symbol anchors
- call anchors
- object property anchors

Constraints describe what must be true after planning or application. v0.1
supports:

- `typecheck`
- `match_count`
- `idempotent`
- `no_public_api_change`
- `no_generated_files`

## Why this shape matters

This format is narrow by design. It is meant to be emitted by tools, reviewed by
humans, and verified by the engine. It is not trying to describe every possible
source transformation language.

## Limitation

Schema validation is necessary, not sufficient. A transaction can be
shape-valid and still fail semantically with `ANCHOR_NOT_UNIQUE`,
`UNSUPPORTED_SYNTAX`, or another typed refusal.

## What to read next

- `docs/typed-errors.md`
- `docs/transactions.md`
