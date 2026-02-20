# Pattern: Supabase Auth + RLS

## Problem
Need authenticated user data access with strong per-user isolation.

## When to use
- Any feature that reads/writes user-owned records.
- Any new table with user-specific data.

## Implementation outline (repo-specific)
1. Validate user context with `requireUser()`.
2. Use `supabaseServer()` so request cookies supply bearer auth.
3. Include `user_id` on inserts and ownership filters on reads/updates/deletes.
4. Enforce RLS policies in migration SQL for all CRUD actions.

## Gotchas
- Missing `user_id` breaks policy checks and creates orphaned logic.
- Client/server Supabase clients are intentionally split; do not mix imports.

## Evidence
- `src/lib/auth.ts`
- `src/lib/supabase/server.ts`
- `src/app/actions/exercises.ts`
- `supabase/migrations/001_init.sql`
- `supabase/migrations/002_routines.sql`
