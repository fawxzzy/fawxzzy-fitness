# Fitness Discord Verification

## User flow
1. The user signs into the Fitness app.
2. The user opens `Settings -> Account -> Discord Access -> Generate token`.
3. The app calls `POST /api/discord/verification-token`.
4. The app shows the raw token once.
5. The user pastes the token into Discord.
6. Discord sends the signed interaction to `POST /api/discord/interactions`.
7. Fitness consumes the token and grants the Discord role through the Discord REST API.

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
  - handles the guild `setup-verify` slash command
  - opens the verification modal for `fitness_verify_open`
  - consumes the Fitness token when `fitness_verify_modal` submits
  - grants the verified Discord role through the Discord REST API
- Notes:
  - signature verification happens before JSON parsing
  - the Fitness app becomes the Discord interactions endpoint
  - the old Gateway bot process is no longer required after Discord points to this endpoint

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
  - run `/setup-verify` in Discord
  - generate a token from `Settings -> Account -> Discord Access`
  - paste the token into the Discord modal
- Operational note:
  - once the endpoint URL is configured and tested, the old Gateway bot process is no longer required for interaction handling

## Deployment checklist
- Apply the Supabase migration for `discord_verification_tokens`.
- Add `SUPABASE_SERVICE_ROLE_KEY`, `DISCORD_VERIFICATION_BOT_SECRET`, `DISCORD_VERIFICATION_TOKEN_PEPPER`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_APPLICATION_ID`, `DISCORD_GUILD_ID`, `DISCORD_VERIFY_CHANNEL_ID`, and `DISCORD_VERIFIED_ROLE_ID` in Vercel.
- Optionally set `DISCORD_UNVERIFIED_ROLE_ID`, `DISCORD_VERIFY_MESSAGE_TITLE`, and `DISCORD_VERIFY_MESSAGE_BODY`.
- Optionally set `DISCORD_VERIFICATION_TOKEN_TTL_MINUTES`.
- Set `https://<fitness-domain>/api/discord/interactions` as the Discord Interactions Endpoint URL.
- Run `npm run discord:commands:register`.
- Run `npm run typecheck`.
- Run `npm run lint:ci`.
- Run `node --import ./scripts/register-test-aliases.mjs --test src/lib/discord/*.test.ts`.
- Test token generation while logged in to the Fitness app.
- Test Discord modal verification end to end.
