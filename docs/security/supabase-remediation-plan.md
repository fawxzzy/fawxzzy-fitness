# Fitness Supabase Privacy Remediation Plan

Status: current as of 2026-05-11.

This document is the Fitness-owned remediation ledger for the Supabase advisor work recorded in Foundation and proved against the linked live project.

Non-goals for this lane:
- no Supabase mutation
- no Fitness production behavior change
- no privacy-posture upgrade beyond reviewed evidence

## Owner model

- Fitness owns schema, policy, migration, and operator remediation work.
- Foundation tracks evidence, scorecard warning posture, and reviewed proof bundles.

## Current proved state

- SQL security remediation is proved clean.
- `unindexed_foreign_keys`: `0`
- `auth_rls_initplan`: `0`
- `unused_index`: observation-only
- `auth_leaked_password_protection`: reviewed Supabase Free-plan blocker
- Fitness score remains `warning 85/100`
- Privacy posture remains `conservative`

## Wave status

### Wave 1A

- Scope: `function_search_path_mutable`
- Implementation file:
  - `supabase/migrations/20260506173000_047_function_search_path_hardening.sql`
- Proof status:
  - applied and proved

### Wave 1B

- Scope: `unindexed_foreign_keys`
- Implementation file:
  - `supabase/migrations/20260507130000_049_fk_covering_indexes.sql`
- Proof status:
  - applied and proved

### Wave 1C

- Scope: revoke inherited public execution on the two internal-only `SECURITY DEFINER` functions
- Implementation file:
  - `supabase/migrations/20260506190000_048_security_definer_execute_revokes.sql`
- Proof status:
  - applied and proved

### Wave 2A-1

- Scope: session-core `auth_rls_initplan`
- Implementation file:
  - `supabase/migrations/20260509100000_050_session_core_rls_initplan.sql`
- Proof status:
  - applied and proved

### Wave 2A-2

- Scope: routine-core `auth_rls_initplan`
- Implementation file:
  - `supabase/migrations/20260510090000_052_routine_core_rls_initplan.sql`
- Proof status:
  - applied and proved

### Wave 2A-3

- Scope: profile/catalog `auth_rls_initplan`
- Implementation file:
  - `supabase/migrations/20260510110000_053_profile_catalog_rls_initplan.sql`
- Proof status:
  - applied and proved

### Wave 2A-4

- Scope: follow-up-job `auth_rls_initplan`
- Implementation file:
  - `supabase/migrations/20260511093000_054_follow_up_jobs_rls_initplan.sql`
- Proof status:
  - applied and proved

## Remaining deferred items

### `auth_leaked_password_protection`

- Owner: Supabase operator setting
- Current state:
  - reviewed blocker on Supabase Free plan
- Required before posture upgrade:
  - explicit operator proof that the project plan and setting support the control

### `unused_index`

- Owner action:
  - observation-first review only
- Current state:
  - not a privacy blocker
  - no index drops approved in this ledger

## Change discipline

- Rule: do not change Foundation score or privacy posture without reviewed proof.
- Rule: do not run schema cleanup from a source tree that cannot validate against live migration history.
- Pattern: source migration parity -> reviewed live proof -> Foundation ledger update.
