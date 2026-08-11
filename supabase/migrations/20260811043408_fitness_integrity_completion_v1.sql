-- Fitness integrity completion v1.
-- Source-only migration. Provider application remains separately gated.

-- Retire the previously client-callable overload if an environment already
-- applied its earlier source form. Dropping the overload also retires all of
-- its grants atomically.
drop function if exists public.start_session_from_day_v1(
  uuid, uuid, text, text, jsonb
);

create or replace function public.start_session_from_day_v1(
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
  from public.sessions as session_row
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
  from public.routine_days as routine_day
  where routine_day.id = p_day_id
    and routine_day.routine_id = p_routine_id
    and routine_day.user_id = v_user_id;

  if not found then
    raise exception 'session start routine day was not found for this user';
  end if;

  if not exists (
    select 1
    from public.routines as routine
    where routine.id = p_routine_id
      and routine.user_id = v_user_id
  ) then
    raise exception 'session start routine was not found for this user';
  end if;

  begin
    insert into public.sessions (
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
        from public.routine_day_exercises as planned_exercise
        where planned_exercise.id = (v_exercise ->> 'routineDayExerciseId')::uuid
          and planned_exercise.routine_day_id = p_day_id
          and planned_exercise.user_id = v_user_id
          and planned_exercise.exercise_id = (v_exercise ->> 'exerciseId')::uuid
      ) then
        raise exception 'session start exercise was not found for this user and day';
      end if;

      insert into public.session_exercises (
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
      from public.sessions as session_row
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

revoke all on function public.start_session_from_day_v1(
  uuid, uuid, uuid, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.start_session_from_day_v1(
  uuid, uuid, uuid, text, text, jsonb
) to service_role;

-- The returned column name `status` is also a table column. Qualify every
-- table reference so PL/pgSQL cannot bind the output variable instead.
create or replace function public.claim_session_follow_up_jobs(
  target_session_id uuid,
  target_user_id uuid,
  stale_before timestamptz,
  claim_time timestamptz default now()
)
returns table (
  id uuid,
  job_kind text,
  status text,
  attempt_count int
)
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  return query
  update public.session_follow_up_jobs as job
  set status = 'processing',
      attempt_count = job.attempt_count + 1,
      last_error = null,
      completed_at = null,
      updated_at = claim_time
  where job.session_id = target_session_id
    and job.user_id = target_user_id
    and (
      job.status in ('pending', 'failed')
      or (job.status = 'processing' and job.updated_at < stale_before)
    )
  returning
    job.id,
    job.job_kind,
    job.status,
    job.attempt_count;
end;
$function$;
