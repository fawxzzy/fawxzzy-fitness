# CODEX / CLAUDE Guardrails

Use this file in consuming repositories to keep AI-assisted changes aligned with Playbook governance.

## Required execution flow
1. Run `npm run verify` before proposing completion.
2. If the repository has additional quality gates, run `npm run verify:strict`.
3. If contracts return WARN/FAIL, include remediation or explicit rationale in the PR summary.

## Architecture + contract constraints
- Obey repository architecture ownership boundaries documented in `docs/ARCHITECTURE.md`.
- Preserve Playbook contract invariants in `docs/CONTRACTS/` (server/client boundaries, scroll ownership, bottom action ownership, safe-area ownership).
- Do not silently relax guardrails to make a change pass; document divergence with owner + review target.

## Notes discipline
- Keep `docs/PLAYBOOK_NOTES.md` updated with new observations and rationale.
- Prefer promoting reusable rules upstream to Playbook instead of duplicating local doctrine.
