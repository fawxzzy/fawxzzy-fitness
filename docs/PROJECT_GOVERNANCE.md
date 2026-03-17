# Project Governance

## Governance Scope Declaration

Governance Scope: Normative
Owner: Fawxzzy Fitness maintainers

This repository is governed by project-local documentation and quality checks.

Primary local sources of truth:
- `docs/ARCHITECTURE.md`
- `docs/PROJECT_GOVERNANCE.md`
- `docs/CHANGELOG.md`

## Rules for Codex / Agents

1. Follow `docs/ARCHITECTURE.md` for project-specific structure and boundaries.
2. Update `docs/CHANGELOG.md` (WHAT + WHY) for non-trivial changes.
3. Prefer the smallest clear diff over abstraction-heavy changes.
4. Run quality gates after implementation:
   - `npm run lint`
   - `npm run build`

## Enforcement Guardrails

- `docs/ARCHITECTURE.md` is the local architectural contract; do not introduce undocumented architectural drift.
- Do not create new structural layers without clear justification.
- Preserve strict server/client boundaries, RLS safety, and server-owned data writes.
- Use strict server actions for protected mutations (`requireUser()` + `supabaseServer()`).

## Documentation Scope in This Repo

Allowed governance documentation files:
- `docs/PROJECT_GOVERNANCE.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`

## Migration Note (Temporary Bridge, Canonical Upstream Runtime)

The local Playbook wrapper is compatibility scaffolding only.

Canonical bridge command path for local operations:
- `npm run playbook:ai-context`
- `npm run playbook:ai-contract`
- `npm run playbook:context`
- `npm run playbook:index`
- `npm run playbook:query-modules`
- `npm run playbook:explain-architecture`
- `npm run playbook:ask-repo-context`
- `npm run playbook:ignore-suggest`
- `npm run playbook:ignore-apply`
- `npm run playbook:verify`
- `npm run playbook:plan`
- `npm run playbook:pilot`

Temporary compatibility aliases may exist during migration, but they must remain strict forwards to canonical behavior.

Migration constraints:
- Do not add repo-specific runtime output semantics in the bridge.
- Do not document or reintroduce deprecated Playbook maintenance/sync commands.
- Do not document vendored Playbook subtree workflows in this repository.
- Keep retirement decisions in sync with `docs/PLAYBOOK_MIGRATION_INVENTORY.md`.
- Remove/minimize wrapper logic once direct shared-runtime parity is proven.

## Playbook Runtime Model (Shared Core + Local State)

This repository uses the shared Playbook runtime model with project-local runtime state under `.playbook/`.

Runtime contracts:
- Runtime artifacts are written under `.playbook/` only.
- `.playbook/` is ignored via `.gitignore` to prevent ad hoc committed runtime noise.
- Scan tuning is controlled via `.playbookignore`.
- Optional runtime config is in `playbook.config.json` when project-local defaults need to be explicit.

## Playbook Resolution Policy (Package-First Consumer Model)

Runtime resolution order is deterministic and must remain:
1. `PLAYBOOK_BIN` environment override (legacy `PLAYBOOK_RUNTIME_BIN` allowed for compatibility).
2. Repo-local package install resolution (prefer `node_modules/.bin/playbook`, then package entrypoint lookup).
3. Dev-only temporary fallback at `C:\Users\zjhre\dev\playbook` (backup-only; disable with `PLAYBOOK_DISABLE_DEV_FALLBACK=1` when validating canonical behavior).
4. Explicit actionable failure if unresolved.


Consumer-integration success criteria (must be reproducible in a clean environment):
- `npm install` provisions a repo-local Playbook binary through package metadata.
- With `PLAYBOOK_BIN` and `PLAYBOOK_RUNTIME_BIN` unset, commands resolve through repo-local package installation.
- Canonical proof runs must set `PLAYBOOK_DISABLE_DEV_FALLBACK=1` to prevent fallback capture.
- Runtime outputs continue to land only under `.playbook/`.

Policy constraints:
- Global `PATH` lookup is **not** canonical and must not be relied on for repo scripts.
- The local checkout fallback is temporary compatibility scaffolding, not the documented standard install model.
- Keep bridge scope thin: resolution + forwarding only.

## Operational Sequence

Follow this deterministic operating sequence when using Playbook in this repo:
1. **Bootstrap first:** `ai-context`, `ai-contract`, `index`.
2. **Then intelligence:** `context`, `query modules`, `explain architecture`, optional `ask --repo-context`.
3. **Then remediation:** `verify`, `plan`, `pilot`.
4. **Ignore tuning as needed:** run `ignore suggest` and `ignore apply --safe-defaults`, then re-run core reads (`context`/`query`/`explain`) to confirm architecture truth remains visible.

## Ignore Tuning Rule

Ignore tuning must narrow scan noise, not hide system truth. Keep architectural sources (app code, architecture docs, migration/runtime bridge scripts, and canonical governance docs) in-bounds for indexing and analysis.
