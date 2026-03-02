# Pattern: Modular Monolith Seams

[Back to Index](../INDEX.md)

## Problem
Fast-moving monoliths degrade when features couple directly and bypass ownership boundaries.

## Context
- Fits teams shipping one deployable while keeping feature boundaries explicit.
- Assumes shared runtime and database are intentional constraints.
- Requires clear public module entry points for cross-feature calls.

## Solution
- Define capability modules with documented ownership.
- Expose cross-module access through explicit APIs only.
- Keep shared utilities in governed common layers.
- Review dependency direction to prevent backdoor coupling.
- Capture exceptions as explicit decisions with sunset plans.

## Tradeoffs
- Boundary discipline adds coordination overhead.
- Shared layers can become overloaded without active curation.
- Refactors may require staged module API migrations.

## Example
A workout-history module exposes a read API consumed by session UI instead of direct imports into its internals.

## When to use
- One deployable artifact is preferred.
- Teams need explicit feature ownership and stable integration points.

## When NOT to use
- Independent deployment/runtime isolation is an immediate hard requirement.

## Implementation outline
- Partition by capability with explicit public entry points.
- Keep shared concerns centralized in common layers, not ad-hoc cross-feature imports.
- Document allowed dependency directions and enforce in review.

## Related guardrails
- [History exercise browsers use canonical catalog loader](../GUARDRAILS/guardrails.md#history-exercise-browsers-use-canonical-catalog-loader)
- [Keep token refresh in middleware](../GUARDRAILS/guardrails.md#keep-token-refresh-in-middleware)

## Common failure modes
- Shared layer becomes an ungoverned dumping ground.
- “Temporary” cross-module shortcuts become permanent.

## Sources
- Dump B — `Core Principles / Modular monolith with strict seams`.
- Dump B — `Architectural Patterns / Layered module composition`.
