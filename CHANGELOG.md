# Changelog

## 0.1.3

- Hardened workspace path resolution against symlink-based workspace escapes.
- Added regression coverage for symlink workspace-boundary refusal.
- Removed stale CODEOWNERS ownership and obsolete pnpm ignore entries.
- Aligned typed-error documentation with implemented error codes.
- Removed shell-based Windows process spawning from the npm smoke test.
- No transaction document format changes.

## 0.1.2

- Updated repository metadata and package links for `moengadaniel/sprigcode`.
- Switched repository development from pnpm to npm workspaces.
- Improved README positioning, safety-model documentation, and contribution
  pathways.
- Added agent integration and technical thesis documentation.
- Added and verified an additional guarded-route example.
- No transaction semantics or public API changes.

## 0.1.1

- Added package-specific `README.md` files to public package tarballs so npm
  package pages show useful documentation.
- No runtime changes.
- No CLI behavior changes.
- No transaction semantics or public API changes.

## 0.1.0

- Initial Sprigcode monorepo
- Language-agnostic transaction engine
- TypeScript adapter vertical slice
- CLI, schema, testkit, docs, and CI
