This file is a project-local inbox for repo-specific Playbook notes that may later be promoted upstream.

## Playbook integration status
- Playbook runtime resolution in this repo is package-first, with explicit official fallback acquisition documented in `docs/PROJECT_GOVERNANCE.md` and `README.md`.
- Companion governance docs should be created during integration changes, not deferred until after `verify` starts enforcing them.
- New notes should be appended under `## PROPOSED` using the structured fields below.

## YYYY-MM-DD — <short title>
- Type: Guardrail | Pattern | Checklist | Prompt | Template | Decision
- Summary: <1–2 sentences>
- Suggested Playbook File: <path in the upstream Playbook repo, if known>
- Rationale: <why this matters / what it prevents>
- Evidence: <file paths in this repo that triggered the note>
- Status: Proposed | Promoted | Upstreamed | Rejected

## PROPOSED

## 2026-03-18 — Mutation paths should emit affected entity IDs for derived recomputes
- Type: Pattern
- Summary: When persisting source-of-truth writes that affect derived history stats, mutation handlers should explicitly derive the affected canonical entity IDs from the write boundary and then call one centralized recompute entry point for only those IDs.
- Suggested Playbook File: docs/PATTERNS/domain-write-invalidation.md
- Rationale: Prevents partial or UI-coupled invalidation logic from letting derived tables drift away from the underlying completed-session records.
- Evidence: src/lib/exercise-stats.ts, src/app/session/[id]/actions.ts, src/app/actions/history.ts
- Status: Proposed

## 2026-03-18 — Derived history data should share one canonical aggregation boundary
- Type: Pattern
- Summary: When multiple product surfaces consume fitness performance history, raw set/session aggregation should live in one shared module keyed by canonical entity IDs, while each surface keeps only presentation formatting locally.
- Suggested Playbook File: docs/PATTERNS/domain-read-models.md
- Rationale: Prevents the common drift where stats recompute, browser summaries, and detail pages each re-interpret the same workout history with slightly different semantics and query costs.
- Evidence: src/lib/exercise-stats.ts, src/lib/exercises-browser.ts, src/app/session/[id]/queries.ts, src/lib/exercise-history-aggregation.ts
- Status: Proposed

## 2026-03-18 — Create companion Playbook notes as soon as governance is introduced
- Type: Guardrail
- Summary: Once `docs/PROJECT_GOVERNANCE.md` establishes Playbook governance in a repo, `docs/PLAYBOOK_NOTES.md` should be created in the same integration change instead of being deferred.
- Suggested Playbook File: docs/WORKFLOWS/upstreaming-playbook-notes.md
- Rationale: Prevents a half-integrated state where runtime commands execute successfully but `verify` fails on a missing required governance companion document.
- Evidence: docs/PROJECT_GOVERNANCE.md, docs/PLAYBOOK_NOTES.md
- Status: Proposed

## 2026-03-18 — Treat verify failures after runtime success as governance-compliance work
- Type: Pattern
- Summary: When `ai-context`, `ai-contract`, `context`, and `index` pass but `verify` fails, the next work item is usually a deterministic governance or documentation requirement rather than runtime plumbing.
- Suggested Playbook File: docs/PATTERNS/repo-tooling-migrations.md
- Rationale: Helps operators distinguish “runtime still broken” from “runtime fixed, enforcement now active,” which speeds up the last mile of repo-tooling migrations.
- Evidence: docs/PROJECT_GOVERNANCE.md, docs/PLAYBOOK_NOTES.md
- Status: Proposed

## 2026-03-18 — Keep package and fallback release coordinates aligned
- Type: Guardrail
- Summary: Package acquisition coordinates and official fallback release coordinates must be verified together and updated as a pair.
- Suggested Playbook File: docs/GUARDRAILS/guardrails.md
- Rationale: Prevents namespace/release-source drift where package installs and fallback downloads point at different upstreams, creating a fake “integration complete” state that only works with local overrides.
- Evidence: scripts/playbook-runtime.mjs, .github/workflows/ci.yml, README.md, docs/PROJECT_GOVERNANCE.md
- Status: Proposed
