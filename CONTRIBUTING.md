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
corepack pnpm install
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:golden
corepack pnpm test:smoke
corepack pnpm build
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

## Limitation

Sprigcode is not the place for broad speculative abstractions. If a change
expands scope without making the primitive safer or clearer, expect pushback.
