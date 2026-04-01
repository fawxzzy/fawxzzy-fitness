# Day Detail Contract: Read-only vs Editable

## Purpose

Define one canonical day-detail base for routine day rendering and make edit behavior an explicit operational variant.

## Canonical base (View Day)

View Day is the reference day-detail surface and should remain:

- read-only,
- minimal,
- summary-first,
- free of inline mutation controls.

The canonical base includes:

1. Day hero identity (eyebrow/title/subtitle).
2. Day summary status messaging (rest/partial/invalid/runnable context).
3. Exercise list rendering rhythm (card spacing, icon/title/summary structure).

## Editable operational variant (Edit Day)

Edit Day layers operations on top of the same day-detail base rather than mutating the base contract.

- Editable behavior is mode-driven (`default`, `reorder`, `rest_day`, `editing_exercise`, `adding_exercise`).
- Editing controls (reorder handles, inline goal form, destructive actions, add CTA) are operational overlays.
- Read-only assumptions must not leak into editable mode behavior.

## Shared list rendering contract

Both View Day and Edit Day must use the same day-detail list shell for non-reorder exercise rows:

- same card layout, row spacing, icon geometry, and summary placement,
- mode-specific behavior supplied by explicit props (`read_only` vs `editable`),
- edit-only expanded body injected as an explicit render path.

## Non-goals

- Do not alter route shell ownership (screen scaffold, bottom dock, and safe-area action behavior stay route-owned).
- Do not collapse edit operations into View Day.
