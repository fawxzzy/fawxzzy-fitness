# Fitness Supabase Migration Ledger Repair - 2026-05

## Scope
Controlled remote migration-ledger repair for Fitness project `lpswxoyfniocuhljgzbc`.

Target versions:
- `20260515130000`
- `20260515140000`
- `20260515150000`
- `20260515160000`
- `20260515170000`

These correspond to:
- `20260515130000_057_discord_bug_reports.sql`
- `20260515140000_058_discord_bug_report_forum_tags.sql`
- `20260515150000_059_discord_feedback_reports.sql`
- `20260515160000_060_discord_member_number_sync_queue.sql`
- `20260515170000_061_discord_feedback_feature_report_type.sql`

## Rule
No version was marked applied until its expected production schema effects were verified.

This lane:
- did not apply schema-changing SQL
- did not reset the database
- did not rewrite existing production schema behavior

## Production schema evidence

### 057 - discord_bug_reports
Expected effects:
- bounded bug/feedback report table shape exists
- duplicate-tracking fields exist
- forum-thread ids exist
- RLS enabled

Evidence:
- production active table is `public.discord_feedback_reports`
- columns include:
  - `duplicate_count`
  - `first_seen_at`
  - `last_seen_at`
  - `discord_forum_thread_id`
- `public.discord_feedback_reports` has `relrowsecurity = true`

### 058 - discord_bug_report_forum_tags
Expected effects:
- forum/status fields exist

Evidence:
- production columns include:
  - `report_type`
  - `discord_forum_applied_tag_ids`
  - `discord_forum_title`
  - `status_updated_at`
  - `status_updated_by_discord_user_id`
  - `status_note`
  - `reporter_mentioned_at`

### 059 - discord_feedback_reports
Expected effects:
- active table is `public.discord_feedback_reports`
- `public.discord_bug_reports` is no longer the live table name
- final feedback constraints and indexes exist

Evidence:
- `to_regclass('public.discord_bug_reports')` returned `null`
- `to_regclass('public.discord_feedback_reports')` returned `discord_feedback_reports`
- production report-type constraint is:
  - `report_type in ('bug', 'feature', 'fix')`
- production attachment and status constraints exist on `public.discord_feedback_reports`

### 060 - discord_member_number_sync_queue
Expected effects:
- `discord_member_links.nickname_sync_status` supports `needs_sync`
- member-link snapshot refresh path exists
- protected sync route exists in app code

Evidence:
- production constraint:
  - `nickname_sync_status in ('not_attempted', 'needs_sync', 'synced', 'failed', 'skipped')`
- app code includes:
  - `src/app/api/discord/member-numbers/sync/route.ts`
  - `scripts/sync-discord-member-numbers.mjs`

### 061 - discord_feedback_feature_report_type
Expected effects:
- legacy `feat` values backfilled to `feature`
- production allows `feature`
- new app submissions store `feature`, not `feat`

Evidence:
- production report-type counts:
  - `bug = 12`
  - `feature = 3`
- production backfill counts:
  - `feat_rows = 0`
  - `feature_rows = 3`
  - `fix_rows = 0`
- production constraint allows:
  - `bug`
  - `feature`
  - `fix`

## Repair commands used
Executed sequentially with the linked project:

```powershell
npx supabase migration repair 20260515130000 --status applied --linked --yes
npx supabase migration repair 20260515140000 --status applied --linked --yes
npx supabase migration repair 20260515150000 --status applied --linked --yes
npx supabase migration repair 20260515160000 --status applied --linked --yes
npx supabase migration repair 20260515170000 --status applied --linked --yes
```

One initial attempt ran multiple repair commands in parallel. That produced inconsistent auth behavior for two of the commands. The final repair was completed safely by rerunning the remaining versions sequentially.

## Post-repair validation
Results after ledger repair:
- `npm run migration:validate` -> pass
- `npx supabase migration list --linked` -> local and remote versions aligned
- `npm run doctor:discord-community` -> `10 pass, 2 warn, 0 fail`

Accepted doctor warnings after repair:
- local doctor env mirror is missing redacted secrets:
  - `DISCORD_VERIFICATION_TOKEN_PEPPER`
  - `DISCORD_VERIFICATION_BOT_SECRET`
- owner `#0` nickname sync still shows expected Discord hierarchy limitation:
  - `DISCORD_NICKNAME_UPDATE_FORBIDDEN`

## Conclusion
The migration ledger is now healthy again for normal Fitness workflow:
- linked migration history is aligned
- `migration:validate` passes
- the Discord community schema lane no longer depends on a standing migration exception set
