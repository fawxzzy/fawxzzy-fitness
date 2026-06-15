# Fitness Compounding Lanes

Date:
- 2026-05-03

Workspace:
- `repos/fawxzzy-fitness`

Purpose:
- Turn the highest-confidence Fitness systems into PR-sized implementation lanes that compound inside the current product instead of adding category noise.

Operating rule:
- Keep Fitness as the product truth layer.
- Keep Playbook in planning and policy.
- Keep Lifeline in bounded execution.
- Do not pull heavyweight orchestration or black-box coaching into the app.

## Accepted product order

1. Make active workout logging faster.
2. Make progress legible immediately after and between sessions.
3. Add transparent program intelligence with deterministic progression rules.
4. Harden async follow-up work and experiment safely behind flags.
5. Add lightweight shareability before any social feed work.

## Explicitly deferred

- Full in-app social feed
- Black-box AI coach positioning
- Sensor-first or watch-first automatic tracking
- Browser background sync as the primary reliability layer

## Lane map

### FIT-01 - Replace install-first gating with earned install promotion

Why:
- The current install route and protected install gate still treat install as a front-door moment.
- The stronger category pattern is to ask for install after value, not before value.

Primary files:
- `src/components/install/ProtectedAppInstallGate.tsx`
- `src/components/install/InstallRouteSurface.tsx`
- `src/components/install/usePWAInstallPrompt.ts`
- `src/lib/install/getInstallContext.ts`
- `src/app/install/page.tsx`
- `src/app/today/page.tsx`

PR scope:
- Stop using install as the default protected-app gate except where platform constraints truly require it.
- Convert install UI into a contextual promotion surface after account creation, repeated usage, or workout completion.
- Preserve iOS Safari and in-app-browser guidance as fallbacks, but move them behind an earned prompt controller.

Exit criteria:
- Authenticated users can reach the app without install-first interruption on normal supported browser paths.
- Install prompts remain capability-aware and platform-aware.
- The first strong install ask happens after a real product value moment.

Verification:
- `npm run verify`
- targeted install-flow smoke on `/install`, `/today`, and post-session completion

Implementation note:
- 2026-05-03: shipped the first cut by relaxing the global install gate so iOS Safari tabs keep normal app access, preserving the iOS in-app-browser Safari fallback, and adding a non-blocking earned install prompt on Today after workout completion. Broader earned moments stay deferred.

### FIT-02 - Add previous-performance context and next-target hints to the session logger

Why:
- Fast logging is the highest-confidence product improvement in the category.
- Fitness already has session shells and progress state primitives, but the live logger still needs stronger "what should I do now?" context.

Primary files:
- `src/app/session/[id]/queries.ts`
- `src/components/SessionPageClient.tsx`
- `src/components/SessionExerciseFocus.tsx`
- `src/components/SessionTimers.tsx`
- `src/lib/session-exercise-progress.ts`
- `src/lib/exercise-history-aggregation.ts`

PR scope:
- Surface last logged set, recent best, and a deterministic next-target suggestion inline during set entry.
- Keep the guidance inspectable and rule-based; do not introduce opaque recommendation copy.
- Preserve one-tap logging and current session-footer behavior.

Exit criteria:
- Every active exercise can show prior-context data without forcing a route jump.
- Next-target hints are deterministic and derived from stored workout truth.
- No new modal or secondary screen is required to see recent performance.

Verification:
- `npm run verify`
- `npm run visual:fitness:session`

Implementation note:
- 2026-05-03: shipped the first cut by threading canonical `exercise_stats` history into the active session logger, deriving deterministic next-target hints from plan truth plus recent performance, and rendering last-time / recent-best context inline in the expanded logging workspace without changing the add-set flow.

### FIT-03 - Ship a cycle progress surface and establish the premium insight boundary

Why:
- Progress visibility is the clearest retention lever after workout speed.
- The repo already has history, exercise analytics, and growth-shadow seams that can support a legible cycle summary.

Primary files:
- `src/app/history/page.tsx`
- `src/app/history/HistorySessionsClient.tsx`
- `src/components/history/HistoryRouteScaffold.tsx`
- `src/lib/exercise-analytics.ts`
- `src/lib/exercise-history-aggregation.ts`
- `src/lib/ecosystem/fitness-growth-shadow.ts`

PR scope:
- Add one cycle progress surface with PR moments, consistency trend, per-muscle volume summary, and one simple strength/progress score.
- Keep the first version lightweight and explanatory.
- Use this surface to define the future free-core versus paid-insight line without paywalling logging.

Exit criteria:
- A user can tell whether they are progressing this cycle in under one screen.
- Metrics connect to recent workouts and are not abstract dashboard filler.
- The surface is usable without inventing a new analytics subsystem.

Verification:
- `npm run verify`
- `npm run visual:fitness:history`
- `npm run visual:fitness:history-detail`

### FIT-04 - Introduce deterministic progression playbooks

Why:
- Fitness already uses routine/day/workout/session/progression language and explicitly values deterministic behavior.
- The best next planning layer is transparent rule-driven progression, not a black-box generator.

Primary files:
- `src/lib/routines.ts`
- `src/lib/start-session.ts`
- `src/lib/session-targets.ts`
- `src/components/routines/RoutineEditorShared.tsx`
- `src/app/routines/[id]/edit/day/[dayId]/page.tsx`
- `src/components/ui/measurements/SharedExerciseGoalForm.tsx`

PR scope:
- Add inspectable progression rules as two separate layers:
  - primary method: manual, double progression, hold & review
  - regression policy: none, deload-after-stall
- Keep Set Flow separate from progression so straight sets, ramp, and backoff structures do not become progression methods.
- Anchor cycle review to `start_date + cycle_length_days`, not weekday selection.
- Let a routine day or exercise opt into a method and optional stall policy, then surface the rule in plain language.
- Persist enough structured rule data to drive target suggestions in the session flow.

Exit criteria:
- Progression behavior is understandable from the UI and from stored data.
- Session targets can be derived from explicit rules instead of freeform notes.
- The routine builder stays inside the existing shell family.

Verification:
- `npm run verify`
- `npm run visual:fitness:routines`
- targeted session-target regression checks

Implementation note:
- 2026-05-04: shipped the first cut by adding nullable routine-day playbook fields, three deterministic progression definitions, inline playbook selection in Edit Day, and session-target hint derivation from completed set history with explicit fallback for invalid config, missing history, bodyweight, and cardio targets.
- 2026-05-05: refined the model so fixed-load blocks hold load and return review copy instead of auto-bumping, while deload-after-stall is treated as a stall policy modifier that can attach to double progression or fixed-load.
- 2026-05-05: added the FIT-04E-A model seam: training goal seeds defaults, measurement type determines fields, progression method moves goals up, set flow shapes today's sets, intensity target owns failure, regression policy recovers goals down, promotion policy controls review vs auto, and routine cycles are anchored by calendar start date plus cycle length.
- 2026-05-06: added the FIT-04F/G review seam: completed workout truth now derives promote/review/deload candidates, and Today can surface those candidates before workout start without auto-updating routine goals.
- 2026-05-06: added FIT-04I training-goal presets in New/Edit Routine. Goals seed routine default progression fields only; applying those defaults to current exercises still requires the existing explicit confirmation path.
- 2026-05-06: added FIT-04J progression-step policy. Progression methods decide when targets change; measurement/equipment-aware step policy decides how much they change, with exercise override > equipment default > routine default > training-goal seed > app fallback.
- 2026-05-06: added FIT-04K cardio progression candidates for time, distance, and time+distance targets. Cardio review now promotes duration/distance metrics instead of reusing load language, while Set Flow and auto-update lifecycle remain deferred.
- 2026-05-06: added FIT-04L-A Set Flow foundation. Straight sets, ascending ramp, and descending backoff now have model helpers, routine-default config round-trip, Info copy, and tests without changing live logger behavior.
- 2026-05-06: added FIT-04L-B advisory Set Flow target generation. Straight sets, ascending ramp, and descending backoff can now produce planned set targets for fixtures/future display while logged sets remain truth.
- 2026-05-08: added FIT-04M history-scope policy. Progression candidates now evaluate each completed exposure independently, can use the best qualifying exposure instead of only the latest, never pool sets across sessions, and expose target/evaluation fingerprints for linked display and future cache invalidation.
- 2026-05-08: added FIT-06 deterministic feature flag seam. Product flags now resolve from typed defaults plus env overrides and are inspectable at `/dev/flags`.
- 2026-05-08: added FIT-07 deterministic workout recap artifacts. Recaps derive from completed session truth, render behind the recap flag, and can be generated from the FIT-05 follow-up backbone without blocking session completion.

### DB-RECON-01 - Reconcile schema drift before progression smoke

Why:
- The connected Supabase project can have newer progression columns from `045/046` while still missing older app-required schema from `038-044`.
- FIT-04 browser smoke is not trustworthy while profile and exercise metadata selects are returning schema errors.
- `043_hide_standalone_stretch_catalog_rows` references `exercises.slug`, so the migration chain must guard that column before `043` updates by slug.

Target project:
- `https://lpswxoyfniocuhljgzbc.supabase.co`

Required order:
- Apply or reconcile `038`, `039`, `040`, `041`, `042`, `043`, `044`, and `20260505065000` on the target project.
- Do not fake-mark migrations as applied.
- Do not reapply `045/046` if the ledger and actual progression columns already exist.
- Keep Zac member `#0` assignment as a manual operator SQL step after `044`; do not hardcode the real email in repo history.

Migration audit:
- `038_fix_strength_exercise_measurement_labels`: safe to apply as-is; data repair for strength measurement labels.
- `039_seed_global_stretch`: safe to apply as-is; idempotent Stretch catalog seed/update.
- `040_exercise_curation_tags_and_howto_refresh`: safe to apply as-is; adds `curation_tags` if missing before catalog refresh.
- `041_allow_measurement_optional_session_and_routine_goals`: safe to apply as-is; relaxes measurement-type constraints for optional goals.
- `042_global_exercises_canonical_upsert`: safe to apply as-is; guards `curation_tags` and upserts global exercise data.
- `043_hide_standalone_stretch_catalog_rows`: guarded with `add column if not exists slug` before it updates by slug.
- `20260505065000_exercise_optional_metadata_columns`: reconciliation migration; creates optional app-selected exercise metadata columns before FIT-04 smoke depends on them.
- `044_real_user_numbers`: safe schema migration; Zac `#0` remains an operator-only step.

Reconciliation migration:
- `supabase/migrations/20260505065000_exercise_optional_metadata_columns.sql` adds optional exercise metadata columns with `add column if not exists`.
- This migration is intentionally additive and non-destructive.

Verification SQL:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('user_number', 'user_kind', 'user_number_assigned_at');

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'exercises'
  and column_name in ('image_icon_path', 'slug', 'kind', 'type', 'tags', 'categories');

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'routines'
  and column_name in ('default_progression_playbook_id', 'default_progression_playbook_config');

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'routine_day_exercises'
  and column_name in ('progression_playbook_id', 'progression_playbook_config');
```

Operator note for `044`:

```sql
update public.profiles p
set
  user_number = 0,
  user_kind = 'human',
  user_number_assigned_at = coalesce(p.user_number_assigned_at, now())
from auth.users u
where u.id = p.id
  and lower(coalesce(u.email, '')) = lower('REAL_AUTH_EMAIL_HERE');
```

Exit criteria:
- Profile user-number columns exist.
- Exercise metadata columns exist.
- Progression columns still exist.
- Automation users remain unnumbered.
- Exactly one human profile is manually assigned `user_number = 0`.

Failure mode:
- Partial migration chain with newer feature migrations applied. A DB can have `045/046` progression columns while still missing earlier app-required columns, so app diagnostics and release checks must report the actual missing table and column.

### FIT-05 - Harden session follow-up work into a durable async backbone

Why:
- The repo already has `processSessionFollowUpJobs(...)`, claimed-job leasing, and ecosystem publication seams.
- The remaining step is to make session completion feel instant while derived work stays durable and inspectable.

Primary files:
- `src/app/session/[id]/actions.ts`
- `src/lib/session-follow-up-jobs.ts`
- `src/lib/ecosystem/fitness-integration-server.ts`
- `src/lib/exercise-stats.ts`
- `supabase/migrations/**`

PR scope:
- Split raw session persistence from follow-up settlement more cleanly.
- Promote follow-up work into a durable queue or leased worker path for:
  - exercise stats refresh
  - ecosystem signal/state publication
  - future recap/share artifact generation
- Preserve local inspectability of claimed, completed, and failed jobs.

Exit criteria:
- `saveSessionAction` persists completion first and does not depend on all derived work succeeding inline.
- Failed follow-up jobs are retryable and visible.
- New derived consumers can attach without rewriting the save path.

Verification:
- `npm run verify`
- targeted follow-up job tests around claim, retry, and failure paths

Implementation note:
- 2026-05-06: session completion already persists raw session truth before processing follow-up jobs. FIT-05 hardening added a max-attempt execution guard so leased follow-up jobs can reach an inspectable failed state instead of retrying forever.

### FIT-06 - Expand feature flags from one onboarding toggle into a real experiment seam

Why:
- The repo already has a minimal feature-flag helper.
- Install timing, premium previews, and recommendation placements should roll out safely instead of through ad hoc conditionals.

Primary files:
- `src/lib/feature-flags.ts`
- `src/app/today/page.tsx`
- `src/app/history/page.tsx`
- `src/components/install/InstallRouteSurface.tsx`

PR scope:
- Add explicit flags for:
  - earned install prompt timing
  - premium analytics preview placement
  - progression recommendation slot
- Keep the API small and deterministic.
- Make flags usable in local QA and visual verification.

Exit criteria:
- Each new product experiment can be turned on and off without branching the product architecture.
- Flag usage is easy to inspect in code review.

Verification:
- `npm run verify`
- targeted flag-on and flag-off smoke checks

### FIT-07 - Ship shareable workout recap artifacts before any social graph work

Why:
- Lightweight social proof is higher ROI than a full feed at this stage.
- Fitness already has the outbound seam posture needed for recap generation.

Primary files:
- `src/app/session/[id]/actions.ts`
- `src/lib/session-follow-up-jobs.ts`
- `src/lib/exercise-analytics.ts`
- `src/lib/client-analytics.ts`
- `src/lib/ecosystem/fitness-growth-shadow.ts`

PR scope:
- Generate one clean recap artifact after workout completion with workout summary, PR moments, and streak callout.
- Support share or export first; do not build follow graphs, comments, or discovery.
- Reuse the async follow-up lane for generation work if needed.

Exit criteria:
- A completed workout can produce one consistent outbound artifact.
- Recap content is grounded in deterministic session data.
- No moderation-heavy or feed-dependent system is introduced.

Verification:
- `npm run verify`
- targeted recap-generation tests and post-session smoke checks

## Recommended implementation sequence

1. `FIT-01` install posture
2. `FIT-02` fast-log context
3. `FIT-03` weekly progress surface
4. `FIT-04` deterministic progression playbooks
5. `FIT-05` async backbone hardening
6. `FIT-06` feature-flag expansion
7. `FIT-07` shareable recap artifacts

## Playbook promotion candidates

- Earned install prompts instead of install-first gating
- Persist-first session completion with leased derived follow-up work
- Progression claims require traceable completed workout truth, including the planned row, source session/set evidence, compared target/config, qualification reason, and exact mutation/revert snapshot when a target changes.
- Scenario fixtures are product QA, not demo data: isolated rule fixtures plus full-routine QA suites should cover ready updates, status-only rows, linked targets, history-context rows, and reset safety before broad manual LLEL.
- Product experiments use typed deterministic flags before new surfaces ship.
- Shareable recap artifacts are derived workout summaries, not social feeds.

## Notes for Codex lanes

- Keep each lane reviewable in one PR.
- Prefer extending existing shells, analytics helpers, and follow-up seams.
- Avoid combining install, progression, and shareability into the same PR.
- Do not start FIT-06/FIT-07 until FIT-03 through FIT-05 pass the no-loose-ends audit and authenticated LLEL.
- Mutating Codex tasks are not governed unless the prompt declares `Acceptance Criteria`, `Expected Changed Paths`, `Expected Unchanged Paths`, and `Blocked / Skipped Reporting Rules`.
- Summary text is not proof. Lane completion should be claimed only when the final diff and verification output prove each satisfied criterion.
- If a criterion cannot be completed or a non-listed path would need to change, report it as blocked, skipped, or failed instead of widening the lane silently.
