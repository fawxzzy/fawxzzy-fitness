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

## Migration Note (Canonical Runtime Path)

This repository has completed migration to a single Playbook runtime path.

Canonical command path for local operations:
- `npm run ai-context`
- `npm run ai-contract`
- `npm run index`
- `npm run verify`
- `npm run plan`
- `npm run pilot` (runs the full baseline flow)

Migration constraints:
- Do not document or reintroduce deprecated Playbook maintenance/sync commands.
- Do not document vendored Playbook subtree workflows in this repository.

## Playbook Runtime Model (Shared Core + Local State)

This repository uses the shared Playbook runtime model with project-local runtime state under `.playbook/`.

Runtime contracts:
- Runtime artifacts are written under `.playbook/` only.
- `.playbook/` is ignored via `.gitignore` to prevent ad hoc committed runtime noise.
- Scan tuning is controlled via `.playbookignore`.
- Optional runtime config is in `playbook.config.json` when project-local defaults need to be explicit.
