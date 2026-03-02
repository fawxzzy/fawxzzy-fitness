# Pattern: Timezone Determinism

[Back to Index](../INDEX.md)

## Problem
Date-sensitive features break when "today" is computed inconsistently across locales/timezones.

## Context
- Applies where daily logic depends on user-local date boundaries.
- Assumes server/client may run in different timezones.
- Requires one canonical timezone/day-window implementation shared across flows.

## Solution
- Centralize timezone conversion and day-window helpers.
- Compute day indices from canonical normalized timestamps.
- Pass timezone context explicitly into daily-resolution functions.
- Avoid implicit local-time parsing in critical state transitions.
- Add targeted tests around boundary times and DST changes.

## Tradeoffs
- Temporal helpers add abstraction to simple date operations.
- DST/locale edge-case tests increase maintenance surface.
- Strict normalization can require migration of legacy timestamp assumptions.

## Example
Session-day resolution uses shared helper with user timezone so activity near midnight maps to the expected local day consistently.

## When to use
- Daily schedule, streak, or day-window behavior depends on user locale.

## When NOT to use
- Features that are explicitly timezone-agnostic.

## Implementation outline
- Persist user timezone context.
- Compute day index and day-window boundaries with shared helpers.
- Query and aggregate data using timezone-aligned windows.


## Single timezone source for day-scoped UX
### Problem
"Today" status, completion badges, and history timestamps drift when computed from mixed timezone assumptions.

### Guideline
Resolve local-day windows and displayed timestamps from one user-local timezone source shared across read/write paths.

### Example
Use one timezone helper for: today routing decisions, completion-state grouping, and user-facing timestamp formatting.

### Pitfalls
- Mixing routine timezone, server timezone, and device-local timezone in one workflow.
- Computing day status in one timezone while displaying timestamps in another.

## Canonical timezone values with simplified selection UX
### Problem
Wide timezone selector lists improve theoretical precision but increase misconfiguration in common mobile setup/edit flows.

### Guideline
Offer a concise user-facing timezone choice set, then normalize legacy/device values to canonical identifiers used by server scheduling logic.

### Example
Persist canonical IANA values even when input arrives from aliases or abbreviated device strings.

### Pitfalls
- Persisting unnormalized timezone aliases.
- Letting form choice labels diverge from server-expected canonical values.

## Related guardrails
- [History exercise browsers use canonical catalog loader](../GUARDRAILS/guardrails.md#history-exercise-browsers-use-canonical-catalog-loader)
- [Guardrail Enforcement Index](../GUARDRAILS/_index.md)

## Common failure modes
- UTC-only assumptions for local-day features.
- Multiple inconsistent day-window implementations.
- Day-state logic and displayed timestamps resolved from different timezone sources.
- Non-canonical timezone values persisted from legacy/device inputs.

## Cross-links
- Offline snapshot freshness and replay consistency: [Resilient Client-State & Idempotent Sync](./resilient-client-state.md)
- Action contracts for day-sensitive server operations: [Server/Client Boundaries](./server-client-boundaries.md)

## Sources
- Dump A — `2) Core Principles / timezone-aware routine resolution deterministic`.
- Dump A — `3) Architectural Patterns / Timezone-safe day-window and day-index helpers`.

- `docs/PLAYBOOK_NOTES.md` (2026-02-24 to 2026-02-25): single timezone source for day status/timestamps, canonical timezone normalization UX.
