# Pattern: Mobile Interactions, List Shells, and Navigation Performance

[Back to Index](../INDEX.md)

## Problem
Mobile-first flows degrade when touch feedback, disclosure controls, overlays, and list-shell behavior are implemented inconsistently.

## Route details when overlays become dense
### Guideline
Prefer route-based detail screens for dense metadata/media content. Use overlays only for short, low-density interactions.

### Example
A picker opens a lightweight selector first, then navigates to a dedicated detail route for long-form content with explicit back navigation.

### Pitfalls
- Stacking nested overlays that hide navigation context.
- Cramming dense content into fixed-height mobile modals.

## Keep mobile form interactions stable and explicit
### Guideline
Use `16px+` font size for mobile inputs to prevent focus zoom, and make disclosure state explicit with label/icon changes.

### Example
Use labels like `Show details` / `Hide details` instead of a static chevron-only control.

### Pitfalls
- Focus-zoom jumps on iOS.
- Disclosure controls that toggle content without state cues.

## Standardize touch feedback and primary action tokens
### Guideline
Centralize press-state classes and button tokens, and pair touch feedback with keyboard-visible focus styles.

### Example
Define one shared press-feedback class (`active` opacity/scale + short transition) and one app-level button primitive for repeated high-frequency actions.

### Pitfalls
- One-off motion/opacity values across screens.
- Regressing keyboard accessibility while tuning touch UX.

## Prefer inline choosers for card-scoped decisions
### Guideline
When a choice only affects one card/section, render the chooser inline instead of launching a fixed overlay.

### Example
Render a day selector inline inside a start-session card, then submit the selected value.

### Pitfalls
- Clipping and backdrop artifacts with fixed overlays on constrained surfaces.
- Extra mode switching for a small local decision.

## Use in-app dirty-navigation guards before browser prompts
### Guideline
Use scoped in-app confirmation for dirty in-app navigation; reserve browser `beforeunload` prompts for hard requirements.

### Example
Show a confirm modal on route change when unsaved edits exist, with `Discard` and `Continue editing` actions.

### Pitfalls
- Global unload prompts for every navigation.
- Prompt fatigue that trains users to ignore data-loss warnings.

## Debounce non-critical scroll persistence
### Guideline
If scroll position is only needed for return context, debounce persistence and avoid per-scroll React state updates.

### Example
Persist list offset with a short debounce interval and read it on remount.

### Pitfalls
- Per-pixel state writes causing scroll jank.
- Treating best-effort scroll memory as real-time UI state.

## Use explicit action splits and stable list shells
### Guideline
For dense mobile cards, keep primary and secondary actions explicit, and reuse shared list-shell tokens across sibling tabs.

### Example
A history card exposes `View` and `Edit` buttons while shared shell tokens define snap, height, overflow, and tap-target sizing.

### Pitfalls
- Entire-card links that hide intent and increase mis-taps.
- Visual/interaction drift across similar tabbed feeds.

## Use snap windows for long chronological feeds
### Guideline
For long card timelines, keep a fixed shell and scroll only the list region with optional `snap-y` affordances.

### Example
A tab keeps the app chrome static while cards scroll in a constrained timeline viewport.

### Pitfalls
- Whole-page long scroll that loses orientation.
- Inconsistent snap behavior between sibling views.

## Prefetch primary tab destinations in dynamic shells
### Guideline
From active tab chrome, prefetch sibling tab routes and provide route-level loading boundaries.

### Example
Trigger prefetch for adjacent tabs on mount/intent and show a lightweight loading shell on transition.

### Pitfalls
- Navigation waiting entirely on fresh server payloads.
- No immediate loading affordance during tab switches.


## Keep ad hoc day switching session-scoped
### Guideline
When users temporarily choose a different plan/day to run, treat it as a session-start override instead of mutating long-term schedule/order metadata.

### Example
Apply selected day only to the new session being launched; keep baseline program sequencing unchanged.

### Pitfalls
- Permanent plan drift from temporary user intent.
- Coupling quick-start choices to structural schedule mutations.

## Keep completed-history flows read-first
### Guideline
Default completed records to read-only audit mode, and require explicit edit mode for intentional corrections.

### Example
Expose `Edit` then `Save/Cancel` for metadata updates rather than editing inline by default.

### Pitfalls
- Accidental edits in screens that should communicate finality.
- Ambiguous "resume vs edit" behavior in completed-session views.

## Standardize action feedback and reduced-motion behavior
### Guideline
Use one app-level feedback surface for client action outcomes (for example centralized toasts), and keep high-frequency list transitions short with reduced-motion-safe fallbacks.

### Example
Route action results through a shared helper (`ok/error/message`) and gate animations with `prefers-reduced-motion`.

### Pitfalls
- Inconsistent success/error messaging across client handlers.
- Motion-heavy updates in high-frequency interaction paths.


## Guardrail: Render destructive confirmations in a body-level portal with full-viewport isolation
### Type
Guardrail

### Rationale
Destructive confirmations launched from scrollable/tinted list containers can clip or visually bleed on mobile when mounted inline within local stacking contexts.

### How to apply checklist
- [ ] Mount destructive confirmation dialogs through `document.body` (or shared dialog portal).
- [ ] Use fixed, full-viewport backdrop (`position: fixed; inset: 0`) with optional blur and explicit high z-index.
- [ ] Lock background scroll while the modal is open.
- [ ] Keep confirm/cancel actions keyboard and touch accessible.

### Example snippet
```tsx
<Dialog.Portal container={document.body}>
  <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" />
  <Dialog.Content className="fixed inset-x-4 top-1/2 z-[101] -translate-y-1/2" />
</Dialog.Portal>
```

- **Source attribution:** `docs/PLAYBOOK_NOTES.md` (2026-02-28 mobile destructive overlay notes) + implementation evidence paths (`src/components/ui/ConfirmDestructiveModal.tsx`, `src/app/history/page.tsx`).

## Cross-links
- Server-side action contracts for lazy detail fetches: [Server/Client Boundaries](./server-client-boundaries.md)
- Offline continuity and stale-state signaling: [Offline-First Sync](./offline-first-sync.md)

## Sources
- `docs/PLAYBOOK_NOTES.md` (2026-02-21 to 2026-02-25): route-based details, focus-zoom/disclosure state, shared press/button tokens, session-scoped day switching, inline choosers, dirty-navigation guards, debounced scroll state, split card actions, history read-first edit mode, centralized feedback/motion guardrails, list-shell tokens, snap windows, tab prefetch guidance.
