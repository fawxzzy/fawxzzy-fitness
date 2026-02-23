# Pattern: Orchestration vs Execution

[Back to Index](../INDEX.md)

## Problem
Workflow policy and low-level operations get tangled, creating brittle service layers.

## When to use
- Multi-step transactions involve provider/mode selection, retries, or compensation.
- Multiple flows share common execution primitives.

## When NOT to use
- Truly single-step operations with no branching or policy logic.

## Implementation outline
- Keep policy/selection in orchestrators.
- Keep execution units focused on concrete transactional actions.
- Track active context/session state in dedicated registries.

## Common failure modes
- Orchestrators becoming god-services.
- Execution handlers re-encoding policy decisions.

## Sources
- Dump B — `Architectural Patterns / Policy/coordination split in storage architecture`.
- Dump B — `Lessons Learned / Separate policy decisions from transaction execution`.
- Dump A — `3) Architectural Patterns / Route-local server actions for mutations + revalidation`.
