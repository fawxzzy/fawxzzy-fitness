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

## Common failure modes
- Import graph leaks server code into client bundles.
- Session logic implemented in non-request-aware paths.

## Sources
- Dump A — `2) Core Principles / Enforce strict server/client boundaries`.
- Dump A — `5) Auth & Security / Auth flow shape`.
