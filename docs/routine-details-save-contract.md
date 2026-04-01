# Routine Details Save Contract

## Scope

Applies to both routine details flows:
- `Create Routine` (`/routines/new`)
- `Edit Routine` (`/routines/[id]/edit`)

## Contract

Routine details uses **manual save** as the explicit save contract.

### Create Routine
- Changes are local until the user taps **Create Routine**.
- The primary CTA is disabled until fields are valid.
- Validation rules match the server action contract (`name`, `cycleLengthDays`, `startWeekday`, `timezone`, `weightUnit`).

### Edit Routine
- Changes are local until the user taps **Save Changes**.
- The primary CTA is disabled until the form is both:
  - valid, and
  - dirty (different from the loaded routine snapshot).
- Save status is explicit:
  - `Unsaved changes` while dirty
  - `All changes saved` while clean
- Back/navigation protection is enabled while dirty:
  - in-app back prompts for discard via the existing routine editor confirm sheet
  - browser/tab unload prompts when edits are unsaved

### Destructive Action Separation
- **Delete Routine** remains a destructive action and is kept separate from the primary save action.
- Delete never shares the primary CTA role or label.

## Shared Form Shape and Validation

Create and edit share one field layout and one client validation module:
- Routine name
- Cycle length (days)
- Starts on
- Timezone
- Weight unit

Both flows use the same draft type and validation helpers in `src/lib/routine-details-form.ts`.
