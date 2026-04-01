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
| `skipped` | `loggedSetCount = 0` and `isSkipped = true` |
| `partial` | `loggedSetCount > 0` and `isSkipped = true` and target not reached |
| `partial_with_remaining_skipped` | `loggedSetCount >= goalSetTarget` and `isSkipped = true` |

## Presentation rules (active workout cards)

| Domain state | Badge copy | Chips | Allowed actions |
| --- | --- | --- | --- |
| `not_started` | none | none | `Skip`, quick log enabled |
| `in_progress` | `N of T logged` (or `N logged`) | none | `Skip`, quick log enabled |
| `completed` | `Completed` | none | `Skip`, quick log enabled |
| `skipped` | none | `Skipped` | `Unskip`, quick log disabled |
| `partial` | `Partial` | `N of T logged` + `Ended early` | `Unskip`, quick log disabled |
| `partial_with_remaining_skipped` | `Partial` | `N of T logged` + `Ended early` | `Unskip`, quick log disabled |

## Presentation rules (read-only summary/resume cards)

Canonical read-only presentation states:

| Read-only state | Meaning |
| --- | --- |
| `not_started` | Exercise was untouched in this session. |
| `in_progress` | Exercise has logged sets and remains active. |
| `completed` | Goal threshold reached and not skipped. |
| `skipped` | Skipped before any logging. |
| `partial` | Logged progress exists and exercise was ended early in-session. |
| `partial_with_remaining_skipped` | Goal threshold was reached, then exercise was ended early for remaining work. |

| Domain state | Badge copy | Chips |
| --- | --- | --- |
| `not_started` | none | none |
| `in_progress` | `N of T logged` (or `N logged`) | none |
| `completed` | `Completed` | none |
| `skipped` | `Skipped` | none |
| `partial` | `Partial` | `N of T logged` + `Ended early` |
| `partial_with_remaining_skipped` | `Partial` | `N of T logged` + `Ended early` |

## Transition rules

- `not_started -> skipped`: User taps **Skip** before any set is logged.
- `not_started -> in_progress`: User logs first set.
- `in_progress -> completed`: Logged set count reaches derived goal target.
- `in_progress -> partial`: User taps **Skip** after logging one or more sets.
- `completed -> partial_with_remaining_skipped`: User can still skip after reaching the set target.
- `skipped -> not_started`: User taps **Unskip** with zero logged sets.
- `partial -> in_progress` or `completed`: User taps **Unskip**. Result depends on whether logged count already satisfies the completion threshold.
- `partial_with_remaining_skipped -> completed`: User taps **Unskip** after hitting target while skipped.

## Guardrails

- The UI must never present contradictory status composition such as `Completed` with `Skipped`, or `Logged` with `Skipped`.
- Any skipped exercise with logged sets must be rendered using explicit partial copy (`Partial`, `N of T logged`, `Ended early`).
- Read-only/resume surfaces must use the shared mapper and must not compose independent logged/skipped copy.
- Quick log is disabled when skipped (`skipped`, `partial`, `partial_with_remaining_skipped`) so actions cannot drift from derived state.
