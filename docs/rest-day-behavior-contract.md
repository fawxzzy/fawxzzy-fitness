# Rest-Day Behavior Contract

## Rule: rest toggle is non-destructive

Canonical implementation contract lives in `src/features/day-state/restDayBehavior.ts` with:
- `togglePolicy: preserve_hidden`
- `requiresConfirmation: false`

When a routine day is toggled to **Rest**:

- Existing planned exercises are **preserved** in `routine_day_exercises`.
- Exercise rows are **hidden** on edit/view/today surfaces while rest mode is active.
- Turning rest mode back **off** restores the preserved exercises without additional recovery steps.
- No destructive confirmation is required because no exercise data is removed by this toggle.

## UI contract

- Edit Day shows explicit helper copy near the Rest toggle: enabling rest hides exercises without deleting them.
- Edit Day planned-workout section renders a dedicated rest-day state card (not dead space).
- Rest-day state card copy explicitly states whether preserved exercises exist and that they are hidden.

## Day summary taxonomy glossary

Use one vocabulary family for day summaries across View Day, Edit Day, and Today:

- `rest` → label as **"Rest day"**
- `strength` → count label such as **"3 strength"**
- `cardio` → count label such as **"2 cardio"**
- mixed days → deterministic aggregate format (for example `5 total • 3 strength • 2 cardio`)
- unclassified metadata bucket → label as **"unknown"** (never `other`)

## Examples

- Rest day with preserved exercises: `Rest day`
- Strength-only day: `4 strength`
- Cardio-only day: `2 cardio`
- Mixed day with unknowns: `6 total • 3 strength • 2 cardio • 1 unknown`
