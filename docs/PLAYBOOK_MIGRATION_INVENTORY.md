# Playbook Migration Inventory

## Purpose

Deterministic inventory of remaining legacy-Playbook-adjacent surfaces, classified for controlled retirement under the rule: **one Playbook ownership model per repo**.

## Classification legend

- `KEEP_TEMPORARILY`: Keep for now; active and aligned with current ownership model.
- `REPLACE_WITH_NEW_PLAYBOOK`: Keep only until direct shared Playbook flow fully supersedes local bridge affordance.
- `INVESTIGATE_USAGE`: Unclear external dependence; validate usage before changing.
- `REMOVE_AFTER_PARITY`: Redundant now or after explicit parity preconditions.

## Inventory

| Surface | Location | Category | Current behavior | Replaced by runtime bridge? | Replaced by external shared Playbook flow? | Removal preconditions | Decision |
|---|---|---|---|---|---|---|---|
| Canonical Playbook command bridge scripts (`ai-context`, `ai-contract`, `index`, `verify`, `plan`, `pilot`) | `package.json`, `scripts/playbook-runtime.mjs` | `REPLACE_WITH_NEW_PLAYBOOK` | Provides deterministic local command surface and `.playbook/` artifact generation for current contributors. | N/A (this *is* the bridge) | Partially; external flow owns doctrine, but this repo still needs local wrapper commands. | Shared external operator entrypoints are consumable directly in this repo without local wrapper loss. | Keep until direct external parity is shipped. |
| Runtime migration note text describing retired legacy families/subtree guidance | `README.md`, `docs/PROJECT_GOVERNANCE.md` | `KEEP_TEMPORARILY` | Prevents accidental reintroduction of removed `playbook:*` / subtree sync behaviors in contributor docs. | Yes, indirectly (documents current bridge-only path). | Yes, conceptually; external shared model is the rationale. | One additional release cycle with no regressions and no incoming legacy command proposals. | Keep; wording tightened to point to this inventory. |
| Historical legacy command/subtree references in changelog entries | `docs/CHANGELOG.md` | `KEEP_TEMPORARILY` | Historical record of prior architecture and migration events. Not executable. | Not applicable | Not applicable | None; retain for auditable history unless changelog compaction policy is introduced. | Keep as immutable history. |
| Archived cleanup patch artifacts containing removed Playbook-era strings | `docs/_archive/cleanup-2026-03-02/codex.patch` (and archive folder context) | `INVESTIGATE_USAGE` | Frozen archive evidence from earlier cleanup work; may include obsolete path/script names in diffs. | Not applicable | Not applicable | Confirm no automation/tooling parses this archive as active instructions. | Keep for now; investigate consumers before any purge. |
| Git hook setup path (`prepare` -> `scripts/setup-githooks.mjs`) and active pre-commit hook | `package.json`, `scripts/setup-githooks.mjs`, `.githooks/pre-commit` | `KEEP_TEMPORARILY` | Installs and runs lint-focused hooks; no Playbook learning/sync automation remains. | Yes; independent from bridge, but consistent with current governance checks. | Not directly | Team decision to drop install-time hook setup or replace with another standard hook manager. | Keep; this is active quality-gate infrastructure, not legacy Playbook flow. |
| Unused legacy helper hook shim | `scripts/githooks/pre-commit.mjs` | `REMOVE_AFTER_PARITY` | Redundant duplicate pre-commit implementation; not referenced by active hook path. | N/A | N/A | None (already unused and superseded by `.githooks/pre-commit`). | **Removed now**. |

## Deterministic search checks used for this inventory

```bash
rg -n "Playbook/|scripts/playbook/|playbook:|contracts:|git subtree|playbook:update|playbook:sync|playbook:check|playbook:precommit|setup-githooks|hooksPath" docs/CHANGELOG.md README.md docs/PROJECT_GOVERNANCE.md package.json .github/workflows scripts .githooks docs/_archive
```

```bash
rg -n "playbook:|contracts:" package.json
```

```bash
rg -n "scripts/githooks/pre-commit\.mjs" .
```

## Immediate retirement actions completed

- Removed `scripts/githooks/pre-commit.mjs` because it was redundant and unreferenced.
- Removed redundant `hooks:install` script alias from `package.json`; `prepare` remains the single hook-setup entrypoint.

