# Pattern: Server/Client Boundaries

[Back to Index](../INDEX.md)

## Problem
Mixing server-only and client-only concerns causes runtime failures and auth/session defects.

## Context
- Used in full-stack apps where server-only and client-only logic can be mixed accidentally.
- Assumes auth/session handling must remain authoritative server-side.
- Requires clear call boundaries for security and runtime determinism.

## Solution
- Keep secret-bearing and privileged logic in server contexts only.
- Restrict client to presentation, interaction, and non-authoritative state.
- Centralize token refresh/session mutation in middleware or dedicated server boundaries.
- Expose safe API/service contracts for client data needs.
- Audit boundary violations during review and CI checks.

## Tradeoffs
- More boundary plumbing and DTO shaping.
- Server roundtrips can increase perceived latency for some interactions.
- Refactors may require moving legacy mixed code paths.

## Example
Client invokes a server route for protected detail data; middleware owns session refresh and response includes correlation metadata for failures.

## When to use
- Frameworks with explicit server/client execution contexts.
- Cookie/session-authenticated workflows.

## When NOT to use
- Single-runtime environments with no split execution model.

## Implementation outline
- Mark server-only modules explicitly.
- Isolate browser client factories in client-only modules.
- Keep auth/session-sensitive operations in server-bound helpers/routes.
- Prevent client imports of server utilities.

## Action result contract for server actions
### Problem
Server actions become unpredictable when failures are sometimes returned and sometimes redirected.

### Guideline
Use a shared `ActionResult<T>` contract for non-navigation outcomes; reserve redirects for successful navigation transitions.

### Example
- Return `{ ok: false, error }` when a start-session action fails in-place.
- Redirect only after successful creation/transition when navigation is the intended next state.

### Pitfalls
- Encoding recoverable validation/runtime failures in query-string redirect errors.
- Mixing transport semantics so client adapters must branch on unrelated shapes.

## Lazy detail fetches should stay server-authenticated
### Problem
Heavy detail payloads can slow pickers, but moving fetches client-side risks boundary drift and auth leakage.

### Guideline
Load minimal list payloads first, then request dense details via authenticated server actions with explicit `ActionResult` responses.

### Example
Fetch only `id/name/thumb/tag` in the initial picker query, then request full metadata when a detail panel/route is opened.

### Pitfalls
- Shipping full metadata in initial list payloads.
- Client-side direct database access for secondary detail requests.

## Related guardrails
- [Keep token refresh in middleware](../GUARDRAILS/guardrails.md#keep-token-refresh-in-middleware)
- [API errors ship phase and correlation metadata](../GUARDRAILS/guardrails.md#api-errors-ship-phase-and-correlation-metadata)

## Common failure modes
- Import graph leaks server code into client bundles.
- Session logic implemented in non-request-aware paths.
- Redirects used as general-purpose error transport.
- Lazy-detail pathways bypassing server action auth boundaries.

## Cross-links
- Offline replay and idempotency contracts: [Offline-First Sync](./offline-first-sync.md)
- Stale snapshot/state contracts: [Resilient Client-State & Idempotent Sync](./resilient-client-state.md)

## Sources
- Dump A — `2) Core Principles / Enforce strict server/client boundaries`.
- Dump A — `5) Auth & Security / Auth flow shape`.
- `docs/PLAYBOOK_NOTES.md` (2026-02-23 to 2026-02-24): ActionResult + redirect semantics, lazy detail loading via strict server actions.

## Explicit client action invocation for transient-sheet mutations
- Date: 2026-03-03
- Type: Pattern
- Summary: In transient client overlays/sheets, trigger server actions explicitly from click handlers and refresh route state before closing the overlay.
- Rationale: Form submissions tied to rapidly unmounted UI can race with close behavior and produce non-deterministic mutation feedback.
- Evidence: src/components/RoutineSwitcherBar.tsx, src/app/routines/page.tsx
- Status: Proposed

### Implementation Notes
**Do**
- Invoke the server action explicitly in a click handler.
- Await mutation completion, then run `router.refresh()`, then close the sheet.

**Don't**
- Depend on form submit semantics that may unmount the sheet before mutation and feedback resolve.

```tsx
const onSelect = async () => {
  await switchRoutineAction(payload);
  router.refresh();
  closeSheet();
};
```

### Pattern: Preserve Modality Metadata Through Loader Boundaries

Problem
Stat loaders can silently choose the wrong aggregation path when modality metadata is dropped between API handlers and server helpers.

Solution
Pass canonical modality metadata (`measurement_type` and `default_unit`) through every loader boundary and require downstream aggregators to use that metadata plus set-level data when selecting stat branches.

Implementation Guidance
- Treat modality metadata as required input for any stats helper that branches behavior by exercise type.
- Validate incoming metadata at API boundaries and default only when explicitly documented.
- Keep branch selection deterministic: metadata selects candidate path, set-level signal confirms renderable metrics.

Example
`src/app/api/exercise-info/[exerciseId]/route.ts` forwards canonical measurement metadata into `src/lib/exercise-info.ts` aggregation helpers so cardio rows do not degrade into strength/reps fallbacks.

Why It Matters
Preserving modality metadata prevents silent regressions where valid history exists but Last/Best/Totals render empty because the wrong aggregation branch executed.

### Pattern: Derive Measurement-Aware Summaries Server-Side

Problem
Card/list surfaces become inconsistent when each client renderer recomputes Last/Best summaries with slightly different modality rules.

Solution
Build compact, measurement-aware summary strings in server loaders once, then send the preformatted summary view model to client cards.

Implementation Guidance
- Derive Last/Best using deterministic modality priorities from canonical set data.
- Keep client card components render-only and avoid per-card aggregation logic.
- Use metadata defaults only as formatting fallback when set-level units are missing.

Example
`src/lib/exercises-browser.ts` and `src/lib/exercise-info.ts` produce server-shaped summary rows consumed by `src/app/history/exercises/ExerciseBrowserClient.tsx` and `src/components/ExerciseInfoSheet.tsx`.

Why It Matters
Server-shaped summaries improve consistency, reduce client render cost on long lists, and avoid modality drift across surfaces.


<!-- PLAYBOOK_NOTE_ID:2026-03-04-build-history-feed-cards-from-server-shaped-session-summaries -->
### Build history feed cards from server-shaped session summaries (from FawxzzyFitness notes, 2026-03-04)
Type: Pattern
Summary: Derive History session cards from a shared server-side summary builder that aggregates exercises, sets, PR counts, and top-set display metadata before rendering.
Rationale: Loader-derived summaries reduce client recomputation drift and keep list surfaces deterministic across list and detail routes.
Evidence (FawxzzyFitness):
- src/app/history/session-summary.ts
- src/app/history/page.tsx
- src/app/history/[sessionId]/page.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-02-api-routes-should-emit-phase-labeled-failure-logs-with-stable-error-envelopes -->
### API routes should emit phase-labeled failure logs with stable error envelopes (from FawxzzyFitness notes, 2026-03-02)
Type: Guardrail
Summary: For multi-step API handlers (validate/auth/load/transform/respond), track a current step label and include it in structured error logs while returning a single stable `{ ok:false, code, message, details? }` contract.
Rationale: Prevents opaque 500 debugging and avoids client drift from mixed/legacy error response shapes.
Evidence (FawxzzyFitness):
- src/app/api/exercise-info/[exerciseId]/route.ts
- src/lib/exercise-info.ts
- src/components/ExerciseInfo.tsx

<!-- PLAYBOOK_NOTE_ID:2026-02-28-keep-workout-stats-lookups-keyed-strictly-by-canonical-exercise-uuids -->
### Keep workout stats lookups keyed strictly by canonical exercise UUIDs (from FawxzzyFitness notes, 2026-02-28)
Type: Guardrail
Summary: For selection-driven stats UI, always query/map `exercise_stats` by canonical `exercises.id` (or `exercise_id` on join rows) and never by join-table row IDs or slug-like identifiers.
Rationale: Mismatched identifiers silently hide valid stats rows and create hard-to-debug UI drift in measurement panels.
Evidence (FawxzzyFitness):
- src/app/session/[id]/queries.ts
- src/components/ExercisePicker.tsx
- src/lib/exercise-stats.ts

<!-- PLAYBOOK_NOTE_ID:2026-02-28-keep-event-handlers-out-of-server-components-for-form-auto-submit-controls -->
### Keep event handlers out of Server Components for form auto-submit controls (from FawxzzyFitness notes, 2026-02-28)
Type: Guardrail
Summary: If a server-rendered page needs auto-submit behavior (for example checkbox-on-toggle), encapsulate the handler in a tiny client component and keep the mutation in a strict server action.
Rationale: Inline event handlers in Server Component trees can trigger production render/runtime failures and blur execution boundaries.
Evidence (FawxzzyFitness):
- src/app/routines/[id]/edit/page.tsx
- src/app/routines/[id]/edit/RestDayToggleCheckbox.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-02-keep-token-refresh-exclusively-in-middleware-for-server-auth-determinism -->
### Keep token refresh exclusively in middleware for server-auth determinism (from FawxzzyFitness notes, 2026-03-02)
Type: Guardrail
Summary: In Next.js apps using cookie-backed server auth, perform token refresh only in middleware and keep server Supabase helpers read-only consumers of access cookies.
Rationale: Prevents split refresh ownership and cookie drift that can cause intermittent SSR/session auth failures.
Evidence (FawxzzyFitness):
- middleware.ts
- src/lib/supabase/server.ts
- src/app/auth/actions.ts
- src/app/auth/confirm/route.ts

<!-- PLAYBOOK_NOTE_ID:2026-03-03-prefer-explicit-client-action-invocation-for-transient-sheet-mutations -->
### Prefer explicit client action invocation for transient-sheet mutations (from FawxzzyFitness notes, 2026-03-03)
Type: Pattern
Summary: In transient client overlays/sheets, trigger server actions explicitly from click handlers and refresh route state before closing the overlay.
Rationale: Form submissions tied to rapidly unmounted UI can race with close behavior and produce non-deterministic mutation feedback.
Evidence (FawxzzyFitness):
- src/components/RoutineSwitcherBar.tsx
- src/app/routines/page.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-card-summaries-should-be-measurement-aware-and-server-derived -->
### Card summaries should be measurement-aware and server-derived (from FawxzzyFitness notes, 2026-03-03)
Type: Pattern
Summary: History/card surfaces should receive preformatted Last/Best summary strings from server loaders, with deterministic measurement-type priorities (cardio duration vs distance vs calories, with pace only when unit-safe).
Rationale: Prevents random-feeling “best” labels, avoids client render-loop aggregation, and keeps bodyweight/cardio stats useful instead of blank placeholders.
Evidence (FawxzzyFitness):
- src/lib/exercises-browser.ts
- src/lib/exercise-info.ts
- src/components/ExerciseInfoSheet.tsx
- src/app/history/exercises/ExerciseBrowserClient.tsx

<!-- PLAYBOOK_NOTE_ID:2026-03-03-session-exercise-unit-metadata-should-mirror-measurement-type -->
### Session exercise unit metadata should mirror measurement type (from FawxzzyFitness notes, 2026-03-03)
Type: Guardrail
Summary: Persist `session_exercises.default_unit` in lockstep with `session_exercises.measurement_type` (`reps/time/distance/time_distance`) and derive cardio UI behavior from measurement type, not legacy unit fallbacks.
Rationale: Prevents cardio rows from being interpreted as reps-mode and avoids empty Last/Best cards when duration-based sets exist.
Evidence (FawxzzyFitness):
- src/app/session/[id]/actions.ts
- src/app/today/page.tsx
- src/app/actions/history.ts
- src/app/history/[sessionId]/LogAuditClient.tsx
- supabase/migrations/032_backfill_cardio_session_exercise_default_unit.sql

<!-- PLAYBOOK_NOTE_ID:2026-03-04-enforce-single-source-safe-area-and-top-nav-offset-contracts -->
### Enforce single-source safe-area and top-nav offset contracts (from FawxzzyFitness notes, 2026-03-04)
Type: Principle
Summary: Recent git changes indicate a safe area-nav learning candidate touching 2 file(s). Capture this as draft guidance for review before promotion.
Rationale: Competing safe-area and header offset sources create route-specific spacing regressions.
Evidence (FawxzzyFitness):
- docs/CHANGELOG.md
- docs/CODEX_GUARDRAILS.md
- docs/playbook-status.json
- docs/playbook-trend.json
- tools/playbook/signals-map.json
