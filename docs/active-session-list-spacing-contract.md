# Active Session List Spacing Contract

## Objective
- Keep the active workout list visually continuous from the header down to the timer dock.
- Prevent stretched blank regions in both collapsed list mode and expanded exercise-log mode.

## Contract
- The active session screen content column must not use `min-h-full` on list wrappers.
- Timer dock clearance is owned by the mobile shell wrapper (`--app-mobile-bottom-dock-height`) and applies once per screen.
- The collapsed exercise list keeps only intrinsic row spacing; it must not add dock-height padding.
- The session shell keeps dock-height reservation globally; inner list components should not stack a second legacy bottom-action inset.
- Exercise card + quick-log strip spacing stays compact:
  - list row gap: `space-y-1.5`
  - quick-log strip top offset: `mt-0.5`
  - quick-log strip vertical padding: `py-1`
- Expanded exercise-log mode uses content-driven height (`min-h-0` on logger column; no forced full-height stretching).

## Regression checks
- Mid-list content appears continuous with no large dead band before the dock.
- Tail rows remain fully tappable and visible above the timer dock.
- Collapsed and expanded states preserve stable vertical rhythm when toggling.
