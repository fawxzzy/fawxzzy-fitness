# Fitness Discord Verification

## User flow
1. The user signs into the Fitness app.
2. The user opens `Settings -> Account -> Discord Access -> Generate token`.
3. The app calls `POST /api/discord/verification-token`.
4. The app shows the raw token once.
5. The user pastes the token into Discord.
6. The Discord bot calls `POST /api/discord/verify`.
7. The bot grants the Discord role after a successful response.

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

## Required environment variables
- `SUPABASE_SERVICE_ROLE_KEY`
- `DISCORD_VERIFICATION_BOT_SECRET`
- `DISCORD_VERIFICATION_TOKEN_PEPPER`
- `DISCORD_VERIFICATION_TOKEN_TTL_MINUTES` (optional, defaults to 15)

## Security notes
- Raw verification tokens are never stored in the database.
- Email-only verification is intentionally not supported.
- The bot verification endpoint is protected by a shared secret header.
- Verification tokens are single-use.
- Verification tokens expire quickly.

## User path
- `Settings -> Account -> Discord Access -> Generate token`

## Deployment checklist
- Apply the Supabase migration for `discord_verification_tokens`.
- Add `SUPABASE_SERVICE_ROLE_KEY`, `DISCORD_VERIFICATION_BOT_SECRET`, and `DISCORD_VERIFICATION_TOKEN_PEPPER` in Vercel.
- Optionally set `DISCORD_VERIFICATION_TOKEN_TTL_MINUTES`.
- Run `npm run typecheck`.
- Run `npm run lint:ci`.
- Run `node --test src/lib/discord-verification.test.ts`.
- Test token generation while logged in to the Fitness app.
- Test bot verification with `curl` or Postman using `x-discord-verification-secret`.
