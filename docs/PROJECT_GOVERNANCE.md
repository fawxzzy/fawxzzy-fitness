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

## Playbook Operator Path (Single Active Surface)

The repository uses one active Playbook operator surface: the top-level npm commands that execute `scripts/playbook-runtime.mjs`.

Canonical local command path:
- `npm run ai-context`
- `npm run ai-contract`
- `npm run context`
- `npm run index`
- `npm run query:modules`
- `npm run explain:architecture`
- `npm run ask:repo-context`
- `npm run ignore:suggest`
- `npm run ignore:apply`
- `npm run verify`
- `npm run plan`
- `npm run pilot`

Retirement constraints:
- Do not add secondary `playbook:*` command families or duplicate wrappers.
- Do not document or reintroduce deprecated Playbook maintenance/sync commands.
- Do not document vendored Playbook subtree workflows in this repository.
- Keep transitional surface decisions in sync with `docs/PLAYBOOK_MIGRATION_INVENTORY.md`.

## Playbook Runtime Model (Shared Core + Local State)

This repository uses the shared Playbook runtime model with project-local runtime state under `.playbook/`.

Runtime contracts:
- Runtime artifacts are written under `.playbook/` only.
- `.playbook/` is ignored via `.gitignore` to prevent ad hoc committed runtime noise.
- Scan tuning is controlled via `.playbookignore`.
- Optional runtime config is in `playbook.config.json` when project-local defaults need to be explicit.

## Playbook Resolution Policy (Package-First Consumer Model)

Runtime resolution order is deterministic and must remain:
1. `PLAYBOOK_BIN` environment override (`PLAYBOOK_RUNTIME_BIN` is transitional compatibility only).
2. Repo-local package install resolution (prefer `node_modules/.bin/playbook`, then package entrypoint lookup).
3. Official non-registry fallback install resolution at `.playbook/runtime/node_modules/.bin/playbook`.
4. Dev-only temporary fallback at `C:\Users\zjhre\dev\playbook` (backup-only; disable with `PLAYBOOK_DISABLE_DEV_FALLBACK=1` when validating canonical behavior).
5. Explicit actionable failure if unresolved.


Consumer-integration success criteria (must be reproducible in a clean environment):
- `npm install` succeeds without hard-requiring `@fawxzzy/playbook-cli` in the base dependency graph.
- Playbook acquisition is explicit: run `npm run playbook-runtime:install-package` when package access is available.
- If package acquisition is blocked, operators may install the official fallback distribution by setting `PLAYBOOK_OFFICIAL_FALLBACK_SPEC` and running `npm run playbook-runtime:install-official-fallback`.
- CI must pin `PLAYBOOK_OFFICIAL_FALLBACK_SPEC` to an immutable official distribution artifact in workflow config so registry outages cannot block core runtime acquisition.
- CI acquisition sequence is explicit and deterministic: attempt `playbook-runtime:install-package` first, then run `playbook-runtime:install-official-fallback` when package acquisition fails or is intentionally skipped (`PLAYBOOK_SKIP_PACKAGE_ACQUIRE=1`).
- With `PLAYBOOK_BIN` and `PLAYBOOK_RUNTIME_BIN` unset, commands resolve through repo-local package acquisition first, then official fallback, then optional dev fallback.
- Canonical proof runs must set `PLAYBOOK_DISABLE_DEV_FALLBACK=1` to prevent dev-checkout fallback capture.
- Runtime outputs continue to land only under `.playbook/`.
- CI/local validation must assert required runtime artifacts exist: `.playbook/findings.json`, `.playbook/plan.json`, `.playbook/repo-graph.json`, and `.playbook/last-run.json`.

Policy constraints:
- Global `PATH` lookup is **not** canonical and must not be relied on for repo scripts.
- The local checkout fallback is temporary compatibility scaffolding, not the documented standard install model; consumer repos must use explicit acquisition rather than hard dependency coupling.
- Keep bridge scope thin: resolution + forwarding only.

## Operational Sequence

Follow this deterministic operating sequence when using Playbook in this repo:
1. **Bootstrap first:** `ai-context`, `ai-contract`, `index`.
2. **Then intelligence:** `context`, `query modules`, `explain architecture`, optional `ask --repo-context`.
3. **Then remediation:** `verify`, `plan`, `pilot`.
4. **Ignore tuning as needed:** run `ignore suggest` and `ignore apply --safe-defaults`, then re-run core reads (`context`/`query`/`explain`) to confirm architecture truth remains visible.

## Ignore Tuning Rule

Ignore tuning must narrow scan noise, not hide system truth. Keep architectural sources (app code, architecture docs, migration/runtime bridge scripts, and canonical governance docs) in-bounds for indexing and analysis.
