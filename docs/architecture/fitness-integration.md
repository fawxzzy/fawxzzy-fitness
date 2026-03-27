# Fitness Integration Architecture

## Purpose

Fitness is a governed ecosystem participant and must stay inside the Playbook/Lifeline seam.

## Ownership boundary (Fitness vs Playbook/Lifeline)

**Rule: Fitness owns signal emission and inspectable app snapshots, not ecosystem planning.**

Fitness owns:
- deterministic signal emission from app transitions
- deterministic state snapshot builders from app truth
- thin seam packaging/adapters for outbound payloads
- receipt ingest, local inspectability, and debug tooling

Playbook owns:
- planning and policy decisions
- interpreting multi-signal context into bounded plans

Lifeline owns:
- bounded execution and action application
- returning typed receipts after execution

## Seam pattern

**Pattern: app repos prepare governed payloads and consume receipts through a thin seam adapter.**

Fitness packages app facts using:
- `emitFitnessSignal(...)`
- `buildFitnessSnapshots(...)`
- `fitnessIntegrationClient` for seam-safe packaging and ingest
- `ingestFitnessReceipt(...)` for app-side receipt handling
- `getFitnessIntegrationDebugState(...)` for local inspection

No Playbook planning logic or Lifeline execution logic is embedded in these paths.

## Real emit points in Fitness

Current real app transitions wired to signal emission:

- Session completion (`saveSessionAction`) emits `workout_completed` and then publishes snapshot-derived evaluations.
- In-progress session discard on Today (`discardInProgressSessionAction`) emits `workout_missed` and then publishes snapshot-derived evaluations.
- Snapshot evaluation path can emit `weekly_goal_hit`, `recovery_warning`, and `streak_broken` from deterministic app state.

## Deterministic snapshots

Fitness snapshots are built from app state (sessions, routine day plans, in-progress session summary):

- `athlete_readiness_state`
- `weekly_progress_state`
- `streak_health_state`

Snapshot derivation is deterministic given `(memberId, now, fetched app state)`.

## Receipt handling and inspectability

Fitness maintains a bounded local debug store for:
- emitted signals
- exported snapshots
- ingested receipts

Receipts are first-class and keep `sourceOutboundId` so outbound-to-receipt traceability is inspectable in-app.

Dev inspection surface:
- `GET /api/ecosystem/fitness/debug`
- `POST /api/ecosystem/fitness/debug` with commands:
  - `refresh-live-state`
  - `replay-fixtures`
  - `ingest-receipt`

## Failure mode

**Failure Mode: embedding Playbook planning or Lifeline execution inside the app destroys the governed architecture.**

Any app change that introduces local planning decisions or direct execution bypasses the seam and is out of bounds.
