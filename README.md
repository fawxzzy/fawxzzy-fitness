# FawxzzyFitness

Fawxzzy Fitness is a Next.js app for tracking workouts, routines, and exercise history.

Repo-local agent guidance lives in `AGENT.md`. Treat it as the product-specific operating layer for app behavior, UI language, and implementation preferences in this repository.

## Playbook runtime command path (canonical)

This repository uses the top-level npm commands backed by `scripts/playbook-runtime.mjs`, which resolves the runtime through the canonical official fallback path or an explicitly enabled package install. Treat those top-level npm commands as the only supported operator path for Playbook in this repo.

Canonical model:
- shared Playbook core runtime
- repo-local state in `.playbook/`
- one documented operator path in repo scripts/docs

## Playbook runtime setup

Deterministic Playbook resolution is official-fallback-first and does **not** rely on a globally installed `playbook` on `PATH`.

Resolution order used by `scripts/playbook-runtime.mjs`:
1. `PLAYBOOK_BIN` environment override.
2. Repo-local Playbook install (prefers `node_modules/.bin/playbook`, then installed package entrypoint resolution).
3. Official GitHub release fallback install at `.playbook/runtime/node_modules/.bin/playbook`.
4. Otherwise fail with a precise actionable error describing what was checked.

Expected unresolved error shape:
- `Unable to resolve a Playbook executable.`
- `Checked: PLAYBOOK_BIN... -> repo-local package/bin resolution -> official fallback install ...`
- action list for env override / official fallback install / explicitly-enabled package acquisition

### Canonical official acquisition path

Base install intentionally does **not** hard-require a Playbook npm package in `package.json`, and clean-environment bootstrap should assume the official GitHub release tarball is the supported distribution contract.

```bash
npm ci
node scripts/playbook-runtime.mjs --install-official-fallback
env -u PLAYBOOK_BIN node scripts/playbook-runtime.mjs ai-context
```

Expected behavior:
- clean dependency install succeeds without any Playbook registry package assumption
- official runtime acquisition downloads the pinned release tarball to a temp `.tgz` under `.playbook/runtime/`
- installer logs the source URL, final resolved URL, HTTP status, local tarball path, and artifact size
- runtime writes under `.playbook/`

### Optional package acquisition path (explicit opt-in only)

Package acquisition is **not** attempted by default. Only use it when you intentionally want to test or consume a published package coordinate, and enable it explicitly by env/config:

```bash
PLAYBOOK_ENABLE_PACKAGE_ACQUIRE=1 PLAYBOOK_PACKAGE_SPEC="@fawxzzy/playbook-cli@0.1.8" node scripts/playbook-runtime.mjs --install-package
```

Notes:
- If `PLAYBOOK_ENABLE_PACKAGE_ACQUIRE` is unset and `PLAYBOOK_PACKAGE_SPEC` is empty, `--install-package` exits with guidance instead of attempting a non-canonical branch.
- `PLAYBOOK_PACKAGE_SPEC` remains an override for environments that intentionally validate a published package artifact.
- The default operator and CI path should not depend on a package coordinate that may be unpublished or unsupported.

### Official fallback spec rules

`PLAYBOOK_OFFICIAL_FALLBACK_SPEC` defaults to the pinned official GitHub release asset: `https://github.com/ZachariahRedfield/playbook/releases/download/v0.1.8/playbook-cli-0.1.8.tgz`.

Supported forms:
- `https://` / `http://` tarball URL
- `file:` URL
- local filesystem tarball path
- `git+`/git URL when the upstream distribution contract explicitly uses git install targets

Unsupported form:
- registry-style package specs such as `@fawxzzy/playbook-cli@0.1.8`

CI should install dependencies with `npm ci`, acquire the runtime through `node scripts/playbook-runtime.mjs --install-official-fallback`, unset `PLAYBOOK_BIN`, and then validate the canonical command ladder.

## Playbook workflow: bootstrap → intelligence → remediation

### 1) Bootstrap commands

```bash
npm run ai-context
npm run ai-contract
npm run index
```


### 2) Repo-intelligence commands

```bash
npm run context
npm run query:modules
npm run explain:architecture
npm run ask:repo-context
```

These map to canonical Playbook runtime surfaces via the bridge:
- `context`
- `query modules`
- `explain architecture`
- `ask --repo-context` (optional upstream capability; availability depends on installed runtime)

### 3) Verification and planning flow

```bash
npm run verify
npm run plan
npm run pilot
```

### 4) Ignore tuning flow

```bash
npm run ignore:suggest
npm run ignore:apply
```

Rule: ignore tuning should narrow scan noise, **not** hide system truth. Keep architecture-defining areas (for example `src/`, `docs/ARCHITECTURE.md`, and key runtime scripts) visible to indexing and intelligence commands.

## Migration note

- Legacy learning/sync/update command families are retired.
- Vendored subtree workflow guidance is retired.
- Historical migration notes remain in `docs/CHANGELOG.md`, but they are not part of the active operator workflow.

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm run build
```

## Fitness governed ecosystem contract

Fitness now ships an in-repo deterministic integration contract and fixtures for the governed ecosystem loop.

Key paths:
- Contract/types: `src/lib/ecosystem/`
- Deterministic fixtures: `src/lib/ecosystem/fixtures/`
- Canonical truth pack: `truth-pack/fitness/`
- Architecture doc: `docs/architecture/fitness-integration.md`

The contract is intentionally reusable for future apps by keeping the base ecosystem schemas generic and app bindings explicit.
