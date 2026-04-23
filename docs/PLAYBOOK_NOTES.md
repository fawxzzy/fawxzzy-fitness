
## 2026-03-21 — History detail screens should rebuild only at the shared shell boundary
- Type: Pattern
- Summary: History list surfaces can stay lightly aligned when they already use the normalized family shell, but deep log-detail screens should rebuild onto shared history header, section, metadata, and footer primitives when route-local cards start owning that structure themselves.
- Suggested Playbook File: docs/PATTERNS/workout-detail-shell.md
- Rationale: Prevents working history routes from being over-rewritten while still converging the highest-drift detail surface onto one canonical hierarchy, summary language, and bottom-action ownership model.
- Evidence: src/components/history/HistoryShared.tsx, src/app/history/HistorySessionsClient.tsx, src/app/history/[sessionId]/LogAuditClient.tsx
- Status: Proposed

## 2026-03-21 — Adjacent parent/child editors should share one shell while keeping selector ownership local
- Type: Pattern
- Summary: Edit Routine and Edit Day should reuse the same header, section, and footer shell language, while selector controls stay only on the screen that owns that switch and parent editors stop at metadata boundaries.
- Suggested Playbook File: docs/PATTERNS/editor-boundaries.md
- Rationale: Prevents sibling edit flows from drifting into separate visual dialects or leaking child-workflow controls upward, which weakens mobile scanability and makes action ownership less predictable.
- Evidence: src/components/routines/RoutineEditorShared.tsx, src/app/routines/[id]/edit/page.tsx, src/app/routines/[id]/edit/day/[dayId]/page.tsx, src/app/routines/[id]/edit/day/[dayId]/EditDayHeaderSwitcher.tsx
- Status: Proposed

## 2026-03-19 — Session shells should own sticky footers locally when shared publication is unstable

- Summary: When a shared sticky-footer abstraction blocks a core session flow, restore screen-local footer ownership first and re-abstract later after the host model is proven stable.
- Suggested Playbook File: docs/GUARDRAILS/shared-sticky-footer-ownership.md
- Rationale: Session overview and focused set-entry are high-frequency flows where technically rendered but unstable footer publication still leaves save/discard actions functionally unreliable.
- Evidence: src/components/SessionPageClient.tsx, src/components/SessionExerciseFocus.tsx, src/components/SessionTimers.tsx, src/components/SessionHeaderControls.tsx, src/components/session/SessionStickyFooter.tsx

## 2026-03-19 — Selection summaries must sit above the chooser they contextualize
- Type: Pattern
- Summary: In exercise-addition flows, row selection should be followed immediately by a selected-summary block above the chooser, with configuration after that summary and commit last.
- Rationale: Prevents upside-down mobile flows where oversized chooser lists push the current selection and its secondary actions below the fold, making the interaction feel heavier and less trustworthy.
- Evidence: src/app/session/[id]/QuickAddExerciseSheet.tsx, src/components/ExercisePicker.tsx
- Status: Applied

## 2026-03-19 — Goal should be the only user-facing workout-plan label
- Type: Pattern
- Summary: Workout planning and logging UI should reserve Goal as the user-facing term, while shared measurement helpers render the exact same goal summary structure and open-state copy everywhere.
- Suggested Playbook File: docs/PATTERNS/workout-detail-shell.md
- Rationale: Prevents target-vs-goal drift that makes adjacent workout screens feel like different products despite sharing the same data model.
- Evidence: src/lib/measurement-display.ts, src/lib/exercise-goal-format.ts, src/lib/session-targets.ts, src/components/ExercisePicker.tsx, src/app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx, src/components/SessionExerciseFocus.tsx
- Status: Proposed

## 2026-03-19 — Exercise detail workspaces should have one identity block
- Type: Pattern
- Summary: A detail logging workspace should present one clear identity block, then flow through target, entry, effort/review, and commit sections without repeating route title chrome inside the body.
- Suggested Playbook File: docs/PATTERNS/workout-detail-shell.md
- Rationale: Prevents focused exercise-entry screens from feeling both heavier and more confusing when the same workspace title appears multiple times while secondary actions compete with the main logging path.
- Evidence: src/components/SessionExerciseFocus.tsx, src/components/SessionTimers.tsx, src/components/ui/workout-entry/EntrySection.tsx, src/components/ui/measurements/MeasurementConfigurator.tsx
- Status: Proposed

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
## 2026-04-23 - Phone QA loops should publish LAN and tunnel URLs from one local status file
- Type: Guardrail
- Summary: Mobile local verification should bind Next to all interfaces, publish the current LAN/tunnel URLs in the QA loop output, and write a runtime status file instead of relying on memory or a localhost-only server.
- Suggested Playbook File: docs/GUARDRAILS/fitness-mobile-qa-loop.md
- Rationale: Prevents phone checks from failing because the dev server only listens on localhost, the active URL is unclear, or the tunnel state is disconnected from the QA user reset flow.
- Rule: Use `npm run qa:loop:mobile` for phone-ready local checks and keep tunnel command/URL config local-only.
- Failure Mode: Desktop checks pass, but phone testing cannot reach the app or auth callback URLs point at the wrong host.
- Evidence: scripts/dev.mjs, scripts/qa/fitness-qa-config.mjs, scripts/qa/fitness-mobile-loop.mjs, scripts/qa/fitness-tunnel.mjs, docs/runbooks/FITNESS-QA-LOCAL-LOOP.md
- Status: Proposed

## 2026-04-23 - Fitness QA auth uses one resettable Supabase account
- Type: Guardrail
- Summary: Auth-aware local verification must reuse the permanent Fitness QA Supabase user from local env and reset that user's app data to a deterministic baseline before browser checks.
- Suggested Playbook File: docs/GUARDRAILS/fitness-auth-qa-account.md
- Rationale: Prevents Codex-created throwaway Supabase users, stale local auth state, and route checks that depend on whatever data happened to exist.
- Rule: Never create random Fitness signup users for QA; use `npm run qa:user:ensure`, `npm run qa:user:reset`, `npm run qa:session`, and `npm run qa:local`.
- Failure Mode: Local auth appears fixed because one random browser session works, while server routes verify against a different Supabase project or the test account data is nondeterministic.
- Evidence: scripts/dev.mjs, scripts/qa/fitness-qa-config.mjs, scripts/qa/fitness-qa-user.mjs, scripts/qa/fitness-local-feedback.mjs, scripts/qa/cdp-edge.mjs
- Status: Proposed

## 2026-04-23 - History UI recovery follows the app-wide contract first
- Type: Guardrail
- Summary: History UI recovery must follow the app-wide design contract first, then use recent commit and artifact archaeology to restore missing specifics.
- Suggested Playbook File: docs/GUARDRAILS/history-ui-recovery.md
- Rationale: Prevents polishing history in isolation until it drifts from Today, active-session, routines, exercise-detail, and shared card-shell behavior even when individual fixes look correct.
- Rule: History UI recovery must follow the app-wide design contract first, then use recent commit/artifact archaeology to restore missing specifics.
- Failure Mode: The team keeps polishing history in isolation, so it drifts from the rest of the app even when individual fixes look correct.
- Evidence: src/app/history/page.tsx, src/app/history/exercises/page.tsx, src/app/history/[sessionId]/LogAuditClient.tsx, src/components/history/HistorySessionCard.tsx, src/components/history/HistoryExerciseCard.tsx, src/components/history/HistoryDetailExerciseCard.tsx, scripts/verify-history-family-ui.mjs
- Status: Proposed

## 2026-04-22 - Remembered-account login flows should derive submit readiness from the active auth identity
- Type: Guardrail
- Summary: When login hides the email field for a remembered account, submit readiness, helper copy, and CTA labels must still derive from the remembered identity plus the current password state instead of treating the hidden email input as empty or treating every remembered-account password step as exceptional reauth.
- Suggested Playbook File: docs/GUARDRAILS/auth-remembered-login.md
- Rationale: Prevents production-only remembered-account regressions where the password step stays disabled, the UI renders duplicate account identity, or normal login copy flips into session-expired language even though auth itself is healthy.
- Evidence: src/app/login/LoginScreen.tsx, src/app/login/loginScreenState.ts, src/app/login/loginScreenState.test.ts, src/app/login/LoginScreen.contract.test.ts, src/components/auth/authCopy.ts
- Status: Proposed

## 2026-04-22 - Remembered login state is UX memory only and cannot stand in for auth
- Type: Guardrail
- Summary: Local remembered-login state may remember account identity for the next login screen, but it must stay password-required until an authenticated surface confirms a real server session.
- Suggested Playbook File: docs/GUARDRAILS/auth-remembered-login.md
- Rationale: Prevents remembered-account shortcuts from navigating into protected routes without a live session, which creates login loops and a fake `ready` state after failed attempts.
- Rule: local remembered-login state is UX memory only, never proof of authentication.
- Failure Mode: a remembered-account shortcut navigates to a protected route without creating or verifying a real server session, causing login loops and fake `ready` state.
- Evidence: src/app/login/LoginScreen.tsx, src/app/entry/page.tsx, src/lib/remembered-login.ts, src/components/auth/AuthenticatedRememberedLoginSync.tsx
- Status: Proposed

## 2026-04-22 - Fitness deploy guards should anchor on immutable Vercel identity
- Type: Guardrail
- Summary: Fitness production deploy checks should require the canonical Vercel team and project IDs first, then treat the current team slug and project name as secondary rename-drift validation.
- Suggested Playbook File: docs/GUARDRAILS/deploy-identity.md
- Rationale: Prevents false wrong-owner deploy blocks when Vercel renames change visible slugs or deployment URLs while the underlying linked project is still correct.
- Evidence: .vercel/project.json, docs/PLAYBOOK_NOTES.md
- Status: Proposed

## 2026-04-22 - History route families should share one scaffold and QA preview seam
- Type: Pattern
- Summary: History sessions, exercises, and detail routes should publish one shared route-family scaffold for header ownership, surface tokens, and floating-header behavior, while localhost preview QA flows through one server-gated fixture seam instead of route-local data hacks.
- Suggested Playbook File: docs/PATTERNS/workout-detail-shell.md
- Rationale: Prevents the history family from drifting into mixed shell ownership and mismatched mobile header behavior, and keeps preview verification deterministic when live data is unavailable.
- Evidence: src/app/dev/history-preview/disable/route.ts, src/app/dev/history-preview/enable/route.ts, src/app/dev/history-preview/page.tsx, src/app/history/[sessionId]/page.tsx, src/app/history/exercises/ExerciseBrowserClient.tsx, src/app/history/exercises/page.tsx, src/app/history/page.tsx, src/components/history/HistoryRouteScaffold.tsx, src/components/history/HistoryShared.tsx, src/components/ui/app/designSystem.ts, src/features/mobile-regression/contracts.ts, src/features/mobile-regression/fixtures.ts, src/lib/history-preview-fixtures.ts, src/lib/history-preview.server.ts, src/lib/history-preview.test.ts, src/lib/history-sessions-page-loader.test.ts, src/lib/history-sessions-page-loader.ts, tests/mobile-regression/contracts.test.ts, tests/mobile-regression/fixtures.test.ts, package.json
- Status: Proposed

## 2026-04-17 - Server-only auth confirm routes cannot consume fragment recovery payloads
- Type: Guardrail
- Summary: Password recovery links that deliver auth state in the browser fragment must terminate in a client-capable handoff step before any server-only confirm or reset flow expects a session.
- Suggested Playbook File: docs/GUARDRAILS/auth-fragment-handoff.md
- Rationale: Prevents the false-positive failure mode where reset email delivery succeeds but confirm always fails because the server looks for `token_hash` or `code` in query params that never contain the fragment payload.
- Evidence: src/app/auth/confirm/route.ts, src/app/auth/actions.ts, src/app/reset-password/page.tsx, src/app/reset-password/RecoverySessionBridge.tsx, src/app/reset-password/actions.ts
- Status: Proposed

## 2026-04-18 - Add Exercise picker viewport caps should tune the tray, not the row
- Type: Pattern
- Summary: When the Add Exercise mobile picker shows too much of the next card, tighten the tray viewport cap first and keep the shared compact row density, filters, library header, and bottom dock unchanged.
- Suggested Playbook File: docs/PATTERNS/list-interaction-consistency.md
- Rationale: Preserves the canonical dense exercise-row language while solving the remaining viewport peek issue with one scoped height token instead of reopening card sizing or dock spacing work.
- Evidence: src/components/ExercisePicker.tsx, src/components/ui/PickerListViewport.tsx, src/app/globals.css
- Status: Proposed
## 2026-04-16 â€” Same-app migrations should preserve legacy entity IDs and gate imports on blank-account parity
- Type: Pattern
- Summary: Same-app legacy migration bridges should export one canonical user snapshot, preserve legacy UUIDs for user-scoped rows during import, and block default imports when the destination account already contains unrelated user-owned data.
- Suggested Playbook File: docs/PATTERNS/same-app-account-migration.md
- Rationale: Prevents "successful" blank-account migrations from duplicating rows, losing relationship edges, or silently mixing newly-created data with imported history before parity can be trusted.
- Rule: Backend replacement is an identity-and-data migration, not just an infra swap.
- Pattern: Clean preview rehearsal -> parity -> prod cutover -> grace-window bridge -> explicit bridge removal.
- Failure Mode: Dirty preview proof and undocumented env/auth assumptions create false confidence before the switch.
- Evidence: src/lib/migration/fitness-legacy-contract.ts, src/lib/migration/fitness-legacy-bridge.ts, src/app/api/migration/export/route.ts, src/app/api/migration/import/route.ts, src/app/api/migration/parity/route.ts, src/app/settings/page.tsx, src/components/settings/LegacyMigrationSettings.tsx, docs/ops/fitness-legacy-migration-plan.md
- Status: Proposed
## 2026-03-21 — Settings screens should compose DetailHeader and DetailSection
- Type: Pattern
- Summary: Section-heavy settings surfaces should use the shared detail header, metadata row, and section primitives instead of route-local summary cards or custom grouping wrappers.
- Suggested Playbook File: docs/PATTERNS/workout-detail-shell.md
- Rationale: Prevents preferences screens from drifting away from the app's canonical mobile detail rhythm, keeps account metadata in a consistent header position, and preserves footer/action ownership boundaries.
- Evidence: src/app/settings/page.tsx, src/components/settings/GlassEffectsSettings.tsx, src/components/DetailSurface.tsx
- Status: Proposed

## 2026-03-19 — Sticky footer hosts should own a single local slot
- Type: Guardrail
- Summary: Shared sticky footer systems should let the scroll-screen host own one local footer slot, track publisher ownership in refs, and rerender only when the active owner or rendered footer content truly changes.
- Suggested Playbook File: docs/GUARDRAILS/shared-sticky-footer-ownership.md
- Rationale: Prevents render-coupled publish state from feeding back into publishers during overview ↔ detail footer swaps, which can reintroduce maximum update depth loops and unstable sticky action bars.
- Evidence: src/components/layout/bottom-actions.tsx, src/components/layout/ScrollScreenWithBottomActions.tsx, src/components/layout/PublishBottomActions.tsx, src/components/SessionTimers.tsx, src/components/SessionPageClient.tsx
- Status: Proposed

## 2026-03-19 — Shared sticky-footer registries must isolate publishers from slot updates
- Type: Guardrail
- Summary: Shared sticky footer primitives should keep ownership and published-node bookkeeping in refs or an external store, and only notify slot subscribers when the actually rendered footer changes.
- Suggested Playbook File: docs/GUARDRAILS/shared-sticky-footer-ownership.md
- Rationale: Prevents layout-effect publish/cleanup churn from rerendering the same publishers, which can cascade into infinite update loops during screen transitions across every consumer of the shared footer path.
- Evidence: src/components/layout/bottom-actions.tsx, src/components/layout/PublishBottomActions.tsx, src/components/layout/ScrollScreenWithBottomActions.tsx, src/components/SessionPageClient.tsx, src/app/today/page.tsx, src/app/routines/[id]/edit/day/[dayId]/page.tsx
- Status: Proposed

## 2026-03-19 — Steady-state flows should log summaries, not entities
- Type: Guardrail
- Summary: Expected normalization, sentinel filtering, and fallback behavior in steady-state app flows should stay silent by default or emit only one summary-level debug line per loader run behind an explicit debug flag.
- Suggested Playbook File: docs/GUARDRAILS/observability-noise.md
- Rationale: Prevents temporary diagnostics from turning into persistent background noise that hides real warnings, errors, and regressions during normal navigation.
- Evidence: src/lib/runnable-day.ts, src/lib/exercises.ts, src/lib/exercise-stats.ts, src/lib/observability.ts
- Status: Proposed

## 2026-03-19 — Selection rows should stay clean; secondary info belongs in selected state
- Type: Pattern
- Summary: In chooser-style exercise flows, tapping the row should remain the primary action while details like Exercise Info live in the selected summary area after the user commits attention to one option.
- Suggested Playbook File: docs/PATTERNS/list-interaction-consistency.md
- Rationale: Prevents Quick Add, Add Exercise, and day-editor choosers from regressing into cramped multi-action rows that obscure the main selection task.
- Evidence: src/components/ExercisePicker.tsx, src/app/session/[id]/QuickAddExerciseSheet.tsx, src/app/routines/[id]/edit/day/[dayId]/page.tsx
- Status: Proposed

## 2026-03-19 — Live editor writes should refresh in place after success
- Type: Guardrail
- Summary: Add/update/delete/reorder actions inside editor workspaces should revalidate server data and trigger an in-place client refresh so the current screen reflects successful writes immediately.
- Suggested Playbook File: docs/GUARDRAILS/editor-write-feedback.md
- Rationale: Prevents stale editor screens that make successful writes feel unreliable because users must leave and re-enter to confirm that changes landed.
- Evidence: src/app/routines/[id]/edit/day/actions.ts, src/app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx, src/app/routines/[id]/edit/day/[dayId]/RoutineDayAddExerciseForm.tsx
- Status: Proposed

## 2026-03-19 — Exercise info in choosers should come from selected state, not every row
- Type: Pattern
- Summary: When a chooser’s primary job is selecting one item, per-row chrome should stay minimal and secondary detail actions like Exercise Info should move into the selected-state summary or another post-selection affordance.
- Suggested Playbook File: docs/PATTERNS/list-interaction-consistency.md
- Rationale: Prevents dense chooser rows from feeling cramped while still preserving access to secondary details once the user has committed attention to one option.
- Evidence: src/components/ExercisePicker.tsx, src/components/ExerciseCard.tsx, src/components/ExerciseInfo.tsx
- Status: Proposed

## 2026-03-19 — Chooser rows should reuse canonical entity-card language
- Type: Pattern
- Summary: Exercise choosers should use the same shared entity-row/card language as browse and overview lists, with row tap as the dominant interaction and only task-essential trailing state.
- Suggested Playbook File: docs/PATTERNS/list-interaction-consistency.md
- Rationale: Prevents choose flows from becoming cramped and visually divergent when extra per-row controls crowd the primary select action.
- Evidence: src/components/ExercisePicker.tsx, src/components/ExerciseCard.tsx, src/components/SessionAddExerciseForm.tsx
- Status: Proposed

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

## 2026-03-18 — Auth entry must stay usable when install is external
- Type: Pattern
- Summary: Browser auth entry points should keep login, account creation, email confirmation, and password recovery fully usable in-browser when install acquisition is handled outside the app.
- Suggested Playbook File: docs/PATTERNS/mobile-install-entry.md
- Rationale: Prevents in-app install coaching from becoming stale route state after acquisition moves to an external channel.
- Evidence: src/app/page.tsx, src/app/login/page.tsx, src/app/login/LoginScreen.tsx, src/app/forgot-password/ForgotPasswordFormClient.tsx, src/app/reset-password/page.tsx
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


## 2026-03-19 — Planned-workout editor rows should extend the canonical list row
- Type: Pattern
- Summary: Once planned workout rows have a canonical list-card language across Today, Day View, session overviews, and choosers, editor variants should keep the same row shell and only layer compact trailing edit/reorder/destructive controls onto it.
- Suggested Playbook File: docs/PATTERNS/list-interaction-consistency.md
- Rationale: Prevents edit screens from regressing into heavier tooling-style cards after the shared list system is already established, while preserving row-tap learning and action predictability.
- Evidence: src/app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx, src/app/routines/[id]/days/[dayId]/RoutineDayExerciseList.tsx, src/app/today/TodayExerciseRows.tsx, src/components/ExercisePicker.tsx, src/components/ExerciseCard.tsx
- Status: Proposed


## 2026-03-19 — Workout detail flows should share one shell and action-bar system
- Type: Pattern
- Summary: Current session, set entry, edit day, and related workout pickers should reuse one detail-shell pattern with top-right back placement, one surface/card language, and canonical bottom action variants (single, split, utility cluster).
- Suggested Playbook File: docs/PATTERNS/workout-detail-shell.md
- Rationale: Prevents visual drift across adjacent workout-management flows and avoids repeated one-off fixes for spacing, safe-area handling, and sticky actions.
- Evidence: src/components/layout/CanonicalBottomActions.tsx, src/components/SessionHeaderControls.tsx, src/components/SessionPageClient.tsx, src/components/SessionTimers.tsx, src/app/routines/[id]/edit/day/[dayId]/page.tsx, src/app/session/[id]/QuickAddExerciseSheet.tsx
- Status: Proposed

## 2026-03-19 — Detail forms should use one workspace rhythm
- Type: Pattern
- Summary: Mobile detail-entry forms should follow one cohesive workspace rhythm—summary, target, configure, enter, review, commit—using light section anchoring instead of disconnected labels or stacked heavy cards.
- Suggested Playbook File: docs/PATTERNS/workout-detail-shell.md
- Rationale: Prevents technically clean detail screens from still feeling unfinished because the summary, target, form, and review areas do not read as one guided flow.
- Evidence: src/components/SessionExerciseFocus.tsx, src/components/SessionTimers.tsx, src/components/ui/measurements/ModifyMeasurements.tsx, src/components/ui/workout-entry/EntrySection.tsx
- Status: Proposed


## 2026-03-19 — Save/discard flows must preserve explicit origin context
- Type: Pattern
- Summary: When a flow can be opened with an explicit safe `returnTo` target, save/discard actions should preserve that target end-to-end and only fall back to history-stack or fixed-route behavior when no valid explicit origin exists.
- Suggested Playbook File: docs/PATTERNS/navigation-return-contract.md
- Rationale: Prevents direct-load, refresh, and cross-screen editor flows from regressing back to generic hub routes even when the originating screen was already known.
- Evidence: src/lib/navigation-return.ts, src/components/ui/NavigationReturnInput.tsx, src/app/session/[id]/page.tsx, src/components/SessionPageClient.tsx, src/app/today/TodayStartButton.tsx, src/app/today/TodayDayPicker.tsx, src/app/routines/[id]/edit/day/[dayId]/page.tsx
- Status: Proposed

## 2026-03-19 — Save and Back must share one return contract
- Type: Pattern
- Summary: When a screen offers both Back and Save, Save should resolve the same safe in-app return target as Back and only fall back to a fixed route when no valid in-app history entry exists.
- Suggested Playbook File: docs/PATTERNS/navigation-return-contract.md
- Rationale: Prevents users from losing context after editing or completing work just because Save uses a hard-coded redirect while Back respects how they arrived.
- Evidence: src/components/ui/useBackNavigation.ts, src/components/ui/useReturnNavigation.ts, src/components/ui/NavigationReturnInput.tsx, src/app/routines/[id]/edit/day/actions.ts, src/components/SessionPageClient.tsx, src/app/routines/[id]/edit/page.tsx
- Status: Proposed

## 2026-03-19 — Bottom action bars should come from canonical variants only
- Type: Pattern
- Summary: Sticky/mobile bottom actions should be composed from a small canonical set (`single`, `split`, `stackedPrimary`, `triad`) so save/cancel/edit/delete/timer groups share the same inset, radius, spacing, seam, and emphasis rules across detail screens.
- Suggested Playbook File: docs/PATTERNS/workout-detail-shell.md
- Rationale: Prevents footer drift, repeated per-screen CTA layout code, and accidental regressions in safe-area padding or button sizing.
- Save actions must honor the same return contract as Back: prefer safe in-app history return when present, and fall back only to deterministic screen routes when no safe return target exists.
- Canonical bottom action bars should keep split actions at true equal widths, stackedPrimary bars as one segmented utility row above one dominant full-width primary CTA, and triad bars with a fixed/min-width tabular-numeral center status slot instead of per-screen width overrides.
- Evidence: src/components/layout/CanonicalBottomActions.tsx, src/app/history/[sessionId]/LogAuditClient.tsx, src/app/routines/[id]/edit/day/[dayId]/page.tsx, src/app/routines/page.tsx, src/components/SessionPageClient.tsx
- Status: Proposed

## 2026-03-19 — Measurements are a shared domain language, not a local screen detail
- Type: Pattern
- Summary: Any workout surface that configures or displays reps, weight, time, distance, or calories should reuse shared configurator and summary primitives with one canonical ordering, formatting style, and empty-state rule.
- Suggested Playbook File: docs/PATTERNS/workout-detail-shell.md
- Rationale: Prevents measurement blocks from drifting between add-exercise, set entry, history, and day editors, which makes the product feel inconsistent even when data semantics are correct.
- Evidence: src/components/ui/measurements/MeasurementConfigurator.tsx, src/components/ui/measurements/MeasurementSummary.tsx, src/components/ui/measurements/ModifyMeasurements.tsx, src/components/ExercisePicker.tsx, src/components/SessionTimers.tsx, src/app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx, src/app/history/[sessionId]/LogAuditClient.tsx, src/lib/session-targets.ts
- Status: Proposed
- Focused logging screens should only keep task-critical copy and follow the rhythm `identity -> goal -> entry -> effort -> review -> commit`; avoid status boxes and explanatory filler that repeat what the UI already implies.
- When a logging surface needs multiple commit-adjacent actions, publish them through the shared bottom action system instead of local inline controls so destructive and secondary actions stay normalized with the primary save action.


## 2026-03-21 — Exercise detail surfaces should reuse canonical detail primitives
- Type: Pattern
- Summary: Exercise Info and similar detail views should compose the shared detail header, metadata row/chips, and section containers instead of owning route-local header, stats, and notes layout.
- Suggested Playbook File: docs/PATTERNS/workout-detail-shell.md
- Rationale: Prevents drill-in surfaces from drifting away from the established detail-page family, which weakens scanability and reintroduces bespoke formatting contracts for the same metadata.
- Evidence: src/components/DetailSurface.tsx, src/components/ExerciseInfoSheet.tsx, src/components/history/HistoryShared.tsx
- Status: Proposed
## 2026-04-21 - Shared mobile docks should own bottom safe area while footer geometry stays display-mode agnostic
- Type: Pattern
- Summary: Shared mobile workout shells should reserve dock height in one place and own the bottom safe-area inset on the dock container itself, while canonical action groups keep only content spacing and do not branch footer geometry by browser-vs-standalone mode.
- Suggested Playbook File: docs/PATTERNS/workout-detail-shell.md
- Rationale: Prevents iPhone footer regressions that appear random across launches because safe-area padding is split between shell and action primitives or depends on runtime display-mode state before the document dataset has synchronized.
- Evidence: src/app/globals.css, src/components/ui/app/AppShell.tsx, src/components/shared/mobile-shell/MobileScreenShell.tsx, src/components/layout/CanonicalBottomActions.tsx, src/components/ui/app/DisplayModeBootstrap.tsx
- Status: Proposed

## 2026-04-21 - Routine days should store neutral defaults and render cycle-aware labels at display time
- Type: Pattern
- Summary: Routine-day records should persist only neutral deterministic defaults for identity, while weekday-aware labels and compact split summaries are derived at render time from the active cycle context and optional bounded custom names.
- Suggested Playbook File: docs/PATTERNS/routine-day-identity.md
- Rationale: Prevents saved weekday labels from drifting when cycle settings shift, avoids duplicate labels like `Mon - Monday`, keeps editor/session/history surfaces on one naming rule, and preserves compact mobile cards by separating stored identity from user-facing presentation.
- Evidence: src/lib/routines.ts, src/lib/day-summary.ts, src/app/routines/page.tsx, src/app/routines/RoutinesPageClient.tsx, src/app/routines/[id]/days/[dayId]/page.tsx, src/app/routines/[id]/edit/day/[dayId]/EditDaySettingsAutosaveForm.tsx, src/lib/start-session.ts
- Status: Proposed

## 2026-04-21 - Adjacent mobile workout screens should share one top-and-bottom shell contract
- Type: Pattern
- Summary: Today, Routines, History, and Session should publish headers, dock height, bottom actions, and positive-status badges through one shared shell contract so spacing rhythm and semantic color meaning stay stable across sibling screens.
- Suggested Playbook File: docs/PATTERNS/workout-detail-shell.md
- Rationale: Prevents repeated footer dead-band fixes, mixed header block heights, and badge-green drift between header chips and card badges, which otherwise makes closely related workout flows feel visually misaligned even when the data and actions are correct.
- Evidence: src/components/layout/MobileScreenShell.tsx, src/components/layout/CanonicalBottomActions.tsx, src/components/ExerciseCard.tsx, src/app/history/HistorySessionsClient.tsx, src/app/history/[sessionId]/LogAuditClient.tsx, src/app/history/[sessionId]/page.tsx, src/app/history/exercises/page.tsx, src/app/history/page.tsx, src/app/routines/RoutinesPageClient.tsx, src/components/SessionHeaderControls.tsx, src/components/SessionPageClient.tsx
- Status: Proposed

## 2026-04-21 - Settings screens should publish local rows and panels through the shared token bridge
- Type: Pattern
- Summary: Settings surfaces should reuse the shared detail header and section rhythm, and any remaining local rows, expanded panels, dividers, or form copy should be exposed through narrow design-system tokens instead of route-local class literals.
- Suggested Playbook File: docs/PATTERNS/workout-detail-shell.md
- Rationale: Prevents preferences and migration screens from drifting back into one-off card chrome, label typography, and spacing rules while still allowing settings-only interaction surfaces to stay explicit and narrow.
- Evidence: src/app/settings/page.tsx, src/components/settings/AccountSettingsForm.tsx, src/components/settings/GlassEffectsSettings.tsx, src/components/settings/LegacyMigrationSettings.tsx, src/components/ui/app/designSystem.ts, src/components/ui/app/tokens.ts
- Status: Proposed

## 2026-04-21 - Detail-supporting cards should publish media, state, and metadata chrome through shared tokens
- Type: Pattern
- Summary: Detail-family support surfaces such as state cards, media callouts, metadata chips, and recent-history rows should expose their spacing, radii, borders, and copy rhythm through the shared token bridge instead of keeping route-local card literals inside each detail screen.
- Suggested Playbook File: docs/PATTERNS/workout-detail-shell.md
- Rationale: Prevents adjacent detail screens from drifting into slightly different card shells and metadata treatments even when they already share the same detail header and section hierarchy.
- Evidence: src/components/DetailSurface.tsx, src/components/ExerciseInfoSheet.tsx, src/components/routines/day-detail/DayDetailStateCard.tsx, src/components/ui/app/designSystem.ts, src/components/ui/app/tokens.ts
- Status: Proposed
## 2026-04-21 - Exercise chooser families should publish picker, filter, and goal chrome through shared tokens
- Type: Pattern
- Summary: Exercise-addition flows should keep one chooser language by exposing picker panels, filter toggles, helper copy, and goal configuration chrome through the shared token bridge instead of leaving those surfaces as route-local literals inside picker components.
- Suggested Playbook File: docs/PATTERNS/list-interaction-consistency.md
- Rationale: Prevents Quick Add, day-editor add-exercise, and adjacent chooser routes from quietly diverging in panel density, filter rhythm, and goal helper treatment even when they already share the same selection workflow.
- Evidence: src/components/ExercisePicker.tsx, src/components/ExerciseTagFilterControl.tsx, src/components/exercises/ExerciseSearchFilters.tsx, src/components/ui/app/designSystem.ts, src/components/ui/app/tokens.ts
- Status: Proposed

## 2026-04-21 - Auth and recovery surfaces should publish shell, message, and action chrome through shared tokens
- Type: Pattern
- Summary: Login, signup, forgot-password, and reset-password routes should reuse one auth shell language by publishing intro copy rhythm, card chrome, messages, links, account panels, and primary action states through the shared token bridge instead of keeping route-local auth literals in each screen.
- Suggested Playbook File: docs/PATTERNS/mobile-card-hierarchy.md
- Rationale: Prevents auth and recovery flows from quietly diverging in card density, CTA posture, and helper/message treatment even when they already share the same shell and form structure.
- Evidence: src/components/auth/AuthShell.tsx, src/app/login/LoginScreen.tsx, src/components/auth/SignupForm.tsx, src/app/forgot-password/ForgotPasswordFormClient.tsx, src/app/reset-password/page.tsx, src/app/reset-password/RecoverySessionBridge.tsx, src/components/ui/app/designSystem.ts, src/components/ui/app/tokens.ts
- Status: Proposed
