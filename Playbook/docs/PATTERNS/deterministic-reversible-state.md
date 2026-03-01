# Pattern: Deterministic, Reversible State

[Back to Index](../INDEX.md)

## Problem
Hidden or non-deterministic mutations make recovery, replay, and debugging unreliable.

## When to use
- State changes affect user history, correctness, or auditability.
- Undo/redo, replay, or migration compatibility matters.

## When NOT to use
- Short-lived UI-only state with no side effects or persistence.

## Implementation outline
- Model mutations as explicit transitions.
- Keep transition inputs/outputs serializable and explainable.
- Preserve metadata required for replay/rollback.

## Guardrail: Resolve cached/aggregated stats by canonical entity ID at render boundaries
- **Type:** Guardrail
- **Rationale:** Mixed ID domains (wrapper IDs vs canonical IDs) silently hide deterministic caches like Last/PR, even when data exists.

### How to apply
- [ ] Define and reuse a canonical resolver (`resolveCanonicalExerciseId`) at UI render boundaries.
- [ ] Normalize route params before cache lookup (`/exercises/[exerciseId]` resolves to canonical ID).
- [ ] Thread canonical IDs from list selection through detail views and custom row wrappers.
- [ ] Reject wrapper IDs for canonical cache reads (`exercise_stats`, aggregate snapshots).

### Example snippet
```ts
const canonicalExerciseId = resolveCanonicalExerciseId({
  exerciseId: row.exerciseId,
  canonicalExerciseId: row.canonicalExerciseId,
  isCustom: row.isCustom,
});

const stats = canonicalExerciseId
  ? statsByCanonicalId[canonicalExerciseId]
  : null;
```

- **Source attribution:** `docs/PLAYBOOK_NOTES.md` (2026-02-28 ID-domain reliability notes) + implementation evidence paths (`src/app/session/[id]/page.tsx`, `src/components/ExercisePicker.tsx`, `src/app/exercises/[exerciseId]/page.tsx`).


## 2026-03-01 — History exercise browsers must share the same canonical catalog loader as Add Exercise
- **Type:** Guardrail
- **Status:** Proposed
- **Summary:** Any feature that lists exercisable catalog items for selection or browsing MUST source rows from the same canonical loader used by Add Exercise, then layer optional per-user stats via a separate batched lookup keyed by canonical IDs.
- **Rationale:** Prevents catalog drift where one surface silently shows only a partial DB subset while other flows show the full known catalog.
- **Evidence:** `src/lib/exercises-browser.ts`, `src/lib/exercises.ts`, `src/app/history/exercises/ExerciseBrowserClient.tsx`
- **Source attribution:** `docs/PLAYBOOK_NOTES.md` (2026-03-01 canonical catalog loader guardrail).

### Do
- Reuse one canonical catalog loader shared across Add Exercise and History browser surfaces.
- Keep catalog hydration and per-user stats hydration as separate steps.
- Batch stats reads by canonical ID (`exerciseId` domain normalized before lookup).
- Preserve base catalog render when stats are unavailable.

### Don’t
- Build independent catalog queries per surface.
- Join optional stats tables directly into required catalog loaders.
- Key stats by wrapper/transient IDs.

### Required architecture pattern
```ts
const catalogRows = await listCanonicalExerciseCatalog(); // shared loader
const canonicalIds = catalogRows.map((row) => row.canonicalExerciseId);
const statsByCanonicalId = await getExerciseStatsBatch(userId, canonicalIds); // optional layer

return catalogRows.map((row) => ({
  ...row,
  stats: statsByCanonicalId[row.canonicalExerciseId] ?? null,
}));
```

See also:
- [Cache and Revalidation](./cache-and-revalidation.md) for optional cache degradation behavior.
- Guardrail above: **Resolve cached/aggregated stats by canonical entity ID at render boundaries** (2026-02-28).

## Guardrail: Reuse one measurement-to-goal payload mapper across create flows
- **Type:** Guardrail
- **Rationale:** Duplicate mappers drift over time and produce mismatched persisted goals from identical UI contracts.

### How to apply
- [ ] Export one canonical parser from `src/lib/exercise-goal-payload.ts`.
- [ ] Call that parser from all create flows (`routines/.../actions.ts`, `session/.../actions.ts`).
- [ ] Persist parser output as-is; avoid per-flow post-mapping.
- [ ] Add tests asserting equal payloads for shared UI input across flows.

### Example snippet
```ts
import { parseExerciseGoalPayload } from "@/src/lib/exercise-goal-payload";

const goalPayload = parseExerciseGoalPayload(measurementUiState);
await createExercise({ ..., goal_payload: goalPayload });
```

- **Source attribution:** `docs/PLAYBOOK_NOTES.md` (2026-02-28 create-flow mapper drift notes) + implementation evidence paths (`src/lib/exercise-goal-payload.ts`, `src/app/routines/[id]/edit/day/actions.ts`, `src/app/session/[id]/actions.ts`).

## Guardrail: Recompute derived performance caches after additive and destructive history mutations
- **Type:** Guardrail
- **Rationale:** Recomputing only after additive writes leaves stale claims after deletes/edits; deterministic state requires symmetric cache maintenance.

### How to apply
- [ ] Add bounded recompute utility (`recomputeExerciseStatsForExercises(userId, canonicalIds)`).
- [ ] Call recompute after session completion with affected canonical exercise IDs.
- [ ] Before delete/edit mutations, collect affected canonical IDs, then recompute after mutation.
- [ ] Keep recompute scope bounded to touched IDs (no full-table rebuild).

### Example snippet
```ts
await recomputeExerciseStatsForExercises(userId, touchedCanonicalExerciseIds);
```

- **Source attribution:** `docs/PLAYBOOK_NOTES.md` (2026-02-28 stale-derived-cache notes) + implementation evidence paths (`src/lib/exercise-stats.ts`, `src/app/session/[id]/actions.ts`, `src/app/history/page.tsx`).

## Pattern: Pair risk-tiered destructive safeguards with reversible undo where feasible
- **Type:** Pattern
- **Rationale:** Undo is only trustworthy when restore is deterministic; high-risk irreversible operations require explicit confirmation.

### How to apply
- [ ] Define shared risk tiers (`"high" | "medium" | "low"`).
- [ ] Route high-risk actions through shared destructive confirmation modal.
- [ ] Offer undo only when a full local restore snapshot exists and no server guesswork is required.
- [ ] Avoid undo affordances for irreversible operations (for example delete session/routine).

### Example snippet
```ts
if (riskTier === "high") {
  return openConfirmDestructiveModal({ ... });
}

return useUndoAction({
  riskTier,
  snapshot: localSnapshot,
  onUndo: () => restoreFromSnapshot(localSnapshot),
});
```

- **Source attribution:** `docs/PLAYBOOK_NOTES.md` (2026-02-28 risk-tier + undo discipline notes) + implementation evidence paths (`src/components/ui/ConfirmDestructiveModal.tsx`, `src/components/ui/useUndoAction.ts`, `src/components/SessionTimers.tsx`, `src/components/SessionExerciseFocus.tsx`).

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
