# Pattern: Supabase Auth + RLS

[Back to Index](../INDEX.md)

## Problem
Client-side checks alone cannot guarantee row-level access safety.

## When to use
- Supabase handles auth and data access.
- Per-user or per-role row isolation is required.

## When NOT to use
- Supabase is not in the stack.

## Implementation outline
- Keep auth session handling in server-aware paths.
- Encode row ownership in schema and enforce row-level policies.
- Keep service-role credentials server-only.
- Treat UI role checks as UX only, not authorization authority.

## Common failure modes
- Missing row ownership columns/policies.
- Sensitive keys exposed to client runtime.
- Policy coverage gaps for negative access cases.

## Sources
- Dump A — `5) Auth & Security / Auth flow shape`, `RLS assumptions and enforcement`, `Security constraints in docs`.
- Dump B — `Auth & Security Patterns / RLS pattern status`.
