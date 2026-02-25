# Pattern: Resilient Client-State & Idempotent Sync

[Back to Index](../INDEX.md)

## Problem
Client-state and offline workflows degrade when persistence formats drift, replays are non-idempotent, and stale data is not visible to users.

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

## Common failure modes
- Persisting snapshots without version tags or normalization.
- Offline replay duplicating writes because idempotency keys are missing.
- Stale local state rendered as current without explicit user signaling.
- Timezone drift between offline and server reconciliation paths.

## Sources
- Cross-repository offline/state reliability audits — persistence drift and replay idempotency findings (2026-02 doctrine patch request).
- Dump A — `timezone-aware routine resolution deterministic`, `schema evolved via ordered migrations`.
- Dump B — `Offline & Sync Patterns / capability-based provider selection`, `Version-tagged snapshot schema`.
