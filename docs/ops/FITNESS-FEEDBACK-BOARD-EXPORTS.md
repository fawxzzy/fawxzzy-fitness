# Fitness Feedback Board Exports

## Purpose

This doc defines the operator workflow for exporting the live Fitness feedback board into reviewed local artifacts.

The board export lane exists to turn the Discord feedback forum plus bounded Supabase metadata into:

- a readable local markdown board
- a structured local JSON export
- optional draft-only Codex prompts for reviewed implementation follow-up

It is not an automatic planning or mutation lane.

## Source of truth

Use the live Fitness feedback board workflow as the source chain:

- Discord feedback forum = visible board
- `discord_feedback_reports` = bounded metadata index
- `feedback:board:export` = reviewed local export bridge

Do not bypass that chain with ad hoc ATLAS notes, direct task creation, or freeform draft copying.

## Canonical command surface

Run:

```txt
npm run feedback:board:export
```

Default outputs:

- `runtime/feedback-board/latest.md`
- `runtime/feedback-board/latest.json`

Optional draft output:

```txt
npm run feedback:board:export -- --codex-drafts
```

Draft output path:

- `runtime/feedback-board/codex-drafts.md`

## Workflow rules

- Keep the one-board export workflow intact.
- Exports are review artifacts, not automatic execution truth.
- Draft prompts are local-only starting points and require human review.
- Do not create automatic GitHub issues from this lane.
- Do not write to ATLAS automatically.
- Do not add direct Discord mutation from the board-export draft lane.
- Do not mutate Supabase from the board-export draft lane.

## Filtering and scope

Board exports may be filtered for review, but dependency truth still comes from the full live board metadata set.

That means:

- visible export slice can be limited by status, type, area, or limit
- dependency resolution must still honor valid cards outside that filtered slice
- filtered exports must fail only for truly unresolved or ambiguous dependencies

## Review expectations

Before using a board export as implementation input:

- confirm the cards are the intended slice
- confirm dependency metadata is resolved
- confirm no testing-only canaries leaked into the public review packet unless explicitly requested
- confirm any Codex draft output is still marked draft-only

## Verification

Minimum proof for changes to this lane:

- targeted board-export tests
- `npm run typecheck`

When workflow logic changes, keep this doc aligned with:

- `scripts/export-feedback-board.mjs`
- `scripts/export-feedback-board.test.mjs`
- `docs/ops/FITNESS-FEEDBACK-BOARD.md`
