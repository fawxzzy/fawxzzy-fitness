# Fitness Feedback Reviewed Tasks

## Purpose

This lane turns one reviewed Fitness feedback-board export into bounded local task-packet outputs for human review.

Current local outputs:

- `runtime/feedback-tasks/latest.md`
- `runtime/feedback-tasks/latest.json`
- `runtime/feedback-tasks/codex-prompts.md`
- `runtime/feedback-tasks/review-decisions.example.json`

## Input Boundary

Use one board export as the source of truth:

- `runtime/feedback-board/*.json`

Do not treat ad hoc notes, chat transcripts, or direct ATLAS edits as the canonical source for this lane.

## Workflow Contract

- Draft-only packets require human review before execution.
- Keep the one-board, reviewed-export workflow intact.
- Do not create automatic GitHub issues from this lane.
- Do not write to ATLAS automatically from this lane.
- Do not mutate Discord or Supabase from this lane.
- Card mutation audit comments stay in the Feedback thread.
- Do not post to `#updates` unless the shipped change is user-facing and separately approved.

## Completion Review Contract

Completed cards can generate completion-review prompts, but those prompts stay review-only:

- review the shipped work against the declared acceptance criteria
- do not treat completion review as a new implementation packet
- do not post completion-review state changes to `#updates`

## Proof Surface

The current owner-side contract is backed by:

- `scripts/generate-feedback-task-packets.mjs`
- `scripts/generate-feedback-task-packets.test.mjs`

The generator must preserve local-only reviewed-task behavior, bounded documentation suggestions, and the no-mutation constraints above.
