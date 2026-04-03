# Day Editor Mode Matrix

This matrix defines the canonical UI contract for Edit Day modes. The screen should derive behavior from one explicit mode value, not from ad hoc boolean combinations.

Implementation ownership:
- mode resolver + selectors: `src/features/day-editor/mode.ts`
- CTA dock variant resolver: `src/shared/day-cta-dock/dayCtaDockState.ts`
- header meta resolver: `src/shared/day-header/dayHeaderSummary.ts`
- header container geometry: shared header family via `SharedScreenHeader` / `RoutineEditorPageHeader`

## Canonical modes

- `default`
- `reorder`
- `rest_day`
- `editing_exercise`
- `adding_exercise`

## Mode visibility and behavior

| Mode | Header action | Section visibility | Bottom dock | Exercise list interactivity | Add Exercise CTA |
| --- | --- | --- | --- | --- | --- |
| `default` | `Reorder` | Planned workout + exercise list | Single primary CTA (`Add Exercise`) | Interactive (tap opens inline editor) | Visible |
| `reorder` | `Done` (reorder toggle) | Planned workout + exercise list (drag handles active) | Hidden | Non-interactive row press; drag reorder only | Hidden |
| `rest_day` | None | Planned workout section shows rest-day state card | Hidden | Not interactive (list hidden) | Hidden |
| `editing_exercise` | Back/close editor | Planned workout with single expanded exercise editor | Two-action dock (`View Exercise`, `Delete Exercise`) | Interactive only for the active inline editor | Hidden |
| `adding_exercise` | None | Planned workout content remains stable while navigation is in-flight | Hidden while add transition is active | Not interactive for add CTA tap target | Hidden (disabled during push) |

## Determinism rules

1. `rest_day` has top priority; it suppresses reorder, inline-edit, and add-CTA behaviors.
2. Rest toggle behavior is non-destructive: enabling rest hides planned exercises but preserves stored rows.
3. Rest-day state UI must be explicit (never blank/dead space): show a rest editor card with preservation guidance.
4. `adding_exercise` suppresses CTA repetition while the route transition to Add Exercise is in-flight.
5. `editing_exercise` and `reorder` are mutually exclusive.
6. Header actions and bottom dock variants are mode-owned selectors and must not be computed with route-local boolean chains.

## Reorder row mobile layout contract

In `reorder` mode, Edit Day rows should switch to a dedicated compact reorder layout instead of the normal interactive exercise card.

- **Column contract (left → right):**
  1. fixed 44px thumbnail column
  2. flexible text column (exercise name + goal metadata)
  3. compact circular order badge
  4. dedicated drag handle column
- **Interaction contract:**
  - normal row tap/disclosure behavior is disabled while reorder mode is active
  - drag handle is the only reorder affordance
- **Text contract:**
  - exercise names and metadata must wrap to additional lines instead of clipping
  - avoid aggressive word fragmentation; preserve readable word boundaries whenever possible
- **Order badge contract:**
  - use stable, high-contrast compact numbering
  - keep badge legible during drag transitions (tabular numerals + fixed badge box)
