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

## Responsive card and chip contract (mobile add-exercise flows)

- Result cards must keep a stable three-zone layout at narrow widths:
  1. **fixed media/thumb column** (non-shrinking),
  2. **flexible text column** (`minmax(0, 1fr)` + `break-words`),
  3. **reserved action/badge column** with minimum width so title/subtitle never collide with actions.
- Metadata/subtitle content should wrap naturally (no forced mid-word fragmenting) and remain readable under long exercise names or dense equipment/muscle/pattern combinations.
- Taxonomy/filter chips must either fully wrap within their container or intentionally scroll with visible affordance. Do not use hidden horizontal clipping that cuts chips at the right edge.
- Add-exercise screens must rely on scaffold bottom inset reservation so selected cards and first/last library rows remain visible above dock actions.

### Implementation notes

- Use a **three-column card grid** for result/selected cards on narrow widths:
  - media column: fixed width (non-shrinking thumb/icon),
  - content column: `minmax(0, 1fr)` with normal word breaks and multi-line wrapping,
  - action column: fixed minimum width for badges/actions (for example, Select/Selected state).
- Avoid aggressive break rules (for example `break-all`) on exercise names and metadata; long labels should wrap naturally and stay readable.
- Chip rows should prefer `flex-wrap` with `max-w-full` chip buttons so long labels wrap inside the chip rather than clipping at the container edge.
