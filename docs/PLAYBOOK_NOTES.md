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
## 2026-03-18 — Workout-entry flows should share one mobile session language
- Type: Pattern
- Summary: Set entry and Quick Add should read as one mobile-first session system by sharing hierarchy, spacing, softer grouping, and one dominant final commit action across choose → configure → commit flows.
- Suggested Playbook File: docs/PATTERNS/mobile-workout-entry-hierarchy.md
- Rationale: Prevents the overview from feeling elegant while detailed write flows still feel heavy, nested, and inconsistent, which erodes trust in workout logging.
- Evidence: src/app/session/[id]/QuickAddExerciseSheet.tsx, src/components/SessionExerciseFocus.tsx, src/components/SessionTimers.tsx, src/components/ui/BottomSheet.tsx, src/components/ui/measurements/ModifyMeasurements.tsx
- Status: Proposed


## 2026-03-18 — Canonical day loaders must resolve legacy planned exercise ids before invalidating a day
- Type: Guardrail
- Summary: Shared runnable-day loaders should canonicalize planned exercise rows through every supported legacy identifier path (`exercises.id`, alias columns, and approved legacy-name mappings) before deciding a saved workout is invalid.
- Suggested Playbook File: docs/GUARDRAILS/data-normalization-boundaries.md
- Rationale: Prevents Today, Day View, and Start Workout from disagreeing with Edit Day when older routine rows still point at legacy or aliased exercise identifiers that are recoverable to a real canonical exercise.
- Evidence: src/lib/routine-day-loader.ts, src/app/today/page.tsx, src/lib/runnable-day.ts, src/lib/routine-day-loader.test.ts
- Status: Proposed

## 2026-03-18 — Same day state must share one canonical loader
- Type: Guardrail
- Summary: If Today, View Day, Edit Day, or any routine-day surface represent the same routine day, they should all consume one canonical loader/normalization boundary instead of adding route-local shaping for exercises, runnable filtering, or rest/empty handling.
- Suggested Playbook File: docs/GUARDRAILS/data-normalization-boundaries.md
- Rationale: Prevents a single custom route from becoming the only screen that breaks on sentinel exercises, missing canonical exercise rows, or empty/non-rest edge cases while adjacent day screens still work.
- Evidence: src/lib/routine-day-loader.ts, src/app/today/page.tsx, src/app/routines/[id]/days/[dayId]/page.tsx
- Status: Proposed

## 2026-03-18 — UI prop contracts should match nullable domain truth
- Type: Guardrail
- Summary: When a domain field is legitimately nullable, shared UI list/item props should accept that nullability and let render logic decide whether to hide or fallback the display instead of coercing fake defaults upstream.
- Suggested Playbook File: docs/GUARDRAILS/data-normalization-boundaries.md
- Rationale: Prevents production build failures and silent data distortion caused by narrowing UI prop types more than the underlying normalized domain model supports.
- Evidence: src/lib/routine-day-loader.ts, src/app/routines/[id]/days/[dayId]/RoutineDayExerciseList.tsx, src/app/routines/[id]/days/[dayId]/page.tsx
- Status: Proposed

## 2026-03-18 — Reuse one list interaction pattern for the same entity across screens
- Type: Pattern
- Summary: When the same entity appears in browse, detail, and edit flows, the app should keep one primary row-tap access pattern and move screen-specific actions into secondary trailing controls instead of inventing route-local buttons.
- Suggested Playbook File: docs/PATTERNS/list-interaction-consistency.md
- Rationale: Prevents adjacent screens from feeling unrelated, reduces relearning cost, and keeps exercise-info discovery predictable even when edit affordances differ.
- Evidence: src/components/ExerciseCard.tsx, src/app/today/TodayExerciseRows.tsx, src/app/routines/[id]/days/[dayId]/RoutineDayExerciseList.tsx, src/app/routines/[id]/edit/day/[dayId]/page.tsx, src/app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx
- Status: Proposed

## 2026-03-18 — Runnable-day UI must match session-write invariants
- Type: Guardrail
- Summary: A day may offer workout-start actions only when the same normalized canonical exercise set is valid for session materialization; rest days, empty days, and invalid placeholder/sentinel days must render as non-runnable states.
- Suggested Playbook File: docs/GUARDRAILS/data-normalization-boundaries.md
- Rationale: Prevents the trust-breaking failure mode where the Today screen appears startable but the write boundary still rejects sentinel or placeholder exercises during `session_exercises` inserts.
- Evidence: src/lib/runnable-day.ts, src/app/today/page.tsx, src/app/today/TodayDayPicker.tsx
- Status: Proposed

## 2026-03-18 — Parent editors should stop at parent metadata boundaries
- Type: Pattern
- Summary: When a flow has both parent-level and child-level editors, the parent screen should own only parent metadata and high-level summaries, while child workflow controls stay inside the dedicated child editor.
- Suggested Playbook File: docs/PATTERNS/editor-boundaries.md
- Rationale: Prevents one screen from trying to manage both the parent record and nested child composition, which creates redundant controls, heavier mobile layouts, and weaker information architecture.
- Evidence: src/app/routines/[id]/edit/page.tsx, src/app/routines/[id]/edit/day/[dayId]/page.tsx, src/components/ExercisePicker.tsx, src/components/RoutineSwitcherBar.tsx
- Status: Proposed

## 2026-03-18 — Browser entry should coach install but never block auth
- Type: Pattern
- Summary: Browser auth entry points for install-first mobile products should recommend the installed app shell, but must keep login, account creation, email confirmation, and password recovery fully usable in-browser.
- Suggested Playbook File: docs/PATTERNS/mobile-install-entry.md
- Rationale: Prevents teams from overcorrecting into browser lockouts that break deep links, recovery flows, and first-run account access while still steering users toward the intended app shell.
- Evidence: src/app/login/page.tsx, src/app/login/LoginScreen.tsx, src/components/auth/InstallGuidance.tsx, src/app/forgot-password/ForgotPasswordFormClient.tsx
## 2026-03-18 — Mobile history cards should prefer hierarchy over inline completeness
- Type: Pattern
- Summary: On narrow mobile surfaces, history cards should follow a consistent order of title, context, compact metrics, then optional detail so the most important workout information survives even when width is constrained.
- Suggested Playbook File: docs/PATTERNS/mobile-card-hierarchy.md
- Rationale: Prevents scan-heavy audit surfaces from collapsing into clipped prose rows where menus, dates, and performance signals compete for the same single-line space.
- Evidence: src/app/history/HistorySessionsClient.tsx
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

## 2026-03-18 — Mobile secondary history actions belong in sheets
- Type: Pattern
- Summary: On mobile history surfaces, secondary per-card actions should open in a bottom sheet, and density modes should remove whole information tiers rather than shrinking the same card into a faux-compact variant.
- Suggested Playbook File: docs/PATTERNS/mobile-action-sheets.md
- Rationale: Prevents fragile anchored menus and avoids “compact” toggles that preserve almost all content, which adds UI complexity without creating a meaningful scan-speed difference.
- Evidence: src/app/history/HistorySessionsClient.tsx, src/app/history/exercises/ExerciseBrowserClient.tsx
- Status: Proposed


## 2026-03-18 — Parent routine editors should use compact child rows, not embedded child workflows
- Type: Pattern
- Summary: Parent editors should keep routine metadata as the main content and represent child days as compact navigation rows with only status/count context; the full child edit surface belongs in the child editor.
- Suggested Playbook File: docs/PATTERNS/editor-boundaries.md
- Rationale: Prevents parent edit screens from becoming bloated with embedded child cards, inline previews, and duplicated workflow controls that weaken hierarchy and mobile scanability.
- Evidence: src/app/routines/[id]/edit/page.tsx, src/app/routines/[id]/edit/EditRoutineManageDaysList.tsx, src/app/routines/[id]/edit/day/[dayId]/page.tsx
- Status: Proposed

## 2026-03-18 — Active workout overview rows should keep one primary line of intent
- Type: Pattern
- Summary: Active workout overview lists should use a strong session shell plus simple exercise rows where the title leads, the goal stays to one concise line, and status/count metadata remains secondary until the set-entry screen opens.
- Suggested Playbook File: docs/PATTERNS/mobile-card-hierarchy.md
- Rationale: Prevents session-overview screens from feeling dense and control-heavy when the user's main job is choosing the next exercise and entering sets quickly.
- Evidence: src/components/SessionHeaderControls.tsx, src/components/SessionPageClient.tsx, src/components/SessionExerciseFocus.tsx, src/components/ExerciseCard.tsx

## 2026-03-18 — Workout-entry mobile sheets and forms should share one hierarchy
- Type: Pattern
- Summary: Related mobile workout-entry flows should use the same interaction language—search/choose/configure/save—with shared sheet headers, section framing, and one dominant final action instead of stacked nested panels.
- Suggested Playbook File: docs/PATTERNS/mobile-workout-entry-hierarchy.md
- Rationale: Prevents Quick Add, set entry, and adjacent logging flows from looking like separate subsystems, which increases hesitation and makes write actions feel less trustworthy.
- Evidence: src/app/session/[id]/QuickAddExerciseSheet.tsx, src/components/SessionExerciseFocus.tsx, src/components/SessionTimers.tsx, src/components/ui/BottomSheet.tsx, src/components/ui/measurements/ModifyMeasurements.tsx
- Status: Proposed

## 2026-03-18 — Workout overview should optimize for scan speed before control density
- Type: Pattern
- Summary: Active workout overview screens should keep the header light, make each exercise row a single tap target with one strong title line plus secondary goal text, and reserve Save/Discard for a sticky bottom action zone.
- Suggested Playbook File: docs/PATTERNS/mobile-card-hierarchy.md
- Rationale: Prevents crowded headers, layered cards, and split tap targets from slowing the core scan → tap → log loop during an active workout.
- Evidence: src/components/SessionHeaderControls.tsx, src/components/SessionPageClient.tsx, src/components/SessionExerciseFocus.tsx, src/components/ExerciseCard.tsx
- Status: Proposed

## 2026-03-18 — Edit Day finishing passes should reuse shared mobile list language
- Type: Pattern
- Summary: When a child editor is already structurally correct, final polish should bias toward shared mobile header, list-row, and configure-panel language instead of introducing new bespoke controls or heavier framing.
- Suggested Playbook File: docs/PATTERNS/list-interaction-consistency.md
- Rationale: Prevents last-mile refinement work from reopening solved architecture and keeps adjacent workout-management surfaces feeling like one system.
- Evidence: src/app/routines/[id]/edit/day/[dayId]/page.tsx, src/app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx, src/components/ExerciseCard.tsx
- Status: Proposed

