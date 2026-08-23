This file is a project-local inbox for repo-specific Playbook notes that may later be promoted upstream.

## PROPOSED

## 2026-08-15 - Bind Fitness to its branded origin and retained Playbook distribution
- Type: Configuration + Reliability + Coverage
- WHAT changed: Centralized the application-origin fallback on `https://fitness.fawxzzy.com`, updated metadata, install, recovery, environment-example, and Stripe-readiness surfaces to use that branded origin, and added focused origin regressions. Root metadata retains the branded `metadataBase` without publishing a homepage canonical from the shared layout, so child routes are not misidentified as duplicates of `/`. Rebound the active Playbook fallback from the deleted legacy GitHub account to the source-bound `fawxzzy/playbook` v0.54.0 release asset, enforced its exact SHA-256 before write/install, and added default, override, mismatch, and local-artifact evidence regressions with aligned workflow/operator documentation.
- WHY it changed: Fitness must be ready to operate under its owned `fawxzzy.com` subdomain without retaining `vercel.app` as application identity, while clean-environment verification must remain reproducible after the legacy GitHub account retirement.
- Rule: Application identity belongs in one resolver and release-tool acquisition must use a retained, source-bound artifact whose expected digest is enforced before installation.
- Failure Mode: Scattered origin fallbacks produce mixed canonical URLs after a domain cutover; a root-layout homepage canonical makes every child route claim `/` as its canonical identity; a deleted coordinate breaks CI; and a URL-only or non-reporting local release contract can silently install bytes without durable verification evidence.
- Decision: Source readiness only. Vercel production deployment, DNS, Supabase Auth redirect configuration, Spotify callback changes, and every live provider cutover remain separately authorized.
- Evidence: `src/lib/app-origin.ts`; `src/app/layout.tsx`; `src/app/viewport.contract.test.ts`; `src/lib/install/config.ts`; recovery/install tests; `scripts/playbook-runtime.mjs`; `scripts/playbook-runtime.test.mjs`; `.github/workflows/ci.yml`; retained Playbook release `v0.54.0` at source commit `eaa36197f7f4161979f85c36358b1864e1481698`, asset SHA-256 `1803d9313d8ed8b36e5c674ce71b39e5193b70aa291b67a1223afa7eb18508b5`.
- Status: Source-proven; live domain cutover not performed

## 2026-08-11 - Close the local authenticated Fitness qualification integrity gaps
- Type: Fix + Security + Coverage
- WHAT changed: Bound quick-log copy and payload to one render-captured action; made offline skip-toggle claims lease-aware and provider errors closed/non-echoing; accepted exact authoritative logged-set-count decreases; transitioned completed sessions to a non-actionable local UI state; made the local Supabase banner honor the launcher-provided expected host; made QA reset lookup-only for an exact pre-existing synthetic user and removed automatic Auth create/update fallback from session bootstrap; replaced the caller-selectable session-start adapter with a server-only repository-authenticated export; tightened the session-start RPC to service-role execution with explicit user binding and exact day/exercise ownership; and recreated the follow-up claim function with qualified columns. Added focused regressions and a dedicated CI contract. The corrective migration is source-only until separately authorized for a target database.
- WHY it changed: Authenticated local qualification reproduced four user-visible failures (quick-log copy/data divergence, follow-up jobs stuck pending, stale completed-session controls, and a false environment banner) and review exposed four adjacent integrity gaps (caller-forgeable session-start dependencies/RPC input, indefinite offline `syncing`, raw provider-error persistence, and set-count state that could never converge downward). The old QA reset command also crossed the stated no-credential-mutation boundary even for an existing account.
- Rule: One user action has one immutable payload; resumable queues require explicit recoverable leases; server-authenticated capabilities cannot accept caller-selected authentication or privileged clients; provider diagnostics are categorical and non-echoing; authoritative snapshots may legitimately decrease; and a reset command must not create or rewrite identity credentials unless that authority is explicit.
- Failure Mode: Independent UI copy and payload can persist a value the user never saw; an abandoned queue claim can wedge forever; a public/authenticated RPC or injected privileged client can forge ownership; raw provider messages can leak secrets; `max(local, server)` can preserve stale counts; completed sessions can remain actionable; and a QA reset can silently mutate Auth metadata or credentials.
- Decision: `FITNESS_AUTHENTICATED_INTEGRITY_COMPLETION_REQUIRED`. Keep production deployment and live migration application separate. The `20260811043408_fitness_integrity_completion_v1.sql` migration supersedes the 2026-08-04 source-only session-start function contract with a service-role-only, repository-authenticated boundary; no live provider mutation is part of this source change.
- Evidence: `src/lib/session-quick-log.ts`; `src/components/SessionExerciseFocus.tsx`; `src/lib/offline/skip-toggle-reconciliation.ts`; `src/lib/offline/skip-toggle-sync-engine.ts`; `src/components/session/setCountSync.ts`; `src/components/SessionPageClient.tsx`; `src/lib/dev-supabase-target.ts`; `scripts/qa/fitness-qa-user.mjs`; `src/lib/session-start-atomicity.ts`; `supabase/migrations/20260811043408_fitness_integrity_completion_v1.sql`; their focused tests; clean PGlite and real-Postgres migration replay; `.github/workflows/fitness-integrity-completion-contract.yml`.
- Status: Implemented and locally verified; live migration apply and production deployment remain separately gated

## 2026-08-09 - Make the migration chain own explicit Data API GRANTs instead of relying on Supabase provider defaults
- Type: Fix + Coverage
- WHAT changed: Added `supabase/migrations/20260806090000_explicit_fitness_data_api_grants.sql`, an additive-only migration (`grant` statements only -- no `revoke`, no `grant ... on all tables`, no `alter default privileges`) that explicitly grants: `anon` -- `select` on `public.exercises` only; `authenticated` and `service_role` -- full `select/insert/update/delete` on the 12 user-facing Fitness core tables (`profiles`, `exercises`, `routines`, `routine_days`, `routine_day_exercises`, `sessions`, `session_exercises`, `sets`, `exercise_stats`, `session_follow_up_jobs`, `workout_plan_templates`, `workout_plan_template_exercises`), plus `select/insert/delete` (deliberately no `update`) on `progression_events`, an append-only event ledger whose own RLS policies never included an update/delete-own policy. Billing, Discord, and `user_entitlements` tables were deliberately left untouched -- they already have their own narrower, independently-reviewed grants. Added `scripts/migration/data-api-grants-contract.mjs` (the matrix as machine-checkable data) and `scripts/migration/data-api-grants-contract.test.mjs`, which replays the full migration chain on both this repo's existing PGlite and real-Postgres backends and asserts the exact grant matrix via `has_table_privilege()` (never SQL-text comparison), that RLS is still enabled on every core table, and that the session-start-atomicity RPC/index are undisturbed -- plus a dedicated negative test that manually revokes one required grant post-replay and confirms the same assertion helper catches it. Updated `replay-clean-chain.test.mjs`/`real-postgres-replay-chain.test.mjs`'s hardcoded "last applied migration" assertions to point at the new head. Wired a `data-api-grants-contract` CI job (PGlite + a real `postgres:` service container) alongside the existing migration-replay jobs.
- WHY it changed: A clean Supabase CLI stack (all 105 pre-existing migrations applying successfully) failed its deterministic QA seed with `permission denied for table exercises`. Verified directly against the local database (`information_schema.role_table_grants`, `has_table_privilege()`) rather than assumed: RLS policies were correct and `service_role` had `BYPASSRLS` and schema `USAGE`, but no `SELECT`/`INSERT`/`UPDATE`/`DELETE` grant existed on any of the 13 core Fitness tables for `service_role`, and only a handful of ad hoc, partial grants existed for `authenticated` (e.g. `select`-only on `exercises`, `select+insert`-only on `routines`/`routine_days`/`routine_day_exercises` from `20260729000000_planner_persistence_adapter_v1.sql`). Production has never hit this because it was provisioned under an older Supabase default that auto-granted broad Data API reachability at project-creation time, before any project migration ran -- an implicit, unversioned, provider-specific contract this migration chain had always silently depended on. A newer/clean Supabase project does not auto-grant this, so the exact same migration chain that has always worked in production cannot bootstrap a clean environment's QA seed at all.
- Rule: Migrations own Data API reachability. Postgres GRANTs and RLS policies are two independent, both-required gates -- GRANT decides *whether a role can touch the table object at all* (evaluated first), RLS decides *which rows* (evaluated only after GRANT already allowed the statement to run). A correct, fully-tested RLS policy set provides zero protection against, and zero substitute for, a missing GRANT: every table an application's Data API is meant to expose needs both, explicitly, in source control -- never left to whatever a given Supabase project happened to default to at creation time.
- Failure Mode: RLS without grants. `42501 permission denied for table X` from a client whose RLS policies are objectively correct is the signature of this gap, and it is easy to misdiagnose as an RLS bug (prompting someone to loosen or debug policies that were never the problem) rather than what it actually is -- a missing object-level GRANT that RLS never had a chance to evaluate past. This is silent and environment-dependent: it will not appear in any environment that inherited broad legacy default grants (like this app's real production project), only in a fresh/differently-provisioned one, making it easy for a migration chain to accumulate this exact debt for a long time without any test ever catching it -- which is exactly why this fix pairs the migration with an automated, catalog-truth (`has_table_privilege()`) contract test on both replay backends, not just the migration file itself.
- Decision: `EXPLICIT_GRANT_CONTRACT_REQUIRED`. Additive-only (no `revoke`) specifically so re-running this migration against production -- which already has broader legacy default grants, including on `progression_events` -- is a safe no-op rather than a narrowing change; tightening production's existing (broader) grants was explicitly out of scope for this pass and would need its own separate, deliberate, reviewed migration. `progression_events` is the one deliberate deviation from a uniform "full CRUD everywhere" rule: its own RLS policies (`20260509113000_051_progression_events.sql`) only ever defined `select_own`/`insert_own`, with no update/delete-own policy ever authored, and no call site anywhere in `src/` issues an `.update()` against it -- granting `update` there would be capability added with no RLS backing and no demonstrated use, exactly the "broadened merely for symmetry" case this change was scoped to avoid. `delete` is still granted on `progression_events` (to both `authenticated` and `service_role`) because `src/lib/dal/routine-delete.ts`'s `deleteRoutineMutation` genuinely issues `.delete()` calls against it as the user's own session when a routine is removed; that grant is inert at the row level (RLS still returns zero affected rows, since no delete-own policy exists) but its absence would have turned a silent no-op (today's production behavior) into a hard `42501` in the clean environment this migration exists to unblock.
- Evidence: `supabase/migrations/20260806090000_explicit_fitness_data_api_grants.sql`'s own header comment (full audit trail: every `anon`/`authenticated`/`service_role` call site cited, cross-referenced against `create policy` statements across `supabase/migrations/*.sql`); local Supabase CLI stack privilege-matrix queries against `information_schema.role_table_grants`/`pg_roles`/`pg_namespace`/`has_table_privilege()` before and after the migration; `scripts/qa/fitness-codex-seed.mjs` (the deterministic QA seed whose service-role calls this migration unblocks); `scripts/migration/data-api-grants-contract.test.mjs` (3/3 passing on both PGlite and real Postgres, including the negative-revoke proof); `npm run test:migration-replay-clean`, `test:migration-replay-real-pg`, `test:migration-compare-replay-backends` (all green, chain head now this migration); a full local `supabase db reset` (all 105+1 migrations applied, post-reset ACL readback matched the expected matrix exactly, including the original failing operation -- `service_role` `SELECT` on `exercises` -- now granted); `npm run lint`, `npm run typecheck`, `npm run verify`, `npm run build` (all clean); `git diff --check` (clean).
- Status: Applied (migration is source-only until this repository's normal deploy path applies it to any real project; this task's own hard limits forbade touching production or any real Supabase project directly)

## 2026-08-04 - Centralize duplicated strength PR/best-set classification in exercise-info.ts onto the corrected negative-weight rule
- Type: Fix + Coverage
- WHAT changed: Re-proved `src/lib/exercise-stats-formatting.ts`'s `positive()` first -- it is a small, generic, zero-import display helper (duration/distance/pace/calories floor-to-zero) with no weight- or bodyweight-classification logic at all; it needed no change. The actual defect was in `src/lib/exercise-info.ts`: it already used the newly-fixed `pr-evaluator.ts` for its primary "N Rep PRs - N Weight PRs" badge, but independently reimplemented the same weighted-vs-bodyweight classification a 4th, 5th, 6th, and 7th time inline, for PR-row highlighting (`buildStrengthPrRowIds`), the detailed PR review-item list (`buildStrengthPrReviewItems`), the "best set" stat block, and each session's best-set/`bodyweightReps` computation -- none of which got the negative-weight exclusion. Extracted the shared, corrected classification logic into a new dependency-free module, `src/lib/exercise-strength-pr-summaries.ts` (`selectStrengthPrRowIds`, `buildStrengthPrReviewEvents`, `classifyStrengthBestSets`, `selectSessionBestRow`), reusing `pr-evaluator.ts`'s own `isInvalidWeight` guard (exported for this purpose) as the single authoritative "corrupted weight" rule instead of reimplementing it a 5th time. `exercise-info.ts`'s four call sites now delegate to it; formatting-only code (which needs `exercise-info.ts`'s own `formatWeightReps`/`formatDateShort`) stayed in place, fed by the new module's typed return values. An independent review of this change found a 5th, un-refactored site with the identical defect: `getExerciseInfoStats`'s `activeLastSet` (feeding the "Last" performance metric's `lastSummary` text and the history-chart `latestWeight` classification) was picked as `activeSortedRows[0]` with no invalid-weight exclusion, so a corrupted negative-weight set as a user's most recent logged set would still render as a bodyweight rep count in the "Last" stat. Fixed by changing `activeLastSet` to `activeSortedRows.find((row) => !isInvalidWeight(row.weight))`, reusing the same imported guard. Added `src/lib/exercise-strength-pr-summaries.test.ts` (15 tests): valid weighted set, valid bodyweight set, negative weight excluded entirely, an invalid row surrounded by valid rows, null/undefined/non-finite weight treated as bodyweight (not invalid) matching `pr-evaluator.ts`'s own boundary, zero/negative reps floored, chronological sort with no input mutation, determinism, and explicit agreement with `pr-evaluator.ts`'s `isInvalidWeight` boundary. Wired `test:exercise-strength-pr-summaries` following the existing narrow-named-script convention. (`activeLastSet`'s fix itself has no dedicated unit test -- `exercise-info.ts` remains untestable directly via `node --test`, and the fix is a one-line reuse of the already-tested `isInvalidWeight` predicate at a new call site.)
- WHY it changed: `exercise-info.ts` could not be unit-tested directly (`next/cache`, transitively via `@/lib/exercise-stats`) -- same testability constraint hit and solved the same way for `session-start-integrity.ts`/`session-start-activation.ts` in earlier waves: extract the pure logic into a sibling module with zero Next.js-request-scoped imports.
- Rule: when a fix lands in one authoritative helper (here, `pr-evaluator.ts`'s `isInvalidWeight`), grep every *other* place the same business rule might have been independently reimplemented before declaring the defect closed -- a duplicated rule left unfixed in even one of several parallel call sites still produces the exact user-visible defect the original fix was meant to close. This held even after the initial refactor: an independent reviewer, not the original grep pass, is what caught the 5th (`activeLastSet`) site -- a reminder that a self-reported "every call site" claim still needs an adversarial second pass before it's trusted.
- Failure Mode: without this change, a corrupted negative-weight set (which can only reach the database via the sign-unvalidated legacy-import bridge) would no longer trigger a spurious PR badge in the primary "N Rep PRs" count, but would still be highlighted as a PR row, listed in the detailed PR review list as a rep PR, could still win the exercise's "best set" stat block or a session's best-set summary, and -- if it happened to be the single most recent set logged for that exercise -- would still render as the "Last" performance metric's bodyweight rep count. Same user-visible defect class, five different UI paths instead of one.
- Decision: `NEGATIVE_WEIGHT_STATS_DEFECT` (in `exercise-info.ts`'s duplicated classification logic, not in `exercise-stats-formatting.ts` itself, which was `ALREADY_RESOLVED`/not applicable -- its `positive()` has no bodyweight-vs-corrupted-data ambiguity to resolve).
- Evidence: `grep -n "positive("  src/lib/exercise-info.ts` (30+ call sites, 5 genuine bodyweight-classification sites isolated across two review passes); reproduced the pre-fix defect empirically via a throwaway probe (`weight: -135, reps: 20` -> old `buildStrengthPrRowIds` credited it as a 20-rep bodyweight PR row); confirmed the new module correctly excludes it (empty result) across all four extracted functions; `npm run test:exercise-strength-pr-summaries` (15/15 pass); `npm run test:pr-evaluator` (17/17 pass, unaffected); `node --import ./scripts/register-test-aliases.mjs --test src/lib/exercise-stats-formatting.test.ts` (2/2 pass, unaffected, confirming that module needed no change); `node --import ./scripts/register-test-aliases.mjs --test src/lib/exercise-info-client.test.ts src/lib/exercise-info-history-axis.test.ts src/lib/exercise-info-history-layout.test.ts src/lib/exercise-info-history-metrics.test.ts src/lib/exercise-info-history-seed.test.ts` (25/25 pass, unaffected, re-run again after the `activeLastSet` fix); `src/lib/exercise-info.test.ts` still fails with the same pre-existing, unrelated `next/cache` module-resolution error it had before this change (not wired into any npm script; not a regression, reproduced identically on stashed origin/main HEAD by the independent reviewer); `npx tsc --noEmit` (clean, re-confirmed after the `activeLastSet` fix); `npm run lint` (clean, re-confirmed); `npm run build` (succeeds, re-confirmed); independent adversarial review (re-derived all claims from scratch, hand-traced 2 non-trivial cases, found the `activeLastSet` gap).
- Status: Applied

## 2026-08-12 - Contain BottomSheet keyboard focus and recover one transient official fallback transport closure

- Type: Accessibility and reliability fix
- WHAT changed: `BottomSheet` now keeps Tab and Shift+Tab navigation inside its dialog, restores focus to the opener after Escape or scrim close, and retains the existing scroll-lock, portal, and reduced-motion behavior. The Playbook official fallback downloader now makes at most one additional attempt for a recognized transient socket closure during fetch/body acquisition or for an official-fallback HTTP 502, 503, or 504 response.
- WHY it changed: A keyboard user could tab out of an open BottomSheet dialog. Separately, the exact Playbook verification artifact download encountered a transient socket closure; one bounded retry for that transport class and the narrowly recognized 502/503/504 response classes lets normal CI distinguish temporary availability loss from deterministic download or validation failure.
- Rule: Modal dialog focus must remain contained until the dialog closes. Official fallback acquisition may retry exactly once only for recognized transient transport failures or HTTP 502/503/504 responses; other HTTP failures, write failures, and empty-artifact validation failures remain terminal and visible.
- Failure Mode: Letting Tab escape a modal strands keyboard focus behind an active dialog. Treating every download failure as retryable can mask deterministic HTTP or artifact-integrity failure, while treating one temporary endpoint failure as terminal makes a healthy external artifact endpoint needlessly flaky.
- Decision: The retry budget is two total attempts and is deliberately limited to the named transient classes. The official URL, final URL reporting, non-OK HTTP handling outside 502/503/504, on-disk write, and nonempty-artifact validation semantics are unchanged. No provider, deployment, runtime execution, or production behavior changed.
- Evidence: `src/components/ui/BottomSheet.tsx`, `src/components/ui/BottomSheet.contract.test.ts`, `scripts/playbook-runtime.mjs`, `scripts/playbook-runtime.test.mjs`
- Status: Applied

## 2026-08-04 - Exclude corrupted negative-weight sets from PR evaluation instead of crediting a bodyweight PR
- Type: Fix + Coverage
- WHAT changed: `src/lib/pr-evaluator.ts`'s `evaluatePrSummaries` now skips a set entirely (via a new `isInvalidWeight` check) when its `weight` is a genuine negative finite number, rather than letting `normalizePositive` silently coerce it to `0` and route it into the bodyweight-reps PR lane alongside legitimate zero/null-weight sets. Added `src/lib/pr-evaluator.test.ts` coverage: a defect-reproduction test (a single `weight: -135, reps: 20` set used to produce a real `"1 Rep PR"` badge -- reproduced empirically against the pre-fix implementation before writing the fix), a test proving a corrupted set doesn't disturb PR evaluation for surrounding valid sets in the same exercise, and a test proving negative *reps* alongside valid weight still correctly credits a weight PR (documenting why reps normalization was deliberately left unchanged). Updated the existing "null, undefined, non-finite, and non-positive weight/reps" test to drop its negative-weight case (now covered by the dedicated tests) and keep only the still-accurate null/undefined/non-finite/negative-reps assertions.
- WHY it changed: traced every `weight` write path into the `sets` table. The live set-logging action (`src/app/session/[id]/actions.ts:385`) explicitly rejects `weight < 0` at the point of entry -- a negative weight can never be logged through the normal app UI. But the legacy-data-import bridge (`src/lib/migration/fitness-legacy-bridge.ts`'s `asNumber` helper) has no sign validation at all, and no database-level `CHECK` constraint exists on `sets.weight` either (confirmed via a full grep across `supabase/migrations/*.sql`) -- so a corrupted or malformed legacy export is the one real path by which a negative weight can reach the database. Once there, `pr-evaluator.ts` treated it identically to a genuine bodyweight set, silently manufacturing a real, user-visible "Rep PR" badge from a set that may actually have been a weighted set with a garbled weight field, with no way for the user to know their data was corrupted.
- Rule: normalizing an out-of-domain numeric input to a boundary value (here, negative weight -> `0`) is only safe when that boundary value is itself indistinguishable from a legitimate input -- `0` genuinely means "no added weight" for a real bodyweight exercise, but a negative number is never a real recorded value at all, so collapsing both into the same normalized bucket silently launders corrupted data into a valid-looking, user-visible result.
- Failure Mode: without this fix, any future legacy-import path (or a manually-edited/corrupted export file) that produced a negative `weight` value would continue to generate spurious "Rep PR" achievement badges on History and Exercise Info pages, indistinguishable from real personal records, with no signal to the user or any log that the underlying data was invalid.
- Decision: `NEGATIVE_WEIGHT_INPUT_DEFECT`. Bounded fix in `pr-evaluator.ts`'s weight-normalization boundary only; `reps` normalization is deliberately unchanged, since a corrupted negative `reps` value never independently produces a spurious badge (it is never read in the weight-PR lane, and floors to `0` in the bodyweight lane, which can never exceed a non-negative prior best -- proven by a dedicated regression test rather than assumed). No schema or migration change; no live data was queried or mutated.
- Evidence: `src/app/session/[id]/actions.ts:385` (`weight < 0` rejected at the live entry point); `src/lib/migration/fitness-legacy-bridge.ts`'s `asNumber` (no sign check on import); `supabase/migrations/*.sql` (grepped for a `sets.weight` `CHECK` constraint, found none); a throwaway probe against the real, unmodified pre-fix `evaluatePrSummaries` reproducing the exact spurious-badge output (`{ reps: 1, weight: 0, total: 1 }`, `bestBodyweightReps: 20`) for a single `weight: -135, reps: 20` set; `npm run test:pr-evaluator` (17/17 pass, up from 14); `node --import ./scripts/register-test-aliases.mjs --test src/lib/history-sessions-page-loader.test.ts` (adjacent consumer, 5/5 pass, unaffected -- every consumer already falls back to `EMPTY_PR_COUNTS` for a session/exercise absent from the result maps); `npx tsc --noEmit` (clean); `npm run lint` (clean).
- Status: Applied

## 2026-08-04 - Add regression coverage for personal-record (PR) evaluation and formatting
- Type: Coverage
- WHAT changed: Added `src/lib/pr-evaluator.test.ts` (14 tests) covering every exported function in `src/lib/pr-evaluator.ts`, which had zero test coverage despite being a dependency-free module imported by five real consumers (`src/app/history/session-summary.ts`, `src/app/history/[sessionId]/page.tsx`, `src/lib/exercise-info.ts`, `src/lib/exercises-browser.ts`, `src/lib/history-sessions-page-loader.ts`). Covers: `evaluatePrSummaries`'s weight-PR detection (strict improvement only, first positive-weight set is itself a PR), bodyweight/zero-weight rep-PR detection as an independent lane from weight PRs on the same exercise, null/undefined/`NaN`/negative weight-and-reps inputs normalizing to zero rather than throwing or miscounting, chronological re-sorting of out-of-order input by `performedAt` before evaluating PRs, `setIndex` as the tiebreaker for identical `performedAt` values, per-session count aggregation across multiple exercises and multiple sessions, the per-session PR-exercise `Set` deduplicating repeat PRs by the same exercise in one session, and an empty-input case; plus `formatPrBreakdown`'s empty-string/pluralization/ordering contract and the small `emptyPrCounts`/`incrementPrCount`/`EMPTY_PR_COUNTS` helpers. Wired a new `test:pr-evaluator` npm script following the existing narrow-named-script convention.
- WHY it changed: Every assumption above was empirically probed against the real, unmodified export via a throwaway script (`node --import ./scripts/register-test-aliases.mjs` against a dynamic import of the live module) before being written into a test, per this repo's established convention -- including the less-obvious cases (negative weight normalizing into the bodyweight-reps lane rather than being rejected, and same-timestamp `setIndex` tiebreaking). All behavior matched a coherent, defect-free contract; no fix was warranted.
- Rule: A pure, dependency-free module with multiple real production consumers and zero test coverage should not stay untested just because manual inspection doesn't turn up an obvious defect -- run the real code against edge cases first, and if it holds up, lock in the verified behavior with regression tests instead of leaving it unprotected.
- Failure Mode: A future refactor of the strict-improvement comparison, the chronological sort/tiebreak, or the per-session PR-exercise `Set` bookkeeping could silently start over- or under-counting PR badges shown in History and Exercise Info, with nothing catching it before a user noticed an incorrect PR count on their own logged sets.
- Decision: `MISSING_REGRESSION_COVERAGE_ONLY` -- test-only addition, no production behavior changed. Confirmed no path collision with open PR #126 or PR #147, and no session-start/Supabase-migration files touched.
- Evidence: `src/lib/pr-evaluator.ts`, `src/lib/pr-evaluator.test.ts`, `package.json` (`test:pr-evaluator`); throwaway probe script run against the real exports via `node --import ./scripts/register-test-aliases.mjs` before any test was written.
- Status: Applied

## 2026-08-04 - Author (not apply) a transactional RPC + partial unique index closing the session-start concurrency race
- Type: Source-only migration + adapter, not yet wired into production, not applied to any live database
- WHAT changed: Added `supabase/migrations/20260804000000_session_start_atomicity_v1.sql`, containing (1) `create unique index if not exists sessions_user_routine_active_uq on public.sessions (user_id, routine_id) where status = 'in_progress' and routine_id is not null` and (2) a new `security invoker` function `start_session_from_day_v1(p_routine_id, p_day_id, p_routine_name, p_routine_day_name, p_exercises)` that derives the caller's identity from `auth.uid()` (never a passed-in parameter), takes a per-user-per-routine advisory lock (`pg_advisory_xact_lock`, namespaced apart from `create_planner_routine_v1`'s own lock domain), re-validates routine/day ownership under the caller's own RLS, and inserts the session row plus every `session_exercises` row inside a single function invocation -- so a failure partway through rolls back everything automatically, with no manual rollback code required. A `unique_violation` caught mid-insert returns the concurrent winner's session id instead of a raw constraint error. Added `src/lib/session-start-atomicity.ts` (a dependency-free RPC-calling adapter mirroring `src/lib/dal/planner-routine-create.ts`'s calling convention) and `src/lib/session-start-atomicity.test.ts` (14 tests: 6 adapter-level tests against a fake RPC client covering success/existing/provider-error/thrown-error/malformed-response/empty-day cases, 7 migration-source-contract tests that `readFileSync` the raw SQL and assert its structural/security properties the same way `planner-routine-create.test.ts` already does for `create_planner_routine_v1`, and 1 test asserting `start-session.ts` does NOT yet reference the new RPC). Wired a new `test:session-start-atomicity` npm script.
- WHY it changed: The prior entry below fixed two silent-failure paths in the existing check-then-insert flow but explicitly left the real concurrency race open (`SESSION_START_PROVIDER_CONTRACT_HOLD`): two genuinely simultaneous legitimate requests can both pass the source-level existence check before either inserts, since nothing in the database enforces uniqueness. The partial unique index is the only unconditional fix -- it defends every write path (this RPC, a direct table insert, or any future code path), not just callers that remember to take a lock. The RPC on top of it gives atomicity for the session+exercises pair (no orphan session possible after a partial failure, superseding the need for the app-level rollback-then-check-the-result dance the prior entry added) and turns a lost race into a clean "return the existing session" response instead of a raw Postgres error reaching the user.
- Rule: A uniqueness invariant that must hold regardless of which code path performs the write belongs at the database level (a constraint or partial index), not only inside the one RPC/adapter that happens to check for it first -- an advisory lock or application-level check only serializes callers that explicitly participate in it.
- Failure Mode: Without the partial unique index, any future code path that inserts into `sessions` directly (bypassing this new RPC entirely, which RLS still permits) would silently reopen the exact race this migration exists to close, no matter how careful the RPC itself is.
- Decision: `INDEX_PLUS_TRANSACTIONAL_RPC_REQUIRED`. Deliberately source-only and NOT wired into `src/lib/start-session.ts`'s `createSessionFromDay` in this change -- switching that call site before this migration is actually applied to the live database would break session creation for every user in production the moment this code deployed. Activation is an explicit, separate follow-up: (1) apply this migration to the live database (needs its own provider authorization, not granted here), (2) only then, in a separate PR, switch `createSessionFromDay` to call `start_session_from_day_v1` instead of its current direct inserts. (The exact two-step plan is also written up in this wave's `FITNESS_SESSION_ATOMICITY_PROVIDER_PACKET.md` output, delivered alongside this PR rather than tracked in the repository itself.) No business logic (which exercises are runnable, goal-column derivation) was ported into SQL -- the RPC receives an already-validated, already-filtered exercise list from the same TypeScript logic (`buildCanonicalDaySummaries`, `getSessionStartErrorMessage`, `mapRoutineDayGoalToSessionColumns`) that runs today, avoiding a second, divergence-prone copy of that logic in plpgsql.
- Evidence: `supabase/migrations/20260804000000_session_start_atomicity_v1.sql`, `src/lib/session-start-atomicity.ts`, `src/lib/session-start-atomicity.test.ts`; `supabase/migrations/20260729000000_planner_persistence_adapter_v1.sql` (the `pg_advisory_xact_lock`/`security invoker`/revoke-grant precedent this migration follows); `src/lib/dal/planner-routine-create.ts` and its test file (the RPC-adapter and SQL-source-contract-test conventions this change mirrors).
- Status: Applied (source only -- migration not applied to any live database; production call site unchanged)

## 2026-08-04 - Fix session-start error handling that could produce or hide duplicate/orphaned sessions
- Type: Fix + Coverage
- WHAT changed: Extracted `findExistingInProgressSession` and `rollbackFailedSessionStart` from `src/lib/start-session.ts` into a new dependency-free module `src/lib/session-start-integrity.ts` (no `@/lib/auth`/Next.js-request-scoped imports, so it's directly unit-testable outside a request context), and fixed two error-handling defects: (1) `findExistingInProgressSession` previously swallowed its own query error and returned `null`, indistinguishable from "no session exists"; (2) the exercise-insert-failure rollback path deleted the just-created session row without checking whether the delete itself succeeded. Added `src/lib/session-start-integrity.test.ts` (7 tests) covering both functions directly with a hand-rolled fake Supabase client. Wired a new `test:session-start-integrity` npm script.
- WHY it changed: `findExistingInProgressSession` is the ONLY defense against creating duplicate in-progress sessions for the same user+routine -- there is no DB-level unique constraint on `sessions(user_id, routine_id, status='in_progress')` (confirmed via `grep` across `supabase/migrations/*.sql`). Silently treating a failed existence check as "no session found" meant a transient DB error during that check would let `createSessionFromDay` proceed to create a brand-new session anyway, producing a real duplicate. Separately, the rollback-delete's unchecked error meant that if the delete itself also failed after an exercise-insert failure, an empty, orphaned `in_progress` session row could remain -- and because it's `in_progress`, every future start attempt for that user+routine would find and return that broken zero-exercise session via `findExistingInProgressSession`, permanently blocking the user from starting a real workout for that routine until someone intervened directly in the database.
- Rule: A duplicate-prevention check's own failure path must fail closed (surface the error, refuse to proceed) rather than fail open (proceed as if the thing being checked for doesn't exist) -- especially when, as here, it is the sole defense with no redundant database-level constraint.
- Failure Mode: Both defects are silent under normal operation and only manifest under transient DB errors or partial failures -- exactly the conditions least likely to be caught by manual testing, and most likely to actually occur in production traffic at some rate.
- Decision: `ERROR_HANDLING_DEFECT`. Bounded fix in the two identified functions only; `createSessionFromDay`'s overall flow, `session_exercises` insertion logic, and the two public `startSessionForActiveRoutineDay`/`startSessionForRoutineDay` action contracts are otherwise unchanged.
- Separately flagged, not fixed here (`SESSION_START_PROVIDER_CONTRACT_HOLD`): the check-then-insert sequence in `createSessionFromDay` is not atomic, so two genuinely concurrent legitimate start requests (not just a query-error scenario) could still both pass the existence check before either inserts, producing two real in-progress sessions. Closing this fully requires a DB-level unique partial index on `sessions(user_id, routine_id) WHERE status = 'in_progress'` (or an RPC/transaction wrapping the check+insert), which is a migration decision out of scope for a source-only investigation.
- Evidence: `src/lib/session-start-integrity.ts`, `src/lib/session-start-integrity.test.ts`, `src/lib/start-session.ts` (now imports from the new module); `supabase/migrations/*.sql` (grepped for a uniqueness constraint on `sessions`, found none).
- Status: Applied

## 2026-08-04 - Fix array input silently producing numeric-keyed promotion-direction garbage
- Type: Fix + Coverage
- WHAT changed: Added a shared `isPlainRecord` guard (`value !== null && typeof value === "object" && !Array.isArray(value)`) to `src/lib/promotion-directions.ts`, replacing the `!input || typeof input !== "object"` check in both `unknown`-typed entry points, `normalizePromotionDirectionMap` and `normalizePromotionGroupedDirectionMap`. Added 4 new regression tests proving arrays, nested arrays, and other non-plain-object inputs (`Date`, primitives, functions) are now rejected, while genuine plain records still work.
- WHY it changed: `normalizePromotionGroupedDirectionMap` iterates `Object.entries(input)`, and `Object.entries` on an array yields numeric-string keys (`"0"`, `"1"`, ...) that pass the existing non-blank-key check exactly like a real measurement-group id (`"weight+reps"`) would. A JSON array of valid direction strings (e.g. `["up","down","straight"]`) therefore silently produced `{"0":"up","1":"down","2":"straight"}` instead of being rejected. This is reachable from real client-controlled input, not just theoretical: `src/lib/progression-playbooks.ts`'s `resolveConfiguredPromotionGroupedDirectionMap`/`resolveConfiguredPromotionDirectionMap` call these functions directly on `JSON.parse(formData.get("progressionPromotionGroupedDirectionMapJson"))` (and the ungrouped equivalent) inside a server action -- a client can submit any JSON-parseable text through that form field, including a JSON array. (`normalizePromotionDirectionMap`'s fixed-key iteration made it incidentally harmless against arrays already, since arrays don't carry `time`/`distance`/etc as own string-keyed properties, but it shared the same weak guard and got the same fix for a consistent, non-incidental contract.)
- Rule: A `typeof value === "object"` guard on `unknown`-typed input from a JSON/form/query boundary must explicitly reject arrays (`Array.isArray`) -- "typeof object" is not "plain record," and `Object.entries`/bracket-indexing on an array can silently produce well-formed-looking but semantically wrong output instead of failing closed.
- Failure Mode: A malformed or adversarial `progressionPromotionGroupedDirectionMapJson` form submission (a JSON array instead of an object) would silently create a grouped-direction map keyed by array indices, which could then be persisted or merged into a user's playbook config as garbage measurement-group entries, with nothing rejecting it before it reached storage.
- Decision: Bounded fix in `promotion-directions.ts` only. `buildPromotionDirectionFieldMap`/`buildPromotionGroupedDirectionFieldMap`/`serializePromotionDirectionFieldMap`/`serializePromotionGroupedDirectionFieldMap` were left unchanged -- their signatures accept already-typed `PromotionDirectionMap`/`PromotionGroupedDirectionMap` values (not `unknown`), so they are not themselves the untrusted-input boundary; fixing the two `normalize*` entry points closes the pipeline for every real caller. No change to the five-key overlay behavior from the prior entry below.
- Evidence: `src/lib/promotion-directions.ts`, `src/lib/promotion-directions.test.ts`; `src/lib/progression-playbooks.ts` lines ~2682-2701 (the `formData.get(...)` → `JSON.parse` → `resolveConfiguredPromotion*DirectionMap` boundary); reproduction run directly against the real exports both before and after the fix.
- Status: Applied

## 2026-08-03 - Add regression coverage for promotion-directions serialization helpers
- Type: Coverage
- WHAT changed: Added `src/lib/promotion-directions.test.ts` (17 tests) covering every exported function in `src/lib/promotion-directions.ts`, which had zero test coverage. Covers: the 4-key default map (and that it's a fresh object per call); `normalizePromotionDirectionMap`'s per-key validation and non-object/no-valid-entries handling; `buildPromotionDirectionFieldMap`'s overlay-onto-default behavior, including the non-obvious detail that its overlay loop iterates all 5 `PROMOTION_DIRECTION_KEYS` (not just the 4 keys the default map seeds) -- so a saved `calories` direction genuinely gets carried through even though the default omits `calories` entirely (verified by first writing the test assuming the opposite, watching it fail, and confirming the actual behavior against the real function rather than assuming); the analogous grouped-map variants (`normalizePromotionGroupedDirectionMap`, `buildPromotionGroupedDirectionFieldMap`, which have no fixed key set and no default seeding); and both serialization functions, including a round-trip check. Wired a new `test:promotion-directions` npm script following the existing convention.
- WHY it changed: A small, pure, hardcoded-key-list module used by both the progression-playbook form-state builder and the playbook editor defaults (`progression-playbook-form-state.ts`, `progression-playbooks.ts`) had no direct or indirect test coverage. Its per-field validation and default-overlay logic has real behavioral consequences for saved routine configuration, and the calories-key asymmetry between the default map and the overlay loop is exactly the kind of easy-to-get-wrong-when-refactoring detail that benefits from an explicit, named test.
- Rule: When writing a regression test for existing behavior, verify assumptions against the real function before asserting them -- a plausible-sounding assumption about scope (e.g. "the overlay loop is bounded by the default map's own keys") can be wrong in a way that only running the actual code reveals.
- Failure Mode: A future refactor of `buildPromotionDirectionFieldMap`'s overlay loop (e.g. "simplifying" it to iterate `Object.keys(nextMap)` instead of `PROMOTION_DIRECTION_KEYS`) would silently stop carrying through a saved `calories` direction, with nothing catching it before a user's saved calories-promotion setting silently reverted.
- Decision: Test-only addition; no production behavior changed.
- Evidence: `src/lib/promotion-directions.test.ts`, `package.json` (`test:promotion-directions`)
- Status: Applied

## 2026-08-03 - Fix custom set-flow role misclassification and reps="straight" not being honored
- Type: Fix + Coverage
- WHAT changed: In `src/lib/set-flow-targets.ts`'s `generateSetFlowTargets`, replaced the OR-based role-selection conditions (`directions.weight === "up" || directions.reps === "down"` and its mirror) with weight-priority conditions: an explicit `weight` direction always decides ramp vs. backoff/top_set; `reps` only decides the role when `weight` itself is `"straight"`. Also changed both role branches (and `resolveRepValue`/`interpolateReps`) to pass `directions.reps` through directly instead of collapsing it to a binary up/down choice, so a `reps: "straight"` configuration now genuinely holds reps constant across sets instead of silently ramping. Added an exhaustive weight x reps (3x3) table-driven test plus two targeted regression tests to `src/lib/set-flow-targets.test.ts` (13 tests total, up from 10; the file had zero prior npm-script wiring, now added as `test:set-flow-targets`).
- WHY it changed: Review of the set-flow-direction-asymmetry investigation (previous entry below) flagged that `set-flow-targets.ts`'s role-selection logic could misclassify non-canonical, user-customized direction combinations -- confirmed real and reachable via `ProgressionPlaybookEditor.tsx`'s per-field direction editors (`progressionSetFlowLoadDirection`/`progressionSetFlowRepDirection`, independently cycled and persisted, not limited to the two legacy presets). Ran the actual code across all 9 weight x reps combinations and found two real defects: (1) `weight: "down", reps: "down"` was labeled "Ramp" when load is actually decreasing -- should be "Backoff"/"Top set"; (2) `reps: "straight"` was never honored whenever weight was up/down -- reps silently ramped instead of staying constant. Both canonical legacy presets (`ascending_ramp`, `descending_backoff`) were already correct and are unchanged by this fix; verified via the existing `set-flow-targets.test.ts` suite (all 10 pre-existing tests still pass unmodified) plus a full before/after matrix re-run.
- Rule: When role/label selection depends on multiple independently-configurable direction fields, treat the training-domain-primary field (load/weight) as authoritative, and never derive a secondary field's own generated values (reps) from anything other than that field's own configured direction.
- Failure Mode: A user building a custom set-flow (weight decreasing, reps also decreasing -- e.g. a fatigue-driven backoff) would see their sets labeled "Ramp" instead of "Backoff", and a user explicitly configuring "keep my reps constant" while ramping weight would see their reps quietly change every set instead of staying fixed -- both silently wrong, not caught by any existing test (which only covered the two legacy presets and default/straight case).
- Decision: `CUSTOM_ROLE_CLASSIFICATION_DEFECT` -- bounded fix in `set-flow-targets.ts` only. No change to `SetFlowDirectionConfig`'s shape, no persisted-value migration needed (this only changes how already-stored per-field directions are interpreted going forward, not what's stored), no UI change.
- Evidence: `src/lib/set-flow-targets.ts`, `src/lib/set-flow-targets.test.ts`, `package.json` (`test:set-flow-targets`); reproduction script run via `node --import ./scripts/register-test-aliases.mjs` against the real `generateSetFlowTargets` export, both before and after the fix.
- Status: Applied

## 2026-08-03 - Resolve set-flow direction asymmetry follow-up: reps inversion is intentional
- Type: Investigation + Coverage
- WHAT changed: Added a WHY comment above the `ascending_ramp`/`descending_backoff` cases in `getSetFlowDirectionConfigForLegacySetFlow` (`src/lib/set-flow-directions.ts`), and added `src/lib/set-flow-directions.test.ts` (18 tests, previously zero direct coverage for this module -- only `cycleSetFlowDirection`/`normalizeSetFlowDirectionForStepValue` had indirect coverage via `progression-playbook-form-state.test.ts`). Covers: both legacy presets' exact field values; `straight_sets`/unknown/undefined/null all resolving to the all-straight default; `inferLegacySetFlowFromDirections` being the exact inverse of the forward mapping for all three presets (round-trip); an explicit guard that a partial match (same weight/reps relationship, different time/distance) does not get misclassified; `normalizeSetFlowDirectionConfig`'s per-field fallback behavior (including falling back to a caller-supplied config, not just the global default); `hasSetFlowDirectionStepValue`'s whitespace/`-`-placeholder handling; the already-partially-tested `cycleSetFlowDirection`/`normalizeSetFlowDirectionForStepValue` asymmetric-cycling behavior (re-asserted here directly against the module, not just through the form-state layer); and `areSetFlowDirectionsStraight`/`isSetFlowDirection`/`shouldShowEffortShiftLabel`. Wired a new `test:set-flow-directions` npm script following the existing convention.
- WHY it changed: A prior wave flagged the reps-vs-time/distance/weight inversion in `getSetFlowDirectionConfigForLegacySetFlow` as a possible asymmetry defect. Investigation (git history, the round-trip inverse function, and the actual set-generation consumer in `src/lib/set-flow-targets.ts`) confirms this is intentional, domain-correct resistance-training logic: an ascending ramp adds load/duration/distance each set while shedding reps (a classic pyramid scheme), and descending backoff is its mirror image. `inferLegacySetFlowFromDirections` already implements the exact matching inverse for both presets. No defect exists, but the module had zero direct test coverage, leaving the intentional design undocumented and unprotected against a future "fix" that would break real behavior for any routine day using either legacy set-flow preset.
- Rule: An apparent per-field asymmetry in a direction/mapping helper is not automatically a bug -- check whether the domain itself requires an inverse relationship (as here: more load correctly means fewer reps) before "symmetrizing" it.
- Failure Mode: A future change that made `reps` track `weight`/`time`/`distance` in the same direction, believing it was fixing an inconsistency, would silently invert the ramp/backoff behavior for every user whose routine relies on the legacy `ascending_ramp`/`descending_backoff` set-flow presets.
- Decision: `ASYMMETRY_INTENTIONAL` -- no production behavior changed. Comment + regression tests only, same pattern as the prior exercise-id-alias-integrity finding.
- Evidence: `src/lib/set-flow-directions.ts` (comment), `src/lib/set-flow-directions.test.ts`, `src/lib/set-flow-targets.ts` (consumer proving the inversion is honored consistently), `package.json` (`test:set-flow-directions`)
- Status: Applied

## 2026-08-03 - Add regression coverage for ordered-position insert retry logic
- Type: Coverage
- WHAT changed: Added `src/lib/ordered-position-insert.test.ts` (10 tests, using a hand-rolled fake Supabase query builder following the existing `account-workout-export.test.ts` mocking convention -- no live database, no mocking framework) covering `insertRoutineDayExerciseAtEnd`/`insertSessionExerciseAtEnd` (thin wrappers around the shared `insertOrderedRowAtEnd`): position computed as 0 for an empty scope, position computed as one past the current max, the position read is correctly scoped to both the scope column and `user_id`, a unique-violation (`23505`) triggers a retry with a freshly re-read position (not a stale cached one), any other error code fails fast without retrying, the retry loop stops at exactly its documented 5-attempt ceiling, a position-read error short-circuits before any insert is attempted, the no-`select` fire-and-forget insert path works, and caller-supplied values are merged with the computed position rather than overwritten. Wired a new `test:ordered-position-insert` npm script following the repo's existing narrow-named-script convention.
- WHY it changed: `ordered-position-insert.ts` had zero test coverage (direct or indirect) despite implementing a bounded-retry, race-condition-aware append operation used by three real server actions (`src/app/actions/history.ts`, `src/app/routines/[id]/edit/day/actions.ts`, `src/app/session/[id]/actions.ts`) that insert routine-day and session exercises. A silent regression here (wrong retry bound, retrying on the wrong error code, not re-reading position on retry, or clobbering caller values) would surface as duplicate/skipped exercise positions or dropped exercises in real user routines and sessions.
- Rule: A retry-on-conflict loop with a hardcoded attempt ceiling and an error-code branch should never ship with zero test coverage, since its failure modes (wrong bound, wrong branch, stale re-read) are exactly the kind of thing that looks correct on the happy path and breaks silently under concurrent writes.
- Failure Mode: A future edit to the unique-violation check, the retry ceiling, or the position-read query could silently start duplicating exercise positions or dropping exercises under concurrent edits, with nothing catching it before a user noticed corrupted routine/session ordering.
- Decision: Test-only addition; no production behavior changed. No changes to any other planner/monetization/auth surface. Confirmed no path collision with open PR #126.
- Evidence: `src/lib/ordered-position-insert.test.ts`, `package.json` (`test:ordered-position-insert`)
- Status: Applied

## 2026-08-03 - Resolve alias-integrity follow-up: mapping is an intentional Supabase/catalog id bridge
- Type: Investigation
- WHAT changed: Added a WHY-only comment to `src/lib/exercise-id-aliases.ts` explaining the alias table's target id. No behavior change.
- WHY it changed: The 2026-08-03 coverage entry below flagged that the alias table maps `de1f9f53-120f-4f4e-88b4-bd30f6ce1240` (the current `EXERCISE_OPTIONS` Pull-Up id) to `2466d550-004f-4b94-af04-26ae24f990b3`, which is absent from `EXERCISE_OPTIONS` and looked like a possible bug. Git archaeology resolves this: commit `923c01bc` renumbered Pull-Up's `EXERCISE_OPTIONS` id from `66666666-6666-6666-6666-666666666666` to `de1f9f53-...`; one day later commit `76c50ea8` ("Fix Exercise Info to use canonical exercise ids for stats lookups", see `docs/CHANGELOG.md`) added `de1f9f53-...` itself as a second alias source, both pointing at `2466d550-...`. That id has never appeared in `EXERCISE_OPTIONS`, any Supabase migration, or `seed.sql` in this repo's full history -- it is the Supabase `exercises.id` (a database identity that stats/routine rows reference) and is deliberately decoupled from the human-maintained `EXERCISE_OPTIONS` catalog id, which the developer has renumbered at least twice. Retargeting the alias to `de1f9f53-...` (its own key) would strand any routine-day/stats row still keyed on the DB's actual canonical id.
- Rule: An `EXERCISE_OPTIONS` id and a Supabase `exercises.id` are different identity spaces that can diverge after a catalog renumbering; do not assume an alias target is wrong just because it is absent from `EXERCISE_OPTIONS`.
- Failure Mode: "Fixing" this mapping to make both id spaces agree, without confirming the live Supabase row id, would silently break stats/history lookups for existing users -- a regression worse than the confusing-looking mapping it would "fix".
- Decision: `MIGRATION_COMPATIBILITY_REQUIRED` -- no production mapping change. Source-only investigation cannot confirm the live Supabase id (out of scope per this task's authority); the comment and this note capture the reasoning for future readers instead.
- Evidence: `src/lib/exercise-id-aliases.ts` (comment), commits `923c01bc`, `76c50ea8`, `docs/CHANGELOG.md` "Fix Exercise Info to use canonical exercise ids for stats lookups" entry.
- Status: Applied

## 2026-08-03 - Add regression coverage for exercise legacy-alias resolution
- Type: Coverage
- WHAT changed: Added `src/lib/exercise-id-aliases.test.ts` (12 tests) covering `resolveCanonicalExerciseId` and `isKnownLegacyExerciseId`: known legacy alias resolution (both current alias entries), non-aliased and unknown ids passing through unchanged, whitespace trimming on both functions, and an explicit guard that an alias's canonical target is not itself misclassified as "known" merely because it's an alias value. Wired a new `test:exercise-id-aliases` npm script following the repo's existing narrow-named-script convention.
- WHY it changed: `resolveCanonicalExerciseId`/`isKnownLegacyExerciseId` had zero test coverage despite being imported by 7 production files, including a public API route (`src/app/api/exercise-info/[exerciseId]/route.ts`), the legacy-data migration bridge (`src/lib/migration/fitness-legacy-bridge.ts`), and the runnable-day validity gate (`src/lib/runnable-day.ts`). A 2-entry hardcoded alias table with real behavioral consequences (a wrong resolution silently breaks a user-facing exercise lookup or blocks a valid session day) was going untested.
- Rule: A small hardcoded identity-remapping table consumed by a public API route and a data-migration path should never ship with zero test coverage, regardless of how small the module is.
- Failure Mode: An edit to the alias table (adding/removing/retargeting an entry) or a refactor of the trim/lookup logic could silently break exercise-info lookups or migration id resolution with nothing catching it before a user noticed.
- Decision: Test-only addition; no production behavior changed. No changes to any other planner/monetization/auth surface.
- Follow-up observation (not fixed here, flagged for separate review): the alias table currently maps `de1f9f53-120f-4f4e-88b4-bd30f6ce1240` (Pull-Up, a real live `EXERCISE_OPTIONS` entry) to `2466d550-004f-4b94-af04-26ae24f990b3`, a non-catalog id. The new tests lock in this actual current behavior rather than silently changing it, since remapping a live catalog id looks like it may be an unintended latent bug -- resolving that is a product/data decision, not a test-coverage change.
- Evidence: `src/lib/exercise-id-aliases.test.ts`, `package.json` (`test:exercise-id-aliases`)
- Status: Applied

## 2026-08-01 - Host the auth and design-system contracts in CI
- Type: Guardrail
- WHAT changed: Added `.github/workflows/auth-design-system-contracts.yml`, a dedicated workflow triggered on `pull_request` and `push` to `main` with precise path filters, that runs `npm ci` then `npm run test:auth-ui-contracts` and `npm run test:design-system-contract` directly. Added `tests/auth-design-system-contracts-workflow.test.mjs`, a source-text structural policy test (following the `rank.test.ts` / `planning-ranking-contract.yml` convention) proving the workflow exists, both triggers watch every required dependency path with no overly broad substitute, both contract commands are invoked, `npm ci` is used, and the workflow stays single-job, read-only, and free of `workflow_dispatch`/secrets/deploy steps.
- WHY it changed: The 2026-08-01 auth-UI-contract repair and design-system-contract repair (see the two entries below) made `test:auth-ui-contracts` and `test:design-system-contract` truthful and green, but neither command was invoked by any GitHub Actions workflow. A locally-honest contract with no hosted enforcement can silently regress again with nothing catching it.
- Rule: A contract command is not durably trustworthy until a hosted workflow runs it on every pull request and every push to `main`, and until a structural test proves that workflow cannot be silently narrowed (dropped command, dropped path filter) without failing its own policy test.
- Failure Mode: Treating a green local script as sufficient proof, when no CI job actually invokes it, leaves the repository able to drift back to the exact silent-skip or orphaned-token failures these two contracts exist to catch.
- Decision: New workflow file plus one new policy test only; no changes to `.github/workflows/ci.yml` (owned by open PR #98) or `package.json` (owned by open PR #101).
- Evidence: `.github/workflows/auth-design-system-contracts.yml`, `tests/auth-design-system-contracts-workflow.test.mjs`
- Status: Applied

## 2026-08-01 - Remove orphaned routine editor design tokens
- Type: Cleanup
- WHAT changed: Removed three design-token constants from `src/components/ui/app/tokens.ts` -- `routineEditorLinkAction`, `routineEditorHelperText`, and `routineEditorDayList` -- along with their backing className definitions in `src/components/ui/app/designSystem.ts` (`routineEditorLinkActionClassName`, `routineEditorHelperTextClassName`, `routineEditorDayListClassName`).
- WHY it changed: The 2026-08-01 "Remove unreachable EditRoutineDaysSection dead code" entry deleted `EditRoutineDaysSection.tsx`, which was the only consumer of these three tokens. Independently re-verified here via full-repo grep (not just `src/`) for each of the three token names and their backing className names: the only hits for each were its own definition line in `tokens.ts` and its own backing className line in `designSystem.ts` -- no static import, destructure, computed/string property access, dynamic token-enumeration helper, type-level `Pick<...>` reference, test, snapshot, or Storybook file (none exist in this repo) referenced any of the three. `appTokens` and `fitnessDesignPrimitiveClassNames` are both plain object literals with no exported type alias or `satisfies` contract, and no generic reflection (`Object.keys`/`Object.entries`/`for...in`) over either object exists anywhere in the repo, so there is no generic token-enumeration validator that would need updating.
- Rule: A design-token constant with zero references anywhere in the repo outside its own definition and its own backing className is dead and safe to delete alongside its backing className in the same change; before deleting, grep the full repo (not just `src/`) for both the token name and its backing className name independently, and check for computed access, type-level key references, and any generic contract test that enumerates token/className keys reflectively.
- Failure Mode: Deleting a design token without independently re-verifying reachability (rather than trusting an inherited "no consumer" claim) risks removing a token that is reached through a path a simple static grep can miss, such as computed property access, a generic enumeration-based contract test, or a type-level `Pick<>` reference.
- Decision: This is deletion-only in `tokens.ts` and `designSystem.ts`; no other consumer, component, or test needed changes because none referenced these three tokens. No Edit Routine, Today, or Routine Overview behavior changed.
- Evidence: `src/components/ui/app/tokens.ts`, `src/components/ui/app/designSystem.ts`
- Status: Applied

## 2026-07-28 - Planner catalogs must freeze executable semantics before routine generation
- Type: Pattern
- WHAT changed: The curated-planning foundation now includes a source-only, semantically digested exercise catalog with exact equipment capabilities, frozen restriction and prescription policies, reviewed same-movement substitutions, closed runtime validation, and structured compatibility results.
- WHY it changed: Deterministic routine generation cannot safely rank or substitute exercises while equipment classes, safety exclusions, progression support, and substitution equivalence remain implicit or mutable.
- Rule: A planner may consume only a catalog that passes closed validation and semantic-digest recomputation; active exercises require approved safety metadata, exact equipment requirements, derived restriction exclusions, and supported prescription modes.
- Rule: Equipment and safety constraints remain hard filters before ranking. Substitution metadata must preserve movement semantics and must be re-filtered against the same equipment, experience, and restriction constraints.
- Pattern: canonical exercise reference -> reviewed executable metadata -> frozen policy validation -> semantic digest -> structured compatibility or infeasibility -> later coverage compiler and planner.
- Failure Mode: Coarse equipment widening, mutable safety classifications, fabricated starting loads, or unchecked substitutions can make a deterministic planner reproducibly unsafe.
- Evidence: `src/features/curated-onboarding/planning/catalog/contract.ts`, `src/features/curated-onboarding/planning/catalog/catalog.ts`, `src/features/curated-onboarding/planning/catalog/validate.ts`, `src/features/curated-onboarding/planning/catalog/catalog.test.ts`, `.github/workflows/ci.yml`, `docs/curated-planning-contract.md`
- Status: Proposed

## 2026-07-27 - Installation is an earned or explicit action, never an app-entry gate
- Type: Guardrail
- WHAT changed: Normal root, login, signup, password recovery, and reset entry no longer redirect through the install guide; the complete install presentation remains available at `/install`, and earned prompts remain on post-value app surfaces.
- WHY it changed: An aggregate review checkpoint reintroduced install-first routing after the earned-install contract had already removed it, causing visible install-screen flicker, slower app entry, and browser users being blocked behind a presentation they did not request.
- Rule: App and authentication entry must render or hand off directly without visiting `/install`; install UI may appear only from an explicit install route or a capability-aware earned prompt.
- Pattern: root -> authenticated entry resolver -> app or login, with explicit `/install` and earned promotion remaining independent.
- Failure Mode: Reusing the install guide as a routing gate makes a valid presentation behave like a startup regression and obscures the actual app while hydration redirects settle.
- Evidence: `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/components/install/ProtectedAppInstallGate.tsx`, `src/lib/install/config.test.ts`
- Status: Proposed

## 2026-07-24 - Curated onboarding screens should keep shared, reviewable progress contracts while allowing safe in-progress navigation
- Type: Pattern
- WHAT changed: Curated onboarding now treats selected sections and required controls as completion status indicators, allows page navigation with explicit incomplete-state highlighting, and updates review/dropdown visibility and button/label UX while preserving the stricter "complete" contract when review-ready handoff is attempted.
- WHY it changed: The onboarding flow needed clearer user feedback and less rigid gating for exploratory edits, plus consistent completed/incomplete state surfacing across section summaries and in-page controls.
- Rule: Required onboarding responses should still be enforced before Review advancement, but the screen should explicitly mark incomplete inputs and pages instead of blocking all forward navigation.
- Pattern: shared selector-derived progression state + section completion indicators + deterministic malformed-response filtering + explicit review-safe advancement checks.
- Evidence: `src/app/curated-onboarding/page.tsx`, `src/app/dev/curated-onboarding/page.tsx`, `src/app/routines/CreateRoutineClient.tsx`, `src/app/routines/CreateRoutineRouteHeader.contract.test.ts`, `src/app/routines/RoutinesPageClient.contract.test.ts`, `src/app/routines/RoutinesPageClient.tsx`, `src/app/routines/page.tsx`, `src/features/curated-onboarding/components/ConstraintsStep.tsx`, `src/features/curated-onboarding/components/CuratedIntroStep.tsx`, `src/features/curated-onboarding/components/CuratedOnboardingPrimitives.tsx`, `src/features/curated-onboarding/components/CuratedOnboardingProgress.tsx`, `src/features/curated-onboarding/components/CuratedOnboardingShell.tsx`, `src/features/curated-onboarding/components/EquipmentStep.tsx`, `src/features/curated-onboarding/components/ExperienceStep.tsx`, `src/features/curated-onboarding/components/GenerationHandoffStep.tsx`, `src/features/curated-onboarding/components/GoalsStep.tsx`, `src/features/curated-onboarding/components/PreferencesStep.tsx`, `src/features/curated-onboarding/components/QuestionnaireStep.tsx`, `src/features/curated-onboarding/components/ReviewStep.tsx`, `src/features/curated-onboarding/components/ScheduleStep.tsx`, `src/features/curated-onboarding/constants.ts`, `src/features/curated-onboarding/engine.test.ts`, `src/features/curated-onboarding/engine.ts`, `src/features/curated-onboarding/fixtures.ts`, `src/features/curated-onboarding/questionnaire.test.ts`, `src/features/curated-onboarding/questionnaire.ts`, `src/features/curated-onboarding/schema.ts`, `src/features/curated-onboarding/selectors.test.ts`, `src/features/curated-onboarding/selectors.ts`, `src/features/curated-onboarding/step-registry.ts`, `src/features/curated-onboarding/storage.test.ts`, `src/features/curated-onboarding/storage.ts`, `src/features/curated-onboarding/types.ts`, `tailwind.config.ts`, `tests/curated-onboarding-ui-contract.test.mjs`, `docs/CHANGELOG.md`
- Status: Proposed
## 2026-07-14 - Explicit deployment classification must outrank the CI execution context
- Type: Guardrail
- WHAT changed: Atlas health contracts now classify explicit Vercel production and preview values before the inherited CI execution signal.
- WHY it changed: GitHub Actions runs with `CI=true`; treating that runner context as the highest-priority environment caused production and preview contract fixtures to be misclassified as CI even when they intentionally set Vercel deployment values.
- Rule: Runtime deployment classification should prefer explicit deployment metadata over the fact that the current process is executing in CI.
- Evidence: `src/lib/atlas-contracts.ts`, `src/lib/atlas-contracts.test.ts`, hosted Atlas contracts run `29355735323`.
- Status: Proposed

## 2026-06-28 - Compact mobile routine and exercise cards should share the same title-width and goal-summary contracts
- Type: Pattern
- WHAT changed: The mobile routine browse cards, workout-plan cards, day recap tiles, Today rows, and session exercise cards were tightened onto the same compact spacing rules by shrinking right-edge chrome padding, rebalancing compact title/right-rail layout, and updating the regression fixture route to use shared formatted goal-summary text instead of hand-written strings.
- WHY it changed: The previous mobile surfaces were drifting apart in how much width the title column actually kept once chevrons, info buttons, and delete pills were present, which caused avoidable truncation pressure and made regression captures prove a looser mock contract than the real app surfaces.
- Rule: Compact routine and exercise cards should reserve only the padding required by their right-edge controls and should not hide title width behind inconsistent per-screen chrome offsets.
- Rule: Mobile regression fixtures should generate target/goal copy through the shared measurement-display formatter so proof screens match production cards when spacing or wrapping is reviewed.
- Pattern: shared compact title shell + shared right-edge chrome spacing + shared formatted goal-summary fixtures + route-aware mobile regression proof.
- Failure Mode: Screen-local spacing and mock-only summary strings make routine cards, Today cards, and session cards drift into different truncation, wrapping, and proof behavior even when they are supposed to represent the same compact card family.
- Evidence: `src/app/dev/mobile-regression/DevMobileRegressionRoute.tsx`, `src/app/routines/RoutinesPageClient.tsx`, `src/app/routines/WorkoutPlansPageClient.tsx`, `src/app/today/TodayExerciseRows.tsx`, `src/components/SessionExerciseFocus.tsx`, `src/components/day-list/RoutineDayCardPresentation.tsx`, `src/components/routines/RoutineBrowseCard.tsx`, `src/components/workout/ExerciseCardStandardTitle.tsx`, `src/components/workout/ExerciseCardSurfaceChrome.ts`
- Status: Proposed

## 2026-06-26 - UI mutation passes should use checklist-first normalization and bounded data lanes
- Type: Pattern
- Summary: Fitness UI work is more reliable when every explicit edit request is turned into a checklist, the canonical surface is patched first, and mutable QA runs stay on bounded fixture or automation-user lanes instead of drifting through live user data.
- Rule: Explicit UI edit requests should be tracked item-by-item through implementation and closeout.
- Rule: Shared card and screen families should be normalized from the source presentation path, not by sibling one-off patches.
- Rule: Live-user routine or session data should be touched only when the bug itself depends on that state, and any bounded mutation must be restored or reported.
- Pattern: requested-edit checklist -> canonical surface selection -> patch -> multi-surface proof -> checklist reconciliation -> closeout.
- Failure Mode: missed edits, sibling drift, and accidental data churn keep recurring when UI work is driven by memory and ad hoc screen pokes instead of a governed mutation loop.
- Status: Proposed

## 2026-06-15 - Routine template flows should share routine-home, duplicate, and workout-plan creation contracts
- Type: Pattern
- WHAT changed: The routine template overhaul now pushes routine home, new routine duplication, and per-day workout-plan creation through shared browse-card, day-snapshot, and creation-helper contracts so routines and workout plans can be copied, reordered, and edited without each route inventing separate card markup, naming, or navigation behavior.
- WHY it changed: The feature work expanded routine setup, duplicate-source picking, inactive routine actions, and empty-day creation at the same time, which made the routine family prone to UI drift and duplicate ownership bugs unless those surfaces kept reusing the same preview depth, creation rules, and overlay shells.
- Rule: Inactive routine selection, duplicate-source selection, and routine-home preview cards should reuse the same browse-card primitives with context-specific preview depth instead of separate card implementations.
- Rule: New routine, new day, and duplicate workout-plan flows should create fresh routine-owned records, preserve reusable plan content, and avoid carrying active-state or logged-session ownership into duplicates.
- Rule: Routine progression, session settings, and info overlays should stay on the same dropdown and overlay shells used by routine setup so the workflow reads as one editor instead of stacked mini-systems.
- Pattern: shared routine browse card + shared day snapshot presentation + shared routine/day creation helpers + route-specific action wiring.
- Failure Mode: Splitting routine-template flows into screen-local card formats, duplicate record logic, or navigation rules causes routine home, duplicate setup, and workout-plan editing to drift and makes template reuse unsafe.
- Evidence: `src/app/routines/CreateRoutineClient.tsx`, `src/app/routines/CreateRoutineDayClient.tsx`, `src/app/routines/RoutineHomeClient.tsx`, `src/components/routines/RoutineBrowseCard.tsx`, `src/components/day-list/RoutineDayCardPresentation.tsx`, `src/lib/routine-copy-name.ts`, `src/lib/routine-copy-name.test.ts`, `src/lib/routine-day-creation.ts`, `src/lib/routine-copy-rollback.ts`, `src/components/routines/ProgressionPlaybookEditor.tsx`
- Status: Proposed

## 2026-06-10 - Feedback board roadmap sequencing should use explicit dependency metadata
- Type: Pattern
- Summary: Feedback board cards that represent sequenced roadmap work should store explicit card ids, bounded priorities, rollout phases, and dependency links so Discord starter posts, board exports, and reviewed task packets all preserve the same execution order.
- Rule: Use explicit `card_id`, `card_phase`, `card_priority`, `depends_on`, and `dependency_notes` metadata instead of hiding sequencing in freeform notes.
- Rule: Reviewed task packets must reject unresolved dependencies, ambiguous title fallbacks, self-dependencies, and simple cycles before implementation work starts.
- Pattern: bounded feedback row metadata -> forum card metadata lines -> export-time dependency validation -> reviewed task packets that preserve phase order and blocked follow-on cards.
- Failure Mode: Letting roadmap sequencing live only in prose or auto-grouped packets causes follow-on work to start early and makes board exports lose the real dependency order.
- Evidence: `src/lib/discord/bug-reports.ts`, `scripts/feedback-card-metadata.mjs`, `scripts/export-feedback-board.mjs`, `scripts/generate-feedback-task-packets.mjs`, `docs/ops/FITNESS-FEEDBACK-BOARD.md`, `docs/ops/FITNESS-DISCORD-FEEDBACK.md`
- Status: Proposed

## 2026-06-02 - Progression v2 exercise surfaces should reuse shared display and gating contracts
- Type: Pattern
- Summary: Routine, Edit Day, Add Exercise, and Today progression surfaces should derive visible measurements, review labels, day-card summaries, and status rails from shared progression contracts instead of screen-local formatting or gating rules.
- Rule: Exercise progression UI should hide or show sections from the current active measurement inputs, not stale broad defaults.
- Rule: Today review strips should format targets and action semantics through the shared progression review display path.
- Rule: Routine and Today switch-day cards should reuse the same closed-card presentation path so status, sizing, and summary behavior stay aligned.
- Pattern: shared progression review loader/display + shared routine day card presentation + screen-specific composition only where context actually differs.
- Failure Mode: Screen-local copies drift into outdated labels, wrong measurement sets, stale action semantics, and card layout mismatches that regress independently.
- Evidence: `src/app/today/TodayDayPicker.tsx`, `src/app/today/page.tsx`, `src/app/routines/RoutinesPageClient.tsx`, `src/app/routines/page.tsx`, `src/components/day-list/RoutineDayCardPresentation.tsx`, `src/lib/progression-review-display.ts`, `src/lib/routines.ts`
- Status: Proposed

## 2026-06-01 - Local release-readiness proof should preserve stable generated build artifacts
- Type: Pattern
- Summary: Local Fitness release-readiness proof should reuse the current app build manifest and service worker bytes when deployment metadata is unchanged so visual and release checks do not create no-op generated drift on every run.
- Rule: Local proof runs should not rewrite `src/generated/appBuildManifest.json` or `public/sw.js` unless the effective build identity actually changed.
- Rule: When no deployment commit or deployment id is present, local manifest generation may preserve the current manifest or fall back to a stable local build id instead of timestamp churn.
- Pattern: read existing manifest -> derive deployment-backed identity when available -> otherwise preserve stable local identity -> regenerate service worker only when source bytes change -> rerun readiness proof.
- Failure Mode: Timestamp-only build artifact rewrites make the worktree dirty, hide real readiness blockers behind generated noise, and break release-gate preservation checks.
- Evidence: `scripts/generate-app-build-manifest.mjs`, `scripts/generate-service-worker.mjs`, `src/generated/appBuildManifest.json`, `public/sw.js`
- Status: Proposed

## 2026-05-22 - Fitness migration readiness should preserve exact remote versions and use local-only linked DB secrets
- Type: Guardrail
- Summary: When the linked Fitness migration chain is validated locally, the repo should preserve the exact remote migration version instead of a local timestamp alias, and standalone validation may load `SUPABASE_DB_PASSWORD` from the documented local-only secret lane when the shell does not already provide it.
- Rule: If local and remote migration SQL are the same but the version differs, restore the exact remote version locally instead of carrying a new alias.
- Rule: Linked migration validation may read `secrets/local/fawxzzy-fitness-prod-db.env` for `SUPABASE_DB_PASSWORD`, but that secret must stay local-only and uncommitted.
- Pattern: inspect linked drift -> prove SQL equivalence -> restore exact remote version -> load local-only DB password for dry-run validation -> rerun migration and release readiness.
- Failure Mode: carrying a local migration alias or relying on ad hoc shell secrets keeps `migration:validate` red even when schema truth is already aligned.
- Status: Proposed
## 2026-05-19 - Public completed phase cards need visible resolved state before the next phase starts
- Type: Guardrail
- Summary: A public phase card is not fully done until it is fixed or completed, completion-review approved, and visibly reacted with the configured success reaction on the starter post.
- Rule: Do not advance to the next phase until the previous public phase card shows the resolved success reaction (`fawxzzy:1507384062166302851`).
- Pattern: status fixed/completed -> completion review approved -> starter post success reaction -> next phase may start.
- Failure Mode: Starting the next phase before the previous card visibly closes weakens board trust and makes shipped scope look incomplete.
- Status: Proposed

## 2026-05-18 - Completed Fitness feedback cards need post-completion review
- Type: Guardrail
- Summary: Fitness app cards marked Fixed or Completed should enter a post-completion review queue so shipped work is checked against card acceptance criteria before being treated as fully closed.
- Rule: Completion Review is required after Fitness app work is marked done.
- Rule: Ready for Fawxzzy Review is optional before work starts.
- Pattern: implementation shipped -> card fixed/completed -> completion review queue -> approved or follow-up.
- Failure Mode: Marking cards complete without post-completion review lets partial fixes look done and weakens the feedback-to-Codex loop.
- Status: Proposed

## 2026-05-18 - Discord message content access should stay explicit and scoped
- Type: Guardrail
- Summary: Fawx Security can now read message bodies, but that access should only be used for documented ops lanes, moderation, support, collaborator workflows, and explicit workflow capture.
- Rule: Message content access is scoped operational capability, not broad invisible surveillance.
- Rule: Administrator permissions and `MESSAGE_CONTENT` visibility are different controls and should be diagnosed separately.
- Pattern: documented channel or workflow -> bot reads relevant messages -> creates cleaned summary, moderation action, or workflow spec -> stores reviewed output.
- Failure Mode: using message content broadly without a documented lane makes the bot feel invasive and creates trust risk.
- Evidence: ATLAS docs/PLAYBOOK_NOTES.md, docs/ops/FITNESS-DISCORD-VERIFICATION.md

## 2026-05-18 - Spotify Club should coordinate Spotify-native playback, not stream audio
- Type: Guardrail
- Summary: Spotify Club links users and coordinates Jam Lobby state through Discord, but playback stays inside Spotify on each user's own account/device.
- Rule: Fawx Security must not stream, rebroadcast, record, or pipe Spotify audio through Discord.
- Pattern: Spotify OAuth -> Premium check -> Jam Ready -> future lobby/queue/sync.
- Failure Mode: Treating the bot as an audio source creates platform and licensing risk.
- Status: Proposed

## 2026-05-18 - Discord community features should hide setup commands and surface public actions as panels
- Type: Pattern
- Summary: Setup, moderation, and admin configuration commands should stay staff-facing, while normal-user Discord product flows should be delivered through persistent panels, buttons, and modals.
- Rule: `/setup-*` commands are admin-only.
- Rule: Moderation and staff control commands are staff-only.
- Rule: Public user workflows should not depend on memorizing slash commands.
- Rule: Slash commands are acceptable for early proof phases, but should not remain the main public UX.
- Pattern: admin setup slash command -> persistent public panel -> user buttons/modals -> bounded workflow state.
- Failure Mode: Keeping community features slash-command-first hides them from normal users and makes adoption depend on command memorization.
- Evidence: docs/ops/FITNESS-DISCORD-SPOTIFY-CLUB.md, Feedback panel, Verify panel
- Status: Proposed

## 2026-05-18 - Spotify Club should move from proof commands to public panels
- Type: Pattern
- Summary: Spotify Club Phase 2 should expose user actions through a public panel while keeping setup and lobby controls staff-facing.
- Rule: Admin/setup commands configure systems; buttons are the public product.
- Pattern: setup command -> persistent Spotify Club panel -> Connect/Status/Disconnect buttons -> lobby state.
- Failure Mode: Leaving Spotify Club as slash commands keeps the community feature hidden and underused.
- Status: Proposed

## 2026-05-18 - Spotify Club queue should be Discord-side before playback control
- Type: Guardrail
- Summary: Spotify Club should prove queue suggestions and host approval as Discord and Supabase state before mutating Spotify playback queues.
- Rule: Queue approval is not playback control.
- Pattern: suggest track -> pending queue item -> host approval -> panel queue preview -> later playback integration.
- Failure Mode: Pushing directly into Spotify playback queues before queue governance is stable creates noisy playback and API risk.
- Status: Proposed

## 2026-05-19 - Discord forum boards should stay visually clean while exports own planning order
- Type: Pattern
- Summary: Discord forum tags, titles, and a small amount of pinning make the public board readable, but the exported board and reviewed task packets remain the real sorted planning view.
- Rule: Forum order is visual only; export order is planning truth.
- Rule: `Backlog` is a planning tag for reviewed public cards that are not started yet.
- Rule: Do not churn thread activity just to fake custom sorting.
- Pattern: tags and title prefixes -> readable forum board -> board export -> reviewed task packets.
- Failure Mode: relying on Discord forum order alone makes the board feel messy because custom multi-layer sorting is not native there.
- Status: Proposed

## 2026-05-19 - Completed public feedback cards should show visible resolved state
- Type: Guardrail
- Summary: Public feedback cards that are fixed or completed should visibly look done in Discord, while exports and completion review still own the real workflow truth.
- Rule: Fixed or completed public cards should carry the configured success reaction on the starter post.
- Rule: Private testing canaries stay excluded from resolved-reaction hygiene by default.
- Pattern: status update -> completion review as required -> resolved reaction sync -> historical board card.
- Failure Mode: Finished public cards without a visible resolved marker make the forum look stale even when the stored status is correct.
- Status: Proposed

## 2026-05-19 - Spotify Club public channel should be panel-first and low-noise
- Type: Guardrail
- Summary: Spotify Club queue and lobby state should live in the public panel, while rollout tests and proof logs stay private.
- Rule: Public channel state belongs in the canonical panel.
- Rule: Test and proof chatter belongs in private testing channels.
- Pattern: user action -> ephemeral confirmation -> panel update -> private proof log when needed.
- Failure Mode: Public queue audit spam makes Spotify Club feel like an ops log instead of a community feature.
- Status: Proposed

## 2026-05-19 - Spotify Club playback handoff must be user-requested and Spotify-native
- Type: Guardrail
- Summary: Spotify Club may request playback only on a user's own active Spotify device after Premium, playback-scope, and device checks pass.
- Rule: Do not auto-start playback or stream Spotify audio through Discord.
- Rule: Playback readiness is not a promise of perfect sync.
- Rule: Once the Spotify Club panel exists, `/spotify` and `/jam-queue` should stay staff or operator fallback commands instead of public UX.
- Pattern: Premium check -> playback scope -> active device -> user-requested playback handoff.
- Failure Mode: Promising broadcast or perfect sync creates platform risk and brittle UX when Spotify devices are unavailable.
- Status: Proposed

## 2026-05-19 - Spotify Club rooms separate jam membership from Spotify authorization
- Type: Pattern
- Summary: Spotify Club should model room membership separately from Spotify account authorization so users can join or leave jams without deleting their saved Spotify connection.
- Rule: Leave Jam is not Disconnect Spotify Auth.
- Rule: The default public room should stay panel-first and low-noise.
- Pattern: connect Spotify -> join room -> search or suggest tracks -> leave room -> keep auth unless explicitly disconnected.
- Failure Mode: Treating disconnect as leaving the jam makes the product confusing and destroys useful saved auth state.
- Status: Proposed

## 2026-05-19 - Spotify Club should use one public status panel and a personalized ephemeral control hub
- Type: Pattern
- Summary: Spotify Club works better as one shared public status panel with a single controls launcher, while personalized state-aware actions live in one ephemeral control hub per user.
- Rule: The public `#spotify-club` panel is room status, not a wall of action buttons.
- Rule: Connect, join, leave, search, queue, readiness, and handoff actions should live in the ephemeral control hub.
- Rule: Hub actions should refresh or replace the same ephemeral response where practical instead of stacking many separate ephemeral messages.
- Pattern: public panel -> `Open Spotify Club Controls` -> personalized ephemeral hub -> compact confirmations -> panel refresh only when shared room state changes.
- Failure Mode: A public multi-button panel plus many separate ephemeral action messages makes Spotify Club feel noisy even when the public channel itself stays technically clean.
- Status: Proposed

## 2026-05-20 - Spotify Club mirror is visibility, not room queue authority
- Type: Guardrail
- Summary: Spotify Club should separate Discord-owned Room Queue state from Spotify's native Up Next mirror so generated Spotify tracks do not overpower user-managed room intent.
- Rule: Spotify mirror is a visibility layer. Room Queue is the user-managed product queue.
- Rule: No new Spotify Club phase starts until the previous public phase has live verification recorded and either a `#updates` post or an explicit failed-live-test follow-up card.
- Pattern: Previous / Current / Next / Room Queue / Spotify Up Next / Recent stay separate in data, UI copy, and queue counts.
- Failure Mode: Counting Spotify native Up Next as Room Queue makes generated Spotify tracks overpower Discord/user intent.
- Failure Mode: Every button click creating a new ephemeral message makes the control hub feel broken even when the public channel stays clean.
- Evidence: docs/ops/FITNESS-DISCORD-SPOTIFY-CLUB.md, Phase 7 stabilization feedback card
- Status: Proposed

## 2026-05-17 - Feedback-to-Codex should require reviewed task packets
- Type: Guardrail
- Summary: Discord feedback can generate implementation packets, but Codex work should begin only after a human-reviewed task packet approves the scope.
- Rule: Feedback cards are signals, not automatic implementation authority.
- Pattern: Feedback board export -> reviewed task packet -> Codex draft prompt -> human approval -> implementation -> feedback status update.
- Failure Mode: Running Codex directly from raw forum cards creates noisy sprint churn and duplicate task truth.
- Evidence: scripts/generate-feedback-task-packets.mjs, scripts/generate-feedback-task-packets.test.mjs, docs/ops/FITNESS-FEEDBACK-REVIEWED-TASKS.md
- Status: Proposed

## 2026-05-17 - Feedback cards should use story-card structure
- Type: Pattern
- Summary: Discord Feedback cards should be structured like lightweight story cards with user-facing Acceptance Criteria so they can drive reviewed planning without becoming raw engineering tickets.
- Rule: Feedback cards should be professional and structured, but still user-facing.
- Pattern: feedback row -> type-aware story card -> reviewed task packet -> Codex prompt.
- Failure Mode: Raw unstructured feedback makes triage harder; overly technical cards make the community board feel unfriendly.
- Evidence: src/lib/discord/bug-reports.ts, scripts/export-feedback-board.mjs, scripts/generate-feedback-task-packets.mjs
- Status: Proposed

## 2026-05-17 - Discord release posts and feedback audit comments must stay separate
- Type: Guardrail
- Summary: Public `#updates` announcements and local feedback-thread audit comments serve different audiences and should never be collapsed into one message type.
- Rule: Release posts announce shipped user-facing changes in `#updates`.
- Rule: Feedback audit comments stay inside the card thread and document card history.
- Rule: Do not post every feedback mutation to `#updates`.
- Pattern: card mutation -> compact thread audit comment; production release or approved shipped-card promotion -> curated updates-channel post.
- Failure Mode: Posting every card update to `#updates` creates noise, while silent card edits make the board hard to trust.
- Status: Proposed

## 2026-05-17 - Discord noise control should use permissions and mentions, not fake mute claims
- Type: Guardrail
- Summary: Fawx Security can inventory server ids and enforce low-noise posting rules, but personal channel mute state remains a user-side Discord preference.
- Rule: Only `Updates` and `Main` are loud channels.
- Rule: Non-update workflows must avoid broad pings.
- Pattern: server inventory -> noise audit -> conservative apply recommendations -> reviewed permission changes.
- Failure Mode: claiming the bot can mute channels for users creates false expectations and hides the real permission model.
- Evidence: scripts/discord-server-inventory.mjs, scripts/discord-noise-audit.mjs, scripts/discord-noise-apply.mjs, src/lib/discord/server-inventory.ts
- Status: Proposed

## 2026-05-17 - Shipped feedback cards need a distinct updates-channel promotion format
- Type: Pattern
- Summary: When a specific Discord feedback card ships and should be announced publicly, the updates-channel post should use a short `Update:` card-promotion format instead of the broad `@everyone` release-summary template.
- Rule: Thread audit comments stay in the feedback thread and remain compact.
- Rule: Card-promotion posts belong in `#updates` and should end with `Report ID: <short id>`.
- Rule: Do not reuse the public card-promotion format as a thread audit comment.
- Rule: One shipped card gets one public update post, not both a card-promotion post and a broad release-summary post.
- Pattern: shipped feedback card -> compact thread audit comment -> separate updates-channel `Update:` post -> report id footer.
- Failure Mode: Using the broad release-summary template for a single shipped card creates duplicate or mismatched public updates.
- Status: Proposed

## 2026-05-14 - Discord access should verify possession of an app session, not knowledge of an email
- Type: Guardrail
- Summary: Discord membership gates should use a short-lived token generated from an authenticated app session instead of accepting email-only proof.
- Rule: Email knowledge is not identity proof.
- Failure Mode: A user can unlock Discord by entering another member's email.
- Evidence: src/app/api/discord/verification-token/route.ts, src/app/api/discord/verify/route.ts, supabase/migrations/20260514120000_054_discord_verification_tokens.sql
- Status: Proposed

## 2026-05-11 - Narrow DAL slices should extract one authenticated mutation at a time
- Type: Pattern
- Summary: Fitness should prove Atlas-aligned server boundaries by moving one authenticated persistence path at a time into `src/lib/dal/*`, while server actions retain validation, user lookup, and revalidation ownership.
- Suggested Playbook File: docs/PATTERNS/owner-repo-dal-slices.md
- Rationale: Small DAL slices keep regressions attributable and prove the owner-repo boundary before any shared auth/data package discussion.
- Rule: Server action owns request validation and revalidation; DAL owns authenticated persistence mutation.
- Pattern: Delete routine is a good second DAL slice because it has a narrow read-delete-replace-update shape.
- Failure Mode: Extracting create, update, and delete together makes routine behavior regressions difficult to isolate.
- Evidence: src/app/routines/actions.ts, src/lib/dal/routine-delete.ts, src/lib/dal/routine-delete.test.ts
- Status: Proposed

## 2026-05-11 - Contract workflows should fail inside observable jobs, not before job creation

## 2026-05-15 - Discord verification proof should be user-copyable but not persisted
- Type: Guardrail
- Summary: Fitness may show a one-time Discord token after generation, but the token must stay ephemeral and must not be stored in profile state, URLs, localStorage, or logs.
- Rule: Verification tokens are display-once session UI state, not account data.
- Pattern: Generate token from authenticated session, show readonly copy box, then Discord consumes it once.
- Failure Mode: Persisting verification tokens turns a short-lived proof into reusable account state.
- Evidence: Settings Discord Connector UI and /api/discord/verification-token
- Status: Proposed

## 2026-05-15 - Discord interactions should be signed HTTP when hosted by Fitness
- Type: Guardrail
- Summary: Fitness can host Discord interaction handling only when every request is verified with Discord's Ed25519 signature before parsing or executing interaction payloads.
- Rule: Unsigned Discord interaction payloads must never reach role-grant logic.
- Pattern: Discord HTTP interaction endpoint verifies signature, handles modal proof, consumes Fitness token, then grants the Discord role through REST.
- Failure Mode: Accepting unsigned interaction requests lets arbitrary callers attempt Discord role grants.
- Evidence: src/app/api/discord/interactions/route.ts, src/lib/discord/interaction-signature.ts, src/lib/discord/rest.ts
- Status: Proposed

## 2026-05-15 - Discord member numbers should display compact public member slots, not permanent identity
- Type: Guardrail
- Summary: Discord can display Fitness member numbers after verification, but those numbers are current public slots that compact after human deletions while keeping Zac reserved as `#0`.
- Rule: Zac owns `#0`; public member numbers compact from `#1`.
- Rule: Automation accounts must not consume public member numbers.
- Pattern: profile compaction -> link refresh -> Discord nickname sync.
- Failure Mode: changing DB member numbers without refreshing Discord link snapshots and guild nicknames leaves the server showing stale member numbers.
- Evidence: public.profiles.user_number, public.discord_member_links, Discord verification flow
- Status: Proposed

## 2026-05-15 - Discord feedback reports should enter a governed queue before repo truth
- Type: Guardrail
- Summary: Discord user feedback should be captured as structured review-queue records before Playbook, ATLAS, or GitHub issues promote them into durable engineering truth.
- Rule: User feedback is input signal, not repo truth.
- Rule: Discord must not write directly to ATLAS or GitHub issues without review.
- Pattern: Discord /feedback modal -> structured Supabase queue -> Playbook export or triage -> reviewed issue or Codex task.
- Failure Mode: Writing every Discord report directly into ATLAS creates noisy, abusive repo history.
- Evidence: public.discord_feedback_reports, /api/discord/interactions, scripts/export-discord-bug-reports.mjs
- Status: Proposed

## 2026-05-15 - Discord feedback reports should stay bounded and review-queued
- Type: Guardrail
- Summary: Discord feedback should be stored as small structured signals with bounded fields, duplicate folding, and retention controls before any reviewed promotion into ATLAS, Playbook, or GitHub.
- Rule: Feedback reports are bounded signals, not blob storage.
- Rule: Screenshots and logs should be links or reviewed artifacts, not raw stored payloads.
- Pattern: Discord /feedback modal -> bounded Supabase row -> duplicate folding -> export or prune -> reviewed promotion.
- Failure Mode: Unbounded text, raw payloads, files, or direct repo writes turn support intake into storage abuse.
- Evidence: public.discord_feedback_reports, scripts/export-discord-bug-reports.mjs, scripts/prune-discord-bug-reports.mjs
- Status: Proposed

## 2026-05-15 - Discord forum feedback boards need source-of-truth status sync
- Type: Pattern
- Summary: Discord forum posts can make feedback visible, but status tags should be synced from the structured report queue so the forum remains a display surface rather than the only source of truth.
- Rule: Forum tags are display state; Supabase remains the bounded index.
- Rule: Reporter mentions must be explicit and controlled with allowed_mentions.
- Pattern: Structured report row -> forum thread -> type and status tags -> staff status command -> synced row and thread update.
- Failure Mode: Manual-only forum tags drift from the review queue and make Playbook exports unreliable.
- Status: Proposed

## 2026-05-15 - Feedback creators should withdraw details, not raw-delete review history
- Type: Guardrail
- Summary: Feedback reporters may withdraw their own details, but the system should keep bounded audit metadata so duplicates, triage, and Playbook exports remain trustworthy.
- Rule: User-facing delete should mean withdraw or redact by default, not destructive history loss.
- Rule: Forum posts are display state; Supabase remains the bounded index.
- Pattern: Feedback modal -> bounded report row -> forum thread -> reporter withdraw or status update -> reviewed promotion.
- Failure Mode: Raw user deletion breaks duplicate tracking and makes triage history unreliable.
- Status: Proposed

## 2026-05-15 - Feedback duplicates should fold on normalized signal and clean up resolved display threads
- Type: Pattern
- Summary: Feedback duplicate handling should compare normalized report signals rather than exact raw strings, while duplicate and withdrawn forum threads clean up as display-state cleanup after the queue row is updated.
- Rule: Duplicate detection should compare normalized area, summary, and short-detail tokens, not exact message text alone.
- Rule: Supabase remains the bounded index; duplicate or withdrawn forum threads may be deleted once their synced display state is updated.
- Pattern: normalize feedback signal -> fold into active queue row -> sync tags and starter post -> delete duplicate or withdrawn display thread.
- Failure Mode: Exact-string-only duplicate checks miss obvious repeats, and leaving resolved duplicate threads open turns the forum into a noisy board.
- Status: Proposed

## 2026-05-15 - Discord feedback should use setup commands for admins and buttons for users
- Type: Pattern
- Summary: Setup and moderation commands should stay admin-facing, while normal feedback interactions should be available through persistent buttons and modals.
- Rule: Admin/setup commands are not normal-user UX.
- Pattern: Admin slash command -> persistent panel -> user button -> modal -> bounded feedback row.
- Failure Mode: Making users memorize slash commands hides the feedback workflow and lowers participation.
- Status: Proposed

## 2026-05-15 - Feedback type selection belongs inside the feedback flow
- Type: Pattern
- Summary: Feedback users should open one general feedback flow and choose Bug or Feature inside the modal instead of selecting command variants up front.
- Rule: Feedback UX should minimize command-picker decisions.
- Pattern: General feedback button -> modal with type choice -> bounded feedback row -> forum thread/tags.
- Failure Mode: Pre-selecting too many slash-command variants makes feedback feel like an admin workflow instead of a user workflow.
- Status: Proposed

## 2026-05-16 - Feedback intake should not depend on optional Discord decoration
- Type: Guardrail
- Summary: Feedback submission success should depend on storing the bounded report and creating the forum post, not on optional emoji or tag decoration.
- Rule: Optional Discord decoration must fail soft.
- Pattern: Core report write -> forum thread -> optional decoration -> success response.
- Failure Mode: A valid report appears in the forum while the user sees a failure because a non-critical decoration step failed.
- Status: Proposed

## 2026-05-16 - Feedback attachments and decoration must stay bounded and fail-soft
- Type: Guardrail
- Summary: Feedback intake may support screenshots and visual polish, but file bytes should stay in Discord, Supabase should store bounded metadata only, and optional decoration must not break the core report path.
- Rule: Feedback attachments are Discord-hosted evidence, not app database blobs.
- Rule: Custom emoji decoration must be validated and fail-soft.
- Pattern: defer interaction -> bounded row -> forum thread with optional attachments -> edit response with final status.
- Failure Mode: A successful forum post appears while the reporter sees a failed response because the interaction was not deferred or decoration failed.
- Status: Proposed

## 2026-05-16 - Discord emoji resources must be bootstrapped, not inferred from attachments
- Type: Guardrail
- Summary: Bot UI emoji should come from controlled application-owned or guild-owned emoji resources, not from ordinary uploaded image attachments.
- Rule: Custom emoji are decoration, not core workflow.
- Pattern: local asset -> Discord emoji resource -> env ID -> validated UI usage.
- Failure Mode: Treating an uploaded image attachment like an emoji resource breaks Discord component payloads and creates false config drift.
- Status: Proposed

## 2026-05-16 - Feedback cards should be type-aware display, not one generic bug form
- Type: Pattern
- Summary: Bug and Feature feedback can share bounded storage, but their public Discord cards should use type-aware labels so feature requests do not read like bug reports.
- Rule: Shared storage does not require identical user-facing copy.
- Pattern: common feedback row -> type-aware forum card -> status reaction -> optional sync script.
- Failure Mode: Showing severity and `What happened` on feature requests makes the feedback board feel awkward and bug-only.
- Status: Proposed

## 2026-05-16 - Feedback forum can be a visible board, but Playbook/ATLAS remain reviewed truth
- Type: Pattern
- Summary: Discord feedback cards can act like a lightweight Jira board, while Supabase keeps bounded records and Playbook/ATLAS only receive reviewed exports/tasks.
- Rule: Discord board state is operational signal, not engineering truth by itself.
- Pattern: Feedback forum card -> status tags -> board export -> reviewed Codex task / Playbook triage.
- Failure Mode: Treating every forum post as automatic engineering truth creates noisy task churn.
- Status: Proposed

## 2026-05-16 - Feedback board exports are Verta Core planning input, not automatic truth
- Type: Pattern
- Summary: The Discord Feedback forum can behave like a lightweight Jira board, but Verta Core / Playbook should consume exported board artifacts as reviewed planning input before Codex work begins.
- Rule: Discord board state is operational signal, not engineering truth.
- Pattern: Feedback forum card -> bounded Supabase row -> board export -> Verta Core triage -> reviewed Codex task.
- Failure Mode: Treating every forum card as automatic engineering truth creates noisy sprint churn.
- Status: Proposed

## 2026-05-16 - Feedback workflow should promote reviewed exports, not duplicate raw task copies
- Type: Guardrail
- Summary: The Feedback forum is the visible community board, but the durable workflow should move through bounded rows, reviewed board exports, reviewed Codex prompts, and curated update posts rather than automatic copies into ATLAS, GitHub, or `#updates`.
- Rule: Feedback card updates should stay in the forum thread as audit comments, not automatic release posts.
- Rule: Update Bot posts are curated user-facing announcements, not card mutation logs.
- Rule: ATLAS should receive reviewed summaries, not every raw feedback card.
- Rule: No direct Discord-to-ATLAS or Discord-to-GitHub writes in this lane.
- Pattern: feedback card -> audit comments -> board export -> Verta Core or Playbook review -> reviewed Codex task -> curated update post when user-facing.
- Failure Mode: Duplicating raw cards into ATLAS, GitHub, or the updates channel creates noisy and conflicting task truth.
- Status: Proposed

## 2026-05-16 - Feedback card mutations should leave thread-visible audit comments
- Type: Pattern
- Summary: When the bot changes a feedback card, it should post a compact thread comment so the forum itself shows a readable modification history.
- Rule: Bot-driven board changes should be visible in the card thread.
- Pattern: mutate bounded feedback row -> update forum card/tags -> post compact audit comment.
- Failure Mode: Silent card edits make the feedback forum feel inconsistent and hard to trust as a board.
- Status: Proposed

## 2026-05-16 - Feedback launcher should be separate from the forum board
- Type: Pattern
- Summary: Discord feedback intake should begin in a small dedicated launcher channel, while the forum remains the visible board for created cards and audit history.
- Rule: Keep the public launcher surface limited to `Submit Feedback` and `Edit My Feedback`.
- Rule: Withdraw should live inside the scoped edit/manage flow, not as a top-level public launcher button.
- Pattern: launcher channel -> scoped card picker -> edit or withdraw -> forum card sync + audit comment.
- Failure Mode: Putting a large control post inside the forum mixes intake UX with board-reading UX and makes card management noisier than necessary.
- Status: Proposed

## 2026-05-15 - Member-number display sync should queue Discord side effects
- Type: Pattern
- Summary: Database compaction should update app truth and queue Discord nickname resync, while Discord API calls happen through a server sync path that can retry failures.
- Rule: Database triggers should not call Discord directly.
- Pattern: profile compaction -> stale Discord link marker -> protected sync endpoint or script -> nickname update.
- Failure Mode: Changing member numbers in DB without queuing nickname sync leaves Discord display stale.
- Status: Proposed

## 2026-05-16 - Discord production update posts should be curated user communication
- Type: Guardrail
- Summary: Vercel production deployments can trigger update drafts, but public Discord posts must be curated for users rather than copied from raw deployment metadata.
- Rule: Deployment metadata is input, not release copy.
- Rule: Only production deployments for the Fitness project should create update drafts.
- Rule: Discord update posts should be safe for users of any age and background.
- Rule: Published update posts should stay single-heading, start with `@everyone`, and suppress link previews.
- Pattern: production deployment event -> bounded draft -> admin curated publish -> Discord update post.
- Failure Mode: Raw changelog or deployment posts confuse users and leak irrelevant implementation details.
- Status: Proposed

## 2026-05-16 - Supabase migration parity must be restored before routine DB changes
- Type: Guardrail
- Summary: Discord rollout required surgical migration applies because local and remote migration history drifted.
- Rule: Do not repair production migration history opportunistically during feature deploys.
- Pattern: inventory remote history -> recover local migration files -> validate -> resume normal db workflow.
- Failure Mode: Continuing feature work on a drifted migration chain forces every DB change into manual or surgical paths.
- Status: Proposed

## 2026-05-16 - Supabase migration ledger repair should require schema evidence
- Type: Guardrail
- Summary: Discord rollout migration drift was resolved by proving production schema effects before marking missing migration versions as applied.
- Rule: Migration ledger repair requires schema evidence first.
- Pattern: verify effects -> repair exact versions -> validate -> document.
- Failure Mode: Blind migration repair can make the ledger claim schema history that production does not actually have.
- Status: Proposed

## 2026-05-16 - Moderation should be reversible before punitive
- Type: Guardrail
- Summary: Fawx Security moderation should use logged notices and warnings first, then reversible Purgatory isolation when needed, rather than defaulting to bans.
- Rule: No full bans by default.
- Rule: Every moderation action needs a case record and release path.
- Pattern: notice/warning -> logged case -> Purgatory if needed -> release/restore.
- Failure Mode: Silent bans or destructive moderation actions create drama and make recovery harder.
- Status: Proposed

## 2026-05-17 - Verify channels should be locked bot-owned access panels
- Type: Guardrail
- Summary: Discord verification channels should contain one clean bot-owned access panel, not manual notes, user messages, or support threads.
- Rule: `#verify` is for access, not discussion.
- Pattern: locked channel -> Fawx Security verify/rules panel -> verification button -> role grant.
- Failure Mode: Letting users create messages or threads in `#verify` turns access setup into clutter and makes the server feel unpolished.
- Status: Proposed

## 2026-06-05 - Logged session exercise lanes should reuse the progression scroll-box shell
- Type: Pattern
- WHAT changed: The history/logged-session detail route now wraps the lower exercise-card lane in the same bounded glass scroll-box treatment used by progression measurement panels, sizes that viewport from a stable wrapper in normal page flow, keeps the sticky shell pinned above the bottom action dock, swaps the expanded state to a focused exercise overview card that reuses the exercise-info metric grid styling for session-specific stats, and folds exercise notes into that same overview card instead of a separate footer lane.
- WHY it changed: Logged session cards needed the same footer-safe, bounded scrolling behavior already proven on progression measurement input screens, but measuring the already-overflow-managed sticky shell after hydration could make the outer box keep shrinking itself upward until only a thin strip remained or let the lower shell drift behind the bottom dock instead of keeping the scroll inside the box. Expanded exercise mode also needed a cleaner information hierarchy, because leaving notes in a separate footer strip kept fighting the scroll-box sizing and split exercise-specific context across two disconnected surfaces.
- Rule: When a lower content lane needs its own footer-safe scrolling, reuse the established progression scroll-box shell before inventing a route-local container.
- Pattern: sticky summary or metrics card -> dock-pinned bounded glass scroll box -> internal exercise-card or set-list scrolling above the bottom dock.
- Failure Mode: Letting logged-session cards scroll on the raw page background makes the lower section feel structurally disconnected from the rest of the app and weakens footer-safe affordance.
- Evidence: `src/app/history/[sessionId]/LogAuditClient.tsx`
- Status: Proposed

## 2026-06-05 - History detail must keep every logged exercise even when sets or legacy ownership rows are sparse
- Type: Guardrail
- WHAT changed: The history detail route now keeps zero-set logged exercises visible in the client instead of filtering them out, and the detail loader now prefers the fuller relaxed `session_exercises` and `sets` result set when strict `user_id` filters only return a partial legacy subset.
- WHY it changed: Some completed sessions were showing more exercises in the history list than in the detail page because the detail client hid logged exercises with no sets and the loader could silently undercount legacy rows when only some child records still carried `user_id`, which also corrupted the detail metrics derived from that reduced set.
- Rule: A completed history detail page must render the same logged exercise inventory the session summary was built from, even when an exercise has zero sets or some legacy child rows only survive the session-id query path.
- Pattern: load strict history detail rows -> compare with relaxed session-id rows -> keep the fuller bounded result -> render every logged exercise card -> let empty-set exercises show an empty measurement state instead of disappearing.
- Failure Mode: Dropping zero-set or partially legacy exercises from detail makes the exercise count disagree with History, removes cards the user actually logged, and poisons recap or metric totals built from the reduced list.
- Evidence: `src/app/history/[sessionId]/LogAuditClient.tsx`, `src/lib/history-session-detail-loader.ts`, `src/lib/history-session-detail-loader.test.ts`
- Status: Proposed

## 2026-06-05 - Progression analytics should be summarized once and reused across history-family surfaces
- Type: Pattern
- WHAT changed: Session history cards, exercise history cards, the exercise info sheet, logged-session exercise focus, and the account storage snapshot now all consume one shared progression lifeline summary built from `progression_events`, exposing promotion counts, target lifelines, latest target changes, and progressed-exercise rollups without each route inventing its own wording or counting rules.
- WHY it changed: The app already stored progression events, but most history-family surfaces only showed performance metrics or readiness state, which made promotion history feel invisible and forced users to mentally reconstruct target changes from raw workouts instead of seeing a clean "started here -> moved here -> latest change" story.
- Rule: When a surface needs promotion or target-evolution analytics, derive them from a shared progression-event summary layer before adding route-local counters or copy.
- Pattern: load scoped progression events -> build shared session or exercise lifeline summary -> feed cards, detail panels, and account storage metrics from that same summary.
- Failure Mode: Recomputing promotion analytics separately on each screen creates drift in counts, wording, and target labels, and makes account/export summaries disagree with history or exercise detail surfaces.
- Evidence: `src/lib/progression-lifeline-summary.ts`, `src/lib/history-sessions-page-loader.ts`, `src/lib/exercises-browser.ts`, `src/lib/exercise-info.ts`, `src/app/history/[sessionId]/page.tsx`
- Status: Proposed

## 2026-06-05 - Metric cards should render from one shared surface grid instead of screen-local copies
- Type: Pattern
- WHAT changed: History session cards, history exercise cards, history detail exercise cards, weekly and thirty-day history summaries, workout detail rows, exercise-surface grids, and the account storage snapshot now all render their compact detailed metrics through one shared `SurfaceMetricGrid` primitive in `src/components/ui/MetricItem.tsx`.
- WHY it changed: The app had multiple nearly identical metric-grid implementations with slightly different label tones, spacing, accent bars, and value handling, which kept reintroducing visual drift any time one screen was tuned without the others.
- Rule: When a screen needs the canonical compact metric-card treatment, start from the shared `SurfaceMetricGrid` before adding route-local metric markup.
- Pattern: shared metric datum contract -> shared compact metric surface grid -> screen-specific metric selection only.
- Failure Mode: Copying metric-card markup into individual screens guarantees recurring theme drift, spacing regressions, and mismatched metric affordances between collapsed, expanded, history, and account surfaces.
- Evidence: `src/components/ui/MetricItem.tsx`, `src/components/history/HistorySessionCard.tsx`, `src/components/history/HistoryExerciseCard.tsx`, `src/components/history/HistoryDetailExerciseCard.tsx`, `src/components/history/WeeklyProgressSurface.tsx`, `src/components/history/ThirtyDayHistorySurface.tsx`, `src/components/settings/DataSettingsSection.tsx`
- Status: Proposed

## 2026-06-05 - Core exercise cards should use a full-height, accent-safe media rail
- Type: Pattern
- WHAT changed: Core exercise-card surfaces now share one wider `96px` media rail, the rail itself keeps a small left inset so the accent strip stays visible, row-card exercise art no longer gets extra contain padding that shrinks it away from the top and bottom edges, history cards no longer override that rail back into a centered square inset, and detailed history cards now let the lower-right image stretch square to the full lower-section height instead of pinning it to a fixed box.
- WHY it changed: History compact cards had drifted into visibly undersized exercise art, and inconsistent per-surface rail widths made the same exercise-card family feel unrelated across Today, history, current-session, and edit-day surfaces. The added inset preserves the accent strip without forcing history-only wrapper hacks.
- Rule: If an exercise card is part of the core row-card family, its image should fill the rail vertically and derive width from the shared surface policy instead of a surface-local square inset treatment.
- Pattern: shared row-card shell -> shared `96px` rail -> accent-safe left inset -> top-to-bottom exercise art, and if a detailed history card uses a lower-right image block, that block anchors to the bottom-right corner below the chevron lane and reserves its square footprint before the text column claims the remaining width.
- Failure Mode: Inset square media treatments make history cards feel smaller than the rest of the app, waste left-side card space, and cause repeated one-off fixes whenever image scale changes.
- Evidence: `src/components/ExerciseCard.tsx`, `src/components/exercises/ExerciseThumb.tsx`, `src/components/history/HistoryExerciseCard.tsx`, `src/lib/workout-card-surface-policy.ts`
- Status: Proposed

## 2026-06-05 - Disclosure chevrons should share one state wrapper
- Type: Pattern
- WHAT changed: Repeated expanded/collapsed chevron branches now flow through one shared `StateChevron` wrapper instead of each surface hand-picking `ChevronRightIcon` versus `ChevronDownIcon`.
- WHY it changed: Today rows, history detail rows, routine-day cards, workout disclosure rows, settings accordions, and progression review panels had started duplicating the same direction-switch logic with small color and spacing drift.
- Rule: If a surface is just expressing collapsed-versus-expanded chevron state, use the shared wrapper and pass local styling through classes instead of re-implementing icon selection inline.
- Pattern: shared `StateChevron` direction logic -> surface-local size/color classes -> only special-purpose arrows keep bespoke logic.
- Failure Mode: Hand-written chevron ternaries drift in direction, tone, and alignment and make disclosure interactions harder to normalize across page families.
- Evidence: `src/components/ui/StateChevron.tsx`, `src/components/workout/ExerciseDisclosureCard.tsx`, `src/components/history/HistoryDetailExerciseCard.tsx`, `src/app/today/TodayExerciseRows.tsx`, `src/app/today/TodayDayPicker.tsx`
- Status: Proposed

## 2026-06-05 - Detail recap sections should share one bullet-list renderer across history and exercise info
- Type: Pattern
- WHAT changed: History session detail cards and the exercise info `Progress` and `Progression` panels now render recap bullets through one shared detailed-section renderer instead of each screen carrying its own bullet spacing, divider, and wrap logic.
- WHY it changed: Exercise info had drifted into a softer local recap style while history cards had already locked in the more stable section rhythm, so copy, spacing, and wrapped bullet behavior kept diverging even when the screens were supposed to feel like the same metric-card family.
- Rule: If a detail surface needs the canonical bullet recap treatment under a metric grid, use the shared detailed-section renderer before adding route-local bullet markup.
- Pattern: shared thin divider -> shared uppercase section title -> shared wrap-safe two-column bullet list -> screen-specific section selection only.
- Failure Mode: Rebuilding recap bullets per screen reintroduces text-touching-dot bugs, spacing drift, and inconsistent progress/progression panels across exercise info, history, and logged-session detail.
- Evidence: `src/components/ui/DetailSectionList.tsx`, `src/components/history/HistorySessionCard.tsx`, `src/components/ExerciseInfoSheet.tsx`
- Status: Proposed

## 2026-07-14 - History calendars distinguish completed and skipped planned workout days
- Type: Pattern
- WHAT changed: The history calendar now derives past planned workout dates from routine cycle truth, keeps completed session days green, marks genuinely missed workout days red, and allows vertical page movement to begin over the horizontally swipeable month rail. Deterministic mobile fixtures remain blocked in production but can be opened on protected Vercel preview deployments for operator review.
- WHY it changed: The calendar previously showed only completed-session density and its horizontal-only touch contract blocked normal mobile page scrolling when a gesture started inside the calendar.
- Rule: Calendar status must come from routine scheduling plus completed-session truth, and horizontally scrollable history surfaces must preserve vertical page gestures.
- Evidence: `src/lib/history-planned-days.ts`, `src/lib/history-calendar.ts`, `src/components/history/HistoryCalendarSurface.tsx`

## 2026-07-17 - Migration source recovery must preserve immutable provenance and parity uncertainty
- Type: Guardrail
- WHAT changed: Three missing Fitness migration sources were restored as exact Git blobs from an immutable historical commit and locked by raw SHA-256 plus a complete source-tree manifest; provider-returned canonical statements remain a separate evidence class.
- WHY it changed: Live migration history had 101 versions while `origin/main` had 98 sources, and provider-canonical text cannot prove the original applied bytes for every statement or justify rewriting substantive mismatches.
- Rule: Never silently rewrite historical migration bytes to match provider-returned text; require immutable provenance, explicit uncertainty, and a faithful replay or separately governed ledger-repair path before changing applied migration truth.
- Pattern: freeze source/live denominators -> recover exact historical blobs -> verify raw and tree manifests -> classify canonical/whitespace/raw parity separately -> route unresolved content mismatches to a bounded successor.
- Failure Mode: Treating provider-canonical or whitespace-normalized equality as raw-byte proof creates false parity, hides source drift, and makes migration history irreproducible.
- Decision: Keep raw parity `UNKNOWN` where the provider cannot prove applied bytes, and do not let source recovery absorb unrelated application changes or unresolved content repair.
- Evidence: `supabase/migrations/20260713013116_exercise_timer_truth.sql`, `supabase/migrations/20260713020801_set_timing_truth.sql`, `supabase/migrations/20260716033653_routine_day_optional.sql`, `scripts/migration/fp-fit-rec-001-verify.mjs`, `docs/ops/FP-FIT-REC-001-SOURCE-RECOVERY-RECEIPT.md`
- Status: Proposed

## 2026-07-18 - Server admin credentials need one modern-first resolution boundary
- Type: Guardrail
- WHAT changed: Fitness server runtime credential selection now lives in the server-only Supabase admin module, prefers `SUPABASE_SECRET_KEY`, and retains `SUPABASE_SERVICE_ROLE_KEY` only as a temporary rollback fallback for the staged security migration.
- WHY it changed: Runtime guards and health checks were coupled directly to the legacy variable name, so installing an independently revocable Supabase secret key would still make valid admin flows appear unavailable or continue selecting the historically exposed legacy credential.
- Rule: Backend Supabase credentials must resolve through one server-only boundary; blank preferred values may fall back, missing total input fails with sanitized configuration text, and no value metadata may enter diagnostics or browser code.
- Pattern: modern server secret -> bounded legacy rollback fallback -> stable fail-closed configuration error -> source-neutral readiness checks.
- Failure Mode: Scattered environment-name checks can select different credentials, leak source details through diagnostics, or falsely treat source compatibility as proof that the legacy credential is deactivated.
- Decision: Keep the legacy fallback until Preview and separately approved Production verification prove the modern key across every consumer; scripts, browser publishable keys, provider mutation, deployments, and deactivation remain separate governed packets.
- Evidence: `src/lib/supabase/admin.ts`, `src/lib/env.test.ts`, `src/app/auth/actions.ts`, `src/lib/atlas-contracts.ts`, `src/lib/discord/message-command-claims.ts`
- Status: Proposed

## 2026-07-19 - CI contract evidence must preserve explicit targets and local ownership
- Type: Guardrail
- WHAT changed: Atlas health classification now treats an explicit Vercel Preview or Production target as authoritative even when CI is also set, and the Fitness metrics evidence pack plus its Atlas/Codex context runbook now use maintained repository-local ownership evidence.
- WHY it changed: Ambient CI incorrectly masked explicit deployment-target evidence in contract tests, while stale Atlas-root paths made an otherwise local Fitness evidence pack unverifiable from this repository.
- Rule: CI is a fallback environment classification, not an override for an explicit deployment target; source evidence referenced by Fitness runbooks and packs must be retrievable from the Fitness repository or be replaced with a maintained local ownership contract.
- Pattern: explicit Vercel target -> environment classification -> CI fallback, and frozen metrics-pack reference -> local runbook -> maintained Fitness adoption contract.
- Failure Mode: Letting ambient CI override target evidence misclassifies Preview or Production contracts, while cross-repository documentation paths leave local operators unable to validate the asserted ownership boundary.
- Evidence: `src/lib/atlas-contracts.ts`, `src/lib/atlas-contracts.test.ts`, `docs/ops/ATLAS-CODEX-CONTEXT-RUNBOOK.md`, `docs/ops/FITNESS-ATLAS-CONTRACT-ADOPTION.md`, `src/lib/ecosystem/fitness-metrics-pack.test.ts`
- Status: Proposed

## 2026-07-17 - Member numbers are immutable and never reused
- Type: Decision
- WHAT changed: Fitness source numbering now retires delete-driven compaction, ignores caller-supplied human identity values on insert, rejects member-identity changes after creation, and removes client authority to reset the source sequence.
- WHY it changed: Compact public slots rewrote surviving human identities after deletion, while profile grants and the assignment function still left alternate renumbering paths. Removing only the delete trigger would not make the identity contract true.
- Rule: Human `user_number`, `user_kind`, and `user_number_assigned_at` are immutable after assignment; deleted numbers leave permanent gaps and are never reused.
- Rule: Automation profiles remain unnumbered, and new human numbers come only from the source allocator until the governed target cutover activates exactly one replacement allocator.
- Pattern: fail-closed catalog and high-water preconditions -> retire compaction with `RESTRICT` -> harden insert assignment -> enforce immutable updates -> revoke sequence mutation authority -> prove survivor mapping and concurrent allocation in disposable replay.
- Failure Mode: Treating member numbers as dense display slots destroys stable identity, makes Discord snapshots drift, and lets deletion or client-supplied values renumber existing users.
- Decision: Never recreate compaction as rollback and never hard-code a target sequence floor; calculate the floor from freeze-time source and target high-water evidence.
- Evidence: `supabase/migrations/20260718015422_retire_human_member_number_compaction.sql`, `scripts/member-number-safety-core.mjs`, `scripts/migration/fp-fit-user-number-safety-verify.mjs`, `docs/ops/FP-FIT-USER-NUMBER-SAFETY-001.md`
- Status: Proposed

## 2026-07-27 - Visual QA needs one source-bound state registry
- Type: Decision
- WHAT changed: Fitness visual QA now derives signed-in fixture, public, auth/loading, and curated-onboarding captures from one permanent registry with an accepted 111-state and 313-capture denominator. The same registry feeds runner suites, source-bound manifests, deterministic family boards, a mega-board, and hashed receipts.
- WHY it changed: The prior screenshot catalog proved useful coverage but its route lists and generated evidence were temporary. Rebuilding route inventories independently would let states disappear, redirects pass unnoticed, and review boards drift away from the source head that produced them.
- Rule: A visual state is added or changed in the shared registry first; capture runners and board builders consume that contract rather than maintaining route lists of their own.
- Pattern: immutable source commit/tree + registry digest + pinned browser environment -> deterministic capture plan -> requested/resolved route proof -> per-capture receipt -> family and mega boards -> hash receipt.
- Failure Mode: Temporary catalogs become stale evidence, silent count reductions hide lost states, and board-only review cannot prove which source, fixture, route, or browser environment produced an image.
- Decision: Keep screenshot baselines and large boards in governed runtime or CI artifact storage. Commit only a content-addressed baseline manifest when baseline comparison is separately admitted; never commit generated images as an automatic visual update.
- Decision: Visual-QA foundation work inventories and proves product states but does not redesign product UI, alter fixture-driven production behavior, approve a baseline, or authorize deployment.
- Evidence: `scripts/qa/visual-fitness-state-registry.mjs`, `scripts/qa/visual-fitness-runner.mjs`, `scripts/build-mobile-regression-boards.py`, `docs/mobile-regression-fixtures.md`
- Status: Proposed

## 2026-07-27 - Merge reconciliation is proven by reviewed-tree identity
- Type: Guardrail
- WHAT changed: The visual-QA wave starts only after the merged source commit is read back with the reviewed feature head as its second parent and a merge tree byte-identical to the reviewed tree.
- WHY it changed: Starting follow-on QA from a branch label or PR state alone can capture a stale or conflict-resolved tree that differs from the reviewed source.
- Rule: Before registering or capturing a post-merge visual denominator, prove the new main commit, ordered parentage, reviewed-head ancestry, and reviewed-tree identity.
- Failure Mode: A visually plausible catalog can certify the wrong source state if merge reconciliation is inferred from metadata rather than Git objects.
- Evidence: `docs/mobile-regression-fixtures.md`, `scripts/qa/visual-fitness-runner.mjs`
- Status: Proposed

## 2026-07-28 - Raw onboarding answers compile into a semantic planning contract
- Type: Decision
- WHAT changed: Curated onboarding now has a source-only, versioned normalization boundary with deterministic issues, parallel provenance, a semantic generation projection, portable canonical hashing, ten golden normalized fixtures, closed runtime validation with digest recomputation, and required exact-head CI coverage. Production generation and persistence remain unchanged.
- WHY it changed: Directly reading raw question IDs in a generator couples planning to UI shape, makes hidden or malformed answers unsafe, and lets unordered or presentation-only data destabilize deterministic identity.
- Rule: Hard constraints never participate in weighted scoring or caller-controlled reclassification, unknown safety state is not equivalent to unrestricted, unknown schedule mode cannot retain a known day count, and callers cannot downgrade issue severity, forge response paths, or conceal warning/professional-direction blockers behind a recomputed digest.
- Pattern: Compile raw intake into a versioned planning contract, then hash the semantic generation projection rather than raw responses.
- Failure Mode: Volatile fields, raw answer ordering, hidden state, or provenance in a generation digest can produce different identities for the same planning meaning.
- Decision: Keep nutrition, delivery preferences, acknowledgments, and historical lift context outside exercise selection; preserve them as context or provenance.
- Evidence: `src/features/curated-onboarding/planning/contract.ts`, `src/features/curated-onboarding/planning/normalize.ts`, `src/features/curated-onboarding/planning/normalize.test.ts`, `docs/curated-planning-contract.md`
- Status: Proposed

## 2026-07-28 - Planning normalization must fail closed without throwing
- Type: Guardrail
- WHAT changed: The planning normalizer now sanitizes malformed multi-select members, deduplicates every emitted identifier after canonicalization, treats free-form pain text as unresolved scope, keeps movement-restriction provenance limited to structured restriction answers, and parses unit-bearing per-dumbbell loads without mistaking pair counts or clause-labeled aggregate totals for weight.
- WHY it changed: A blocked intake is still an executable boundary result; malformed or ambiguous source data must not crash normalization or silently create the wrong hard constraint.
- Rule: Record invalid source shape, discard unsafe members, and return a schema-valid blocked contract. Never infer movement restrictions from free-form pain wording alone.
- Pattern: validate raw shape -> sanitize runtime values -> normalize semantic identity -> validate the emitted contract.
- Failure Mode: Keyword inference, pre-canonical deduplication, unitless load assumptions, and largest-number parsing can turn ambiguous safety or equipment text into authoritative planner constraints.
- Evidence: `src/features/curated-onboarding/planning/normalize.ts`, `src/features/curated-onboarding/planning/normalize.test.ts`, `docs/curated-planning-contract.md`
- Status: Proposed

## 2026-07-28 - Coverage compiles before ranking or session construction
- Type: Decision
- WHAT changed: Fitness now has a source-only, input-bound coverage compiler that converts validated planning and catalog contracts into exact schedule/hard constraints, source-ranked movement requirements, compatible candidate pools, and structured blocked, clarification, invalid, or infeasible results.
- WHY it changed: A deterministic planner cannot safely rank exercises while schedule truth, hard exclusions, cross-contract equipment IDs, or required coverage are still ambiguous. Candidate compatibility must be proven before scoring or session allocation.
- Rule: Validate both inputs, compile hard constraints, resolve every required coverage item through the catalog, and stop on any blocked, invalid, clarification, or infeasible result before ranking.
- Pattern: normalized planning digest + catalog digest -> frozen coverage policy -> exact hard constraints -> compatibility pools -> input-bound semantic digest -> later planner.
- Failure Mode: Treating a self-digest as source authenticity, fuzzily matching presentation names, ignoring unsupported equipment, or scoring before feasibility can produce a deterministic but unsafe routine.
- Decision: the exported JSON Schema is structural transport validation only because portable JSON Schema cannot prove every canonical order, cross-array invariant, numeric comparison, or semantic digest. Consumers must require a successful versioned `validateCoverageCompilationV1WithReceipt` result, then use `validateCoverageCompilationAgainstInputsV1` when the planning and catalog inputs are available to reject re-signed forged candidate pools.
- Failure Mode: Treating a shape-valid JSON document as semantically validated lets schedule, issue-policy, canonical-ordering, or status contradictions cross the planner boundary.
- Rule: Runtime receipts must return errors rather than throw on malformed transport members, including issue values and requirement candidate arrays, and derived infeasibility issue sets must exactly match the candidate and schedule facts they claim.
- Rule: A focused consumer workflow must trigger for its complete imported dependency tree, including curated-onboarding questionnaire and type sources outside `planning/**`, not only its own source directory.
- Decision: Coverage v1 does not rank, schedule, prescribe, generate, persist, or activate routines. Those remain separate governed contracts.
- Evidence: `src/features/curated-onboarding/planning/coverage/contract.ts`, `src/features/curated-onboarding/planning/coverage/compile.ts`, `src/features/curated-onboarding/planning/coverage/compile.test.ts`, `docs/curated-planning-contract.md`
- Status: Proposed

## 2026-07-28 - Rank only input-bound compatible candidates

- Type: Decision
- WHAT changed: Fitness now has a source-only Candidate Ranking v1 contract that scores every coverage-compatible candidate exactly once with closed integer components, immutable reason-code semantics, deterministic tie-breakers, a semantic digest, a non-throwing runtime receipt, input-bound recompilation, ten pinned terminal fixtures, and direct exact-head CI coverage.
- WHY it changed: Compatibility alone does not express goal fit, adherence, experience suitability, time cost, or recovery cost, but allowing a scorer to recreate eligibility or accept a self-signed candidate pool would let preferences override safety and equipment truth.
- Rule: Coverage owns eligibility. Ranking may order only the exact compatible IDs supplied by a runtime-valid, input-bound `ready` coverage result; it cannot add, remove, widen, or score through a hard constraint.
- Rule: Each score component has exactly one frozen reason code and score. Total score is the exact component sum, and order is total descending, curated rank ascending, then exercise ID lexical.
- Pattern: planning digest + catalog digest + input-bound ready coverage digest -> closed score reasons/components -> canonical order -> runtime receipt -> exact-input recompilation -> later global selection.
- Failure Mode: Treating a recomputed ranking digest as source authorization allows re-signed candidate omission/injection, while presentation-name matching or caller-controlled reasons can create deterministic but unauthentic rankings.
- Decision: No portable JSON Schema is exported as semantic authorization. Consumers require `validateCandidateRankingV1WithReceipt`, then `validateCandidateRankingAgainstInputsV1` when the three inputs are available.
- Decision: Candidate Ranking v1 does not select the final exercise set, allocate sessions, prescribe, generate, persist, activate, or change production behavior.
- Evidence: `src/features/curated-onboarding/planning/ranking/contract.ts`, `src/features/curated-onboarding/planning/ranking/rank.ts`, `src/features/curated-onboarding/planning/ranking/rank.test.ts`, `docs/curated-planning-contract.md`
- Status: Proposed

## 2026-07-28 - Select globally without widening eligibility

- Type: Decision
- WHAT changed: Fitness now has a source-only Global Candidate Selection v1 contract that chooses one globally unique ranked candidate per coverage requirement, maximizes the total candidate score, resolves equal totals through canonical requirement and ranking order, emits a semantic digest and non-throwing runtime receipt, recompiles from all four exact inputs, pins ten terminal fixtures, and runs in direct exact-head CI.
- WHY it changed: Per-requirement rankings can share candidates. Choosing each local first place independently can duplicate one exercise or consume a shared top candidate even when another complete assignment has a better total. A self-consistent selected set also cannot prove that every requirement and candidate came from the reviewed coverage and ranking inputs.
- Rule: Coverage owns eligibility and ranking owns scores/order. Selection must choose exactly one ranked eligible exercise for every requirement, never reuse an exercise across requirements, and never inject, omit, widen, or rescore candidates.
- Rule: Maximize total score first. For equal totals, use canonical requirement order and each requirement's existing ranking order. If no perfect unique assignment exists or the bounded search cannot finish, fail closed without a partial selection.
- Pattern: planning digest + catalog digest + input-bound coverage digest + input-bound ranking digest -> deterministic unique assignment -> objective/tie-break proof -> runtime receipt -> exact-input recompilation -> later session allocation.
- Failure Mode: Local greedy choice can produce duplicate or globally inferior exercise sets; a recomputed selection digest without exact-input recompilation can authenticate forged omission, injection, or input identity.
- Decision: No portable JSON Schema is exported as semantic authorization. Consumers require `validateGlobalSelectionV1WithReceipt`, then `validateGlobalSelectionAgainstInputsV1` when all four inputs are available.
- Decision: Global Selection v1 does not allocate sessions, prescribe, generate, persist, activate, or change production behavior.
- Evidence: `src/features/curated-onboarding/planning/selection/contract.ts`, `src/features/curated-onboarding/planning/selection/select.ts`, `src/features/curated-onboarding/planning/selection/select.test.ts`, `docs/curated-planning-contract.md`
- Status: Proposed

## 2026-07-29 - Allocate the exact selected set before prescribing it

- Type: Decision
- WHAT changed: Fitness now has a source-only Session Allocation v1 contract that revalidates the complete planning/catalog/coverage/ranking/selection chain, preserves every selected requirement/exercise pair exactly once, maps fixed or count-only schedules into canonical session slots, balances exercise counts deterministically, emits a semantic digest and non-throwing runtime receipt, recompiles from all five exact inputs, pins ten terminal fixtures, and runs in direct exact-head CI.
- WHY it changed: A selected exercise set does not prove when each exercise occurs. Session placement must preserve schedule truth and exact upstream ownership before sets, reps, progression, persistence, or activation can be trusted.
- Rule: Allocation may place only the exact input-bound selected set. It cannot add, omit, replace, duplicate, rescore, or move an exercise outside its canonical round-robin session; zero-based session index must equal `(selectionPosition - 1) % sessionCount`. Fixed weekdays remain exact and count-only schedules never invent weekdays.
- Rule: Every requested session must be non-empty and session exercise counts must differ by at most one. When the requested session count exceeds the selected count, fail closed without partial or empty workout days.
- Pattern: exact five-input chain -> canonical schedule slots -> selection-order round-robin placement -> objective arithmetic -> runtime receipt -> exact-input recompilation -> later prescription.
- Failure Mode: A self-signed allocation can substitute exercises or silently discard selected coverage, while an allocator that invents weekdays or emits empty days turns valid schedule intent into misleading routine truth.
- Decision: No portable JSON Schema is exported as semantic authorization. Consumers require `validateSessionAllocationV1WithReceipt`, then `validateSessionAllocationAgainstInputsV1` when all five inputs are available.
- Decision: Session Allocation v1 does not prescribe, generate persistence records, activate routines, or change production behavior.
- Evidence: `src/features/curated-onboarding/planning/allocation/contract.ts`, `src/features/curated-onboarding/planning/allocation/allocate.ts`, `src/features/curated-onboarding/planning/allocation/allocate.test.ts`, `docs/curated-planning-contract.md`
- Status: Proposed

## 2026-07-29 - Hosted-check waiting is read-only evidence, not a rerun

- Type: Pattern
- WHAT changed: The Fitness release tooling now has a bounded, exact-identity hosted-check watcher that polls an existing PR check graph without rerun or dispatch and writes a content-addressed terminal receipt for `SUCCESS`, `FAILURE`, or `TIMEOUT`. Version 2 binds every required check to `CheckRun` kind, the `github-actions` app, its exact GitHub Actions workflow name, and a run/job URL under the bound repository; a same-name legacy status context, different app/workflow, or foreign-repository URL fails closed. The dedicated workflow watches both watcher source paths as well as the allocation dependency boundary.
- WHY it changed: A bounded wait expiring and the same unchanged check graph later succeeding are different facts. Collapsing them into one mutable latest result erases useful timing evidence; rerunning successful checks only to manufacture a receipt would mutate the evidence being measured.
- Rule: Bind repository, PR, base, head, tree, the exact expected check names, timeout, poll interval, and the normalized check graph. Identity drift, duplicate/unexpected checks, malformed records, or terminal non-success fail closed.
- Rule: Missing or pending expected checks remain pending only until the declared budget. At expiry, emit `TIMEOUT`; do not infer failure and do not rerun or dispatch checks.
- Pattern: exact Git/PR identity + exact expected graph -> bounded read-only polling -> canonical graph digest -> immutable content-addressed terminal receipt.
- Evidence: PR #118's original version-1 observed bounded wait remains pinned as reconstructed receipt `sha256:a43cf648c2a3c37fae89a652e36c60634e4f187fb921bf9c9fefe6219b395b6a`; the unchanged exact head's later version-1 seven-check success remains separately pinned as `sha256:4dd52d9dbd10ffd75e39f4887ad2afddfa645a055de1110e7588744accd8ce27`. Both preserve unmeasured observation timestamps and counts and are retained as historical evidence rather than reissued under the stronger version-2 provenance contract. No observation metadata is inferred and no check was rerun or dispatched to manufacture either receipt.
- Evidence: `scripts/release/fitness-hosted-check-watcher.mjs`, `scripts/release/fitness-hosted-check-watcher.test.mjs`, `.github/workflows/planning-session-allocation-contract.yml`
- Status: Proposed

## 2026-07-29 - Prescribe only the exact input-bound allocation

- Type: Decision
- WHAT changed: Fitness now has a source-only Session Prescription v1 contract that revalidates the complete planning/catalog/coverage/ranking/selection/allocation chain, preserves every allocated exercise and schedule slot, maps frozen catalog classes to deterministic sets/targets/rest/progression/time estimates, emits a semantic digest and non-throwing runtime receipt, recompiles from all six exact inputs, pins ten terminal fixtures, and runs in direct exact-head CI.
- WHY it changed: Allocation establishes when an exercise occurs, but it does not establish an executable target or prove that sets, rest, progression, and session duration remain inside reviewed class and safety boundaries.
- Rule: Prescription may enrich only the exact input-bound allocated set. It cannot add, omit, replace, move, duplicate, or rescore an exercise, invent a starting load, widen a class policy, or exceed a session hard maximum.
- Rule: Goal, experience, and recovery context may choose only within frozen class policy. Targets are canonical integers, rest uses the closed interval set, all time arithmetic recomputes, and an over-budget minimum prescription fails closed without partial sessions.
- Pattern: exact six-input chain -> frozen class policy -> deterministic targets and set counts -> session budget arithmetic -> runtime receipt -> exact-input recompilation -> later routine assembly.
- Failure Mode: Treating equipment capacity as a starting load, accepting self-signed prescription substitutions, or trimming below a safe class minimum can produce an apparently deterministic routine that is unauthentic, unsafe, or impossible within the user's declared time.
- Decision: No portable JSON Schema is exported as semantic authorization. Consumers require `validateSessionPrescriptionV1WithReceipt`, then `validateSessionPrescriptionAgainstInputsV1` when all six inputs are available.
- Decision: Session Prescription v1 does not assemble, persist, activate, render, or change production behavior.
- Evidence: `src/features/curated-onboarding/planning/prescription/contract.ts`, `src/features/curated-onboarding/planning/prescription/prescribe.ts`, `src/features/curated-onboarding/planning/prescription/prescribe.test.ts`, `docs/curated-planning-contract.md`
- Status: Proposed

## 2026-07-29 - Assemble the reviewed prescription without changing it

- Type: Decision
- WHAT changed: Fitness now has a source-only Routine Assembly v1 contract that revalidates the complete planning/catalog/coverage/ranking/selection/allocation/prescription chain, copies every executable prescription field into one deterministic plan envelope, emits a semantic digest and non-throwing runtime receipt, recompiles from all seven exact inputs, pins ten terminal fixtures, and runs in direct exact-head CI.
- WHY it changed: A prescribed session set is executable but is not yet a single versioned handoff document for later persistence. That bridge must preserve reviewed schedule and prescription truth rather than silently reselecting, rescheduling, or enriching exercises.
- Rule: Assembly may copy only the exact input-bound prescription. It cannot add, omit, replace, reorder, move, rename, rescore, or alter schedule, sets, targets, rest, progression, time arithmetic, budgets, or summary values.
- Rule: Presentation names remain outside executable identity. Non-prescribed upstream states produce complete `not_assemblable`, `infeasible`, or `invalid_input` terminals with no partial routine.
- Pattern: exact seven-input chain -> closed routine plan envelope -> runtime receipt that reuses Prescription v1 semantics -> exact-input recompilation -> later persistence.
- Failure Mode: Treating a re-signed plan envelope as source authenticity can accept forged exercise substitution or placement even when the embedded document is internally consistent.
- Decision: No portable JSON Schema is exported as semantic authorization. Consumers require `validateRoutineAssemblyV1WithReceipt`, then `validateRoutineAssemblyAgainstInputsV1` when all seven inputs are available.
- Decision: Routine Assembly v1 does not persist, create, activate, render, deploy, or change production behavior.
- Evidence: `src/features/curated-onboarding/planning/assembly/contract.ts`, `src/features/curated-onboarding/planning/assembly/assemble.ts`, `src/features/curated-onboarding/planning/assembly/assemble.test.ts`, `docs/curated-planning-contract.md`
- Status: Proposed

## 2026-07-29 - Project a persistence intent before choosing a provider

- Type: Decision
- WHAT changed: Fitness now has a source-only Persistence Intent v1 contract that binds the complete exact planner chain, validated Routine Assembly envelope, Planning provenance, catalog/ranking evidence, and canonical user-plus-generation request into a deterministic provider-neutral record graph with a semantic digest and non-throwing runtime receipt.
- WHY it changed: A valid routine plan is not yet proof of lossless, idempotent, concurrency-safe creation. Provider work needs one closed write-plan boundary before any schema, DAL, server-action, or live-data packet can be reviewed safely.
- Rule: User plus generation request owns one semantic uniqueness key. Routine, session, and exercise record identifiers derive deterministically from that identity and exact assembled ownership.
- Rule: The intent retains Planning provenance, all bound versions/digests, the complete assembled prescription, ranking explanations, substitution metadata, and the truthful absence of a v1 warm-up model.
- Rule: Record reconstruction must equal the exact assembled routine. Creation remains `create_only`; activation remains `deferred` and `not_requested`.
- Pattern: exact eight-input planner chain plus canonical request -> closed provider-neutral persistence intent -> runtime self-consistency receipt -> exact-input recompilation -> later provider adapter.
- Failure Mode: Treating a re-signed record graph as source authenticity can accept forged provenance or substitution metadata even when internal identifiers and digests are self-consistent.
- Decision: No portable JSON Schema authorizes persistence. Consumers require `validateRoutinePersistenceIntentV1WithReceipt`, then `validateRoutinePersistenceIntentAgainstInputsV1` when exact inputs are available.
- Decision: Persistence Intent v1 performs no database write, provider call, Supabase change, DAL/server-action integration, activation, UI mutation, deployment, or production action.
- Evidence: `src/features/curated-onboarding/planning/persistence/contract.ts`, `src/features/curated-onboarding/planning/persistence/compile.ts`, `src/features/curated-onboarding/planning/persistence/compile.test.ts`, `docs/curated-planning-contract.md`
- Status: Proposed

## 2026-07-29 - Execute a persistence intent without activating it

- Type: Decision
- WHAT changed: Fitness now has a source-only Supabase Persistence Adapter v1 contract. It adds an authenticated-owner DAL contract, an inert atomic create-or-replay database primitive, explicit planner evidence on the existing routine graph, exact post-write readback, adversarial tests, and direct hosted validation.
- WHY it changed: A deterministic persistence intent is still only a write plan. The provider boundary must preserve its full evidence, enforce ownership and concurrency safety, and prove the exact stored projection without silently activating the created routine.
- Rule: The DAL calls the provider only after the versioned runtime receipt, exact nine-input recompilation, authenticated-user match, ready-to-create status, and bounded provider context all pass.
- Rule: The database requires `auth.uid()` ownership, RLS, an empty function `search_path`, atomic user-plus-generation idempotency, and exactly one global exercise slug for every planner exercise. Execution of the raw primitive is explicitly revoked from `PUBLIC`, `anon`, and `authenticated`; no client-callable or privileged replacement is introduced by this packet.
- Rule: A `security invoker`, empty-`search_path` trigger guard denies `anon` and `authenticated` attempts to insert planner evidence or change any planner-owned field on the routine graph. Legacy all-null planner inserts and non-planner edits remain available.
- Rule: Provider-returned and thrown failures are reduced to closed categorical receipt codes. Raw provider, database, credential, URL, SQL, and attacker-controlled messages never cross the durable receipt boundary.
- Pattern: validated intent plus exact inputs plus authenticated provider context -> atomic create or immutable replay -> full persisted readback -> DAL comparison -> versioned adapter receipt.
- Failure Mode: Trusting a self-consistent intent at a client-callable RPC, exposing the raw persistence primitive to a Data API role, copying provider errors into receipts, using user metadata for authorization, relying on RLS without grants, or returning success before readback can create cross-user, duplicate, partial, unauthentic, or secret-leaking results.
- Decision: Creation remains separate from activation. The RPC never updates `profiles.active_routine_id`; the adapter response requires `activationMutation=false`.
- Decision: At the adapter packet boundary, migration and DAL source existed without a server-authenticated execution entry point. The subsequently reviewed executor remains separate from server-action integration and live execution. Neither packet applies a live migration, calls Supabase during verification, activates a routine, changes UI behavior, deploys, or alters production.
- Evidence: `supabase/migrations/20260729000000_planner_persistence_adapter_v1.sql`, `src/lib/dal/planner-routine-create.ts`, `src/lib/dal/planner-routine-create.test.ts`, `.github/workflows/planning-persistence-adapter-contract.yml`, `docs/curated-planning-contract.md`
- Status: Proposed

## 2026-07-30 - Authenticate before constructing the privileged planner executor

- Type: Decision
- WHAT changed: Fitness now has a source-only Planner Persistence Executor v1. The server-only entry point resolves the current authenticated user, delegates through the exact-input-validating Persistence Adapter v1, and constructs the privileged Supabase client lazily only at the fully validated provider edge. The inert SQL primitive is unavailable to `PUBLIC`, `anon`, and `authenticated`, requires the `service_role` claim, and receives the exact authenticated owner ID explicitly.
- WHY it changed: A provider-neutral intent and a reviewed adapter still did not define a safe application entry point. Trusting a client-supplied owner or exposing the raw RPC would let forged but self-consistent planner evidence bypass exact nine-input recompilation.
- Rule: Authentication and every runtime, exact-input, creatability, owner, and provider-context gate precede privileged client construction. Invalid inputs neither construct that client nor call the persistence primitive.
- Rule: The privileged SQL primitive has no Data API execution grant. The server executor is `server-only`, and the authenticated user ID must match both the exact-input-valid intent and every persisted owner field.
- Pattern: `requireUser` -> runtime receipt -> exact nine-input recompilation -> owner/context validation -> lazy server-only provider client -> service-role-only atomic create-or-replay -> exact readback receipt.
- Failure Mode: Constructing the privileged client before authentication, accepting a caller-supplied owner as authentication, granting the primitive to a Data API role, or wiring the executor into UI before migration and live proof are separately admitted.
- Decision: This packet is source only. It does not apply the migration, invoke a live provider, integrate the onboarding server action, activate a routine, change UI or existing-routine behavior, deploy, or alter production.
- Evidence: `src/lib/dal/planner-routine-executor.ts`, `src/lib/dal/planner-routine-executor.test.ts`, `src/lib/dal/planner-routine-create.ts`, `src/lib/dal/planner-routine-create.test.ts`, `supabase/migrations/20260729000000_planner_persistence_adapter_v1.sql`, `.github/workflows/planning-persistence-adapter-contract.yml`, `docs/curated-planning-contract.md`
- Status: Proposed

## 2026-07-30 - Compose reviewed planner stages behind one fail-closed boundary

- Type: Pattern
- WHAT changed: Fitness now has a source-only Planner Pipeline v1 that composes normalization, catalog validation, coverage, ranking, selection, allocation, prescription, assembly, and persistence intent in one canonical order.
- WHY it changed: Individually valid stage contracts do not prove that an application caller advances them in order, stops at the first non-ready boundary, or preserves every exact upstream identity. That orchestration truth needs its own closed, testable contract before server-action integration.
- Rule: A stage may run only after the prior stage passes both its versioned runtime receipt and exact upstream input validation. The first non-ready, infeasible, or invalid stage is terminal; every later stage field remains null.
- Rule: `ready` requires a runtime-valid and exact-input-valid Persistence Intent v1. Runtime validation closes the embedded chain; callers with raw onboarding inputs must additionally use exact-input recompilation to authenticate the raw source.
- Pattern: raw curated intake + frozen catalog + canonical create-only request -> validated stage prefix -> one terminal envelope -> semantic pipeline digest -> later separately admitted server boundary.
- Failure Mode: Hand-composing the pipeline in a server action, advancing past a non-ready stage, accepting a re-signed stage substitution, or treating the runtime digest as raw-input authenticity can create a deterministic but unauthentic or partial routine.
- Decision: Planner Pipeline v1 remains provider-neutral and source-only. It does not import the executor, apply migrations, call Supabase, persist or activate routines, integrate server actions or UI, deploy, or alter production.
- Evidence: `src/features/curated-onboarding/planning/pipeline/contract.ts`, `src/features/curated-onboarding/planning/pipeline/compile.ts`, `src/features/curated-onboarding/planning/pipeline/compile.test.ts`, `src/features/curated-onboarding/planning/pipeline/fixtures.ts`, `.github/workflows/planning-pipeline-contract.yml`, `docs/curated-planning-contract.md`
- Status: Proposed

## 2026-07-30 - Canonicalize malformed planner request identity once

- Type: Rule
- WHAT changed: Planner Pipeline v1 now compiles and exact-validates Persistence Intent v1 from the same normalized nullable request stored in the pipeline envelope.
- WHY it changed: Retaining raw malformed request evidence only inside the persistence intent let compiler-produced envelopes diverge from runtime recompilation, which can access only the stored normalized request.
- Rule: Normalize request identity once at the pipeline boundary. Persistence-intent compilation, exact validation, the stored envelope, and runtime recompilation must all consume that same canonical value.
- Failure Mode: Compiling a nested intent from a raw malformed request while storing `null` outside it produces different issue evidence and digests, causing the compiler's own terminal envelope to fail its runtime receipt.
- Decision: Malformed object, array, string, `undefined`, and `null` request roots collapse to one nullable identity. Exact-input validation still recompiles the whole pipeline from the caller's raw inputs, and cross-fixture persistence-intent substitution remains rejected.
- Evidence: `src/features/curated-onboarding/planning/pipeline/compile.ts`, `src/features/curated-onboarding/planning/pipeline/compile.test.ts`
- Status: Proposed

## 2026-07-31 - Preserve locally toggled skip state through unrelated session revalidation

- Type: Bug fix
- WHAT changed: `reconcileSessionRowClientState` now preserves a locally toggled `isSkipped` value while an `isSkipOverrideActive` flag is set and the server-provided row disagrees, clearing the override once the server value converges with the local one.
- WHY it changed: `updateSessionExerciseTimerAction`'s `revalidatePath` call for any exercise's rest timer forced every session row to re-reconcile from server props on the next render. `reconcileSessionRowClientState` set `isSkipped: row.isSkipped` unconditionally, with no analog to the existing `shouldPreserveLocalCount` guard used for `loggedSetCount`, so a completed skip toggle could silently revert mid-session from an action unrelated to the skipped exercise.
- Rule: Local optimistic skip state takes precedence over a disagreeing server row only while its override flag is active; once the server row matches the local value, the override clears and a subsequent genuinely newer independent server change is applied normally. This mirrors the existing `setCountOverrideActive` convention rather than introducing a second state store.
- Failure Mode: Overwriting local UI state unconditionally from any revalidated server prop, without a local-precedence window, silently discards a user action whenever an unrelated part of the same page triggers revalidation.
- Decision: This fix touches only `src/components/SessionExerciseFocus.tsx` and `src/components/session/sessionRowClientState.ts`, plus their tests. Target/reps persistence was independently traced and found not to exhibit the analogous bug (the input-reset effect keys on exercise identity, not on the revalidated `exercises` array), so no change was made there beyond regression-locking tests.
- Evidence: `src/components/session/sessionRowClientState.ts`, `src/components/session/sessionRowClientState.test.ts`, `src/components/SessionExerciseFocus.tsx`, `src/lib/measurement-sanitization.test.ts`, `src/lib/session-quick-log.test.ts`
- Status: Applied

## 2026-08-01 - Present rest days as deliberate cards on Today (scope narrowed to live paths)

- Type: Bug fix
- WHAT changed: Added a shared, non-interactive `RestDayCard` primitive and wired it into the Today screen (in-progress-session exercise list, closed day-picker view) so a rest day renders a deliberate card instead of nothing or plain text. Extracted `REST_DAY_CARD_COPY` to a dependency-free module as single source of truth, with `DayList.tsx` re-exporting it for backward compatibility.
- WHY it changed: The Today screen previously rendered no visible content at all for a rest day in the in-progress-session view and the closed day-picker (the tone/summary helper returned nothing for that state), which is indistinguishable from a broken or loading UI.
- Rule: A rest day must render a visually deliberate, accessibly labeled card (real title/subtitle/badge text, not a color-only cue), must not expose exercise-editing controls, and must never create a workout as a side effect of rendering.
- Pattern: Reuse `RoutineOverviewDayCard`'s existing yellow-accent/title-override rest-day treatment as the base, add the new `RestDayCard` primitive on top for surfaces that had no rest-day treatment at all.
- Failure Mode: Silently suppressing the summary/content node for a domain state (rest) reads to a user as a bug rather than an intentional state.
- Decision: This is presentation-only; `is_rest` remains the existing persisted column, no persistence, reorder, or Current Session logic was touched.
- Correction: An initial version of this change also modified `EditRoutineDaysSection.tsx` and added a `editRoutineDayRowPresentation.ts` resolver for it. That component was proven unreachable from any current route (`/routines/[id]/edit` renders only `EditRoutineAutosaveForm`; the live, reorderable day list is `RoutineOverviewDayCard` via `/routines/[id]`, which already had the pre-existing rest-day accent). Those changes were reverted before landing since they shipped no user-facing effect; scope is now limited to the live Today-screen paths only. Whether `EditRoutineDaysSection.tsx` should eventually be wired into a route, or removed as dead code, is a separate decision not made here.
- Evidence: `src/components/day-list/RoutineDayCardPresentation.tsx`, `src/features/day-state/restDayCardCopy.ts`, `src/components/day-list/DayList.tsx`, `src/app/today/TodayExerciseRows.tsx`, `src/app/today/TodayDayPicker.tsx`, `src/app/today/todayRestDayCard.ts`, `src/app/today/page.tsx`, `src/app/today/TodayClientShell.tsx`, `docs/today-state-matrix.md`
- Status: Applied

## 2026-08-01 - Reconcile logged set counts per exercise instead of all-or-nothing

- Type: Bug fix
- WHAT changed: `mergeLoggedSetCountState` now reconciles `current` (local) and `exercises` (server) `loggedSetCount` values independently per exercise id: the server's exercise id list is the key denominator (added/removed ids follow the server), a higher local in-progress count is preserved over a lower/stale server count per key, and a higher (or otherwise different) server count is accepted per key. It returns the original `current` object reference when nothing logically changed, and never mutates either input.
- WHY it changed: The previous implementation was an all-or-nothing equality gate -- the moment any single exercise's count differed between `current` and `next`, it returned the entire server-derived object, discarding every local value including exercises where the local value legitimately differed for a good reason (a higher in-progress count) and even exercises where local and server already agreed. `setCountSync.test.ts`'s existing test ("preserves higher in-progress counts without re-encoding unchanged state") already encoded the intended per-key contract and was failing against this implementation.
- Rule: A pure count-merge function must resolve precedence independently per key; it must not let one key's divergence discard unrelated, already-correct keys. This mirrors (without duplicating) the `setCountOverrideActive` / `isSkipOverrideActive` local-precedence convention already established in `sessionRowClientState.ts`, expressed here as a stateless per-key comparison since this function carries no persistent override flag.
- Failure Mode: An all-or-nothing equality gate on a multi-key map silently corrupts every unrelated entry the instant any single entry diverges, which is far more destructive than the single divergent entry itself.
- Decision: This fix touches only `src/components/session/setCountSync.ts` and its test file. `sessionRowClientState.ts` (the sole consumer of this function's output, via `SessionExerciseFocus.tsx`) already tracks its own independent, persistent override flag per row and was left untouched, since it does not need this function to carry precedence state -- it only needs a per-key value. Traced but not acted on: in the one live call site (`SessionExerciseFocus.tsx`'s `[exercises]`-keyed effect), feeding a local-preferring merged value into `reconcileSessionRowClientState`'s `mergedLoggedSetCount` can clear `setCountOverrideActive` one reconciliation pass earlier than before in the specific case where local is ahead of a still-stale server value, because `serverLoggedSetCount` briefly reads as having "caught up" (matching the just-preserved local value) even though the raw server row has not. The displayed `loggedSetCount` stays numerically correct in that pass regardless, since `setCountOverrideActive` is used only for internal reconciliation bookkeeping and the `areSessionRowClientStateMapsEqual` comparison, not for any visible UI state. Fixing that fully would require changing `reconcileSessionRowClientState` or its caller, which is out of scope for this change.
- Evidence: `src/components/session/setCountSync.ts`, `src/components/session/setCountSync.test.ts`
- Status: Applied

## 2026-08-01 - Queue skip/unskip changes for offline replay instead of silently losing them

- Type: Bug fix
- WHAT changed: `handleSkipToggle` (`SessionExerciseFocus.tsx`) previously had a `try { ... } finally { ... }` around `toggleSkipAction` with no `catch` -- a genuine thrown transport failure (dropped connection, aborted fetch, Next.js server-action RPC failure) skipped both the success and rollback branches entirely, cleared `isSkipPending` in `finally`, and left the row showing a phantom "success" that was never sent and never retried. Added a proactive offline precheck plus the missing `catch`, both of which now durably queue the exercise's ABSOLUTE desired `isSkipped` state (never a "flip current state" intent) into a new IndexedDB-backed offline queue (`src/lib/offline/skip-toggle-queue.ts`) and a new replay worker (`src/lib/offline/skip-toggle-sync-engine.ts`), mirroring the existing set-log offline queue's shape without merging into it.
- WHY it changed: Set-logging already has real offline durability (`enqueueSetLog` / `createSetLogSyncEngine`); skip/unskip had none, and `is_skipped` is a durable field (feeds session analytics, exercise-progress derivation, and history), not ephemeral UI state, so silently losing a queued mutation is a real data-loss bug.
- Rule: The queued command is always an absolute desired state, `{ sessionId, sessionExerciseId, desiredSkipped }`, keyed by a stable per-(sessionId, exerciseId) supersession key so there is at most one queued row per exercise (upsert, never append). Ordering between repeated local commands for the same key is decided by a monotonic `sequence` counter derived from the persisted item itself (`existing.sequence + 1`), never wall-clock time, so it is correct across a page reload and immune to clock-resolution ties. A skip-then-unskip (or vice versa) before replay collapses to one row holding only the final desired value; a genuine no-op re-tap (same value already queued) does not bump the sequence or reset retry/backoff bookkeeping. Replay always sends the current queued value (never a client-side "does this already match the server?" skip), relying on the server's plain `UPDATE` being naturally idempotent -- this is a deliberate choice over trying to detect a no-op locally, since the client's belief about "what the server currently has" can itself be stale (that is the entire reason `isSkipOverrideActive` exists). A resolved `{ ok: false }` from the server (validation/auth/completed-session) is reconciled immediately and never queued -- only a genuinely thrown transport failure, or being offline up front, enqueues. Session completion never waits for a pending skip command: the existing, unmodified `guardLiveSessionMutation` backstop already rejects a stale replay against a no-longer-`in_progress` session with a stable error string, and the new replay worker classifies exactly that resolved rejection (plus a bounded-retry-count fallback for any other persistently-failing error, capped at 5 attempts, unlike the existing set-log engine's unbounded forever-retry) as terminal: remove from the queue, roll back the optimistic UI to the last-known-server value, and notify -- never silently overwrite a completed/reviewed session's recorded skip state.
- Failure Mode: A `try/finally` with no `catch` around an optimistically-applied network mutation converts a genuine transport failure into a silent phantom-success UI state with nothing queued for retry. Separately, an unbounded, uncaught-throw-tolerant retry loop (the existing set-log engine's shape) can either spin forever on a permanently-rejected mutation or wedge an item in `"syncing"` forever if the replay call itself throws (e.g. an expired-auth redirect) -- the new engine explicitly `try/catch`es the replay call and bounds retries so neither gap is copied into new code.
- Decision: Extended the existing `fawxzzy-fitness-offline` IndexedDB database (bumped `OFFLINE_DB_VERSION` 4 -> 5 in `set-log-queue.ts`, additive-only `onupgradeneeded` change) with a new, separate `skip-toggle-queue` object store rather than merging into the existing `set-log-queue` store: set-log's dedupe semantics are append-many-per-exercise deduped by a per-action `clientLogId`, while skip-toggle's are upsert-one-row-per-exercise keyed by `(sessionId, exerciseId)` -- opposite dedupe models that would otherwise force a fake per-action id onto skip commands (defeating the coalescing design) or risk a type-narrowing bug in existing consumers that assume every `set-log-queue` row is a loggable set. No change to `toggleSkipAction`'s signature/semantics or to `guardLiveSessionMutation`'s behavior (only exported its two existing error-string constants for reuse by the client-side terminal classifier) -- the replay worker reuses `toggleSkipAction` exactly as-is, so no new server action or Supabase schema/migration was needed or added. `sessionRowClientState.ts`'s existing `isSkipOverrideActive` reconciliation was read but deliberately left untouched (including the required-reading design packet's own suggestion to add an `isSkipQueued` field to it): the pending-queue indicator instead reuses the existing `OfflineSyncBadge` (extended, additively, to also count pending skip-toggle items alongside pending set-logs) rather than inventing a new per-row visual state or a bespoke UI language, per this repo's convention of mirroring existing pending/error surfaces. Explicitly out of scope and not solved: cross-device conflict resolution. There is no revision/version token on `session_exercises` today, and none was added (that would be a provider schema change, which this fix deliberately avoids) -- a queued command from one device can still be a stale last-writer-wins overwrite if a different device changed the same exercise's skip state in the meantime, for as long as the session both devices are targeting remains `in_progress`. The only backstop against a stale write is the existing post-completion `guardLiveSessionMutation` rejection; this is a same-client queued-intent supersession design only, not a distributed conflict-resolution one.
- Evidence: `src/lib/offline/skip-toggle-queue.ts`, `src/lib/offline/skip-toggle-queue.test.ts`, `src/lib/offline/skip-toggle-reconciliation.ts`, `src/lib/offline/skip-toggle-reconciliation.test.ts`, `src/lib/offline/skip-toggle-sync-engine.ts`, `src/lib/offline/skip-toggle-sync-engine.test.ts`, `src/lib/offline/set-log-queue.ts`, `src/lib/session-live-mutation.ts`, `src/components/OfflineSyncBadge.tsx`, `src/components/SessionExerciseFocus.tsx`
- Status: Applied

## 2026-08-01 - Remove unreachable EditRoutineDaysSection dead code

- Type: Cleanup
- WHAT changed: Deleted `src/app/routines/[id]/edit/EditRoutineDaysSection.tsx`. Corrected two stale comments that referenced it as if it were a live surface: `src/app/today/TodayDayPicker.tsx`'s rest-day-card comment now names `RoutineOverviewDayCard` instead of "Edit Routine day-list", and `src/features/day-state/restDayCardCopy.ts`'s module doc comment no longer lists "Edit Routine day-list" among the surfaces sharing `REST_DAY_CARD_COPY`.
- WHY it changed: `EditRoutineDaysSection` was exported but never imported anywhere in the app -- `/routines/[id]/edit` (`page.tsx`) renders only `EditRoutineAutosaveForm`, and the live, reorderable day list is `RoutineOverviewDayCard` (`src/components/day-list/RoutineDayCardPresentation.tsx`) at `/routines/[id]`. This matches the 2026-08-01 "Present rest days as deliberate cards on Today" entry's own Correction note, which documented that an `EditRoutineDaysSection.tsx` edit and its `editRoutineDayRowPresentation.ts` resolver had already been reverted before landing for exactly this reason. Re-verified independently here via full-repo grep for `EditRoutineDaysSection`, `EditRoutineDay`, and `RoutineDaysSection` (case-insensitive): the only hits were the file itself and that prior PLAYBOOK_NOTES.md entry. No dynamic import, barrel export, Storybook file, test import, or string-based lookup referenced it. No dedicated test file or resolver file (`EditRoutineDaysSection.contract.test.ts`, `editRoutineDayRowPresentation.ts`) exists on current `main` -- both were already reverted along with the resolver in the prior wave, so there was nothing further to delete beyond the component itself.
- Rule: A component with zero import sites anywhere in the app (verified by full-repo grep, not just its own route) is dead code and safe to delete outright; comments that describe a dead component as a live comparison point must be corrected to name the actual live component instead of left dangling.
- Failure Mode: Leaving stale comments that describe a dead component as a currently-shared surface misleads future readers into believing a code path is live and shared, causing them to either avoid touching the dead file (mistaking it for load-bearing) or miss updating the real shared surface when the copy actually changes.
- Decision: This is deletion-and-comment-only; no behavior changed. `RoutineOverviewDayCard`, `RoutineHomeClient.tsx`, `DayList.tsx`, and all Today-screen logic beyond the two comment corrections were left untouched. `/routines/[id]/edit` continues to render only `EditRoutineAutosaveForm`, unaffected by this removal.
- Evidence: `src/app/routines/[id]/edit/EditRoutineDaysSection.tsx` (deleted), `src/app/routines/[id]/edit/page.tsx`, `src/components/day-list/RoutineDayCardPresentation.tsx`, `src/app/today/TodayDayPicker.tsx`, `src/features/day-state/restDayCardCopy.ts`
- Status: Applied

## 2026-08-01 - Split the auth UI contract from the global design-system contract, and restore two silently-dropped auth tests

- Type: Bug fix
- WHAT changed: `test:auth-ui-contracts` referenced `src/components/ui/app/designSystem.contract.test.ts`, a path that never existed anywhere in this repo's history. `node --test` silently drops a nonexistent file argument rather than erroring, so the script always exited 0 while quietly running fewer suites than it claimed. Full git history of this script (`git log --all -p -- package.json`) also revealed a second, independent drift: two genuinely auth-specific tests -- `src/app/forgot-password/page.test.ts` and `src/app/reset-password/recovery-fragment.test.ts` -- were briefly wired into this script (commit `5c23eca8`) and then silently dropped back out during an unrelated multi-commit quarantine-recovery merge shortly after (`e99caa8d` and neighbors), with no commit message or note explaining an intentional removal. Both files still exist, are real, and pass standalone (5/5) -- they were just never wired back in. `test:auth-ui-contracts` now runs the true, complete auth-specific set: `loginScreenState.test.ts`, `LoginScreen.contract.test.ts`, `forgot-password/page.test.ts`, `reset-password/recovery-fragment.test.ts`, `local-dev-auto-entry.test.ts`. Separately, `tests/design-system-contract.test.mjs` -- a real, substantive, pre-existing global design-system bridge test (verifies the frozen `truth-pack/fitness/design-system/*.v1.json` pack and its bridge across the whole app: headers, workout entry, measurements, session timers, day-detail cards, none of which are auth-specific) -- gets its own new, accurately-named script, `test:design-system-contract`, rather than being folded into the auth gate.
- WHY it changed: An initial attempt to fix the broken path by wiring the global design-system test into `test:auth-ui-contracts` was itself an architecture mismatch -- that test asserts against workout-entry, measurement, and session-timer components, none of which are login/auth surfaces, so folding it into "auth UI contracts" would make that gate fail for reasons that have nothing to do with auth. A second, independent instance of drift (the two silently-dropped auth-specific tests) was also found while investigating, and is the more faithful fix for what "auth-ui-contracts" should actually contain.
- Rule: A multi-file `node --test` invocation exiting 0 does not prove every named file executed -- verify file existence is proven, not just exit code, when wiring or auditing a test script. A test script's name is a contract about its denominator; folding an unrelated, broader test suite into a narrowly-named script to "make it pass" is itself a form of the same drift it's meant to catch.
- Failure Mode: Referencing a test file that does not exist produces a script that looks green forever while silently testing less than it claims to. Wiring a global/cross-cutting test into a narrowly-scoped gate makes that gate fail for unrelated reasons and obscures which surface actually broke.
- Decision: This is script-wiring-only. No production component was modified. `test:design-system-contract` currently fails 1/5: `tests/design-system-contract.test.mjs` asserts `SessionTimers.tsx` still references `appTokens.currentSessionLoggerSummaryCard`, but that token (along with its `...Stack` and `...Eyebrow` siblings, though not `...Text`, which survives reused in `ExercisePicker.tsx`/`SessionExerciseBlock.tsx`/`LoggedSetSummaryRow.tsx`) is genuinely unused anywhere in the app today -- an apparent past refactor of the session logger summary card left these three tokens and this specific contract assertion orphaned. Fixing that touches Current Session source (`SessionTimers.tsx`, `tokens.ts`, `designSystem.ts`) and the frozen contract test itself, both explicitly out of scope for this change; left untouched and held as a separate, named, tracked failure under its own script rather than smuggled into another gate's denominator. `test:auth-ui-contracts` itself now passes in full (its denominator is exclusively real, currently-passing, genuinely auth-specific files). Neither script is currently invoked by any GitHub Actions workflow (confirmed via direct grep of `.github/workflows/`), so this repair changes no automated CI gate's pass/fail state -- it only makes both `npm run` commands truthful about what they contain and whether that content currently passes.
- Evidence: `package.json` (`test:auth-ui-contracts`, `test:design-system-contract` scripts), `src/app/forgot-password/page.test.ts`, `src/app/reset-password/recovery-fragment.test.ts`, `tests/design-system-contract.test.mjs`, `docs/recovery/*.json` (the quarantine-recovery audit trail where the two auth tests were silently dropped)
- Status: Applied

## 2026-08-01 - Reconcile the design-system contract with the orphaned session logger summary-card tokens

- Type: Cleanup
- WHAT changed: Removed `currentSessionLoggerSummaryCard` and `currentSessionLoggerSummaryStack` and `currentSessionLoggerSummaryEyebrow` from `src/components/ui/app/tokens.ts`, along with their backing `currentSessionLoggerSummaryCardClassName`, `currentSessionLoggerSummaryStackClassName`, and `currentSessionLoggerSummaryEyebrowClassName` definitions in `src/components/ui/app/designSystem.ts`. Removed the corresponding `assert.ok(sessionTimers.includes("appTokens.currentSessionLoggerSummaryCard"))` line from `tests/design-system-contract.test.mjs`. `currentSessionLoggerSummaryText` (and its backing `...TextClassName`) was deliberately left untouched -- it is still a live consumer in `ExercisePicker.tsx`, `SessionExerciseBlock.tsx`, and `LoggedSetSummaryRow.tsx`.
- WHY it changed: This is the failure the prior "Split the auth UI contract" entry (immediately above) explicitly called out and deferred. Re-verified independently here: `git log --all -p -S "currentSessionLoggerSummaryCard" -- src/components/SessionTimers.tsx` shows the summary card was removed from `SessionTimers.tsx` in commit `ad36d3bc` ("feat: ship fitness progression and session updates"), which deleted the `MeasurementDockSummary`-based `currentSummary` element and the per-history-row summary cards entirely, replacing them with a different UI (a button-based "Apply Last" affordance using `SignatureInlineList` directly, no card/stack/eyebrow wrapper). This was a genuine, intentional product redesign, not an accidental regression -- confirmed none of the three recent waves that also touched `SessionTimers.tsx` (A3's session-persistence fix, the viewport/focus fix, the skip-offline-queue fix) touched this area. A full-repo grep (`src/`, `tests/`, `truth-pack/`, `docs/`) for all three token names and their backing className names found zero references anywhere except their own definitions -- the "logger summary card" concept is genuinely gone from the live UI, and the frozen `truth-pack/fitness/design-system/*.v1.json` files never referenced these specific token names literally (the pack is abstract, describing primitive shapes like `card` and `section-layout`, not per-token identifiers), so no truth-pack change was needed.
- Rule: When a frozen contract test asserts a literal token name that a later, intentional feature redesign genuinely removed from the live UI (not an accidental drop), the correct fix is to remove the orphaned token definitions and update the test to match reality, not to re-add dead styling hooks to the redesigned component. A design-token constant with zero references anywhere in the repo outside its own definition and its own backing className is dead and safe to delete alongside its backing className.
- Failure Mode: Leaving a frozen contract test asserting a literal string that no longer exists in the live component it names makes `npm run test:design-system-contract` permanently red for a reason that has nothing to do with an actual regression, training reviewers to ignore or skip the gate.
- Decision: Scope held to exactly the three orphaned tokens and the one test assertion; the surviving `...SummaryText` sibling, `MeasurementDockSummary` (itself now unused by `SessionTimers.tsx` but still exported and out of scope here), and all session persistence/offline-queue/viewport-focus behavior were left untouched.
- Evidence: `src/components/ui/app/tokens.ts`, `src/components/ui/app/designSystem.ts`, `tests/design-system-contract.test.mjs`
- Status: Applied
## 2026-07-30 - Authenticate planner execution commands before the provider edge

- Type: Pattern
- WHAT changed: Fitness now has a source-only Planner Execution Command v1 boundary that recompiles the complete Planner Pipeline v1 chain and emits either one exact-input-authenticated command or one closed non-executable terminal with no partial command.
- WHY it changed: A validated pipeline and a server-only executor were still separated by an unstated handoff. Without a closed command contract, a later caller could omit exact source binding, substitute provider context, or invoke persistence after a non-ready terminal.
- Rule: An execution command may exist only when the embedded pipeline is `ready`, passes its runtime receipt, and passes exact recompilation from the caller's onboarding, catalog, and persistence request. The command must bind the pipeline digest, exact stage inputs, Persistence Intent v1, and canonical provider context.
- Pattern: exact raw planner inputs + bounded provider context -> exact-valid Planner Pipeline v1 -> one runtime-valid semantic command -> later separately admitted server executor integration.
- Failure Mode: Constructing a command from runtime-valid but source-unauthenticated evidence, allowing a command on a terminal pipeline, accepting caller-substituted provider context, or importing the server-only executor at this provider-neutral layer can cross the reviewed execution boundary.
- Decision: Planner Execution Command v1 is provider-neutral and source-only. It does not import or invoke the executor or DAL, apply migrations, call Supabase, persist or activate routines, integrate server actions or UI, deploy, or alter production.
- Evidence: `src/features/curated-onboarding/planning/execution/contract.ts`, `src/features/curated-onboarding/planning/execution/compile.ts`, `src/features/curated-onboarding/planning/execution/compile.test.ts`, `src/features/curated-onboarding/planning/execution/fixtures.ts`, `.github/workflows/planning-execution-command-contract.yml`, `docs/curated-planning-contract.md`
- Status: Proposed

## 2026-08-13 - Require installed mode for mobile app entry

- Type: Access boundary + Coverage
- WHAT changed: Protected app routes now redirect iOS and Android browser tabs to the existing install guide and render a loading state while that client-only decision resolves. The guide keeps desktop continuation available, but withholds its primary entry action on mobile until the app is running in standalone mode. Local development login automation remains an explicit query opt-in. Added context and source-contract coverage for iPhone, iPadOS, Android, standalone mode, and the mobile install surfaces.
- WHY it changed: Mobile browser tabs could render protected Fitness content before the install decision settled, and Android did not share the iOS installed-app boundary. That conflicted with the product rule that mobile access starts from the Home Screen app rather than a browser tab.
- Rule: On iOS and Android, only a standalone or fullscreen installed launch may enter protected Fitness routes. Browser tabs and in-app browsers must stay on installation guidance without an app-entry continuation. Desktop browser access remains unchanged.
- Failure Mode: Treating installation as a decorative prompt leaves a browser-tab bypass, can flash protected content during hydration, and makes iOS and Android follow different entry rules.
- Evidence: `src/components/install/ProtectedAppInstallGate.tsx`, `src/components/install/InstallRouteSurface.tsx`, `src/components/install/IOSAddToHomeScreenGate.tsx`, `src/lib/install/getInstallContext.ts`, `src/lib/install/getInstallContext.test.ts`, `src/lib/install/config.test.ts`, `src/app/login/page.tsx`, `src/app/login/page.contract.test.ts`.
- Status: Applied in source; normal PR review and lifecycle remain pending. No Auth, provider, deployment, or production mutation is part of this change.

## 2026-08-16 - Migrate legacy Fitness browser links to the branded origin

- Type: Routing contract + Migration safety
- WHAT changed: Fitness middleware now returns a permanent redirect from the exact stable legacy browser host `fawxzzy-fitness-local.vercel.app` to `fitness.fawxzzy.com`, preserving the requested path and query. The rule applies only to `GET` and `HEAD` requests outside `/api/`; branded, preview, immutable-deployment, spoofed-header, and API requests do not match. Focused coverage pins those boundaries, and the migration runbook records the user, provider, PWA, and rollback contracts.
- WHY it changed: The branded origin was already canonical and live, but old bookmarks and public Vercel links still rendered directly on the legacy host. A blanket redirect would risk breaking signed webhooks and OAuth callbacks before their separately governed provider configuration is migrated, while deleting or redirecting immutable deployment URLs would weaken rollback evidence.
- Rule: Redirect only the exact stable legacy hostname and only browser-safe navigation methods. Keep API traffic compatible until provider destinations and allowlists are independently moved and read back. Never redirect previews or immutable deployment URLs as part of a stable-alias migration.
- Failure Mode: Redirecting every legacy-host request can interrupt signed provider traffic; matching a forwarded host header can allow spoofed routing; redirecting every `*.vercel.app` hostname removes preview and rollback isolation.
- Evidence: `src/middleware.ts`, `src/middleware.test.ts`, `docs/ops/FITNESS-BRANDED-HOST-MIGRATION-2026-08-16.md`.
- Status: Applied in source; provider configuration, ready, merge, deployment, and production remain separate lifecycle boundaries.

## 2026-08-20 - Measure legacy Fitness origin visits without identity

- Type: Privacy boundary + Migration evidence
- WHAT changed: The legacy-host redirect now carries a one-use categorical compatibility marker to the branded origin. The client removes that marker immediately and, only when a separately configured first-party collector exists, sends one fixed `compatibility_visit` payload with credentialless `fetch`. No cookies, account identifiers, referrer, user agent, free-form URL, or free-form text are collected.
- WHY it changed: The legacy origin cannot be retired safely without a trustworthy observation window, but measuring that traffic must not create a new identity or credential surface.
- Rule: Compatibility analytics are closed categorical evidence only. The browser transport must explicitly omit credentials, and provider activation, retention, production deployment, and eventual redirect retirement remain separate decisions.
- Failure Mode: Using credential-including browser transport or accepting caller-defined analytics fields would turn a bounded migration counter into an unintended tracking surface.
- Evidence: `src/middleware.ts`, `src/middleware.test.ts`, `src/components/LegacyOriginAnalytics.tsx`, `src/lib/legacy-origin-analytics.ts`, `src/lib/legacy-origin-analytics.test.ts`, `docs/ops/FITNESS-LEGACY-ORIGIN-ANALYTICS-2026-08-20.md`.
- Status: Applied in source; collector activation, review, merge, deployment, production, observation, and redirect retirement remain separate boundaries.

## 2026-08-22 - Keep unsupported browsers blocked without giving impossible install guidance

- Type: Access boundary + Install guidance + Coverage
- WHAT changed: The installed-app gate still blocks protected Fitness routes outside standalone mode. The install surface now classifies whether the current browser has a supported installation path; unsupported browsers receive a fixed browser-choice explanation and may copy the Fitness link, but receive no continuation or app-entry action. Added Firefox and install-surface contract coverage for that boundary.
- WHY it changed: Firefox and similar unsupported contexts cannot complete the prescribed installation flow. Sending them to a nonexistent browser menu was misleading, while letting them continue into the app would violate the product rule that Fitness access begins from the installed Home Screen app.
- Rule: Browser support detection may improve installation guidance, never relax the standalone-only protected-route boundary. Unsupported contexts must receive a truthful alternate-browser instruction rather than an app-entry bypass.
- Failure Mode: Treating every non-standalone browser as install-capable creates dead-end instructions; treating unsupported capability as an access exception reintroduces a browser-tab bypass.
- Evidence: `src/lib/install/getInstallContext.ts`, `src/lib/install/getInstallContext.test.ts`, `src/components/install/InstallRouteSurface.tsx`, `src/lib/install/config.test.ts`.
- Status: Source-proven locally; normal PR correction lifecycle remains pending. No Auth, provider, deployment, or production mutation is part of this change.

## 2026-08-22 - Keep supported browser guidance and editable login fields truthful

- Type: Install guidance + Login interaction + Coverage
- WHAT changed: Desktop Safari is now identified as Safari when determining whether a browser has a supported Fitness installation path; iOS-only install gates remain iOS-only and protected app routes remain standalone-only. The login form no longer moves focus to Password during delayed remembered-email synchronization, so an explicit user interaction with the editable email-or-username field is never interrupted.
- WHY it changed: The unsupported-browser guidance could misclassify macOS Safari and instruct it to use Safari. Separately, delayed synchronization at 160, 520, and 1100 milliseconds could take focus away from a user who had selected the editable remembered email field, sending subsequent typing to Password.
- Rule: Browser capability detection must distinguish guidance from protected-route access. Form synchronization may update state from existing controls but must not override a user-selected editable field.
- Failure Mode: An iOS-specific Safari predicate reused as desktop capability detection gives circular guidance. Repeated timer-driven focus calls make a visible editable field appear usable while silently redirecting user input.
- Evidence: `src/lib/install/getInstallContext.ts`, `src/lib/install/getInstallContext.test.ts`, `src/app/login/LoginScreen.tsx`, `src/app/login/LoginScreen.contract.test.ts`.
- Status: Source correction pending focused verification and exact-head review. No Auth, provider, deployment, or production mutation is part of this change.
