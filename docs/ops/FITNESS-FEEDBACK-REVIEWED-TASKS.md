# Fitness Feedback Reviewed Tasks

## Purpose
This lane turns reviewed Feedback Board exports into implementation-ready task packets and draft Codex prompts without creating duplicate task truth.

Rule:
- Feedback cards are signals, not automatic implementation authority.

Pattern:
- feedback board export -> reviewed task packet -> Codex draft prompt -> human approval -> implementation -> feedback status update -> curated update post
- shipped implementation -> fixed/completed card -> completion review queue -> approved or follow-up

Failure mode:
- running Codex directly from raw forum cards creates noisy sprint churn and duplicate task truth

## Inputs
Start from the existing board export:

```txt
npm run feedback:board:export
```

Default inputs:
- `runtime/feedback-board/latest.md`
- `runtime/feedback-board/latest.json`

The task-packet lane consumes `runtime/feedback-board/latest.json` by default.

## Generate task packets
Run:

```txt
npm run feedback:tasks:generate
```

Default outputs:
- `runtime/feedback-tasks/latest.md`
- `runtime/feedback-tasks/latest.json`
- `runtime/feedback-tasks/review-decisions.example.json`

Optional flags:
- `--from <path>`
- `--type bug,feature`
- `--status confirmed,in_progress`
- `--area <area>`
- `--limit 25`
- `--out <dir>`
- `--debug`
- `--codex-prompts`
- `--decisions <path>`
- `--include-completed-review`

Default included statuses:
- `confirmed`
- `in_progress`

Default excluded statuses:
- `withdrawn`
- `spam`
- `duplicate`
- `closed`
- `fixed`

Completion Review:
- `--include-completed-review` surfaces public non-testing `fixed`/`closed` cards whose `completion_review_status` is `pending` or `needs_followup`
- those cards generate review packets and review prompts, not new implementation prompts by default

## Review packets
Each packet is an implementation candidate, not an automatic task. Packets include:
- packet id
- feedback report ids
- report type
- area
- title
- problem statement
- evidence summary
- attachment count
- forum thread links
- duplicate count
- suggested priority
- implementation hypothesis
- files to inspect first
- acceptance criteria
- verification checklist
- docs update needed
- reviewer decision
- carried-through card sections such as Feature `User Story` or Bug `Expected behavior`
- evidence summary from the user-facing card

Review rules:
- no direct Discord-to-GitHub writes
- no direct Discord-to-ATLAS writes
- no automatic Codex execution
- no Discord or Supabase mutation from the packet generator
- visible card Acceptance Criteria stay concise and user-facing
- reviewed task packets may add deeper implementation and verification expectations on top

Two-level criteria model:
- Discord card Acceptance Criteria = readable board criteria for community and triage visibility
- reviewed task packet Acceptance Criteria = implementation-ready criteria for the approved Codex pass

Use `runtime/feedback-tasks/review-decisions.example.json` as the template for reviewed decisions.

Decision shape:

```json
[
  {
    "packetId": "packet-0000000000",
    "decision": "approve",
    "reviewer": "reviewer-name",
    "notes": "Scoped and approved for a reviewed Codex implementation pass.",
    "approvedAt": "2026-05-17T00:00:00.000Z"
  }
]
```

Supported decisions:
- `approve`
- `defer`
- `reject`
- `needs_info`

If decisions are supplied, approved packets appear first and the others are summarized separately.

## Generate draft Codex prompts
Run:

```txt
npm run feedback:tasks:generate -- --codex-prompts
```

Additional output:
- `runtime/feedback-tasks/codex-prompts.md`

Prompt rules:
- Draft only — requires human review before execution.
- no automatic run
- no automatic issue creation
- no automatic ATLAS write
- no Discord or Supabase mutation from this lane

## After implementation
This lane stops at reviewed packet and prompt generation.

Follow-up happens through existing workflows:
- implementation happens only after human approval
- feedback status is updated manually through the existing commands
- curated user-facing release notes may be posted through Update Bot when appropriate

Examples:
- reviewed packet approved -> Codex implementation starts
- work ships -> `/feedback-status fixed`
- shipped work -> `/feedback-completion-review report_id:<id> decision:approved`
- user-facing ship -> curated `#updates` post

## Scope guardrails
- no Spotify work
- no routine-sharing work
- no workout-sharing work
- no import/copy flows
- no moderation changes
- no automatic GitHub issue creation
- no automatic ATLAS writes
