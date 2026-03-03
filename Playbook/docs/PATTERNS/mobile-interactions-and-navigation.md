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
