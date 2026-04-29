# Design Surface Token Map

This is the central Pass 2 artifact for global theme mutation readiness.

## Normalized semantic token map

The app currently exposes raw variables like `--bg-0`, `--surface-2-rgb`, `--accent`, and `--danger-rgb`. Pass 2 normalizes them into semantic ownership as follows.

### Background and surface

| Current source | Normalized semantic token | Notes |
| --- | --- | --- |
| `--bg` / `--bg-app` | `color.background.app` | App page background. |
| `--bg-panel` / panel classes | `color.background.surface` | Shared panel shell. |
| `--bg-card`, `--surface-rgb`, `--surface-2-rgb` | `color.background.elevated` | Shared card and row surface stack. |
| overlay scrim literals | `color.background.overlay` | Not yet centralized in live code. |

### Text

| Current source | Normalized semantic token | Notes |
| --- | --- | --- |
| `--text-primary` | `color.text.primary` | Titles and primary copy. |
| `--text-secondary` | `color.text.secondary` | Secondary copy. |
| `--text-muted` | `color.text.muted` | Meta and support text. |
| `--text-on-accent` | `color.text.onAction` | Text on primary action surfaces. |

### Actions and status

| Current source | Normalized semantic token | Notes |
| --- | --- | --- |
| `--accent`, `--accent-strong` | `color.action.primary` | Also used for active/current state in some surfaces. |
| local neutral control shades | `color.action.secondary` | Needs stronger explicit ownership in docs and code. |
| `--danger-rgb` and destructive button vars | `color.action.destructive` | Must stay separate from generic accent mutation. |
| `--success-rgb` | `color.status.success` | Used in completed/logged states. |
| `--warning-rgb` | `color.status.warning` | Used in rest/attention/warning states. |
| `--danger-rgb` | `color.status.error` | Also maps to destructive/error semantics. |

### Border

| Current source | Normalized semantic token | Notes |
| --- | --- | --- |
| `--border` | `color.border.default` | Soft border language. |
| `--border-strong` | `color.border.strong` | Stronger card, row, and section outline. |
| `--button-focus-ring`, `colors.border.focus` | `color.border.focus` | Focus and active ring language. |

### Radius and shape

| Current source | Normalized semantic token | Notes |
| --- | --- | --- |
| `--radius-sm` | `radius.sm` | Small card and field fragments. |
| `--radius-md` | `radius.md` | Inputs, rows, small panels. |
| `--radius-lg` | `radius.lg` | Base shared panel. |
| `--radius-xl` | `radius.xl` | Larger header and sheet chrome. |
| `--radius-pill` | `radius.full` | Pills, badges, nav dots. |
| `--button-radius` | `shape.button.default` | Button silhouette. |
| `--card-radius` and shared panel radius | `shape.card.default` | Not fully unified today. |
| measurement input rounding | `shape.input.default` | Partially shared. |

## Current ownership layers in practice

### 1. Raw root variable ownership

Defined mostly in `src/app/globals.css`.

Owns:

- palette and surface stack
- button variables
- action chrome variables
- glass variables
- safe-area and spacing vars
- some surface-specific sizing vars for exercise rows and bottom nav

Theme mutation outlook:

- strong global leverage for raw color and shape changes
- weak semantic separation because many meanings still share the same raw accent family

### 2. Frozen truth-pack ownership

Defined in `truth-pack/fitness/design-system`.

Owns:

- semantic token declaration
- primitive families for header, card, badge, section layout

Theme mutation outlook:

- best source for semantic mutation language
- not yet the single owner for all live surfaces

### 3. Shared bridge ownership

Defined in `designSystem.ts`, `appTokens.ts`, and `screenContract.ts`.

Owns:

- route-family scaffolds
- many card and section classes
- auth shell classes
- measurement and history class packs

Theme mutation outlook:

- useful because many repeated patterns already point here
- still too mixed between primitive and route-specific concerns

### 4. Hardcoded local ownership

Defined in local components and route clients.

Theme mutation outlook:

- main reason the app is not yet globally theme-ready

## High-value surface families and readiness

| Surface family | Current owner | Score | Notes |
| --- | --- | --- | --- |
| Primary/secondary/destructive buttons | action-chrome vars + `AppButton` + dock buttons | 4 | Shared intent is good; state edge cases remain. |
| Bottom docks | `BottomDockButton`, `bottom-action` CSS | 4 | Strong global mutation candidate. |
| Shared panel/card shell | truth pack + `AppPanel` + `SurfaceCard` | 4 | Shape and color mostly predictable. |
| `ExerciseCard` family | app tokens + heavy local state classes | 2 | Biggest mixed-ownership surface family. |
| Inputs | `Input` plus route-local field clusters | 3 | Baseline shared, but not universal. |
| Measurement fields | app tokens + local measurement components | 3 | Tokenized base exists but state coverage is incomplete. |
| Badges | truth pack + `AppBadge` | 4 | Strong semantic tone ownership. |
| App nav | local component with glass shell | 2 | Shared meaning, local styling. |
| Overlay/sheet chrome | `OverlayChrome` + `BottomSheet` | 2 | Shared components exist, but overlay tokens are not formalized. |
| Install/auth notice panels | auth shell + local literal panels | 2 | Structural reuse is good; visual token ownership is mixed. |

## Hardcoded style debt

These are the most important hardcoded or locally composed style clusters that resist global mutation.

### `ExerciseCard`

- File: `src/components/ExerciseCard.tsx`
- Issues:
  - local shell state gradients for `selected`, `active`, `completed`
  - local thumb state border/background variants
  - local badge and text state classes
  - local focus-ring and chevron tint assumptions
- Why it matters:
  - this surface appears across today, session, edit day, history, and picker flows
- Mutation risk:
  - partial change across cards, especially stateful cards

### `cardSemanticTones`

- File: `src/components/cardSemanticTones.ts`
- Issues:
  - semantic tone mapping exists, but it is encoded as literal Tailwind class strings
  - currently couples success/current/attention styling to local classes rather than a semantic token map
- Mutation risk:
  - status meaning may collapse or drift when only base accent colors change

### `AppNav`

- File: `src/components/AppNav.tsx`
- Issues:
  - local glass shell, active/inactive colors, hover states, and pending dot styling
  - strong relation to global navigation, but low relation to shared header token families
- Mutation risk:
  - top nav can look like a separate design language after theme mutation

### `OverlayChrome`

- File: `src/components/ui/OverlayChrome.tsx`
- Issues:
  - local scrim color, blur, handle tint, panel shadow, bullet panel styling
- Mutation risk:
  - modals and sheets mutate differently from cards and can retain old blur/shadow language

### `Input` and input-like field shells

- Files:
  - `src/components/ui/Input.tsx`
  - measurement field class families in `designSystem.ts`
  - editor-specific field wrappers
- Issues:
  - strong baseline input exists, but measurement and editor fields are parallel, not fully unified
- Mutation risk:
  - color changes may hit auth fields but miss inline workout fields, or vice versa

### Install informational panels

- File: `src/components/install/InstallRouteSurface.tsx`
- Issues:
  - local rounded card with literal border/background values inside shared auth shell
- Mutation risk:
  - install screen may lag behind auth shell mutations

## Global vs local mutation expectations

### Should mutate globally

- primary action color
- secondary/neutral control color
- destructive action color
- shared card background and border
- shared text primary/secondary/muted colors
- shared button radius
- shared panel/card radius
- shared input radius
- shared section/card spacing rhythm
- shared base shadow language

### Should mutate globally but requires manual inspection

- `ExerciseCard` state surfaces
- history density and filter panels
- nav shell
- overlay and sheet chrome
- measurement validation surfaces
- install status/info panels

### Should stay locally controlled

- product-meaning exceptions such as warning vs destructive vs success
- current/selected state distinct from completed/success state
- contextual emphasis used only for one workflow, if documented as intentional
- dev-only audit surfaces

## Theme-mutation readiness by representative element

| Element | Score | Reason |
| --- | --- | --- |
| Primary action button | 4 | Shared intent and shared control language are already strong. |
| Secondary button | 4 | Same as primary, with slightly more neutral intent branching. |
| Destructive button | 4 | Strong semantic separation, but still worth validating loading/disabled contrast. |
| Auth card | 4 | Shared shell and shared surface owner. |
| Shared section shell | 4 | Stable shared card shell and text hierarchy. |
| Exercise card | 2 | Shared component, but multiple local tone and state clusters. |
| History session card | 2 | Related to exercise cards but still route-local in important ways. |
| App nav tab | 2 | Good meaning, weak shared ownership. |
| Generic input | 3 | Shared baseline exists; not all consumers use it. |
| Measurement field | 3 | Base tokens exist, but state and variant parity are incomplete. |
| Bottom sheet panel | 2 | Shared component exists, overlay token ownership does not. |
