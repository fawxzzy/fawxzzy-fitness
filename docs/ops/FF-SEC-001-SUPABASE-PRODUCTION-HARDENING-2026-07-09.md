# FF-SEC-001 - Supabase Production Hardening Before Paid Launch

Status: OPERATOR-ACCEPTED FOR MVP / PUBLIC PAID LAUNCH SECURITY RISK RECORDED

This card exists because the billing lane is close enough that infrastructure security posture now matters as a launch gate. It is not a generic cleanup card.

## Scope

- Supabase project: `FawxzzyFitness`
- Project ref: `lpswxoyfniocuhljgzbc`
- Region: `us-west-2`
- Database: Postgres `17.6.1.104`

## Closed On 2026-07-09

### SECURITY DEFINER EXECUTE Revokes

Production advisor class:

- `anon_security_definer_function_executable`
- `authenticated_security_definer_function_executable`

Affected functions:

- `public.compact_human_member_numbers_after_profile_delete()`
- `public.compact_human_member_numbers_preserving_zero()`
- `public.refresh_discord_member_link_member_number_snapshots()`

Repo migration:

- `supabase/migrations/20260709072134_harden_discord_security_definer_execute.sql`

Applied Supabase migration:

- `20260709072134_harden_discord_security_definer_execute`

Before proof:

- `public`, `anon`, and `authenticated` could execute all three functions.
- `service_role` could execute all three functions.

After proof:

| Function | public | anon | authenticated | service_role |
| --- | --- | --- | --- | --- |
| `compact_human_member_numbers_after_profile_delete()` | false | false | false | true |
| `compact_human_member_numbers_preserving_zero()` | false | false | false | true |
| `refresh_discord_member_link_member_number_snapshots()` | false | false | false | true |

Implementation choice:

- Keep `SECURITY DEFINER` so trigger/operator behavior stays stable.
- Revoke inherited public API execution from `public`, `anon`, and `authenticated`.
- Grant explicit execution only to `service_role`.

Reason:

- These functions are internal maintenance paths, not client RPC APIs.
- Repo search found no client/app RPC call path for these three functions.
- Trigger execution remains internal; public Data API callers no longer get direct privileged execution.

### Internal Discord Table Access

Production finding class:

- RLS-enabled tables with no explicit policies.
- Several internal Discord/support tables also retained direct table privileges for `anon` and `authenticated`.

Repo migration:

- `supabase/migrations/20260709073257_harden_discord_internal_table_access.sql`

Applied Supabase migration:

- `20260709073257_harden_discord_internal_table_access`

Closed behavior:

- Revoked direct table privileges from `public`, `anon`, and `authenticated`.
- Granted table privileges explicitly to `service_role`.
- Added explicit deny policies for `anon` and `authenticated` so the no-public-access intent is visible in RLS policy state.

Affected tables:

- `public.discord_feedback_reports`
- `public.discord_member_links`
- `public.discord_message_command_claims`
- `public.discord_moderation_cases`
- `public.discord_spotify_connections`
- `public.discord_spotify_lobbies`
- `public.discord_spotify_queue_items`
- `public.discord_spotify_room_members`
- `public.discord_update_drafts`
- `public.discord_verification_tokens`

After proof:

- `anon`: no direct `select`, `insert`, `update`, or `delete`.
- `authenticated`: no direct `select`, `insert`, `update`, or `delete`.
- `service_role`: direct table access preserved.
- Each table has a `*_deny_public_api_access` policy for `anon` and `authenticated`.

## Verification SQL: Function EXECUTE

```sql
select p.proname,
       r.rolname,
       has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join (values ('public'), ('anon'), ('authenticated'), ('service_role')) as r(rolname)
where n.nspname = 'public'
  and p.proname in (
    'compact_human_member_numbers_after_profile_delete',
    'compact_human_member_numbers_preserving_zero',
    'refresh_discord_member_link_member_number_snapshots'
  )
order by p.proname, r.rolname;
```

Expected:

- `public=false`
- `anon=false`
- `authenticated=false`
- `service_role=true`

## Verification SQL: Internal Table Access

```sql
with target_tables as (
  select c.oid, c.relname as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'discord_feedback_reports',
      'discord_member_links',
      'discord_message_command_claims',
      'discord_moderation_cases',
      'discord_spotify_connections',
      'discord_spotify_lobbies',
      'discord_spotify_queue_items',
      'discord_spotify_room_members',
      'discord_update_drafts',
      'discord_verification_tokens'
    )
), roles as (
  select unnest(array['anon','authenticated','service_role']) as role_name
)
select t.table_name,
       bool_or(p.polname = t.table_name || '_deny_public_api_access') as has_deny_policy,
       jsonb_object_agg(roles.role_name, jsonb_build_object(
         'select', has_table_privilege(roles.role_name, t.oid, 'SELECT'),
         'insert', has_table_privilege(roles.role_name, t.oid, 'INSERT'),
         'update', has_table_privilege(roles.role_name, t.oid, 'UPDATE'),
         'delete', has_table_privilege(roles.role_name, t.oid, 'DELETE')
       ) order by roles.role_name) as privileges
from target_tables t
left join pg_policy p on p.polrelid = t.oid
cross join roles
group by t.table_name
order by t.table_name;
```

Expected:

- `has_deny_policy=true`
- `anon` privileges all `false`
- `authenticated` privileges all `false`
- `service_role` privileges all `true`

## 2026-07-09 Operator Risk Acceptance

The operator explicitly accepted MVP launch risk for the remaining non-database-access Supabase hardening items.

Accepted risk items:

- Supabase leaked password protection remains disabled at advisor readback time.
- Supabase organization MFA and deployment/operator account MFA were not technically reverified in this pass.
- PITR is not required before the MVP public paid launch.
- Daily backup visibility was not technically reverified in this pass.
- Performance-only unused-index advisories are deferred unless they affect auth, billing, session, or routine launch paths.

Restore-readiness posture:

- Owner: Zachariah John Harold Redfield.
- Primary restore path: Supabase Dashboard project backup restore or Supabase support-assisted restore for `FawxzzyFitness`.
- Backup source: Supabase Pro daily backups, with PITR deferred by operator risk acceptance.
- Expected downtime: unknown until a restore drill is run; treat restore as a high-severity operator event.
- Current MVP rule: do not claim tested restore capability until a separate restore drill is performed.

## Still Open / Deferred

These remain security follow-up work, but no longer block MVP public paid checkout after the explicit operator risk acceptance above:

- Enable Supabase leaked password protection.
- Confirm Supabase organization MFA.
- Confirm GitHub account 2FA for deployment/operator accounts.
- Confirm daily backup visibility.
- Run a restore drill and record actual downtime.
- Review performance-only advisories separately; unused indexes are not P0 launch blockers unless they affect billing/auth/session paths.

## Internal Table Classification

Production readback on `2026-07-09` returned only Discord/support tables in this class. These are now classified and hardened as internal service-role tables:

| Table | Current classification | Launch action |
| --- | --- | --- |
| `public.discord_feedback_reports` | internal Discord feedback board / service-role tooling | explicit deny policy + no anon/auth grants |
| `public.discord_member_links` | internal Discord member-link service table | explicit deny policy + no anon/auth grants |
| `public.discord_message_command_claims` | internal Discord command idempotency table | explicit deny policy + no anon/auth grants |
| `public.discord_moderation_cases` | internal Discord moderation table | explicit deny policy + no anon/auth grants |
| `public.discord_spotify_connections` | internal Discord Spotify club table | explicit deny policy + no anon/auth grants |
| `public.discord_spotify_lobbies` | internal Discord Spotify club table | explicit deny policy + no anon/auth grants |
| `public.discord_spotify_queue_items` | internal Discord Spotify club table | explicit deny policy + no anon/auth grants |
| `public.discord_spotify_room_members` | internal Discord Spotify club table | explicit deny policy + no anon/auth grants |
| `public.discord_update_drafts` | internal release/update-post draft table | explicit deny policy + no anon/auth grants |
| `public.discord_verification_tokens` | internal Discord verification token table | explicit deny policy + no anon/auth grants |

Decision:

- Do not create permissive `authenticated` policies for these tables during launch cleanup.
- If a route needs user-facing access later, add the narrow policy with a route-specific proof.
- For this paid-launch lane, classification proof is enough if every table is confirmed internal-only and no public client path depends on direct table access.

## Launch Gate Rule

`FF-SEC-001` no longer blocks MVP public paid checkout on Supabase access-control posture because:

- SECURITY DEFINER public execution warnings stay cleared. Closed for the identified three functions on `2026-07-09`.
- Internal Discord/support table access stays service-role-only. Closed for identified tables on `2026-07-09`.
- Leaked password protection is explicitly operator-accepted as MVP launch risk.
- Backup/restore posture is recorded above, with PITR and restore-drill proof deferred.

`FF-QA-001` can treat `FF-SEC-001` as accepted for MVP once the latest advisor/readback proof and roadmap/card sync are recorded. Separate beta, final smoke, and public-checkout enablement gates still apply.

## 2026-07-09 P1 Performance Advisor Cleanup

Production performance advisor follow-up applied migration `20260709074946_supabase_performance_advisor_safe_indexes`.

Closed:

- Added covering index `discord_feedback_reports_reporter_fitness_user_id_idx`.
- Added covering index `discord_moderation_cases_target_fitness_user_id_idx`.
- Added covering index `workout_plan_templates_source_routine_day_id_idx`.
- Dropped duplicate unique index `discord_update_drafts_deployment_id_idx` while preserving unique constraint index `discord_update_drafts_deployment_id_uq`.

Post-migration advisor readback:

- `unindexed_foreign_keys` findings for those three foreign keys are cleared.
- `duplicate_index` finding for `discord_update_drafts` is cleared.
- Remaining performance findings are unused-index/auth-connection-strategy informational items and are deferred unless they affect launch-critical paths.
