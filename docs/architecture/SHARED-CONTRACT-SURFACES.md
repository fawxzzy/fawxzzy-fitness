# Shared Contract Surfaces

This file distinguishes what the repo already treats as a contract from what is still route-local composition.

## Frozen owner-truth surfaces

### Truth pack

Owned in:

- `truth-pack/fitness/design-system/tokens.v1.json`
- `truth-pack/fitness/design-system/primitives.v1.json`

Declared primitive families:

- `header`
- `card`
- `badge`
- `section-layout`

Declared token families:

- spacing
- typography
- colors
- radii
- shadows
- borders

What this buys today:

- a stable vocabulary for shared spacing, text, card silhouette, and badge tones
- a machine-readable source that route-family scaffolds can point at

What it does not yet guarantee:

- whole-app theme mutation coverage
- shared overlay token ownership
- shared nav token ownership
- unified input ownership
- unified semantic-role mapping for all route-local states

## Shared bridge surfaces

### `designSystem.ts`

Owns the largest bridge from frozen tokens/primitives into Tailwind class strings.

Important contract areas already bridged:

- header paddings, title/subtitle text classes, header family panel classes
- card panel, muted panel, row, row-accent, row-default classes
- many specialized but shared route-family classes for:
  - workout metrics
  - exercise picker
  - history control and detail screens
  - settings
  - routine editor
  - auth shell and auth card

Risk:

- the bridge is large enough that it now mixes true primitive ownership with route-family specialization
- this is good for reuse, but it also means a future theme mutation must separate semantic tokens from route-specific composition

### `appTokens`

`src/components/ui/app/tokens.ts` exposes a second reusable layer that components consume directly.

Strong shared families:

- panel/card shells
- measurement fields
- workout metric chrome
- badges
- auth shell classes
- history scaffold classes
- routine editor scaffolds

Risk:

- some entries are strongly semantic
- some entries are already route-shaped and not purely primitive

## Screen contract surfaces

Owned in:

- `src/components/ui/app/screenContract.ts`
- `src/components/ui/app/ScreenScaffold.tsx`

Declared route recipes:

- `currentSession`
- `exerciseLog`
- `sessionAddExercise`
- `editDay`
- `viewDay`
- `historyDetail`
- `exerciseDetail`
- `routinesOverview`
- `todayOverview`

What this already standardizes:

- scaffold type
- section chrome type
- row interaction mode
- footer dock ownership
- header inset mode
- section body spacing recipe

What it does not yet standardize:

- semantic color ownership
- overlay behavior
- local state-specific tones
- nav treatment
- input family ownership

## Shared components with reliable contract value

| Surface | Contract strength | Why |
| --- | --- | --- |
| `SharedScreenHeader` | High | Screen recipe backed, structurally consistent. |
| `SharedSectionShell` | High | Good section framing and label/context ownership. |
| `AppPanel` / `SurfaceCard` | High | Strong base card shell and spacing rhythm. |
| `AppButton` / `Button` | Medium-high | Intent mapping is shared, but some states still depend on CSS vars and local loading affordances. |
| `BottomDockButton` | High | Good shared control family for sticky actions. |
| `AppBadge` | High | Shared badge tones map cleanly to token families. |
| `SegmentedControl` | Medium | Strong family, but still owns local size/text and active-state classes. |
| `Input` | Medium | Good baseline, but too many related field surfaces bypass it. |
| `BottomSheet` / `OverlayChrome` | Medium-low | Shared, but not yet normalized to semantic overlay tokens. |
| `ExerciseCard` | Medium | Central shared component, but state and tone styling are still heavily local. |
| `AppNav` | Low-medium | Shared globally, but visually isolated and locally tuned. |

## Route-local surfaces still outside the strongest contract

- install notice/instruction panels
- auth readiness and remembered-account state surfaces
- history filter panels and some detail editors
- session logger summary blocks and set-entry state surfaces
- edit-day inline editor and reorder states
- app nav shell and active-tab polish
- overlay detail/info panels

## Contract extraction priorities before theme mutation prototype

1. document semantic token ownership for `ExerciseCard` states
2. define a shared overlay token family
3. unify `Input` and measurement input language
4. separate app-nav-specific shell styling from generic shared surface semantics
5. document when bottom docks, segmented controls, and toggles should share or diverge
