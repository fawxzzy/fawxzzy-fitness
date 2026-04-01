# Day Editor Reorder Row Layout Contract

## Scope
Applies to Edit Day reorder mode rows in `src/app/routines/[id]/edit/day/[dayId]/ReorderExerciseRow.tsx`.

## Layout guarantees
Each reorder row MUST render as a four-zone grid so mobile readability is stable during drag interactions:

1. **Fixed thumbnail area**
   - 44px square icon shell.
   - Left aligned lane reserved for image only.
2. **Flexible text column**
   - Exercise title and metadata stack vertically.
   - Column must use `minmax(0, 1fr)` behavior.
   - Wrapping must prefer natural word boundaries while still allowing very long tokens to wrap without overflow.
3. **Compact order badge**
   - Always visible circular/rounded badge.
   - Supports multi-digit indices with tabular numerals.
4. **Dedicated drag handle area**
   - Fixed touch target lane that does not overlap text.
   - Drag affordance remains readable while dragging.

## Reorder-mode affordances
In reorder mode, rows intentionally omit normal-card affordances from editable cards (expanded forms, secondary actions, and card content not required for ordering).

## Mobile readability requirements
- Long names such as "Weighted Pull-Up", "Dumbbell Curl", and "Hammer Curl" must remain legible on narrow widths.
- Metadata text must wrap without clipping.
- Order label and drag handle must stay visible while an item is actively dragged.
