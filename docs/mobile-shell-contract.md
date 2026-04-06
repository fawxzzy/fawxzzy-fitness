# Mobile shell contract

The canonical mobile shell for route surfaces with persistent top chrome and/or bottom dock is `MobileScreenShell` (consumed by `ScrollScreenWithBottomActions`).

## Contract

1. **Single scroll owner**
   - `ScrollContainer` inside `MobileScreenShell` is the only vertical scroll owner.
   - Top chrome and bottom dock are siblings of the scroll container, not children inside the list content tree.

2. **Safe-area ownership**
   - `AppShell` owns global safe-area tokens (`--app-safe-*`) and top offset contracts.
   - `ScreenScaffold`/header spacing tokens may add only rhythm spacing, never additional safe-area inset math.
   - Top safe-area spacing must have one owner per screen; do not stack route-local `safe-area` padding over shell-provided offset.
   - Dock chrome uses shell-safe-area spacing through shared bottom action surface tokens.

3. **Top chrome slot**
   - `topChrome` renders in a persistent non-scrolling slot above the scroll owner.
   - Use this slot for global/top-level navigation chrome.
   - Shell applies one shared top-chrome-to-content rhythm gap via `--app-top-chrome-content-gap` (default `10px`).
   - Screen content must not recreate route-level fixed headers when `topChrome` is provided.

4. **Floating header slot (optional)**
   - `floatingHeader` renders in a persistent non-scrolling slot between top chrome and scroll content.
   - Use this for screen-specific identity/header cards (e.g., Routine Details, Save Set, History control surfaces) that should remain pinned while content scrolls.
   - Do not keep these header cards inside the list/content scroll subtree.
   - `SharedScreenHeader` rendered inside scroll content is a deprecated pattern; `MobileScreenShell` emits a dev warning when it detects this placement.
   - When `topChrome` and `floatingHeader` both render, shell owns a single rhythm gap between them via `--app-top-chrome-floating-header-gap` (default `8px`).
   - When a screen has **no** `topChrome`, standalone safe-top inset is owned by the floating-header slot; scroll content must not add a second standalone safe-top pad.

5. **Bottom dock slot + measured inset**
   - `bottomDock` renders in a persistent non-scrolling slot below the scroll owner.
   - Shell measures dock height and writes `--app-mobile-bottom-dock-height`.
   - Scroll content automatically receives bottom inset (`dock height + --app-mobile-dock-clearance-gap`, default `6px`) so final interactive rows remain fully reachable above the dock.
   - Child lists/editors must not stack legacy `--app-bottom-action-bar-height` padding when rendered inside this shell.
   - Bottom dock spacing must have one owner per screen; inner sections/lists must not add a second dock-height reservation layer.

6. **Bottom actions publishing**
   - Use `PublishBottomActions` / `usePublishBottomActions` for screen-specific actions.
   - `BottomActionsSlot` is shell-owned and should not be embedded in list rows.


7. **Bottom-action semantic intents**
   - Bottom dock actions must use shared semantic intents through `BottomDockButton` / `DockButton` (`intent` prop), not route-local color classes.
   - Intent map: `positive` (green), `info` (blue), `toggleInactive` (faded yellow), `toggleActive` (strong yellow), `danger` (red).
   - Pattern: `intent -> shared primitive -> surface label mapping`.

## Validation checklist

- Today, Routines, View Day, Edit Day, Add Exercise, and active workout screens keep a single scroll owner.
- Canonical layered mobile chrome order is: top nav (`topChrome`) → optional floating header (`floatingHeader`) → scroll layer (`ScrollContainer`) → bottom action dock (`bottomDock`/published actions).
- No final interactive content is hidden under the bottom dock.
- No top content overlaps safe areas/status chrome.
- Standalone screens apply top safe-area exactly once: either on `floatingHeader` (if present) or on scroll content when no pinned header chrome exists.


## Adoption status
- Shell adoption is **COMPLETE** across major mobile routes.
- All headers must use `floatingHeader`; scroll headers are deprecated.
- In development, `MobileScreenShell` warns when a `SharedScreenHeader` is rendered inside scroll content instead of `floatingHeader`.
