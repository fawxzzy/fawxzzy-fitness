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

## Common failure modes
- Destructive changes before dependent readers are updated.
- Missing compatibility handling for legacy payloads.

## Sources
- Dump A — `4) Data Modeling & Storage / ordered SQL migrations`.
- Dump B — `Core Principles / Versioned persistence as a contract`, `Data Modeling Patterns / Version-tagged snapshot schema`.
