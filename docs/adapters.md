# Adapters

## Problem

The core engine should not know how to parse every language, but the project
still needs language-aware planning.

## Design

Language adapters own:

- parsing
- anchor resolution
- symbol-aware planning
- language-specific verification

Core still owns:

- lifecycle
- edit application
- rollback
- typed result objects

Current adapter:

- `@sprigcode/ts` for TypeScript and TSX

## Why this split matters

It keeps the public model stable:

- the CLI stays thin
- core stays language-agnostic
- adapters can be conservative without rewriting transaction semantics

## Limitation

There is only one real adapter today. Future adapters should not be claimed
until they exist with tests, docs, and failure coverage.

## What to read next

- `docs/architecture.md`
- `docs/testing-strategy.md`
