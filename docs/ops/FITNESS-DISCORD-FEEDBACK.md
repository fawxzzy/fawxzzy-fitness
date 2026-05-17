# Fitness Discord Feedback

## Purpose
Feedback Bot captures bounded Discord feedback in `public.discord_feedback_reports` and mirrors unique reports into the Feedback forum for review.

Product rules:
- Feedback types are `Bug` and `Feature`.
- Bug and Feature forum cards should use type-aware display labels even when they share the same bounded storage row.
- `Fix` is not a valid new submission type.
- Historical `fix` rows may remain readable and exportable.
- The Feedback forum is a display surface; Supabase is the source of truth.
- Normal users should use persistent buttons and modals, not admin-style slash command choices.
- The primary user entry should be a dedicated text channel such as `submit-feedback`, not a control post inside the forum itself.
- Feedback submit should defer the interaction before heavy Discord or DB work.
- Feedback intake success depends on the bounded report row first and the forum thread second.
- Discord hosts screenshot evidence; Supabase stores bounded attachment metadata only.
- Optional Discord decoration must fail soft.
- Feedback card mutations stay inside the Feedback forum thread as audit comments, not release posts.

## Command surface
- `/setup-feedback`
  - admin-only
  - posts or refreshes the persistent `Submit Feedback Here` launcher
  - reuses `DISCORD_FEEDBACK_PANEL_CHANNEL_ID` when configured
  - otherwise finds or creates `submit-feedback` above the Feedback forum
- `/setup-verify`
  - admin-only
  - posts or refreshes the verification panel
- `/feedback`
  - slash fallback for the same general submit modal
  - hidden from normal users; the panel buttons are the primary user UX
  - does not require a type option up front
- `/feedback-status`
  - staff-only
  - status sync only
- `/feedback-withdraw`
  - hidden from normal users
  - reporter or staff fallback
  - redact, prune, and remove the Discord-visible thread while keeping a bounded audit row

Feedback-facing commands should remain:
- `setup-verify`
- `setup-feedback`
- `feedback`
- `feedback-status`
- `feedback-withdraw`

Separate production-update staff commands may also exist:
- `update-latest`
- `update-publish`
- `update-skip`

## Canonical workflow
Workflow:
1. User submits a feedback card.
2. Fawx Security creates or updates the forum card.
3. Every post-creation mutation gets a thread-visible audit comment.
4. `feedback:board:export` writes reviewed Markdown/JSON artifacts.
5. Verta Core / Playbook reviews the export.
6. Codex work begins only from reviewed prompts or tasks.
7. Work ships.
8. `/feedback-status` marks the card `Fixed` or `Completed`.
9. Update Bot may publish a curated release post only when the change is user-facing.

Rules:
- Feedback card updates do not automatically post to the updates channel.
- Forum card mutations should stay in the thread as compact audit comments.
- Exports are review input, not automatic truth.
- No direct Discord-to-ATLAS or Discord-to-GitHub writes.
- No routine or workout sharing work in this lane.

Failure modes:
- posting every card mutation to `#updates` creates noise
- writing every raw card into ATLAS creates duplicate task truth
- starting Codex work from unreviewed forum cards creates noisy sprint churn
- creating parallel task copies outside the board/export path causes lost tasks

## User flow
1. An admin runs `/setup-feedback`.
2. Fitness creates or updates a dedicated launcher message in `submit-feedback`.
3. A user clicks `Submit`.
4. Fitness opens one general modal.
5. The modal collects `Feedback type` inside the flow.
6. Fitness defers the interaction ephemerally before heavy DB or forum work.
7. Fitness stores a bounded report row and, when configured, creates or updates the matching forum thread.
8. Fitness edits the original ephemeral response with the final success or failure result.

Pattern:
- dedicated submit-feedback launcher
- general submit button
- modal with type choice
- deferred response
- bounded row
- forum thread and tags

## Submit modal
The submit flow should ask for type inside the modal, not in the slash command picker.

Current user-facing types:
- `Bug`
- `Feature`

If Discord modal select or radio components are not used, the text field should accept only:
- `Bug`
- `Feature`

Invalid values should respond with:

```txt
Choose Bug or Feature for the feedback type.
```

The submit modal also supports optional image evidence:
- up to 3 files
- `image/png`
- `image/jpeg`
- `image/webp`
- `image/gif`
- max 8 MB each

Attachment guardrails:
- Discord remains the file host
- Supabase stores bounded metadata only
- no raw file bytes are stored
- no raw Discord interaction payload is stored

Stored attachment metadata should stay bounded to:
- Discord attachment id
- filename
- content type
- size
- Discord URL fields when present

## Launcher placement
- Preferred env: `DISCORD_FEEDBACK_PANEL_CHANNEL_ID`
- Fallback env: `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID`

`/setup-feedback` is idempotent:
- if an existing bot-authored feedback launcher is found, edit it
- if a configured launcher channel exists, reuse it
- otherwise, create or reuse `submit-feedback` as a normal text channel above the Feedback forum
- if the launcher message is missing or deleted, create a new one

If panel creation fails with Discord `50013 Missing Permissions`, the admin response should mention:
- `View Channel`
- `Read Message History`
- `Send Messages`
- `Manage Channels` when auto-creating `submit-feedback`
- `Embed Links` optional
- `Use External Emojis` optional

## Environment
- `DISCORD_PUBLIC_KEY`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DISCORD_MEMBER_SYNC_SECRET`
- `DISCORD_FEEDBACK_PANEL_CHANNEL_ID` optional
- `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID`
- `DISCORD_FEEDBACK_BUG_EMOJI_ID` optional
- `DISCORD_FEEDBACK_FEATURE_EMOJI_ID` optional
- `DISCORD_EMOJI_MODE` optional
  - `application` default for bot-owned UI emoji
  - `guild` when server-owned community emoji are intentionally preferred

Known production values:
- `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID=1504673475489562744`
- `DISCORD_FEEDBACK_BUG_EMOJI_ID=1505007702924066916`
- `DISCORD_FEEDBACK_FEATURE_EMOJI_ID=1505007651308703877`

## Emoji bootstrap
Run:

```txt
npm run discord:emoji:bootstrap
```

Bootstrap rules:
- dry-run by default
- use `--apply` to create missing Discord emoji resources
- use `--replace` only when intentionally deleting and recreating existing named emojis
- use `--mode application` for bot-owned UI emoji
- use `--mode guild` only when server-owned emoji are intentionally needed
- use `--write-env-template` to write suggested env vars into `tmp/discord-emoji-bootstrap.env`

Asset source:
- `assets/discord-emojis/Bug.png`
- `assets/discord-emojis/Feature.png`
- `assets/discord-emojis/FawxzzyLogo.png`
- `assets/discord-emojis/FawxzzyLogoWhite.png`

Resource rule:
- a Discord attachment is not a custom emoji resource
- bootstrap must upload a real application emoji or guild emoji before the ID can be used safely in Discord component payloads
- if emoji bootstrap fails, feedback must remain fully usable with text-only labels and forum tags

## Feedback forum board
When `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID` is set, unique reports create a forum thread with:
- title format: `Bug: <Area> — <Summary>` or `Feature: <Area> — <Summary>`
- type tag: `Bug` or `Feature`
- status tag: `New`
- severity tag: `Low`, `Medium`, `High`, or `Blocker`

Starter post formatting:
- Bug cards show `Title`, `What happened`, `Steps`, `Link / screenshot`, and `Attachments`
- Feature cards show `Title`, `Description`, `Link / screenshot`, and `Attachments`
- Feature cards do not show `Severity`
- Feature cards do not show `What happened`
- Feature cards do not show `Steps`
- Feature cards display `Completed` when the stored status is `fixed`

Do not use custom emoji in the forum thread title. Keep titles text-only and searchable.
- Forum tags and text prefixes are the reliable visual system.
- Custom emoji env vars are optional display config only and must never be required for feedback intake.
- Fitness should validate custom Bug and Feature emoji against the configured application emoji set first, then the configured guild as a fallback.
- If validation fails, the flow must fall back to text-only surfaces without blocking intake.

Attachment handling:
- accepted images may be referenced in the forum body so staff can review them in Discord
- the forum starter post should include a visible `Attachments` section with file links when uploads are present
- attachment links from the modal resolution path should be treated as Discord-hosted evidence, not durable app storage
- v1 uses Discord attachment URLs as visible evidence links and does not re-upload files into the forum thread as a persistence layer
- withdraw should clear or minimize stored attachment metadata and mark the report as attachment-pruned

Allowed mentions:
- restrict mentions to the reporter only when explicitly intended
- user text must never be allowed to ping `@everyone`, `@here`, or roles

## Forum tags
Create or keep these tags:

Type tags:
- `Bug`
- `Feature`

Status tags:
- `New`
- `Needs Info`
- `Confirmed`
- `In Progress`
- `Fixed`
- `Closed`
- `Duplicate`
- `Spam`
- `Withdrawn`

Severity tags:
- `Low`
- `Medium`
- `High`
- `Blocker`

If the forum still has old tags:
- rename `Feat` to `Feature`
- stop using `Fix` for new reports

## Reporter update path
`Update Feedback` is not a status command.

It should:
- allow the original reporter or staff
- resolve by full UUID, short id, thread id, or thread URL
- open from `Edit My Feedback`
- let the user choose a card first, then choose `Edit Card` or `Withdraw`
- update bounded metadata such as `status_note` and `last_seen_at`
- not change report status

## Status flow
`/feedback-status` should:
- resolve by full UUID, short id, thread id, or thread URL
- work for both `Bug` and `Feature`
- update Supabase status
- sync forum tags and title
- patch the forum starter post so the visible status and type-aware formatting stay current
- post a compact status reply
- mention the reporter only for `Needs Info`, `Fixed`, or `Closed`
- add a `✅` reaction when status becomes `Fixed` or `Closed`

Display rule:
- bug cards show stored `fixed` as `Fixed`
- feature cards show stored `fixed` as `Completed`

Resolved reaction behavior:
- preferred target: the forum starter message when `discord_forum_message_id` exists
- fallback target: the bot status reply in the thread
- reaction failures should log a safe warning and must not fail the status update

## Feedback card audit comments
Fawx Security posts a compact thread comment whenever it modifies a feedback card after creation. This keeps the Feedback forum readable as a lightweight board with visible change history.

Actions that comment:
- status update
- withdraw
- reporter update
- duplicate signal
- board/card sync
- resolved state

Audit comment rules:
- compact only
- no raw payloads
- no secrets
- no broad mentions
- reporter mentions only when the action explicitly requires it

Withdraw note:
- withdraw posts the audit comment before the thread is archived and locked
- archive/lock behavior may reduce later visibility, but the bounded row and status note remain

## Withdraw flow
`/feedback-withdraw` and the withdraw modal should:
- allow the original reporter or staff
- resolve by full UUID, short id, thread id, or thread URL
- remain a fallback path; the main user flow reaches withdraw from `Edit My Feedback`
- redact `details`, `steps_to_reproduce`, and `screenshot_url`
- clear or minimize stored attachment metadata
- mark the report as attachment-pruned
- set status to `withdrawn`
- update forum tags to `Withdrawn`
- delete the Discord thread after the bounded row is updated
- keep a small audit record
- not raw-delete the review history

## Verification copy dependency
Keep verification instructions aligned with:

```txt
Go to Settings → Account → Discord Connector.
```

After verify-copy changes, rerun:
- `/setup-verify`

## Operator checklist
1. Make sure the Feedback forum has the required tags.
2. Register commands with `npm run discord:commands:register`.
3. Set the forum and optional panel env vars.
4. Run `/setup-feedback`.
5. Pin the panel if needed.
6. Run `npm run discord:emoji:bootstrap -- --apply --write-env-template` if bot-owned emoji should be available.
7. Test `Submit Feedback` with both `Bug` and `Feature`.
8. Test duplicate folding.
9. Test `Update Feedback`.
10. Test `/feedback-status`.
11. Test `Withdraw Feedback`.
12. Test image upload with a small PNG or JPG.
13. Confirm the user receives one final success message after the deferred response completes.

## Forum starter sync
Run:

```txt
npm run feedback:sync-forum-posts
```

Sync script rules:
- dry-run by default
- use `--apply` to edit Discord
- use `--no-audit-comment` to skip thread audit comments during apply mode
- supports `--limit 50`
- supports `--status new,confirmed,in_progress,fixed,closed`
- supports `--report-id <id>`
- skips rows that do not have `discord_forum_message_id`
- never deletes anything

## Community doctor
Run:

```txt
npm run doctor:discord-community
```

The doctor is read-only and checks:
- env presence without printing values
- live Discord command registration
- feedback forum tags
- verify message and feedback panel presence
- member-number health
- recent feedback attachment and withdraw-pruning health

Warnings mean optional or recoverable drift. Failures mean missing env, schema, or command-surface problems that should be fixed before shipping more Discord changes.

## Explicitly parked
- no routine sharing
- no workout sharing
- no copy-to-app imports
- no Discord workout editor

## Guardrails
Rule: feedback reports are bounded input signals, not repo truth.

Rule: admin setup commands are not normal-user UX.

Rule: feedback attachments are Discord-hosted evidence, not app database blobs.

Rule: feedback submit should defer first and edit the original ephemeral response after processing.

Rule: optional Discord decoration must not break core feedback intake.

Failure modes:
- making users choose too many slash-command variants
- storing unbounded payloads
- allowing raw delete instead of withdraw and redact
- letting forum tags drift away from the bounded queue
- showing a failure after a valid report row or forum post already exists
