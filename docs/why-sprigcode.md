# Why Sprigcode

Sprigcode exists because raw file writes are the wrong abstraction for many
automated code-editing systems.

That does not mean raw file writes are never useful. They are simple, universal,
and easy to expose. A tool can read a file, produce replacement contents, and
write the file back. For many local scripts and one-off edits, that is enough.

The problem appears when the caller is an AI coding agent, IDE assistant,
automated PR system, MCP-style tool, migration runner, or security patching
service. These systems often know the intent of a change before they can prove
the exact mutation is safe. They can say "add a rate limit check before sending
a password reset email" or "rename this exported symbol and update call sites."
Handing them `write_file` turns that intent into a full-file replacement
problem. The caller has to locate the right code, preserve unrelated code,
handle formatting, decide what ambiguity means, and explain failures after the
fact.

Those are not small details. They are the difference between a reviewable
automated change and an unsafe overwrite.

## Raw writes put the burden in the wrong place

A raw write makes the caller responsible for the hardest part of the edit. The
caller must decide where the change belongs. It must decide whether one match or
many matches were found. It must avoid touching adjacent code that happened to
be in the same file. It must preserve imports, comments, local conventions, and
unrelated edits that may have happened since the file was read. It must decide
whether retrying the operation will duplicate the change. It must turn all of
those outcomes into a useful error model.

For an AI agent, this is especially awkward. The model may be good at
describing intent, but a raw write asks it to also be the edit planner, conflict
detector, formatter, idempotence checker, and failure classifier. If the prompt
or tool call is slightly underspecified, the easiest failure mode is a plausible
wrong edit. That is the failure mode Sprigcode is designed to avoid.

Sprigcode treats a wrong edit as a critical bug. A typed refusal is acceptable.

## Typed transactions are a narrower boundary

Sprigcode asks the caller to emit a transaction document instead of replacement
file contents. A transaction document describes intent using a small set of
typed operations, semantic anchors, and constraints. For example, a transaction
can say:

- add a named import from a specific module
- insert a statement before a call to a specific function in a specific file
- require exactly one anchor match
- require the transaction to be idempotent

That boundary is narrower than `write_file`. It is also more useful to machines.
The transaction can be validated before reading or writing project files. Each
operation has known fields and known failure modes. The engine can plan text
edits, detect conflicts, verify constraints, and return a deterministic diff or
a typed error.

This moves responsibility into the component that is designed to own it. The
agent or tool decides what should change. Sprigcode decides whether that change
can be applied safely.

## Semantic anchors reduce guessing

Most useful edits are not just byte offsets. They refer to code structure:

- the call to `sendPasswordResetEmail` inside `requestPasswordReset`
- the exported function named `createSession`
- the object literal passed to `defineConfig`
- the import from a specific module

Sprigcode represents these targets as semantic anchors. A language adapter
resolves the anchor against the source code and reports how many candidates were
found. If the anchor resolves to one supported location, the operation can plan
an edit. If it resolves to zero locations, the transaction fails with
`ANCHOR_NOT_FOUND`. If it resolves to multiple locations, it fails with
`ANCHOR_NOT_UNIQUE`.

The important property is not that anchors are magic. They are not. The
important property is that anchor resolution is explicit, testable, and
machine-readable. A caller does not have to infer from a surprising diff that
the wrong call was changed. It gets a typed refusal before any file is written.

## Fail-closed behavior matters

Automated code editing needs a different default than ordinary text editing. If
the engine cannot prove the edit belongs in one place, it should not pick the
most likely place. If syntax is unsupported, it should not approximate. If an
operation is unsupported, it should not silently skip it. If planned edits
overlap, it should not try to merge them by intuition.

This is the fail-closed contract:

- ambiguous anchors are refused
- unsupported syntax is refused
- unsupported operations are refused
- conflicting edits are refused
- failed constraints are refused
- rollback is attempted when an apply step fails

The result is not always convenient. A transaction may fail even when a human
can see what the intended edit was. That is a better default for tooling that
will be wired into agents, CI, IDEs, or automated PR systems. The refusal can be
reported, fixed, retried, or converted into a narrower transaction. A wrong edit
may already have damaged trust.

## Relationship to codemods and AST tools

Sprigcode is not a replacement for every codemod workflow.

Tools like `jscodeshift`, `ast-grep`, `ts-morph`, and direct compiler API usage
are good at custom transformations. They are often the right choice for large
migrations, broad pattern rewrites, or codebase-specific logic. They give an
engineer full control over traversal and rewriting.

Sprigcode is aimed at a different layer. It is lower-level than an AI coding
assistant, because it does not decide product intent or reason over an issue. It
is higher-level than raw AST scripting, because callers do not write a custom
transform for every supported operation. It is more constrained than raw file
writes, because it exposes a small transaction protocol instead of arbitrary
replacement text.

The useful comparison is not "Sprigcode versus codemods." The useful comparison
is "where should the mutation boundary be for tools that repeatedly ask for
common semantic edits?" Sprigcode's answer is typed transactions, semantic
anchors, deterministic diffs, rollback, and typed errors.

## Why TypeScript and TSX first

Sprigcode starts with TypeScript and TSX because a narrow slice is easier to
make honest.

TypeScript is common in the places where automated code editing is useful:
frontends, backend services, SDKs, platform migrations, API clients, and
developer tooling. It also has a mature compiler API, predictable syntax trees,
and enough real-world complexity to test whether the transaction model is
valuable.

Starting narrow keeps the public contract clear. The TypeScript adapter owns
parsing, source-file loading, syntax-aware anchor resolution, symbol resolution,
language-specific planning, and verification. The core package remains
language-agnostic. Other languages should not be claimed until they are
implemented and tested with the same failure discipline.

## What Sprigcode intentionally does not do

Sprigcode is not an AI agent. It does not chat with users, rank tasks, inspect
issues, or decide what product behavior should change. It does not replace a
developer reviewing a PR.

Sprigcode is not a SaaS dashboard or codemod marketplace. It does not provide a
hosted workflow, recipe catalog, or general migration platform.

Sprigcode is not a universal AST transformation framework. It intentionally
supports a small set of typed operations. Unsupported operations should fail
with `UNSUPPORTED_OPERATION`, not pretend to work through a generic escape
hatch.

Sprigcode is not production-proven infrastructure just because the idea is
useful. Its credibility has to come from tests, examples, deterministic
behavior, honest docs, and a conservative failure model.

The core thesis is intentionally small: stop giving agents raw file mutation as
their primary write boundary. Give them typed code-edit transactions, and let a
purpose-built engine decide whether the edit can be applied safely.
