# Fitness Discord Updates

## Purpose
The Production Update Bot turns Vercel production deployment events into bounded internal drafts, then lets staff publish curated user-facing updates into Discord.

Product rules:
- only Fitness production deployments should create update drafts
- deployment metadata is input, not release copy
- public Discord updates must stay user-facing and curated
- bot-authored public updates should use the embed card format with the green left strip instead of raw plain-message posts
- broad release-summary updates should start with `@everyone`
- do not dump raw commit logs, migration names, PR diffs, stack traces, or infra-only noise
- do not mix routine sharing, workout sharing, import flows, or copy-to-app work into this lane
- do not use the updates channel as a feedback card mutation log
- do not publish a broad release-summary post when the real update is one shipped feedback card with a known report id

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

## Canonical workflow boundary
Canonical workflow:
1. Feedback forum is the visible community board.
2. Feedback card mutations stay inside the forum thread as audit comments.
3. `feedback:board:export` produces reviewed planning artifacts.
4. Verta Core / Playbook reviews those exports before Codex work starts.
5. Update Bot publishes only curated user-facing release notes after work ships.

Rules:
- Feedback card updates do not automatically post to the updates channel.
- Update Bot posts are curated user-facing announcements, not card mutation logs.
- Update drafts are bounded review state, not a duplicate task board.
- No direct Discord-to-ATLAS or Discord-to-GitHub writes from this lane.
- When a shipped feature or bug comes from a specific feedback card, the updates-channel post should use the card-promotion format instead of the broad release-summary format.
- A single shipped item must produce one public updates-channel post, not both formats.

Failure modes:
- posting every feedback status change to `#updates` creates noise
- treating update drafts as a second task board creates drift
- skipping reviewed export/prompt handoff causes lost or noisy work

## Two Update Standards
Use two distinct message types and do not mix them.

Release and update posts:
- are posted by Update Bot into `#updates`
- are used for production deploys or explicit admin publish moments
- use curated user-facing copy
- may use `@everyone` when they are broad release-summary announcements
- must not be used for every feedback card mutation

Feedback audit comments:
- stay inside the feedback thread
- document local card history such as status change, update, withdraw, duplicate fold, or sync
- stay compact and operational
- never use `@everyone`
- never replace the public release post when a real shipped update should be announced

Rule:
- Release posts announce shipped user-facing changes.
- Feedback audit comments document card history.

Failure mode:
- posting every feedback mutation to `#updates` creates noise, while silent card edits make the board hard to trust

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
Bot-authored updates should be published as a Discord embed card with the green left strip. Use raw plain-message posts only for manual emergency cleanup, not the normal workflow.

Low-noise checkpoint and shipped-update posts should follow this embed shape:

```txt
Embed title:
Fitness App Update

Embed color:
green left strip

Embed description:
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
- title belongs in the embed title, not as a repeated markdown heading in message content
- use the green left-strip embed card for bot-authored public updates
- if the curated title is `Fitness App Update`, do not repeat it in the body
- normalize each non-empty `What changed` line into a single bullet
- when owner-triggered update posts use top-level section headers such as `What changed:`, `Current markers:`, `Why it matters:`, `The post now includes:`, or `Report ID:`, preserve them as embed fields instead of collapsing everything into one paragraph
- keep the raw message content empty for low-noise posts unless an explicit loud ping is approved
- if a broad release-summary really needs `@everyone`, put the mention in the message content above the embed card only when explicitly approved

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

Rule: bot-authored public release posts should use the green-strip embed card format by default.

Rule: `@everyone` is opt-in for broad release-summary announcements, not the default for every published update draft.

## Feedback Card Promotion Format
When a specific feedback card is shipped and promoted into `#updates`, use this format instead of the broad `@everyone` release-summary template:

```txt
Update: Feature: Security - Mod Bot Alerts + Verification Controls has been completed and cleaned up.

The post now includes:
the live Fawx Security moderation scope with notices, warnings, and reversible Purgatory
release and restore behavior instead of default bans
verification and moderator control coverage for the Discord launch lane
acceptance criteria proven through live non-owner canary tests

Report ID: `e634e393`
```

Card-promotion rules:
- do not prepend `@everyone`
- start with `Update: <forum title-ish summary>`
- use `The post now includes:`
- keep the body as short flat lines, not nested bullets or changelog spam
- end with `Report ID: \`<short id>\``
- use this format for shipped-card promotion in `#updates`
- do not use this format for thread audit comments inside the feedback card
- do not also publish a broad `@everyone` release-summary post for the same shipped card unless the user explicitly wants a second, separate aggregate release note
