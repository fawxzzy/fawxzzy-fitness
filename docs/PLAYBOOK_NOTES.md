
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
## 2026-05-10 - Release draft and migration runbook should precede remote mutation
- Type: Checklist
- Summary: Before any production migration apply or deploy, Fitness should prepare the local release draft, inspect the release diff, and write the exact ordered migration apply runbook so operators do not improvise around stacked branch drift.
- Suggested Playbook File: docs/CHECKLISTS/release-predeploy-runbook.md
- Rationale: The Progression V2 stack now spans enough product and ops surfaces that migration apply is no longer a safe “remember the order from chat” step.
- Rule: Release draft and diff preparation happen before migration apply or deploy.
- Rule: Pending branch-stack migrations must be applied in documented order before production deploy.
- Rule: Do not use Supabase migration repair to silence validation unless remote schema truth is known.
- Pattern: Use the local release draft to capture stack scope when dirty branch state makes the raw git diff incomplete.
- Failure Mode: A release note is treated as complete before production deploy succeeds.
- Failure Mode: Operators apply the wrong migrations because the runbook drifted from the current expected-red list.
- Evidence: runtime/fitness/release-draft.json, docs/releases/README.md, docs/releases/fitness/2026/2026-05-10-progression-v2-migration-runbook.md, scripts/release/fitness-release-note.mjs, scripts/release/fitness-release-readiness.mjs
- Status: Proposed
## 2026-05-10 - Release readiness should fail honestly before production deploy
- Type: Guardrail
- Summary: Fitness production deploy checks should combine release draft state, `npm run verify`, progression LLEL receipt coverage, linked-remote migration drift, and working-tree cleanliness into one reporting guard that blocks deploy without mutating Supabase or deployment targets.
- Suggested Playbook File: docs/GUARDRAILS/release-readiness-receipts.md
- Rationale: The Progression V2 stack now spans engine rules, UI, ledger writes, export, analytics, and history surfaces, so deploy discipline needs one explicit readiness command instead of relying on memory across release notes, screenshots, and migration receipts.
- Rule: Every production deploy must have a release ledger entry.
- Rule: Expected-red migration validation is acceptable for stacked local work but blocks production deploy until pending migrations are applied in order.
- Rule: Release readiness checks report state; they do not mutate Supabase or deploy.
- Pattern: Separate release readiness from feature implementation.
- Failure Mode: A release is treated as complete before migrations and LLEL receipts are current.
- Failure Mode: Deploy wrappers silently skip migration drift or release-draft gaps.
- Evidence: scripts/release/fitness-release-readiness.mjs, scripts/release/fitness-release-readiness.test.mjs, scripts/release/fitness-release-note.mjs, scripts/qa/progression-visual-receipt.mjs, scripts/migration/validate-supabase-chain.mjs, docs/releases/README.md, docs/ops/FITNESS-LLEL-CHECKLIST.md, README.md
- Status: Proposed
## 2026-05-10 - Progression History filters should stay URL-backed and ledger-driven
- Type: Pattern
- Summary: Progression History filters should parse URL search params into a small typed model, narrow durable `progression_events` server-side where practical, and keep the visible list and dashboard cards on the same filtered event set.
- Suggested Playbook File: docs/PATTERNS/history-ledger-surfaces.md
- Rationale: Once the ledger route has enough rows to be useful, the next risk is a noisy history surface or a React-only filter state that diverges from reloads, links, export expectations, or the shared analytics card strip.
- Rule: Progression History filters operate on durable `progression_events`, not status or readiness rows.
- Rule: Filtered dashboard cards must use the same filtered event set as the visible list unless labeled otherwise.
- Pattern: URL-backed filters make history views shareable and reload-safe.
- Failure Mode: Replay or revert controls appear while implementing read filters.
- Failure Mode: Migration receipt docs drift from current `migration:validate` output.
- Evidence: src/app/history/progression/page.tsx, src/components/history/ProgressionHistorySurface.tsx, src/lib/progression-history-filters.ts, src/lib/progression-history-page-loader.ts, src/lib/progression-history-display.ts, scripts/qa/progression-visual-receipt.mjs
- Status: Proposed
## 2026-05-10 - Release-readiness receipts must track live migration drift and durable bootstrap paths
- Type: Guardrail
- Summary: Release-readiness lanes must refresh migration receipts from the current linked-remote output and classify local verification prerequisites as either canonical bootstrap steps or local install drift, instead of carrying stale missing-version lists or no-save runtime fixes forward.
- Suggested Playbook File: docs/GUARDRAILS/release-readiness-receipts.md
- Rationale: The progression stack can be feature-complete locally while still carrying stale migration notes or machine-specific runtime workarounds, and that makes deploy-readiness claims unreliable right when the branch stack is broadest.
- Rule: Expected-red migration validation must list the current pending migration order, not stale branch history.
- Rule: Do not mutate Supabase migration history just to make a stacked branch validate.
- Rule: Verification prerequisites must be durable through package metadata or documented bootstrap, not ad-hoc no-save installs.
- Pattern: Separate deploy-readiness reconciliation from product feature lanes.
- Failure Mode: More UI ships while release or migration receipts are stale.
- Failure Mode: Generated runtime artifacts are committed to hide local bootstrap drift.
- Evidence: scripts/migration/validate-supabase-chain.mjs, scripts/qa/progression-visual-receipt.mjs, scripts/playbook-runtime.mjs, scripts/playbook-runtime.test.mjs, docs/architecture/PROGRESSION-EVENT-LEDGER.md, README.md, docs/PROJECT_GOVERNANCE.md
- Status: Proposed
## 2026-05-10 - Progression analytics should be pure transforms over ledger rows
- Type: Pattern
- Summary: Progression analytics should summarize durable `progression_events` through pure helper transforms so history UI, dashboard cards, export, and reports reuse the same tested interpretation layer.
- Suggested Playbook File: docs/PATTERNS/data-export-contracts.md
- Rationale: Once the ledger exists and export proves the table shape, the next risk is letting every future component invent its own counts, latest-event logic, and target delta interpretation.
- Rule: Progression analytics read durable `progression_events`; they do not reconstruct history from status rows.
- Rule: Unknown target shapes should produce unknown or null analytics, not invented deltas.
- Pattern: Keep analytics helpers pure so UI, export, and reports can reuse the same tested model.
- Failure Mode: Dashboard components invent their own progression interpretation.
- Failure Mode: Supabase migration history is mutated just to make an analytics lane pass.
- Evidence: src/lib/progression-event-analytics.ts, src/lib/progression-event-analytics.test.ts, src/lib/progression-events.ts, docs/architecture/PROGRESSION-EVENT-LEDGER.md
- Status: Proposed
## 2026-05-10 - Progression History should stay read-only and ledger-driven
- Type: Pattern
- Summary: Progression History should render durable `progression_events` through shared analytics and display helpers so the History area explains applied changes without inventing its own ledger interpretation or mutation semantics.
- Suggested Playbook File: docs/PATTERNS/history-ledger-surfaces.md
- Rationale: Once the ledger has write paths, export, and summary helpers, the next risk is a route-level UI rebuilding change history from status rows or quietly turning a history list into a mutation surface.
- Rule: Progression History reads `progression_events`; it does not reconstruct history from status rows.
- Rule: History UI is read-only until mutation or replay semantics are explicitly designed.
- Pattern: UI consumes analytics and display helpers instead of inventing ledger interpretation inside components.
- Failure Mode: Revert or replay buttons appear in history rows before a dedicated mutation lane exists.
- Failure Mode: Supabase migration history is mutated just to make a history UI lane pass.
- Evidence: src/app/history/progression/page.tsx, src/components/history/ProgressionHistorySurface.tsx, src/lib/progression-history-display.ts, src/lib/progression-event-analytics.ts, docs/architecture/PROGRESSION-EVENT-LEDGER.md
- Status: Proposed
## 2026-05-10 - Progression event export must read durable ledger rows directly
- Type: Pattern
- Summary: Account export should expose progression change history by reading `progression_events` as a table-first dataset instead of reverse-engineering promotions from readiness or status surfaces.
- Suggested Playbook File: docs/PATTERNS/data-export-contracts.md
- Rationale: Export is the first downstream consumer of the event ledger, so it needs to prove that durable change records are shaped and scoped well before analytics or history UI interpret them.
- Rule: Progression event export reads `progression_events`; it does not reconstruct change history from status rows.
- Rule: Export data should be table-first, not UI-first.
- Pattern: Event ledger writes create durable change records; export exposes those records without interpretation.
- Failure Mode: Export synthesizes fake progression events from ready or not-ready status rows.
- Failure Mode: Supabase migration history is mutated just to make an export lane pass.
- Evidence: src/lib/account-workout-export.ts, src/lib/account-workout-export.test.ts, docs/architecture/PROGRESSION-EVENT-LEDGER.md
- Status: Proposed
## 2026-05-10 - Stacked Supabase migrations must be classified before any remote repair
- Type: Guardrail
- Summary: When `migration:validate` shows newer local versions missing on the linked remote, classify whether they are pending stacked-branch migrations or actual remote history drift before using any repair command.
- Suggested Playbook File: docs/GUARDRAILS/supabase-migration-chain-integrity.md
- Rationale: A feature branch can be deployable in code while still carrying unapplied schema versions from earlier local lanes, and treating every missing remote version as corruption encourages unsafe history edits.
- Rule: Migration validation failures must be classified before repair.
- Rule: Do not repair Supabase migration history unless remote schema truth is known.
- Pattern: For stacked branch migrations, document the pending apply order instead of mutating remote history prematurely.
- Failure Mode: Marking a migration applied remotely just to silence validation hides real deploy state and can desynchronize schema truth from the checked-in chain.
- Evidence: scripts/migration/validate-supabase-chain.mjs, docs/ops/fitness-legacy-migration-plan.md, docs/recovery/FULL-QUARANTINE-RECOVERY-LEDGER.md, docs/architecture/PROGRESSION-EVENT-LEDGER.md, supabase/migrations/20260508090000_remove_zone_2_cardio_catalog_exercise.sql, supabase/migrations/20260509103000_profile_qa_visibility.sql, supabase/migrations/20260509113000_051_progression_events.sql
- Status: Proposed
## 2026-05-10 - Progression visual QA should emit deterministic receipts when browser capture is fragile
- Type: Checklist
- Summary: New progression surfaces should extend the existing seam and recovered-browser receipt path so Today Progression Status, Progression History, and export coverage produce one deterministic QA receipt before dashboard work expands the UI.
- Suggested Playbook File: docs/CHECKLISTS/visual-proof-receipts.md
- Rationale: The progression loop now spans readiness, status, ledger writes, export, analytics, and history UI, so relying on ad-hoc browser checks or broken launcher assumptions leaves presentation coverage unproven exactly where the product just got broader.
- Rule: Visual capture validates presentation; unit and scenario tests validate logic.
- Rule: Expected-red migration validation must list the full current pending migration order.
- Pattern: When browser capture fails, emit a deterministic QA report instead of pretending screenshots passed.
- Failure Mode: Product behavior changes just to satisfy a visual runner.
- Failure Mode: Supabase migration history is mutated inside a QA lane.
- Evidence: docs/ops/FITNESS-LLEL-CHECKLIST.md, scripts/qa/progression-visual-receipt.mjs, scripts/qa/visual-fitness-suites.mjs, scripts/qa/fitness-auth-state.mjs, src/app/dev/mobile-regression/DevMobileRegressionRoute.tsx, src/features/mobile-regression/fixtures.ts
- Status: Proposed
## 2026-05-10 - Progression dashboard cards should consume shared analytics and display models
- Type: Pattern
- Summary: Dashboard summary UI for progression should be built from prepared analytics and display-card models so History, future dashboard strips, and reports all render the same ledger interpretation without copying React-side math.
- Suggested Playbook File: docs/PATTERNS/history-ledger-surfaces.md
- Rationale: Once History has a ledger route and analytics helpers, the next risk is letting every new card strip compute its own “latest change,” “most active vector,” or “top progressed” logic in components.
- Rule: Dashboard cards consume `progression-event-analytics`; they do not interpret ledger rows inline.
- Rule: Progression dashboard UI is read-only until mutation semantics are explicitly designed.
- Pattern: Promote repeated summary UI into reusable card-model helpers before adding more dashboard surfaces.
- Failure Mode: Analytics math is duplicated in React components.
- Failure Mode: Replay or revert controls appear in dashboard cards.
- Evidence: src/components/history/ProgressionDashboardCards.tsx, src/components/history/ProgressionHistorySurface.tsx, src/lib/progression-history-display.ts, src/lib/progression-event-analytics.ts
- Status: Proposed
## 2026-05-09 - Progression events record durable target changes, not readiness snapshots
- Type: Pattern
- Summary: Progression history should be written only when a durable target mutation happens, while readiness and status remain live calculations built from session evidence and normalized progression rules.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: The app now explains current eligibility in Today, but analytics, export, and future history views need a durable target-change ledger that does not spam rows for every not-ready exercise.
- Rule: Progression events are durable applied-change records, not readiness/status snapshots.
- Rule: Ready status alone does not write an event.
- Pattern: Status explains current eligibility; event ledger records target changes over time.
- Pattern: Event payloads should include before/after target snapshots plus source evidence when available.
- Failure Mode: Event recording mutates or reinterprets progression eligibility instead of observing the final applied change.
- Failure Mode: Non-ready status rows create event spam.
- Evidence: docs/architecture/PROGRESSION-EVENT-LEDGER.md, supabase/migrations/20260509113000_051_progression_events.sql, src/lib/progression-events.ts, src/app/progression-review/actions.ts, src/app/today/page.tsx, src/app/routines/[id]/edit/day/actions.ts
- Status: Proposed
## 2026-05-09 - Horizontal metric rails and progression drafts must preserve canonical touch and state contracts
- Type: Guardrail
- Summary: Shared horizontal metric-entry rails must allow side-scroll even when focus lands on the input shell, and every routine/edit-day draft path that renders progression controls must carry the full canonical progression form state instead of hand-built partial objects.
- Suggested Playbook File: docs/GUARDRAILS/horizontal-metric-rails.md
- Rationale: Horizontal input strips break on mobile when nested fields force vertical-only touch behavior, and progression editor upgrades become non-deployable when one draft surface lags behind the shared state contract.
- Rule: Horizontal measurement rows must preserve pan-x behavior through the field shell and input layers.
- Rule: Progression editor callers must reuse the canonical progression form state shape, including promotion controls.
- Failure Mode: Open session or routine cards trap horizontal gestures, and edit-day/dev fixtures compile against stale partial progression drafts.
- Evidence: src/components/ui/app/designSystem.ts, src/components/ui/measurements/MeasurementPanelV2.tsx, src/components/routines/ProgressionPlaybookEditor.tsx, src/components/SessionTimers.tsx, src/lib/edit-day-exercise-draft.ts, src/app/dev/mobile-regression/EditDayRegressionSurface.tsx, src/lib/progression-playbook-form-state.ts
- Status: Proposed
## 2026-05-09 - Production deploys need a release ledger entry
- Type: Rule
- Summary: Every production deploy should record one structured release entry with commit, diff scope, verification, migrations, flags, artifacts, and known gaps.
- Suggested Playbook File: docs/PATTERNS/release-ledger.md
- Rationale: Release facts need to survive beyond chat history, deploy logs, or scattered QA notes so the team can audit regressions and answer what changed since the last prod push.
- Rule: Every production deploy gets a ledger entry with commit, verification, artifacts, flags, and known gaps.
- Failure Mode: Relying on chat-only release memory loses durable deploy truth and makes regressions difficult to audit later.
- Evidence: docs/releases/README.md, docs/releases/RELEASE_LEDGER.jsonl, scripts/release/fitness-release-note.mjs, CHANGELOG.md
- Status: Proposed
## 2026-05-09 - Release ledger should be canonical and changelog should be secondary
- Type: Pattern
- Summary: Release ledger records detailed production truth, release notes explain that truth for operators, and the changelog stays short and user-facing.
- Suggested Playbook File: docs/PATTERNS/release-ledger.md
- Rationale: Internal release review needs more detail than public change summaries, but both should derive from the same canonical release record.
- Pattern: Release ledger records production truth; changelog summarizes user-facing changes.
- Evidence: docs/releases/README.md, docs/releases/templates/fitness-release-note.md, scripts/release/fitness-release-note.mjs
- Status: Proposed
## 2026-05-09 - Workout exports should be table-first and import-friendly
- Type: Rule
- Summary: User export should preserve fitness truth in stable tabular sheets and rows instead of mirroring screen-local UI structures.
- Suggested Playbook File: docs/PATTERNS/data-export-contracts.md
- Rationale: Export is most useful when sessions, sets, routines, and exercises can be re-imported, audited, or transformed without reverse-engineering app chrome.
- Rule: Export data should be table-first, not UI-first.
- Evidence: src/lib/account-workout-export.ts, src/app/api/account/export/route.ts, src/components/settings/DataSettingsSection.tsx
- Status: Proposed
## 2026-05-09 - QA fixture data must be explicitly filterable from human views
- Type: Guardrail
- Summary: QA and LLEL routines, sessions, and recap/history surfaces should be hideable in normal product views while remaining visible in dev and audit routes.
- Suggested Playbook File: docs/GUARDRAILS/fitness-qa-accounts.md
- Rationale: Human product review becomes unreliable when prefixed scenario data pollutes Today, Routines, History, or recap screens.
- Rule: QA fixture data must be filterable from human app views.
- Rule: QA/LLEL controls and dev fixture routes should be visible only to Zac-account or automation profiles.
- Failure Mode: QA fixtures make the product feel broken because test rows dominate user-facing lists and summaries.
- Evidence: src/lib/qa-data-visibility.ts, src/app/settings/actions.ts, src/app/history/[sessionId]/page.tsx, src/app/routines/page.tsx
- Status: Proposed
## 2026-05-09 - Progression math stays vectorized and zero-step-safe
- Type: Pattern
- Summary: Qualification decides whether a target change is earned, the vector decides what changes, and the step decides how much, with zero or invalid steps treated as no step.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: Separating qualification, vector, and step keeps progression explainable across strength, reps-only, and cardio targets without inventing fake methods or fake math.
- Pattern: Progression math is vectorized.
- Failure Mode: Zero-step progression creates fake copy or fake promotions even though no valid step exists.
- Evidence: src/lib/progression-vector.ts, src/lib/progression-step-policy.ts, src/app/dev/progression-audit/page.tsx
- Status: Proposed
## 2026-05-09 - Optional cardio weight is context, not automatic load progression
- Type: Guardrail
- Summary: Cardio entries may log optional weight context, but weight should not silently become the active progression vector unless explicitly configured later.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: Multi-metric cardio already has meaningful duration, distance, and pace-volume vectors; auto-promoting weight would make progression feel arbitrary.
- Failure Mode: Multi-metric cardio becomes accidental load progression just because optional weight was logged.
- Evidence: src/lib/progression-vector.ts, src/lib/progression-step-policy.ts, src/lib/progression-playbooks.ts
- Status: Proposed
## 2026-05-09 - Promotion qualification controls should use canonical progression config
- Type: Pattern
- Summary: Progression editor surfaces should expose simple Promotion uses and Rep target for promotion controls, while domain helpers continue to own defaults, rep-threshold math, and legacy fallback behavior.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: The product needs to separate rep guidance from qualification logic without turning add/edit flows into engine-specific configuration code that can drift from stored progression truth.
- Rule: Components consume domain helpers; they do not invent promotion fallback behavior.
- Rule: Rep range guidance does not imply reps participate in promotion.
- Pattern: User-facing controls stay simple while engine-facing config stays explicit.
- Failure Mode: Normalizing legacy progression config in the component layer can silently rewrite existing exercise overrides or drift from the stored engine rules.
- Evidence: src/components/routines/ProgressionPlaybookEditor.tsx, src/components/exercises/ExerciseChooserAddFlowForm.tsx, src/app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx, src/lib/progression-playbook-form-state.ts, src/lib/progression-promotion.ts
- Status: Proposed
## 2026-05-09 - Eligibility should consume promotion basis and rep-threshold helpers directly
- Type: Pattern
- Summary: Ready-update qualification should resolve `promotionBasis` and `repPromotionThreshold` from normalized progression config, then let those helpers decide which dimensions gate readiness instead of hardcoding top-of-range and target-load checks everywhere.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: The progression editor can now save explicit promotion controls, so the engine needs one canonical qualification path that honors weight-only, reps-only, and top-half/custom thresholds without drifting from stored config.
- Rule: Promotion basis decides which dimensions gate auto-promotion.
- Rule: Rep range guidance is not promotion proof by itself.
- Pattern: UI saves canonical progression config; eligibility consumes normalized domain helpers.
- Failure Mode: Disabled promotion dimensions must not fail readiness checks.
- Failure Mode: Optional cardio weight must not become load progression.
- Evidence: src/lib/progression-playbooks.ts, src/lib/progression-playbooks.test.ts, src/lib/progression-promotion.ts, docs/architecture/PROGRESSION-ENGINE-V2.md
- Status: Proposed
## 2026-05-09 - Progression explanation belongs in a dedicated status surface, not the ready-update tray
- Type: Pattern
- Summary: Ready-update UI should stay scoped to actionable promotions and regressions, while deeper progression explanation lives in a separate status surface built from the same normalized helper path and evidence lines.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: Users need to understand why an exercise is ready, not ready, weight-only, reps-only, or top-half qualified without flooding normal Today or Routines update trays with non-actionable rows.
- Rule: Actionable update trays show ready updates only. Explanation/status surfaces may show non-ready rows.
- Rule: Progression Status must consume the same normalized helper path as eligibility.
- Pattern: Build explanation surfaces from existing evidence instead of inventing parallel readiness math.
- Failure Mode: Progress Status noise leaks back into normal Progression Updates trays.
- Failure Mode: Display labels become a second source of progression truth instead of reflecting canonical engine state.
- Evidence: src/app/today/TodayDayPicker.tsx, src/components/progression/ProgressionReviewCard.tsx, src/components/progression/ProgressionStatusSection.tsx, src/lib/progression-review-loader.ts, src/lib/progression-status-display.ts
- Status: Proposed
## 2026-05-09 - Branch-level verification notes must cite the actual changed execution surfaces
- Type: Guardrail
- Summary: When verification compares a feature branch against `origin/main`, the notes entry needs to cite the exact changed runtime and contract files that make the branch behavior meaningful, even if the current working lane touched only a subset of them.
- Suggested Playbook File: docs/GUARDRAILS/branch-scope-verification-notes.md
- Rationale: The verify gate operates on branch diff scope, so notes that describe only the latest local edit can miss already-landed branch behavior and leave the branch permanently red.
- Rule: Branch-scope verification notes should cite the exact execution surfaces and contract files that changed relative to the verification base.
- Failure Mode: Notes that omit already-landed branch files make `verify` fail even when code, tests, and docs are internally consistent.
- Evidence: src/app/api/health/route.ts, src/components/SessionTimers.tsx, src/components/routines/ProgressionPlaybookEditor.tsx, src/components/ui/app/designSystem.ts, src/components/ui/measurements/MeasurementPanelV2.tsx, src/lib/atlas-contracts.test.ts, src/lib/atlas-contracts.ts, src/lib/progression-playbooks.test.ts, src/lib/progression-playbooks.ts, src/lib/progression-promotion.test.ts, src/lib/progression-promotion.ts
- Status: Proposed
## 2026-05-09 - Custom exercises are user-owned and must not mutate the global catalog
- Type: Guardrail
- Summary: Add Exercise may create account-owned custom exercises, but that flow must write only user-owned rows and must never silently alter or impersonate the canonical global catalog.
- Suggested Playbook File: docs/GUARDRAILS/custom-exercise-catalog-boundary.md
- Rationale: Users need quick routine-specific exercise creation without polluting shared catalog identity, progression history, or QA catalog review work.
- Rule: Custom exercises are user-owned; global catalog changes require a separate source or migration flow.
- Pattern: Add Exercise keeps custom creation inside the existing picker flow instead of forking into a route-local screen.
- Failure Mode: Creating fake catalog rows during QA or custom flows corrupts search, progression identity, and historical matching.
- Evidence: src/components/exercises/CreateCustomExerciseSection.tsx, src/components/exercises/ExerciseChooserAddFlowForm.tsx, src/app/actions/exercises.ts, src/app/routines/[id]/edit/day/[dayId]/EditDayAddExerciseScreen.tsx
- Status: Proposed
## 2026-05-09 - Custom choice flows should reuse shared confirm surfaces
- Type: Pattern
- Summary: Choice or confirmation UI inside an existing picker flow should compose the shared confirm modal and bottom action system instead of inventing a route-local screen or modal shell.
- Suggested Playbook File: docs/PATTERNS/shared-confirm-surfaces.md
- Rationale: Prevents confirmation drift, keeps bottom-dock geometry consistent, and avoids turning a lightweight picker action into a parallel app mode.
- Evidence: src/components/ui/ConfirmDestructiveModal.tsx, src/components/destructive/ConfirmedServerFormButton.tsx, src/components/SessionAddExerciseForm.tsx, src/components/exercises/CreateCustomExerciseSection.tsx
- Status: Proposed
## 2026-05-04 - Active session logging should keep repeat-last-set and PR feedback inside the same logger
- Type: Pattern
- Summary: The active session logger should surface the last completed set inline, offer a one-tap repeat action, and announce simple PRs on save before asking the user to leave the logging workspace.
- Suggested Playbook File: docs/PATTERNS/active-logging-prior-truth.md
- Rationale: Keeps repeated logging fast and inspectable inside the same screen, so prior truth stays visible while the user is still in the set-entry loop.
- Evidence: src/components/SessionTimers.tsx, src/lib/session-set-entry.ts, src/lib/session-target-hints.ts
- Status: Proposed
## 2026-05-04 - Human-facing member numbers must come from profile truth, not auth totals
- Type: Guardrail
- Summary: Public member numbers should be assigned by database-owned profile truth, while auth keeps infrastructure history for real, test, and automation accounts without using total `auth.users` as the product user count.
- Suggested Playbook File: docs/GUARDRAILS/profile-member-number-truth.md
- Rationale: Preserves recoverable auth history and QA accounts without letting automation consume public identity numbers or distort real-user reporting.
- Rule: Human-facing member numbers are assigned by database truth, not client code.
- Failure Mode: Client bootstrap or raw auth counts treat automation accounts as real members, consume numbered identity slots, or leak infrastructure counts into product analytics.
- Evidence: supabase/migrations/044_real_user_numbers.sql, src/lib/profile-core.ts
- Status: Proposed
## 2026-05-04 - Cycle progress surfaces should explain stored workout truth before adding recommendations
- Type: Pattern
- Summary: Cycle progress UI should surface deterministic workout count, consistency, PR moments, and volume mix directly from stored session and set truth before any recommendation or coaching layer is introduced.
- Suggested Playbook File: docs/PATTERNS/weekly-progress-truth-first.md
- Rationale: Keeps progress legible immediately after training without creating dashboard filler or opaque coaching that the user cannot trace back to real workouts.
- Rule: Cycle summaries must be deterministic and traceable.
- Failure Mode: Dashboard filler creates noise when metrics are not tied to recent user action.
- Evidence: src/lib/history-weekly-progress.ts, src/components/history/WeeklyProgressSurface.tsx, src/app/history/HistorySessionsClient.tsx
- Status: Proposed
## 2026-05-04 - Boot-critical UI preferences should prime before hydration without replacing canonical storage
- Type: Guardrail
- Summary: Theme, ambient theme, and display-mode shell state may ship through a tiny validated boot snapshot for first paint, but canonical preference truth must remain in the normal localStorage/profile systems.
- Suggested Playbook File: docs/GUARDRAILS/prehydration-ui-preferences.md
- Rationale: Prevents first-paint flicker caused by separate bootstraps repainting default values before the stored UI theme arrives, while avoiding auth-coupled or oversized boot state.
- Rule: Boot-critical UI preferences should have a tiny validated pre-hydration snapshot, but canonical preference state remains in normal app storage/profile systems.
- Pattern: Server-prime + prehydration-primer + idempotent client bootstrap.
- Failure Mode: Multiple bootstraps apply default and then custom values in sequence, so the app flashes the wrong theme or shell even though each bootstrap is individually correct.
- Evidence: src/app/layout.tsx, src/lib/app-boot-preferences.ts, src/lib/app-boot-primer.ts, src/components/ui/AppThemeBootstrap.tsx, src/components/ui/AppAmbientThemeBootstrap.tsx, src/components/ui/app/DisplayModeBootstrap.tsx, src/components/RouteLoading.tsx
- Status: Proposed
## 2026-05-04 - Progression playbooks should encode deterministic coaching rules as inspectable data
- Type: Pattern
- Summary: Planned exercises may opt into small structured progression playbooks, but every target change must be explainable from stored history plus the selected rule config instead of opaque recommendation logic. Routine defaults seed future exercise behavior; exercise-level settings remain the executable truth.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: Preserves user trust and makes regression testing possible because session-target changes remain deterministic, inspectable, and bounded to stored workout truth.
- Rule: Target changes must be explainable from stored history plus selected playbook config.
- Rule: Never silently cascade routine default changes into existing exercise overrides.
- Pattern: Progression method and stall policy are separate systems.
- Rule: Progression methods move goals up; stall policies recover goals down.
- Rule: Fixed-load blocks protect form by requiring review before load increases.
- Rule: Live logging records workout truth; cycle review proposes target changes from that completed truth.
- Pattern: Progression candidates are generated from completed workout history, then applied explicitly by a review flow.
- Pattern: Progression Updates turn completed workout truth into explicit candidate updates on Today before a workout starts.
- Rule: Progression Updates apply one explicit candidate to one planned exercise at a time unless the user explicitly selects a verified linked target group.
- Pattern: Progression Updates separates actionable Ready Updates from non-actionable Progress Status.
- Rule: Progress Status explains why no update exists; it must not create fake actions.
- Rule: Linked same-exercise updates require identical target/config fingerprints, selected planned rows, and server-side fingerprint verification before mutation.
- Rule: A promotion must come from one completed qualifying exposure; never pool sets from separate sessions into one fake candidate.
- Pattern: Progression history uses source tiers: routine-day exercise first, unique active-routine catalog fallback second, linked same-fingerprint grouping third, and global exercise history as context only.
- Rule: Candidate evaluation should be fingerprinted by target/config/history inputs so future caching can recompute only after root inputs change.
- Pattern: Training Focus seeds routine default progression presets; exercise-level progression remains executable truth.
- Rule: Training Focus should not silently rewrite existing exercise targets.
- Rule: Today/cycle review is the safe place to apply progression changes; live logging must not mutate routine targets.
- Failure Mode: Opaque recommendations or hidden routine-default cascades break user trust and make future session targets feel random.
- Failure Mode: Bulk or hidden target mutation makes progression feel random and unreviewable.
- Failure Mode: Catalog-level exercise matching can mutate repeated exercises across days.
- Failure Mode: Linked updates without selected-row verification can mutate repeated exercises the user did not choose.
- Failure Mode: Latest-session-only review hides an older fully qualified exposure and makes earned updates look missing.
- Failure Mode: Global exercise history can over-promote a new target when old routine targets are treated as executable truth.
- Failure Mode: Showing status rows as action rows creates fake Promote buttons.
- Failure Mode: Treating user goals as hidden automation makes progression feel random.
- Failure Mode: Treating fixed-load like double progression removes the product distinction.
- Failure Mode: Mutating routine targets during live logging makes goals feel random.
- Evidence: src/lib/progression-playbooks.ts, src/lib/progression-playbook-form-state.ts, src/lib/progression-review-target-update.ts, src/lib/session-target-hints.ts, src/components/routines/TrainingGoalSelector.tsx, src/app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx, src/app/today/page.tsx, src/app/session/[id]/queries.ts
- Status: Proposed
## 2026-05-08 - Progression review needs writable QA scenarios separate from human accounts
- Type: Checklist
- Summary: Progression Updates QA should seed real routines, sessions, session exercises, and sets under an automation account with a scoped reset path instead of force-logging edge cases in a human account.
- Suggested Playbook File: docs/CHECKLISTS/progression-scenario-fixtures.md
- Rationale: Apply/Revert, repeated-exercise matching, and history-source tiers require real persisted rows, but manual fake logging against a human routine risks derived-state drift and accidental target mutation.
- Rule: Writable progression fixtures must be automation-user only, prefix created rows, preserve auth users, and reset only scoped scenario data.
- Failure Mode: Manual log/delete testing leaves stale follow-up jobs, stats, cache, or pinned revert state that makes candidate behavior look wrong.
- Evidence: scripts/qa/fitness-codex-seed.mjs, scripts/qa/fitness-progression-scenario-definitions.mjs, src/app/dev/progression-scenarios/page.tsx, docs/ops/FITNESS-LLEL-CHECKLIST.md
- Status: Proposed
## 2026-05-08 - Linked Progression Updates require selected-row apply
- Type: Rule
- Summary: Same-exercise progression updates may be grouped only when target/config fingerprints match, and Apply/Revert must operate on explicit checked routine-day exercise rows.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: Linked targets save clicks for repeated identical programming, but the planned row remains executable truth and users need control over which days change.
- Rule: Linked Ready Updates default all matching rows selected, allow row-level opt-out, and reject server mutation if any selected row fingerprint drifts.
- Failure Mode: Applying by catalog exercise id silently updates unrelated days with different targets or stale targets.
- Evidence: src/components/progression/ProgressionReviewCard.tsx, src/app/progression-review/actions.ts, src/lib/progression-review-loader.ts, scripts/qa/fitness-progression-scenario-definitions.mjs
- Status: Proposed
## 2026-05-08 - Full-routine QA scenarios validate cross-feature progression behavior
- Type: Pattern
- Summary: Progression QA should include realistic multi-day routines with mixed history, linked targets, status-only rows, and analytics expectations in addition to isolated rule fixtures.
- Suggested Playbook File: docs/CHECKLISTS/progression-scenario-fixtures.md
- Rationale: Tiny fixtures prove individual branches, but full-routine suites catch history-linking, duplicate exercise targets, status counts, cycle/history expectations, and Apply/Revert side effects across screens.
- Rule: Full-routine QA data must be automation-owned, prefixed with `[QA-FULL-ROUTINE]`, and reset separately from human account data.
- Failure Mode: Testing only isolated progression rules misses regressions caused by real routine shape, repeated exercises, old history context, and analytics surfaces.
- Evidence: scripts/qa/fitness-progression-scenario-definitions.mjs, scripts/qa/fitness-codex-seed.mjs, src/app/dev/progression-scenarios/page.tsx, docs/ops/FITNESS-LLEL-CHECKLIST.md
- Status: Proposed

## 2026-05-08 - Product experiments use deterministic feature flags
- Type: Pattern
- Summary: New product surfaces should be gated by typed, inspectable feature flags with local/default/env resolution before broad rollout.
- Suggested Playbook File: docs/PATTERNS/deterministic-feature-flags.md
- Rationale: Flags make new surfaces testable without hidden runtime magic or scattered ad hoc conditionals.
- Rule: Feature flags resolve from deterministic defaults plus explicit env overrides.
- Rule: Dev diagnostics may show flag names, values, and sources, but never secrets.
- Failure Mode: Ad hoc conditionals make rollout and QA impossible because nobody can tell which surface should be active.
- Evidence: src/lib/feature-flags.ts, src/app/dev/flags/page.tsx
- Status: Proposed

## 2026-05-08 - Share artifacts are deterministic workout summaries
- Type: Pattern
- Summary: Workout recaps should be derived artifacts from completed session truth, not social-feed primitives.
- Suggested Playbook File: docs/PATTERNS/workout-recap-artifacts.md
- Rationale: A recap payload can be tested, retried, copied, and later rendered visually without adding comments, follows, discovery, or moderation scope.
- Rule: Recap generation is derived async work and must not block session completion.
- Rule: Recap content must be grounded in session/exercise/set data.
- Failure Mode: Building social surfaces before share artifacts creates moderation and product overhead before the deterministic artifact exists.
- Evidence: src/lib/workout-recap.ts, src/lib/session-follow-up-jobs.ts, src/app/history/[sessionId]/LogAuditClient.tsx
- Status: Proposed
## 2026-05-05 - Partial migration chains must verify actual schema, not feature labels
- Type: Guardrail
- Summary: A Supabase project can record newer feature migrations while still missing older app-required columns, so release gates must verify the exact tables and columns the app selects instead of trusting a feature-specific migration message.
- Suggested Playbook File: docs/GUARDRAILS/supabase-migration-chain-integrity.md
- Rationale: Prevents FIT feature work from being blamed for general schema drift when production has a partial migration ledger or out-of-order migration history.
- Rule: Feature-specific schema checks must only check their own feature columns; unrelated missing columns should surface as schema-chain drift.
- Failure Mode: A DB has progression columns from 045/046 but lacks earlier profile or exercise metadata columns, causing the app to report the wrong fix and encouraging unsafe fake migration repairs.
- Evidence: src/lib/progression-schema-compat.ts, supabase/migrations/20260505065000_exercise_optional_metadata_columns.sql, supabase/migrations/044_real_user_numbers.sql
- Status: Proposed
## 2026-05-03 - Durable Supabase refresh cookies should own persistent login while JWTs stay short-lived
- Type: Guardrail
- Summary: Persistent login should come from a long-lived rotating refresh-token cookie plus refresh-on-boot/private-route recovery, not from extending the access JWT lifetime or treating remembered UI state as proof of auth.
- Suggested Playbook File: docs/GUARDRAILS/persistent-supabase-session-cookies.md
- Rationale: Prevents iPhone home-screen PWAs, cold browser relaunches, and production deploys from dropping users back to login just because the short-lived JWT expired or the access cookie was missing while a valid refresh session still existed.
- Failure Mode: The app writes a short refresh-cookie Max-Age or depends on access-token restoration only, so a missing or expired access cookie breaks protected routes even though Supabase could still refresh the session.
- Evidence: src/lib/auth-session.ts, src/lib/supabase/session-recovery.ts, src/lib/supabase/server.ts, src/middleware.ts, src/app/auth/session-keepalive/route.ts, src/components/ServiceWorkerBootstrap.tsx, src/lib/boot-diagnostics.ts
- Status: Proposed

## 2026-05-03 - Installed-app auth handoff routes must recover expired sessions without throwing
- Type: Guardrail
- Summary: PWA launch and handoff routes like `/entry` must pass through the same session-refresh and invalid-session recovery path as the rest of the authenticated app. Expected Supabase auth failures should clear auth cookies and redirect to login instead of surfacing a server-side Application error.
- Suggested Playbook File: docs/GUARDRAILS/pwa-auth-handoff-recovery.md
- Rationale: Prevents stale or corrupt auth cookies in reopened installed apps from crashing the server render before the user can reach a recovery path, and keeps auth expiry behavior consistent across middleware, server loaders, and entry boot.
- Failure Mode: Installed-app reopen lands on `/` or `/entry` with expired cookies, auth boot throws `JWT expired` during server render, and Next shows the default Application error screen instead of refreshing or redirecting safely.
- Evidence: src/middleware.ts, src/lib/auth-session.ts, src/lib/auth.ts, src/lib/supabase/server.ts, src/app/auth/session-recovery/route.ts, src/app/entry/page.tsx, src/app/error.tsx, src/app/global-error.tsx, src/components/error/AppRecoveryScreen.tsx, src/components/ServiceWorkerBootstrap.tsx, src/components/ClientBundleRecoveryBootstrap.tsx, src/lib/boot-diagnostics.ts, public/sw.js, scripts/generate-service-worker.mjs, tests/build-contracts.test.mjs
- Status: Proposed

## 2026-05-02 - Thin separators must not live inside animated or filtered interactive layers
- Type: Guardrail
- Summary: Shared `1px` separators should not be rendered as standalone siblings inside press-animated or filter-brightened interactive surfaces. When a route needs a thin divider inside a tappable card, paint it as part of the owning section shell or keep it outside the animated/filtering layer.
- Suggested Playbook File: docs/GUARDRAILS/interactive-separator-rasterization.md
- Rationale: Prevents route-specific flicker and disappearing divider bugs where one card looks broken only because a thin line lands on a fractional pixel or gets re-rasterized inside a filtered composite layer.
- Follow-up: If a compact separator still flakes after moving out of animated/filter layers, promote it from a `1px` divider to the shared compact `2px` accent bar instead of duplicating route-local underline styles.
- Failure Mode: Tappable cards keep their transform or brightness feedback, but the divider appears to blink, disappear, or fail on only some cards because the separator is still a fragile `1px` child of the animated layer.
- Evidence: src/components/ExerciseCard.tsx, src/components/ui/Glass.tsx, src/app/globals.css, src/components/ui/MetricItem.tsx, src/components/history/HistoryExerciseCard.tsx, src/components/history/HistorySessionCard.tsx, src/app/history/[sessionId]/LogAuditClient.tsx
- Status: Proposed

## 2026-05-02 - Parallel local Next lanes must isolate build output by lane
- Type: Guardrail
- Summary: When the same Next repo runs multiple local live-edit lanes at once, each lane must use its own build output directory instead of sharing `.next`.
- Suggested Playbook File: docs/GUARDRAILS/local-multi-lane-next-builds.md
- Rationale: Prevents dual-dev workflows from corrupting webpack/module state and producing false UI regressions or route crashes that are not caused by the code under test.
- Failure Mode: Two localhost lanes appear healthy at startup, but shared build artifacts create `500`s, stale UI, or `__webpack_modules__[moduleId] is not a function` crashes that masquerade as application bugs.
- Evidence: next.config.mjs, scripts/dev.mjs, tsconfig.json
- Status: Proposed

## 2026-05-01 - Ambient ownership must be global, not shell-local
- Type: Pattern
- Summary: Route shells and auth shells should not paint competing full-screen backgrounds once a global app ambient exists. Shells may set route intent and presets, but the persistent ambient owner should render once near the app root.
- Suggested Playbook File: docs/PATTERNS/app-ambient-ownership.md
- Rationale: Prevents route-local backdrops from hiding app-wide theme changes, creating route-family drift, and breaking alignment between the visible app surface and icon or theme-color changes.
- Failure Mode: Local shell backdrops create route-to-route visual drift, hide app-wide theme changes, and make icon/theme-color updates diverge from the visible app surface.
- Evidence: src/lib/ambient/route-preset.ts, src/components/ui/app/AppShell.tsx, src/components/auth/AuthShell.tsx, src/components/ui/AppAmbientThemeBootstrap.tsx, src/app/globals.css, scripts/generate-icons.mjs, src/app/layout.tsx
- Status: Proposed

## 2026-05-01 - Canonical deploy source only
- Type: Guardrail
- Summary: `fawxzzy-fitness` production deploys must come from the canonical `fawxzzy/fawxzzy-fitness` repo. A dirty Vercel CLI deploy whose `gitCommitSha` is missing from GitHub is a recovery incident and must be reconciled before the next prod deploy.
- Suggested Playbook File: docs/GUARDRAILS/deploy-identity.md
- Rationale: Prevents current GitHub `main` from silently overwriting unrecovered prod-only UI or behavior that exists only in a dirty workspace deploy.
- Failure Mode: Deploying current GitHub `main` while prod is serving an unrecovered dirty workspace can silently delete prod-only UI/code.
- Evidence: Vercel prod `dpl_5ATWWNntLPsHMaC1oGVNTKy5Sw2F`, `docs/LOCAL-PROD-DATA-SYNC.md`, `.vercel/project.json`
- Status: Proposed

## 2026-05-01 - Catalog recovery migrations should ship with an explicit runtime gate
- Type: Guardrail
- Summary: When quarantine recovery adds exercise catalog data snapshots, review queues, seed migrations, or schema-alignment SQL without changing the normalized runtime trees, the branch must record whether the current app code actually depends on those artifacts before promotion.
- Suggested Playbook File: docs/GUARDRAILS/recovery-migration-gate.md
- Rationale: Prevents a clean recovery branch from stalling indefinitely on expected remote migration drift while also preventing silent promotion of runtime code that truly requires unapplied schema or catalog changes.
- Failure Mode: Operators either block safe support-layer recoveries forever because `migration:validate` drifts, or they wave through a branch that actually introduced new runtime dependence on unapplied migrations.
- Evidence: supabase/data/global_exercises_canonical.json, supabase/data/global_exercises_catalog_index.csv, supabase/data/global_exercises_catalog_index.json, supabase/data/global_exercises_review_queue.json, supabase/migrations/038_fix_strength_exercise_measurement_labels.sql, supabase/migrations/039_seed_global_stretch.sql, supabase/migrations/040_exercise_curation_tags_and_howto_refresh.sql, supabase/migrations/041_allow_measurement_optional_session_and_routine_goals.sql, docs/recovery/FULL-QUARANTINE-RECOVERY-LEDGER.md, docs/recovery/full-quarantine-normalized-audit.md
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

## 2026-05-01 - Exercise chooser rows should collapse by default and expand only when selected
- Type: Pattern
- Summary: Add-exercise choosers should render unselected exercise rows as the same thin list-shell used by skipped workout rows, then expand the selected row into the richer media-and-metadata card so browsing stays dense without losing the detailed confirmation state.
- Suggested Playbook File: docs/PATTERNS/list-interaction-consistency.md
- Rationale: Prevents exercise choosers from feeling heavier than neighboring workout lists, keeps scanning density high while browsing large libraries, and preserves one clear “selected means expanded” interaction model across chooser-family screens.
- Evidence: src/components/ExercisePicker.tsx, src/app/today/TodayExerciseRows.tsx, src/components/ExerciseCard.tsx, src/components/StandardExerciseRow.tsx
- Status: Proposed

## 2026-05-01 - Exercise catalog refreshes should document filter coverage and curation-contract changes
- Type: Pattern
- Summary: When the canonical exercise catalog, catalog indexes, or curation-tag migrations are refreshed, the repo should record what filter coverage changed and why so chooser/history search surfaces can evolve against an explicit catalog contract instead of a silent data refresh.
- Suggested Playbook File: docs/PATTERNS/list-interaction-consistency.md
- Rationale: Prevents search/filter regressions from looking like random UI drift when the real cause is a catalog or curation-data change that altered available tags, scoped labels, or exercise coverage underneath shared chooser surfaces.
- Evidence: supabase/data/global_exercises_canonical.json, supabase/data/global_exercises_catalog_index.csv, supabase/data/global_exercises_catalog_index.json, supabase/migrations/040_exercise_curation_tags_and_howto_refresh.sql, docs/exercise-filter-gap-audit.md
- Status: Proposed

## 2026-04-21 - Auth and recovery surfaces should publish shell, message, and action chrome through shared tokens
- Type: Pattern
- Summary: Login, signup, forgot-password, and reset-password routes should reuse one auth shell language by publishing intro copy rhythm, card chrome, messages, links, account panels, and primary action states through the shared token bridge instead of keeping route-local auth literals in each screen.
- Suggested Playbook File: docs/PATTERNS/mobile-card-hierarchy.md
- Rationale: Prevents auth and recovery flows from quietly diverging in card density, CTA posture, and helper/message treatment even when they already share the same shell and form structure.
- Evidence: src/components/auth/AuthShell.tsx, src/app/login/LoginScreen.tsx, src/components/auth/SignupForm.tsx, src/app/forgot-password/ForgotPasswordFormClient.tsx, src/app/reset-password/page.tsx, src/app/reset-password/RecoverySessionBridge.tsx, src/components/ui/app/designSystem.ts, src/components/ui/app/tokens.ts
- Status: Proposed

## 2026-05-02 - Canonical exercise data repairs should ship as idempotent upserts
- Type: Pattern
- Summary: When production global exercise data drifts behind the canonical catalog, the repair migration should upsert the full canonical set by normalized global exercise name instead of relying on update-only refresh statements.
- Suggested Playbook File: docs/PATTERNS/exercise-catalog-data-sync.md
- Rationale: Prevents catalog app deploys from going live while production Supabase still misses new global exercises or curation tags, and avoids destructive row replacement that could break references to existing global exercise IDs.
- Evidence: supabase/migrations/040_exercise_curation_tags_and_howto_refresh.sql, supabase/migrations/042_global_exercises_canonical_upsert.sql, supabase/data/global_exercises_canonical.json
- Status: Proposed
## 2026-05-02 - Production data mirrors must be one-way and localhost-only
- Type: Guardrail
- Summary: Production-to-local database refresh tooling should be pull-only, require a dedicated env file, and hard-refuse any destination that is not localhost so local recovery workflows cannot mutate production by accident.
- Suggested Playbook File: docs/GUARDRAILS/prod-to-local-data-mirror.md
- Rationale: Prevents convenience sync scripts from turning into hidden local-to-production write paths, especially when a repo already supports local startup against production-style env overrides.
- Evidence: scripts/sync-prod-to-local.mjs, docs/prod-to-local-db-mirror.md, .env.prod-local-mirror.example, docs/LOCAL-PROD-DATA-SYNC.md
- Status: Proposed

## 2026-05-02 - Centered headers should keep their separator in the shared inline header flow
- Type: Pattern
- Summary: Centered mobile headers with title, subtitle, and a top-right action should stay on the normal `AppHeader` inline separator path whenever possible instead of rendering the divider through a child slot or route-local fallback block.
- Suggested Playbook File: docs/PATTERNS/workout-detail-shell.md
- Rationale: Prevents sibling screens like Today, View Day, Edit Day, and Session from drifting into different subtitle-to-divider spacing just because one route moved the bar outside the shared header stack.
- Failure Mode: A route-local fallback makes the separator look missing, too low, or detached from the subtitle even though the title/subtitle copy is otherwise using the shared header family.
- Evidence: src/components/ui/app/AppHeader.tsx, src/components/ui/app/SharedScreenHeader.tsx, src/app/routines/[id]/days/[dayId]/page.tsx, src/components/SessionHeaderControls.tsx, src/components/today/TodayScreenFamily.tsx
- Status: Proposed

## 2026-05-02 - Chooser and history search rails should share one anchored overlay pattern
- Type: Pattern
- Summary: Exercise chooser and history search bars should publish the same anchored right-side filter action, transparent inner input chrome, and absolute filter-dropdown overlay so opening filters never pushes the list or creates route-specific search shells.
- Suggested Playbook File: docs/PATTERNS/list-interaction-consistency.md
- Rationale: Prevents add-exercise, history sessions, and history exercises from looking like separate products when the same search/filter interaction exists in all three places.
- Failure Mode: One route renders a darker inset rectangle, the filter pill drifts outside the input rail, or opening filters shifts the result list because the screen is bypassing the shared search/filter host.
- Evidence: src/components/exercises/ExerciseSearchFilters.tsx, src/components/ExerciseTagFilterControl.tsx, src/components/ExercisePicker.tsx, src/app/history/HistorySessionsClient.tsx, src/app/history/exercises/ExerciseBrowserClient.tsx, src/components/ui/app/designSystem.ts
- Status: Proposed

## 2026-05-02 - Add-exercise selection state should survive refresh through canonical URL state
- Type: Guardrail
- Summary: Add-exercise flows should persist the selected exercise identity in canonical URL state so refreshes restore the same selected row, goal dock, and preview summary instead of silently resetting the chooser to a different default exercise.
- Suggested Playbook File: docs/GUARDRAILS/navigation-return-contract.md
- Rationale: Prevents refresh-only regressions where the bottom goal dock appears inconsistent or “broken” simply because the page lost its selected exercise context on reload.
- Failure Mode: The user refreshes inside an add-exercise route and the selected exercise changes, making the footer preview, measurement defaults, and detail state feel nondeterministic.
- Evidence: src/components/ExercisePicker.tsx, src/components/exercises/ExerciseChooserAddFlowForm.tsx, src/components/routines/RoutineEditorShared.tsx, src/app/routines/[id]/edit/day/[dayId]/add-exercise/page.tsx, src/app/session/[id]/add-exercise/page.tsx
- Status: Proposed

## 2026-05-03 - Install prompts should be earned inside the workout loop instead of front-door gating
- Type: Pattern
- Summary: Install UI should remain capability-aware and platform-aware, but the primary promotion moment should come after a real product-value event such as account completion, repeated usage, or a completed workout instead of blocking normal browser entry by default.
- Suggested Playbook File: docs/PATTERNS/pwa-install-entry.md
- Rationale: Prevents install from becoming the first source of friction in a product whose main retention loop depends on fast entry into Today, Session, and routine execution surfaces.
- Failure Mode: A supported browser can technically open the app, but users still hit install-first friction before they see workout value, which depresses activation and makes install feel like a prerequisite instead of an upgrade.
- Evidence: src/components/install/ProtectedAppInstallGate.tsx, src/components/install/InstallRouteSurface.tsx, src/lib/install/getInstallContext.ts, src/app/install/page.tsx, src/app/today/page.tsx
- Status: Proposed

## 2026-05-03 - Active logging screens should surface prior truth inline before adding coaching abstraction
- Type: Pattern
- Summary: The active session logger should show last time, recent best, and deterministic next-target context inline in the same workspace where the user logs sets, instead of sending them to a separate analytics view or dressing the recommendation up as opaque coaching.
- Suggested Playbook File: docs/PATTERNS/active-logging-prior-truth.md
- Rationale: Preserves the fast-log loop while still answering the two most important in-session questions: what happened last time and what should I do now.
- Failure Mode: Logging surfaces become slower and noisier when prior-performance context is hidden behind drill-ins or replaced with vague coaching language that the user cannot inspect.
- Evidence: src/app/session/[id]/page.tsx, src/components/SessionExerciseFocus.tsx, src/components/SessionTimers.tsx, src/lib/session-target-hints.ts
- Status: Proposed

## 2026-05-05 - Fitness dev smoke should expose the active Supabase target
- Type: Guardrail
- Summary: Local Fitness dev should visibly report the active Supabase host and warn when it does not match the intended smoke target so stale servers or old env files cannot masquerade as product regressions.
- Suggested Playbook File: docs/GUARDRAILS/local-dev-targets.md
- Rationale: Prevents FIT smoke loops from debugging the wrong database, especially when migration reconciliation has happened on one project while an old dev server still points elsewhere.
- Failure Mode: The app reports missing schema or auth/session issues that are really caused by a stale localhost process or mismatched Supabase URL.
- Evidence: scripts/dev.mjs, scripts/dev-fitness-lps.mjs, src/app/dev/env/page.tsx, src/components/dev/DevSupabaseTargetBanner.tsx
- Status: Proposed

## 2026-05-05 - Progression education belongs in routine defaults, not execution surfaces
- Type: Pattern
- Summary: Long progression explanations should appear where routine defaults are configured, while add-exercise, edit-day, and session logger surfaces stay compact and executable.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: Keeps progression rules inspectable without turning every exercise card or current-session logger into a help article.
- Failure Mode: Education copy in execution surfaces crowds the fast-log loop and makes deterministic hints feel like noisy coaching.
- Evidence: src/components/routines/ProgressionPlaybookEditor.tsx, src/app/routines/new/NewRoutineDraftForm.tsx, src/app/routines/[id]/edit/EditRoutineAutosaveForm.tsx
- Status: Proposed

## 2026-05-05 - Progression method and set flow are separate workout layers
- Type: Pattern
- Summary: Progression methods decide how goals change across sessions or cycles, while set flow decides how the sets inside today's exercise are arranged.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: Keeps Double Progression, manual review, deload, failure, and set-flow work from collapsing into one overloaded "progression style" selector.
- Failure Mode: Treating every training concept as a progression method makes targets hard to explain, hard to test, and easy to mutate at the wrong lifecycle moment.
- Evidence: src/lib/progression-playbooks.ts, src/components/routines/ProgressionPlaybookEditor.tsx, src/lib/progression-playbooks.test.ts
- Status: Proposed

## 2026-05-05 - Routine cycles should be anchored by calendar start date
- Type: Rule
- Summary: Routine Day 1 should be anchored to a real calendar `start_date`; weekday labels are derived display, not product truth.
- Suggested Playbook File: docs/PATTERNS/routine-cycle-calendar-anchor.md
- Rationale: A 3-day or 10-day routine cycle does not repeat on a fixed weekday. Calendar date plus cycle length keeps Today calculation, cycle review, and future promotion timing deterministic.
- Failure Mode: Using weekday as the source of truth makes non-7-day routines drift or require hidden reinterpretation when cycle review and promotion logic lands.
- Evidence: src/components/routines/RoutineEditorForm.tsx, src/lib/routine-details-form.ts, src/app/routines/actions.ts, src/lib/progression-playbooks.ts
- Status: Proposed

## 2026-05-06 - Progression step is separate from progression method
- Type: Pattern
- Summary: Progression Method decides when a target can change; Progression Step decides how much it changes, using measurement and equipment defaults before app fallbacks.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: Barbell, dumbbell, bodyweight, time, and distance targets cannot all share a hardcoded "load" increment without breaking deterministic progression math.
- Failure Mode: Hardcoding load increments makes cardio/bodyweight progression impossible and causes routine defaults to override better exercise/equipment defaults.
- Evidence: src/lib/progression-step-policy.ts, src/lib/progression-playbooks.ts, src/components/exercises/ExerciseChooserAddFlowForm.tsx
- Status: Proposed

## 2026-05-06 - Training Focus is user intent, not reverse-inferred state
- Type: Rule
- Summary: Training Focus may seed defaults, but manual progression edits should mark the setup as customized instead of blanking or back-inferring the focus.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: Double Progression, Manual, and legacy manual-review configurations can each serve multiple user goals, so progression settings do not uniquely identify intent.
- Failure Mode: Back-inferring or clearing Training Focus loses user intent and makes curated defaults feel like hidden automation.
- Evidence: src/components/routines/TrainingGoalSelector.tsx, src/lib/progression-playbook-form-state.ts, src/app/routines/new/NewRoutineDraftForm.tsx
- Status: Proposed

## 2026-05-06 - Cardio progression should use metric-aware targets
- Type: Pattern
- Summary: Cardio progression should promote duration, distance, or pace/volume targets instead of forcing cardio into strength-style load math.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: Time and distance exercises progress through measurable cardio metrics, so deterministic candidate review must describe those changes directly.
- Failure Mode: Reusing load copy for cardio makes review cards confusing and blocks future time/distance regression behavior.
- Evidence: src/lib/progression-playbooks.ts, src/lib/progression-step-policy.ts, src/lib/progression-review-display.ts
- Status: Proposed

## 2026-05-07 - Cardio zones are intensity targets, not exercises
- Type: Pattern
- Summary: Zone 2 and similar cardio zones should be layered onto cardio exercises as intensity targets instead of appearing as standalone catalog exercises.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: conditioning intent belongs on a real movement target, such as "Treadmill Run + Zone 2", not as a standalone catalog exercise.
- Failure Mode: Treating zones as exercises creates duplicate cardio rows and half-built progression candidates.
- Evidence: src/lib/global-exercise-picker.ts, src/lib/global-exercise-picker.test.ts
- Status: Proposed

## 2026-05-06 - Set Flow controls within-workout arrangement
- Type: Pattern
- Summary: Set Flow describes how sets are arranged inside today's exercise, while Progression Method still controls how goals change across sessions or cycles.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: Straight sets, ramping, and backoff work are set-structure choices; mixing them into progression methods makes target derivation and review timing hard to reason about.
- Failure Mode: Mutating live logger behavior before Set Flow has stable defaults, copy, and tests risks making the fast-log screen unpredictable.
- Evidence: src/lib/set-flow.ts, src/lib/progression-playbook-form-state.ts, src/components/routines/ProgressionPlaybookEditor.tsx
- Status: Proposed

## 2026-05-06 - Set Flow planned targets are advisory
- Type: Rule
- Summary: Set Flow target generation may produce planned straight-set, ascending-ramp, and descending-backoff targets, but logged sets remain the source of truth.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: Planned targets are useful for display and future prefills, but Progression Updates must evaluate what the user actually logged.
- Failure Mode: Letting planned Set Flow targets mutate completed logs makes the logger stop recording reality and makes progression candidates unreliable.
- Evidence: src/lib/set-flow-targets.ts, src/lib/set-flow-targets.test.ts, src/lib/progression-scenarios.ts
- Status: Proposed

## 2026-05-06 - Codex QA accounts must be automation-owned
- Type: Guardrail
- Summary: Codex-authenticated QA should use a dedicated automation account and cloned routine data instead of Zac's real account/session.
- Suggested Playbook File: docs/GUARDRAILS/fitness-qa-accounts.md
- Rationale: Writable smoke needs real authenticated data, but mutating a human routine or sharing human auth cookies makes review unsafe.
- Failure Mode: Codex testing changes real user data or automation profiles get counted as real users.
- Evidence: scripts/qa/fitness-codex-seed.mjs, scripts/qa/fitness-codex-reset.mjs, docs/ops/FITNESS-LLEL-CHECKLIST.md
- Status: Proposed

## 2026-05-06 - Session truth persists before derived follow-up work
- Type: Rule
- Summary: Session completion should persist raw workout truth before exercise stats and ecosystem integration follow-up work runs.
- Suggested Playbook File: docs/PATTERNS/session-follow-up-jobs.md
- Rationale: Derived jobs can fail or retry without making workout completion feel unreliable.
- Failure Mode: Inline derived work blocks completion or retries forever without an inspectable terminal state.
- Evidence: src/app/session/[id]/actions.ts, src/lib/session-follow-up-jobs.ts, src/lib/session-follow-up-jobs.test.ts, scripts/process-fitness-followups.mjs
- Status: Proposed

## 2026-05-08 - Human-account LLEL fixtures must be prefix-scoped and reversible
- Type: Guardrail
- Summary: When final product review needs Zac's real authenticated browser context, seed a dedicated `[ZAC-LLEL]` routine/history fixture and restore the previous active routine afterward instead of mutating the real Atlas program.
- Suggested Playbook File: docs/GUARDRAILS/fitness-qa-accounts.md
- Rationale: Human-account review catches product feel and auth/cookie issues that automation accounts miss, but the seeded data must be easy to identify, reset, and separate from real training truth.
- Failure Mode: Testing progression by hand on real history causes irreversible product confusion, stale candidates, and unsafe Apply/Revert checks.
- Evidence: scripts/qa/seed-zac-llel-routine.mjs, scripts/qa/reset-zac-llel-routine.mjs, docs/ops/FITNESS-LLEL-CHECKLIST.md
- Status: Proposed

## 2026-05-08 - Authenticated LLEL should use deterministic storage state
- Type: Pattern
- Summary: Protected-route automation should bootstrap a reusable local storage-state artifact for one exact origin before opening Today, Routines, History, the Account tab (`/settings`), or audit screens.
- Suggested Playbook File: docs/GUARDRAILS/fitness-qa-accounts.md
- Rationale: The Fitness app intentionally protects product routes, and `localhost` versus `127.0.0.1` cookie splits make unauthenticated browser smoke misleading.
- Failure Mode: Dev-only routes pass while real product screens silently redirect to login, leaving visual acceptance untested.
- Evidence: scripts/qa/bootstrap-fitness-auth-state.mjs, scripts/qa/fitness-authenticated-route-smoke.mjs, scripts/qa/open-fitness-llel-tabs.mjs
- Status: Proposed

## 2026-05-08 - Human-account LLEL uses canonical exercise identity
- Type: Rule
- Summary: Zac-owned LLEL fixtures may prefix routines and sessions, but routine/session exercise references must resolve to canonical global catalog exercises instead of creating prefixed user-owned exercises.
- Suggested Playbook File: docs/GUARDRAILS/fitness-qa-accounts.md
- Rationale: Human-account product review should exercise the real picker, history matching, and progression audit paths. Fake seeded exercises can make the engine look correct while hiding catalog identity bugs.
- Failure Mode: Prefixed user-owned exercise rows pollute search, break historical matching, and let scenario seeds bypass missing canonical catalog data.
- Evidence: scripts/qa/fitness-catalog-resolver.mjs, scripts/qa/seed-zac-llel-routine.mjs, scripts/qa/repair-zac-llel-catalog-references.mjs
- Status: Proposed

## 2026-05-08 - Progression vectors separate proof from target mutation
- Type: Pattern
- Summary: Progression math should resolve a qualification policy separately from the metric vector that changes after qualification.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: Double Progression, cardio progression, reps-only progression, and coupled load/reps progression share one engine shape: completed workout truth proves readiness, then a measurement-aware vector mutates the next target by a step.
- Rule: Qualification answers whether the user earned an update; the progression vector answers what metric changes; the step policy answers by how much.
- Pattern: Load-based Double Progression is a coupled load + reps vector: reps prove readiness, load increases, reps reset lower.
- Pattern: Time + distance cardio defaults to a coupled duration + distance vector: hold time and increase distance.
- Failure Mode: Treating load, reps, duration, distance, and pace as separate visible progression methods makes settings explode and obscures the actual math.
- Evidence: src/lib/progression-vector.ts, src/lib/progression-playbooks.ts, src/app/dev/progression-audit/page.tsx
- Status: Proposed

## 2026-05-08 - Applied progression pins are quick undo state
- Type: Rule
- Summary: Applied Progression Update pins must preserve Revert safety only until the promoted target becomes the new active workout truth.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: A pinned Revert row prevents accidental mutation loss, but it must not permanently hide the next candidate after the user has trained on the applied target.
- Rule: If a refreshed candidate starts from the applied target snapshot, finalize the local pin and allow the next update to render.
- Rule: Double Progression has two phases for load-based work: build current target reps at the same load, then increase load and reset current reps to the range floor after the top of the range is proven.
- Failure Mode: Treating the Revert pin as permanent UI state blocks legitimate follow-up updates such as `230 lbs x 4 -> 230 lbs x 5`.
- Evidence: src/lib/progression-applied-pins.ts, src/lib/progression-playbooks.ts, src/lib/progression-review-target-update.ts
- Status: Proposed

## 2026-05-08 - Progress visuals derive from progression evidence
- Type: Pattern
- Summary: Exercise-card progress fill should visualize closeness to the next promotion using existing progression candidate/status evidence, not a separate recommendation path.
- Suggested Playbook File: docs/PATTERNS/deterministic-progression-playbooks.md
- Rationale: The card fill gives fast ambient feedback, but the user-facing claim still needs to trace back to the same workout history, target, qualification policy, vector, and step used by Progression Updates and audit.
- Rule: Card fill indicates closeness to promotion; it must not create fake Ready Updates.
- Pattern: Ready candidates render as 100%; strength/reps use qualified checked sets over required sets; cardio uses completed duration or distance over target.
- Failure Mode: A visual progress bar that recomputes different rules drifts from Progression Updates and makes the engine look arbitrary.
- Evidence: src/lib/progression-progress-percent.ts, src/lib/progression-status-display.ts, src/components/ExerciseCard.tsx
- Status: Proposed
