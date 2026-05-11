# Fitness Supabase Privacy Remediation Plan

Status: planning only.

This document is the Fitness-owned remediation plan for the Supabase advisor findings currently tracked in Foundation.

Non-goals for this lane:
- no Supabase mutation
- no Fitness production behavior change
- no claim that privacy posture is proved

## Owner model

- Fitness owns schema, policy, migration, and operator remediation work.
- Foundation tracks evidence, blocked posture, scorecard warning, and future change-bundle flow.

## Evidence inputs

- Foundation privacy remediation tracker
- Foundation Supabase inventory draft and advisor findings
- Fitness migration chain under `supabase/migrations`

## Wave 1A status

- Scope: fix only the four `function_search_path_mutable` findings with an isolated migration.
- Current implementation file:
  - `supabase/migrations/20260506173000_047_function_search_path_hardening.sql`
- Proof status:
  - applied and proved
  - post-apply security advisors cleared the four `function_search_path_mutable` findings
- Explicitly deferred from this wave:
  - `anon_security_definer_function_executable`
  - `authenticated_security_definer_function_executable`
- Deferred affected functions:
  - `public.assign_real_user_number_on_profile_insert()`
  - `public.is_automation_auth_user(target_user_id uuid)`
- Reason for deferral:
  - permission hardening and search-path hardening should not be mixed into one PR because rollback and post-change advisor proof would become ambiguous.

## Wave 1C status

- Scope: revoke inherited public API execution from the two internal-only `SECURITY DEFINER` functions without changing their bodies or execution mode.
- Current implementation file:
  - `supabase/migrations/20260506190000_048_security_definer_execute_revokes.sql`
- Proof status:
  - applied and proved
  - post-apply security advisors cleared both `anon_security_definer_function_executable` and `authenticated_security_definer_function_executable`
- Cleared affected functions:
  - `public.assign_real_user_number_on_profile_insert()`
  - `public.is_automation_auth_user(target_user_id uuid)`
- Remaining separate security lane:
  - `auth_leaked_password_protection`
- Reason this stayed separate:
  - permission hardening was intentionally isolated from Supabase Auth operator settings, RLS rewrites, and performance remediation so the post-change proof stayed unambiguous.

## Current finding classes

| Finding class | Likely owner action | Current posture | PR size |
| --- | --- | --- | --- |
| `function_search_path_mutable` | migration PR | proved | S |
| `anon_security_definer_function_executable` | migration PR after usage classification | proved | S |
| `authenticated_security_definer_function_executable` | migration PR after usage classification | proved | S |
| `unindexed_foreign_keys` | migration PR after confirmed advisor export | proved | S-M |
| `auth_rls_initplan` | migration PR series | planned | M-L |
| `auth_leaked_password_protection` | Supabase operator action | open | S |
| `unused_index` | observation-first review, maybe migration PR later | deferred | S |

## Recommended wave order

### Wave 1

Low-risk schema hygiene and deterministic SQL hardening.

1. `unindexed_foreign_keys`

### Wave 2

RLS performance optimization without changing access intent.

4. `auth_rls_initplan`

### Wave 3

Operator-owned auth hardening.

5. `auth_leaked_password_protection`

### Wave 4

Telemetry-backed cleanup only after earlier waves settle.

6. `unused_index`

## Lane details

### 1. `function_search_path_mutable`

- Affected surfaces:
  - `public.repack_session_exercise_positions_after_delete`
  - `public.repack_routine_day_exercise_positions_after_delete`
  - `public.reorder_routine_day_exercises`
  - `public.claim_session_follow_up_jobs`
- Likely source files:
  - `supabase/migrations/035_session_and_routine_ordering_hardening.sql`
  - `supabase/migrations/037_follow_up_job_leases_and_safe_repack.sql`
  - reference pattern already exists in `supabase/migrations/044_real_user_numbers.sql`
- Proposed fix:
  - add explicit `set search_path = public, pg_temp` on functions that do not need `auth`
  - keep fully qualified table references
  - use the `044_real_user_numbers.sql` pattern as the local reference for explicit search path ownership
- Verification command:
  - `pnpm migration:validate`
  - reviewed Supabase advisor refresh after draft migration is applied in a safe environment
- Rollback concern:
  - overly narrow `search_path` can break unqualified identifiers if any remain
- Risk if ignored:
  - function execution keeps a mutable search path and blocks stronger privacy posture claims
- Requires:
  - code or migration PR
  - reviewed post-change advisor evidence

### 2. `unindexed_foreign_keys`

- Confirmed advisor surfaces:
  - `public.session_exercises.exercise_id`
  - `public.routine_day_exercises.exercise_id`
  - `public.sessions.routine_id`
  - `public.exercise_stats.exercise_id`
- Current implementation file:
  - `supabase/migrations/20260507130000_049_fk_covering_indexes.sql`
- Current status:
  - applied and proved
  - post-apply performance advisors cleared all four `unindexed_foreign_keys` findings
- Existing references that already appear covered by leading-column indexes:
  - `public.routine_days.routine_id`
  - `public.sets.session_exercise_id`
  - `public.session_follow_up_jobs.session_id`
  - `public.profiles.active_routine_id`
- Likely source files:
  - `supabase/migrations/002_routines.sql`
  - `supabase/migrations/008_exercises_table_and_rls.sql`
  - `supabase/migrations/024_session_exercises_routine_day_exercise_fk.sql`
  - `supabase/migrations/026_exercise_stats_cache.sql`
- Proposed fix:
  - add narrow covering indexes only for the still-unindexed referencing columns
  - avoid redundant indexes where a leading-column composite already satisfies the FK path
  - keep the lane limited to:
    - `idx_session_exercises_exercise_id`
    - `idx_routine_day_exercises_exercise_id`
    - `idx_sessions_routine_id`
    - `idx_exercise_stats_exercise_id`
- Verification command:
  - `pnpm migration:validate`
  - reviewed Supabase advisor refresh proving the specific FK findings were removed
- Rollback concern:
  - duplicate or poorly chosen indexes add write overhead without removing the advisor finding
- Risk if ignored:
  - deletes and joins across referenced tables can degrade and amplify policy overhead
- Requires:
  - code or migration PR
  - reviewed advisor proof after apply

### 2A. `anon_security_definer_function_executable` / `authenticated_security_definer_function_executable`

- Current affected functions:
  - `public.assign_real_user_number_on_profile_insert()`
  - `public.is_automation_auth_user(target_user_id uuid)`
- Current source file:
  - `supabase/migrations/044_real_user_numbers.sql`
- Intended call-path classification:
  - `public.assign_real_user_number_on_profile_insert()`
    - trigger-only
    - invoked by `profiles_assign_real_user_number_before_insert`
    - no repo evidence of app RPC usage
  - `public.is_automation_auth_user(target_user_id uuid)`
    - internal helper
    - called by `assign_real_user_number_on_profile_insert()`
    - also used by the one-time migration backfill in `044_real_user_numbers.sql`
    - no repo evidence of app RPC usage
- Why not `SECURITY INVOKER` by default:
  - `is_automation_auth_user()` reads `auth.users`, so switching away from `SECURITY DEFINER` may break the intended privileged read path
  - `assign_real_user_number_on_profile_insert()` runs inside a trigger path and should be kept behaviorally stable while the exposure issue is fixed
- Recommended remediation path:
  - keep both functions behaviorally intact
  - keep `SECURITY DEFINER` unless later proof shows it is unnecessary
  - revoke `EXECUTE` from `public`, `anon`, and `authenticated`
  - preserve trigger and internal function execution
  - consider moving the helper out of the exposed `public` API surface only after the revoke-first lane is proved
- Safer-than alternatives:
  - better than changing to `SECURITY INVOKER` without re-proving access to `auth.users`
  - better than mixing schema moves, search-path changes, and permission revokes in one PR
- Verification path:
  - `pnpm migration:validate`
  - reviewed security advisor refresh proving both `anon_security_definer_function_executable` and `authenticated_security_definer_function_executable` findings clear
  - smoke check that profile insert still works for a normal signed-in user path
  - smoke check that existing automation-account classification logic still behaves correctly
- Rollback concern:
  - if any hidden RPC or external operator path relies on PostgREST execution of either function, revoking `EXECUTE` will break that path immediately
- Risk if ignored:
  - exposed `SECURITY DEFINER` functions remain callable through the public API surface and keep Fitness in a warning posture
- Requires:
  - code or migration PR
  - reviewed advisor proof after apply

### 3. `auth_rls_initplan`

- Affected surfaces:
  - `public.sessions`
  - `public.session_exercises`
  - `public.sets`
  - `public.profiles`
  - `public.routines`
  - `public.routine_days`
  - `public.routine_day_exercises`
  - `public.exercises`
  - `public.exercise_stats`
  - `public.session_follow_up_jobs`
- Policy-heavy source files:
  - `supabase/migrations/001_init.sql`
  - `supabase/migrations/002_routines.sql`
  - `supabase/migrations/005_ui_core_fix_pack.sql`
  - `supabase/migrations/006_session_status.sql`
  - `supabase/migrations/008_exercises_table_and_rls.sql`
  - `supabase/migrations/015_history_log_audit_notes.sql`
  - `supabase/migrations/026_exercise_stats_cache.sql`
  - `supabase/migrations/036_session_follow_up_jobs.sql`
- Current advisor count:
  - 40 findings
  - 10 tables x 4 policies each (`select`, `insert`, `update`, `delete`)
- Proposed fix:
  - replace direct `auth.uid()` predicates with initplan-friendly forms such as `(select auth.uid())`
  - preserve the existing access intent and table ownership semantics
  - stage the work by table family instead of rewriting every policy in one oversized PR
- Proposed batch map:
  - Wave 2A-1 Session core
    - tables: `sessions`, `session_exercises`, `sets`
    - policy count: 12
    - source migrations: `001_init.sql`, `005_ui_core_fix_pack.sql`, `006_session_status.sql`, `015_history_log_audit_notes.sql`
    - implementation file: `supabase/migrations/20260509100000_050_session_core_rls_initplan.sql`
    - status: applied and proved
  - Wave 2A-2 Routine core
    - tables: `routines`, `routine_days`, `routine_day_exercises`
    - policy count: 12
    - source migration: `002_routines.sql`
    - implementation file: `supabase/migrations/20260510090000_052_routine_core_rls_initplan.sql`
    - status: applied and proved
  - Wave 2A-3 Profile and catalog core
    - tables: `profiles`, `exercises`, `exercise_stats`
    - policy count: 12
    - source migrations: `002_routines.sql`, `008_exercises_table_and_rls.sql`, `026_exercise_stats_cache.sql`
    - implementation file: `supabase/migrations/20260510110000_053_profile_catalog_rls_initplan.sql`
    - status: applied and proved
  - Wave 2A-4 Follow-up jobs
    - table: `session_follow_up_jobs`
    - policy count: 4
    - source migration: `036_session_follow_up_jobs.sql`
    - implementation file: `supabase/migrations/20260511093000_054_follow_up_jobs_rls_initplan.sql`
    - status: applied and proved
- Policy map:
  - Session core
    - `sessions_select_own`, `sessions_insert_own`, `sessions_update_own`, `sessions_delete_own`
    - `session_exercises_select_own`, `session_exercises_insert_own`, `session_exercises_update_own`, `session_exercises_delete_own`
    - `sets_select_own`, `sets_insert_own`, `sets_update_own`, `sets_delete_own`
  - Routine core
    - `routines_select_own`, `routines_insert_own`, `routines_update_own`, `routines_delete_own`
    - `routine_days_select_own`, `routine_days_insert_own`, `routine_days_update_own`, `routine_days_delete_own`
    - `routine_day_exercises_select_own`, `routine_day_exercises_insert_own`, `routine_day_exercises_update_own`, `routine_day_exercises_delete_own`
  - Profile and catalog core
    - `profiles_select_own`, `profiles_insert_own`, `profiles_update_own`, `profiles_delete_own`
    - `exercises_select_global_or_own`, `exercises_insert_own_only`, `exercises_update_own_only`, `exercises_delete_own_only`
    - `exercise_stats_select_own`, `exercise_stats_insert_own`, `exercise_stats_update_own`, `exercise_stats_delete_own`
  - Follow-up jobs
    - `session_follow_up_jobs_select_own`, `session_follow_up_jobs_insert_own`, `session_follow_up_jobs_update_own`, `session_follow_up_jobs_delete_own`
- Implementation notes:
  - prefer batch-local `drop policy` + `create policy` rewrites so the diff stays mechanical
  - keep all non-auth predicates intact; only wrap auth calls in `select`
  - preserve the special `exercises_select_global_or_own` semantics exactly:
    - `user_id is null or user_id = (select auth.uid())`
  - preserve paired `using` and `with check` clauses symmetrically on `update` policies
- Verification command:
  - `pnpm migration:validate`
  - reviewed advisor refresh after each policy batch
  - owner review that authenticated read/write behavior is unchanged
- Smoke-test checklist:
  - signed-in user can read, insert, update, and delete own `sessions`, `session_exercises`, and `sets`
  - signed-in user can read, insert, update, and delete own `routines`, `routine_days`, and `routine_day_exercises`
  - signed-in user can read and update own `profiles`
  - signed-in user can read global exercises and manage owned exercises only
  - signed-in user can read and mutate own `exercise_stats`
  - signed-in user can read and mutate own `session_follow_up_jobs`
- Rollback concern:
  - policy mistakes can silently block legitimate access or widen access if rewritten carelessly
- Additional rollback concerns:
  - later migrations such as `005_ui_core_fix_pack.sql`, `006_session_status.sql`, and `015_history_log_audit_notes.sql` already override some base policies; batch rewrites must target the latest canonical text, not the earliest migration version
  - running all 40 rewrites in one migration would make policy regression triage much harder if a single table family breaks
- Risk if ignored:
  - policy evaluation overhead persists and keeps the privacy lane in a warning state even if access rules are logically correct
- Requires:
  - code or migration PR
  - observation-backed follow-up after each policy batch
- Proposed PR sequence:
  1. Wave 2A-1 `sessions` / `session_exercises` / `sets`
  2. Wave 2A-2 `routines` / `routine_days` / `routine_day_exercises`
  3. Wave 2A-3 `profiles` / `exercises` / `exercise_stats`
  4. Wave 2A-4 `session_follow_up_jobs`

### 4. `auth_leaked_password_protection`

- Affected surfaces:
  - Supabase Auth configuration for the Fitness project
- Source of truth:
  - operator-owned Supabase setting, not repo SQL
- Proposed fix:
  - enable leaked password protection in Supabase Auth
  - record the operator action and reviewed evidence before any Foundation posture update
- Verification command:
  - reviewed operator receipt or screenshot-equivalent evidence
  - fresh advisor export showing the warning is removed
- Rollback concern:
  - enabling the protection may require support messaging for users with compromised passwords
- Risk if ignored:
  - account protection claims remain weaker than the desired privacy posture
- Requires:
  - Supabase dashboard or operator action
  - Foundation registry change bundle before any score or posture update

### 5. `unused_index`

- Candidate affected surface from current Foundation tracking:
  - `profiles_active_routine_idx`
- Proposed fix:
  - treat this as observation-first
  - confirm with current query patterns and telemetry before dropping anything
  - only remove the index in a later PR if the owner review agrees the index is truly cold
- Verification command:
  - reviewed advisor refresh
  - owner query-path review
- Rollback concern:
  - dropping an index too early can regress a flow that only shows up under specific workloads
- Risk if ignored:
  - extra write overhead and schema clutter, but not a direct privacy blocker
- Requires:
  - observation-only follow-up first
  - possible later code or migration PR

## Recommended PR sequence

1. Wave 1A: explicit `search_path` hardening on custom SQL functions. Completed and proved.
2. Wave 1C planning: classify remaining `SECURITY DEFINER` exposure and choose the narrow revoke-first remediation path.
3. Wave 1C apply: revoke `EXECUTE` from `public`, `anon`, and `authenticated` for the two internal-only functions, then refresh advisors. Completed and proved.
4. Wave 1B: targeted FK index additions after confirming the exact advisor surfaces.
5. Wave 2A+: staged RLS initplan policy rewrites by table family.
6. Wave 3: Supabase operator action for leaked password protection plus proof capture.
7. Wave 4: unused index review after telemetry and earlier waves settle.

## Exit criteria before Foundation posture changes

- A Fitness-owned remediation lane is merged for the relevant finding class.
- Reviewed evidence exists that the affected advisor warning changed.
- Foundation records the evidence through a registry change bundle.
- Foundation score or privacy posture changes only after that review.

## Summary rules

- Rule: Fitness owns Supabase remediation; Foundation tracks evidence and posture.
- Pattern: advisor finding -> Fitness owner plan -> migration or operator proof -> Foundation registry change bundle.
- Failure Mode: updating Foundation score before Fitness proof creates false trust.
