# UI Normalization Audit

## Completed Alignments

- **View Day → Today screen pattern:** complete.
  - Removed the View Day header-level/top-nav treatment so the screen now starts at the safe-area top without the tab header or reserved tab offset.
  - Rebuilt the View Day header to match the Today title/subtitle hierarchy using the shared `AppHeader` + `AppPanel` scaffold.
  - Reused the Today-style exercise row shell and bottom split action bar (`Start Workout` + `Select Day`) instead of keeping route-local header actions.

## Playbook Notes

- **Pattern:** High-frequency screens should converge on a shared layout system instead of introducing parallel variants.
- **Rule:** Do not introduce new layout primitives when an existing screen pattern already solves the use case.
- **Failure Mode:** Creating near-identical screens with slight structural differences leads to long-term UI drift and component fragmentation.
