# Pattern: Cached Global Catalog + Safe Fallback

## Problem
Global exercise data should be fast and resilient during schema rollout lag.

## When to use
- Shared read-heavy catalogs.
- Features that must stay usable during partial DB rollout.

## Implementation outline (repo-specific)
1. Read global rows with a server anon client and `unstable_cache`.
2. Handle expected transitional DB errors (`42P01`) with fallback baseline options.
3. Merge cached global options with request-scoped user custom options.
4. Dedupe + normalize IDs and sort for stable picker ordering.

## Gotchas
- Fallback should be narrow and explicit to known transitional cases.
- Keep cache key versioning intentional when shape/data assumptions change.

## Evidence
- `src/lib/exercises.ts`
- `src/lib/exercise-options.ts`
- `supabase/migrations/008_exercises_table_and_rls.sql`
- `supabase/migrations/009_seed_global_exercises.sql`
