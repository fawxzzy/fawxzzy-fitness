# Session row-state contract

## Objective

Active session list rows must derive visual card state and action-row state from one canonical row view model keyed by stable `session_exercise.id`.

## Contract rules

- Each row maps from one stable identity (`session_exercise.id`), never from list index.
- The following state must be derived together from one view model:
  - card state/badge/chips
  - action-row state
  - quick-log availability and label
  - skip/unskip availability and label
  - disabled-copy messaging
- Optimistic quick-log and skip/unskip updates must patch the full row view model atomically.
- Expanded or selected row identity must stay keyed by stable exercise id so controls do not migrate to neighboring rows during rerenders.

## Guardrails

- Completed rows keep completed semantics even when skipped controls are recoverable.
- Skipped-only controls/copy do not render on non-skipped completed rows.
- Partial rows preserve partial/ended-early chips and disabled copy semantics from the shared execution-state mapper.
