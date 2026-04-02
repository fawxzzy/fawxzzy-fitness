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
| `completed` | `loggedSetCount >= goalSetTarget` (skip flag does not override completed semantic) |
| `skipped` | `loggedSetCount = 0` and `isSkipped = true` |
| `partial` | `loggedSetCount > 0` and `isSkipped = true` and target not reached |

## Presentation rules (active workout cards)

| Domain state | Badge copy | Chips | Allowed actions |
| --- | --- | --- | --- |
| `not_started` | none | none | `Skip`, quick log enabled |
| `in_progress` | `N of T logged` (or `N logged`) | none | `Skip`, quick log enabled |
| `completed` | `Completed` | none | `Skip` when not skipped, `Unskip` when skipped after completion; quick log disabled while skipped |
| `skipped` | none | `Skipped` | `Unskip`, quick log disabled |
| `partial` | `Partial` | `N of T logged` + `Ended early` | `Unskip`, quick log disabled |

## Presentation rules (read-only summary/resume cards)

Canonical read-only presentation states:

| Read-only state | Meaning |
| --- | --- |
| `not_started` | Exercise was untouched in this session. |
| `in_progress` | Exercise has logged sets and remains active. |
| `completed` | Goal threshold reached; this stays the primary semantic state even if the row was later marked skipped. |
| `skipped` | Skipped before any logging. |
| `partial` | Logged progress exists and exercise was ended early in-session. |

| Domain state | Badge copy | Chips |
| --- | --- | --- |
| `not_started` | none | none |
| `in_progress` | `N of T logged` (or `N logged`) | none |
| `completed` | `Completed` | none |
| `skipped` | `Skipped` | none |
| `partial` | `Partial` | `N of T logged` + `Ended early` |

## Transition rules

- `not_started -> skipped`: User taps **Skip** before any set is logged.
- `not_started -> in_progress`: User logs first set.
- `in_progress -> completed`: Logged set count reaches derived goal target.
- `in_progress -> partial`: User taps **Skip** after logging one or more sets.
- `completed -> completed` (with skipped flag): User can still tap **Skip** after reaching target; copy remains `Completed`.
- `skipped -> not_started`: User taps **Unskip** with zero logged sets.
- `partial -> in_progress` or `completed`: User taps **Unskip**. Result depends on whether logged count already satisfies the completion threshold.
- `completed` with skipped flag -> `completed` without skipped flag: User taps **Unskip** after hitting target while skipped.

## Guardrails

- The UI must never present contradictory status composition such as `Partial` + `N of N logged` + `Ended early`.
- `Ended early` is reserved for true under-target partials (`loggedSetCount > 0`, `isSkipped = true`, target not reached).
- Read-only/resume surfaces must use the shared mapper and must not compose independent logged/skipped copy.
- Quick log is disabled whenever the skip flag is on (`skipped`, `partial`, or `completed` with skipped flag) so actions cannot drift from derived state.
