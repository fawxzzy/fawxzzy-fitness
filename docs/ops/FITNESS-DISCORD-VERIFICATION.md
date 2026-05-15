# Fitness Discord Verification

## User flow
1. The user signs into the Fitness app.
2. The user opens `Settings -> Account -> Discord Access -> Generate token`.
3. The app calls `POST /api/discord/verification-token`.
4. The app shows the raw token once.
5. The user pastes the token into Discord.
6. Discord sends the signed interaction to `POST /api/discord/interactions`.
7. Fitness consumes the token and grants the Discord role through the Discord REST API.
8. Fitness records the durable Discord member link and attempts to sync the Discord nickname to the current compact Fitness member number when the profile is a numbered human account.

## Endpoint contracts

### `POST /api/discord/verification-token`
- Auth: logged-in Fitness app session required via `requireUser()`.
- Response:

```json
{
  "ok": true,
  "token": "FWX-ABCD-EFGH",
  "expiresAt": "2026-05-14T12:15:00.000Z"
}
```

- Notes:
  - The raw token is returned once.
  - Existing unconsumed tokens for the same user are cleared before a new token is created.
  - Automation profiles are rejected.

### `POST /api/discord/verify`
- Auth: `x-discord-verification-secret` header must match `DISCORD_VERIFICATION_BOT_SECRET`.
- Request body:

```json
{
  "token": "FWX-ABCD-EFGH",
  "discordUserId": "123456789012345678",
  "discordUsername": "optional"
}
```

- Success response:

```json
{
  "ok": true,
  "memberId": "00000000-0000-0000-0000-000000000000",
  "userNumber": 101,
  "userKind": "human"
}
```

- Invalid or expired token response:

```json
{
  "ok": false,
  "code": "DISCORD_VERIFICATION_INVALID_OR_EXPIRED",
  "requestId": "..."
}
```

### `POST /api/discord/interactions`
- Auth: Discord `X-Signature-Ed25519` and `X-Signature-Timestamp` headers must verify against `DISCORD_PUBLIC_KEY`.
- Behavior:
  - responds to Discord `PING` with `{ "type": 1 }`
  - opens the `/bug` modal and stores bug reports in `public.discord_bug_reports`
  - handles the guild `setup-verify` slash command
  - opens the verification modal for `fitness_verify_open`
  - consumes the Fitness token when `fitness_verify_modal` submits
  - grants the verified Discord role through the Discord REST API
  - upserts `public.discord_member_links` for the verified member
  - attempts to sync the Discord guild nickname to `#<user_number> · <display name>` when `profiles.user_kind = 'human'` and `profiles.user_number` is not null
- Notes:
  - signature verification happens before JSON parsing
  - the Fitness app becomes the Discord interactions endpoint
  - the old Gateway bot process is no longer required after Discord points to this endpoint
  - nickname sync failure does not revoke verification; role grant failure still blocks access

## Member number sync
- Source of truth: `public.profiles.user_number`
- Display guardrail: only display member numbers when `public.profiles.user_kind = 'human'` and `public.profiles.user_number` is not null
- Nickname format: `#12 · DisplayName`
- Existing `#<number> ·` prefixes are replaced when the member reverifies or when the operator resync runs
- Fallback nickname label: `#12 · Member`
- Discord nickname sync is best-effort during verification
- Bot/app requirements: the Discord app role must have `Manage Nicknames` and must sit high enough in the server role hierarchy

## Compact number semantics
- Member numbers are compact public member slots, not permanent identity numbers
- Zac is reserved as `#0` by explicit operator action and is excluded from compaction
- Human users compact from `#1` upward
- Deleted numbered human users cause higher positive numbers to shift down
- Positive gaps are not expected after compaction
- Automation accounts do not consume public member numbers
- Discord nicknames can go stale after compaction and should be resynced with the operator sync script

## Discord member links
- Durable table: `public.discord_member_links`
- Purpose: store the Fitness user id, Discord user id, the current member number snapshot, verified-role timestamp, and nickname sync status for each verified member
- Access: server/admin only through the service role helper path
- Compaction note: `discord_member_links.user_number` is a snapshot and can drift after delete-driven compaction until the operator refresh/sync path runs

## Required environment variables
- `SUPABASE_SERVICE_ROLE_KEY`
- `DISCORD_VERIFICATION_BOT_SECRET`
- `DISCORD_VERIFICATION_TOKEN_PEPPER`
- `DISCORD_VERIFICATION_TOKEN_TTL_MINUTES` (optional, defaults to 15)
- `DISCORD_PUBLIC_KEY`
- `DISCORD_BOT_TOKEN`
- `DISCORD_APPLICATION_ID`
- `DISCORD_GUILD_ID`
- `DISCORD_VERIFY_CHANNEL_ID`
- `DISCORD_VERIFIED_ROLE_ID`
- `DISCORD_UNVERIFIED_ROLE_ID` (optional)
- `DISCORD_VERIFY_MESSAGE_TITLE` (optional)
- `DISCORD_VERIFY_MESSAGE_BODY` (optional)
- `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID` (optional, production value `1504673475489562744`)

## Security notes
- Raw verification tokens are never stored in the database.
- Email-only verification is intentionally not supported.
- The bot verification endpoint is protected by a shared secret header.
- Verification tokens are single-use.
- Verification tokens expire quickly.
- Unsigned Discord interactions must never reach the role-grant logic.

## User path
- `Settings -> Account -> Discord Access -> Generate token`

## Discord HTTP Interactions Endpoint
- Endpoint URL:
  - `https://<fitness-domain>/api/discord/interactions`
- Manual Discord Developer Portal step:
  - `General Information -> Interactions Endpoint URL`
- Known operator values:
  - `DISCORD_APPLICATION_ID=1504700208251146371`
  - `DISCORD_PUBLIC_KEY=30a5d075ef72a55850c412caea9e35c994b110105cf7ae30a273575a8af2d74d`
  - `DISCORD_GUILD_ID=1504668396338413670`
- Required Vercel env vars:
  - `DISCORD_PUBLIC_KEY`
  - `DISCORD_BOT_TOKEN`
  - `DISCORD_APPLICATION_ID`
  - `DISCORD_GUILD_ID`
  - `DISCORD_VERIFY_CHANNEL_ID`
  - `DISCORD_VERIFIED_ROLE_ID`
  - `DISCORD_UNVERIFIED_ROLE_ID` (optional)
  - `DISCORD_VERIFICATION_BOT_SECRET` remains required for the legacy `/api/discord/verify` endpoint
  - `DISCORD_VERIFICATION_TOKEN_PEPPER` remains required
- After deployment:
  - set the Interactions Endpoint URL in Discord
  - run `npm run discord:commands:register`
  - run `/bug` and confirm the modal submits into `public.discord_bug_reports`
  - confirm unique bugs create Feedback forum posts when `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID` is set
  - run `/setup-verify` in Discord
  - generate a token from `Settings -> Account -> Discord Access`
  - paste the token into the Discord modal
- Operational note:
  - once the endpoint URL is configured and tested, the old Gateway bot process is no longer required for interaction handling

## Deployment checklist
- Apply the Supabase migration for `discord_verification_tokens`.
- Apply the Supabase migration for `discord_member_links`.
- Apply the Supabase migration for compact public member-number compaction.
- Add `SUPABASE_SERVICE_ROLE_KEY`, `DISCORD_VERIFICATION_BOT_SECRET`, `DISCORD_VERIFICATION_TOKEN_PEPPER`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_APPLICATION_ID`, `DISCORD_GUILD_ID`, `DISCORD_VERIFY_CHANNEL_ID`, and `DISCORD_VERIFIED_ROLE_ID` in Vercel.
- Optionally set `DISCORD_UNVERIFIED_ROLE_ID`, `DISCORD_VERIFY_MESSAGE_TITLE`, and `DISCORD_VERIFY_MESSAGE_BODY`.
- Optionally set `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID` to publish unique bugs into the Feedback forum board.
- Optionally set `DISCORD_VERIFICATION_TOKEN_TTL_MINUTES`.
- Set `https://<fitness-domain>/api/discord/interactions` as the Discord Interactions Endpoint URL.
- Run `npm run discord:commands:register`.
- Run `npm run typecheck`.
- Run `npm run lint:ci`.
- Run `node --import ./scripts/register-test-aliases.mjs --test src/lib/discord/*.test.ts`.
- Test token generation while logged in to the Fitness app.
- Test `/bug` and confirm the queue row is written.
- Test Discord modal verification end to end.
- Run `node scripts/audit-member-numbers.mjs`.
- Run `npm run sync:discord-member-numbers -- --dry-run` after any delete-driven compaction and rerun without `--dry-run` when you want to refresh link snapshots and Discord nicknames.

## Debug matrix
- verified but nickname not updated -> the Discord app is missing `Manage Nicknames` or sits below the target member's top role
- wrong number displayed -> inspect `public.profiles.user_number` and `public.profiles.user_kind`
- positive member-number gaps detected -> run `npm run audit:member-numbers`; compact numbering expects no positive gaps and the DB trigger should close them after human deletes
- Codex or QA user counted as human -> run `npm run audit:member-numbers`, fix the auth metadata, then mark the profile as automation
- Discord numbers stale after a delete -> run `npm run sync:discord-member-numbers -- --dry-run`, then rerun without `--dry-run` to refresh link snapshots and guild nicknames
- verification succeeds but no member number is shown -> verify that the profile is `user_kind = 'human'` and has a non-null `user_number`
