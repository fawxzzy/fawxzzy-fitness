# Curated Engine Prerequisites

This file records the curated boundary for Pass 2.

## Current boundary

- Route: `/curated-onboarding`
- Entry file: `src/app/curated-onboarding/page.tsx`
- Primary surface owner: `CuratedOnboardingShell`
- Runtime gate: `isCuratedOnboardingEnabled()`

## Pass 2 rule

Curated-engine work remains frozen during this pass.

Allowed:

- record the route as a boundary surface
- note whether it appears to share tokens or not
- capture dependencies on shared auth, header, or card language

Not allowed:

- expand curated onboarding into first-class route mapping depth
- normalize or refactor curated components
- use curated as justification for changing live shared primitives
- build theme switching against curated surfaces in this pass

## Why the freeze stays in place

- curated work has a separate product boundary and should not be pulled into a documentation-led theme audit by accident
- shared primitives must be mapped on the main app first
- a partial theme-ready pass that silently drifts curated surfaces would create false confidence

## What Pass 2 still records

- curated route exists
- curated is gated behind a feature flag
- curated depends on auth and entry flow routing
- curated should later consume the same semantic token namespace when the freeze lifts

## Prerequisites before curated expansion resumes

1. primary/shared action tokens are stable across auth, install, today, history, routines, and settings
2. card, section, and input families have explicit readiness scores and exception lists
3. overlay and chooser surfaces have a documented semantic token path
4. the first theme mutation prototype has been run on the non-curated app
5. misses from that prototype have been fed back into this map

## Curated-specific questions deferred until after the freeze

- should curated cards share the same card token family or a distinct campaign-style family
- should curated progress surfaces reuse existing success/current semantics
- which curated states are global design language and which are intentionally campaign-local

## Pass 2 conclusion

Curated onboarding is a downstream consumer of this map, not a scope-expansion vehicle for this pass.
