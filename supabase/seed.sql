-- Fawxzzy Fitness local/dev seed data.
-- This file is safe to run during `supabase db reset`; it does not require
-- live project credentials and must not contain production data or secrets.

create extension if not exists pgcrypto;

do $$
declare
  seed_user_id uuid := '00000000-0000-4000-8000-000000000001'::uuid;
  seed_email text := 'fitness-seed@example.test';
  routine_id uuid := '00000000-0000-4000-8000-000000000101'::uuid;
  upper_day_id uuid := '00000000-0000-4000-8000-000000000201'::uuid;
  lower_day_id uuid := '00000000-0000-4000-8000-000000000202'::uuid;
  session_id uuid := '00000000-0000-4000-8000-000000000301'::uuid;
  bench_session_exercise_id uuid := '00000000-0000-4000-8000-000000000401'::uuid;
  bench_exercise_id uuid;
  squat_exercise_id uuid;
begin
  select id
  into bench_exercise_id
  from public.exercises
  where user_id is null
    and lower(btrim(name)) in ('barbell bench press', 'bench press')
  order by case lower(btrim(name)) when 'barbell bench press' then 0 else 1 end
  limit 1;

  select id
  into squat_exercise_id
  from public.exercises
  where user_id is null
    and lower(btrim(name)) = 'back squat'
  limit 1;

  if bench_exercise_id is null or squat_exercise_id is null then
    raise exception 'Fitness seed requires global Barbell Bench Press/Bench Press and Back Squat exercises from migrations.';
  end if;

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  values (
    seed_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    seed_email,
    crypt('fitness-local-password', gen_salt('bf')),
    '2026-01-01 00:00:00+00',
    '{"provider":"email","providers":["email"],"account_kind":"automation"}'::jsonb,
    '{"account_kind":"automation","seed":"fawxzzy-fitness"}'::jsonb,
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    '',
    '',
    '',
    ''
  )
  on conflict (id) do update
  set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = excluded.updated_at;

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    seed_user_id,
    seed_user_id,
    seed_email,
    jsonb_build_object(
      'sub', seed_user_id::text,
      'email', seed_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  )
  on conflict (provider, provider_id) do update
  set
    user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    updated_at = excluded.updated_at;

  insert into public.profiles (
    id,
    timezone,
    active_routine_id,
    preferred_weight_unit,
    preferred_distance_unit,
    user_kind
  )
  values (
    seed_user_id,
    'America/New_York',
    routine_id,
    'lbs',
    'mi',
    'automation'
  )
  on conflict (id) do update
  set
    timezone = excluded.timezone,
    active_routine_id = excluded.active_routine_id,
    preferred_weight_unit = excluded.preferred_weight_unit,
    preferred_distance_unit = excluded.preferred_distance_unit,
    user_kind = excluded.user_kind,
    updated_at = now();

  insert into public.routines (
    id,
    user_id,
    name,
    cycle_length_days,
    start_date,
    timezone,
    weight_unit,
    created_at,
    updated_at
  )
  values (
    routine_id,
    seed_user_id,
    'Seed Strength Baseline',
    2,
    '2026-01-05',
    'America/New_York',
    'lbs',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  )
  on conflict (id) do update
  set
    name = excluded.name,
    cycle_length_days = excluded.cycle_length_days,
    start_date = excluded.start_date,
    timezone = excluded.timezone,
    weight_unit = excluded.weight_unit,
    updated_at = excluded.updated_at;

  insert into public.routine_days (
    id,
    routine_id,
    user_id,
    day_index,
    name,
    is_rest,
    notes,
    created_at
  )
  values
    (upper_day_id, routine_id, seed_user_id, 1, 'Upper', false, 'Seed day for local routine editing.', '2026-01-01 00:00:00+00'),
    (lower_day_id, routine_id, seed_user_id, 2, 'Lower', false, 'Seed day for local routine editing.', '2026-01-01 00:00:00+00')
  on conflict (id) do update
  set
    routine_id = excluded.routine_id,
    user_id = excluded.user_id,
    day_index = excluded.day_index,
    name = excluded.name,
    is_rest = excluded.is_rest,
    notes = excluded.notes;

  insert into public.routine_day_exercises (
    id,
    routine_day_id,
    user_id,
    exercise_id,
    position,
    target_sets,
    target_reps_min,
    target_reps_max,
    target_weight,
    target_weight_unit,
    measurement_type,
    default_unit,
    notes,
    created_at
  )
  values
    (
      '00000000-0000-4000-8000-000000000501'::uuid,
      upper_day_id,
      seed_user_id,
      bench_exercise_id,
      1,
      3,
      5,
      8,
      135,
      'lbs',
      'reps',
      'reps',
      'Deterministic local seed target.',
      '2026-01-01 00:00:00+00'
    ),
    (
      '00000000-0000-4000-8000-000000000502'::uuid,
      lower_day_id,
      seed_user_id,
      squat_exercise_id,
      1,
      3,
      5,
      8,
      185,
      'lbs',
      'reps',
      'reps',
      'Deterministic local seed target.',
      '2026-01-01 00:00:00+00'
    )
  on conflict (id) do update
  set
    routine_day_id = excluded.routine_day_id,
    user_id = excluded.user_id,
    exercise_id = excluded.exercise_id,
    position = excluded.position,
    target_sets = excluded.target_sets,
    target_reps_min = excluded.target_reps_min,
    target_reps_max = excluded.target_reps_max,
    target_weight = excluded.target_weight,
    target_weight_unit = excluded.target_weight_unit,
    measurement_type = excluded.measurement_type,
    default_unit = excluded.default_unit,
    notes = excluded.notes;

  insert into public.sessions (
    id,
    user_id,
    performed_at,
    notes,
    routine_id,
    routine_day_index,
    name,
    routine_day_name,
    duration_seconds,
    status
  )
  values (
    session_id,
    seed_user_id,
    '2026-01-05 12:00:00+00',
    'Seed completed session for local history and logger checks.',
    routine_id,
    1,
    'Seed Strength Baseline',
    'Upper',
    2700,
    'completed'
  )
  on conflict (id) do update
  set
    performed_at = excluded.performed_at,
    notes = excluded.notes,
    routine_id = excluded.routine_id,
    routine_day_index = excluded.routine_day_index,
    name = excluded.name,
    routine_day_name = excluded.routine_day_name,
    duration_seconds = excluded.duration_seconds,
    status = excluded.status;

  insert into public.session_exercises (
    id,
    session_id,
    user_id,
    exercise_id,
    position,
    performed_index,
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
    target_weight_unit
  )
  values (
    bench_session_exercise_id,
    session_id,
    seed_user_id,
    bench_exercise_id,
    1,
    1,
    'Seed logged exercise.',
    false,
    'reps',
    'reps',
    3,
    3,
    5,
    8,
    135,
    145,
    'lbs'
  )
  on conflict (id) do update
  set
    session_id = excluded.session_id,
    user_id = excluded.user_id,
    exercise_id = excluded.exercise_id,
    position = excluded.position,
    performed_index = excluded.performed_index,
    notes = excluded.notes,
    is_skipped = excluded.is_skipped,
    measurement_type = excluded.measurement_type,
    default_unit = excluded.default_unit,
    target_sets_min = excluded.target_sets_min,
    target_sets_max = excluded.target_sets_max,
    target_reps_min = excluded.target_reps_min,
    target_reps_max = excluded.target_reps_max,
    target_weight_min = excluded.target_weight_min,
    target_weight_max = excluded.target_weight_max,
    target_weight_unit = excluded.target_weight_unit;

  insert into public.sets (
    id,
    session_exercise_id,
    user_id,
    set_index,
    weight,
    reps,
    is_warmup,
    notes,
    duration_seconds,
    weight_unit,
    client_log_id
  )
  values
    ('00000000-0000-4000-8000-000000000601'::uuid, bench_session_exercise_id, seed_user_id, 1, 135, 8, false, 'Seed set 1.', null, 'lbs', 'seed-bench-1'),
    ('00000000-0000-4000-8000-000000000602'::uuid, bench_session_exercise_id, seed_user_id, 2, 140, 6, false, 'Seed set 2.', null, 'lbs', 'seed-bench-2'),
    ('00000000-0000-4000-8000-000000000603'::uuid, bench_session_exercise_id, seed_user_id, 3, 145, 5, false, 'Seed set 3.', null, 'lbs', 'seed-bench-3')
  on conflict (id) do update
  set
    session_exercise_id = excluded.session_exercise_id,
    user_id = excluded.user_id,
    set_index = excluded.set_index,
    weight = excluded.weight,
    reps = excluded.reps,
    is_warmup = excluded.is_warmup,
    notes = excluded.notes,
    duration_seconds = excluded.duration_seconds,
    weight_unit = excluded.weight_unit,
    client_log_id = excluded.client_log_id;
end $$;
