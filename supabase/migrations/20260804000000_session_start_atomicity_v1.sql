-- Session Start Atomicity v1: source-only create boundary.
-- This migration is intentionally not an activation or provider-apply receipt.
-- See docs/PLAYBOOK_NOTES.md (2026-08-04 entry) for the source-authored vs.
-- provider-applied authority split this migration is scoped under, and for
-- why src/lib/start-session.ts does not yet call start_session_from_day_v1:
-- switching that call site is a deliberately separate follow-up, gated on
-- this migration having actually been applied to the live database first.

-- The only unconditional defense against two concurrent requests both
-- creating an in-progress session for the same user+routine. This constraint
-- is enforced for *every* write path -- this RPC, a direct table insert, or
-- any future code path -- not only for callers that remember to take the
-- advisory lock inside start_session_from_day_v1 below.
create unique index if not exists sessions_user_routine_active_uq
  on public.sessions (user_id, routine_id)
  where status = 'in_progress' and routine_id is not null;

create or replace function public.start_session_from_day_v1(
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
  v_user_id uuid := auth.uid();
  v_routine_day_index int;
  v_is_rest boolean;
  v_existing_session_id uuid;
  v_session_id uuid;
  v_exercise jsonb;
  v_exercise_count int := 0;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'SESSION_START_REQUIRES_AUTHENTICATED_USER';
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

  -- Namespaced separately from create_planner_routine_v1's advisory-lock key
  -- space (different domain prefix, different key inputs); this only
  -- serializes concurrent calls to *this* function for the same user+routine.
  -- The unique index above -- not this lock -- is what closes the race for
  -- every other write path.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'session_start_v1:' || v_user_id::text || ':' || p_routine_id::text,
      0
    )
  );

  select id
  into v_existing_session_id
  from public.sessions
  where user_id = v_user_id
    and routine_id = p_routine_id
    and status = 'in_progress'
  order by performed_at desc
  limit 1;

  if v_existing_session_id is not null then
    return jsonb_build_object(
      'schemaVersion', 'fitness.session-start-response.v1',
      'outcome', 'existing',
      'sessionId', v_existing_session_id::text,
      'exerciseCount', null
    );
  end if;

  -- security invoker means this select runs under the caller's own RLS: a
  -- routine/day belonging to another user resolves to "not found", not a
  -- cross-tenant read. No manual user_id filtering is being trusted here.
  select routine_day.day_index, routine_day.is_rest
  into v_routine_day_index, v_is_rest
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
      -- A writer outside this RPC's advisory lock (a direct table insert, or
      -- a future code path that doesn't take this lock) won the race. The
      -- partial unique index guarantees at most one in-progress session
      -- exists for this user+routine; return that winner instead of
      -- surfacing a raw constraint-violation error to the caller. Everything
      -- this block attempted, including the session insert above, has
      -- already been rolled back to the implicit savepoint this exception
      -- handler creates.
      select id
      into v_existing_session_id
      from public.sessions
      where user_id = v_user_id
        and routine_id = p_routine_id
        and status = 'in_progress'
      order by performed_at desc
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
  uuid, uuid, text, text, jsonb
) from public;
revoke execute on function public.start_session_from_day_v1(
  uuid, uuid, text, text, jsonb
) from anon;
grant execute on function public.start_session_from_day_v1(
  uuid, uuid, text, text, jsonb
) to authenticated;
