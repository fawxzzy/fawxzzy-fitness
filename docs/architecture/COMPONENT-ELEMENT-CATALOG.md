# Component Element Catalog

This catalog focuses on major reusable surfaces and meaningful child elements. It does not attempt to inventory every wrapper node.

## Shared screen scaffolds

| Component | File | Meaningful elements | Semantic roles | Visual roles | Notes |
| --- | --- | --- | --- | --- | --- |
| `SharedScreenHeader` | `src/components/ui/app/SharedScreenHeader.tsx` | eyebrow, title, subtitle, meta, action slot, optional panel shell | navigation, section identity, context summary, trailing control | elevated surface, text primary, text secondary, control | Strong shared contract via `screenContract` and `AppPanel`. |
| `SharedSectionShell` | `src/components/ui/app/SharedSectionShell.tsx` | section label, context copy, meta slot, action slot, body, summary, footer | section summary, secondary action, contextual status | surface, text secondary, border, control | Shared structure, but child content often introduces local styling debt. |
| `ScreenScaffold` | `src/components/ui/app/ScreenScaffold.tsx` | scaffold wrapper with recipe data attributes | route family marker | container | Non-visual by itself; useful for ownership trace. |
| `HistoryRouteScaffold` | `src/components/history/HistoryRouteScaffold.tsx` | floating header rail, history page header, tabs, content rail | navigation, family switcher, contextual header | elevated surface, nav, control | Shared route family with local child variation. |
| `TodayRouteScaffold` | `src/components/today/TodayScreenFamily.tsx` | top chrome, floating header, content rail | navigation, route framing | container, nav | Shared frame for today-style surfaces. |
| `ExerciseChooserRouteScaffold` | `src/components/exercises/ExerciseChooserScreenFamily.tsx` | floating header, back button, chooser body rail | back navigation, chooser context, selection workflow | elevated surface, control, container | Important mutation target for add-exercise routes. |

## Core surface primitives

| Component | File | Meaningful elements | Semantic roles | Visual roles | Notes |
| --- | --- | --- | --- | --- | --- |
| `AppPanel` | `src/components/ui/app/AppPanel.tsx` | panel shell | generic shared surface | surface, border, shadow | Primary shared card shell using `appTokens.panelBase`. |
| `SurfaceCard` | `src/components/ui/SurfaceCard.tsx` | dense or standard card shell | summary card, section card | surface | Wraps `AppPanel`, but padding density is local to the component. |
| `Glass` | `src/components/ui/Glass.tsx` | glass shell, optional interaction affordance | elevated surface, interactive surface | surface, shadow, motion | Backed by `globals.css` glass vars. |
| `BottomSheet` | `src/components/ui/BottomSheet.tsx` | scrim, panel, handle, header, scroll body | modal, contextual chooser, destructive confirmation host | overlay, elevated surface, control | Uses shared `OverlayChrome` plus route-local literal radii/shadow. |
| `OverlayChrome` | `src/components/ui/OverlayChrome.tsx` | scrim, panel base, handle, header block, body, action grid | modal framing, destructive messaging | overlay, surface, control, text | Mixed ownership; many literal values. |

## Buttons, actions, and nav

| Component | File | Meaningful elements | Semantic roles | Visual roles | Notes |
| --- | --- | --- | --- | --- | --- |
| `AppButton` | `src/components/ui/AppButton.tsx` | label, icon, loading spinner overlay | primary action, secondary action, destructive action | control, status indicator | Shared intent routing through `actionChrome`. |
| `Button` | `src/components/ui/Button.tsx` | thin variant wrapper over `AppButton` | generic action | control | Alias layer, low risk. |
| `BottomDockButton` / `BottomDockLink` | `src/components/layout/BottomDockButton.tsx` | label, loading spinner | sticky primary action, sticky secondary action, destructive dock action | control | Critical shared mutation target for bottom docks. |
| `BottomActionDock` | `src/components/layout/BottomActionDock.tsx` | split primary/secondary dock | paired call-to-action ownership | control group | Shared layout more than styling. |
| `SegmentedControl` | `src/components/ui/SegmentedControl.tsx` | segmented rail, tab segment, active segment, inactive segment | view switcher, mode toggle, filter toggle | control, nav, status indicator | Shared state language but still has literal size and text classes. |
| `AppNav` | `src/components/AppNav.tsx` | glass nav shell, nav link, icon, pending dot | global navigation, active route indicator | nav, elevated surface, status indicator | High-value mutation target with local glass/active-state styling. |
| `TopRightBackButton` / `BackButton` | shared back button files | icon button shell | navigation | control | Visual relation to header action buttons should be preserved. |

## Inputs and form fields

| Component | File | Meaningful elements | Semantic roles | Visual roles | Notes |
| --- | --- | --- | --- | --- | --- |
| `Input` | `src/components/ui/Input.tsx` | text field shell, placeholder, focus ring | generic input, auth input, form entry | control, border, text primary | Shared input baseline, but many routes bypass it. |
| `AppListboxField` | `src/components/ui/AppListboxField.tsx` | selector button, option panel, selected text, chevron | chooser input, preference selector | control, surface | Mixed shared/local ownership. |
| `InlineHintInput` | `src/components/ui/InlineHintInput.tsx` | inline input shell and hint affordance | inline editor input | control | Should stay visually related to `Input`, but currently partially separate. |
| measurement field cluster | `appTokens.measurementField*` and measurement components | measurement shell, unit side label, validation panel | workout metric input, logging control | control, stat, status indicator | Shared token strings exist, but the family is still partly embedded in route-local components. |

## Cards, rows, and workout surfaces

| Component | File | Meaningful elements | Semantic roles | Visual roles | Notes |
| --- | --- | --- | --- | --- | --- |
| `ExerciseCard` | `src/components/ExerciseCard.tsx` | shell, accent rail, media rail, title, subtitle/goal row, badge, right icon, child support area | workout row, selection row, progress row, empty row | surface, control, status indicator, data display | Biggest single shared surface family and biggest semantic-state styling cluster. |
| `RoutineDayExerciseList` | route-local file | stacked exercise rows | planned workout display | list, data display | Uses `ExerciseCard` family language. |
| `EditableRoutineDayExerciseList` | route-local file | reorder row, inline edit card, delete actions | editor row, reorder control | list, control, status indicator | High mutation risk due to local editor states. |
| `HistorySessionCard` / `HistoryExerciseCard` / `HistoryDetailExerciseCard` | `src/components/history/*` | summary card, badges, metadata line, metric strip, disclosure/action area | history summary, detail row, progress summary | surface, data display, status indicator | Visually related to `ExerciseCard` but not fully coalesced. |
| `SessionPageClient` family | session files | current exercise card, set summary, quick log controls, sticky footer | active workout control, logging control, progress signal | control, data display, sticky action | Shared scaffold, local interaction-heavy content. |
| workout metric items | `MetricItem`, workout-entry section files | metric label, value, optional warning state | workout metric, progress signal | stat, status indicator | Good candidate for global text/color/shape mutation. |

## Auth and install surfaces

| Component | File | Meaningful elements | Semantic roles | Visual roles | Notes |
| --- | --- | --- | --- | --- | --- |
| `AuthShell` | `src/components/auth/AuthShell.tsx` | backdrop, frame, content column, top action slot | auth framing, onboarding/install shell | elevated surface, ambient background, text framing | Strong shared family with route-local body content. |
| `AuthCard` | `src/components/auth/AuthShell.tsx` | central card shell | auth form host, status card | surface | Shared owner for auth panels. |
| `AuthIntro` | `src/components/auth/AuthShell.tsx` | wordmark, eyebrow, title, subtitle | onboarding prompt, auth context | text primary, text secondary | Strong semantic role consistency. |
| `AuthDock` | `src/components/auth/AuthShell.tsx` | sticky lower action slot | auth primary action host | control group | Visually related to bottom docks. |
| `InstallRouteSurface` | `src/components/install/InstallRouteSurface.tsx` | install notice panel, install action, continue link, login dock | install prompt, browser fallback, navigation handoff | surface, control, status panel | Shares auth shell but contains literal local notice card. |

## Badges, empty states, and loaders

| Component | File | Meaningful elements | Semantic roles | Visual roles | Notes |
| --- | --- | --- | --- | --- | --- |
| `AppBadge` | `src/components/ui/app/AppBadge.tsx` | badge shell and tone variant | status badge, today badge, warning badge | status indicator | Strong shared family backed by truth-pack badge variants. |
| `EmptyState` | `src/components/ui/EmptyState.tsx` | icon tile, title, body, optional action | empty collection, missing data, onboarding prompt | surface, text secondary, action host | Mostly shared shell, but icon tile is literal local styling. |
| `FawxzzySigilLoader` / route loading surfaces | loader files | sigil rings, motion states | loading state | status indicator, motion | Local visual treatment; likely manual inspection target for theme mutation. |

## Representative element records

### Primary action button

```yaml
id: button.action.primary
label: primary action button
screen: shared
component: AppButton / BottomDockButton
file: src/components/ui/AppButton.tsx
element_type: button
semantic_role:
  primary: primary_action
  secondary: [submit_action, continue_action]
  product_meaning: [high_priority_commit]
visual_role:
  primary: control
  secondary: [status_indicator]
token_usage:
  color: [color.action.primary, color.text.onAction]
  background: [color.action.primary]
  border: [color.border.focus]
  radius: [shape.button.default]
  spacing: [spacing.md]
  typography: [typography.label]
  shadow: [shadow.action.rail]
  motion: [motion.press.scale, motion.transition.fast]
  source_layers: [globals-css-root, app-designSystem-bridge, shared-component-local]
theme_mutation_coverage:
  score: 4
  global_color_ready: true
  global_shape_ready: true
  state_complete: false
  requires_manual_fix: [loading spinner contrast, segmented variant parity]
  risk_level: medium
```

### Exercise row card

```yaml
id: card.exercise.row
label: exercise row card
screen: today/session/history/edit-day
component: ExerciseCard
file: src/components/ExerciseCard.tsx
element_type: card
semantic_role:
  primary: workout_metric
  secondary: [selection_row, progress_signal, history_summary]
  product_meaning: [exercise_identity, completion_state]
visual_role:
  primary: surface
  secondary: [status_indicator, data_display, control]
token_usage:
  color: [color.text.primary, color.text.secondary, color.status.success, color.status.warning]
  background: [color.background.surface, color.background.elevated]
  border: [color.border.default, color.action.primary, color.status.success, color.status.warning]
  radius: [shape.card.default]
  spacing: [spacing.row.paddingX, spacing.row.paddingY]
  typography: [typography.title, typography.body, typography.badge]
  shadow: [shadow.surface.base]
  motion: [motion.press.scale]
  source_layers: [appTokens-bridge, shared-component-local, route-local]
theme_mutation_coverage:
  score: 2
  global_color_ready: false
  global_shape_ready: true
  state_complete: false
  requires_manual_fix: [selected gradients, badge tones, semantic-tone shadows, rail colors]
  risk_level: high
```
