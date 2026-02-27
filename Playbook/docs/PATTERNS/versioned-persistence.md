# Pattern: Versioned Persistence

[Back to Index](../INDEX.md)

## Problem
Unversioned persistence breaks consumers when data/contracts evolve.

## When to use
- Persisted artifacts survive across releases.
- Compatibility across old/new forms is required.

## When NOT to use
- Disposable prototypes with no long-lived stored data.

## Implementation outline
- Add explicit version tags to persisted forms.
- Plan migrations as first-class deliverables.
- Validate backward/forward compatibility paths.


## Runtime snapshot contract
### Problem
Long-lived local snapshots become unsafe when schema version, normalization, and key strategy are implicit.

### Guideline
Version persisted snapshots explicitly, normalize at read/write boundaries, and use deterministic composite keys for resumable per-entity state.

### Example
Cache per-session/per-item state using a stable key (`sessionId:itemId`) and include `{ schemaVersion, savedAt }` in the payload.

### Pitfalls
- Key collisions from ad hoc local-storage naming.
- Snapshot payloads without version/timestamp metadata.

## Common failure modes
- Destructive changes before dependent readers are updated.
- Missing compatibility handling for legacy payloads.
- Persisted per-entity state keyed inconsistently across screens.

## Sources
- Dump A — `4) Data Modeling & Storage / ordered SQL migrations`.
- Dump B — `Core Principles / Versioned persistence as a contract`, `Data Modeling Patterns / Version-tagged snapshot schema`.

## Sources (addendum)
- `docs/PLAYBOOK_NOTES.md` (2026-02-22 to 2026-02-24): versioned/timestamped offline snapshots and deterministic local state keys for resumable flows.
