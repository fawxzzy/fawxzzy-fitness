# Mobile Regression Fixture Inventory

Deterministic fixture scenarios that backfill the pre-fix screenshot set:

- `today-default`
- `today-in-session-summary`
- `active-workout-session`
- `routines-current-view`
- `routines-list-view`
- `view-day`
- `edit-day-default`
- `edit-day-reorder`
- `edit-day-rest`
- `edit-day-edit-exercise`
- `edit-day-add-exercise`
- `create-routine`
- `edit-routine`
- `add-exercise-default`

Contracts asserted by visual-regression tests:

- safe-area correctness
- dock overlap prevention
- card state correctness
- reorder text stability
- goal form readability
- mobile chrome/day-editing invariants (rest filler removal, pinned headers, manual reorder clamping, routine dock parity, single history header)
