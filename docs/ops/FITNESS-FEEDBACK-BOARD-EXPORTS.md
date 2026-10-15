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

## Reviewed owner registry projection

The existing `npm run project-board:owner-export` adapter reads the reviewed
`config/fitness-owner-work-registry.json` and matching definitions in the existing
roadmap/session/supplemental collections. This source projection does not create
canonical shared cards or replace the live feedback export workflow above.
FawxzzyPlatform remains the sole logical canonical shared-card writer; the Web
reader consumes a separately approved sanitized projection.

- The 39 reconciled baseline IDs must remain present and unique. Additional
  stable `FF-AREA-001` IDs need both an owner registry entry and one matching
  definition in an existing source collection. Counts are derived from the
  adopted entries; source-only definitions and unadopted research are not added.
- Existing fixed-card exclusions and the historical reconciliation provenance
  remain enforced. Titles, acceptance criteria, dependency identities, status
  and timestamps must remain valid. A source reference identifies the actual
  defining collection rather than guessing from an ID prefix.
- Dependency cycles are rejected across all adopted source cards before fixed
  cards are excluded. Acyclic dependencies may share prerequisites.
- Every new registry entry must explicitly set `visibility` to `public`,
  `private` or `unknown`. Missing or invalid decisions fail closed. An undecided
  card uses explicit `unknown`, which has `public_safe: false`, as does `private`.
  This requirement also applies to new entries already marked fixed.
- Only the accepted 24-card snapshot retains its existing visibility when the
  field is absent. Previously excluded baseline cards default to unknown, and
  an explicit private/unknown decision overrides a retained public decision.
  The source flag is not approval to publish a card.
- An owner export can contain private/unknown cards and reports that fact with
  `extensions.private_records_included`. Keep that full export in the controlled
  owner/canonical intake path. Never send it directly to a public reader;
  sanitization, visibility approval and consumer checks remain required.

The accepted `exports/fitness.project-board.owner-export.v1.json` is retained
unchanged during source-only preparation. Adapter edits change source provenance,
so `npm run project-board:owner-export:check` will report that retained snapshot
stale until the source owner separately admits regeneration. This does not change
the original 24 card bodies or their decisions. Synthetic fixtures prove local
growth, privacy rejection/defaults, deterministic export and write/check readback.

Adding cards is ready for the operator only after source integration and one
authorized real card has been saved by the canonical writer and read back with
the same ID, idempotency key, revision and status after refresh/reopen, followed
by the required sanitized consumer acceptance and correlated owner result. These
tests do not provide that live acceptance.
