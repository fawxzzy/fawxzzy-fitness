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

## 2026-03-03 — Derive feed summaries once in loaders for performance-first history cards
- Date: 2026-03-03
- Type: Pattern
- Summary: For list-heavy history surfaces, derive compact summary view models (counts, highlights, formatted-ready metadata) once in server loaders/transformers and pass only the summary shape to card renderers.
- Rationale: Prevents repeated per-card aggregation in render loops and keeps mobile scrolling predictable as history feeds grow.
- Evidence: src/app/history/page.tsx, src/app/history/session-summary.ts, src/app/history/HistorySessionsClient.tsx
- Status: Proposed

### Implementation Notes
**Do**
- Build a server-side session-card VM (`id`, `title`, `subtitle`, `counts`, formatted dates, highlight line) before crossing the client boundary.
- Keep card components render-only and typed against the summary contract.

**Don't**
- Recompute counts/highlights inside `map()` render loops.
- Reformat date/time strings repeatedly inside each card component.

```ts
// server
const cards = sessions.map((s) => toSessionCardVM(s));

// client
return cards.map((vm) => <SessionCard key={vm.id} vm={vm} />);
```

## 2026-03-03 — Preserve route-instance context with explicit returnTo tokens in edit flows
- Date: 2026-03-03
- Type: Pattern
- Summary: When navigating from a detail screen into an edit screen, pass an explicit returnTo route (including current query params) so back controls return users to the exact originating screen state.
- Rationale: Prevents context loss from generic fallbacks and keeps navigation deterministic across deep links and PWA/browser history behavior.
- Evidence: src/app/routines/[id]/days/[dayId]/page.tsx, src/app/routines/[id]/edit/day/[dayId]/page.tsx
- Status: Proposed

### Implementation Notes
**Do**
- Push edit routes with `returnTo=encodeURIComponent(currentPathWithQuery)`.
- In edit screens, prefer `returnTo` for back/navigation completion, then fall back to deterministic defaults.

**Don't**
- Depend on `router.back()` as the primary navigation contract for deep-link-capable flows.

```ts
router.push(`/routines/${id}/edit/day/${dayId}?returnTo=${encodeURIComponent(pathWithQuery)}`);
const next = searchParams.get('returnTo') ?? `/routines/${id}/days/${dayId}`;
```

## 2026-03-03 — Canonicalize shared exercise planning rows behind one reusable card contract
- Date: 2026-03-03
- Type: Pattern
- Summary: When multiple screens render the same “planned exercise” concept, centralize row/card UI into one reusable component with optional metadata props instead of per-screen markup forks.
- Rationale: Prevents style drift and duplicated interaction behavior across Routine, Today, and Session surfaces while keeping UX updates low-risk.
- Evidence: src/components/ExerciseCard.tsx, src/app/routines/[id]/days/[dayId]/RoutineDayExerciseList.tsx, src/app/today/TodayExerciseRows.tsx, src/app/today/TodayDayPicker.tsx, src/components/SessionExerciseFocus.tsx
- Status: Proposed

### Implementation Notes
**Do**
- Keep one canonical `PlannedExerciseRow/Card` contract and add optional props (`showGoal`, `showLastPerformed`, `variant`) for intentional differences.
- Route screen-specific behavior through props/callbacks while preserving shared structure.

**Don't**
- Fork nearly identical row markup across Today/Routine/Session screens for minor display differences.

```tsx
<PlannedExerciseCard
  exercise={exercise}
  showGoal
  showLastPerformed={surface === 'today'}
  variant={surface}
/>
```

## 2026-03-03 — Keep detail-surface sections structurally stable with explicit empty states
- Date: 2026-03-03
- Type: Guardrail
- Summary: In shared detail screens, always render core information sections (like Stats) and use explicit empty states when data is missing instead of conditionally removing sections.
- Rationale: Prevents layout drift and user confusion when some entities have sparse data while others have populated data.
- Evidence: src/components/ExerciseInfoSheet.tsx, src/components/ExerciseInfo.tsx, src/app/api/exercise-info/[exerciseId]/route.ts
- Status: Proposed

### Implementation Notes
**Do**
- Always render canonical sections in a stable order.
- Show deterministic empty states like “No stats yet” with consistent spacing/height behavior.

**Don't**
- Remove entire sections when a subsection lacks data.

```tsx
<StatsSection>
  {stats ? <StatsGrid stats={stats} /> : <EmptyState label="No stats yet" />}
</StatsSection>
```

## 2026-03-02 — Keep app-wide filter headers on one shared contract
- Date: 2026-03-02
- Type: Guardrail
- Summary: Reuse ExerciseTagFilterControl for tag filters with a caret-only header, default count line shown only when selected tags are non-zero, and minimal prop-level extensibility (`countDisplayMode`, `defaultOpen`, `headerLabel`).
- Rationale: Prevents per-screen filter header drift while still allowing intentional display variations without forking filter UIs.
- Evidence: src/components/ExerciseTagFilterControl.tsx
- Status: Proposed

### Implementation Notes
**Do**
- Reuse `ExerciseTagFilterControl` across screens.
- Extend behavior via narrow props only when needed.

**Don't**
- Create ad hoc filter-header components for small text/layout differences.

```tsx
<ExerciseTagFilterControl
  countDisplayMode="selected-only"
  defaultOpen={false}
  headerLabel="Filter tags"
/>
```

## 2026-03-03 — Make top safe-area/header offset route-configurable in shared shells
- Date: 2026-03-03
- Type: Guardrail
- Summary: Shared page shells should expose a route-level top-nav mode so no-nav screens can zero header reservation while keeping one top-padding source of truth.
- Rationale: Prevents duplicated safe-area/header offsets and eliminates unstable top whitespace on detail screens that intentionally hide primary nav chrome.
- Evidence: src/components/ui/app/AppShell.tsx, src/app/globals.css, src/app/session/[id]/page.tsx, src/app/routines/[id]/edit/day/[dayId]/page.tsx, src/app/history/[sessionId]/page.tsx
- Status: Proposed

### Implementation Notes
**Do**
- Expose route-level shell mode (for example, `topNavMode: 'main' | 'none'`).
- Keep safe-area handling centralized in the shell with deterministic CSS variables.

**Don't**
- Use per-page negative margins or one-off top padding hacks to counter shell offsets.

```tsx
<AppShell topNavMode="none">{/* detail content */}</AppShell>
```

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

<!-- PLAYBOOK_NOTE_ID:2026-03-04-appshell-owns-mobile-safe-area-variables-and-offsets -->
### AppShell owns mobile safe-area variables and offsets (from FawxzzyFitness notes, 2026-03-04)
Type: Pattern
Summary: Define top/bottom safe-area offsets once in `AppShell` CSS variables and have screens consume those shared values rather than computing `env(safe-area-inset-*)` ad hoc.
Rationale: A single safe-area owner prevents inconsistent notch/home-indicator spacing between routes and stabilizes layout behavior on iOS.
Evidence (FawxzzyFitness):
- src/components/ui/app/AppShell.tsx
- src/app/globals.css
- src/components/ui/app/MainTabScreen.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-04-publish-bottom-actions-upward-from-child-features -->
### Publish bottom actions upward from child features (from FawxzzyFitness notes, 2026-03-04)
Type: Practice
Summary: Child feature clients should publish CTA nodes via `usePublishBottomActions`/`PublishBottomActions` instead of rendering their own bottom action wrappers.
Rationale: Upward publishing keeps feature modules focused on action content while the screen shell owns placement, stickiness, and spacing behavior.
Evidence (FawxzzyFitness):
- src/components/layout/PublishBottomActions.tsx
- src/components/SessionTimers.tsx
- src/app/history/[sessionId]/LogAuditClient.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-04-bottom-actions-provider-slot-injection-for-screen-owned-cta-surfaces -->
### Bottom actions provider/slot injection for screen-owned CTA surfaces (from FawxzzyFitness notes, 2026-03-04)
Type: Pattern
Summary: Wrap scrollable screens in `BottomActionsProvider` and render a single `BottomActionsSlot` as the last child of the scroll owner so CTA UI is injected once at the screen layer.
Rationale: Centralizing CTA mounting prevents feature-level overlay drift and keeps action placement deterministic across Today, Session, and History-style flows.
Evidence (FawxzzyFitness):
- src/components/layout/bottom-actions.tsx
- src/components/layout/ScrollScreenWithBottomActions.tsx
- src/app/today/page.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-screen-owned-sticky-bottom-actions-for-scrollable-mobile-detail-flows -->
### Screen-owned sticky bottom actions for scrollable mobile detail flows (from FawxzzyFitness notes, 2026-03-03)
Type: Pattern
Summary: Render bottom CTAs once at the screen layer as a sticky last child of the single scroll owner, while feature components publish CTA content upward instead of mounting fixed overlays.
Rationale: Prevents overlay overlap/clipping bugs in iOS overflow contexts and keeps action-bar behavior consistent across deep detail screens.
Evidence (FawxzzyFitness):
- src/components/SessionTimers.tsx
- src/components/SessionPageClient.tsx
- src/app/history/[sessionId]/LogAuditClient.tsx
- src/app/history/[sessionId]/HistoryLogPageClient.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-prefer-in-flow-sticky-bottom-actions-over-fixed-overlays-on-scrollable-screens -->
### Prefer in-flow sticky bottom actions over fixed overlays on scrollable screens (from FawxzzyFitness notes, 2026-03-03)
Type: Guardrail
Summary: On screens with scrollable content, render bottom action bars as the last in-flow child of the single scroll owner using `position: sticky; bottom: 0;` instead of viewport-fixed overlays plus reserve padding contracts.
Rationale: Sticky in-flow actions eliminate overlap bugs and dead-space drift caused by fixed overlays, nested scroll owners, and bar-height reserve math.
Evidence (FawxzzyFitness):
- src/components/ui/BottomActionBar.tsx
- src/app/today/page.tsx
- src/app/today/TodayDayPicker.tsx
- src/components/SessionTimers.tsx
- src/app/session/[id]/page.tsx
- src/app/routines/page.tsx
- src/app/routines/[id]/days/[dayId]/page.tsx
- src/app/history/[sessionId]/page.tsx
- src/app/history/[sessionId]/LogAuditClient.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-measured-fixed-bottom-action-bars-must-publish-shell-reserve-height -->
### Measured fixed-bottom action bars must publish shell reserve height (from FawxzzyFitness notes, 2026-03-03)
Type: Guardrail
Summary: Viewport-fixed bottom action bars should measure their live panel height and publish `--app-bottom-bar-height`; scroll owners should reserve only via `pb-[var(--app-bottom-offset)]` (inset + gap + measured bar height).
Rationale: Prevents both hidden end-of-scroll content and oversized dead-space drift caused by static/magic bottom reserve constants across variants and orientation changes.
Evidence (FawxzzyFitness):
- src/components/ui/BottomActionBar.tsx
- src/components/ui/app/AppShell.tsx
- src/app/globals.css
- src/app/today/page.tsx
- src/app/today/TodayDayPicker.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-reserve-fixed-bottom-action-space-through-one-shell-level-offset-contract -->
### Reserve fixed bottom action space through one shell-level offset contract (from FawxzzyFitness notes, 2026-03-03)
Type: Guardrail
Summary: Any screen with viewport-fixed bottom actions should reserve content reachability via one shell-level `--app-bottom-offset` contract instead of ad hoc per-screen `env(safe-area-inset-bottom)` math.
Rationale: Prevents dead-space drift and hidden end-of-list controls when fixed action panels vary across screens or evolve over time.
Evidence (FawxzzyFitness):
- src/components/ui/BottomActionBar.tsx
- src/components/ui/app/AppShell.tsx
- src/app/globals.css
- src/app/today/page.tsx
- src/app/routines/page.tsx
- src/app/history/[sessionId]/page.tsx
- src/components/SessionPageClient.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-normalize-bottom-actions-with-compact-fit-content-stacks -->
### Normalize bottom actions with compact fit-content stacks (from FawxzzyFitness notes, 2026-03-03)
Type: Pattern
Summary: For mobile bottom actions that present a short set of primary/secondary actions, use a shared centered compact stack with safe-area bottom padding and fit-content buttons instead of full-width sticky action cards.
Rationale: Prevents action-surface drift, removes unnecessary background chrome, and preserves consistent touch target sizing while respecting iOS home-indicator safe area.
Evidence (FawxzzyFitness):
- src/components/ui/CompactActionStack.tsx
- src/app/today/TodayDayPicker.tsx
- src/app/history/[sessionId]/LogAuditClient.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-02-reuse-one-measurement-editor-surface-across-logging-and-history-correction -->
### Reuse one measurement editor surface across logging and history correction (from FawxzzyFitness notes, 2026-03-02)
Type: Pattern
Summary: Shared measurement editing UI (metric toggles + unit-aware inputs) should be reused between live set logging and history set correction screens instead of maintaining per-screen bespoke editors.
Rationale: Prevents behavior drift in metric visibility, unit selection, and value-entry expectations across closely related workout flows.
Evidence (FawxzzyFitness):
- src/components/ui/measurements/ModifyMeasurements.tsx
- src/components/SessionTimers.tsx
- src/app/history/[sessionId]/LogAuditClient.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-02-standardize-detail-sheet-back-actions-with-optional-local-close-handlers -->
### Standardize detail sheet back actions with optional local close handlers (from FawxzzyFitness notes, 2026-03-02)
Type: Guardrail
Summary: Reusable detail sheets should accept an optional `onClose` callback; Back invokes `onClose` when provided and otherwise falls back to `router.back()`.
Rationale: Prevents hard-coded return routes, preserves origin screen state/scroll in modal contexts, and keeps deep-link route behavior correct.
Evidence (FawxzzyFitness):
- src/components/ExerciseInfoSheet.tsx
- src/app/today/TodayDayPicker.tsx
- src/app/today/TodayExerciseRows.tsx
- src/app/routines/[id]/days/[dayId]/RoutineDayExerciseList.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-02-floating-sticky-top-nav-should-anchor-below-safe-area-via-one-shared-offset-token -->
### Floating sticky top nav should anchor below safe-area via one shared offset token (from FawxzzyFitness notes, 2026-03-02)
Type: Pattern
Summary: For shared top navigation on mobile, keep the nav as a bounded rounded card and set its anchor with one global offset token (`safe-area inset + fixed gap`) rather than padding a full-height header into the safe-area.
Rationale: Safe-area accommodation should adjust nav position, not expand nav background/panel height into the notch/status region.
Evidence (FawxzzyFitness):
- src/app/globals.css
- src/components/AppNav.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-01-treat-list-compact-toggles-as-row-density-variants-on-shared-primitives -->
### Treat List/Compact toggles as row-density variants on shared primitives (from FawxzzyFitness notes, 2026-03-01)
Type: Pattern
Summary: For timeline/history feeds, implement List vs Compact through shared row primitives (padding + secondary-line toggles) instead of maintaining separate markup trees.
Rationale: Keeps visual parity and interaction behavior consistent while reducing layout drift and duplicated rendering logic.
Evidence (FawxzzyFitness):
- src/components/ui/app/AppRow.tsx
- src/app/history/HistorySessionsClient.tsx
- src/app/history/exercises/ExerciseBrowserClient.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-01-normalize-repeated-routine-day-ui-through-app-local-primitives-and-tokens -->
### Normalize repeated routine/day UI through app-local primitives and tokens (from FawxzzyFitness notes, 2026-03-01)
Type: Pattern
Summary: When multiple routine/day surfaces share the same panel, header, row, badge, and sticky CTA structures, extract app-local primitives and shared style tokens first, then compose per-screen layouts with those primitives.
Rationale: Reduces repeated markup/classes, keeps visual tuning centralized, and prevents multi-screen UI drift during future screen updates.
Evidence (FawxzzyFitness):
- src/components/ui/app/AppPanel.tsx
- src/components/ui/app/AppHeader.tsx
- src/components/ui/app/AppRow.tsx
- src/components/ui/app/AppBadge.tsx
- src/components/ui/app/StickyActionBar.tsx
- src/app/today/TodayDayPicker.tsx
- src/app/today/page.tsx
- src/app/routines/page.tsx
- src/app/routines/[id]/days/[dayId]/page.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-01-for-in-panel-scroll-screens-avoid-sticky-tab-wrappers-inside-clipped-glass-containers -->
### For in-panel scroll screens, avoid sticky tab wrappers inside clipped glass containers (from FawxzzyFitness notes, 2026-03-01)
Type: Guardrail
Summary: When a screen uses a clipped/rounded glass shell with an internal scroll panel, prefer a simple non-sticky tab row (`shrink-0`) and keep the list area as the only `overflow-y-auto` region with an explicit `min-h-0` flex chain.
Rationale: Sticky wrappers inside clipped containers can produce visual clipping artifacts and increase the chance of pointer/scroll conflicts over list content.
Evidence (FawxzzyFitness):
- src/app/history/page.tsx
- src/app/history/HistorySessionsClient.tsx
- src/components/ui/SegmentedControl.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-01-centralize-back-navigation-ui-behind-one-reusable-primitive-with-per-screen-intent-hooks -->
### Centralize Back navigation UI behind one reusable primitive with per-screen intent hooks (from FawxzzyFitness notes, 2026-03-01)
Type: Guardrail
Summary: Keep all in-app Back affordances bound to one shared Back button primitive, and let consuming screens provide route targets or local close handlers via props/events instead of redefining visual/button tokens.
Rationale: A single Back primitive prevents icon/style drift while preserving local navigation intent (route back, push, or in-context panel close).
Evidence (FawxzzyFitness):
- src/components/ui/BackButton.tsx
- src/components/ui/TopRightBackButton.tsx
- src/components/ExerciseInfoSheet.tsx
- src/components/SessionExerciseFocus.tsx
- src/app/history/[sessionId]/page.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-01-reuse-existing-in-context-detail-overlays-instead-of-introducing-dead-detail-route-links -->
### Reuse existing in-context detail overlays instead of introducing dead detail-route links (from FawxzzyFitness notes, 2026-03-01)
Type: Guardrail
Summary: When a feature already exposes details through an established modal/overlay contract, new list surfaces should invoke that same overlay contract rather than linking to alternate or non-existent route paths.
Rationale: Preserving one detail interaction contract avoids navigation regressions (404s), keeps close/return behavior deterministic, and prevents duplicated UI pathways for the same content.
Evidence (FawxzzyFitness):
- src/app/history/exercises/ExerciseBrowserClient.tsx
- src/components/ExerciseInfoSheet.tsx
- src/lib/exercises-browser.ts

<!-- PLAYBOOK_NOTE_ID:2026-02-28-centralize-fullscreen-overlay-scroll-lock-in-a-single-lifecycle-with-guaranteed-cleanup -->
### Centralize fullscreen overlay scroll-lock in a single lifecycle with guaranteed cleanup (from FawxzzyFitness notes, 2026-02-28)
Type: Guardrail
Summary: For mobile fullscreen overlays, apply body/html scroll lock in one dedicated hook and always restore prior styles in effect cleanup; avoid stacking independent scroll-lock effects in both parent picker and child overlay.
Rationale: Nested lock handlers can restore stale `overflow` values and leave the underlying page non-scrollable after close, especially on iOS/PWA.
Evidence (FawxzzyFitness):
- src/components/ExerciseInfoSheet.tsx
- src/components/ExercisePicker.tsx
- src/lib/useBodyScrollLock.ts

<!-- PLAYBOOK_NOTE_ID:2026-02-28-avoid-nested-server-action-forms-for-row-level-destructive-actions -->
### Avoid nested server-action forms for row-level destructive actions (from FawxzzyFitness notes, 2026-02-28)
Type: Guardrail
Summary: On edit screens with per-row save and delete controls, keep destructive server-action forms as siblings (or external via `form=`) rather than nesting them inside another `<form>`.
Rationale: Nested forms can cause implicit submit bubbling and React/Next runtime submit errors during destructive actions.
Evidence (FawxzzyFitness):
- src/app/routines/[id]/edit/day/[dayId]/page.tsx
- src/components/destructive/ConfirmedServerFormButton.tsx

<!-- PLAYBOOK_NOTE_ID:2026-02-28-render-destructive-confirmations-in-a-body-level-portal-with-full-viewport-isolation -->
### Render destructive confirmations in a body-level portal with full-viewport isolation (from FawxzzyFitness notes, 2026-02-28)
Type: Guardrail
Summary: Destructive confirmations launched from scrollable/tinted card lists should mount through `document.body` (or shared Dialog portal) with fixed full-viewport backdrop + blur to avoid stacking-context bleed-through.
Rationale: Inline-mounted overlays can inherit card/list stacking and clipping behavior, causing text bleed and weaker destructive affordance clarity on mobile.
Evidence (FawxzzyFitness):
- src/components/ui/ConfirmDestructiveModal.tsx
- src/app/history/page.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-01-pair-sticky-bottom-ctas-with-conditional-content-padding-in-long-input-flows -->
### Pair sticky bottom CTAs with conditional content padding in long input flows (from FawxzzyFitness notes, 2026-03-01)
Type: Guardrail
Summary: When adding sticky action bars over forms, reserve matching bottom space in the content container (including safe-area inset) so the last interactive fields remain visible and focusable.
Rationale: Sticky footers can occlude final inputs and degrade keyboard/touch accessibility unless content offset is explicit.
Evidence (FawxzzyFitness):
- src/components/SessionExerciseFocus.tsx
- src/components/SessionTimers.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-02-enforce-one-vertical-scroll-owner-per-app-page-shell -->
### Enforce one vertical scroll owner per app page shell (from FawxzzyFitness notes, 2026-03-02)
Type: Guardrail
Summary: Use a single `ScrollContainer` as the only `overflow-y-auto` owner per page inside a full-height `AppShell`; avoid root `h-[100dvh]` + `overflow-hidden` patterns and nested page-level scrollers.
Rationale: Multiple scroll owners in mobile flex layouts can trap scroll, break sticky positioning context, and cause layout jumping.
Evidence (FawxzzyFitness):
- src/components/ui/app/AppShell.tsx
- src/components/ui/app/ScrollContainer.tsx
- src/app/history/page.tsx
- src/app/history/exercises/page.tsx
- src/app/history/[sessionId]/page.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-02-prefer-collapsible-select-controls-over-segmented-toggles-in-dense-mobile-headers -->
### Prefer collapsible select controls over segmented toggles in dense mobile headers (from FawxzzyFitness notes, 2026-03-02)
Type: Pattern
Summary: For compact mobile list headers, use a reusable collapsible select control (label + selected value + expandable options) instead of segmented toggles when options are low-cardinality view/sort/group modes.
Rationale: Keeps header chrome lighter, preserves readability, and provides a normalized interaction contract reusable across view-mode and ordering controls.
Evidence (FawxzzyFitness):
- src/components/ui/app/ViewModeSelect.tsx
- src/app/history/HistorySessionsClient.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-make-top-safe-area-header-offset-route-configurable-in-shared-shells -->
### Make top safe-area/header offset route-configurable in shared shells (from FawxzzyFitness notes, 2026-03-03)
Type: Guardrail
Summary: Shared page shells should expose a route-level top-nav mode so no-nav screens can zero header reservation while keeping one top-padding source of truth.
Rationale: Prevents duplicated safe-area/header offsets and eliminates unstable top whitespace on detail screens that intentionally hide primary nav chrome.
Evidence (FawxzzyFitness):
- src/components/ui/app/AppShell.tsx
- src/app/globals.css
- src/app/session/[id]/page.tsx
- src/app/routines/[id]/edit/day/[dayId]/page.tsx
- src/app/history/[sessionId]/page.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-02-keep-app-wide-filter-headers-on-one-shared-contract -->
### Keep app-wide filter headers on one shared contract (from FawxzzyFitness notes, 2026-03-02)
Type: Guardrail
Summary: Reuse `ExerciseTagFilterControl` for tag filters with a caret-only header, default count line shown only when selected tags are non-zero, and minimal prop-level extensibility (`countDisplayMode`, `defaultOpen`, `headerLabel`).
Rationale: Prevents per-screen filter header drift while still allowing intentional display variations without forking filter UIs.
Evidence (FawxzzyFitness):
- src/components/ExerciseTagFilterControl.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-keep-detail-surface-sections-structurally-stable-with-explicit-empty-states -->
### Keep detail-surface sections structurally stable with explicit empty states (from FawxzzyFitness notes, 2026-03-03)
Type: Guardrail
Summary: In shared detail screens, always render core information sections (like Stats) and use explicit empty states when data is missing instead of conditionally removing sections.
Rationale: Prevents layout drift and user confusion when some entities have sparse data while others have populated data.
Evidence (FawxzzyFitness):
- src/components/ExerciseInfoSheet.tsx
- src/components/ExerciseInfo.tsx
- src/app/api/exercise-info/[exerciseId]/route.ts

<!-- PLAYBOOK_NOTE_ID:2026-03-03-canonicalize-shared-exercise-planning-rows-behind-one-reusable-card-contract -->
### Canonicalize shared exercise planning rows behind one reusable card contract (from FawxzzyFitness notes, 2026-03-03)
Type: Pattern
Summary: When multiple screens render the same “planned exercise” concept, centralize row/card UI into one reusable component with optional metadata props instead of per-screen markup forks.
Rationale: Prevents style drift and duplicated interaction behavior across Routine, Today, and Session surfaces while keeping UX updates low-risk.
Evidence (FawxzzyFitness):
- src/components/ExerciseCard.tsx
- src/app/routines/[id]/days/[dayId]/RoutineDayExerciseList.tsx
- src/app/today/TodayExerciseRows.tsx
- src/app/today/TodayDayPicker.tsx
- src/components/SessionExerciseFocus.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-preserve-route-instance-context-with-explicit-returnto-tokens-in-edit-flows -->
### Preserve route-instance context with explicit returnTo tokens in edit flows (from FawxzzyFitness notes, 2026-03-03)
Type: Pattern
Summary: When navigating from a detail screen into an edit screen, pass an explicit `returnTo` route (including current query params) so back controls return users to the exact originating screen state.
Rationale: Prevents context loss from generic fallbacks and keeps navigation deterministic across deep links and PWA/browser history behavior.
Evidence (FawxzzyFitness):
- src/app/routines/[id]/days/[dayId]/page.tsx
- src/app/routines/[id]/edit/day/[dayId]/page.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-derive-feed-summaries-once-in-loaders-for-performance-first-history-cards -->
### Derive feed summaries once in loaders for performance-first history cards (from FawxzzyFitness notes, 2026-03-03)
Type: Pattern
Summary: For list-heavy history surfaces, derive compact summary view models (counts, highlights, formatted-ready metadata) once in server loaders/transformers and pass only the summary shape to card renderers.
Rationale: Prevents repeated per-card aggregation in render loops and keeps mobile scrolling predictable as history feeds grow.
Evidence (FawxzzyFitness):
- src/app/history/page.tsx
- src/app/history/session-summary.ts
- src/app/history/HistorySessionsClient.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-keep-pr-systems-metric-aware-and-emit-category-counts-from-loaders -->
### Keep PR systems metric-aware and emit category counts from loaders (from FawxzzyFitness notes, 2026-03-03)
Type: Pattern
Summary: PR evaluation should distinguish rep-based vs weight-based progress (including bodyweight sets), then expose category counts and formatted labels from server-side loaders/transformers for reuse across detail and list surfaces.
Rationale: Prevents bodyweight progress from disappearing and avoids divergent per-component PR math in render loops.
Evidence (FawxzzyFitness):
- src/lib/pr-evaluator.ts
- src/app/history/session-summary.ts
- src/app/history/page.tsx
- src/app/history/[sessionId]/page.tsx
- src/lib/exercise-info.ts

<!-- PLAYBOOK_NOTE_ID:2026-03-03-screen-owned-sticky-bottom-actions-should-be-slotted-once-per-scroll-screen -->
### Screen-owned sticky bottom actions should be slotted once per scroll screen (from FawxzzyFitness notes, 2026-03-03)
Type: Pattern
Summary: Bottom actions should be screen-owned and rendered once via a sticky slot as the last child of the scroll-content stack, while feature components only publish action content.
Rationale: Prevents iOS/mobile overlap and clipping regressions from feature-mounted fixed bars inside nested content wrappers while preserving a single scroll owner.
Evidence (FawxzzyFitness):
- src/components/layout/bottom-actions.tsx
- src/components/SessionPageClient.tsx
- src/components/SessionTimers.tsx
- src/app/history/[sessionId]/HistoryLogPageClient.tsx
- src/app/history/[sessionId]/LogAuditClient.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-enforce-sticky-action-placement-with-a-scroll-screen-wrapper -->
### Enforce sticky action placement with a scroll-screen wrapper (from FawxzzyFitness notes, 2026-03-03)
Type: Pattern
Summary: Use a single screen wrapper that composes `BottomActionsProvider` + `ScrollContainer` + `BottomActionsSlot` in one fixed hierarchy so the slot is always the last child of the actual scroll owner.
Rationale: Sticky bottom actions only work reliably when they are descendants of the real scroll owner; codifying the relationship removes placement drift and route-level regressions.
Evidence (FawxzzyFitness):
- src/components/layout/ScrollScreenWithBottomActions.tsx
- src/app/today/page.tsx
- src/app/session/[id]/page.tsx
- src/app/history/[sessionId]/page.tsx
- src/app/routines/page.tsx
- src/app/routines/[id]/days/[dayId]/page.tsx
