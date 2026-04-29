# Component Styling Coverage

This file scores how much of each visual family already routes through shared semantic ownership.

## Coverage rubric

- `Shared tokenized`
  - primary shape, color, spacing, and typography all come from shared layers
- `Partially shared`
  - family uses shared base surfaces but still owns important local state or variant styling
- `Mostly local`
  - family has little reliable semantic-theme ownership today

## Coverage table

| Family | Primary files | Coverage | Readiness score | Main gaps |
| --- | --- | --- | --- | --- |
| Buttons | `AppButton`, `Button`, action chrome CSS | Shared tokenized | 4 | loading and segmented-state parity |
| Bottom dock buttons | `BottomDockButton`, bottom action CSS | Shared tokenized | 4 | intent mapping is strong, but still tied to local CSS vars |
| Cards and section shells | `AppPanel`, `SurfaceCard`, `SharedSectionShell` | Shared tokenized | 4 | route children still introduce local styling |
| Shared headers | `SharedScreenHeader`, `AppHeader`, screen contracts | Shared tokenized | 4 | history and nav integration still needs inspection |
| Badges | `AppBadge`, truth-pack badge primitives | Shared tokenized | 4 | route-local badge text logic still exists |
| Inputs | `Input`, auth inputs | Partially shared | 3 | workout and editor fields diverge |
| Measurement fields | measurement classes in bridge + route clients | Partially shared | 3 | state coverage incomplete, inline labels local |
| Segmented controls and toggles | `SegmentedControl`, toggle controls | Partially shared | 3 | local text sizing and active-state styling |
| App nav | `AppNav` | Mostly local | 2 | custom glass shell, custom active/pending colors |
| Exercise rows/cards | `ExerciseCard`, history cards | Mostly local | 2 | local gradients, tone classes, badge logic |
| History control panels | history route clients and shared tokens | Partially shared | 2 | filter panels and disclosure/editor panels are local |
| Auth/install panels | `AuthShell`, `InstallRouteSurface` | Partially shared | 3 | install notice panels and some helper states are local |
| Modals/dialogs/sheets | `BottomSheet`, `OverlayChrome`, confirm modal | Mostly local | 2 | overlay token family not formalized |
| Empty states | `EmptyState` | Partially shared | 3 | icon tile and some body treatments are local |
| Loaders | route loading surfaces, sigil loader | Mostly local | 2 | motion and color are not part of a shared theme contract |
| Workout stat blocks | `MetricItem`, workout-entry sections | Partially shared | 3 | status/warning states and local sizing need inspection |

## Family notes

### Buttons

Strengths:

- `AppButton` and `Button` use shared action-chrome intent mapping
- root CSS variables already own much of button height, padding, radius, and state transitions

Gaps:

- loading overlay and some focus-ring details are still local
- segmented controls are visually related but not fully unified with button semantics

### Card shells

Strengths:

- `AppPanel`, `SurfaceCard`, and shared section/header shells are the strongest existing contract in the app

Gaps:

- many child surfaces inside those cards still inject literal local classes

### Exercise cards and history cards

Strengths:

- one shared `ExerciseCard` language already spans multiple route families

Gaps:

- semantic-tone and state-tone ownership is still component-local
- history-specific cards are similar enough to mutate together, but not formally owned that way yet

### Inputs and measurement fields

Strengths:

- generic `Input` is solid and readable
- bridge layer already contains measurement field token strings

Gaps:

- too many field families remain parallel rather than unified
- some route-local editors own spacing, validation, and inline label styles

### App nav and overlays

Strengths:

- both are reusable surfaces

Gaps:

- both are closer to crafted one-off surface families than to shared semantic token owners

## Most important coverage upgrades before theme prototype

1. move `ExerciseCard` state language from local class clusters to explicit semantic token ownership
2. document a shared overlay token family for scrim, panel, handle, border, and shadow
3. unify input and measurement field ownership under one shape/focus/radius story
4. align `AppNav` with shared semantic tokens for active, inactive, pending, and shell states
