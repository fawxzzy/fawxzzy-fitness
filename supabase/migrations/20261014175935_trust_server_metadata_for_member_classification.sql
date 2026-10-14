-- Forward local-baseline correction. Preserve existing profile identities.
-- Email names and user-editable metadata are not classification authority.
begin;

-- CREATE OR REPLACE retains ACLs. Stop before changing the body if the local
-- baseline has unexpected grants; do not silently remove an unknown dependency.
do $$
declare
  classifier_oid oid := pg_catalog.to_regprocedure('public.is_automation_auth_user(uuid)');
  classifier_owner oid;
begin
  select proowner into classifier_owner
  from pg_catalog.pg_proc where oid = classifier_oid;
  if classifier_owner is distinct from 'postgres'::regrole::oid then
    raise exception 'HOLD_MEMBER_CLASSIFIER_OWNER: expected existing postgres-owned classifier';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_proc p
    cross join lateral pg_catalog.aclexplode(
      coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))
    ) a
    where p.oid = classifier_oid
      and (
        a.grantee not in (0, p.proowner, 'anon'::regrole::oid,
          'authenticated'::regrole::oid, 'service_role'::regrole::oid)
        or a.grantor <> p.proowner
        or (a.grantee <> p.proowner and a.is_grantable)
      )
  ) then
    raise exception 'HOLD_MEMBER_CLASSIFIER_ACL: unexpected grantee, grantor or grant option';
  end if;
end;
$$;

create or replace function public.is_automation_auth_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = target_user_id
      and pg_catalog.lower(coalesce(u.raw_app_meta_data ->> 'account_kind', '')) = 'automation'
  );
$$;

alter function public.is_automation_auth_user(uuid) owner to postgres;
revoke execute on function public.is_automation_auth_user(uuid)
  from public, anon, authenticated;
grant execute on function public.is_automation_auth_user(uuid) to service_role;

commit;
