# Fitness Discord Verification

## User flow
1. The user signs into the Fitness app.
2. The user goes to `Settings -> Account -> Discord Connector`.
3. The app generates a short-lived verification token.
4. The user opens the Discord verify modal and pastes the token.
5. Fitness verifies the signed Discord interaction, consumes the token, grants the Discord role, and records the durable link.

## Verify message copy
Default verify message body:

```txt
To unlock the server:

1. Sign into Fawxzzy Fitness.
2. Go to Settings -> Account -> Discord Connector.
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
5. Test `Submit`, `Edit`, and `Withdraw` through a real authenticated Discord member session.
6. Generate a token from `Settings -> Account -> Discord Connector`.
7. Paste the token into the Discord modal.

Live proof note:
- automation QA accounts cannot generate Discord verification tokens
- same-event Discord submit proof needs a non-automation authenticated app session plus a real authenticated Discord member browser context
- do not count bot-only, stale, or panel-only checks as member-submit proof
- local token generation also needs non-empty `DISCORD_VERIFICATION_TOKEN_PEPPER` and `DISCORD_VERIFICATION_BOT_SECRET` in the active local env mirror (`.env.local` or the file selected through `FITNESS_ENV_FILE`)
- when those values are blank locally, refresh the active mirror from the governed root secret lane rather than inventing repo-local replacements; the current governed source is `secrets/local/fawxzzy-fitness-discord-prod.env`
- if the proof path depends on consuming an existing real Discord member browser context from Chrome, the selected Chrome profile also needs the Codex Chrome Extension installed and enabled; token-mint success alone does not prove that member browser context exists
- if the selected Chrome profile is `Default` and the Codex Chrome Extension is neither registered in Chrome preferences nor present under that profile's `Extensions/` directory, treat the blocker as install-required browser-context enablement rather than an app-side or env-side proof defect
- if Chrome is installed, the native host is correct, the selected profile is `Default`, and `Default` still lacks both extension registration and the install directory, treat the next move as explicit manual installation or enablement readiness for the [Codex Chrome Extension](https://chromewebstore.google.com/detail/codex/hehggadaopoacecdllhhajmbjkdcmajg) in `Default` rather than more proof-path probing
- if that manual-install boundary is reached and no smaller local defect remains, stop local repair packets and acknowledge the human-required step explicitly: install or enable the Codex Chrome Extension in `Default`, then reopen proof capture only after evidence shows registration, install-directory presence, and enabled state in that profile
- if the Codex Chrome Extension is installed, registered, and enabled in `Default`, the native host is correct, and the live Codex-to-Chrome bridge still times out in the current session, stop Fitness repo/runtime repair work and classify the blocker as an external/session-scoped bridge issue; only reopen post-install proof capture after a live Chrome runtime call succeeds from the current Codex session

Rule:
- automation QA accounts are not valid Discord verification-token subjects

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
