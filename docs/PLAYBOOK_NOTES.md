# Playbook Notes (Local Inbox)

This file is a project-local inbox for suggestions that should be upstreamed into the central Playbook repository.

## YYYY-MM-DD — <short title>
- Type: Principle | Pattern | Checklist | Prompt | Template | Decision
- Summary: <1–2 sentences>
- Suggested Playbook File: <path in playbook repo, if known>
- Rationale: <why this matters / what it prevents>
- Evidence: <file paths in this repo that triggered the note>
- Status: Proposed | Upstreamed | Rejected

## 2026-02-21 — Prefetch primary tab destinations for dynamic mobile shells
- Type: Pattern
- Summary: In dynamic App Router screens, prefetch sibling tab routes from the active nav shell and provide a route-level loading boundary to reduce perceived latency on tab switches.
- Suggested Playbook File: patterns/frontend/navigation-performance.md
- Rationale: Dynamic server-rendered routes can feel sluggish if navigation waits on fresh payloads; explicit prefetch and immediate loading affordance improve responsiveness without architectural complexity.
- Evidence: src/components/AppNav.tsx, src/app/loading.tsx
- Status: Proposed

## 2026-02-21 — Avoid white-opacity surfaces in dark-theme mobile flows
- Type: Guardrail
- Summary: In dark-mode products, avoid hardcoded `bg-white/*` utility classes on primary containers; use theme surface tokens so expanded/collapsible panels do not wash out on iOS and low-brightness devices.
- Suggested Playbook File: patterns/frontend/theming-dark-mode.md
- Rationale: White-opacity containers can appear disabled or overexposed against dark backdrops, especially in mobile Safari screenshots.
- Evidence: src/components/ui/CollapsibleCard.tsx, src/app/routines/[id]/edit/page.tsx
- Status: Proposed


## 2026-02-21 — Use explicit split actions on dense history cards
- Type: Pattern
- Summary: For mobile list cards that need both open and manage flows, prefer explicit primary/secondary buttons (e.g., View + Edit) and keep metadata visible inside the card.
- Suggested Playbook File: patterns/frontend/mobile-list-cards.md
- Rationale: A single full-card link hides action intent and increases mis-taps when users need different next steps.
- Evidence: src/app/history/page.tsx
- Status: Proposed

## 2026-02-21 — Reconcile UI merges against theme tokens before ship
- Type: Guardrail
- Summary: When merging visual PRs into active dark-theme work, validate final utility-token output on the merged branch so contrast and hierarchy remain consistent.
- Suggested Playbook File: patterns/frontend/theming-dark-mode.md
- Rationale: Independent visual changes can pass in isolation but conflict after merge, creating low-contrast or inconsistent UI states.
- Evidence: src/app/history/page.tsx
- Status: Proposed
