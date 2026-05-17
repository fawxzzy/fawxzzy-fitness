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

## Out of scope
- no routine-sharing work
- no workout-sharing work
- no copy/import flow work
- no moderator bot work in this lane
