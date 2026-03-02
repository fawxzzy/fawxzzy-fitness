# Pattern: Orchestration vs Execution

[Back to Index](../INDEX.md)

## Problem
Workflow policy and low-level operations get tangled, creating brittle service layers.

## Context
- Applies when one service starts owning both decision policy and data mutation steps.
- Assumes policy may evolve independently from execution mechanics.
- Requires testable seams between “choose” and “do” concerns.

## Solution
- Separate policy selection from transactional execution routines.
- Use explicit contracts between orchestrator and executor layers.
- Keep executors deterministic and side-effect scoped.
- Let orchestrators compose retries/fallbacks without embedding low-level queries.
- Test policy branching and execution correctness independently.

## Tradeoffs
- Requires interface design and additional wiring.
- Can be overkill for truly single-path workflows.
- Boundary drift can reintroduce coupling if not reviewed.

## Example
Orchestrator picks sync mode by capability flags; executor performs the DB writes and returns canonical result envelope.

## When to use
- Multi-step transactions involve provider/mode selection, retries, or compensation.
- Multiple flows share common execution primitives.

## When NOT to use
- Truly single-step operations with no branching or policy logic.

## Implementation outline
- Keep policy/selection in orchestrators.
- Keep execution units focused on concrete transactional actions.
- Track active context/session state in dedicated registries.

## Related guardrails
- [Reuse one measurement-to-goal payload mapper](../GUARDRAILS/guardrails.md#reuse-one-measurement-to-goal-payload-mapper)
- [API errors ship phase and correlation metadata](../GUARDRAILS/guardrails.md#api-errors-ship-phase-and-correlation-metadata)

## Common failure modes
- Orchestrators becoming god-services.
- Execution handlers re-encoding policy decisions.

## Sources
- Dump B — `Architectural Patterns / Policy/coordination split in storage architecture`.
- Dump B — `Lessons Learned / Separate policy decisions from transaction execution`.
- Dump A — `3) Architectural Patterns / Route-local server actions for mutations + revalidation`.
