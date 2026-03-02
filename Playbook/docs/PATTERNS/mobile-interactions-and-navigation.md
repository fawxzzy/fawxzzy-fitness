# Pattern: Mobile Interactions, List Shells, and Navigation Performance

[Back to Index](../INDEX.md)

## Problem
Mobile-first flows degrade when touch feedback, disclosure controls, overlays, and list-shell behavior are implemented inconsistently.

## Context
- Primary usage is on constrained mobile viewports with mixed touch + keyboard interaction.
- Screens often combine lists, detail views, and destructive actions in the same session.
- Navigation latency is visible because flows jump between sibling tabs/routes frequently.
- Accessibility constraints (focus visibility, reduced motion, reachable controls) must hold under sticky UI.

## Solution
- Prefer route-based detail screens for dense metadata/media and reserve overlays for short, low-density actions.
- Keep one vertical scroll owner per page shell and avoid nested page-level scroll containers.
- Pair sticky bottom CTAs with conditional bottom padding so final controls stay reachable.
- Mount destructive confirmations via `document.body` portals with full-viewport fixed overlays.
- Standardize touch feedback/button tokens and preserve keyboard-visible focus styles.
- Keep completed-history experiences read-first and require explicit edit mode for corrections.
- Debounce non-critical scroll persistence and prefetch sibling tab routes where beneficial.

## Tradeoffs
- Route-based details add route/state coordination versus pure overlays.
- Scroll ownership constraints limit ad hoc container composition.
- Sticky CTA spacing requires viewport and safe-area testing.
- Prefetching improves responsiveness but increases background network use.

## Example
Mini-scenario: a history feed keeps only the list pane scrollable, opens dense details on a route transition, and uses sticky edit actions with matching content padding while destructive confirmation runs in a body-level portal.

## Route details when overlays become dense
- Use route navigation for long-form metadata/media and explicit back behavior.
- Keep overlays for compact choosers and quick confirmations.
- Avoid nesting multiple fixed overlays for core reading/editing workflows.

## Keep mobile form interactions stable and explicit
- Use `16px+` input font size to prevent iOS zoom jumps.
- Make disclosure state explicit (`Show details` / `Hide details`) rather than icon-only toggles.
- Keep long-form controls vertically predictable with stable spacing.

## Standardize touch feedback and primary action tokens
- Reuse one press-feedback token set across high-frequency actions.
- Pair touch states with keyboard focus-visible styles.
- Keep action affordances consistent across sibling list/detail screens.

## Prefer inline choosers for card-scoped decisions
- Render local decisions inline when choice scope is one card/section.
- Avoid fixed overlays that add unnecessary mode switches.
- Keep local chooser state close to submit action.

## Use in-app dirty-navigation guards before browser prompts
- Prefer scoped in-app confirm modals for unsaved edits.
- Reserve browser `beforeunload` prompts for hard requirements only.
- Keep wording explicit about discard vs continue editing.

## Debounce non-critical scroll persistence
- Persist return-context scroll offset with short debounce.
- Avoid per-scroll React state updates for best-effort memory.
- Restore offsets on remount only when it improves orientation.

## Use explicit action splits and stable list shells
- Keep primary and secondary actions explicit on dense cards.
- Reuse shared shell tokens (height, overflow, tap-target sizing) across sibling tabs.
- Avoid whole-card links when actions have different intent.

## Use snap windows for long chronological feeds
- Keep app chrome fixed and scroll only the timeline region.
- Apply snap affordances consistently across related feeds.
- Prevent full-page scroll patterns that lose context.

## Prefetch primary tab destinations in dynamic shells
- Prefetch likely sibling tab routes on mount/intent.
- Provide route-level loading boundaries for transitions.
- Keep loading affordances lightweight and deterministic.

## Keep ad hoc day switching session-scoped
- Treat temporary day selection as session-start override only.
- Avoid mutating long-term schedule/order metadata during quick start.
- Preserve baseline program sequencing unless user explicitly edits structure.

## Keep completed-history flows read-first
- Default completed records to read-only audit mode.
- Require explicit edit mode for corrections.
- Keep resume/edit semantics unambiguous.

## Standardize action feedback and reduced-motion behavior
- Use one app-level feedback surface for action outcomes.
- Keep list transitions short and reduced-motion-safe.
- Avoid inconsistent success/error semantics across handlers.

## When to use
- Mobile-first surfaces with sticky actions, long forms, and layered navigation.
- Screens that combine list browsing, detail transitions, and destructive actions.

## When NOT to use
- Single-screen static layouts with no scroll or stateful interaction complexity.

## Implementation outline
- Establish shell contract first: scroll owner, sticky regions, and overlay portal boundary.
- Define shared touch/action tokens used by all list and detail modules.
- Add route-level loading + prefetch behavior for sibling tab transitions.
- Validate focus, reachability, and reduced-motion behavior before release.

## Related guardrails
- [Enforce one vertical scroll owner per app page shell](../GUARDRAILS/guardrails.md#enforce-one-vertical-scroll-owner-per-app-page-shell)
- [Pair sticky bottom CTA with conditional content padding](../GUARDRAILS/guardrails.md#pair-sticky-bottom-cta-with-conditional-content-padding)
- [Guardrail Enforcement Index](../GUARDRAILS/_index.md)

## Common failure modes
- Nested vertical scrollers that trap gestures.
- Sticky CTAs occluding final fields.
- Inline modal mounting that clips overlays on mobile.
- Inconsistent feedback timing and motion behavior across flows.

## Sources
- `docs/PLAYBOOK_NOTES.md` (2026-02-21 to 2026-03-02 mobile interaction and navigation guardrails).
