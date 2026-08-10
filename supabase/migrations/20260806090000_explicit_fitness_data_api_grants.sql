-- Explicit Data API grant contract for the core Fitness tables.
--
-- WHY THIS MIGRATION EXISTS
-- Supabase's PostgREST Data API is gated by TWO independent layers that must
-- both allow an operation before it succeeds:
--   1. Postgres GRANTs (object-level "can this role touch this table at
--      all", evaluated first, cluster-catalog state);
--   2. Row Level Security policies (row-level "which rows", evaluated only
--      after (1) already allowed the statement to run).
-- Every migration up to this one relied on (2) being correct and simply
-- assumed (1) would already be in place, because the two historical/older
-- Supabase projects this app has run against (including this app's real
-- production project) auto-provisioned broad Data-API-reachability GRANTs
-- for `anon`/`authenticated` at project-creation time, before any project
-- migration ever ran. A handful of tables (billing_customers,
-- billing_purchases, user_entitlements, workout_plan_templates,
-- workout_plan_template_exercises, and a `select`/`insert` subset of
-- routines/routine_days/routine_day_exercises/exercises for `authenticated`)
-- already got explicit grants of their own in earlier migrations, but most
-- of the Fitness core surface never did, and `service_role` -- despite
-- BYPASSRLS -- got none at all on these tables, since BYPASSRLS only skips
-- row-security checks, not the GRANT check that runs before them.
--
-- A newer/clean Supabase project (verified locally via the Supabase CLI's
-- own stack, which follows current platform defaults) does not auto-grant
-- Data API table access the same way, so the exact same migration chain
-- that works on production fails a clean environment's QA seed with
-- `42501 permission denied for table exercises` -- correct RLS policies,
-- but nothing granted the seed's service-role client permission to reach
-- the table object in the first place.
--
-- This migration makes reachability an explicit, source-controlled
-- contract instead of an implicit provider default, so the chain behaves
-- identically on both kinds of project. It is purely additive:
--   - only `grant`, no `revoke`;
--   - no blanket `grant ... on all tables`;
--   - no `alter default privileges`;
--   - every grant below already (or will already) exist on production, so
--     re-running this against production is a safe no-op -- Postgres GRANTs
--     are inherently idempotent (granting an already-held privilege is not
--     an error and does not change any other state).
--
-- See docs/PLAYBOOK_NOTES.md (this migration's dated entry) for the
-- "Migrations own Data API reachability" rule this establishes, and
-- scripts/migration/data-api-grants-contract.mjs for the automated
-- has_table_privilege()-based enforcement of the exact matrix below.
--
-- ACCESS MATRIX (derived from actual `supabase-js`/PostgREST call sites in
-- src/, actual service-role usage in scripts/, and the RLS policies already
-- committed in earlier migrations -- see PLAYBOOK_NOTES for the full audit
-- trail):
--
--   anon:
--     exercises            select   -- src/lib/exercises.ts's
--                                       listGlobalExercisesCached() reads the
--                                       global catalog through
--                                       supabaseServerAnon() (no user
--                                       session); RLS's own
--                                       "exercises_select_global_or_own"
--                                       policy already narrows this to
--                                       is_global rows for a null auth.uid().
--
--   authenticated: full select/insert/update/delete on every user-facing,
--   RLS-"_own"-policy-protected Fitness surface --
--     profiles, exercises, routines, routine_days, routine_day_exercises,
--     sessions, session_exercises, sets, exercise_stats,
--     session_follow_up_jobs, workout_plan_templates,
--     workout_plan_template_exercises
--   -- each of these already has committed "select_own"/"insert_own"/
--   "update_own"/"delete_own" RLS policies (grep `create policy` across
--   supabase/migrations/*.sql), and real call sites in src/ (server actions
--   using src/lib/supabase/server.ts's user-token client, which resolves to
--   the `authenticated` Postgres role) exercise all four operations against
--   each -- e.g. src/app/actions/exercises.ts (insert/update/delete on
--   user-owned exercises), src/app/session/[id]/actions.ts and
--   src/app/routines/[id]/edit/day/actions.ts (routine_day_exercises/sets/
--   session_exercises CRUD), src/lib/dal/routine-delete.ts (sessions/
--   routines delete).
--
--   authenticated EXCEPTION -- progression_events: select, insert, delete
--   (deliberately NOT update). progression_events is a source-of-truth
--   append-only event ledger: 20260509113000_051_progression_events.sql
--   commits only "progression_events_select_own" and
--   "progression_events_insert_own" RLS policies -- no update/delete policy
--   was ever authored for it, and no call site anywhere in src/ ever calls
--   `.update()` on it. `delete` IS granted here (matching production's
--   historical blanket-grant behavior) because
--   src/lib/dal/routine-delete.ts's deleteRoutineMutation genuinely issues
--   `.from("progression_events").delete()` calls (as the user's own
--   `authenticated` session, cleaning up a deleted routine's events) that
--   would otherwise hard-fail with 42501 in a clean environment where
--   production silently no-ops them today. Because no RLS delete policy
--   exists for this table, that grant is inert at the row level regardless
--   -- RLS still returns zero affected rows for any delete attempt, so this
--   grant only prevents a spurious permission error; it does not add any
--   real delete capability. `update` is withheld entirely: nothing in this
--   codebase, client or server, ever needs it, and granting it would add
--   capability with no matching RLS policy and no demonstrated use --
--   exactly the "broadened merely for symmetry" case this migration must
--   not do.
--
--   service_role: same full CRUD surface as `authenticated` (needed by
--   scripts/qa/fitness-codex-seed.mjs -- the deterministic QA seed this
--   migration exists to unblock -- and by other trusted server-side
--   workflows using src/lib/supabase/admin.ts), with the identical
--   progression_events exception (select/insert/delete, no update) for the
--   same reason: BYPASSRLS means service_role's grants are not backstopped
--   by row policies at all, so this migration deliberately does not hand it
--   an update privilege nothing in the codebase exercises.
--
--   Deliberately UNCHANGED by this migration (already correctly scoped by
--   earlier migrations; broadening these was explicitly out of scope):
--     billing_customers, billing_purchases, user_entitlements (authenticated
--     select-only, service_role full CRUD -- see
--     20260701174902_billing_lifetime_pro.sql), every discord_* table
--     (service_role only, see
--     20260709073257_harden_discord_internal_table_access.sql and related),
--     and any table not listed in this file at all.

-- ---------------------------------------------------------------------
-- anon: deliberately public read surface only.
-- ---------------------------------------------------------------------

grant select on public.exercises to anon;

-- ---------------------------------------------------------------------
-- authenticated: full CRUD on user-facing, RLS-"_own"-protected surfaces.
-- ---------------------------------------------------------------------

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.routines to authenticated;
grant select, insert, update, delete on public.routine_days to authenticated;
grant select, insert, update, delete on public.routine_day_exercises to authenticated;
grant select, insert, update, delete on public.sessions to authenticated;
grant select, insert, update, delete on public.session_exercises to authenticated;
grant select, insert, update, delete on public.sets to authenticated;
grant select, insert, update, delete on public.exercise_stats to authenticated;
grant select, insert, update, delete on public.session_follow_up_jobs to authenticated;
grant select, insert, update, delete on public.workout_plan_templates to authenticated;
grant select, insert, update, delete on public.workout_plan_template_exercises to authenticated;

-- progression_events: append-only ledger -- see the EXCEPTION note above.
-- select + insert + delete only, deliberately no update.
grant select, insert, delete on public.progression_events to authenticated;

-- ---------------------------------------------------------------------
-- service_role: same Fitness-table CRUD surface, for trusted server-side
-- workflows and the deterministic QA seed. BYPASSRLS already skips row
-- policies for this role -- these GRANTs are the *only* gate it has, which
-- is exactly the gate this migration exists to close.
-- ---------------------------------------------------------------------

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.exercises to service_role;
grant select, insert, update, delete on public.routines to service_role;
grant select, insert, update, delete on public.routine_days to service_role;
grant select, insert, update, delete on public.routine_day_exercises to service_role;
grant select, insert, update, delete on public.sessions to service_role;
grant select, insert, update, delete on public.session_exercises to service_role;
grant select, insert, update, delete on public.sets to service_role;
grant select, insert, update, delete on public.exercise_stats to service_role;
grant select, insert, update, delete on public.session_follow_up_jobs to service_role;
grant select, insert, update, delete on public.workout_plan_templates to service_role;
grant select, insert, update, delete on public.workout_plan_template_exercises to service_role;

-- progression_events: same append-only exception as authenticated above.
grant select, insert, delete on public.progression_events to service_role;
