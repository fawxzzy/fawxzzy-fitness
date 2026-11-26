-- READ-ONLY readback for the routine archive apply (master `fitness` schema).
-- Aggregate counts and catalog facts only; no user rows are selected.
-- Expected after apply: column_present = 1, data_type = 'timestamp with time zone',
-- is_nullable = 'YES', column_default is null, archived_total = 0 (nothing archived yet),
-- and routines_total / routines_policy_count equal to the preimage values.
select
  (select count(*) from information_schema.columns where table_schema = 'fitness' and table_name = 'routines' and column_name = 'archived_at') as column_present,
  (select data_type from information_schema.columns where table_schema = 'fitness' and table_name = 'routines' and column_name = 'archived_at') as data_type,
  (select is_nullable from information_schema.columns where table_schema = 'fitness' and table_name = 'routines' and column_name = 'archived_at') as is_nullable,
  (select column_default from information_schema.columns where table_schema = 'fitness' and table_name = 'routines' and column_name = 'archived_at') as column_default,
  (select count(*) from information_schema.columns where table_schema = 'fitness' and table_name = 'routines') as routines_column_count,
  (select count(*) from fitness.routines) as routines_total,
  (select count(*) from fitness.routines where archived_at is not null) as archived_total,
  (select count(*) from pg_policies where schemaname = 'fitness' and tablename = 'routines') as routines_policy_count;
