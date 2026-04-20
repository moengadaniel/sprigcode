# Security Policy

Sprigcode edits source code, so its failure modes matter.

Please report security issues privately to the repository owner instead of
opening a public issue.

## Security principles

- treat transaction files as untrusted input
- do not allow path traversal outside the target workspace
- do not execute arbitrary project scripts unless explicitly required
- refuse ambiguous edits instead of guessing
- keep semantic logic in the engine and adapters, not ad hoc helper scripts
- prefer least privilege in examples and tests

## Security-relevant examples

- A transaction that tries to edit `../../outside.ts` should fail with
  `WORKSPACE_PATH_ESCAPE`.
- A generated file should be blockable through `no_generated_files`.
- An ambiguous anchor should produce a typed refusal rather than a best-effort edit.
