# Feedback Board Dependency Repair and Live Sync - 2026-06-30

## Scope

Repair the Fitness feedback-board export/task pipeline after dependency metadata drift blocked `feedback:board:export`, recover the actual in-progress card from the bounded source row, and prove the live forum-thread sync path through the Fitness bot-backed workflow.

## What changed

- Recovered the live bounded source truth directly from `public.discord_feedback_reports` using the governed Fitness admin env mirror.
- Confirmed the currently active Fitness implementation card is:
  - report id: `bea397b0`
  - area: `Mobile`
  - summary: `Run a mobile UI normalization pass across every Fitness screen`
  - status: `in_progress`
  - forum thread id: `1521542046329077932`
- Synced the live mobile card thread from the bounded source row:
  - `npm run feedback:sync-forum-posts -- --report-id bea397b0-5383-4a7a-a2ce-b2bef43e6c65 --apply --debug`

## Root cause

`feedback:board:export` was blocked by unresolved dependency metadata on `FF-COPILOT-001`.

The source row stored long title strings in `depends_on`:

- `Rebuild useful history metrics and progression analytics`
- `Add per-day exercise templates for easy copy, paste, and modification`

The dependency normalizer treats uppercase-hyphen-safe values as card ids after trimming to the bounded card-id length. That converted the long title reference into a fake unresolved id such as:

- `REBUILD-USEFUL-HISTORY-METRICS-AND-PROGR`

That made the export fail closed, which also blocked task-packet generation.

## Repair

Bounded metadata was normalized at the source row layer:

- `4309deaf` now carries `card_id = FF-HISTORY-001`
- `8ed05d76` now carries `card_id = FF-TEMPLATES-001`
- `FF-COPILOT-001` now depends on:
  - `FF-CORE-001`
  - `FF-HISTORY-001`
  - `FF-TEMPLATES-001`

After the repair, the affected live forum cards were re-synced:

- `4309deaf-9566-476d-8201-178724b7e07f`
- `8ed05d76-3246-4d81-9f2c-879b6a882b2d`
- `52f8f402-295f-4cfb-8b74-31d7f1f482f3`

## Proof

Live row recovery:

- direct bounded query proved:
  - active mobile card `bea397b0`
  - fixed copilot card `52f8f402`
  - fixed routines/templates card `8ed05d76`
  - fixed progression card `9aab0007`

Forum sync:

- `npm run feedback:sync-forum-posts -- --report-id bea397b0-5383-4a7a-a2ce-b2bef43e6c65 --apply --debug`
  - result: `Updated: 1`
- `npm run feedback:sync-forum-posts -- --report-id 4309deaf-9566-476d-8201-178724b7e07f --apply --debug`
  - result: `Updated: 1`
- `npm run feedback:sync-forum-posts -- --report-id 8ed05d76-3246-4d81-9f2c-879b6a882b2d --apply --debug`
  - result: `Updated: 1`
- `npm run feedback:sync-forum-posts -- --report-id 52f8f402-295f-4cfb-8b74-31d7f1f482f3 --apply --debug`
  - result: `Updated: 1`

Board/task pipeline:

- `npm run feedback:board:export -- --json`
  - result: `Exported 41 feedback board cards`
- `npm run feedback:tasks:generate`
  - result: `Generated 21 active feedback task packets and 0 completion review packets`

Artifacts regenerated:

- `runtime/feedback-board/latest.json`
- `runtime/feedback-tasks/latest.md`
- `runtime/feedback-tasks/latest.json`
- `runtime/feedback-tasks/review-decisions.example.json`

## Current state

- The canonical active Fitness card is the mobile normalization pass (`bea397b0`), not the older routines/templates or session-copilot cards.
- The live forum-thread sync path is operational when driven from the governed Fitness env mirror.
- The reviewed board export and task-packet pipeline are healthy again after the dependency metadata repair.

## Follow-up

- Future dependency references should use bounded `card_id` values first when a target card participates in sequencing.
- Long human-readable titles should not be left inside `depends_on` once a dependent lane becomes a real implementation dependency.
