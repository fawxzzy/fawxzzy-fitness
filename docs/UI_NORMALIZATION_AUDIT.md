## 2026-03-21 — View Day should reuse scaffold, not Today CTA ownership

- View Day now reuses the shared app shell, panel rhythm, and top-right Back control while intentionally dropping Today's `Start Workout` CTA model.
- The route keeps a tighter post-nav top spacing and a single `Edit Day` bottom action so it remains a read/edit day detail screen instead of a workout-start surface.
- Shared screen normalization must treat app-shell spacing, page scaffold, and route-specific actions as separate concerns; copying Today's footer contract into View Day is a failure mode, not a normalization goal.

# UI Normalization Audit

## Completed Alignments

- **View Day → shared workout-screen scaffold:** complete.
  - Kept the shared app-shell top nav treatment and reused the same `AppHeader` + `AppPanel` spacing/list rhythm as Today so the screen stays inside the normalized page family.
  - Reused the shared exercise-row shell and route-safe day loading, but explicitly removed Today's workout-start CTA ownership from View Day.
  - View Day now owns its own semantics: tighter post-nav spacing, a day-first title, the top-right Back control, and a single `Edit Day` footer action.
  - Follow-up fix: shared scaffold reuse remains decoupled from route actions, so View Day no longer implies that layout normalization should inherit Today's `Start Workout` contract.

## Playbook Notes

- **Pattern:** Normalize by layer: shared app shell first, shared content scaffold second, route-specific title/actions last.
- **Rule:** Do not introduce new layout primitives when an existing screen pattern already solves the shell/scaffold problem, but do preserve route-owned identity and action semantics.
- **Failure Mode:** Copying another screen's full contract instead of only its reusable scaffold erases route-specific title meaning and action ownership.
