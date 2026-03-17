# Playbook Migration Inventory

## Purpose

Full-repo inventory of remaining legacy-Playbook-adjacent surfaces after proving the package-first consumer path, with deterministic retirement classification.

## Classification legend

- `REMOVE_NOW`: Redundant active surface; remove immediately.
- `KEEP_TEMPORARILY_WITH_NOTE`: Transitional surface retained for compatibility; must be explicitly marked non-canonical.
- `HISTORICAL_ONLY`: Historical records retained for auditability; non-executable.

## Inventory

| Surface | Location | Classification | Decision |
|---|---|---|---|
| Secondary `playbook:*` npm command family | `package.json` | `REMOVE_NOW` | Removed so only one active operator path remains (`npm run ai-context`, `ai-contract`, `context`, `index`, `verify`, `plan`, `pilot`, and related intelligence/ignore commands). |
| Legacy-leaning wording around temporary bridge ownership model | `README.md`, `docs/PROJECT_GOVERNANCE.md` | `REMOVE_NOW` | Reworded to a single canonical operator path and explicit non-canonical status for transitional env compatibility. |
| `PLAYBOOK_RUNTIME_BIN` env variable compatibility support | `scripts/playbook-runtime.mjs`, referenced in docs | `KEEP_TEMPORARILY_WITH_NOTE` | Retained only as transitional compatibility fallback; docs now explicitly mark it non-canonical versus `PLAYBOOK_BIN`. |
| Dev checkout fallback path (`C:\Users\zjhre\dev\playbook`) | `scripts/playbook-runtime.mjs`, referenced in docs | `KEEP_TEMPORARILY_WITH_NOTE` | Retained as backup-only migration scaffolding; canonical proof flow requires `PLAYBOOK_DISABLE_DEV_FALLBACK=1`. |
| Historical changelog entries discussing old Playbook subtree/sync/update workflows | `docs/CHANGELOG.md` | `HISTORICAL_ONLY` | Kept unchanged as immutable release history; not active operational guidance. |
| Archived cleanup patch artifacts with legacy strings | `docs/_archive/cleanup-2026-03-02/codex.patch` | `HISTORICAL_ONLY` | Retained as archive evidence only; not referenced as active process documentation. |

## Deterministic search checks used for this inventory

```bash
rg -n "playbook:|PLAYBOOK_RUNTIME_BIN|PLAYBOOK_BIN|git subtree|sync-playbook|playbook:update|playbook:sync|playbook:check|vendored|legacy" README.md docs package.json scripts .github/workflows tools
```

```bash
rg -n "playbook:\*|npm run playbook:" README.md docs/PROJECT_GOVERNANCE.md package.json
```

## Retirement actions completed in this change

- Removed the duplicate `playbook:*` npm command family from `package.json`.
- Updated README/governance docs to a single active operator path.
- Marked retained compatibility surfaces (`PLAYBOOK_RUNTIME_BIN`, dev fallback path) as transitional/non-canonical.
