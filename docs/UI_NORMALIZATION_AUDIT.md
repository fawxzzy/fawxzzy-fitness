# UI Normalization Audit

## Completed Alignments

- **View Day → shared workout-screen scaffold:** complete.
  - Kept the shared app-shell top nav treatment and reused the same `AppHeader` + `AppPanel` spacing/list rhythm as Today so the screen stays inside the normalized page family.
  - Preserved shared start-session plumbing and the Today-style exercise row shell, but stopped short of copying Today's full route contract.
  - Restored View Day-specific ownership for title and actions: day-first title semantics, top-right Back control, and bottom split actions of `Start Workout` + `Edit Day`.
  - Follow-up fix: kept the shared visual/button shell, but moved start-session ownership behind a client-safe API boundary so the normalized route does not pass server callbacks through client props.

## Playbook Notes

- **Pattern:** Normalize by layer: shared app shell first, shared content scaffold second, route-specific title/actions last.
- **Rule:** Do not introduce new layout primitives when an existing screen pattern already solves the shell/scaffold problem, but do preserve route-owned identity and action semantics.
- **Failure Mode:** Copying another screen's full contract instead of only its reusable scaffold erases route-specific title meaning and action ownership.
