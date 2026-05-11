# Fitness Auth Session and DAL Hardening

## Summary

Fitness Wave 2B hardens the existing repo-owned auth and session boundary without creating a shared `atlas-auth` package.

This slice keeps Fitness implementation ownership local while ATLAS continues to own only the shared platform contract surface.

## Rule

- Fitness owns auth and DAL implementation details in the owner repo.
- ATLAS owns shared platform contracts, not repo-specific auth orchestration.
- This PR does not change product behavior beyond safer session handling and clearer server boundaries.

## Pattern

- Server session boundary first.
- DAL extraction second.
- Keep existing public helpers stable while moving request parsing, session recovery, and server-client creation behind one repo-owned boundary.

## Failure Mode

- Mixing auth hardening, DAL extraction, and broad UI rewrites in one PR makes session bugs difficult to isolate.
- Treating trusted local-dev headers like durable cookies changes redirect behavior and weakens the production auth model.
- Accepting browser-provided tokens outside the explicit session-sync route would spread writeable auth state across the app.

## Boundary changes

### Server session boundary

- `src/lib/auth/server-session.ts` now centralizes current-request session token reads, trusted local-dev header fallback, and authenticated Supabase server-client creation.
- `src/lib/auth/server-session-core.ts` holds the pure token-resolution and redirect-decision helpers used by tests and wrappers.
- Existing callers keep using `requireUser()`, `supabaseServer()`, and `supabaseServerWithSession()` through thin compatibility wrappers.

### Session-sync hardening

- `src/app/auth/session-sync/route.ts` remains the only explicit browser-to-httpOnly-cookie handoff route.
- The route now trims input, rejects malformed or empty payloads, and returns `no-store` responses for both success and failure paths.
- Tests cover invalid JSON, missing tokens, cookie writes, delete clears, and non-cacheable responses.

### DAL extraction

- `src/lib/dal/profile-settings.ts` is the first repo-owned auth-aware DAL slice.
- Settings profile mutations now flow through that DAL instead of issuing `profiles` table writes directly from the app action layer.
- The DAL classifies missing profile-migration failures separately from generic backend failures so actions can keep the existing fallback behavior.

## Receipt plan

- Keep using repo tests plus `verify` as the auth/session hardening receipt for now.
- If Fitness adopts a dedicated auth receipt later, it should stay repo-owned and document boundary validation rather than inventing a shared auth package prematurely.
