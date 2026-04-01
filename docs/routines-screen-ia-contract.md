# Routines Screen IA Contract

This contract defines the user-facing information architecture for the `/routines` screen.

## Top summary section

- The first section represents the currently selected routine.
- Title copy: `Current Routine`.
- It should always present the selected routine name and a concise cycle summary (training/rest breakdown).
- Active routine state should be explicitly labeled with `ACTIVE`.

## All-routines section

- Routine switching belongs to an explicit `All routines` section.
- Section metadata should communicate count in natural language (for example, `4 total`) rather than internal label formats.
- The selected routine in the list should use the `ACTIVE` label.

## Label semantics

Use uppercase status labels consistently across routine/day cards:

- `ACTIVE`: routine currently selected or day currently in session.
- `TODAY`: day that matches the user’s current routine day.
- `REST DAY`: scheduled non-training day.
- `COMPLETED`: optional status for days already completed today.

Avoid mixed casing and internal shorthand labels on this screen.
