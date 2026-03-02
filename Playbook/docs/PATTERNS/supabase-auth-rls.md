# Pattern: Supabase Auth + RLS

[Back to Index](../INDEX.md)

## Problem
Client-side checks alone cannot guarantee row-level access safety.

## Context
- Applies when Supabase auth and PostgreSQL RLS enforce data ownership.
- Assumes client guards are UX hints, not security controls.
- Requires policy tests that match real role/session contexts.

## Solution
- Model ownership columns explicitly on protected tables.
- Write RLS policies for read/write paths per role intent.
- Use server-side clients for privileged checks and controlled mutations.
- Keep policy assumptions documented next to schema changes.
- Verify policy behavior with representative test fixtures.

## Tradeoffs
- RLS policy authoring and validation adds migration overhead.
- Policy complexity can obscure failure diagnosis without good tooling.
- Misconfigured service-role usage can bypass intended constraints.

## Example
A user-specific table enforces `owner_id = auth.uid()` for select/update/delete while admin paths run through audited server actions.

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

## Related guardrails
- [Keep token refresh in middleware](../GUARDRAILS/guardrails.md#keep-token-refresh-in-middleware)
- [Guardrail Enforcement Index](../GUARDRAILS/_index.md)

## Common failure modes
- Missing row ownership columns/policies.
- Sensitive keys exposed to client runtime.
- Policy coverage gaps for negative access cases.

## Sources
- Dump A — `5) Auth & Security / Auth flow shape`, `RLS assumptions and enforcement`, `Security constraints in docs`.
- Dump B — `Auth & Security Patterns / RLS pattern status`.
