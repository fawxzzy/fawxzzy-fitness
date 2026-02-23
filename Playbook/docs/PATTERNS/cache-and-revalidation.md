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

## Common failure modes
- Missing revalidation on mutation paths.
- Overbroad invalidation causing unnecessary recomputation.

## Sources
- Dump A — `3) Architectural Patterns / Route-local server actions for mutations + revalidation`.
- Dump A — `4) Data Modeling & Storage / server-side caching used for exercise catalog`.
