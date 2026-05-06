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

## Current finding classes

| Finding class | Likely owner action | Current posture | PR size |
| --- | --- | --- | --- |
| `function_search_path_mutable` | migration PR | open | S |
| `unindexed_foreign_keys` | migration PR after confirmed advisor export | planned | S-M |
| `auth_rls_initplan` | migration PR series | planned | M-L |
| `auth_leaked_password_protection` | Supabase operator action | open | S |
| `unused_index` | observation-first review, maybe migration PR later | deferred | S |

## Recommended wave order

### Wave 1

Low-risk schema hygiene and deterministic SQL hardening.

1. `function_search_path_mutable`
2. `unindexed_foreign_keys`

### Wave 2

RLS performance optimization without changing access intent.

3. `auth_rls_initplan`

### Wave 3

Operator-owned auth hardening.

4. `auth_leaked_password_protection`

### Wave 4

Telemetry-backed cleanup only after earlier waves settle.

5. `unused_index`

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

- Candidate affected surfaces to confirm against the next advisor export:
  - `public.session_exercises.exercise_id`
  - `public.routine_day_exercises.exercise_id`
  - `public.sessions.routine_id`
  - `public.exercise_stats.exercise_id`
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
  - confirm the exact advisor-reported FK columns first
  - add narrow covering indexes only for the still-unindexed referencing columns
  - avoid redundant indexes where a leading-column composite already satisfies the FK path
- Verification command:
  - `pnpm migration:validate`
  - reviewed Supabase advisor refresh proving the specific FK findings were removed
- Rollback concern:
  - duplicate or poorly chosen indexes add write overhead without removing the advisor finding
- Risk if ignored:
  - deletes and joins across referenced tables can degrade and amplify policy overhead
- Requires:
  - code or migration PR
  - fresh observation to confirm the exact FK list before implementation

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
- Proposed fix:
  - replace direct `auth.uid()` predicates with initplan-friendly forms such as `(select auth.uid())`
  - preserve the existing access intent and table ownership semantics
  - stage the work by table family instead of rewriting every policy in one oversized PR
- Verification command:
  - `pnpm migration:validate`
  - reviewed advisor refresh after each policy batch
  - owner review that authenticated read/write behavior is unchanged
- Rollback concern:
  - policy mistakes can silently block legitimate access or widen access if rewritten carelessly
- Risk if ignored:
  - policy evaluation overhead persists and keeps the privacy lane in a warning state even if access rules are logically correct
- Requires:
  - code or migration PR
  - observation-backed follow-up after each policy batch

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

1. Wave 1A: explicit `search_path` hardening on custom SQL functions.
2. Wave 1B: targeted FK index additions after confirming the exact advisor surfaces.
3. Wave 2A+: staged RLS initplan policy rewrites by table family.
4. Wave 3: Supabase operator action for leaked password protection plus proof capture.
5. Wave 4: unused index review after telemetry and earlier waves settle.

## Exit criteria before Foundation posture changes

- A Fitness-owned remediation lane is merged for the relevant finding class.
- Reviewed evidence exists that the affected advisor warning changed.
- Foundation records the evidence through a registry change bundle.
- Foundation score or privacy posture changes only after that review.

## Summary rules

- Rule: Fitness owns Supabase remediation; Foundation tracks evidence and posture.
- Pattern: advisor finding -> Fitness owner plan -> migration or operator proof -> Foundation registry change bundle.
- Failure Mode: updating Foundation score before Fitness proof creates false trust.
