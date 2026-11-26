-- READ-ONLY preimage for the routine archive apply (master `fitness` schema).
-- Aggregate counts and catalog facts only; no user rows are selected.
-- Expected before apply: column_present = 0, routines_table_present = 1.
select
  (select count(*) from information_schema.tables where table_schema = 'fitness' and table_name = 'routines') as routines_table_present,
  (select count(*) from information_schema.columns where table_schema = 'fitness' and table_name = 'routines' and column_name = 'archived_at') as column_present,
  (select count(*) from information_schema.columns where table_schema = 'fitness' and table_name = 'routines') as routines_column_count,
  (select count(*) from fitness.routines) as routines_total,
  (select count(*) from fitness.profiles where active_routine_id is not null) as profiles_with_active_routine,
  (select count(*) from fitness.sessions where routine_id is not null) as sessions_with_routine,
  (select count(*) from fitness.sessions where status = 'in_progress') as in_progress_total,
  (select count(*) from pg_policies where schemaname = 'fitness' and tablename = 'routines') as routines_policy_count;
