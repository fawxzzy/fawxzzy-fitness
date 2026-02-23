# Pattern: Deterministic, Reversible State

[Back to Index](../INDEX.md)

## Problem
Hidden or non-deterministic mutations make recovery, replay, and debugging unreliable.

## When to use
- State changes affect user history, correctness, or auditability.
- Undo/redo, replay, or migration compatibility matters.

## When NOT to use
- Short-lived UI-only state with no side effects or persistence.

## Implementation outline
- Model mutations as explicit transitions.
- Keep transition inputs/outputs serializable and explainable.
- Preserve metadata required for replay/rollback.

## Common failure modes
- Random/time-dependent behavior embedded in transition logic.
- Side effects executed outside traceable transaction boundaries.

## Sources
- Dump A — `2) Core Principles / deterministic and explainable`.
- Dump B — `Core Principles / Deterministic, reversible state changes`.
