-- Hide standalone stretch catalog rows from the global picker while preserving
-- historical exercise references that may still point at these records.
update public.exercises
set is_global = false
where user_id is null
  and is_global = true
  and slug in ('hamstring-stretch', 'hip-flexor-stretch');
