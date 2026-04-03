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
   - Screen content must not recreate route-level fixed headers when `topChrome` is provided.

4. **Bottom dock slot + measured inset**
   - `bottomDock` renders in a persistent non-scrolling slot below the scroll owner.
   - Shell measures dock height and writes `--app-mobile-bottom-dock-height`.
   - Scroll content automatically receives bottom inset (`dock height + 12px`) so final interactive rows remain fully reachable above the dock.
   - Child lists/editors must not stack legacy `--app-bottom-action-bar-height` padding when rendered inside this shell.
   - Bottom dock spacing must have one owner per screen; inner sections/lists must not add a second dock-height reservation layer.

5. **Bottom actions publishing**
   - Use `PublishBottomActions` / `usePublishBottomActions` for screen-specific actions.
   - `BottomActionsSlot` is shell-owned and should not be embedded in list rows.

## Validation checklist

- Today, Routines, View Day, Edit Day, Add Exercise, and active workout screens keep a single scroll owner.
- No final interactive content is hidden under the bottom dock.
- No top content overlaps safe areas/status chrome.
