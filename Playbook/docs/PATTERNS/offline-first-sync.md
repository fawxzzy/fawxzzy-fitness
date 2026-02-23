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

## Common failure modes
- No conflict-resolution contract.
- Permission/capability failures not surfaced clearly.
- Stale async effects after context/epoch changes.

## Sources
- Dump B — `Offline & Sync Patterns`.
- Dump A — `4) Data Modeling & Storage / No explicit PWA/offline sync implementation found` (gap signal).
