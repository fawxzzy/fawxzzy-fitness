# Pattern: Deterministic, Reversible State

[Back to Index](../INDEX.md)

## Problem
Hidden or non-deterministic mutations make recovery, replay, and debugging unreliable.

## Context
- Used for flows where state transitions must be auditable and replayable.
- Assumes transition inputs/outputs can be serialized deterministically.
- Important when aggregates/caches derive from mutation history.

## Solution
- Model state transitions as explicit operations with stable inputs.
- Use canonical IDs at render and persistence boundaries.
- Centralize shared payload mappers to avoid flow drift.
- Recompute derived aggregates after both additive and destructive mutations.
- Keep undo/recovery paths limited to deterministic snapshot-based restores.

## Tradeoffs
- Adds modeling overhead versus ad hoc mutation logic.
- Strict canonical-ID rules require migration of legacy wrappers.
- Symmetric recompute can increase post-mutation workload.

## Example
History edit/delete paths collect touched canonical exercise IDs and trigger bounded recompute so Last/PR values remain consistent with source records.

## When to use
- State changes affect user history, correctness, or auditability.
- Undo/redo, replay, or migration compatibility matters.

## When NOT to use
- Short-lived UI-only state with no side effects or persistence.

## Implementation outline
- Model mutations as explicit transitions.
- Keep transition inputs/outputs serializable and explainable.
- Preserve metadata required for replay/rollback.

## Related guardrails
- [Resolve cached and aggregated stats by canonical entity ID](../GUARDRAILS/guardrails.md#resolve-cached-and-aggregated-stats-by-canonical-entity-id)
- [History exercise browsers use canonical catalog loader](../GUARDRAILS/guardrails.md#history-exercise-browsers-use-canonical-catalog-loader)
- [Recompute derived caches after additive and destructive mutations](../GUARDRAILS/guardrails.md#recompute-derived-caches-after-additive-and-destructive-mutations)

## Common failure modes
- Random/time-dependent behavior embedded in transition logic.
- Side effects executed outside traceable transaction boundaries.
- Canonical caches queried via wrapper IDs.
- Browser/catalog surfaces reading divergent exercise sources.
- Symmetric recompute omitted for destructive mutations.
- Undo offered without deterministic restore state.

## Sources
- Dump A — `2) Core Principles / deterministic and explainable`.
- Dump B — `Core Principles / Deterministic, reversible state changes`.
- `docs/PLAYBOOK_NOTES.md` (2026-02-28 guardrails batch: canonical IDs, unified goal mapping, bounded recompute, risk-tiered undo; 2026-03-01 shared catalog loader guardrail).

<!-- PLAYBOOK_NOTE_ID:2026-02-28-keep-session-goal-range-column-parity-across-all-tracked-metrics -->
### Keep session goal range-column parity across all tracked metrics (from FawxzzyFitness notes, 2026-02-28)
Type: Guardrail
Summary: When session goal persistence is standardized on `*_min/*_max`, keep every metric (including sets) on the same range-column contract in schema, payload mapping, and query projections.
Rationale: Partial migrations where one metric still uses legacy single-value columns can trigger schema-cache/runtime failures and silent goal persistence gaps.
Evidence (FawxzzyFitness):
- src/lib/exercise-goal-payload.ts
- src/app/session/[id]/queries.ts
- src/lib/session-targets.ts
- supabase/migrations/030_session_exercises_target_sets_range_columns.sql

<!-- PLAYBOOK_NOTE_ID:2026-02-28-pair-risk-tiered-destructive-safeguards-with-reversible-undo-where-feasible -->
### Pair risk-tiered destructive safeguards with reversible undo where feasible (from FawxzzyFitness notes, 2026-02-28)
Type: Pattern
Summary: Use a shared destructive confirmation modal for high-risk irreversible actions, and a short undo toast window for low/medium removals only when full client state is available for deterministic restore.
Rationale: Prevents accidental destructive loss while preserving fast workflows by reserving undo only for safely reversible operations.
Evidence (FawxzzyFitness):
- src/components/ui/ConfirmDestructiveModal.tsx
- src/components/ui/useUndoAction.ts
- src/components/SessionTimers.tsx
- src/components/SessionExerciseFocus.tsx

<!-- PLAYBOOK_NOTE_ID:2026-02-28-recompute-derived-performance-caches-after-both-additive-and-destructive-history-mutations -->
### Recompute derived performance caches after both additive and destructive history mutations (from FawxzzyFitness notes, 2026-02-28)
Type: Guardrail
Summary: Any cached per-entity performance snapshot (e.g., Last performed, PR) must be recomputed deterministically after session completion and session deletion for only the affected entities.
Rationale: Prevents stale “best/last” claims after destructive history edits while keeping recomputation bounded and predictable.
Evidence (FawxzzyFitness):
- src/lib/exercise-stats.ts
- src/app/session/[id]/actions.ts
- src/app/history/page.tsx

<!-- PLAYBOOK_NOTE_ID:2026-02-28-reuse-one-measurement-to-goal-payload-mapper-across-create-flows -->
### Reuse one measurement-to-goal payload mapper across create flows (from FawxzzyFitness notes, 2026-02-28)
Type: Guardrail
Summary: Flows that create exercise rows from the same measurement UI contract (e.g., routine editor and active session add-exercise) should use one shared parser/mapper for target payload serialization.
Rationale: Prevents drift where one flow silently drops target fields while another persists them, causing inconsistent saved goals for identical UI input.
Evidence (FawxzzyFitness):
- src/lib/exercise-goal-payload.ts
- src/app/routines/[id]/edit/day/actions.ts
- src/app/session/[id]/actions.ts

<!-- PLAYBOOK_NOTE_ID:2026-03-01-history-exercise-browsers-must-share-the-same-canonical-catalog-loader-as-add-exercise -->
### History exercise browsers must share the same canonical catalog loader as Add Exercise (from FawxzzyFitness notes, 2026-03-01)
Type: Guardrail
Summary: Any feature that lists exercisable catalog items for selection/browsing should source rows from the same canonical loader used by Add Exercise, then layer optional per-user stats in a separate batched lookup.
Rationale: Prevents catalog drift where one surface silently shows only a partial DB subset while other flows show the full known catalog.
Evidence (FawxzzyFitness):
- src/lib/exercises-browser.ts
- src/lib/exercises.ts
- src/app/history/exercises/ExerciseBrowserClient.tsx
