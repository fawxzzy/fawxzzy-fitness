# FawxzzyFitness

Fawxzzy Fitness is a Next.js app for tracking workouts, routines, and exercise history.

## Playbook runtime command path (canonical)

This repository uses `scripts/playbook-runtime.mjs` as the single repo command adapter to the shared Playbook runtime. Treat this as the only supported operator path for Playbook commands in this repo.

Canonical model:
- shared Playbook core runtime
- repo-local state in `.playbook/`
- one documented operator path in repo scripts/docs

## Playbook runtime setup

Deterministic Playbook resolution is package-first and does **not** rely on a globally installed `playbook` on `PATH`.

Resolution order used by `scripts/playbook-runtime.mjs`:
1. `PLAYBOOK_BIN` environment override (`PLAYBOOK_RUNTIME_BIN` is transitional compatibility only).
2. Repo-local Playbook install (prefers `node_modules/.bin/playbook`, then installed package entrypoint resolution).
3. Official non-registry fallback install at `.playbook/runtime/node_modules/.bin/playbook`.
4. Transitional dev fallback to local checkout at `C:\Users\zjhre\dev\playbook` (disable during proof checks via `PLAYBOOK_DISABLE_DEV_FALLBACK=1`).
5. Otherwise fail with a precise actionable error describing what was checked.

Expected unresolved error shape:
- `Unable to resolve a Playbook executable.`
- `Checked: PLAYBOOK_BIN... -> repo-local package/bin resolution -> official fallback install ... -> dev fallback path ...`
- action list for env override / local package install / official fallback install / optional dev fallback.


### Canonical package acquisition path (when package access is available)

Base install intentionally does **not** hard-require `@fawxzzy/playbook-cli` in `package.json`. Install dependencies first, then acquire Playbook explicitly:

```bash
npm install
npm run playbook-runtime:install-package
env -u PLAYBOOK_BIN -u PLAYBOOK_RUNTIME_BIN PLAYBOOK_DISABLE_DEV_FALLBACK=1 npm run ai-context
```

Expected behavior:
- base dependency install succeeds without Playbook registry access
- explicit acquisition installs package-local `playbook` into `node_modules/.bin/playbook`
- runtime writes under `.playbook/`

Use `PLAYBOOK_BIN` only for temporary overrides. Treat the dev fallback checkout path as backup-only recovery, not primary setup.

### Official non-registry fallback install (when npm registry access is blocked)

If package acquisition (`npm run playbook-runtime:install-package`) fails with an auth/403 error, install the official distribution artifact into `.playbook/runtime` and keep dev fallback disabled:

```bash
PLAYBOOK_OFFICIAL_FALLBACK_SPEC="<official-playbook-distribution-spec>" npm run playbook-runtime:install-official-fallback
env -u PLAYBOOK_BIN -u PLAYBOOK_RUNTIME_BIN PLAYBOOK_DISABLE_DEV_FALLBACK=1 npm run ai-context
```

Notes:
- `PLAYBOOK_OFFICIAL_FALLBACK_SPEC` must point to the official upstream fallback package spec (for example, an official tarball URL or file path provided by Playbook maintainers).
- This fallback does **not** replace package acquisition behavior; it is only for environments where package install is unavailable.
- Keep `PLAYBOOK_DISABLE_DEV_FALLBACK=1` during proof runs so fallback results are not masked by local checkout state.

CI now enforces this clean-environment proof path by running `npm install`, acquiring Playbook explicitly (`playbook-runtime:install-package` with official fallback contingency), unsetting `PLAYBOOK_BIN`/`PLAYBOOK_RUNTIME_BIN`, setting `PLAYBOOK_DISABLE_DEV_FALLBACK=1`, executing the canonical command ladder, and failing if `.playbook/` has no runtime artifacts.

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
- Transitional compatibility surfaces are tracked in `docs/PLAYBOOK_MIGRATION_INVENTORY.md` and are non-canonical.

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
