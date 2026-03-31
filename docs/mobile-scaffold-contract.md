# Mobile scaffold contract

This contract defines the canonical mobile page structure for screens with persistent top and/or bottom chrome.

## Rules

1. **One scroll owner per screen**
   - The scaffold (`MobileScreenScaffold`) owns the only vertical scroll container on the page.
   - Screen content should not wrap itself in another full-height `overflow-y-auto` container.

2. **Viewport chrome vs content**
   - `topChrome` is viewport chrome and is anchored independently from list content.
   - Bottom actions are viewport chrome, rendered through the bottom action slot/dock and not as list rows.

3. **Measured inset behavior**
   - The scaffold measures `topChrome` height and automatically offsets scroll content by that amount.
   - Bottom inset is reserved from the measured bottom action bar height (`--app-bottom-action-bar-height`) plus safe-area bottom inset.
   - Final interactive rows must remain fully visible above dock chrome.

## Recommended composition

- Wrap screen body in `MobileScreenScaffold` (or `ScrollScreenWithBottomActions` convenience wrapper).
- Publish bottom actions with `PublishBottomActions`/`usePublishBottomActions`.
- Keep route-level shells (`AppShell`, `MainTabScreen`) focused on page frame and navigation offsets only.
