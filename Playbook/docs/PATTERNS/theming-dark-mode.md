# Pattern: Theming and Dark-Mode Guardrails

[Back to Index](../INDEX.md)

## Problem
Dark-mode interfaces regress quickly when surface tokens, utility mappings, and translucency intensity are not centralized.

## Centralize surface and glass intensity tokens
### Guideline
Define a shared token contract for dark surfaces and translucent/glass treatments, including explicit intensity modes (for example `on`, `reduced`, `off`).

### Example
Components consume semantic tokens (`surface-soft`, `surface-strong`, glass border/tint/sheen tokens) instead of inline color formulas.

### Pitfalls
- Per-component translucency math that drifts visually.
- No explicit reduced-effects mode for performance/accessibility.

## Prefer semantic theme utilities over ad hoc color formulas
### Guideline
Use named theme utilities for container surfaces and states; avoid repeating raw `rgb(var(--...))` utility formulas inline.

### Example
Use one semantic utility class for a collapsible card background across closed/open states.

### Pitfalls
- Tiny class differences creating inconsistent contrast.
- Refactors that silently break dark-mode hierarchy.

## Avoid light-surface leakage in dark mode
### Guideline
Do not rely on hardcoded light-opacity container classes in dark-first flows; include fallback utility mappings for commonly used neutral surfaces.

### Example
Ensure fallback utilities for secondary rows/chips map to dark-compatible tokens.

### Pitfalls
- Washed-out or "disabled-looking" panels.
- Bright bars appearing in optimistic/queued rows.

## Keep sheen subtle and edge-weighted
### Guideline
For glass-like surfaces, keep highlights low-intensity and edge-weighted rather than bright full-surface hotspots.

### Example
Use a thin inner highlight and soft gradient edge rather than a central bright sheen.

### Pitfalls
- Glare that reduces content legibility.
- Decorative effects overpowering hierarchy on small screens.

## Validate merged visual output, not only isolated PRs
### Guideline
Before shipping visual changes, verify merged-branch token output under target themes to catch contrast and hierarchy regressions created by parallel changes.

### Example
Run a final branch-level dark-mode pass on screens touched by multiple UI PRs.

### Pitfalls
- Approving isolated UI deltas that conflict after merge.
- Missing contrast regressions introduced by token collisions.

## Sources
- `docs/PLAYBOOK_NOTES.md` (2026-02-21 to 2026-02-22): dark-mode surface tokenization, glass intensity modes, fallback utility mapping, sheen tuning, and merge-validation guardrails.
