# Pattern: Cache and Revalidation

[Back to Index](../INDEX.md)

## Problem
Reads become stale after writes without explicit cache invalidation/revalidation strategy.

## When to use
- Server-side caching is used for frequently-read data.
- Mutations must surface fresh data predictably.

## When NOT to use
- No caching layer is present.

## Implementation outline
- Cache stable read paths with explicit tags/keys.
- Revalidate affected paths/tags after successful mutation.
- Document cache ownership and freshness expectations.


## Guardrails

## 2026-03-01 — Degrade derived cache reads safely when schema rollout lags
- **Type:** Guardrail
- **Status:** Proposed
- **Summary:** Routes that enrich primary entities with derived cache tables MUST treat missing relation/column errors as a non-fatal fallback path (base rows plus `null` stats), log full server diagnostics, and rethrow unexpected errors.
- **Rationale:** Production environments can lag migrations; hard-failing server components on optional cache tables causes avoidable route outages.
- **Evidence:** `src/lib/exercises-browser.ts`, `src/app/history/exercises/page.tsx`
- **Source attribution:** `docs/PLAYBOOK_NOTES.md` (2026-03-01 safe derived-cache degradation guardrail).

### Do
- Fetch required base entities outside the optional cache try/catch path.
- Wrap only derived cache reads in guarded error handling.
- Log structured server diagnostics for missing relation/column failures.
- Return deterministic null-enriched shapes when fallback triggers.
- Rethrow all non-migration-lag errors.

### Don’t
- Fail route render when optional cache tables are missing.
- Swallow unexpected errors.
- Couple required base query success to optional derived-table availability.

### Safe degradation template
```ts
function isMissingRelationOrColumnError(error: unknown): boolean {
  // Example: Postgres codes for undefined_table / undefined_column
  return isPgErrorCode(error, "42P01") || isPgErrorCode(error, "42703");
}

const baseRows = await listCanonicalExerciseCatalog();
let statsByCanonicalId: Record<string, ExerciseStats | null> = {};

try {
  statsByCanonicalId = await getExerciseStatsBatch(userId, canonicalIds);
} catch (error) {
  if (!isMissingRelationOrColumnError(error)) throw error;
  logger.error("optional_cache_unavailable", {
    route: "/history/exercises",
    error,
  });
  statsByCanonicalId = {};
}
```

See also: [Deterministic, Reversible State](./deterministic-reversible-state.md) for canonical ID boundaries and shared catalog loader requirements.

## Common failure modes
- Missing revalidation on mutation paths.
- Overbroad invalidation causing unnecessary recomputation.
- Optional derived caches hard-failing route render during migration lag.

## Sources
- Dump A — `3) Architectural Patterns / Route-local server actions for mutations + revalidation`.
- Dump A — `4) Data Modeling & Storage / server-side caching used for exercise catalog`.
- `docs/PLAYBOOK_NOTES.md` (2026-03-01 safe derived-cache degradation guardrail).
