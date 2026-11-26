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
   - Bottom dock wrappers use shell-safe-area spacing only; action styling is owned by the shared no-container bottom action pattern.

3. **Top chrome slot**
   - `topChrome` renders in a persistent non-scrolling slot above the scroll owner.
   - Use this slot for global/top-level navigation chrome.
   - Shell applies one shared top-chrome-to-content rhythm gap via `--app-top-chrome-content-gap` (default `10px`).
   - Screen content must not recreate route-level fixed headers when `topChrome` is provided.

4. **Floating header slot (optional)**
   - `floatingHeader` renders in a persistent non-scrolling slot between top chrome and scroll content.
   - Use this for screen-specific identity/header cards (e.g., Routine Details, Save Set, History control surfaces) that should remain pinned while content scrolls.
   - Do not keep these header cards inside the list/content scroll subtree.
   - A `ScreenHeader` rendered inside scroll content is a deprecated pattern; `MobileScreenShell` emits a dev warning (with `NEXT_PUBLIC_DEBUG_MOBILE_SHELL=1`) when it finds a `[data-screen-header]` there.
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
   - Intent map: `positive` owns the accent fill, `info` uses the muted secondary surface, `toggleInactive` uses the muted secondary surface, `toggleActive` uses the muted secondary surface with restrained active emphasis, and `danger` uses the muted secondary surface with destructive text/border.
   - Pattern: `intent -> shared primitive -> surface label mapping`.
   - Usage note: color follows `intent`; label follows the owning surface/workflow copy.

## Bottom tab bar

One bar (`AppTabBar`, `src/components/AppTabBar.tsx`), mounted once in the root layout as an in-flow sibling after `<main id="app-main">`. `<main>` shrinks by its height, so every screen (and its bottom dock) ends above the bar and nothing scrolls behind it. The bar carries `env(safe-area-inset-bottom)` itself; while it is on screen `body:has(> [data-app-tab-bar]) #app-main` sets `--app-dock-safe-padding-bottom: 2px`, so a dock above it does not add the home-indicator inset a second time. Hidden = not rendered (no node), so the rule switches off with it.

Where it shows is decided by ONE function, `resolveAppTabBarVisibility({ pathname, suppressed, keyboardOpen })` in `src/lib/app-tabs.ts` (`classifyAppRoute` + two overrides). Unit table: `src/lib/app-tabs.test.ts` (`VISIBILITY_TABLE`, keep in step with this one).

| Kind | Routes | Bar |
|---|---|---|
| tab | `/today`, `/routines`, `/history`, `/settings` | visible |
| child (read-only) | `/routines/<id>` (routine home), `/routines/workout-plans` (Days), `/history/<id>` (session detail), `/history/exercises`, `/history/progression`, `/account` (Settings is active) | visible |
| workout | `/session/**` (live workout, its add exercise) | hidden |
| flow | `/routines/new`, `/routines/<id>/edit/**` (editors, add exercise), `/routines/<id>/new-day`, `/routines/<id>/new-workout-plan`, `/routines/<id>/days/**` | hidden |
| outside (fail closed) | `/`, auth (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/**`), `/entry`, `/install`, `/curated-onboarding`, `/review/**`, `/privacy`, `/terms`, `/offline`, `/exercises/**`, `/dev/**`, anything unlisted | hidden |

Overrides (both hide, never show): `suppressed` (an in-route editor calls `useHideAppTabBar(true)`: History session Edit with its Cancel / Save dock) and `keyboardOpen` (an editable element is focused AND the layout viewport shrank by more than 150px; iOS and Chrome Android resize only the visual viewport, so there the bar simply stays under the keyboard and nothing jumps). Confirm sheets and pickers are modals over the screen and cover the bar. `/dev` fixtures show the bar as their product route with `AppTabBarPreview` (ignored outside `/dev`); dev never prefetches.

## Bottom Action Pattern (No Container)

- Bottom action wrappers provide spacing only.
- No parent surface, border, blur, glow, or highlight plate.
- Primary action uses `--accent` and `--text-on-accent`.
- Secondary action uses `--surface-muted` with a subtle border.
- Preserve asymmetric width: primary wider, secondary narrower.
- Press behavior: slight scale + slight darken only.
- No idle glow, bloom, or outer highlight.

## Validation checklist

- Today, Routines, View Day, Edit Day, Add Exercise, and active workout screens keep a single scroll owner.
- Canonical layered mobile chrome order is: top nav (`topChrome`) → optional floating header (`floatingHeader`) → scroll layer (`ScrollContainer`) → bottom action dock (`bottomDock`/published actions).
- No final interactive content is hidden under the bottom dock.
- No top content overlaps safe areas/status chrome.
- Standalone screens apply top safe-area exactly once: either on `floatingHeader` (if present) or on scroll content when no pinned header chrome exists.


## Adoption status
- Shell adoption is **COMPLETE** across major mobile routes.
- All headers must use `floatingHeader`; scroll headers are deprecated.
- In development, `MobileScreenShell` warns (with `NEXT_PUBLIC_DEBUG_MOBILE_SHELL=1`) when a `ScreenHeader` is rendered inside scroll content instead of `floatingHeader`.
