# Fawxzzy Fitness Overlay

Project-specific overlay for routing Playbook doctrine into `ZachariahRedfield/FawxzzyFitness`.

## Current known stack assumptions

- Next.js with App Router.
- Mobile-first UX, including PWA usage patterns.
- Supabase-backed data/auth with RLS expectations.

## Local governance expectations (in consuming repo)

The application repo is expected to maintain:

- `docs/PROJECT_GOVERNANCE.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/PLAYBOOK_NOTES.md`
- `docs/PLAYBOOK_CHECKLIST.md`

## Hot focus areas (routing pointers)

Use these as routing pointers into Core doctrine; do not treat this overlay as a duplicate source of rules.

- Mobile safe-area and top-nav ownership.
  - Route to Core: `docs/PATTERNS/mobile-interactions-and-navigation.md`, `docs/GUARDRAILS/guardrails.md`.
- Single vertical scroll owner per page shell.
  - Route to Core: `docs/GUARDRAILS/guardrails.md`, `docs/PATTERNS/mobile-interactions-and-navigation.md`.
- Bottom action/CTA patterns and reserve spacing.
  - Route to Core: `docs/PATTERNS/mobile-interactions-and-navigation.md`, `docs/GUARDRAILS/guardrails.md`.
- Portal overlays rendered outside glass/overflow contexts.
  - Route to Core: `docs/PATTERNS/mobile-interactions-and-navigation.md`.
- Canonical IDs for logging/stats/caches.
  - Route to Core: `docs/PATTERNS/deterministic-reversible-state.md`, `docs/GUARDRAILS/guardrails.md`.

## Examples only (non-normative evidence paths)

These are evidence examples from the consuming repository and are not normative Core contracts:

- `FawxzzyFitness/app/**` (route shells, nav, and scroll ownership examples).
- `FawxzzyFitness/components/**` (shared mobile action surfaces and overlay examples).
- `FawxzzyFitness/lib/**` (canonical ID mapping and stats/logging support examples).

TODO: replace wildcard evidence paths with stable, permalinking file references during next audited upstream pass.
