# Fitness Discord Updates

## Purpose
The Production Update Bot turns Vercel production deployment events into bounded internal drafts, then lets staff publish curated user-facing updates into Discord.

Product rules:
- only Fitness production deployments should create update drafts
- deployment metadata is input, not release copy
- public Discord updates must stay user-facing and curated
- public Discord updates should start with `@everyone`
- do not dump raw commit logs, migration names, PR diffs, stack traces, or infra-only noise
- do not mix routine sharing, workout sharing, import flows, or copy-to-app work into this lane

## Trigger rule
Accepted triggers:
- Vercel `deployment.ready` for the Fitness project in `production`
- Vercel `deployment.succeeded` for the Fitness project in `production`

Ignored:
- preview deployments
- failed or canceled deployments
- non-Fitness project deployments when `VERCEL_PROJECT_ID` is configured

Flow:
1. Vercel sends a production deployment event to `POST /api/vercel/deployment-webhook`.
2. Fitness verifies `x-vercel-signature` before parsing JSON.
3. Fitness normalizes the payload into bounded metadata and upserts `public.discord_update_drafts`.
4. An admin runs `/update-latest`.
5. An admin runs `/update-publish`.
6. Fitness posts curated copy into the Discord updates channel.

## Environment
Required for the webhook:
- `VERCEL_DEPLOYMENT_WEBHOOK_SECRET`

Accepted legacy alias:
- `VERCEL_WEBHOOK_SECRET`

Recommended:
- `VERCEL_PROJECT_ID=prj_rtlFVOMFAWCRoJ3SQjHloi89881K`

Required for publishing:
- `DISCORD_BOT_TOKEN`
- `DISCORD_UPDATES_CHANNEL_ID=1504671871512346695`

Optional rollout flags:
- `DISCORD_UPDATE_BOT_ENABLED=false` by default
- `DISCORD_UPDATE_AUTO_PUBLISH_ENABLED=false` by default

## Database
Drafts are stored in:
- `public.discord_update_drafts`

Storage guardrails:
- store only bounded deployment metadata
- do not store the full raw webhook payload
- do not store secrets
- preserve any curated title, change list, and why-it-matters copy when the same deployment id is delivered again

## Discord command surface
Admin and staff commands:
- `/update-latest`
  - shows the latest production update drafts ephemerally
- `/update-publish`
  - takes `draft_id`
  - opens a modal for `Title`, `What changed`, and `Why it matters`
- `/update-skip`
  - takes `draft_id`
  - optionally stores a skip reason

Existing commands still remain:
- `setup-verify`
- `setup-feedback`
- `feedback`
- `feedback-status`
- `feedback-withdraw`

## Public post format
Published updates should follow:

```txt
@everyone

## Fitness App Update

A new update is live.

**What changed**
- <curated bullet>
- <curated bullet>

**Why it matters**
<curated user-facing sentence>

Open Fitness:
<https://fawxzzy-fitness-local.vercel.app/login>
```

Formatting rules:
- one heading only
- start the public post with `@everyone`
- if the curated title is `Fitness App Update`, do not repeat it in the body
- normalize each non-empty `What changed` line into a single bullet
- suppress Discord link previews for the app URL so the post stays compact

Good copy:
- `Better feedback tools are live`
- `Submit feedback from one panel instead of memorizing commands`
- `Add more details to your own report without starting over`
- `It is easier to send useful bug reports and feature requests from Discord`

Banned copy:
- raw commit messages
- migration filenames
- PR titles or branch names
- stack traces
- env var names
- infra-only churn without user impact

## Webhook setup
Example Vercel CLI command:

```powershell
vercel webhooks create https://fawxzzy-fitness-local.vercel.app/api/vercel/deployment-webhook `
  --event deployment.succeeded `
  --project prj_rtlFVOMFAWCRoJ3SQjHloi89881K
```

After Vercel returns the webhook secret:
1. Save it to `VERCEL_DEPLOYMENT_WEBHOOK_SECRET` in Production.
2. Set `VERCEL_PROJECT_ID=prj_rtlFVOMFAWCRoJ3SQjHloi89881K`.
3. Set `DISCORD_UPDATES_CHANNEL_ID=1504671871512346695`.
4. Redeploy Production.
5. Run `npm run discord:commands:register`.

## Manual publish workflow
1. Redeploy Fitness production.
2. Let the webhook create or refresh the draft.
3. Run `/update-latest`.
4. Run `/update-publish`.
5. Review the Discord post in the updates channel.

## Community doctor
Run:

```txt
npm run doctor:discord-community
```

The doctor is read-only and checks the updates channel, live guild commands, feedback forum tags, member-number health, recent feedback attachment and withdraw state, and recent update-draft health.

Explicitly parked:
- no routine sharing
- no workout sharing
- no copy-to-app imports
- no Discord workout editor

## Rollback and disable
To pause public update posting:
1. unset `DISCORD_UPDATE_BOT_ENABLED`
2. remove the Vercel webhook
3. keep `discord_update_drafts` rows for audit and publish history

## Guardrails
Rule: deployment metadata is input, not user-facing release copy.

Rule: Discord update posts must stay safe for users of any age and background.

Rule: Discord is the community surface; ATLAS remains internal operator truth.

Rule: public release posts should use `@everyone` and suppress embeds while staying curated and user-facing.
