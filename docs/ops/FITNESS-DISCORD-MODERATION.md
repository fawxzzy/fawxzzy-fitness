# Fitness Discord Moderation

## Purpose
Fawx Security provides a reversible moderation lane for the Fitness Discord server.

Core rule:
- No full bans by default.

Moderation should isolate a user into Purgatory, keep a bounded case record in Supabase, log the action, and preserve a release path.

## Command surface
- `/purgatory-setup`
  - staff/admin only
  - creates or verifies the `Purgatory` role, `Purgatory` category, and `purgatory` channel
- `/purgatory`
  - staff/admin only
  - moves a user into reversible Purgatory isolation
- `/release`
  - staff/admin only
  - removes the Purgatory role and restores safe stored roles
- `/mod-log`
  - staff/admin only
  - shows recent moderation cases ephemerally

## Role and channel model
Purgatory uses reversible access isolation:
- add the `Purgatory` role
- remove configured access roles temporarily
- hide the Purgatory category from `@everyone`
- allow the `Purgatory` role and the bot inside the Purgatory category/channel
- keep normal server roles restorable through the stored case row

Configured removals:
- `DISCORD_VERIFIED_ROLE_ID` is treated as removable/restorable when present
- `DISCORD_PURGATORY_REMOVED_ROLE_IDS` can list additional access roles

Optional log destination:
- `DISCORD_MOD_LOG_CHANNEL_ID`

## Case model
Each moderation action writes a row to `public.discord_moderation_cases`.

Stored data includes:
- target Discord user
- moderator Discord user
- reason
- optional duration and `expires_at`
- removed roles
- restored roles
- channel/log references
- release metadata

## Release flow
Manual release:
1. Staff runs `/release` with a user or case id.
2. Fawx Security removes the `Purgatory` role.
3. Fawx Security restores stored removable roles that still exist and are safe to manage.
4. The case is marked `released`.
5. A log message is posted when a mod-log channel is configured.

Expired release:
- `npm run moderation:purgatory:release-expired`
- dry-run by default
- rerun with `--apply` to mutate

## Safety limits
- No bans by default.
- No kicks.
- No message deletion in v1.
- Do not jail the server owner.
- Do not jail the bot.
- Do not jail users the bot cannot manage because of role hierarchy.
- Restore only roles that were explicitly removed and still exist.
- Never restore missing roles.

## Owner and high-role limits
Discord role hierarchy still applies:
- the bot must sit above the removable roles and target member roles
- the server owner cannot be jailed
- admin-like targets should require owner/admin judgment, not casual staff action

## Emergency rollback
If setup or role state needs a manual rollback:
1. Remove the `Purgatory` role from the affected user.
2. Re-add only the expected access roles.
3. Check the most recent `discord_moderation_cases` row.
4. Use `/release` when the stored case is still active.

## Out of scope
This moderation lane does not change:
- routine sharing
- workout sharing
- app import or copy flows
- feedback board export behavior beyond shared command registration/helpers
