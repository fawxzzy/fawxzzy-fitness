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
3. Transitional dev fallback to local checkout at `C:\Users\zjhre\dev\playbook` (disable during proof checks via `PLAYBOOK_DISABLE_DEV_FALLBACK=1`).
4. Otherwise fail with a precise actionable error describing what was checked.

Expected unresolved error shape:
- `Unable to resolve a Playbook executable.`
- `Checked: PLAYBOOK_BIN... -> repo-local package/bin resolution -> dev fallback path ...`
- action list for env override / local package install / optional dev fallback.


### Canonical package-first install (consumer proof path)

This repository now installs Playbook as a repo-local dev dependency (`@fawxzzy/playbook-cli` via `file:tools/playbook-cli`).

Use this exact setup path:

```bash
npm install
env -u PLAYBOOK_BIN -u PLAYBOOK_RUNTIME_BIN PLAYBOOK_DISABLE_DEV_FALLBACK=1 npm run ai-context
```

Expected behavior:
- command resolves through `node_modules/.bin/playbook`
- runtime writes under `.playbook/`
- no dependency on machine-specific fallback checkouts

Use `PLAYBOOK_BIN` only for temporary overrides. Treat the dev fallback checkout path as backup-only recovery, not primary setup.

CI now enforces this exact clean-environment proof path by running `npm install`, unsetting `PLAYBOOK_BIN`/`PLAYBOOK_RUNTIME_BIN`, setting `PLAYBOOK_DISABLE_DEV_FALLBACK=1`, executing the canonical command ladder, and failing if `.playbook/` has no runtime artifacts.

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
