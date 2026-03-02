# Pattern: Resilient Client-State & Idempotent Sync

[Back to Index](../INDEX.md)

## Problem
Client-state and offline workflows degrade when persistence formats drift, replays are non-idempotent, and stale data is not visible to users.

## Context
- Applies to long-lived client flows with retries, reconnects, or tab restores.
- Assumes local state can diverge temporarily from server truth.
- Requires deterministic reconciliation rules after failures.

## Solution
- Version persisted client snapshots and include timestamps.
- Use deterministic keys for resumable per-entity state.
- Treat server responses as canonical and reconcile local state explicitly.
- Idempotently replay interrupted operations where possible.
- Surface stale/unsynced indicators to prevent silent inconsistency.

## Tradeoffs
- State-version migrations add maintenance burden.
- Reconciliation logic can be hard to reason about without strict contracts.
- Extra UX signaling increases interface complexity.

## Example
On app restart, client restores versioned snapshot, revalidates with server, and only keeps local deltas that still match canonical constraints.

## Snapshot Versioning
- Tag persisted snapshots with an explicit schema version.
- Strip runtime-only fields before persistence.
- Normalize snapshots before save/load so read/write behavior is deterministic.
- Prefer forward-compatible readers where possible to tolerate mixed-version windows.

## Offline Queue Pattern
- Attach an idempotency key (for example `client_log_id`) to each queued mutation.
- Retry with bounded backoff and deterministic replay ordering.
- Design replay logic to be conflict-safe and resumable.
- Enforce server-side dedupe keyed by idempotency identifiers.

## Stale Snapshot UX Contract
- Store and surface snapshot timestamps.
- Show an explicit stale indicator when freshness cannot be guaranteed.
- Avoid silent inconsistency where stale data looks authoritative.

## Timezone Determinism
- Use centralized helpers for timezone/day-window resolution.
- Avoid implicit assumptions about server-local timezone behavior.
- Compute user-local day windows deterministically for persistence and replay decisions.


## Timer Continuity Contract
- Persist long-running timers with `{ elapsedSeconds, isRunning, runningStartedAt }` and restore with wall-clock reconciliation.
- Use one authoritative elapsed source when resuming (`runningStartedAt`) or reconcile with `max(storedElapsed, wallClockElapsed)`; do not add both.
- Persist per-entity in-progress UI state under deterministic composite keys (for example `sessionId + itemId`) and restore before queue hydration.

## Offline Snapshot Staleness Contract
- Include schema version and snapshot timestamp in cached offline snapshots.
- Normalize snapshots before save/load so stale-state rendering stays deterministic across app versions.
- Surface explicit stale indicators whenever cached snapshots are rendered.

## Related guardrails
- [Recompute derived caches after additive and destructive mutations](../GUARDRAILS/guardrails.md#recompute-derived-caches-after-additive-and-destructive-mutations)
- [Resolve cached and aggregated stats by canonical entity ID](../GUARDRAILS/guardrails.md#resolve-cached-and-aggregated-stats-by-canonical-entity-id)

## Common failure modes
- Persisting snapshots without version tags or normalization.
- Offline replay duplicating writes because idempotency keys are missing.
- Stale local state rendered as current without explicit user signaling.
- Timezone drift between offline and server reconciliation paths.
- Timer replay/restoration double-counting elapsed time after resume.
- In-progress local UI state restored after queue hydration, causing state clobbering.

## Cross-links
- Queue replay and server idempotency boundaries: [Offline-First Sync](./offline-first-sync.md)
- Server action response semantics: [Server/Client Boundaries](./server-client-boundaries.md)
- Day-window consistency under offline caches: [Timezone Determinism](./timezone-determinism.md)

## Sources
- Cross-repository offline/state reliability audits — persistence drift and replay idempotency findings (2026-02 doctrine patch request).
- Dump A — `timezone-aware routine resolution deterministic`, `schema evolved via ordered migrations`.
- Dump B — `Offline & Sync Patterns / capability-based provider selection`, `Version-tagged snapshot schema`.

- `docs/PLAYBOOK_NOTES.md` (2026-02-22 to 2026-02-24): stale snapshot indicators, timer persistence/reconciliation, resumable per-entity UI state.
