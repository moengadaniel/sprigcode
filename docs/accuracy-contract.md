# Accuracy Contract

## Trust model

- Wrong edit = critical bug.
- Typed refusal = acceptable.
- Unsupported syntax should fail closed.
- Ambiguous anchors should fail closed.
- Tests are part of the public contract.

## What Sprigcode promises

Sprigcode does not promise universal correctness.

It promises a narrower and stronger contract:

1. Deterministic behavior for supported operations.
2. Explicit typed failures for unsupported or ambiguous cases.
3. Rollback for touched files.
4. Constraint verification for supported checks.
5. No silent skipping of failed operations.

## What this means in practice

- A missing anchor should return `ANCHOR_NOT_FOUND`.
- An ambiguous anchor should return `ANCHOR_NOT_UNIQUE`.
- An unsupported syntax shape should return `UNSUPPORTED_SYNTAX`.
- A failed postcondition should return a typed constraint failure.

If Sprigcode cannot prove the edit is safe, it should refuse.

## What Sprigcode does not promise

- it does not edit arbitrary code perfectly
- it does not replace every codemod stack
- it does not support languages or operations that are not implemented

## Limitation

The contract is only as strong as the supported slice. v0.1 is intentionally a
small TypeScript and TSX vertical slice.

## What to read next

- `docs/testing-strategy.md`
- `docs/typed-errors.md`
