# Pattern: Offline-First Sync

[Back to Index](../INDEX.md)

## Problem
Intermittent connectivity causes data loss and UX failure without explicit offline strategy.

## When to use
- Users must continue workflows while offline.
- Local persistence and later synchronization are product requirements.

## When NOT to use
- Product correctness depends on immediate always-online authority.

## Implementation outline
- Make local persistence the primary interaction layer.
- Queue/synchronize writes with explicit conflict strategy.
- Select supported storage mode at runtime with safe fallback.
- Preserve session-pointer continuity across mode transitions.

## Queue + server idempotency must be paired
### Problem
Retries during reconnect can duplicate append-only writes if idempotency is enforced only on one side.

### Guideline
Use deterministic queue ordering + bounded retry/backoff on the client, and enforce server-side idempotency with a stable client mutation key (plus deterministic fallback dedupe when absent).

### Example
Attach `client_log_id` to queued mutations and enforce uniqueness at the database boundary.

### Pitfalls
- Queue retries without server dedupe.
- Server dedupe rules that do not match client replay behavior.

## Concurrency-safe append indexes
### Problem
Count-based ordinal assignment races under reconnect flushes or concurrent inserts.

### Guideline
Enforce parent-scoped uniqueness in the database and retry index allocation on conflict (for example, `max(index)+1`).

### Example
For append-only child rows, treat index allocation as conflict-prone and retry within a bounded loop.

### Pitfalls
- Using `count(*)` as the next index.
- Assuming offline replay preserves singleton write ordering.

## Make queued state visible in active UX
### Problem
Users lose trust when offline writes are silently queued without explicit status.

### Guideline
Persist failed writes into a local queue and show queued/syncing/synced status in the active screen.

### Example
On network failure, enqueue the payload and render a queued badge until replay completes.

### Pitfalls
- Dropping failed writes.
- Rendering optimistic success without sync-state indicators.

## Common failure modes
- No conflict-resolution contract.
- Permission/capability failures not surfaced clearly.
- Stale async effects after context/epoch changes.
- Duplicate append rows from missing idempotency/concurrency contracts.
- Silent local queue fallback without user-visible status.

## Cross-links
- ActionResult and server action boundaries: [Server/Client Boundaries](./server-client-boundaries.md)
- Snapshot versioning and stale-state UX: [Resilient Client-State & Idempotent Sync](./resilient-client-state.md)

## Sources
- Dump B — `Offline & Sync Patterns`.
- Dump A — `4) Data Modeling & Storage / No explicit PWA/offline sync implementation found` (gap signal).
- `docs/PLAYBOOK_NOTES.md` (2026-02-22): queue idempotency pairing, concurrency-safe append indexes, local queue visibility.
