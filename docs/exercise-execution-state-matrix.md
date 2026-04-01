# Exercise execution state matrix

This matrix is the canonical mapping for session exercise presentation. It is derived from domain values (`loggedSetCount`, `isSkipped`, and set targets) and is the only source used by exercise cards for badges, chips, and action availability.

## Inputs

- `loggedSetCount`: Number of logged sets for the exercise in the active session.
- `isSkipped`: Session-level skip flag.
- `targetSetsMin` / `targetSetsMax`: Used to derive completion target when available.

## Domain execution states

| Domain state | Domain condition |
| --- | --- |
| `not_started` | `loggedSetCount = 0` and `isSkipped = false` |
| `in_progress` | `loggedSetCount > 0` and `isSkipped = false` and target not reached |
| `completed` | `loggedSetCount >= goalSetTarget` and `isSkipped = false` |
| `skipped_before_start` | `loggedSetCount = 0` and `isSkipped = true` |
| `partially_completed` | `loggedSetCount > 0` and `isSkipped = true` and target not reached |
| `completed_then_remaining_skipped` | `loggedSetCount >= goalSetTarget` and `isSkipped = true` |

## Presentation rules (active workout cards)

| Domain state | Badge copy | Chips | Allowed actions |
| --- | --- | --- | --- |
| `not_started` | none | none | `Skip`, quick log enabled |
| `in_progress` | `N of T logged` (or `N logged`) | none | `Skip`, quick log enabled |
| `completed` | `Completed` | none | `Skip`, quick log enabled |
| `skipped_before_start` | none | `Skipped` | `Unskip`, quick log disabled |
| `partially_completed` | `Partial` | `N of T logged` + `Ended early` | `Unskip`, quick log disabled |
| `completed_then_remaining_skipped` | `Completed` | `N of T logged` + `Ended early` | `Unskip`, quick log disabled |

## Presentation rules (read-only summary/resume cards)

Canonical read-only presentation states:

| Read-only state | Meaning |
| --- | --- |
| `not_started` | Exercise was untouched in this session. |
| `completed` | Goal threshold reached and not skipped. |
| `skipped` | Skipped before any logging. |
| `partial` | Logged progress exists but exercise was not fully completed (including ended-early cases). |
| `partial_with_remaining_skipped` | Goal threshold reached, then exercise was skipped for remaining work in-session. |

| Domain state | Badge copy | Chips |
| --- | --- | --- |
| `not_started` | none | none |
| `in_progress` | `N of T logged` (or `N logged`) | none |
| `completed` | `Completed` | none |
| `skipped_before_start` | `Skipped` | none |
| `partially_completed` | `Partial` | `N of T logged` + `Ended early` |
| `completed_then_remaining_skipped` | `Completed` | `N of T logged` + `Ended early` |

## Transition rules

- `untouched -> skipped`: User taps **Skip** before any set is logged.
- `untouched -> partial`: User logs first set.
- `partial -> completed`: Logged set count reaches derived goal target.
- `partial -> partially_completed`: User taps **Skip** after logging one or more sets.
- `completed -> completed_then_remaining_skipped`: User can still skip after reaching the set target.
- `skipped -> untouched`: User taps **Unskip** with zero logged sets.
- `partialSkipped -> partial` or `completed`: User taps **Unskip**. Result depends on whether logged count already satisfies the completion threshold.

## Guardrails

- The UI must never present plain `logged` and plain `skipped` simultaneously.
- Any skipped exercise with logged sets must be rendered using explicit partial copy (`Partial`, `N of T logged`, `Ended early`).
- Read-only/resume surfaces must use the shared read-only presentation mapper and must not compose independent logged/skipped copy.
- Quick log is disabled when skipped (`skipped` or `partialSkipped`) so actions cannot drift from derived state.
