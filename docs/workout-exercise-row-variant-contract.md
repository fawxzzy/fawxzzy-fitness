# Workout exercise row card variant contract

This contract canonicalizes workout exercise rows and attached quick actions around one explicit variant model.

## Variants

- `pending`
  - Triggered when a quick-log or skip/unskip action is in-flight for the row.
  - Preserves current row status semantics while reducing action-row emphasis.
- `logged`
  - Default non-skipped state (including not-yet-logged and logged progress states).
  - Badge and card completion styling continue to come from logged set progress.
- `skipped`
  - Triggered when the exercise is skipped for the session.
  - Must keep an `Unskip` secondary action to preserve recoverability.

## Derived UI contract

`deriveWorkoutExerciseCardVariant` returns the canonical row contract:

- `variant`: `pending | logged | skipped`
- `cardState`: `default | completed` (derived from set progress)
- `badgeText`: stable top-right badge text
- `showSkippedChip`: whether the skipped chip is rendered in row metadata
- `skipActionLabel`: `Skip` or `Unskip` for the secondary action
- `actionLayoutClassName`: action-row emphasis modifier
- `quickLogLabelClassName`: quick-log button text emphasis modifier

## Usage notes

- Session and Today exercise rows should consume this contract instead of inlining skipped/logged conditionals.
- Quick-action rows should derive skip/unskip labels and action emphasis from the variant contract.
- Scaffold and dock layout concerns are intentionally out of scope for this contract.
