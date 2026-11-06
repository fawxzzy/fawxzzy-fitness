-- Session Start Atomicity v1 -- MASTER `fitness` schema apply package.
--
-- NOT part of the supabase/migrations replay chain. That chain builds the
-- legacy single-schema layout (tables in the default schema) and is replayed
-- by CI; the shared master Supabase project keeps the Fitness tables in
-- schema `fitness`, where the repo-chain definitions of this index and
-- function do not exist. This file is the same contract (the corrected
-- 20260811043408 function body) retargeted to `fitness.*` and made safe to
-- apply by hand. See supabase/master-fitness/README.md.
--
-- Properties:
--   * single transaction: any failure leaves the database unchanged;
--   * a preflight guard aborts with a clear message if any user already has
--     more than one in-progress session for the same routine (the unique index
--     could not be built); it never edits or removes data;
--   * idempotent: re-running changes nothing the second time;
--   * the function is callable only by service_role (security invoker,
--     execute revoked from everyone else).
-- Apply ONLY after the exact sha256 of this file is approved, and BEFORE the
-- application code that calls fitness.start_session_from_day_v1 is merged.

begin;

lock table fitness.sessions in share mode;

do $guard$
declare
  v_duplicate_groups int;
begin
  select count(*)
  into v_duplicate_groups
  from (
    select 1
    from fitness.sessions
    where status = 'in_progress'
      and routine_id is not null
    group by user_id, routine_id
    having count(*) > 1
  ) as duplicate_group;

  if v_duplicate_groups > 0 then
    raise exception using
      errcode = '23505',
      message = 'SESSION_START_ATOMICITY_PREFLIGHT_DUPLICATE_ACTIVE_SESSIONS',
      detail = v_duplicate_groups::text || ' user/routine group(s) already have more than one in-progress session; resolve them before applying.';
  end if;
end
$guard$;

-- The only unconditional defense against two concurrent requests both
-- creating an in-progress session for the same user+routine, for every write
-- path (this function, a direct table insert, or any future code).
create unique index if not exists sessions_user_routine_active_uq
  on fitness.sessions (user_id, routine_id)
  where status = 'in_progress' and routine_id is not null;
create or replace function fitness.start_session_from_day_v1(
  p_authenticated_user_id uuid,
  p_routine_id uuid,
  p_day_id uuid,
  p_routine_name text,
  p_routine_day_name text,
  p_exercises jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := p_authenticated_user_id;
  v_routine_day_index int;
  v_existing_session_id uuid;
  v_session_id uuid;
  v_exercise jsonb;
  v_exercise_count int := 0;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using
      errcode = '42501',
      message = 'SESSION_START_REQUIRES_SERVICE_ROLE';
  end if;

  if v_user_id is null then
    raise exception using
      errcode = '22023',
      message = 'SESSION_START_REQUIRES_AUTHENTICATED_USER_ID';
  end if;

  if p_routine_id is null or p_day_id is null then
    raise exception using
      errcode = '22023',
      message = 'SESSION_START_REQUIRES_ROUTINE_AND_DAY';
  end if;

  if jsonb_typeof(p_exercises) is distinct from 'array' then
    raise exception using
      errcode = '22023',
      message = 'SESSION_START_EXERCISES_MUST_BE_AN_ARRAY';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'session_start_v1:' || v_user_id::text || ':' || p_routine_id::text,
      0
    )
  );

  select session_row.id
  into v_existing_session_id
  from fitness.sessions as session_row
  where session_row.user_id = v_user_id
    and session_row.routine_id = p_routine_id
    and session_row.status = 'in_progress'
  order by session_row.performed_at desc
  limit 1;

  if v_existing_session_id is not null then
    return jsonb_build_object(
      'schemaVersion', 'fitness.session-start-response.v1',
      'outcome', 'existing',
      'sessionId', v_existing_session_id::text,
      'exerciseCount', null
    );
  end if;

  select routine_day.day_index
  into v_routine_day_index
  from fitness.routine_days as routine_day
  where routine_day.id = p_day_id
    and routine_day.routine_id = p_routine_id
    and routine_day.user_id = v_user_id;

  if not found then
    raise exception 'session start routine day was not found for this user';
  end if;

  if not exists (
    select 1
    from fitness.routines as routine
    where routine.id = p_routine_id
      and routine.user_id = v_user_id
  ) then
    raise exception 'session start routine was not found for this user';
  end if;

  begin
    insert into fitness.sessions (
      user_id,
      routine_id,
      routine_day_index,
      name,
      routine_day_name,
      status
    )
    values (
      v_user_id,
      p_routine_id,
      v_routine_day_index,
      p_routine_name,
      p_routine_day_name,
      'in_progress'
    )
    returning id into v_session_id;

    for v_exercise in select value from jsonb_array_elements(p_exercises)
    loop
      if coalesce(v_exercise ->> 'exerciseId', '') = ''
        or coalesce(v_exercise ->> 'routineDayExerciseId', '') = ''
        or (v_exercise ->> 'position') is null
      then
        raise exception 'session start exercise record is invalid';
      end if;

      if not exists (
        select 1
        from fitness.routine_day_exercises as planned_exercise
        where planned_exercise.id = (v_exercise ->> 'routineDayExerciseId')::uuid
          and planned_exercise.routine_day_id = p_day_id
          and planned_exercise.user_id = v_user_id
          and planned_exercise.exercise_id = (v_exercise ->> 'exerciseId')::uuid
      ) then
        raise exception 'session start exercise was not found for this user and day';
      end if;

      insert into fitness.session_exercises (
        session_id,
        user_id,
        exercise_id,
        routine_day_exercise_id,
        position,
        notes,
        is_skipped,
        measurement_type,
        default_unit,
        target_sets_min,
        target_sets_max,
        target_reps_min,
        target_reps_max,
        target_weight_min,
        target_weight_max,
        target_weight_unit,
        target_time_seconds_min,
        target_time_seconds_max,
        target_distance_min,
        target_distance_max,
        target_distance_unit,
        target_calories_min,
        target_calories_max
      )
      values (
        v_session_id,
        v_user_id,
        (v_exercise ->> 'exerciseId')::uuid,
        (v_exercise ->> 'routineDayExerciseId')::uuid,
        (v_exercise ->> 'position')::int,
        null,
        false,
        v_exercise ->> 'measurementType',
        v_exercise ->> 'defaultUnit',
        (v_exercise ->> 'targetSetsMin')::int,
        (v_exercise ->> 'targetSetsMax')::int,
        (v_exercise ->> 'targetRepsMin')::int,
        (v_exercise ->> 'targetRepsMax')::int,
        (v_exercise ->> 'targetWeightMin')::numeric,
        (v_exercise ->> 'targetWeightMax')::numeric,
        v_exercise ->> 'targetWeightUnit',
        (v_exercise ->> 'targetTimeSecondsMin')::int,
        (v_exercise ->> 'targetTimeSecondsMax')::int,
        (v_exercise ->> 'targetDistanceMin')::numeric,
        (v_exercise ->> 'targetDistanceMax')::numeric,
        v_exercise ->> 'targetDistanceUnit',
        (v_exercise ->> 'targetCaloriesMin')::numeric,
        (v_exercise ->> 'targetCaloriesMax')::numeric
      );

      v_exercise_count := v_exercise_count + 1;
    end loop;
  exception
    when unique_violation then
      select session_row.id
      into v_existing_session_id
      from fitness.sessions as session_row
      where session_row.user_id = v_user_id
        and session_row.routine_id = p_routine_id
        and session_row.status = 'in_progress'
      order by session_row.performed_at desc
      limit 1;

      if v_existing_session_id is null then
        raise;
      end if;

      return jsonb_build_object(
        'schemaVersion', 'fitness.session-start-response.v1',
        'outcome', 'existing',
        'sessionId', v_existing_session_id::text,
        'exerciseCount', null
      );
  end;

  return jsonb_build_object(
    'schemaVersion', 'fitness.session-start-response.v1',
    'outcome', 'created',
    'sessionId', v_session_id::text,
    'exerciseCount', v_exercise_count
  );
end;
$function$;

revoke all on function fitness.start_session_from_day_v1(
  uuid, uuid, uuid, text, text, jsonb
) from public, anon, authenticated;
grant execute on function fitness.start_session_from_day_v1(
  uuid, uuid, uuid, text, text, jsonb
) to service_role;

commit;
