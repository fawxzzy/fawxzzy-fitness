# Progression Event Ledger

## Purpose

The progression event ledger stores durable target-change records for routine exercises.

- Status and eligibility stay live and recomputable.
- The ledger records what changed, why it changed, and what evidence triggered the change.
- Ready status by itself does not write an event.

## Core rule

Store progression events, not transient status rows.

- `Progression Status` explains current readiness.
- `progression_events` records applied progression changes over time.

## Event types

The table supports these event types:

- `promotion_applied`
- `promotion_reverted`
- `lock_in`
- `deload_applied`
- `review_acknowledged`
- `manual_target_change`

This lane wires only the concrete mutation paths that already exist in the app:

- `promotion_applied`
- `promotion_reverted`
- `deload_applied`
- `manual_target_change`

The remaining event types stay defined but unwired until those durable product actions exist.

## Event shape

Each event records:

- `id`
- `user_id`
- `routine_id`
- `routine_day_exercise_id`
- `exercise_id`
- `event_type`
- `from_target`
- `to_target`
- `method`
- `vector`
- `step`
- `reason`
- `source_session_id`
- `created_at`

`from_target` and `to_target` are JSON snapshots so the ledger can preserve the target contract without forcing a rigid column-per-metric schema.

`step` stores the before/after delta snapshot for the resolved vector.

## Write paths

This lane writes events from these durable target mutations:

- Progression apply actions in `src/app/progression-review/actions.ts`
- Today selected-day progression apply/revert actions in `src/app/today/page.tsx`
- Routine day exercise manual target edits in `src/app/routines/[id]/edit/day/actions.ts`

The write helpers live in `src/lib/progression-events.ts`.

## Source evidence

When a progression change comes from completed session evidence, the event should capture the actual `sessions.id` in `source_session_id`.

- Session history rows may still be grouped by `session_exercise_id` for progression math.
- Event recording resolves that grouped history back to the canonical `sessions.id` before insert.

## Recording policy

This lane uses best-effort event recording.

- Target mutation remains the source of truth.
- Event insert failure is logged and does not block the target update.

This is intentional because the current target mutation paths are direct Supabase updates, not transaction-wrapped RPC flows.

## Out of scope

This lane does not add:

- analytics charts
- export sheets
- progression history UI
- event-driven status computation

Those later surfaces should read from the same ledger instead of inventing parallel progression history storage.

## Export consumer

The account workout export now reads `progression_events` directly.

- JSON export includes raw `progressionEvents` rows.
- XLSX export adds a table-first `Progression Events` sheet.
- CSV export adds a dedicated `progression_events` table section in the single export file.

Export does not reconstruct event history from readiness or status rows.

## Analytics consumer

Pure analytics helpers now consume ledger rows as deterministic transforms.

- `src/lib/progression-event-analytics.ts` summarizes counts, frequencies, latest-per-exercise state, time buckets, and conservative numeric target deltas.
- The helpers read only durable `progression_events` rows.
- Unknown target shapes return `null` analytics instead of invented deltas.

Deferred:

- sessions-to-promotion and similar session-correlated metrics still require explicit event/session correlation work beyond the current pure event-row layer.

## Read-only history consumer

The History area now includes a read-only `Progression History` route that consumes the ledger directly.

- `src/app/history/progression/page.tsx` loads authenticated user-scoped `progression_events`.
- `src/lib/progression-history-display.ts` builds deterministic display rows and summary cards from the same ledger rows.
- `src/lib/progression-event-analytics.ts` remains the summary source of truth for counts and top-progressed exercise summaries.
- The History UI does not replay, revert, or synthesize events from readiness or status rows.
- URL-backed filters now narrow the ledger by event type, routine, exercise, and date range without changing write behavior.
- Filtered dashboard cards intentionally summarize the same filtered event set as the visible list.

## Dashboard card consumer

The History progression route now promotes ledger summaries into reusable dashboard cards.

- `src/components/history/ProgressionDashboardCards.tsx` renders the reusable summary card strip.
- `src/lib/progression-history-display.ts` prepares dashboard card models from `progression-event-analytics` helpers instead of letting React components interpret ledger rows inline.
- The dashboard cards stay read-only and derive from durable `progression_events`, not from readiness or status rows.

## Migration status

As of 2026-05-10, `npm run migration:validate` is still expected-red against the linked remote.

Current linked-remote drift from `npm run migration:validate`:

- `20260508090000_remove_zone_2_cardio_catalog_exercise.sql`
- `20260509103000_profile_qa_visibility.sql`
- `20260509113000_051_progression_events.sql`

Classification:

- branch-stack pending migrations

Interpretation:

- The linked remote is aligned through `20260510090000_052_routine_core_rls_initplan.sql`.
- The three missing versions are newer local branch-history migrations that have not been applied remotely yet.
- `20260510090000_052_routine_core_rls_initplan.sql` no longer appears in the expected-red list because it is already present in the linked remote history.
- This is not evidence that `progression_events` is malformed or that remote history should be repaired immediately.

Required apply order before deploy:

1. `20260508090000_remove_zone_2_cardio_catalog_exercise.sql`
2. `20260509103000_profile_qa_visibility.sql`
3. `20260509113000_051_progression_events.sql`

Operational bootstrap notes:

- `npm run migration:validate` is expected-red until the three pending branch-stack migrations above are applied remotely in order.
- If `npm run verify` fails because Playbook cannot resolve a runtime binary, restore the repo-local runtime with the canonical command `node scripts/playbook-runtime.mjs --install-official-fallback`.
- If `npm run lint` fails on `Cannot find module '@next/env'`, treat that as local `node_modules` drift and repair it with a clean install (`npm ci`), not an ad-hoc committed dependency change.

Operational rule:

- Do not mark these versions applied remotely just to make validation green.
- Apply them deliberately in order once the branch stack is promoted through the normal deploy path.
- If the remote schema is changed outside the checked-in chain, classify that drift first before using any Supabase repair command.
