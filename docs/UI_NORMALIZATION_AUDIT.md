# UI Normalization Audit

## Completed Alignments

- **View Day → Today screen pattern:** complete.
  - Kept the shared app-shell top nav treatment and removed only the unwanted route-local extra header chrome, so the screen stays in the main tab-family shell.
  - Rebuilt the View Day content header to match the Today title/subtitle hierarchy using the shared `AppHeader` + `AppPanel` scaffold.
  - Reused the Today-style exercise row shell and bottom split action bar (`Start Workout` + `Select Day`) instead of keeping route-local header actions.
  - Follow-up fix: kept the shared visual/button shell, but moved start-session ownership behind a client-safe API boundary so the normalized route does not pass server callbacks through client props.

## Playbook Notes

- **Pattern:** High-frequency screens should converge on a shared layout system instead of introducing parallel variants.
- **Rule:** Do not introduce new layout primitives when an existing screen pattern already solves the use case.
- **Failure Mode:** Creating near-identical screens with slight structural differences leads to long-term UI drift and component fragmentation.
