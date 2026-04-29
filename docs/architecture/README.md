# Pass 2 UI Surface Control Map

This folder is the Phase/Pass 2 architecture package for `fawxzzy-fitness`.

Pass 2 no longer stops at a screen catalog. Its job is to map the app deeply enough that a future theme mutation can answer, without manual hunting:

- where color, shape, spacing, border, typography, shadow, and motion are owned
- which surfaces mutate globally together
- which surfaces are tied to state or product meaning
- which surfaces still depend on hardcoded styling clusters
- which surfaces are ready for semantic-theme mutation and which are not

## Mapping hierarchy

Pass 2 now uses a four-layer UI ownership model:

1. Parent screen template
   - route-backed template counted from `src/app/**/page.tsx`
   - stable traversal anchor for the pass
2. Child surface
   - meaningful in-screen surface such as a header, card family, chooser, dock, sheet, modal, inline editor, or empty state
3. Surface variant
   - a meaningful change in layout, action set, visibility, data source, theme behavior, state meaning, curated relevance, user decision path, or component ownership
4. Element
   - meaningful user-facing element inside a surface variant

The 21 first-class parent screen templates remain the route-level count.

Child surfaces and surface variants are tracked separately because route templates alone are not enough to support theme mutation, state mapping, or future curated-engine extraction.

## Scope

First-class routes in this pass:

- `/` -> redirect to `/entry`
- `/install`
- `/entry`
- `/login`
- `/signup`
- `/forgot-password` -> redirect to `/login`
- `/reset-password`
- `/today`
- `/routines`
- `/routines/new`
- `/routines/[id]/days/[dayId]`
- `/routines/[id]/edit`
- `/routines/[id]/edit/day/[dayId]`
- `/routines/[id]/edit/day/[dayId]/add-exercise`
- `/session/[id]`
- `/session/[id]/add-exercise`
- `/history`
- `/history/exercises`
- `/history/[sessionId]`
- `/exercises/[exerciseId]` -> redirect back to history
- `/settings`

Evidence-only routes in this pass:

- `/dev/ui-contract`
- `/dev/ui-system`
- `/dev/mobile-regression`
- history preview/live dev routes
- auth screen lab and other `/dev/*` UI seams

Frozen boundary:

- `src/app/curated-onboarding/page.tsx`

Curated onboarding is documented as a read-only dependency boundary. It is not expanded, normalized, or used to justify new runtime changes in this pass.

## Current style ownership layers

Pass 2 documents four active styling layers that coexist today:

1. Root CSS variable layer
   - `src/app/globals.css`
   - Owns raw app palette, surface stack, button vars, radius vars, glass vars, ambient vars, safe-area layout vars, and many utility overrides.
2. Frozen truth-pack token and primitive layer
   - `truth-pack/fitness/design-system/tokens.v1.json`
   - `truth-pack/fitness/design-system/primitives.v1.json`
   - Owns the declared design-system contract for tokens and primitive families.
3. Shared bridge layer
   - `src/components/ui/app/designSystem.ts`
   - `src/components/ui/app/tokens.ts`
   - `src/components/ui/app/screenContract.ts`
   - Converts the frozen truth pack into reusable Tailwind class strings and screen-family contracts.
4. Route-local and component-local class clusters
   - shared components such as `ExerciseCard`, `AppNav`, `OverlayChrome`, `Input`
   - route clients such as history, session, routine-editor, auth, and install surfaces
   - this layer contains the bulk of current theme-mutation risk

`src/styles/tokens.ts` is also present, but it is a smaller secondary abstraction and not the primary live surface bridge.

## Artifact map

- `MAPPING-SCHEMA.md`
  - canonical parent-screen, child-surface, surface-variant, and element record shapes
- `SCREEN-DELTA-LEDGER.md`
  - 21 parent screen templates, route-level scope, route-owner links, and parent-level summaries
- `SCREEN-SURFACE-VARIANT-LEDGER.md`
  - child surface inventory and major variant catalog for each parent screen
- `COMPONENT-ELEMENT-CATALOG.md`
  - major components, meaningful child elements, and ownership files
- `STATE-VISIBILITY-MATRIX.md`
  - parent/surface/element state ownership, visibility gates, and product meaning ties
- `SURFACE-SIMILARITY-GRAPH.md`
  - design-oriented similarity edges across parent screens, child surfaces, and element families
- `SHARED-CONTRACT-SURFACES.md`
  - what is already covered by truth-pack and screen-contract primitives
- `DESIGN-SURFACE-TOKEN-MAP.md`
  - normalized semantic token map, raw variable map, hardcoded style debt
- `COMPONENT-STYLING-COVERAGE.md`
  - family-by-family readiness coverage and scoring
- `VISUAL-ROLE-TAXONOMY.md`
  - semantic-role and visual-role vocabulary
- `THEME-MUTATION-TEST-PLAN.md`
  - docs-based acceptance test for future theme mutation work, including child variants
- `CURATED-ENGINE-PREREQUISITES.md`
  - frozen curated boundary and prerequisites before curated work resumes
- `MOBILE-REGRESSION-EXTRACTION-CONTRACT.md`
  - how mobile-only evidence should feed back into this map
- `PLAYBOOK-PROMOTION-NOTES.md`
  - stack-level promotion candidates captured during Pass 2

## Traversal rules

Review order is now:

1. confirm the parent screen template
2. capture the default visual evidence
3. identify child surfaces
4. identify major surface variants
5. identify theme-sensitive elements
6. link similarity and interaction edges
7. mark screenshot evidence and readiness notes
8. lock the parent screen as reviewed

`SCREEN-DELTA-LEDGER.md` answers:

- what route-backed parent screens exist
- who owns the route and primary visual surface

`SCREEN-SURFACE-VARIANT-LEDGER.md` answers:

- what meaningful child surfaces exist inside each screen
- which variants matter
- what should be screenshot-verified
- which interactions open, close, or mutate those surfaces

## Route families

### Redirect-only surfaces

- `/`
- `/forgot-password`
- `/exercises/[exerciseId]`

These routes own navigation behavior, not a distinct themed visual surface.

### Auth and install family

- `/install`
- `/login`
- `/signup`
- `/reset-password`
- `/entry`

Primary shared contracts:

- `AuthShell`
- `AuthCard`
- `AuthIntro`
- `AuthDock`
- install-specific gates layered on top of auth shell language

### Today and session family

- `/today`
- `/session/[id]`
- `/session/[id]/add-exercise`
- `/routines/[id]/days/[dayId]`

Primary shared contracts:

- `TodayRouteScaffold`
- `TodayOverviewHeader`
- `TodayOverviewScaffold`
- `ExerciseChooserRouteScaffold`
- `ExerciseCard`
- sticky dock and bottom-action families

### Routines editor family

- `/routines`
- `/routines/new`
- `/routines/[id]/edit`
- `/routines/[id]/edit/day/[dayId]`
- `/routines/[id]/edit/day/[dayId]/add-exercise`

Primary shared contracts:

- `RoutineDetailsScreenShell`
- `DetailScreenScaffold`
- `ExerciseChooserRouteScaffold`
- `SharedScreenHeader`
- `SharedSectionShell`

### History family

- `/history`
- `/history/exercises`
- `/history/[sessionId]`

Primary shared contracts:

- `HistoryRouteScaffold`
- `HistoryPageHeader`
- `HistoryTabs`
- `SharedSectionShell`
- history card families built on top of `ExerciseCard`, `SurfaceCard`, and route-local control panels

### Settings family

- `/settings`

Primary shared contracts:

- `MainTabScreen`
- `ScrollScreenWithBottomActions`
- `SurfaceCard`
- route-local accordion and identity header content

## Worker lane note

Pass 2 adds `Worker 2E - Design Surface Token Map`.

Worker 2E owns:

- semantic-role and visual-role normalization
- design-specific similarity edges
- token and shape ownership mapping
- hardcoded style debt inventory
- theme-mutation readiness scoring

This folder is the output of that lane, plus the route and component audit required to make the design map usable.

## Evidence sources used for this pass

- `src/app/globals.css`
- `tailwind.config.ts`
- `truth-pack/fitness/design-system/*.json`
- `src/components/ui/app/designSystem.ts`
- `src/components/ui/app/tokens.ts`
- `src/components/ui/app/screenContract.ts`
- route family scaffolds in `src/components/history`, `src/components/today`, `src/components/exercises`, `src/components/auth`
- shared UI primitives in `src/components/ui/**`
- major route client files in `src/app/**`
- `/dev/ui-contract`, `/dev/ui-system`, and mobile regression surfaces as evidence-only inspection seams
