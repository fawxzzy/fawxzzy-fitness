# Mobile regression fixtures

This fixture suite turns the known pre-fix mobile screenshots into deterministic route-level regression coverage.

## Protected screen/state contracts

- `today-selected-day`
  - Guards default Today selected-day rendering.
  - Contract: title stays below safe area; final interactive row remains above bottom dock.
- `today-day-picker-open`
  - Guards Today day-picker expanded state.
  - Contract: picker state keeps interactive rows reachable above dock.
- `today-rest-day`
  - Guards Today rest-day state.
  - Contract: rest-day rendering still respects safe-area and dock boundaries.
- `today-in-session-summary`
  - Guards Today in-session summary state.
  - Contract: summary state cannot accidentally render impossible status combinations.
- `active-workout-session`
  - Guards active workout session overview.
  - Contract: impossible `logged + skipped` plain mixed state is blocked unless explicitly modeled.
- `add-exercise-default`
  - Guards default Add Exercise list state.
  - Contract: filter chips never clip off-screen unintentionally.
- `add-exercise-filters-expanded`
  - Guards Add Exercise with expanded filters.
  - Contract: expanded chips stay inside viewport bounds.
- `add-exercise-long-title-metadata`
  - Guards long-title and long-metadata card rendering.
  - Contract: long labels stay stable (no narrow shredded metadata columns).
- `add-exercise-goal-configuration`
  - Guards Add Exercise goal configuration step.
  - Contract: dock spacing and top safe-area remain valid while configuring goals.
- `exercise-detail-view`
  - Guards exercise detail/view route.
  - Contract: header/title remains clear of system safe-area.

## Test runner

Run the fixture suite with:

```bash
node --test src/lib/dev/mobile-regression-fixtures.test.ts
```
