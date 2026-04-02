# Routines Screen IA Contract

This contract defines the user-facing information architecture for the `/routines` screen.

## Screen modes

The `/routines` screen is mode-driven and should render one clear content mode at a time:

1. `default/current routine days` mode: current routine hero + `Routine days` + `All routines` (collapsed)
2. `browse/switch routines` mode: current routine hero + expanded `All routines` list (`Routine days` hidden)
3. `summary` fallback mode (no active routine): current routine hero + `All routines` (collapsed, list hidden)

`browse/switch routines` and `selected routine days` content must never render at full strength simultaneously. When the `All routines` list is expanded, the full `Routine days` section must not render below it.

The screen shell, spacing rhythm, and bottom dock behavior remain consistent with existing routines page-family conventions.

## Current routine section

- The first section is always the `Current routine` hero.
- Hero hierarchy is entity-first:
  1. primary hero title: active routine name
  2. secondary hero metadata: concise stats (for example, `5 training • 2 rest`)
  3. status chip: `ACTIVE` when a routine is selected
- `Current routine` is a section label (eyebrow), not the dominant hero title.
- Routine identity belongs in the hero content area (not helper/explanatory copy).

## Routine days section

- Title copy: `Routine days`.
- Section metadata should be human-facing count copy (`1 day`, `7 days`) rather than internal labels.
- The section renders only in `selected routine days` mode.

## All routines section

- Routine switching belongs to an explicit `All routines` section.
- Section metadata should communicate count in natural language (`4 routines total`).
- Remove explanatory helper paragraphs under the section; collapsed state should use either simple count-only metadata or no helper copy.
- The selected routine in the list should use the `ACTIVE` label.

## Label semantics

Use uppercase status labels consistently across routine/day cards:

- `ACTIVE`: routine currently selected or day currently in session.
- `TODAY`: day that matches the user’s current routine day.
- `REST DAY`: scheduled non-training day.
- `COMPLETED`: optional status for days already completed today.

Avoid mixed casing and internal shorthand labels on this screen.
