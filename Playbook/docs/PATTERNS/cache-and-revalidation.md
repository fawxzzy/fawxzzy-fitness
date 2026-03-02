# Pattern: Cache and Revalidation

[Back to Index](../INDEX.md)

## Problem
Reads become stale after writes without explicit cache invalidation/revalidation strategy.

## Context
- Shows up when reads are cached and writes happen on the same entities.
- Assumes server-side cache tags/keys are available and mutation boundaries are known.
- Requires predictable freshness for user-visible updates after writes.

## Solution
- Define cache ownership per read path (who sets and who invalidates).
- Use narrow tags/keys tied to entity or collection scopes.
- Trigger revalidation immediately after successful mutations.
- Handle optional derived caches as best-effort layers over required base reads.
- Log fallback activation when derived cache relations are unavailable.

## Tradeoffs
- More invalidation wiring per mutation path.
- Overly broad invalidation can increase recompute cost.
- Fallback branches add extra error-handling complexity.

## Example
After saving an exercise update, invalidate only the affected exercise tag and keep the page render alive if optional stats cache tables lag schema rollout.

## When to use
- Server-side caching is used for frequently-read data.
- Mutations must surface fresh data predictably.

## When NOT to use
- No caching layer is present.

## Implementation outline
- Cache stable read paths with explicit tags/keys.
- Revalidate affected paths/tags after successful mutation.
- Document cache ownership and freshness expectations.


## Related guardrails
- [Degrade derived cache reads safely during schema lag](../GUARDRAILS/guardrails.md#degrade-derived-cache-reads-safely-during-schema-lag)
- [Recompute derived caches after additive and destructive mutations](../GUARDRAILS/guardrails.md#recompute-derived-caches-after-additive-and-destructive-mutations)

## Common failure modes
- Missing revalidation on mutation paths.
- Overbroad invalidation causing unnecessary recomputation.
- Optional derived caches hard-failing route render during migration lag.

## Sources
- Dump A — `3) Architectural Patterns / Route-local server actions for mutations + revalidation`.
- Dump A — `4) Data Modeling & Storage / server-side caching used for exercise catalog`.
- `docs/PLAYBOOK_NOTES.md` (2026-03-01 safe derived-cache degradation guardrail).
