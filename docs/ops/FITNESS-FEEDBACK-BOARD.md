# Fitness Feedback Board

## Board model
Use the Discord Feedback forum as the visible community board.

Product model:
- Discord Feedback Forum = user-visible board
- Supabase = bounded source index
- Codex = implementation worker after human review
- Playbook = pattern and governance layer
- ATLAS = durable internal project memory

Rule:
- Discord board state is operational signal, not engineering truth by itself.

Pattern:
- feedback card -> status tags -> board export -> reviewed Codex task or Playbook triage artifact

Failure mode:
- treating every forum card like automatic repo truth creates noisy sprint churn

## Story-card structure
Feedback cards should read like lightweight story cards, not raw engineering tickets.

Bug cards should surface:
- Title
- Problem
- Expected behavior
- Actual behavior
- Steps to reproduce
- Acceptance Criteria
- Evidence

Feature cards should surface:
- Title
- User Story
- Description
- Acceptance Criteria
- Evidence

Rule:
- feedback cards should be professional and structured, but still user-facing

Pattern:
- feedback row -> type-aware story card -> reviewed task packet -> Codex prompt

Failure mode:
- unstructured cards slow triage
- overly technical cards make the public board feel unfriendly

## Canonical workflow
Canonical workflow:
1. Feedback forum is the visible community board.
2. Supabase `discord_feedback_reports` is the bounded index.
3. Fawx Security owns card state changes in Discord.
4. Every post-creation mutation gets a thread-visible audit comment.
5. `feedback:board:export` creates reviewed Markdown/JSON artifacts.
6. Verta Core / Playbook consumes exports as planning input.
7. Codex work starts only from reviewed prompts or tasks.
8. Update Bot posts to the updates channel only for curated user-facing release notes.
9. ATLAS receives durable reviewed summaries, not every raw card.

Rules:
- Feedback card updates do not automatically post to the updates channel.
- Update Bot posts are curated user-facing announcements, not card mutation logs.
- Verta Core / Playbook exports are review input, not automatic truth.
- No direct Discord-to-ATLAS or Discord-to-GitHub writes.
- No routine or workout sharing work in this lane.

Failure modes:
- posting every feedback card update to `#updates` creates noise
- writing every card to ATLAS creates duplicate task truth
- running Codex directly from unreviewed forum cards creates noisy sprint churn
- keeping separate task copies outside the board/export path causes lost tasks

## Release Posts vs Card History
Release and update posts:
- belong in `#updates`
- announce shipped user-facing changes
- stay curated and public-facing
- must not be used as the board's mutation log

Feedback audit comments:
- belong in the feedback thread
- preserve the card's visible history
- document status changes, updates, withdraws, duplicate folds, and sync actions
- stay compact and operational

Rule:
- Release posts announce shipped user-facing changes.
- Feedback audit comments document card history.

## Status model
Statuses remain stable in storage:
- `new`
- `needs_info`
- `confirmed`
- `in_progress`
- `fixed`
- `closed`
- `duplicate`
- `withdrawn`
- `spam`

User-facing board meaning:
- `New`: Fresh report, not reviewed.
- `Needs Info`: Reporter needs to clarify.
- `Confirmed`: Valid and ready for planning.
- `In Progress`: Actively being worked.
- `Fixed`: Bug resolved.
- `Completed`: Feature completed. This is the display label for feature cards when stored status is `fixed`.
- `Closed`: Done, obsolete, or intentionally not pursuing.
- `Duplicate`: Folded into another card.
- `Withdrawn`: Reporter withdrew details.
- `Spam`: Invalid or junk.

Lifecycle:
- Bug: `New -> Confirmed -> In Progress -> Fixed/Closed`
- Feature: `New -> Confirmed -> In Progress -> Completed/Closed`

## Command surface
User-facing flow:
- `/feedback`
- feedback panel `Submit`
- feedback panel `Add Update`
- feedback panel `Withdraw`

Staff board control:
- `/feedback-status`
- `/setup-feedback`

Operator scripts:
- `npm run feedback:sync-forum-posts`
- `npm run feedback:board:export`

Card structure sync:
- `npm run feedback:sync-forum-posts -- --dry-run`
- `npm run feedback:sync-forum-posts -- --apply`
- optional filters:
  - `--report-id <uuid>`
  - `--limit <count>`
  - `--status new,confirmed`
- apply mode updates the starter post and leaves the thread audit comment:
  - `Card formatting synced by Fawx Security.`
  - `Reason: Applied Feedback Card Structure v2.`

There is no automatic `/feedback-triage` or `/feedback-export` slash command in this lane.
- Board export is an operator workflow, not a public Discord action.

## Export workflow
Run:

```txt
npm run feedback:board:export
```

Default outputs:
- `runtime/feedback-board/latest.md`
- `runtime/feedback-board/latest.json`

Optional flags:
- `--status new,confirmed`
- `--type bug,feature`
- `--area Account`
- `--limit 100`
- `--include-duplicates`
- `--debug`
- `--markdown`
- `--json`
- `--out <path>`
- `--codex-drafts`

Export rules:
- withdrawn and spam are excluded by default
- duplicate is excluded by default unless `--include-duplicates` is set
- Discord user ids are masked by default
- no raw Discord payloads
- no file bytes
- no automatic GitHub issue creation
- no direct ATLAS writes
- board exports include the visible card sections, generated Acceptance Criteria, and evidence summary

## Codex drafts
Use:

```txt
npm run feedback:board:export -- --codex-drafts
```

Draft output:
- `runtime/feedback-board/codex-drafts.md`
- with `--out <path>`, draft output is written next to the custom export target as `codex-drafts.md`

Draft rules:
- draft only
- requires human review
- no auto-run
- no auto-commit
- no direct GitHub issue creation
- no direct ATLAS writes

Each draft should be treated as a starting point for a reviewed implementation task, not as automatic planning truth.

## Reviewed promotion
Promotion path:
- Discord card stays visible on the board
- Supabase keeps the bounded record
- operator exports the board or draft set
- human reviews the export
- accepted items become Codex work, Playbook notes, or ATLAS memory

Rule:
- reviewed promotion is required before Discord feedback becomes durable engineering truth

## Verta Core / Playbook handoff
The Feedback forum acts like the visible community board. The export artifacts are the bridge into Verta Core / Playbook / ATLAS.

Flow:
- Discord feedback card
- Supabase bounded row
- feedback board export
- Verta Core / Playbook triage
- reviewed Codex task
- implementation
- feedback status update

Handoff rule:
- Verta Core / Playbook consumes feedback board exports as reviewed planning input.
- The export does not automatically create issues, commits, or ATLAS truth. It is reviewed input.

## Feedback card audit comments
Fawx Security posts a compact thread comment whenever it modifies a card after creation. This makes the Feedback forum usable as a lightweight board with visible change history.

Actions that comment:
- status update
- withdraw
- reporter update
- duplicate signal
- board/card sync
- resolved state

Pattern:
- mutate bounded feedback row
- update forum card or tags
- post compact audit comment

Rule:
- bot-driven board changes should be visible in the card thread

Guardrails:
- no raw payloads
- no secrets
- no large user text dumps
- no broad mentions

## Out of scope
- no routine-sharing work
- no workout-sharing work
- no copy/import flow work
- no moderator bot work in this lane
