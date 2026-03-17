# FawxzzyFitness

Fawxzzy Fitness is a Next.js app for tracking workouts, routines, and exercise history.

## Playbook runtime bridge (temporary compatibility only)

This repository includes a **temporary** bridge at `scripts/playbook-runtime.mjs`. The bridge must remain a thin adapter that forwards to the shared Playbook runtime and must not grow repo-specific runtime behavior.

Canonical long-term model:
- shared Playbook core runtime
- repo-local state in `.playbook/`
- minimal/no repo wrapper once direct parity is proven

## Playbook runtime setup

Deterministic Playbook resolution is package-first and does **not** rely on a globally installed `playbook` on `PATH`.

Resolution order used by `scripts/playbook-runtime.mjs`:
1. `PLAYBOOK_BIN` (or legacy `PLAYBOOK_RUNTIME_BIN`) environment override.
2. Repo-local Playbook install (prefers `node_modules/.bin/playbook`, then installed package entrypoint resolution).
3. **Dev-only temporary fallback** to local checkout at `C:\Users\zjhre\dev\playbook` (disabled by default during proof checks via `PLAYBOOK_DISABLE_DEV_FALLBACK=1`).
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

## Playbook workflow: bootstrap → intelligence → remediation

### 1) Bootstrap commands

```bash
npm run ai-context
npm run ai-contract
npm run index
```

Canonical explicit names are also available:

```bash
npm run playbook:ai-context
npm run playbook:ai-contract
npm run playbook:index
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

- Legacy learning/sync/update command families were removed.
- Legacy vendored subtree workflow guidance no longer applies in this repository.
- Remaining migration-era surfaces are inventoried in `docs/PLAYBOOK_MIGRATION_INVENTORY.md`.

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
