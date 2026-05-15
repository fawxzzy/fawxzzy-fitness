# Fitness Discord Bug Reports

## Purpose
`/bug` lets Discord users submit structured Fitness app bug reports through the Fitness-hosted Discord interactions endpoint. Reports enter a governed Supabase review queue first. They do not write directly into ATLAS, GitHub issues, or repo state.

Product decision:
- Feedback forum is the visible human bug board.
- Supabase remains the small structured index.
- Discord is not the only source of truth.
- ATLAS and GitHub promotion remain reviewed/manual only.

## Storage policy
Bug reports are bounded structured signals, not blob storage.

Allowed:
- short summary
- short area
- normalized severity
- bounded details
- bounded reproduction steps
- optional external screenshot URL
- linked Fitness reporter snapshot when available
- duplicate fingerprint and queue metadata

Not allowed:
- screenshot binaries
- uploaded files
- raw Discord interaction payloads
- message dumps
- browser logs
- full Discord profiles
- automatic ATLAS commits
- automatic GitHub issues

## User flow
1. A user runs `/bug` in the configured Discord server.
2. Fitness receives the signed interaction at `POST /api/discord/interactions`.
3. Fitness returns the `fitness_bug_report_modal` modal.
4. The user submits the modal fields.
5. Fitness normalizes the report, rate-limits basic spam, resolves any linked member snapshot, and writes `public.discord_bug_reports`.
6. Fitness creates a Feedback forum post for a new unique bug when the forum env is configured.
7. Fitness folds likely duplicates into an existing active queue row and existing forum thread instead of storing a second full report.
8. Operators export and triage the queue later.

## Staff flow
1. Register commands with `npm run discord:commands:register`.
2. Set `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID=1504673475489562744`.
3. Review queue rows in Supabase or export them with `npm run discord:bugs:export`.
4. Use the Feedback forum as the visible board.
5. Promote reviewed reports into Playbook, ATLAS, or GitHub only after triage.

## Discord command surface
- `/bug` opens the bug report modal.
- `/setup-verify` remains the verification setup command and is unchanged by this feature.

## Modal fields
- `Summary`
- `Area`
- `Severity`
- `What happened?`
- `Steps / screenshot link`

## Supabase table
Table: `public.discord_bug_reports`

Stored fields include:
- queue state: `status`, `source`, `severity`, `duplicate_fingerprint`, `duplicate_count`
- report content: `area`, `summary`, `details`, `steps_to_reproduce`, `screenshot_url`
- reporter snapshot: `reporter_discord_user_id`, `reporter_discord_username`, `reporter_fitness_user_id`, `reporter_member_number`, `reporter_user_kind`
- operator breadcrumbs: `discord_interaction_id`, `discord_forum_channel_id`, `discord_forum_thread_id`, `discord_forum_message_id`, `triage_notes`
- timestamps: `first_seen_at`, `last_seen_at`, `created_at`, `updated_at`

Bounded fields:
- `summary`: 1-120 chars
- `area`: up to 80 chars
- `details`: up to 1200 chars
- `steps_to_reproduce`: up to 1200 chars
- `screenshot_url`: up to 500 chars, external URL only

No file or image binaries are stored. Screenshots must remain links.

Security:
- RLS is enabled.
- This PR adds no broad client policies.
- Reports are intended for server/admin access only.

## Environment variables
- `DISCORD_PUBLIC_KEY`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID`

Production value:
- `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID=1504673475489562744`

## Feedback forum board
If `DISCORD_BUG_REPORT_FORUM_CHANNEL_ID` is set, Fitness creates a forum thread with:
- title format: `[Bug][<Severity>] <Area> — <Summary>`
- a compact first post body with status, severity, area, reporter label, short report id, summary, details, steps, and screenshot URL link only

Duplicate signals do not create a second thread:
- the existing row increments `duplicate_count`
- `last_seen_at` updates
- the existing forum thread receives a compact reply

Discord tags are visual-only in v1 unless a future sync command updates Supabase.

## Duplicate folding
Fitness builds a duplicate fingerprint from normalized `area + summary`.

- Active duplicate window: 30 days
- Duplicate statuses checked: `new`, `triaged`, `accepted`
- If a match exists, Fitness increments `duplicate_count` and updates `last_seen_at`
- Duplicate submissions do not store another full details row or create another forum thread
- The user still receives a confirmation response

## Rate limit
Fitness counts reports from the same `reporter_discord_user_id` in the last 10 minutes.

- Allowed: up to 2 recent reports, then the third insert still succeeds.
- Blocked: 3 or more reports already recorded in the last 10 minutes.
- User response: `You have submitted several reports recently. Please wait a few minutes before sending another.`

## Export flow
Command:

```bash
npm run discord:bugs:export
```

Supported options:
- `--status new`
- `--limit 25`
- `--json`
- `--markdown`
- `--out <path>`

Default output:
- `runtime/discord-bug-reports/latest.md`

The export is read-only, defaults to a gitignored runtime path, masks Discord user ids unless `--debug` is passed, and produces a reviewable operator artifact for Playbook or ATLAS triage.

## Retention and prune policy
Prune command:

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
- `new`, `triaged`, and `accepted` are never pruned by default

## Guardrail
Rule: bug reports are input signals, not repo truth.

Pattern:
- Discord `/bug` modal
- bounded Supabase queue
- Feedback forum thread
- duplicate folding
- export/prune
- reviewed triage
- reviewed Playbook note, issue, or Codex task later

Failure mode:
- Unbounded text, files, raw payloads, or direct repo writes turn bug intake into storage abuse.

## Next step
Future staff command:

```txt
/bug-status report_id status
```

That command should update Supabase status and optionally update the forum thread title or tags.
