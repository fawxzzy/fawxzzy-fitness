-- READ-ONLY preimage for the session-start atomicity apply (master `fitness` schema).
-- Aggregate counts and catalog facts only; no user rows are selected.
-- Expected before apply: idx_present = 0, fn_present = 0, dup_user_routine_groups = 0.
select
  (select count(*) from pg_indexes where schemaname = 'fitness' and indexname = 'sessions_user_routine_active_uq') as idx_present,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'fitness' and p.proname = 'start_session_from_day_v1') as fn_present,
  (select count(*) from fitness.sessions) as sessions_total,
  (select count(*) from fitness.sessions where status = 'in_progress') as in_progress_total,
  (select count(*) from fitness.sessions where status = 'in_progress' and routine_id is null) as in_progress_null_routine,
  (select count(*) from (select user_id, routine_id from fitness.sessions where status = 'in_progress' and routine_id is not null group by 1, 2 having count(*) > 1) d) as dup_user_routine_groups,
  (select count(*) from fitness.session_exercises) as session_exercises_total,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'auth' and p.proname = 'role') as auth_role_fn_present;