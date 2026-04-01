# Day Editor Mode Matrix

This matrix defines the canonical UI contract for Edit Day modes. The screen should derive behavior from one explicit mode value, not from ad hoc boolean combinations.

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
2. `adding_exercise` suppresses CTA repetition while the route transition to Add Exercise is in-flight.
3. `editing_exercise` and `reorder` are mutually exclusive.
4. Header actions and bottom dock variants are mode-owned selectors and must not be computed with route-local boolean chains.
