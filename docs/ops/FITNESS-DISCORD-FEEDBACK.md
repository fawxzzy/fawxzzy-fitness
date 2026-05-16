# Fitness Discord Feedback

## Purpose
Feedback Bot lets Discord users send bounded feedback into the Fitness-hosted Discord interactions endpoint. The visible board is the Feedback forum; the bounded index is Supabase.

Product decisions:
- Feedback forum is the visible board.
- Supabase remains the bounded searchable index.
- Forum tags are display state, not source of truth.
- Playbook, ATLAS, and GitHub promotion remain reviewed and manual.

## Storage policy
Feedback reports are bounded structured signals, not blob storage.

Allowed:
- short summary
- short area
- normalized severity
- bounded details
- bounded steps or request context
- optional external screenshot or reference URL
- linked Fitness reporter snapshot when available
- duplicate fingerprint and queue metadata
- forum thread metadata and status sync metadata

Not allowed:
- screenshot binaries
- uploaded files
- raw Discord interaction payloads
- message dumps
- browser logs
- full Discord profiles
- automatic ATLAS commits
- automatic GitHub issues

## Command surface
- `/feedback` is the main command.
- `/feedback` requires `type` with choices `Bug`, `Feat`, or `Fix`.
- `/feedback-status` is the staff status command.
- `/feedback-withdraw` lets the original reporter or staff withdraw and redact details without raw deletion.
- `/feedback-withdraw` accepts a full Report ID, a 6+ character short ID, a forum thread ID, or a forum thread URL.
- `/setup-verify` remains unchanged.

## User flow
1. A user runs `/feedback` and chooses `Bug`, `Feat`, or `Fix`.
2. Fitness receives the signed interaction at `POST /api/discord/interactions`.
3. Fitness returns a typed feedback modal.
4. The user submits the bounded fields.
5. Fitness normalizes the report, rate-limits basic spam, resolves any linked member snapshot, and writes `public.discord_feedback_reports`.
6. Fitness creates a Feedback forum thread for a new unique report when the forum env is configured.
7. Fitness folds likely duplicates into the existing active queue row and existing forum thread instead of storing a second full report.
8. Staff can update queue status with `/feedback-status`.
9. The original reporter or staff can use `/feedback-withdraw` to redact details while preserving small audit metadata.
10. Threads marked `duplicate` or `withdrawn` are archived and locked after the forum post and tag state are synced.
11. Operators export and triage the queue later.

## Staff flow
1. Create the forum tags in the Feedback forum channel.
2. Register commands with `npm run discord:commands:register`.
3. Set `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID=1504673475489562744`.
4. Keep verification copy aligned with `Settings -> Account -> Discord Access` and rerun `/setup-verify` after copy changes.
5. Review queue rows in Supabase or export them with `npm run discord:feedback:export`.
6. Use `/feedback-status` to keep Supabase and the forum thread in sync.
7. Use `/feedback-withdraw` only when the reporter or staff intentionally withdraws details.
8. Promote reviewed reports into Playbook, ATLAS, or GitHub only after triage.

## Modal fields
- `Summary`
- `Area`
- `Severity`
- `What happened?` or `What do you want?`
- `Steps / link`

## Supabase table
Active table: `public.discord_feedback_reports`

Stored fields include:
- queue state: `report_type`, `status`, `source`, `severity`, `duplicate_fingerprint`, `duplicate_count`
- report content: `area`, `summary`, `details`, `steps_to_reproduce`, `screenshot_url`
- reporter snapshot: `reporter_discord_user_id`, `reporter_discord_username`, `reporter_fitness_user_id`, `reporter_member_number`, `reporter_user_kind`
- forum sync: `discord_forum_channel_id`, `discord_forum_thread_id`, `discord_forum_message_id`, `discord_forum_applied_tag_ids`, `discord_forum_title`, `reporter_mentioned_at`
- operator breadcrumbs: `discord_interaction_id`, `status_updated_at`, `status_updated_by_discord_user_id`, `status_note`, `triage_notes`
- timestamps: `first_seen_at`, `last_seen_at`, `created_at`, `updated_at`, `closed_at`, `pruned_at`

Bounded fields:
- `summary`: 1-120 chars
- `area`: up to 80 chars
- `details`: up to 1200 chars
- `steps_to_reproduce`: up to 1200 chars
- `screenshot_url`: up to 500 chars, external URL only
- `discord_forum_title`: up to 100 chars
- `status_note`: up to 1000 chars

No file or image binaries are stored. Screenshots remain links only.

Security:
- RLS is enabled.
- This feature adds no broad client policies.
- Reports are intended for server and admin access only.

## Environment variables
- `DISCORD_PUBLIC_KEY`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DISCORD_MEMBER_SYNC_SECRET`
- `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID`

Current production value:
- `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID=1504673475489562744`

## Feedback forum board
If `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID` is set, Fitness creates a forum thread with:
- title format: `Bug: <Area> - <Summary>`, `Feat: <Area> - <Summary>`, or `Fix: <Area> - <Summary>`
- type tag: `Bug`, `Feat`, or `Fix`
- status tag: `New`
- severity tag when present: `Low`, `Medium`, `High`, or `Blocker`
- a compact first post body with status, type, severity, area, reporter mention, short report id, summary, details, steps, and screenshot URL link only

Manual forum tags to create:

Type tags:
- `Bug`
- `Feat`
- `Fix`

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

The bot resolves tag ids by tag name at runtime. It does not hardcode tag ids. Missing tags are logged safely and the post still goes through.

## Member number display and sync
- Discord nicknames use the display format `username · N`.
- Existing old-style `#N · username` prefixes and stale `username · oldN` suffixes are stripped before applying the current number.
- Delete-driven member-number compaction refreshes linked `discord_member_links` snapshots and marks those rows as `needs_sync`.
- Discord API side effects run through the protected sync path, not from SQL triggers.
- Manual sync options:
  - `POST /api/discord/member-numbers/sync` with `x-discord-member-sync-secret`
  - `npm run sync:discord-member-numbers -- --dry-run`

## Title standard
- `Bug: Area - Summary`
- `Feat: Area - Summary`
- `Fix: Area - Summary`

Rules:
- no raw Discord ids in titles
- no reporter names in titles
- area fallback is `General`
- titles stay bounded and readable

## Reporter mention policy
- The first forum post mentions the reporter once with `<@discordUserId>`.
- The mention is guarded with `allowed_mentions` limited to that reporter id.
- User-generated text never controls mentions.
- Duplicate replies do not ping the reporter.
- `/feedback-status` only pings the reporter for `needs_info`, `fixed`, and `closed`.
- `/feedback-withdraw` keeps the thread reply compact and does not give normal users raw-delete behavior.

## Duplicate folding
Fitness builds a deterministic duplicate fingerprint from normalized `report_type + area + summary`, then compares recent active candidates using normalized area, summary, and details tokens before storing a second full row.

- Active duplicate window: 30 days
- Duplicate statuses checked: `new`, `needs_info`, `confirmed`, `in_progress`, `fixed`
- Duplicate matching is deterministic and auditable, not embedding-based:
  - contractions and common failure phrasing normalize into the same token set
  - area, summary, and short details overlap are compared
  - near-identical wording such as `didn't copy` and `did not copy` folds into one queue record
- If a match exists, Fitness increments `duplicate_count` and updates `last_seen_at`
- Duplicate submissions do not store another full details row or create another forum thread
- The existing forum thread receives a compact duplicate reply
- The user still receives a confirmation response

## Rate limit
Fitness counts reports from the same `reporter_discord_user_id` in the last 10 minutes.

- Allowed: up to 2 recent reports, then the third insert still succeeds
- Blocked: 3 or more reports already recorded in the last 10 minutes
- User response: `You have submitted several reports recently. Please wait a few minutes before sending another.`

## `/feedback-status`
Usage:

```txt
/feedback-status report_id status note
```

Allowed statuses:
- `new`
- `needs_info`
- `confirmed`
- `in_progress`
- `fixed`
- `closed`
- `duplicate`
- `spam`
- `withdrawn`

Behavior:
- staff-only permission gate: Administrator, Manage Guild, Manage Threads, or Manage Messages
- updates Supabase `status`, `status_updated_at`, `status_updated_by_discord_user_id`, and `status_note`
- updates the forum thread title and applied tags when the thread exists
- adds a compact status reply in the thread
- pings the reporter only for `needs_info`, `fixed`, and `closed`

## `/feedback-withdraw`
Usage:

```txt
/feedback-withdraw report_id
```

Behavior:
- allowed for the original reporter or staff with the same moderation permissions as `/feedback-status`
- accepts the full UUID, a 6+ char short id, the Discord forum thread id, or the forum thread URL
- updates Supabase status to `withdrawn`
- redacts `details`, `steps_to_reproduce`, and `screenshot_url`
- keeps a small audit record and duplicate history
- updates forum tags to `Withdrawn` while keeping type and severity when available
- edits the original forum post into a withdrawn or redacted state
- adds a compact thread reply instead of hard-deleting the forum post
- archives the thread after sync so the forum board behaves like a closed post without destroying history

Rule:
- user-facing delete means withdraw and redact by default, not destructive history loss

## Export flow
Primary command:

```bash
npm run discord:feedback:export
```

Legacy alias:

```bash
npm run discord:bugs:export
```

Supported options:
- `--status new`
- `--limit 25`
- `--json`
- `--markdown`
- `--out <path>`
- `--debug`

Default output:
- `runtime/discord-feedback/latest.md`

The export is read-only, defaults to a gitignored runtime path, masks Discord user ids unless `--debug` is passed, and produces a reviewable operator artifact for Playbook or ATLAS triage.

## Retention and prune policy
Primary command:

```bash
npm run discord:feedback:prune
```

Legacy alias:

```bash
npm run discord:bugs:prune
```

Behavior:
- dry-run by default
- requires `--apply` to delete rows
- default targets only `spam`, `duplicate`, and `closed`
- default age thresholds:
  - `spam`: older than 7 days
  - `duplicate`: older than 30 days
  - `closed`: older than 90 days
- `new`, `needs_info`, `confirmed`, `in_progress`, and `fixed` are never pruned by default

## Rollout order
Current production-safe paths:
- preferred from a clean production state with none of the feedback migrations applied: apply `059`
- compatible historical path: apply `057`, then `058`, then `059`
- do not stop after `057` alone once production code expects `public.discord_feedback_reports`

Then:
1. Make sure the Feedback forum has the required tags.
2. Register commands with `npm run discord:commands:register`.
3. Rerun `/setup-verify` if verify-message copy changed.
4. Test `/feedback`.
5. Test a duplicate `/feedback`.
6. Test `/feedback-status`.
7. Test `/feedback-withdraw` with the forum thread URL.

## Guardrails
Rule: feedback reports are input signals, not repo truth.

Rule: forum tags are display state; Supabase remains the bounded index.

Pattern:
- Discord `/feedback` modal
- bounded Supabase queue row
- Feedback forum thread
- duplicate folding
- `/feedback-status` sync
- `/feedback-withdraw` redact flow
- export and prune
- reviewed triage
- reviewed Playbook note, issue, or Codex task later

Failure mode:
- Unbounded text, files, raw payloads, or direct repo writes turn intake into storage abuse.
- Raw user deletion breaks duplicate tracking and makes triage history unreliable.
- Manual-only forum tags drift from the review queue and make exports unreliable.
- Exact-string-only duplicate matching misses obvious repeats and leaves the Feedback forum noisy.

## Next step
Future extensions can reuse the same queue shape without changing the core flow:
- `/feedback type:feat` already maps to `report_type = feat`
- `/feedback type:fix` already maps to `report_type = fix`
