# Contributing to Sprigcode

Sprigcode is small on purpose. Good contributions keep it that way.

## What to optimize for

- clear problem statement
- narrow scope
- tests for the changed behavior
- typed failure cases
- honest documentation

## Verification loop

Run this before claiming completion:

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

If a command fails:

1. fix the root cause
2. rerun the failed command
3. rerun the full loop

## Review standard

A wrong edit is worse than a refusal.

That means reviewers will care about:

- ambiguous-anchor behavior
- rollback
- idempotence
- machine-readable errors
- unsupported syntax failing closed

## Good first issues

Good first issues should be narrow, testable, and easy to review.

Useful contribution types include:

- add TypeScript or TSX fixture coverage for a supported operation
- add ambiguous-anchor tests for syntax that should fail closed
- add documentation recipes that explain current behavior honestly
- improve CLI output clarity without changing the JSON contract casually
- improve adapter diagnostics for missing, ambiguous, or unsupported anchors
- add examples demonstrating fail-closed behavior

Standards:

- keep scope small
- include tests for behavior changes
- prefer typed failures over broad guessing
- avoid broad speculative abstractions
- avoid unsupported claims in documentation

## Limitation

Sprigcode is not the place for broad speculative abstractions. If a change
expands scope without making the primitive safer or clearer, expect pushback.
