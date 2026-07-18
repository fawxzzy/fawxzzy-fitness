begin;

lock table public.profiles in access exclusive mode;

do $$
declare
  assignment_trigger_count integer;
  compaction_trigger_count integer;
  compaction_wrapper_exists boolean;
  compactor_exists boolean;
  duplicate_number_exists boolean;
  invalid_reserved_zero_exists boolean;
  maximum_reserved_number bigint;
  negative_human_number_exists boolean;
  numbered_nonhuman_exists boolean;
  reserved_zero_count bigint;
  sequence_called boolean;
  sequence_cycles boolean;
  sequence_effective_next bigint;
  sequence_increment bigint;
  sequence_last_value bigint;
begin
  if to_regprocedure('public.assign_real_user_number_on_profile_insert()') is null then
    raise exception 'member-number safety precondition failed: assignment function is missing';
  end if;

  if to_regprocedure('public.is_automation_auth_user(uuid)') is null then
    raise exception 'member-number safety precondition failed: automation classifier is missing';
  end if;

  if to_regprocedure('public.refresh_discord_member_link_member_number_snapshots()') is null then
    raise exception 'member-number safety precondition failed: Discord snapshot refresh helper is missing';
  end if;

  if to_regclass('public.real_user_number_seq') is null then
    raise exception 'member-number safety precondition failed: assignment sequence is missing';
  end if;

  if to_regclass('public.profiles_user_number_uq') is null
    or not exists (
      select 1
      from pg_index as index_row
      join pg_class as index_relation
        on index_relation.oid = index_row.indexrelid
      join pg_namespace as index_schema
        on index_schema.oid = index_relation.relnamespace
      join pg_class as table_relation
        on table_relation.oid = index_row.indrelid
      join pg_namespace as table_schema
        on table_schema.oid = table_relation.relnamespace
      join pg_attribute as user_number_attribute
        on user_number_attribute.attrelid = table_relation.oid
        and user_number_attribute.attname = 'user_number'
        and user_number_attribute.attnum > 0
        and not user_number_attribute.attisdropped
      where index_schema.nspname = 'public'
        and index_relation.relname = 'profiles_user_number_uq'
        and table_schema.nspname = 'public'
        and table_relation.relname = 'profiles'
        and index_row.indexrelid = 'public.profiles_user_number_uq'::regclass
        and index_row.indrelid = 'public.profiles'::regclass
        and index_row.indisunique
        and index_row.indisvalid
        and index_row.indisready
        and index_row.indislive
        and index_row.indnkeyatts = 1
        and index_row.indnatts = 1
        and user_number_attribute.attnum = any(index_row.indkey)
        and index_row.indexprs is null
        and pg_get_expr(index_row.indpred, index_row.indrelid) = '(user_number IS NOT NULL)'
    ) then
    raise exception 'member-number safety precondition failed: exact unique index is missing';
  end if;

  select count(*)
  into assignment_trigger_count
  from pg_trigger as trigger_row
  join pg_proc as function_row
    on function_row.oid = trigger_row.tgfoid
  join pg_namespace as function_schema
    on function_schema.oid = function_row.pronamespace
  where trigger_row.tgrelid = 'public.profiles'::regclass
    and not trigger_row.tgisinternal
    and trigger_row.tgname = 'profiles_assign_real_user_number_before_insert'
    and trigger_row.tgenabled = 'O'
    and trigger_row.tgtype = 7
    and function_schema.nspname = 'public'
    and function_row.proname = 'assign_real_user_number_on_profile_insert'
    and pg_get_function_identity_arguments(function_row.oid) = ''
    and function_row.prosecdef
    and pg_get_userbyid(function_row.proowner) = 'postgres'
    and function_row.proconfig = array['search_path=public, auth, pg_temp'];

  if assignment_trigger_count <> 1 then
    raise exception 'member-number safety precondition failed: exact enabled assignment trigger is missing';
  end if;

  select count(*)
  into compaction_trigger_count
  from pg_trigger as trigger_row
  join pg_proc as function_row
    on function_row.oid = trigger_row.tgfoid
  join pg_namespace as function_schema
    on function_schema.oid = function_row.pronamespace
  where trigger_row.tgrelid = 'public.profiles'::regclass
    and not trigger_row.tgisinternal
    and trigger_row.tgname = 'profiles_compact_human_member_numbers_after_delete'
    and trigger_row.tgenabled = 'O'
    and trigger_row.tgtype = 9
    and function_schema.nspname = 'public'
    and function_row.proname = 'compact_human_member_numbers_after_profile_delete'
    and pg_get_function_identity_arguments(function_row.oid) = '';

  compaction_wrapper_exists :=
    to_regprocedure('public.compact_human_member_numbers_after_profile_delete()') is not null;
  compactor_exists :=
    to_regprocedure('public.compact_human_member_numbers_preserving_zero()') is not null;

  if not (
    (compaction_trigger_count = 1 and compaction_wrapper_exists and compactor_exists)
    or (compaction_trigger_count = 0 and not compaction_wrapper_exists and not compactor_exists)
  ) then
    raise exception 'member-number safety precondition failed: compaction objects are in a mixed state';
  end if;

  select count(*)
  into reserved_zero_count
  from public.profiles as profile
  where profile.user_number = 0;

  if reserved_zero_count <> 1 then
    raise exception 'member-number safety precondition failed: exactly one reserved #0 human profile is required';
  end if;

  select exists (
    select 1
    from public.profiles as profile
    where profile.user_number = 0
      and (
        profile.user_kind is distinct from 'human'
        or profile.user_number_assigned_at is null
      )
  )
  into invalid_reserved_zero_exists;

  if invalid_reserved_zero_exists then
    raise exception 'member-number safety precondition failed: reserved #0 profile has invalid human identity metadata';
  end if;

  select exists (
    select 1
    from public.profiles as profile
    where profile.user_number is not null
    group by profile.user_number
    having count(*) > 1
  )
  into duplicate_number_exists;

  if duplicate_number_exists then
    raise exception 'member-number safety precondition failed: duplicate member numbers exist';
  end if;

  select exists (
    select 1
    from public.profiles as profile
    where profile.user_kind = 'human'
      and profile.user_number < 0
  )
  into negative_human_number_exists;

  if negative_human_number_exists then
    raise exception 'member-number safety precondition failed: negative human member numbers exist';
  end if;

  select exists (
    select 1
    from public.profiles as profile
    where profile.user_number is not null
      and profile.user_kind is distinct from 'human'
  )
  into numbered_nonhuman_exists;

  if numbered_nonhuman_exists then
    raise exception 'member-number safety precondition failed: a numbered profile is not human';
  end if;

  select coalesce(max(profile.user_number), -1)
  into maximum_reserved_number
  from public.profiles as profile
  where profile.user_number is not null;

  select sequence_row.last_value, sequence_row.is_called
  into sequence_last_value, sequence_called
  from public.real_user_number_seq as sequence_row;

  select sequence_catalog.seqincrement, sequence_catalog.seqcycle
  into sequence_increment, sequence_cycles
  from pg_sequence as sequence_catalog
  where sequence_catalog.seqrelid = 'public.real_user_number_seq'::regclass;

  sequence_effective_next := case
    when sequence_called then sequence_last_value + sequence_increment
    else sequence_last_value
  end;

  if sequence_increment is distinct from 1
    or sequence_cycles is distinct from false
    or sequence_effective_next is null
    or sequence_effective_next <= maximum_reserved_number then
    raise exception 'member-number safety precondition failed: sequence is cycling, unverifiable, or not above the reserved-number high-water mark';
  end if;
end;
$$;

create or replace function public.is_automation_auth_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = target_user_id
      and (
        lower(coalesce(u.raw_app_meta_data ->> 'account_kind', '')) = 'automation'
        or lower(coalesce(u.raw_user_meta_data ->> 'account_kind', '')) = 'automation'
        or lower(coalesce(u.email, '')) ~ '(^|[^a-z0-9])(codex|test|qa|example|preview|local)([^a-z0-9]|$)'
      )
  );
$$;

alter function public.is_automation_auth_user(uuid) owner to postgres;
revoke execute on function public.is_automation_auth_user(uuid)
  from public, anon, authenticated;

drop trigger if exists profiles_compact_human_member_numbers_after_delete
  on public.profiles restrict;
drop function if exists public.compact_human_member_numbers_after_profile_delete() restrict;
drop function if exists public.compact_human_member_numbers_preserving_zero() restrict;

create or replace function public.assign_real_user_number_on_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if public.is_automation_auth_user(new.id) then
    new.user_kind := 'automation';
    new.user_number := null;
    new.user_number_assigned_at := null;
    return new;
  end if;

  new.user_kind := 'human';
  new.user_number := nextval('public.real_user_number_seq');
  new.user_number_assigned_at := now();
  return new;
end;
$$;

revoke execute on function public.assign_real_user_number_on_profile_insert()
  from public, anon, authenticated;
grant execute on function public.assign_real_user_number_on_profile_insert()
  to service_role;

create or replace function public.enforce_immutable_profile_member_identity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.user_number is distinct from old.user_number
    or new.user_kind is distinct from old.user_kind
    or new.user_number_assigned_at is distinct from old.user_number_assigned_at then
    raise exception 'profile member identity is immutable'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_immutable_profile_member_identity()
  from public, anon, authenticated, service_role;

drop trigger if exists profiles_enforce_immutable_member_identity_before_update
  on public.profiles;
create trigger profiles_enforce_immutable_member_identity_before_update
before update on public.profiles
for each row
execute function public.enforce_immutable_profile_member_identity();

revoke all privileges on sequence public.real_user_number_seq from public;
revoke all privileges on sequence public.real_user_number_seq from anon, authenticated, service_role;
grant select on sequence public.real_user_number_seq to service_role;

comment on column public.profiles.user_number is
  'Immutable unique human member number. Deleted numbers leave permanent gaps and are never reused.';
comment on column public.profiles.user_kind is
  'Immutable member identity kind assigned when the profile is created.';
comment on column public.profiles.user_number_assigned_at is
  'Immutable timestamp for the original member-number assignment.';
comment on sequence public.real_user_number_seq is
  'Source allocator for new human member numbers. It advances only and must never be restarted or reseeded downward.';
comment on function public.assign_real_user_number_on_profile_insert() is
  'Assigns every new human the next source member number and leaves automation profiles unnumbered; caller-supplied identity values are ignored.';
comment on function public.enforce_immutable_profile_member_identity() is
  'Rejects changes to profile member identity fields while allowing same-value profile updates.';

commit;
