# Playbook Notes (Local Inbox)

This file is a project-local inbox for suggestions that should be upstreamed into the central Playbook repository.

## YYYY-MM-DD — <short title>
- Type: Principle | Pattern | Checklist | Prompt | Template | Decision
- Summary: <1–2 sentences>
- Suggested Playbook File: <path in playbook repo, if known>
- Rationale: <why this matters / what it prevents>
- Evidence: <file paths in this repo that triggered the note>
- Status: Proposed | Upstreamed | Rejected

## 2026-02-22 — Standardize mobile press feedback via shared class constant
- Type: Pattern
- Summary: Use a shared tap-feedback utility constant (`active` scale + opacity + short transition) for button-like controls in touch-heavy flows, and pair it with existing `focus-visible` rings.
- Suggested Playbook File: patterns/frontend/mobile-interactions.md
- Rationale: Repeated one-off press states drift quickly; a shared constant keeps touch response consistent without regressing keyboard accessibility.
- Evidence: src/components/ui/interactionClasses.ts, src/components/SessionExerciseFocus.tsx, src/components/SessionTimers.tsx, src/components/SessionHeaderControls.tsx, src/app/session/[id]/page.tsx
- Status: Proposed

## 2026-02-22 — Keep dark-mode glass sheen edge-weighted to avoid glare
- Type: Guardrail
- Summary: For dark mobile UIs, keep glass highlights low-intensity and edge-weighted (thin inner light + very soft gradient) rather than bright full-surface hotspots.
- Suggested Playbook File: patterns/frontend/theming-dark-mode.md
- Rationale: Strong sheen gradients quickly overpower content readability and feel noisy on small screens.
- Evidence: src/app/globals.css, src/components/ui/Glass.tsx, src/components/AppNav.tsx
- Status: Proposed

## 2026-02-22 — Centralize glass-surface intensity tokens with user preference modes
- Type: Pattern
- Summary: Define one global token contract for glass blur/tint/border/sheen and map it to app-wide modes (`on`, `reduced`, `off`) so components consume shared primitives instead of custom translucency utilities.
- Suggested Playbook File: patterns/frontend/theming-dark-mode.md
- Rationale: Tokenized intensity modes reduce visual drift, simplify performance tuning (especially on mobile Safari), and make accessibility preferences explicit.
- Evidence: src/app/globals.css, src/lib/useGlassEffects.ts, src/components/ui/Glass.tsx, src/components/settings/GlassEffectsSettings.tsx
- Status: Proposed

## 2026-02-22 — Pair offline queue sync with server idempotency fallback
- Type: Guardrail
- Summary: When syncing offline append-only logs, couple FIFO retry/backoff in the client queue with server-side idempotency (`client_log_id` if present, deterministic payload dedupe fallback if not).
- Suggested Playbook File: patterns/frontend/offline-resilience.md
- Rationale: Queue retries during reconnects can duplicate inserts without coordinated idempotency at the server boundary.
- Evidence: src/lib/offline/sync-engine.ts, src/lib/offline/set-log-queue.ts, src/app/session/[id]/page.tsx, supabase/migrations/014_sets_client_log_id_unique.sql
- Status: Proposed

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

## 2026-02-21 — Use scroll-snap windows for long mobile card timelines
- Type: Pattern
- Summary: For long chronological card feeds on mobile, wrap the list in a fixed-height `overflow-y-auto` container with `snap-y` items so users can cycle entries while the surrounding screen stays anchored.
- Suggested Playbook File: patterns/frontend/mobile-list-cards.md
- Rationale: A stationary shell with snapping list movement improves orientation and reduces visual jumpiness versus full-page scrolling through dense logs.
- Evidence: src/app/history/page.tsx
- Status: Proposed


## 2026-02-21 — Map fallback slate background utilities in dark mode
- Type: Guardrail
- Summary: If dark theming relies on utility remaps, include common fallback surfaces (`bg-slate-50`, `bg-slate-100`) so optimistic-list rows and secondary chips never render as light bars.
- Suggested Playbook File: patterns/frontend/theming-dark-mode.md
- Rationale: Partial utility mapping can leave isolated components in light palettes, creating “blank” rows where text contrast appears broken after state updates.
- Evidence: src/app/globals.css, src/components/SessionTimers.tsx
- Status: Proposed

## 2026-02-22 — Prefer named theme-surface utilities over inline rgb(var()) formulas
- Type: Guardrail
- Summary: For dark-themed containers, prefer reusable semantic utilities (e.g., `bg-surface-soft`, `bg-surface-strong`) instead of repeating inline `bg-[rgb(var(--surface)/...)]` formulas.
- Suggested Playbook File: patterns/frontend/theming-dark-mode.md
- Rationale: Named token utilities keep container styling consistent across collapsible states and reduce regression risk when refactoring utility classes.
- Evidence: src/app/globals.css, src/components/ui/CollapsibleCard.tsx, src/app/routines/[id]/edit/page.tsx
- Status: Proposed

## 2026-02-22 — Use explicit stale guardrails for offline training snapshots
- Type: Pattern
- Summary: When adding offline fallbacks for workout-day screens, cache a normalized snapshot with schema version + timestamp and always show a visible stale-data indicator when rendering cached content.
- Suggested Playbook File: patterns/frontend/offline-resilience.md
- Rationale: Offline continuity should preserve usability without implying live freshness; explicit staleness metadata reduces trust errors and support confusion.
- Evidence: src/lib/offline/today-cache.ts, src/app/today/page.tsx, src/app/today/TodayClientShell.tsx, src/app/today/TodayOfflineBridge.tsx
- Status: Proposed

## 2026-02-22 — Guard set append order with DB uniqueness + retry
- Type: Guardrail
- Summary: For append-only child rows (like workout sets), avoid count-based indexes; enforce parent-scoped uniqueness in DB and retry on unique conflicts using `max(index)+1`.
- Suggested Playbook File: patterns/backend/postgres-concurrency.md
- Rationale: Offline reconnect flushes and concurrent inserts can duplicate ordinal indexes unless allocation is conflict-safe at the database boundary.
- Evidence: src/app/session/[id]/page.tsx, supabase/migrations/013_sets_session_exercise_set_index_unique.sql
## 2026-02-22 — Queue failed set logs locally instead of dropping entries
- Type: Pattern
- Summary: For workout set logging, keep the existing server action as primary, but on offline/failure enqueue the set payload locally and render a visible queued status in the active list.
- Suggested Playbook File: patterns/frontend/offline-resilience.md
- Rationale: Users should not lose training data during transient failures, and queued-state visibility avoids false confidence about server persistence.
- Evidence: src/lib/offline/set-log-queue.ts, src/components/SessionTimers.tsx
- Status: Proposed

## 2026-02-22 — Standardize client action feedback with app-level toasts
- Type: Pattern
- Summary: For mobile-heavy flows, centralize immediate server-action feedback in a root toast provider and reuse a tiny action-result helper (`ok/error/message`) across client form handlers.
- Suggested Playbook File: patterns/frontend/action-feedback.md
- Rationale: Shared toast handling keeps feedback consistent and low-friction while preserving strict server-action ownership of data writes.
- Evidence: src/components/ui/ToastProvider.tsx, src/lib/action-feedback.ts, src/components/SessionHeaderControls.tsx, src/components/SessionAddExerciseForm.tsx, src/components/SessionExerciseFocus.tsx
## 2026-02-22 — Prefer short reduced-motion-safe transitions for session logging lists
- Type: Pattern
- Summary: For high-frequency workout logging UI (exercise focus toggles, set list updates), use short enter/exit transitions with `prefers-reduced-motion` fallback instead of hard visibility jumps.
- Suggested Playbook File: patterns/frontend/motion-accessibility.md
- Rationale: Small motion cues preserve spatial continuity without slowing core flows, while reduced-motion fallback keeps the interaction accessible.
- Evidence: src/components/SessionExerciseFocus.tsx, src/components/SessionTimers.tsx
- Status: Proposed
