# Launch Readiness

## Current status

- ready for first GitHub push: **yes**
- ready for launch announcement: **yes**
- ready for npm publication: **yes**

## npm status

- npm publication is **complete**
- published packages:
  - `@sprigcode/schema`
  - `@sprigcode/core`
  - `@sprigcode/ts`
  - `@sprigcode/testkit`
  - `@sprigcode/cli`
- public installation and `npx sprigcode` usage can now be documented directly
- the first public scoped publish used `--access public`

## Scope ownership check

What was checked:

- `npm whoami` returned `eat-apples-space`
- `npm view @sprigcode/core name` returned `404 Not Found`

What that means:

- this machine is authenticated to npm as `eat-apples-space`
- the package is not currently visible on npm
- neither result proves that the authenticated account controls the `@sprigcode` scope

Conclusion:

- `@sprigcode` scope ownership confirmed: **yes**

## Verification results

These commands passed in the final verification loop:

- [x] `corepack pnpm install`
- [x] `corepack pnpm lint`
- [x] `corepack pnpm typecheck`
- [x] `corepack pnpm test`
- [x] `corepack pnpm test:golden`
- [x] `corepack pnpm test:smoke`
- [x] `corepack pnpm test:npm-smoke`
- [x] `corepack pnpm build`

Additional packaging checks:

- [x] `corepack pnpm -r pack --pack-destination .packs`
- [x] public package tarballs contain built `dist` outputs
- [x] external consumer install smoke passed from packed tarballs

## npm publish dry-runs

Dry-run commands run after build:

- [x] `corepack pnpm publish --dry-run --access public` in `packages/schema`
- [x] `corepack pnpm publish --dry-run --access public` in `packages/core`
- [x] `corepack pnpm publish --dry-run --access public` in `packages/ts`
- [x] `corepack pnpm publish --dry-run --access public` in `packages/testkit`
- [x] `corepack pnpm publish --dry-run --access public` in `packages/cli`

Result:

- npm publish dry-runs passed: **yes**

Observed behavior:

- each package produced a valid dry-run tarball summary
- no package failed dry-run validation

## External consumer install smoke

Script:

- `node scripts/npm-smoke.mjs`

Root script:

- `corepack pnpm test:npm-smoke`

What it proves:

- workspace builds successfully before packaging
- all five public packages can be packed to tarballs
- a fresh temporary consumer project can install those tarballs
- the consumer can import:
  - `@sprigcode/core`
  - `@sprigcode/ts`
  - `@sprigcode/schema`
- the consumer can run the installed `sprigcode` binary
- `sprigcode --help` works
- `sprigcode validate` works against a minimal transaction document

Result:

- external consumer install smoke passed: **yes**

## Publish order

Safest first-release order:

1. `@sprigcode/schema`
2. `@sprigcode/core`
3. `@sprigcode/ts`
4. `@sprigcode/testkit`
5. `@sprigcode/cli`

## Package checks

Confirmed package names:

- [x] `@sprigcode/core`
- [x] `@sprigcode/ts`
- [x] `@sprigcode/cli`
- [x] `@sprigcode/schema`
- [x] `@sprigcode/testkit`

Confirmed CLI binary:

- [x] `sprigcode`

Confirmed build entrypoints:

- [x] `packages/core/dist/index.js`
- [x] `packages/core/dist/index.d.ts`
- [x] `packages/ts/dist/index.js`
- [x] `packages/ts/dist/index.d.ts`
- [x] `packages/cli/dist/index.js`
- [x] `packages/cli/dist/index.d.ts`
- [x] `packages/schema/dist/index.js`
- [x] `packages/schema/dist/index.d.ts`
- [x] `packages/testkit/dist/index.js`
- [x] `packages/testkit/dist/index.d.ts`

Confirmed npm-facing metadata:

- [x] `name`
- [x] `version`
- [x] `description`
- [x] `license`
- [x] `repository`
- [x] `bugs`
- [x] `homepage`
- [x] `files`
- [x] `main`
- [x] `types`
- [x] `exports` where used
- [x] `bin` for `@sprigcode/cli`
- [x] `publishConfig.access = public` on the public packages

## Demo checks

- [x] flagship demo runs from the README command path
- [x] ambiguous-anchor demo fails with `ANCHOR_NOT_UNIQUE`
- [x] human failure output reads like a refusal, not a crash
- [x] README command paths match the repository layout
- [x] README output examples match the current CLI behavior

## Public credibility checks

- [x] README first screen explains what Sprigcode is
- [x] README first screen states why raw `write_file` is unsafe
- [x] README first screen shows a tiny transaction example
- [x] README first screen explains fail-closed refusal
- [x] README first screen gives one command to run the demo
- [x] README has a `60-second demo` path near the top
- [x] README explains why Sprigcode is not just a codemod
- [x] README explains why agent intent should not map directly to raw file writes
- [x] README has a trust model
- [x] README has sections for agent/tool authors and for humans
- [x] README now reflects real npm installation availability

## Technical proof checks

- [x] deterministic edit behavior is tested
- [x] missing anchors are tested
- [x] ambiguous anchors are tested
- [x] idempotence is tested
- [x] rollback is tested
- [x] constraint failures are tested
- [x] CLI JSON output is tested
- [x] flagship demo is covered by smoke and golden tests
- [x] failure demo is covered by smoke validation

## Pre-push checklist

- [ ] create or initialize the git repository if this local folder is still not a
  checkout
- [ ] push the repository
- [ ] open the README on GitHub and confirm the first screen lands within one
  viewport
- [ ] review `.github` metadata after the real repository exists remotely
- [ ] verify CI badge URLs after the real repository exists remotely
- [x] confirm `@sprigcode` scope ownership from the owner account
- [x] run publish dry-runs from an authenticated npm session
- [x] decide whether to publish immediately after the first GitHub push

## Local environment note

This audit was run in a local folder that is **not currently a git checkout**.
That did not block code, packaging, dry-runs, demos, or external install
verification, but it did block push and PR actions from this session.
