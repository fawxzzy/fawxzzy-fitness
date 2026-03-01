This file is a project-local inbox for suggestions that should be upstreamed into the central Playbook repository.

## YYYY-MM-DD — <short title>
- Type: Principle | Pattern | Checklist | Prompt | Template | Decision
- Summary: <1–2 sentences>
- Suggested Playbook File: <path in playbook repo, if known>
- Rationale: <why this matters / what it prevents>
- Evidence: <file paths in this repo that triggered the note>
- Status: Proposed | Upstreamed | Rejected

## PROPOSED


# Playbook Notes (Local Inbox)

## UPSTREAMED (keep for traceability)

## 2026-02-28 — Resolve cached/aggregated stats by canonical entity ID at render boundaries
- Type: Guardrail
- Summary: Any derived stats keyed by canonical entity IDs must be threaded and queried using canonical IDs across list selection, detail routes, and custom-item wrappers.
- Suggested Playbook File: Playbook/docs/PATTERNS/deterministic-reversible-state.md
- Rationale: Mixed ID domains (custom wrapper IDs vs canonical IDs) silently hide valid derived data even when the backing rows exist.
- Evidence: src/app/session/[id]/page.tsx, src/components/ExercisePicker.tsx, src/app/exercises/[exerciseId]/page.tsx
## 2026-02-28 — Reuse one measurement-to-goal payload mapper across create flows
- Type: Guardrail
- Summary: Flows that create exercise rows from the same measurement UI contract (e.g., routine editor and active session add-exercise) should use one shared parser/mapper for target payload serialization.
- Suggested Playbook File: Playbook/docs/PATTERNS/deterministic-reversible-state.md
- Rationale: Prevents drift where one flow silently drops target fields while another persists them, causing inconsistent saved goals for identical UI input.
- Evidence: src/lib/exercise-goal-payload.ts, src/app/routines/[id]/edit/day/actions.ts, src/app/session/[id]/actions.ts
- Status: Proposed


## 2026-02-28 — Recompute derived performance caches after both additive and destructive history mutations
- Type: Guardrail
- Summary: Any cached per-entity performance snapshot (e.g., Last performed, PR) must be recomputed deterministically after session completion and session deletion for only the affected entities.
- Suggested Playbook File: Playbook/docs/PATTERNS/deterministic-reversible-state.md
- Rationale: Prevents stale “best/last” claims after destructive history edits while keeping recomputation bounded and predictable.
- Evidence: src/lib/exercise-stats.ts, src/app/session/[id]/actions.ts, src/app/history/page.tsx
- Status: Proposed

## 2026-02-28 — Render destructive confirmations in a body-level portal with full-viewport isolation
- Type: Guardrail
- Summary: Destructive confirmations launched from scrollable/tinted card lists should mount through `document.body` (or shared Dialog portal) with fixed full-viewport backdrop + blur to avoid stacking-context bleed-through.
- Suggested Playbook File: Playbook/docs/PATTERNS/mobile-interactions-and-navigation.md
- Rationale: Inline-mounted overlays can inherit card/list stacking and clipping behavior, causing text bleed and weaker destructive affordance clarity on mobile.
- Evidence: src/components/ui/ConfirmDestructiveModal.tsx, src/app/history/page.tsx
- Status: Proposed

## 2026-02-28 — Pair risk-tiered destructive safeguards with reversible undo where feasible
- Type: Pattern
- Summary: Use a shared destructive confirmation modal for high-risk irreversible actions, and a short undo toast window for low/medium removals only when full client state is available for deterministic restore.
- Suggested Playbook File: Playbook/docs/PATTERNS/deterministic-reversible-state.md
- Rationale: Prevents accidental destructive loss while preserving fast workflows by reserving undo only for safely reversible operations.
- Evidence: src/components/ui/ConfirmDestructiveModal.tsx, src/components/ui/useUndoAction.ts, src/components/SessionTimers.tsx, src/components/SessionExerciseFocus.tsx
- Status: Proposed

## 2026-02-27 — Generate runtime media manifests from public assets for deterministic lookups
- Type: Guardrail
- Summary: When UI code resolves static media by slug, generate a build-time manifest from the asset directory and only request files declared in that manifest.
- Suggested Playbook File: patterns/frontend/media-fallbacks.md
- Rationale: Prevents noisy production 404 spam caused by optimistic path construction when catalog slugs outpace available assets.
- Evidence: scripts/generate-exercise-icon-manifest.mjs, src/generated/exerciseIconManifest.ts, src/lib/exerciseImages.ts
- Status: Proposed

## 2026-02-27 — Cache known-missing media URLs per session in shared image components
- Type: Guardrail
- Summary: Shared image components should keep an in-memory set of failed source URLs and immediately render deterministic fallbacks for repeat references during the same session.
- Suggested Playbook File: patterns/frontend/media-fallbacks.md
- Rationale: Prevents repeated 404 request spam and unnecessary network churn when placeholder-backed asset catalogs are intentionally incomplete.
- Evidence: src/components/ExerciseAssetImage.tsx, src/components/ExercisePicker.tsx, src/app/exercises/[exerciseId]/page.tsx
- Status: Upstreamed (Playbook commit/PR link)
  
## 2026-02-27 — Detail routes should tolerate catalog/data rollout mismatch
- Type: Guardrail
- Summary: When list UIs can render from canonical fallback catalogs, linked detail routes should resolve the same canonical record before returning 404.
- Suggested Playbook File: patterns/frontend/mobile-interactions.md
- Rationale: Prevents broken “details/info” navigation during partial seeds, cache lag, or environment drift where list and detail data sources briefly diverge.
- Evidence: src/components/ExercisePicker.tsx, src/app/exercises/[exerciseId]/page.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-26 — Treat seeded placeholder media paths as missing at render time
- Type: Guardrail
- Summary: UI media rendering should validate seeded/path fields and treat known placeholder sentinel values (`placeholder`, `n/a`, `null`, `about:blank`, etc.) as absent so deterministic fallbacks can render.
- Suggested Playbook File: patterns/frontend/media-fallbacks.md
- Rationale: Truthy-but-non-usable media strings silently suppress fallback UI and create stale placeholder tiles in production flows.
- Evidence: src/components/ExercisePicker.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-26 — Persist session-to-plan exercise linkage for duplicate-safe target resolution
- Type: Guardrail
- Summary: When materializing sessions from routine templates, persist the originating `routine_day_exercises.id` on each `session_exercises` row and prefer that key for planned target lookup before position/exercise fallbacks.
- Suggested Playbook File: patterns/versioned-persistence.md
- Rationale: Explicit row linkage prevents duplicate planned exercises from collapsing onto shared target state and keeps logger defaults deterministic for each session row.
- Evidence: supabase/migrations/024_session_exercises_routine_day_exercise_fk.sql, src/app/today/page.tsx, src/app/session/[id]/queries.ts, src/lib/session-targets.ts
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-25 — Prefer route-based detail screens over nested overlays for dense mobile content
- Type: Guardrail
- Summary: When an inline modal cannot comfortably present exercise/media metadata on small screens, move that content to a dedicated route with explicit return navigation.
- Suggested Playbook File: patterns/frontend/mobile-interactions.md
- Rationale: Route-based detail pages reduce overlay stacking complexity and give dense instructional content enough layout space to stay readable.
- Evidence: src/components/ExercisePicker.tsx, src/app/exercises/[exerciseId]/page.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-25 — Prevent mobile focus-zoom and surface disclosure state in dense edit lists
- Type: Guardrail
- Summary: On mobile form-heavy screens, keep input/select/textarea font sizes at or above 16px to prevent Safari focus zoom, and ensure disclosure controls reflect open/closed state with explicit label swaps.
- Suggested Playbook File: patterns/frontend/mobile-interactions.md
- Rationale: Focus-zoom jumps and ambiguous disclosure labels create avoidable navigation friction in touch workflows.
- Evidence: src/app/globals.css, src/app/routines/[id]/edit/day/[dayId]/page.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-24 — Keep workout-day switching session-scoped on Today
- Type: Guardrail
- Summary: When users need to run a different routine day ad hoc, apply the selection as a temporary session-start override instead of mutating routine day order or start-date metadata.
- Suggested Playbook File: patterns/frontend/mobile-session-flows.md
- Rationale: Session-scoped overrides satisfy day-switch intent quickly while preserving deterministic routine structure and avoiding accidental long-term plan drift.
- Evidence: src/app/today/page.tsx, src/app/today/TodayDayPicker.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-23 — Reuse shared list-shell tokens across tabbed mobile feeds
- Type: Pattern
- Summary: For sibling list tabs (for example Routines and History), centralize shell-only classes (viewport height, overflow behavior, snap, card shell, and action tap-target sizing) in one tiny token module.
- Suggested Playbook File: patterns/frontend/mobile-list-cards.md
- Rationale: Shared shell tokens keep mobile list ergonomics consistent without introducing heavy component abstraction or visual redesign drift.
- Evidence: src/components/ui/listShellClasses.ts, src/app/routines/page.tsx, src/app/history/page.tsx
- Status: Upstreamed (Playbook commit/PR link)
## 2026-02-22 — Standardize mobile press feedback via shared class constant
- Type: Pattern
- Summary: Use a shared tap-feedback utility constant (`active` scale + opacity + short transition) for button-like controls in touch-heavy flows, and pair it with existing `focus-visible` rings.
- Suggested Playbook File: patterns/frontend/mobile-interactions.md
- Rationale: Repeated one-off press states drift quickly; a shared constant keeps touch response consistent without regressing keyboard accessibility.
- Evidence: src/components/ui/interactionClasses.ts, src/components/SessionExerciseFocus.tsx, src/components/SessionTimers.tsx, src/components/SessionHeaderControls.tsx, src/app/session/[id]/page.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-22 — Keep dark-mode glass sheen edge-weighted to avoid glare
- Type: Guardrail
- Summary: For dark mobile UIs, keep glass highlights low-intensity and edge-weighted (thin inner light + very soft gradient) rather than bright full-surface hotspots.
- Suggested Playbook File: patterns/frontend/theming-dark-mode.md
- Rationale: Strong sheen gradients quickly overpower content readability and feel noisy on small screens.
- Evidence: src/app/globals.css, src/components/ui/Glass.tsx, src/components/AppNav.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-22 — Centralize glass-surface intensity tokens with user preference modes
- Type: Pattern
- Summary: Define one global token contract for glass blur/tint/border/sheen and map it to app-wide modes (`on`, `reduced`, `off`) so components consume shared primitives instead of custom translucency utilities.
- Suggested Playbook File: patterns/frontend/theming-dark-mode.md
- Rationale: Tokenized intensity modes reduce visual drift, simplify performance tuning (especially on mobile Safari), and make accessibility preferences explicit.
- Evidence: src/app/globals.css, src/lib/useGlassEffects.ts, src/components/ui/Glass.tsx, src/components/settings/GlassEffectsSettings.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-22 — Pair offline queue sync with server idempotency fallback
- Type: Guardrail
- Summary: When syncing offline append-only logs, couple FIFO retry/backoff in the client queue with server-side idempotency (`client_log_id` if present, deterministic payload dedupe fallback if not).
- Suggested Playbook File: patterns/frontend/offline-resilience.md
- Rationale: Queue retries during reconnects can duplicate inserts without coordinated idempotency at the server boundary.
- Evidence: src/lib/offline/sync-engine.ts, src/lib/offline/set-log-queue.ts, src/app/session/[id]/page.tsx, supabase/migrations/014_sets_client_log_id_unique.sql
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-21 — Prefetch primary tab destinations for dynamic mobile shells
- Type: Pattern
- Summary: In dynamic App Router screens, prefetch sibling tab routes from the active nav shell and provide a route-level loading boundary to reduce perceived latency on tab switches.
- Suggested Playbook File: patterns/frontend/navigation-performance.md
- Rationale: Dynamic server-rendered routes can feel sluggish if navigation waits on fresh payloads; explicit prefetch and immediate loading affordance improve responsiveness without architectural complexity.
- Evidence: src/components/AppNav.tsx, src/app/loading.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-21 — Avoid white-opacity surfaces in dark-theme mobile flows
- Type: Guardrail
- Summary: In dark-mode products, avoid hardcoded `bg-white/*` utility classes on primary containers; use theme surface tokens so expanded/collapsible panels do not wash out on iOS and low-brightness devices.
- Suggested Playbook File: patterns/frontend/theming-dark-mode.md
- Rationale: White-opacity containers can appear disabled or overexposed against dark backdrops, especially in mobile Safari screenshots.
- Evidence: src/components/ui/CollapsibleCard.tsx, src/app/routines/[id]/edit/page.tsx
- Status: Upstreamed (Playbook commit/PR link)


## 2026-02-21 — Use explicit split actions on dense history cards
- Type: Pattern
- Summary: For mobile list cards that need both open and manage flows, prefer explicit primary/secondary buttons (e.g., View + Edit) and keep metadata visible inside the card.
- Suggested Playbook File: patterns/frontend/mobile-list-cards.md
- Rationale: A single full-card link hides action intent and increases mis-taps when users need different next steps.
- Evidence: src/app/history/page.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-21 — Reconcile UI merges against theme tokens before ship
- Type: Guardrail
- Summary: When merging visual PRs into active dark-theme work, validate final utility-token output on the merged branch so contrast and hierarchy remain consistent.
- Suggested Playbook File: patterns/frontend/theming-dark-mode.md
- Rationale: Independent visual changes can pass in isolation but conflict after merge, creating low-contrast or inconsistent UI states.
- Evidence: src/app/history/page.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-21 — Use scroll-snap windows for long mobile card timelines
- Type: Pattern
- Summary: For long chronological card feeds on mobile, wrap the list in a fixed-height `overflow-y-auto` container with `snap-y` items so users can cycle entries while the surrounding screen stays anchored.
- Suggested Playbook File: patterns/frontend/mobile-list-cards.md
- Rationale: A stationary shell with snapping list movement improves orientation and reduces visual jumpiness versus full-page scrolling through dense logs.
- Evidence: src/app/history/page.tsx
- Status: Upstreamed (Playbook commit/PR link)


## 2026-02-21 — Map fallback slate background utilities in dark mode
- Type: Guardrail
- Summary: If dark theming relies on utility remaps, include common fallback surfaces (`bg-slate-50`, `bg-slate-100`) so optimistic-list rows and secondary chips never render as light bars.
- Suggested Playbook File: patterns/frontend/theming-dark-mode.md
- Rationale: Partial utility mapping can leave isolated components in light palettes, creating “blank” rows where text contrast appears broken after state updates.
- Evidence: src/app/globals.css, src/components/SessionTimers.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-22 — Prefer named theme-surface utilities over inline rgb(var()) formulas
- Type: Guardrail
- Summary: For dark-themed containers, prefer reusable semantic utilities (e.g., `bg-surface-soft`, `bg-surface-strong`) instead of repeating inline `bg-[rgb(var(--surface)/...)]` formulas.
- Suggested Playbook File: patterns/frontend/theming-dark-mode.md
- Rationale: Named token utilities keep container styling consistent across collapsible states and reduce regression risk when refactoring utility classes.
- Evidence: src/app/globals.css, src/components/ui/CollapsibleCard.tsx, src/app/routines/[id]/edit/page.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-22 — Use explicit stale guardrails for offline training snapshots
- Type: Pattern
- Summary: When adding offline fallbacks for workout-day screens, cache a normalized snapshot with schema version + timestamp and always show a visible stale-data indicator when rendering cached content.
- Suggested Playbook File: patterns/frontend/offline-resilience.md
- Rationale: Offline continuity should preserve usability without implying live freshness; explicit staleness metadata reduces trust errors and support confusion.
- Evidence: src/lib/offline/today-cache.ts, src/app/today/page.tsx, src/app/today/TodayClientShell.tsx, src/app/today/TodayOfflineBridge.tsx
- Status: Upstreamed (Playbook commit/PR link)

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
- Status: Upstreamed (Playbook commit/PR link)

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
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-22 — Keep history logs read-first with explicit edit mode
- Type: Pattern
- Summary: For completed workout history, default to a read-only audit screen and require explicit Edit → Save/Cancel for metadata updates.
- Suggested Playbook File: patterns/frontend/history-audit-views.md
- Rationale: Completed records should communicate finality and avoid accidental “resume session” behavior while still allowing intentional note/day-name corrections.
- Evidence: src/app/history/page.tsx, src/app/history/[sessionId]/page.tsx, src/app/history/[sessionId]/LogAuditClient.tsx
- Status: Upstreamed (Playbook commit/PR link)


## 2026-02-23 — Standardize server-action result semantics with navigation-only redirects
- Type: Guardrail
- Summary: Use a shared `ActionResult<T>` union (`ok + data` success, `ok + error` failure) for non-navigation server-action outcomes, and reserve redirects strictly for navigation transitions.
- Suggested Playbook File: patterns/server-client-boundaries.md
- Rationale: Mixed return/redirect error semantics increase UI adapter complexity and make action behavior less deterministic across features.
- Evidence: src/lib/action-result.ts, src/app/session/[id]/actions.ts, src/components/SessionTimers.tsx, src/lib/offline/sync-engine.ts
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-23 — Persist long-running workout timers with restart-safe local state
- Type: Pattern
- Summary: For in-progress workout/session timers, persist `{elapsedSeconds, isRunning, runningStartedAt}` to local storage and restore from wall-clock delta so timers survive app backgrounding and process restarts.
- Suggested Playbook File: patterns/frontend/offline-resilience.md
- Rationale: Timer continuity is user-critical session state and should not reset when the app is closed or backgrounded.
- Evidence: src/components/SessionTimers.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-24 — Tie resumable-session UI state to explicit local storage keys
- Type: Pattern
- Summary: For resumable workout flows, persist per-exercise logger state (`sets + form inputs`) under deterministic `sessionId + sessionExerciseId` keys and restore on mount before queue hydration.
- Suggested Playbook File: patterns/frontend/offline-resilience.md
- Rationale: Users expect “resume workout” continuity to include in-progress interaction state, not just server-fetched records.
- Evidence: src/components/SessionTimers.tsx
- Status: Proposed

## 2026-02-24 — Resolve local-day status and timestamps from one timezone source
- Type: Guardrail
- Summary: For day-scoped workout UX (today routing, completion badges, and history clocks), derive day windows and displayed timestamps from user-local timezone context instead of mixing routine/server timezone assumptions.
- Suggested Playbook File: patterns/timezone-determinism.md
- Rationale: Mixed timezone sources can shift local-day boundaries and produce incorrect “current day” and saved-time displays.
- Evidence: src/app/today/page.tsx, src/app/history/page.tsx, src/app/history/[sessionId]/page.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-24 — Start-workout server action should return ActionResult for non-navigation failures
- Type: Guardrail
- Summary: For server actions that can fail in-place (like starting a workout from Today), return `ActionResult<T>` failures to the client and handle feedback in UI; navigate only on successful transition.
- Suggested Playbook File: patterns/server-client-boundaries.md
- Rationale: Redirect-based error transport (`?error=...`) mixes navigation and failure semantics, while ActionResult keeps outcomes deterministic for client adapters.
- Evidence: src/app/today/page.tsx, src/app/today/TodayStartButton.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-24 — Restore persisted running timers with non-additive wall-clock reconciliation
- Type: Guardrail
- Summary: When resuming persisted running timers, derive elapsed time from one authoritative source (`runningStartedAt`) or reconcile with stored elapsed using `max(...)`; do not add both values together.
- Suggested Playbook File: patterns/frontend/offline-resilience.md
- Rationale: Additive reconciliation can double-count elapsed time after navigation/resume and breaks deterministic timer continuity.
- Evidence: src/components/SessionTimers.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-24 — Exercise-picker detail overlays should lazy-load metadata via strict server action
- Type: Pattern
- Summary: Keep exercise pickers fast by loading a minimal option list first (`id`, `name`, lightweight tags/thumb) and fetch full detail payload only when the user opens an info overlay.
- Suggested Playbook File: patterns/server-client-boundaries.md
- Rationale: This preserves responsive search/select UX and keeps database access in authenticated server actions with explicit ActionResult contracts.
- Evidence: src/components/ExercisePicker.tsx, src/app/actions/exercises.ts, src/lib/exercises.ts
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-24 — Use shared button tokens/components for primary cross-screen actions
- Type: Pattern
- Summary: Define app-level button design tokens once (size, colors, states, motion) and apply shared button primitives to high-frequency actions (start/resume/end/create/view/change-day/back).
- Suggested Playbook File: patterns/frontend/mobile-interactions.md
- Rationale: Shared primitives prevent action-style drift and preserve consistent touch feedback/accessibility without redesigning each screen.
- Evidence: src/app/globals.css, src/components/ui/AppButton.tsx, src/components/ui/TopRightBackButton.tsx, src/app/today/TodayDayPicker.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-25 — Keep timezone UX simple while preserving canonical storage values
- Type: Pattern
- Summary: Expose a small set of user-friendly timezone choices in mobile forms, then normalize device/legacy timezone inputs to canonical values used by server-side scheduling logic.
- Suggested Playbook File: patterns/timezone-determinism.md
- Rationale: A short, predictable timezone list reduces decision friction and accidental misconfiguration while preserving deterministic day-window behavior.
- Evidence: src/lib/timezones.ts, src/app/routines/new/page.tsx, src/app/routines/[id]/edit/page.tsx, src/components/RoutineLocalDefaults.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-25 — Prefer inline chooser cards over fixed overlays inside constrained glass surfaces
- Type: Guardrail
- Summary: When an interaction is scoped to a single card (like day selection before start), render the chooser inline in normal layout flow rather than as a fixed overlay layered above backdrop-filter surfaces.
- Suggested Playbook File: patterns/frontend/mobile-interactions.md
- Rationale: Fixed overlays inside constrained/mobile cards can cause clipping and visual artifacts with layered translucent backgrounds.
- Evidence: src/app/today/TodayDayPicker.tsx
- Status: Upstreamed (Playbook commit/PR link)

### 2026-02-25 — Prefer in-app dirty-navigation guards over browser-native prompts for routine editing
- Context: Routine edit/discard protection produced disruptive native browser confirm dialogs.
- Decision: Use scoped in-app confirmation modal for in-app navigation on dirty state, and avoid global/unscoped unload prompts unless strictly required.
- Impact: Keeps navigation intent clear on mobile, reduces accidental prompt fatigue, and preserves clean client UX boundaries.

## 2026-02-25 — Debounce persisted scroll state in dense interactive lists
- Type: Guardrail
- Summary: When list scroll position is only needed for return-navigation context, debounce persistence writes/state updates instead of updating React state on every scroll event.
- Suggested Playbook File: patterns/frontend/mobile-interactions.md
- Rationale: Per-pixel state updates can cause visible scroll jank in long interactive lists on mobile.
- Evidence: src/components/ExercisePicker.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-25 — Snapshot effective measurement contract onto session exercises
- Type: Guardrail
- Summary: When creating session exercise rows, persist effective measurement semantics (`measurement_type` + `default_unit`) from routine override or exercise fallback so active and historical logs do not depend on mutable catalog defaults.
- Suggested Playbook File: patterns/versioned-persistence.md
- Rationale: Session rendering should stay deterministic even if exercise metadata is later edited.
- Evidence: src/app/today/page.tsx, src/app/session/[id]/actions.ts, src/app/history/[sessionId]/page.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-26 — Derive logger defaults from planned targets while keeping client-side metric flexibility
- Type: Pattern
- Summary: Compute session logger metric defaults from routine-day target presence, but keep metric toggling local to the logger UI so users can add extra measurements during a session without mutating server-side contracts.
- Suggested Playbook File: patterns/offline-first-sync.md
- Rationale: Planned targets should shape default logging ergonomics while preserving flexible, resilient online/offline session capture.
- Evidence: src/app/session/[id]/queries.ts, src/app/session/[id]/page.tsx, src/components/SessionExerciseFocus.tsx, src/components/SessionTimers.tsx
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-27 — Enforce kebab-case static asset contracts for exercise icon lookup
- Type: Guardrail
- Summary: Keep static exercise icon filenames normalized to kebab-case and resolve runtime icon paths from the same slugification rules (slug-first, name fallback) with only tiny explicit aliases for true naming exceptions.
- Suggested Playbook File: patterns/asset-contracts.md
- Rationale: A single deterministic naming contract avoids case-sensitivity regressions and duplicate asset drift while keeping lookup logic mapping-free.
- Evidence: scripts/normalizeExerciseIcons.mjs, src/lib/exerciseImages.ts, public/exercises/icons
- Status: Upstreamed (Playbook commit/PR link)

## 2026-02-27 — Use explicit slug alias maps for asset filename exceptions
- Type: Guardrail
- Summary: Keep `/exercises/icons/<slug>.png` as the canonical path contract and isolate unavoidable filename mismatches in a tiny versioned slug-to-filename map checked by the shared resolver.
- Suggested Playbook File: patterns/asset-contracts.md
- Rationale: Deterministic aliases fix real-world mismatches without scattering one-off conditionals or changing the base URL contract.
- Evidence: src/lib/exerciseIconMap.json, src/lib/exerciseImages.ts
- Status: Upstreamed (Playbook commit/PR link)


## 2026-02-27 — Treat exercise image path metadata as schema-owned contract at read boundaries
- Type: Guardrail
- Summary: Keep exercise image resolution deterministic with this read order: explicit DB path (if absolute local path) -> slug path (`/exercises/icons/<slug>.png`) -> normalized name slug path -> shared SVG placeholder, while ensuring detail/read queries include schema-owned image metadata fields (including `image_muscles_path`) instead of reconstructing/nulling them in UI code.
- Suggested Playbook File: patterns/server-client-boundaries.md
- Rationale: Image metadata belongs to schema/data contracts, and read-path omissions create hidden divergence that breaks single-source-of-truth assumptions during expansion.
- Evidence: src/lib/exerciseImages.ts, src/app/exercises/[exerciseId]/page.tsx, src/lib/exercises.ts, src/types/db.ts
- Status: Local (not yet upstreamed)

## 2026-02-28 — Keep event handlers out of Server Components for form auto-submit controls
- Type: Guardrail
- Summary: If a server-rendered page needs auto-submit behavior (for example checkbox-on-toggle), encapsulate the handler in a tiny client component and keep the mutation in a strict server action.
- Suggested Playbook File: Playbook/docs/PATTERNS/server-client-boundaries.md
- Rationale: Inline event handlers in Server Component trees can trigger production render/runtime failures and blur execution boundaries.
- Evidence: src/app/routines/[id]/edit/page.tsx, src/app/routines/[id]/edit/RestDayToggleCheckbox.tsx
- Status: Proposed

## 2026-02-28 — Keep workout stats lookups keyed strictly by canonical exercise UUIDs
- Type: Guardrail
- Summary: For selection-driven stats UI, always query/map `exercise_stats` by canonical `exercises.id` (or `exercise_id` on join rows) and never by join-table row IDs or slug-like identifiers.
- Suggested Playbook File: Playbook/docs/PATTERNS/server-client-boundaries.md
- Rationale: Mismatched identifiers silently hide valid stats rows and create hard-to-debug UI drift in measurement panels.
- Evidence: src/app/session/[id]/queries.ts, src/components/ExercisePicker.tsx, src/lib/exercise-stats.ts
- Status: Proposed

## 2026-02-28 — Avoid nested server-action forms for row-level destructive actions
- Type: Guardrail
- Summary: On edit screens with per-row save and delete controls, keep destructive server-action forms as siblings (or external via `form=`) rather than nesting them inside another `<form>`.
- Suggested Playbook File: Playbook/docs/PATTERNS/mobile-interactions-and-navigation.md
- Rationale: Nested forms can cause implicit submit bubbling and React/Next runtime submit errors during destructive actions.
- Evidence: src/app/routines/[id]/edit/day/[dayId]/page.tsx, src/components/destructive/ConfirmedServerFormButton.tsx
- Status: Proposed

## 2026-02-28 — Treat mutable DB columns as additive during contract migrations and move reads first
- Type: Guardrail
- Summary: For evolving DB contracts, ship additive migrations that introduce the new columns and immediately align read/query projections to the new contract before any cleanup of legacy columns.
- Suggested Playbook File: Playbook/docs/PATTERNS/versioned-persistence.md
- Rationale: Querying legacy columns during partial rollout can trip schema-cache/runtime errors; additive-first plus read alignment keeps deployments safe and reversible.
- Evidence: supabase/migrations/029_session_exercises_range_goal_columns.sql, src/app/session/[id]/queries.ts, src/lib/session-targets.ts, src/lib/exercise-goal-payload.ts
- Status: Proposed

## 2026-02-28 — Keep session goal range-column parity across all tracked metrics
- Type: Guardrail
- Summary: When session goal persistence is standardized on `*_min/*_max`, keep every metric (including sets) on the same range-column contract in schema, payload mapping, and query projections.
- Suggested Playbook File: Playbook/docs/PATTERNS/deterministic-reversible-state.md
- Rationale: Partial migrations where one metric still uses legacy single-value columns can trigger schema-cache/runtime failures and silent goal persistence gaps.
- Evidence: src/lib/exercise-goal-payload.ts, src/app/session/[id]/queries.ts, src/lib/session-targets.ts, supabase/migrations/030_session_exercises_target_sets_range_columns.sql
- Status: Proposed

## 2026-02-28 — Centralize fullscreen overlay scroll-lock in a single lifecycle with guaranteed cleanup
- Type: Guardrail
- Summary: For mobile fullscreen overlays, apply body/html scroll lock in one dedicated hook and always restore prior styles in effect cleanup; avoid stacking independent scroll-lock effects in both parent picker and child overlay.
- Suggested Playbook File: Playbook/docs/PATTERNS/mobile-interactions-and-navigation.md
- Rationale: Nested lock handlers can restore stale `overflow` values and leave the underlying page non-scrollable after close, especially on iOS/PWA.
- Evidence: src/components/ExerciseInfoSheet.tsx, src/components/ExercisePicker.tsx, src/lib/useBodyScrollLock.ts
- Status: Proposed
