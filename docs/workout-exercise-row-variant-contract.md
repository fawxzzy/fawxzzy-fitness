# Workout exercise row card variant contract

This contract canonicalizes workout exercise rows and attached quick actions around one explicit variant model.

## Variants

- `pending`
  - Triggered when a quick-log or skip/unskip action is in-flight for the row.
  - Preserves current row status semantics while reducing action-row emphasis.
- `active`
  - Default render mode for all non-pending rows.
  - Status badge/chip/copy is resolved by the shared execution-state mapper.

## Derived UI contract

`deriveWorkoutExerciseCardVariant` returns the canonical row contract:

- `variant`: `pending | active`
- `cardState`: `default | completed` (derived from shared execution-state mapper)
- `badgeText`: stable top-right badge text
- `chips`: row metadata chips (`skipped`, `loggedProgress`, `endedEarly`, and optional `addedToday` when provided by consumer)
- `skipActionLabel`: `Skip` or `Unskip` for the secondary action
- `actionRowClassName`: action-row emphasis modifier
- `quickLogActionClassName`: quick-log button text emphasis modifier
- `skipActionClassName`: skip/unskip button text emphasis modifier (uses warning tone for `Unskip`)

## Usage notes

- Active workout cards, resume summaries, and Today in-session summaries must all source status composition from `deriveSessionExerciseProgressState` / `deriveReadOnlyExercisePresentation`.
- UI surfaces must not independently combine generic logged and skipped copy.
- `Ended early` chip/copy is only valid for under-target partial state; once target sets are met, rows remain `Completed` even if skip is toggled.
- Session and Today exercise rows should render metadata chips through one shared placement component so badge/chip positions stay stable across variants and wrapped titles.
- Quick-action rows should derive skip/unskip labels and action emphasis from the variant contract without route-local styling branches.
- Scaffold and dock layout concerns are intentionally out of scope for this contract.
