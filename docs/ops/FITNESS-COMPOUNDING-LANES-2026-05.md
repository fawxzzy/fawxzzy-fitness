# Fitness Compounding Lanes

Date:
- 2026-05-03

Workspace:
- `C:\ATLAS\repos\fawxzzy-fitness`

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

### FIT-03 - Ship a weekly progress surface and establish the premium insight boundary

Why:
- Progress visibility is the clearest retention lever after workout speed.
- The repo already has history, exercise analytics, and growth-shadow seams that can support a legible weekly summary.

Primary files:
- `src/app/history/page.tsx`
- `src/app/history/HistorySessionsClient.tsx`
- `src/components/history/HistoryRouteScaffold.tsx`
- `src/lib/exercise-analytics.ts`
- `src/lib/exercise-history-aggregation.ts`
- `src/lib/ecosystem/fitness-growth-shadow.ts`

PR scope:
- Add one weekly progress surface with PR moments, consistency trend, per-muscle volume summary, and one simple strength/progress score.
- Keep the first version lightweight and explanatory.
- Use this surface to define the future free-core versus paid-insight line without paywalling logging.

Exit criteria:
- A user can tell whether they are progressing this week in under one screen.
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
- Add three inspectable playbooks:
  - double progression
  - fixed-load rep-range progression
  - deload-after-stall
- Let a routine day or exercise opt into one playbook and surface the rule in plain language.
- Persist enough structured rule data to drive target suggestions in the session flow.

Exit criteria:
- Progression behavior is understandable from the UI and from stored data.
- Session targets can be derived from explicit rules instead of freeform notes.
- The routine builder stays inside the existing shell family.

Verification:
- `npm run verify`
- `npm run visual:fitness:routines`
- targeted session-target regression checks

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

## Notes for Codex lanes

- Keep each lane reviewable in one PR.
- Prefer extending existing shells, analytics helpers, and follow-up seams.
- Avoid combining install, progression, and shareability into the same PR.
