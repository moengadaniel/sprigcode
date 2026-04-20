# CLI

## Problem

A semantic edit engine is not useful to humans or automation if the public
entrypoint is vague or hard to script.

## Design

The CLI is intentionally thin. It does not plan edits. It loads transaction
documents, invokes the engine, prints summaries, emits JSON, and sets exit
codes.

Commands:

```bash
npx sprigcode --help
npx sprigcode init
npx sprigcode validate transaction.sprigcode.json
npx sprigcode check transaction.sprigcode.json --workspace .
npx sprigcode apply transaction.sprigcode.json --workspace .
npx sprigcode apply transaction.sprigcode.json --workspace . --dry-run
npx sprigcode apply transaction.sprigcode.json --workspace . --json
npx sprigcode explain error.json
```

## JSON output

Success output includes:

- transaction status
- changed files
- touched files
- rollback state
- per-operation results
- per-constraint results
- diff summary

Failure output includes:

- typed error code
- human-readable message
- optional transaction context

This is the interface tools should consume. The human-readable output is for
engineers, not parsers.

## Installation

After local install:

```bash
npm install -D @sprigcode/cli
```

```bash
npx sprigcode --help
npx sprigcode validate transaction.sprigcode.json
npx sprigcode apply transaction.sprigcode.json --workspace .
```

For one-off use without installing:

```bash
npx @sprigcode/cli --help
npx @sprigcode/cli validate transaction.sprigcode.json
npx @sprigcode/cli apply transaction.sprigcode.json --workspace .
```

Do not assume `npx sprigcode` works unless `@sprigcode/cli` is installed in the
current project. For one-off execution without installation, use
`npx @sprigcode/cli`.

## What to read next

- `README.md`
- `docs/typed-errors.md`
