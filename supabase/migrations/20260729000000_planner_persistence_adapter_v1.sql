-- Planner Persistence Adapter v1: source-only create boundary.
-- This migration is intentionally not an activation or provider-apply receipt.

alter table public.routines
  add column if not exists planner_record_id text null,
  add column if not exists planner_generation_request_id text null,
  add column if not exists planner_uniqueness_key text null,
  add column if not exists planner_intent_digest text null,
  add column if not exists planner_assembly_digest text null,
  add column if not exists planner_routine_digest text null,
  add column if not exists planner_activation_state text null,
  add column if not exists planner_intent jsonb null;

alter table public.routine_days
  add column if not exists planner_record_id text null,
  add column if not exists planner_routine_record_id text null,
  add column if not exists planner_session_id text null,
  add column if not exists planner_weekday text null,
  add column if not exists planner_time_budget jsonb null,
  add column if not exists planner_exercise_record_ids jsonb null;

alter table public.routine_day_exercises
  add column if not exists planner_record_id text null,
  add column if not exists planner_routine_record_id text null,
  add column if not exists planner_session_record_id text null,
  add column if not exists planner_session_id text null,
  add column if not exists planner_exercise_slug text null,
  add column if not exists planner_measurement_type text null,
  add column if not exists planner_prescription jsonb null,
  add column if not exists planner_ranking_explanation jsonb null,
  add column if not exists planner_substitution_rules jsonb null,
  add column if not exists planner_warmup jsonb null;

alter table public.routines
  drop constraint if exists routines_planner_record_complete_check,
  add constraint routines_planner_record_complete_check check (
    num_nonnulls(
      planner_record_id,
      planner_generation_request_id,
      planner_uniqueness_key,
      planner_intent_digest,
      planner_assembly_digest,
      planner_routine_digest,
      planner_activation_state,
      planner_intent
    ) = 0
    or (
      num_nulls(
        planner_record_id,
        planner_generation_request_id,
        planner_uniqueness_key,
        planner_intent_digest,
        planner_assembly_digest,
        planner_routine_digest,
        planner_activation_state,
        planner_intent
      ) = 0
      and
      length(planner_record_id) = 64
      and planner_record_id ~ '^[a-f0-9]{64}$'
      and length(btrim(planner_generation_request_id)) between 1 and 128
      and planner_generation_request_id
        ~ '^([a-z0-9]|[a-z0-9][a-z0-9._:-]*[a-z0-9])$'
      and planner_uniqueness_key ~ '^[a-f0-9]{64}$'
      and planner_intent_digest ~ '^[a-f0-9]{64}$'
      and planner_assembly_digest ~ '^[a-f0-9]{64}$'
      and planner_routine_digest ~ '^[a-f0-9]{64}$'
      and planner_activation_state = 'not_requested'
      and jsonb_typeof(planner_intent) = 'object'
    )
  );

alter table public.routine_days
  drop constraint if exists routine_days_planner_record_complete_check,
  add constraint routine_days_planner_record_complete_check check (
    num_nonnulls(
      planner_record_id,
      planner_routine_record_id,
      planner_session_id,
      planner_weekday,
      planner_time_budget,
      planner_exercise_record_ids
    ) = 0
    or (
      num_nulls(
        planner_record_id,
        planner_routine_record_id,
        planner_session_id,
        planner_time_budget,
        planner_exercise_record_ids
      ) = 0
      and
      planner_record_id ~ '^[a-f0-9]{64}$'
      and planner_routine_record_id ~ '^[a-f0-9]{64}$'
      and length(btrim(planner_session_id)) between 1 and 128
      and (
        planner_weekday is null
        or planner_weekday in (
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday'
        )
      )
      and jsonb_typeof(planner_time_budget) = 'object'
      and jsonb_typeof(planner_exercise_record_ids) = 'array'
    )
  );

alter table public.routine_day_exercises
  drop constraint if exists routine_day_exercises_planner_record_complete_check,
  add constraint routine_day_exercises_planner_record_complete_check check (
    num_nonnulls(
      planner_record_id,
      planner_routine_record_id,
      planner_session_record_id,
      planner_session_id,
      planner_exercise_slug,
      planner_measurement_type,
      planner_prescription,
      planner_ranking_explanation,
      planner_substitution_rules,
      planner_warmup
    ) = 0
    or (
      num_nulls(
        planner_record_id,
        planner_routine_record_id,
        planner_session_record_id,
        planner_session_id,
        planner_exercise_slug,
        planner_measurement_type,
        planner_prescription,
        planner_substitution_rules
      ) = 0
      and
      planner_record_id ~ '^[a-f0-9]{64}$'
      and planner_routine_record_id ~ '^[a-f0-9]{64}$'
      and planner_session_record_id ~ '^[a-f0-9]{64}$'
      and length(btrim(planner_session_id)) between 1 and 128
      and length(btrim(planner_exercise_slug)) between 1 and 128
      and planner_measurement_type in ('reps', 'time', 'time_distance')
      and jsonb_typeof(planner_prescription) = 'object'
      and (
        planner_ranking_explanation is null
        or jsonb_typeof(planner_ranking_explanation) = 'object'
      )
      and jsonb_typeof(planner_substitution_rules) = 'array'
      and planner_warmup is null
    )
  );

create unique index if not exists exercises_global_planner_slug_uq
  on public.exercises ((lower(btrim(slug))))
  where user_id is null and is_global = true and slug is not null;

create unique index if not exists routines_user_planner_generation_request_uq
  on public.routines (user_id, planner_generation_request_id)
  where planner_generation_request_id is not null;

create unique index if not exists routines_user_planner_record_uq
  on public.routines (user_id, planner_record_id)
  where planner_record_id is not null;

create unique index if not exists routine_days_routine_planner_record_uq
  on public.routine_days (routine_id, planner_record_id)
  where planner_record_id is not null;

create unique index if not exists routine_day_exercises_day_planner_record_uq
  on public.routine_day_exercises (routine_day_id, planner_record_id)
  where planner_record_id is not null;

create unique index if not exists routine_day_exercises_day_planner_position_uq
  on public.routine_day_exercises (routine_day_id, position)
  where planner_record_id is not null;

alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_day_exercises enable row level security;
alter table public.exercises enable row level security;

grant usage on schema public to authenticated;
grant select, insert on table public.routines to authenticated;
grant select, insert on table public.routine_days to authenticated;
grant select, insert on table public.routine_day_exercises to authenticated;
grant select on table public.exercises to authenticated;

create or replace function public.create_planner_routine_v1(
  p_intent jsonb,
  p_name text,
  p_start_date date,
  p_timezone text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_auth_user_id uuid := auth.uid();
  v_request jsonb := p_intent -> 'request';
  v_creation jsonb := p_intent -> 'creation';
  v_records jsonb := p_intent #> '{creation,records}';
  v_routine_record jsonb := p_intent #> '{creation,records,routine}';
  v_sessions jsonb := p_intent #> '{creation,records,sessions}';
  v_exercises jsonb := p_intent #> '{creation,records,exercises}';
  v_generation_request_id text := v_request ->> 'generationRequestId';
  v_uniqueness_key text := v_request ->> 'uniquenessKey';
  v_intent_digest text := p_intent ->> 'intentDigest';
  v_routine_id uuid;
  v_routine_day_id uuid;
  v_exercise_uuid uuid;
  v_existing_intent jsonb;
  v_existing_name text;
  v_existing_start_date date;
  v_existing_timezone text;
  v_outcome text := 'created';
  v_session jsonb;
  v_exercise jsonb;
  v_session_rows jsonb;
  v_exercise_rows jsonb;
  v_routine_row jsonb;
  v_match_count integer;
  v_expected_ordinal integer := 0;
  v_session_id text;
  v_owned_exercise_count integer;
  v_unique_owned_exercise_count integer;
begin
  if v_auth_user_id is null then
    raise exception 'planner adapter requires an authenticated user';
  end if;
  if jsonb_typeof(p_intent) is distinct from 'object'
    or p_intent ->> 'schemaVersion'
      is distinct from 'fitness.routine-persistence-intent.v1'
    or p_intent ->> 'compilerVersion'
      is distinct from 'fitness.routine-persistence-intent-compiler.2026-07-29.v1'
    or p_intent ->> 'policyVersion'
      is distinct from 'fitness.routine-persistence-intent-policy.2026-07-29.v1'
    or p_intent ->> 'status' is distinct from 'ready_to_create'
    or jsonb_typeof(v_request) is distinct from 'object'
    or v_request ->> 'userId' is distinct from v_auth_user_id::text
    or v_request ->> 'creationMode' is distinct from 'create_only'
    or v_request ->> 'activationMode' is distinct from 'deferred'
    or v_creation ->> 'operation' is distinct from 'create_routine'
    or v_creation ->> 'activationMode' is distinct from 'deferred'
    or jsonb_typeof(v_records) is distinct from 'object'
    or jsonb_typeof(v_routine_record) is distinct from 'object'
    or jsonb_typeof(v_sessions) is distinct from 'array'
    or jsonb_array_length(v_sessions) < 1
    or jsonb_typeof(v_exercises) is distinct from 'array'
    or jsonb_array_length(v_exercises) < 1
  then
    raise exception 'planner persistence intent is not a supported authenticated create-only intent';
  end if;
  if v_routine_record ->> 'userId' is distinct from v_auth_user_id::text
    or v_routine_record ->> 'generationRequestId'
      is distinct from v_generation_request_id
    or v_routine_record ->> 'uniquenessKey'
      is distinct from v_uniqueness_key
    or v_routine_record ->> 'activationState'
      is distinct from 'not_requested'
    or v_generation_request_id is null
    or length(v_generation_request_id) not between 1 and 128
    or v_generation_request_id
      !~ '^([a-z0-9]|[a-z0-9][a-z0-9._:-]*[a-z0-9])$'
    or coalesce(v_uniqueness_key, '') !~ '^[a-f0-9]{64}$'
    or coalesce(v_intent_digest, '') !~ '^[a-f0-9]{64}$'
    or coalesce(v_routine_record ->> 'recordId', '')
      !~ '^[a-f0-9]{64}$'
    or coalesce(v_routine_record ->> 'assemblyDigest', '')
      !~ '^[a-f0-9]{64}$'
    or coalesce(v_routine_record ->> 'routineDigest', '')
      !~ '^[a-f0-9]{64}$'
  then
    raise exception 'planner persistence intent identity is invalid';
  end if;
  if p_name is null
    or length(p_name) not between 1 and 120
    or p_name <> btrim(p_name)
    or p_start_date is null
    or p_timezone is null
    or length(p_timezone) not between 1 and 100
    or not exists (
      select 1
      from pg_catalog.pg_timezone_names
      where name = p_timezone
    )
  then
    raise exception 'planner persistence provider context is invalid';
  end if;
  select count(*), count(distinct exercise_record_id)
  into v_owned_exercise_count, v_unique_owned_exercise_count
  from jsonb_array_elements(v_sessions) as session(value)
  cross join lateral jsonb_array_elements_text(
    session.value -> 'exerciseRecordIds'
  ) as owned(exercise_record_id);
  if v_owned_exercise_count <> jsonb_array_length(v_exercises)
    or v_unique_owned_exercise_count <> jsonb_array_length(v_exercises)
  then
    raise exception 'planner session ownership must contain every exercise record exactly once';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_auth_user_id::text || ':' || v_generation_request_id,
      0
    )
  );

  select
    routine.id,
    routine.planner_intent,
    routine.name,
    routine.start_date,
    routine.timezone
  into
    v_routine_id,
    v_existing_intent,
    v_existing_name,
    v_existing_start_date,
    v_existing_timezone
  from public.routines as routine
  where routine.user_id = v_auth_user_id
    and routine.planner_generation_request_id = v_generation_request_id;

  if v_routine_id is not null then
    if v_existing_intent is distinct from p_intent
      or v_existing_name is distinct from p_name
      or v_existing_start_date is distinct from p_start_date
      or v_existing_timezone is distinct from p_timezone
    then
      raise exception 'planner generation request already exists with different immutable evidence';
    end if;
    v_outcome := 'replayed';
  else
    insert into public.routines (
      user_id,
      name,
      cycle_length_days,
      start_date,
      timezone,
      schedule_mode,
      planner_record_id,
      planner_generation_request_id,
      planner_uniqueness_key,
      planner_intent_digest,
      planner_assembly_digest,
      planner_routine_digest,
      planner_activation_state,
      planner_intent
    )
    values (
      v_auth_user_id,
      p_name,
      jsonb_array_length(v_sessions),
      p_start_date,
      p_timezone,
      case
        when v_routine_record #>> '{schedule,dayConstraint}' = 'fixed'
          then 'weekday_anchored'
        else 'rolling_n_day'
      end,
      v_routine_record ->> 'recordId',
      v_generation_request_id,
      v_uniqueness_key,
      v_intent_digest,
      v_routine_record ->> 'assemblyDigest',
      v_routine_record ->> 'routineDigest',
      'not_requested',
      p_intent
    )
    returning id into v_routine_id;

    for v_session in
      select value
      from jsonb_array_elements(v_sessions)
      order by (value ->> 'ordinal')::integer
    loop
      v_expected_ordinal := v_expected_ordinal + 1;
      if coalesce(v_session ->> 'recordId', '') !~ '^[a-f0-9]{64}$'
        or v_session ->> 'routineRecordId'
          is distinct from v_routine_record ->> 'recordId'
        or (v_session ->> 'ordinal')::integer
          is distinct from v_expected_ordinal
        or jsonb_typeof(v_session -> 'timeBudget')
          is distinct from 'object'
        or jsonb_typeof(v_session -> 'exerciseRecordIds')
          is distinct from 'array'
      then
        raise exception 'planner session record is invalid';
      end if;
      insert into public.routine_days (
        routine_id,
        user_id,
        day_index,
        name,
        is_rest,
        planner_record_id,
        planner_routine_record_id,
        planner_session_id,
        planner_weekday,
        planner_time_budget,
        planner_exercise_record_ids
      )
      values (
        v_routine_id,
        v_auth_user_id,
        (v_session ->> 'ordinal')::integer,
        'Session ' || (v_session ->> 'ordinal'),
        false,
        v_session ->> 'recordId',
        v_session ->> 'routineRecordId',
        v_session ->> 'sessionId',
        v_session ->> 'weekday',
        v_session -> 'timeBudget',
        v_session -> 'exerciseRecordIds'
      );
    end loop;

    for v_exercise in
      select value
      from jsonb_array_elements(v_exercises)
      order by
        value ->> 'sessionId',
        (value #>> '{prescription,sessionExercisePosition}')::integer
    loop
      select count(*)
      into v_match_count
      from public.exercises as exercise
      where exercise.user_id is null
        and exercise.is_global = true
        and lower(btrim(exercise.slug))
          = lower(btrim(v_exercise #>> '{prescription,exerciseId}'));
      if v_match_count <> 1 then
        raise exception 'planner exercise % did not resolve to exactly one global exercise',
          v_exercise #>> '{prescription,exerciseId}';
      end if;
      select exercise.id
      into v_exercise_uuid
      from public.exercises as exercise
      where exercise.user_id is null
        and exercise.is_global = true
        and lower(btrim(exercise.slug))
          = lower(btrim(v_exercise #>> '{prescription,exerciseId}'));
      select routine_day.id, routine_day.planner_session_id
      into v_routine_day_id, v_session_id
      from public.routine_days as routine_day
      where routine_day.routine_id = v_routine_id
        and routine_day.user_id = v_auth_user_id
        and routine_day.planner_record_id = v_exercise ->> 'sessionRecordId';
      if v_routine_day_id is null
        or coalesce(v_exercise ->> 'recordId', '') !~ '^[a-f0-9]{64}$'
        or v_exercise ->> 'routineRecordId'
          is distinct from v_routine_record ->> 'recordId'
        or v_exercise ->> 'sessionId' is distinct from v_session_id
        or coalesce(
          v_exercise #>> '{prescription,measurementType}',
          ''
        ) not in (
          'reps',
          'time',
          'time_distance'
        )
        or (v_exercise #>> '{prescription,sessionExercisePosition}')::integer < 1
      then
        raise exception 'planner exercise record is invalid';
      end if;
      if not exists (
        select 1
        from jsonb_array_elements(v_sessions) as session(value)
        where session.value ->> 'recordId'
          = v_exercise ->> 'sessionRecordId'
          and session.value -> 'exerciseRecordIds'
            @> jsonb_build_array(v_exercise ->> 'recordId')
      ) then
        raise exception 'planner exercise record is absent from its session ownership list';
      end if;
      insert into public.routine_day_exercises (
        routine_day_id,
        user_id,
        exercise_id,
        position,
        target_sets,
        rep_range_min,
        rep_range_max,
        target_duration_seconds,
        planner_record_id,
        planner_routine_record_id,
        planner_session_record_id,
        planner_session_id,
        planner_exercise_slug,
        planner_measurement_type,
        planner_prescription,
        planner_ranking_explanation,
        planner_substitution_rules,
        planner_warmup
      )
      values (
        v_routine_day_id,
        v_auth_user_id,
        v_exercise_uuid,
        (v_exercise #>> '{prescription,sessionExercisePosition}')::integer - 1,
        (v_exercise #>> '{prescription,sets}')::integer,
        case
          when v_exercise #>> '{prescription,measurementType}' = 'reps'
            then (v_exercise #>> '{prescription,target,minimum}')::integer
          else null
        end,
        case
          when v_exercise #>> '{prescription,measurementType}' = 'reps'
            then (v_exercise #>> '{prescription,target,maximum}')::integer
          else null
        end,
        case
          when v_exercise #>> '{prescription,measurementType}' = 'time'
            then (v_exercise #>> '{prescription,target,maximum}')::integer
          when v_exercise #>> '{prescription,measurementType}' = 'time_distance'
            then (v_exercise #>> '{prescription,target,maximum}')::integer * 60
          else null
        end,
        v_exercise ->> 'recordId',
        v_exercise ->> 'routineRecordId',
        v_exercise ->> 'sessionRecordId',
        v_exercise ->> 'sessionId',
        v_exercise #>> '{prescription,exerciseId}',
        v_exercise #>> '{prescription,measurementType}',
        v_exercise -> 'prescription',
        v_exercise -> 'rankingExplanation',
        v_exercise -> 'substitutionRules',
        null
      );
    end loop;
  end if;

  select jsonb_build_object(
    'plannerRecordId', routine.planner_record_id,
    'userId', routine.user_id::text,
    'name', routine.name,
    'cycleLengthDays', routine.cycle_length_days,
    'scheduleMode', routine.schedule_mode,
    'startDate', routine.start_date::text,
    'timezone', routine.timezone,
    'generationRequestId', routine.planner_generation_request_id,
    'uniquenessKey', routine.planner_uniqueness_key,
    'intentDigest', routine.planner_intent_digest,
    'assemblyDigest', routine.planner_assembly_digest,
    'routineDigest', routine.planner_routine_digest,
    'activationState', routine.planner_activation_state
  )
  into v_routine_row
  from public.routines as routine
  where routine.id = v_routine_id and routine.user_id = v_auth_user_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'plannerRecordId', routine_day.planner_record_id,
        'routineRecordId', routine_day.planner_routine_record_id,
        'sessionId', routine_day.planner_session_id,
        'ordinal', routine_day.day_index,
        'dayIndex', routine_day.day_index,
        'weekday', routine_day.planner_weekday,
        'timeBudget', routine_day.planner_time_budget,
        'exerciseRecordIds', routine_day.planner_exercise_record_ids
      )
      order by routine_day.day_index
    ),
    '[]'::jsonb
  )
  into v_session_rows
  from public.routine_days as routine_day
  where routine_day.routine_id = v_routine_id
    and routine_day.user_id = v_auth_user_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'plannerRecordId', routine_exercise.planner_record_id,
        'routineRecordId', routine_exercise.planner_routine_record_id,
        'sessionRecordId', routine_exercise.planner_session_record_id,
        'sessionId', routine_exercise.planner_session_id,
        'exerciseSlug', routine_exercise.planner_exercise_slug,
        'position', routine_exercise.position,
        'measurementType', routine_exercise.planner_measurement_type,
        'targetSets', routine_exercise.target_sets,
        'targetRepsMin', routine_exercise.rep_range_min,
        'targetRepsMax', routine_exercise.rep_range_max,
        'targetDurationSeconds', routine_exercise.target_duration_seconds,
        'prescription', routine_exercise.planner_prescription,
        'rankingExplanation', routine_exercise.planner_ranking_explanation,
        'substitutionRules', routine_exercise.planner_substitution_rules,
        'warmup', routine_exercise.planner_warmup
      )
      order by routine_day.day_index, routine_exercise.position
    ),
    '[]'::jsonb
  )
  into v_exercise_rows
  from public.routine_day_exercises as routine_exercise
  join public.routine_days as routine_day
    on routine_day.id = routine_exercise.routine_day_id
  where routine_day.routine_id = v_routine_id
    and routine_exercise.user_id = v_auth_user_id;

  return jsonb_build_object(
    'schemaVersion', 'fitness.planner-routine-create-response.v1',
    'outcome', v_outcome,
    'routineId', v_routine_id::text,
    'userId', v_auth_user_id::text,
    'generationRequestId', v_generation_request_id,
    'uniquenessKey', v_uniqueness_key,
    'intentDigest', v_intent_digest,
    'activationMutation', false,
    'persistedIntent', p_intent,
    'rows', jsonb_build_object(
      'routine', v_routine_row,
      'sessions', v_session_rows,
      'exercises', v_exercise_rows
    )
  );
end;
$function$;

revoke all on function public.create_planner_routine_v1(
  jsonb,
  text,
  date,
  text
) from public;
revoke execute on function public.create_planner_routine_v1(
  jsonb,
  text,
  date,
  text
) from anon;
grant execute on function public.create_planner_routine_v1(
  jsonb,
  text,
  date,
  text
) to authenticated;
