create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'America/Toronto',
  active_routine_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  cycle_length_days int not null check (cycle_length_days >= 1 and cycle_length_days <= 365),
  start_date date not null,
  timezone text not null,
  progression_mode text not null default 'progressive_overload',
  temperament text not null default 'moderate',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_active_routine_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_active_routine_id_fkey
      foreign key (active_routine_id)
      references public.routines(id)
      on delete set null;
  end if;
end
$$;

create table if not exists public.routine_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  routine_id uuid not null references public.routines(id) on delete cascade,
  day_index int not null,
  name text null,
  is_rest boolean not null default false,
  notes text null,
  created_at timestamptz not null default now(),
  unique (routine_id, day_index)
);

create table if not exists public.routine_day_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  routine_day_id uuid not null references public.routine_days(id) on delete cascade,
  exercise_id uuid not null,
  position int not null default 0,
  target_sets int null,
  rep_range_min int null,
  rep_range_max int null,
  notes text null,
  created_at timestamptz not null default now()
);

alter table public.sessions
  add column if not exists routine_id uuid null references public.routines(id),
  add column if not exists routine_day_index int null;

create index if not exists routines_user_id_updated_at_idx
  on public.routines(user_id, updated_at desc);

create index if not exists routine_days_routine_id_day_index_idx
  on public.routine_days(routine_id, day_index);

create index if not exists routine_day_exercises_routine_day_id_position_idx
  on public.routine_day_exercises(routine_day_id, position);

create index if not exists profiles_active_routine_id_idx
  on public.profiles(active_routine_id);

alter table public.profiles enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_day_exercises enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_delete_own"
  on public.profiles
  for delete
  using (id = auth.uid());

create policy "routines_select_own"
  on public.routines
  for select
  using (user_id = auth.uid());

create policy "routines_insert_own"
  on public.routines
  for insert
  with check (user_id = auth.uid());

create policy "routines_update_own"
  on public.routines
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "routines_delete_own"
  on public.routines
  for delete
  using (user_id = auth.uid());

create policy "routine_days_select_own"
  on public.routine_days
  for select
  using (user_id = auth.uid());

create policy "routine_days_insert_own"
  on public.routine_days
  for insert
  with check (user_id = auth.uid());

create policy "routine_days_update_own"
  on public.routine_days
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "routine_days_delete_own"
  on public.routine_days
  for delete
  using (user_id = auth.uid());

create policy "routine_day_exercises_select_own"
  on public.routine_day_exercises
  for select
  using (user_id = auth.uid());

create policy "routine_day_exercises_insert_own"
  on public.routine_day_exercises
  for insert
  with check (user_id = auth.uid());

create policy "routine_day_exercises_update_own"
  on public.routine_day_exercises
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "routine_day_exercises_delete_own"
  on public.routine_day_exercises
  for delete
  using (user_id = auth.uid());

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();
