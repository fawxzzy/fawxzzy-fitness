# Pattern: Server/Client Boundaries

[Back to Index](../INDEX.md)

## Problem
Mixing server-only and client-only concerns causes runtime failures and auth/session defects.

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
