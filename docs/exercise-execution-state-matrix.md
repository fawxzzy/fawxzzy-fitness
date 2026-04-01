# Exercise execution state matrix

This matrix is the canonical mapping for session exercise presentation. It is derived from domain values (`loggedSetCount`, `isSkipped`, and set targets) and is the only source used by exercise cards for badges, chips, and action availability.

## Inputs

- `loggedSetCount`: Number of logged sets for the exercise in the active session.
- `isSkipped`: Session-level skip flag.
- `targetSetsMin` / `targetSetsMax`: Used to derive completion target when available.

## Derived states and UI mappings

| Derived state | Domain condition | Badge | Chip | Card tone | Skip action | Quick log action |
| --- | --- | --- | --- | --- | --- | --- |
| `untouched` | `loggedSetCount = 0` and `isSkipped = false` | none | none | default | `Skip` (enabled) | enabled |
| `partial` | `loggedSetCount > 0` and `isSkipped = false` and target not reached | `N logged` | none | default | `Skip` (enabled) | enabled |
| `completed` | `loggedSetCount >= goalSetTarget` and `isSkipped = false` | `N logged` | none | completed | `Skip` (enabled) | enabled |
| `skipped` | `loggedSetCount = 0` and `isSkipped = true` | none | `Skipped` | default | `Unskip` (enabled) | disabled |
| `partialSkipped` | `loggedSetCount > 0` and `isSkipped = true` | `N logged` | `Partially logged, then skipped` | default | `Unskip` (enabled) | disabled |

## Transition rules

- `untouched -> skipped`: User taps **Skip** before any set is logged.
- `untouched -> partial`: User logs first set.
- `partial -> completed`: Logged set count reaches derived goal target.
- `partial -> partialSkipped`: User taps **Skip** after logging one or more sets.
- `completed -> partialSkipped`: User can still skip a completed exercise; state becomes explicitly `partialSkipped` instead of mixed `logged + skipped` semantics.
- `skipped -> untouched`: User taps **Unskip** with zero logged sets.
- `partialSkipped -> partial` or `completed`: User taps **Unskip**. Result depends on whether logged count already satisfies the completion threshold.

## Guardrails

- The UI must never present plain `logged` and plain `skipped` simultaneously.
- Any skipped exercise with logged sets must be rendered as `partialSkipped` with explicit language.
- Quick log is disabled when skipped (`skipped` or `partialSkipped`) so actions cannot drift from derived state.
