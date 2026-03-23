## 2026-03-21 — Today/Routines selector-detail normalization

- Today and Routines now share the same selector/detail mode contract: default mode shows detail content, and selector-open mode replaces that detail region instead of stacking selector + detail together.
- The shared day-list family now lives in `src/components/routines/RoutinesScreenFamily.tsx` and is used by both screens for the day section, list scaffold, and row card treatment; click semantics remain screen-owned through injected callbacks.
- Bottom action rule clarified: primary actions belong on the right, secondary/supporting actions on the left, even when both actions reuse the same shared footer surface.
- After Edit Day and Edit Routine converged, the shared editor-family layer now owns the stable standalone primitives: header shell, section-card shell, day-row visual, and stacked-primary footer wiring; route files keep only screen-specific controls and data flow.
- Failure mode avoided: sibling screens drift into separate day-row implementations and stacked selector/detail panes that increase page height and weaken feature-family recognition.

## 2026-03-21 — Routines modes should share one page-family scaffold

- Both Routines modes now reuse one routines-family scaffold: shared active summary card first, then shared section surfaces with the same heading/meta rhythm, then stacked row cards, with the sticky footer remaining route-owned.
- The day overview stays the canonical baseline, and the routine picker/manage state now expresses its `New Routine` CTA plus routine metadata inside that same section-card/list contract instead of a separate anchored wrapper stack.
- Shared normalization should separate page-family scaffold, shared card/row primitives, and mode-specific data/actions so adjacent states can diverge in meaning without drifting in layout language.
- Failure mode avoided: one-off styling tweaks across sibling modes that still leave duplicated wrappers, nested-content framing drift, and mismatched vertical rhythm.

## 2026-03-21 — View Day should reuse scaffold, not Today CTA ownership

- View Day now reuses the shared app shell, panel rhythm, and top-right Back control while intentionally dropping Today's `Start Workout` CTA model.
- The route keeps a tighter post-nav top spacing and a single `Edit Day` bottom action so it remains a read/edit day detail screen instead of a workout-start surface.
- Shared screen normalization must treat app-shell spacing, page scaffold, and route-specific actions as separate concerns; copying Today's footer contract into View Day is a failure mode, not a normalization goal.

## 2026-03-21 — Nested routine/day Back must target canonical parent routes

- View Day and Edit Day primary Back actions now use deterministic route targets instead of browser-history unwind, so sibling screens cannot trap the user in a View Day ⇄ Edit Day loop.
- Contract: nested product flows should resolve explicit safe `returnTo` first, then fall back to the canonical parent route for that screen family (`/routines` for View Day, `/routines/[id]/edit` for Edit Day).
- Rule: product-critical Back buttons inside nested flows must not rely on `router.back()` as their primary behavior.
- Failure mode avoided: sibling nested screens each pop browser history to the other sibling, causing an endless bounce after transitions like Routine → View Day → Edit Day.

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
