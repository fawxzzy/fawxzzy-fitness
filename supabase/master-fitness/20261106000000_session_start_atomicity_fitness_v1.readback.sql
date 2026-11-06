select
  (select count(*) from pg_indexes where schemaname = 'fitness' and indexname = 'sessions_user_routine_active_uq' and indexdef like '%UNIQUE%' and indexdef like '%in_progress%') as idx_present,
  (select pg_get_indexdef(i.indexrelid) from pg_index i join pg_class c on c.oid = i.indexrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'fitness' and c.relname = 'sessions_user_routine_active_uq') as idx_def,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'fitness' and p.proname = 'start_session_from_day_v1') as fn_present,
  (select pg_get_function_identity_arguments(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'fitness' and p.proname = 'start_session_from_day_v1') as fn_args,
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'fitness' and p.proname = 'start_session_from_day_v1') as fn_security_definer,
  (select p.proconfig::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'fitness' and p.proname = 'start_session_from_day_v1') as fn_config,
  (select p.proacl::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'fitness' and p.proname = 'start_session_from_day_v1') as fn_acl,
  (select count(*) from fitness.sessions) as sessions_total,
  (select count(*) from (select user_id, routine_id from fitness.sessions where status = 'in_progress' and routine_id is not null group by 1, 2 having count(*) > 1) d) as dup_user_routine_groups;