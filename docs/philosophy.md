# Philosophy

## Problem

Many automation systems still treat code as bytes first and structure second.
That works until the caller has to decide whether a match is unique, whether a
public API changed, or whether a retry is idempotent.

## Design choice

Sprigcode makes semantic edits explicit and reviewable.

The caller should describe:

- what operation it wants
- what anchor it expects
- what constraints must hold

The engine should own:

- anchor resolution
- minimal edit planning
- conflict detection
- rollback
- typed refusal

## Limitation

This philosophy is intentionally conservative. It does not maximize the number
of edits Sprigcode can attempt. It maximizes trust in the edits it agrees to
make.

## What to read next

- `README.md`
- `docs/accuracy-contract.md`
