# Routines Screen IA Contract

This contract defines the user-facing information architecture for the `/routines` screen.

## Section map

The `/routines` screen is organized into three user-facing sections:

1. `Current routine`
2. `Routine days`
3. `All routines` (when expanded via the bottom dock control)

The screen shell, spacing rhythm, and bottom dock behavior should remain consistent with existing routines page-family conventions.

## Current routine section

- The first section represents the currently selected routine.
- Title copy: `Current routine`.
- It should always present the selected routine name and a concise cycle summary (training/rest breakdown).
- Active routine state should be explicitly labeled with `ACTIVE`.

## Routine days section

- Title copy: `Routine days`.
- Section metadata should be human-facing count copy (`1 day`, `7 days`) rather than internal labels.
- The section should remain visible even when the all-routines switcher is expanded.

## All routines section

- Routine switching belongs to an explicit `All routines` section.
- Section metadata should communicate count in natural language (for example, `4 routines total`) rather than internal label formats.
- Metadata should explicitly state duplication behavior: the current routine appears in both `Current routine` and `All routines`.
- The selected routine in the list should use the `ACTIVE` label.

## Label semantics

Use uppercase status labels consistently across routine/day cards:

- `ACTIVE`: routine currently selected or day currently in session.
- `TODAY`: day that matches the user’s current routine day.
- `REST DAY`: scheduled non-training day.
- `COMPLETED`: optional status for days already completed today.

Avoid mixed casing and internal shorthand labels on this screen.
