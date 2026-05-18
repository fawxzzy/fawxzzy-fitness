# Fitness Discord Verification

## User flow
1. The user signs into the Fitness app.
2. The user goes to `Settings → Account → Discord Connector`.
3. The app generates a short-lived verification token.
4. The user opens the Discord verify modal and pastes the token.
5. Fitness verifies the signed Discord interaction, consumes the token, grants the Discord role, and records the durable link.

## Verify message copy
Default verify message body:

```txt
To unlock the server:

1. Sign into Fawxzzy Fitness.
2. Go to Settings → Account → Discord Connector.
3. Generate your Discord verification token.
4. Click Verify below and paste the token.

Fitness login:
https://fawxzzy-fitness-local.vercel.app/login
```

If `DISCORD_VERIFY_MESSAGE_BODY` is overridden, keep the line breaks intact and rerun `/setup-verify`.

## Interaction surface
`POST /api/discord/interactions` should:
- verify Discord request signatures before parsing
- answer `PING`
- open the verification modal
- open the feedback submit, update, and withdraw modals
- open the publish-update modal
- handle `/setup-verify`
- handle `/setup-feedback`
- handle `/feedback`, `/feedback-status`, and `/feedback-withdraw`
- handle `/update-latest`, `/update-publish`, and `/update-skip`

## Command and setup notes
- `/setup-verify` is admin-only
- `/setup-feedback` is admin-only
- update commands are admin or staff only
- normal feedback users should primarily use the persistent feedback panel
- `/feedback` and `/feedback-withdraw` remain active as hidden fallback commands, but normal users should use the panel buttons
- rerunning `/setup-verify` should prune stale duplicate verify panels instead of leaving old bot posts behind

After deployment:
1. Set the Discord Interactions Endpoint URL.
2. Run `npm run discord:commands:register`.
3. Run `/setup-feedback` and confirm the panel is refreshed.
4. Run `/setup-verify` and confirm the verify message is refreshed.
5. Test `Submit Feedback`, `Update Feedback`, and `Withdraw Feedback`.
6. Generate a token from `Settings → Account → Discord Connector`.
7. Paste the token into the Discord modal.

## Community doctor
Run:

```txt
npm run doctor:discord-community
```

The doctor is read-only and verifies the command surface, verify message, feedback panel, feedback forum tags, member-number health, and recent update-post expectations from one place.

Explicitly parked:
- no routine sharing
- no workout sharing
- no copy-to-app imports
- no Discord workout editor

## Required environment
- `SUPABASE_SERVICE_ROLE_KEY`
- `DISCORD_VERIFICATION_BOT_SECRET`
- `DISCORD_VERIFICATION_TOKEN_PEPPER`
- `DISCORD_PUBLIC_KEY`
- `DISCORD_BOT_TOKEN`
- `DISCORD_APPLICATION_ID`
- `DISCORD_GUILD_ID`
- `DISCORD_VERIFY_CHANNEL_ID`
- `DISCORD_VERIFIED_ROLE_ID`
- `DISCORD_MEMBER_SYNC_SECRET`

Optional:
- `DISCORD_UNVERIFIED_ROLE_ID`
- `DISCORD_VERIFY_MESSAGE_TITLE`
- `DISCORD_VERIFY_MESSAGE_BODY`
- `DISCORD_FEEDBACK_PANEL_CHANNEL_ID`
- `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID`

Known feedback forum value:
- `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID=1504673475489562744`

## Member number sync
- source of truth: `public.profiles.user_number`
- nickname format: `display name · number`
- sync is best-effort during verification
- queued resync runs through the protected member-sync path, not SQL-side Discord calls

## Guardrails
Rule: verification proves possession of an authenticated app session, not knowledge of an email.

Rule: signed Discord interactions must be verified before execution.

Rule: verification copy should consistently say `Discord Connector`.

Rule: owner or high-role nickname update failures can remain expected Discord limitations while the link row stays queued or marked with a safe error code.
