# Session Row-State Contract

## Purpose

Active-session exercise rows must render from one canonical row-state mapper so card visuals and attached action rows cannot drift.

## Canonical mapper

- Use `deriveSessionRowState` (`src/lib/session-row-state.ts`) as the single row-state source for active session rows.
- The row state must own all of the following for each visible row:
  - card visual state (`cardState`, `badgeText`)
  - chip/progress copy (`chips`, `progressLabel`)
  - quick-log copy + availability (`quickLogLabel`, `isQuickLogDisabled`, `quickLogDisabledMessage`)
  - skip/unskip action state (`skipActionLabel`)
  - action strip styling (`actionRowClassName`, `quickLogActionClassName`, `skipActionClassName`)

## Rendering rules

- Session list renderers must not derive card badges/chips separately from action-row labels or quick-log disabled messaging.
- `AttachedQuickActionStrip` props should be forwarded from the same `SessionRowState` object used for the card and chips.
- Optimistic skip/unskip and quick-log updates must update row-state inputs (`isSkipped`, `loggedSetCount`) before refresh so the whole row contract updates together.

## State guardrails

- Completed cards never show skipped-only chip/action semantics.
- Skipped cards never show completed-only semantics.
- Partial skipped rows show partial badge and ended-early progress semantics.
- Added-today chip remains a consumer-level extension and must append to canonical chips without changing core semantics.
