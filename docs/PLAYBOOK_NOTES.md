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

## 2026-03-18 — Browser entry should coach install but never block auth
- Type: Pattern
- Summary: Browser auth entry points for install-first mobile products should recommend the installed app shell, but must keep login, account creation, email confirmation, and password recovery fully usable in-browser.
- Suggested Playbook File: docs/PATTERNS/mobile-install-entry.md
- Rationale: Prevents teams from overcorrecting into browser lockouts that break deep links, recovery flows, and first-run account access while still steering users toward the intended app shell.
- Evidence: src/app/login/page.tsx, src/app/login/LoginScreen.tsx, src/components/auth/InstallGuidance.tsx, src/app/forgot-password/ForgotPasswordFormClient.tsx
- Status: Proposed

## 2026-03-18 — Never let migration or sentinel exercise entities leak past the normalization boundary
- Type: Guardrail
- Summary: User-facing UI should consume normalized exercise presentation data only; unresolved exercise rows must be collapsed once near the data boundary into either a canonical exercise name or an explicit unknown-exercise fallback.
- Suggested Playbook File: docs/GUARDRAILS/data-normalization-boundaries.md
- Rationale: Prevents raw UUIDs, legacy sentinel labels, and migration-only placeholders from leaking into routine/session/detail screens and making the app feel corrupted even when the underlying workout record is mostly valid.
- Evidence: src/lib/exercise-display.ts, src/lib/exercises.ts, src/app/today/page.tsx, src/app/routines/[id]/days/[dayId]/page.tsx, src/app/routines/[id]/edit/day/[dayId]/page.tsx, src/lib/exercise-info.ts
- Status: Proposed

## 2026-03-18 — Shared mobile back controls should be history-first with safe route fallbacks
- Type: Pattern
- Summary: Shared page-shell and back-button primitives should own mobile back navigation semantics by preferring prior in-app history, then falling back to a screen-defined internal route when no usable in-app history exists.
- Suggested Playbook File: docs/PATTERNS/navigation-semantics.md
- Rationale: Prevents route-hardcoded back buttons from feeling correct only for one entry path while deep links, refreshes, and external referrers bounce users out of the app.
- Evidence: src/components/ui/useBackNavigation.ts, src/components/ui/BackButton.tsx, src/components/ui/TopRightBackButton.tsx, src/app/routines/[id]/edit/day/[dayId]/page.tsx
- Status: Proposed

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
