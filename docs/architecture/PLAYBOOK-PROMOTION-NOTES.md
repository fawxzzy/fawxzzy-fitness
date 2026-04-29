# Playbook Promotion Notes

These are stack-level promotion candidates discovered during Pass 2.

## Proposed notes

### Screen templates must be counted from route ownership before component mapping begins

- Type: Rule
- Rule: screen templates must be counted from route ownership before component mapping begins
- Summary: Pass 2 route scope should be established from `src/app/**/page.tsx` ownership first, then reconciled against shared components and downstream surface families
- Rationale: prevents the mapping pass from silently dropping redirect-owned routes, double-counting dev/evidence surfaces, or assigning screen ownership to shared components before route scope is confirmed
- Evidence:
  - `src/app/page.tsx`
  - `src/app/forgot-password/page.tsx`
  - `src/app/exercises/[exerciseId]/page.tsx`
  - `docs/architecture/SCREEN-DELTA-LEDGER.md`

### A numbered screen index gives the mapping pass a deterministic traversal order

- Type: Pattern
- Pattern: a numbered screen index gives the mapping pass a deterministic traversal order
- Summary: once the first-class route list is fixed, the ledger should assign an explicit screen number so component, token, and similarity mapping can be reviewed one surface at a time without drifting scope
- Rationale: keeps review order stable across workers and turns a broad architecture pass into a reproducible checklist
- Evidence:
  - `docs/architecture/SCREEN-DELTA-LEDGER.md`
  - `docs/architecture/README.md`
  - `docs/architecture/MAPPING-SCHEMA.md`

### Starting component or theme mapping before confirming route scope causes missing screens and duplicated ownership assumptions

- Type: Failure Mode
- Failure Mode: starting component or theme mapping before confirming route scope causes missing screens and duplicated ownership assumptions
- Summary: if route-backed templates are not counted first, teams will often map shared shells as if they were screens, miss redirect-owned routes entirely, and duplicate ownership across history, chooser, and auth families
- Rationale: route ownership is the only stable starting boundary for a screen-first mutation map
- Evidence:
  - `src/app/dev/ui-contract/page.tsx`
  - `src/app/dev/ui-system/page.tsx`
  - `src/app/curated-onboarding/page.tsx`
  - `docs/architecture/SCREEN-DELTA-LEDGER.md`

### Route templates are not the same as complete screen ownership; nested child surfaces and meaningful variants must be cataloged separately

- Type: Rule
- Rule: route templates are not the same as complete screen ownership; nested child surfaces and meaningful variants must be cataloged separately
- Summary: the route-backed parent screen list is the traversal anchor, but overlays, drawers, sheets, expanded cards, inline editors, empty states, and sticky controls must be mapped as child surfaces under that anchor
- Rationale: route scope alone is not deep enough to support theme mutation, state mapping, or curated-engine extraction
- Evidence:
  - `docs/architecture/SCREEN-DELTA-LEDGER.md`
  - `docs/architecture/SCREEN-SURFACE-VARIANT-LEDGER.md`
  - `docs/architecture/MAPPING-SCHEMA.md`

### Use a Parent Screen -> Child Surface -> Surface Variant hierarchy to avoid flattening complex UI flows or losing in-screen states

- Type: Pattern
- Pattern: use a Parent Screen -> Child Surface -> Surface Variant hierarchy to avoid flattening complex UI flows or losing in-screen states
- Summary: a screen-first architecture pass should preserve the route-backed parent count while recording meaningful nested ownership underneath it instead of multiplying routes or collapsing everything into one flat screen summary
- Rationale: complex app flows such as session logging, routine day editing, chooser routes, and history detail screens depend on nested states that do not deserve separate routes but do deserve separate mapping entries
- Evidence:
  - `docs/architecture/README.md`
  - `docs/architecture/MAPPING-SCHEMA.md`
  - `docs/architecture/SCREEN-SURFACE-VARIANT-LEDGER.md`

### Counting only route-level screens hides expanded cards, drawers, modals, inline editors, and state variants that later break theme mutation and curated-engine integration

- Type: Failure Mode
- Failure Mode: counting only route-level screens hides expanded cards, drawers, modals, inline editors, and state variants that later break theme mutation and curated-engine integration
- Summary: if the mapping pass stops at route templates, teams will miss state-heavy in-screen surfaces such as session exercise card expansion, chooser selection states, destructive confirmations, and sticky mobile controls
- Rationale: those missed surfaces are where theme drift, action confusion, and contract gaps usually appear first
- Evidence:
  - `docs/architecture/SCREEN-SURFACE-VARIANT-LEDGER.md`
  - `docs/architecture/THEME-MUTATION-TEST-PLAN.md`
  - `src/components/SessionPageClient.tsx`
  - `src/app/today/TodayExerciseRows.tsx`

### Semantic visual roles should be mapped before global theme mutation

- Type: Pattern
- Rule: semantic visual roles should be mapped before global theme mutation
- Summary: global visual mutation is only safe when major surfaces are classified by meaning first, then by shape and token ownership
- Rationale: prevents teams from changing raw colors or radii globally and accidentally collapsing destructive, warning, selected, and success meaning into one undifferentiated accent system
- Evidence:
  - `src/app/globals.css`
  - `truth-pack/fitness/design-system/tokens.v1.json`
  - `src/components/ExerciseCard.tsx`
  - `src/components/AppNav.tsx`
  - `src/components/ui/OverlayChrome.tsx`

### Use a theme mutation test to validate UI surface mapping completeness

- Type: Guardrail
- Pattern: use a theme mutation test to validate UI surface mapping completeness
- Summary: a mapping pass is only complete when a proposed global color/shape/spacing mutation can predict which surfaces should change, which should stay local, and where manual fixes are expected
- Rationale: converts design-system mapping from a passive documentation exercise into a falsifiable architecture contract
- Evidence:
  - `docs/architecture/THEME-MUTATION-TEST-PLAN.md`
  - `docs/architecture/SURFACE-SIMILARITY-GRAPH.md`
  - `docs/architecture/DESIGN-SURFACE-TOKEN-MAP.md`

### Changing raw colors globally without semantic roles causes product meaning to collapse

- Type: Failure Mode
- Failure Mode: changing raw colors globally without semantic roles causes product meaning to collapse
- Summary: current accent, success, warning, and selected/current states are partially shared and partially local; mutating raw color values without semantic-role mapping would make some surfaces converge incorrectly
- Rationale: prevents false theme-readiness claims when success/completed, selected/current, and destructive states still depend on local tone clusters
- Evidence:
  - `src/components/cardSemanticTones.ts`
  - `src/components/ExerciseCard.tsx`
  - `src/components/layout/BottomDockButton.tsx`
  - `src/components/ui/SegmentedControl.tsx`

### Client-only install context changes can create hydration mismatch when server-rendered copy differs from forced client gate state

- Type: Failure Mode
- Failure Mode: client-only install context changes can create hydration mismatch when server-rendered copy differs from forced client gate state
- Summary: when `/install` forced-state review depends on a client-only gate override, desktop copy and forced iOS gate state can disagree during hydration, which creates false runtime noise and makes screenshot evidence unreliable
- Rationale: visual evidence for state-forced review routes is only trustworthy when the server route and client surface begin from the same install context
- Evidence:
  - `src/app/install/page.tsx`
  - `src/components/install/InstallRouteSurface.tsx`
  - `docs/architecture/STATE-VISIBILITY-MATRIX.md`
  - `tmp/install-review-v2/install-desktop-v2.png`
  - `tmp/install-review-v2/install-ios-safari-v2.png`
  - `tmp/install-review-v2/install-ios-inapp-v2.png`

### State-forced visual review routes need server/client render parity before screenshot evidence is trusted

- Type: Pattern
- Pattern: state-forced visual review routes need server/client render parity before screenshot evidence is trusted
- Summary: pass forced review state through the server route into the route surface first, then let the client honor the same seed so the captured UI reflects one stable state instead of a pre-hydration fallback
- Rationale: prevents false "2 errors" toast evidence from polluting screenshot review and separates real UI defects from hydration noise
- Evidence:
  - `src/app/install/page.tsx`
  - `src/components/install/InstallRouteSurface.tsx`
  - `docs/architecture/SCREEN-SURFACE-VARIANT-LEDGER.md`
  - `tmp/install-review-v2/install-desktop-v2.png`
  - `tmp/install-review-v2/install-ios-safari-v2.png`
  - `tmp/install-review-v2/install-ios-inapp-v2.png`

### Entry/auth family screens should share shell, card, dock, CTA, and copy hierarchy contracts unless a screen has a product-specific exception

- Type: Pattern
- Pattern: entry/auth family screens should share shell, card, dock, CTA, and copy hierarchy contracts unless a screen has a product-specific exception
- Summary: `/entry` fallback reuses the auth shell/card/dock contract already established by install/login/signup surfaces, while its full-screen handoff loader is the explicit product-specific exception instead of a new standalone family
- Rationale: preserves one coherent auth-family surface language even when a route is mostly transitional
- Evidence:
  - `src/components/auth/InitialExperienceGate.tsx`
  - `src/components/auth/AuthShell.tsx`
  - `src/components/install/InstallRouteSurface.tsx`
  - `docs/architecture/SURFACE-SIMILARITY-GRAPH.md`

### Treating entry/auth screens as isolated pages creates duplicated CTA, dock, and card styling that later breaks theme mutation

- Type: Failure Mode
- Failure Mode: treating entry/auth screens as isolated pages creates duplicated CTA, dock, and card styling that later breaks theme mutation
- Summary: if `/entry` fallback, `/install`, and auth form routes are documented as separate visual languages instead of one shared family with explicit exceptions, dock action layouts and recovery card styling will drift locally and lose mutation parity
- Rationale: the shared auth shell and dock family are already the stable contract; only the route-loading handoff should remain exceptional
- Evidence:
  - `src/components/auth/InitialExperienceGate.tsx`
  - `src/components/install/InstallRouteSurface.tsx`
  - `docs/architecture/SCREEN-SURFACE-VARIANT-LEDGER.md`
  - `docs/architecture/SURFACE-SIMILARITY-GRAPH.md`

### Auth form screens should share shell, card, field, validation, CTA, and dock contracts unless a screen has a product-specific exception

- Type: Pattern
- Pattern: auth form screens should share shell, card, field, validation, CTA, and dock contracts unless a screen has a product-specific exception
- Summary: `/login`, `/signup`, and `/reset-password` all rely on the same auth shell, field container, footer-link, and bottom-dock primitives; route-specific behavior should appear as documented variants instead of one-off styling forks
- Rationale: keeps the auth family reviewable as one mutation surface with explicit exceptions rather than parallel page-local form systems
- Evidence:
  - `src/app/login/LoginScreen.tsx`
  - `src/components/auth/SignupForm.tsx`
  - `src/app/reset-password/ResetPasswordForm.tsx`
  - `src/components/auth/AuthShell.tsx`
  - `docs/architecture/SCREEN-SURFACE-VARIANT-LEDGER.md`

### Letting each auth form own local field/error/button styling creates duplicate theme-mutation targets and inconsistent validation states

- Type: Failure Mode
- Failure Mode: letting each auth form own local field/error/button styling creates duplicate theme-mutation targets and inconsistent validation states
- Summary: login already mixes shared auth shells with route-local validity emphasis, toast-driven route errors, and dock loading states; if signup or reset drift into separate field/error/button styling, future theme mutation will miss disabled, loading, and error parity across the auth family
- Rationale: auth-field, status, and CTA states need one shared contract before any global theme work starts
- Evidence:
  - `src/app/login/LoginScreen.tsx`
  - `src/app/reset-password/ResetPasswordForm.tsx`
  - `src/components/auth/AuthShell.tsx`
  - `docs/architecture/STATE-VISIBILITY-MATRIX.md`
  - `docs/architecture/SURFACE-SIMILARITY-GRAPH.md`

## Worker 2E note

- Type: Decision
- Summary: `Worker 2E - Design Surface Token Map` owns semantic-role normalization, token ownership mapping, hardcoded style debt inventory, and theme-mutation readiness scoring
- Rationale: Pass 2 needs a dedicated lane for design-surface control mapping instead of burying that work under a generic screen catalog
- Evidence:
  - `docs/architecture/README.md`
  - `docs/architecture/MAPPING-SCHEMA.md`
  - `docs/architecture/COMPONENT-STYLING-COVERAGE.md`
