# Pattern: Orchestration Density Control

[Back to Index](../INDEX.md)

## Problem
Large delivery surfaces become fragile when UI rendering, orchestration, and execution logic are mixed in one place.

## Context
- Shows up when coordinators begin accumulating unrelated policy and execution logic.
- Assumes multiple runtime modes/providers may be selected at orchestration time.
- Requires readable control flow for review and incident debugging.

## Solution
- Keep orchestrators focused on policy selection and sequencing.
- Move side-effecting execution into dedicated services.
- Define explicit phase boundaries and handoff contracts.
- Limit orchestration classes by bounded domain responsibility.
- Refactor when branching depth hides operational intent.

## Tradeoffs
- More components/interfaces to maintain.
- Initial abstraction can feel heavy for simple paths.
- Poor boundaries can shift complexity instead of reducing it.

## Example
Coordinator chooses provider and strategy, then delegates transaction steps to execution services with phase-scoped inputs.

## Why it matters
- Regression risk rises as one file accumulates unrelated responsibilities.
- Mixed concerns reduce testability because orchestration paths are hard to isolate.
- Review quality drops when behavior and rendering changes are entangled.

## Pattern
Extract orchestration into dedicated modules and keep routes/components focused on composition and presentation.

- Presentation layers should render state and trigger explicit orchestration entry points.
- Orchestration modules should coordinate policy, sequencing, retries, and side-effect ordering.
- Execution units should perform narrow operation steps with explicit inputs/outputs.

## Clarification
This is seam hygiene inside a modular codebase, **not** a microservices mandate.

## Triggers and heuristics
Use this pattern when one or more of these are true:
- A route/component contains both orchestration and rendering logic.
- Coordination logic is reused across multiple surfaces.
- A file has high orchestration density (multiple side-effect branches, retries, or provider-selection branches).
- Behavior tests are difficult because orchestration can only be exercised through rendering tests.

## Related guardrails
- [API errors ship phase and correlation metadata](../GUARDRAILS/guardrails.md#api-errors-ship-phase-and-correlation-metadata)
- [One canonical renderer and resolver for repeated detail surfaces](../GUARDRAILS/guardrails.md#one-canonical-renderer-and-resolver-for-repeated-detail-surfaces)

## Common failure modes
- Creating new "god files" by adding orchestration to UI surfaces for short-term speed.
- Extracting too late, after coordination logic is duplicated with slight drift.
- Over-fragmenting early without clear orchestration boundaries.

## Sources
- Cross-repository regression reviews — orchestration density and testability drift findings (2026-02 doctrine patch request).
- Dump B — `Architectural Patterns / Policy-Coordination split`, `UI/controller separation pattern`.
