# Pattern: Server Action Mutation Flow

## Problem
Need predictable mutation UX without client state frameworks.

## When to use
- Forms and button-driven mutations from App Router pages.

## Implementation outline (repo-specific)
1. Put mutation logic in a `"use server"` action.
2. Validate/minimally normalize inputs.
3. Execute DB mutation with ownership filters.
4. Revalidate tags/paths.
5. Redirect with query-string success/error messages for UX feedback.

## Gotchas
- Ensure action is always called in authenticated context.
- Keep redirect paths explicit to avoid stale UI state after mutation.

## Evidence
- `src/app/actions/exercises.ts`
- `src/app/auth/actions.ts`
- `src/app/routines/[id]/edit/day/actions.ts`
