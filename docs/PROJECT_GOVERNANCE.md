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

## Migration Note (Legacy Vendored Playbook Removal)

The repository removed the legacy vendored Playbook integration surface, including:
- `Playbook/` vendored subtree content
- `scripts/playbook/` maintenance/learning scripts
- Playbook-only CI and hook wiring
- npm scripts prefixed with `playbook:` and `contracts:`

Reason: the vendored doctrine/learning engine created a second ownership model in this repository and caused shadow governance surfaces. The repo now keeps a single, local ownership model for governance and quality checks.
