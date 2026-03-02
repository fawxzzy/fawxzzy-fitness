# Pattern: Versioned Persistence

[Back to Index](../INDEX.md)

## Problem
Unversioned persistence breaks consumers when data/contracts evolve.

## Context
- Applies when persisted data must outlive a single release.
- Assumes schema/contract evolution is inevitable.
- Requires compatibility planning across old and new persisted versions.

## Solution
- Tag persisted payloads with explicit schema versions.
- Include migration/read-upgrade paths for prior versions.
- Use deterministic keys for per-entity persisted state.
- Add write-time validation to prevent invalid legacy shapes.
- Document version bump implications in changelog/decisions.

## Tradeoffs
- Version migration logic increases code paths to maintain.
- Backward compatibility can slow schema simplification.
- Poorly planned versioning can create long-tail legacy debt.

## Example
Client snapshot stores `{schemaVersion, savedAt}` and upgrade logic maps v1 payloads to current shape before use.

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

## Related guardrails
- [Recompute derived caches after additive and destructive mutations](../GUARDRAILS/guardrails.md#recompute-derived-caches-after-additive-and-destructive-mutations)
- [Use deterministic sync reports instead of auto-renaming media files](../GUARDRAILS/guardrails.md#use-deterministic-sync-reports-instead-of-auto-renaming-media-files)

## Common failure modes
- Destructive changes before dependent readers are updated.
- Missing compatibility handling for legacy payloads.
- Persisted per-entity state keyed inconsistently across screens.

## Sources
- Dump A — `4) Data Modeling & Storage / ordered SQL migrations`.
- Dump B — `Core Principles / Versioned persistence as a contract`, `Data Modeling Patterns / Version-tagged snapshot schema`.

## Sources (addendum)
- `docs/PLAYBOOK_NOTES.md` (2026-02-22 to 2026-02-24): versioned/timestamped offline snapshots and deterministic local state keys for resumable flows.
