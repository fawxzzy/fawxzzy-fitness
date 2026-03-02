# Pattern: Deterministic, Reversible State

[Back to Index](../INDEX.md)

## Problem
Hidden or non-deterministic mutations make recovery, replay, and debugging unreliable.

## Context
- Used for flows where state transitions must be auditable and replayable.
- Assumes transition inputs/outputs can be serialized deterministically.
- Important when aggregates/caches derive from mutation history.

## Solution
- Model state transitions as explicit operations with stable inputs.
- Use canonical IDs at render and persistence boundaries.
- Centralize shared payload mappers to avoid flow drift.
- Recompute derived aggregates after both additive and destructive mutations.
- Keep undo/recovery paths limited to deterministic snapshot-based restores.

## Tradeoffs
- Adds modeling overhead versus ad hoc mutation logic.
- Strict canonical-ID rules require migration of legacy wrappers.
- Symmetric recompute can increase post-mutation workload.

## Example
History edit/delete paths collect touched canonical exercise IDs and trigger bounded recompute so Last/PR values remain consistent with source records.

## When to use
- State changes affect user history, correctness, or auditability.
- Undo/redo, replay, or migration compatibility matters.

## When NOT to use
- Short-lived UI-only state with no side effects or persistence.

## Implementation outline
- Model mutations as explicit transitions.
- Keep transition inputs/outputs serializable and explainable.
- Preserve metadata required for replay/rollback.

## Related guardrails
- [Resolve cached and aggregated stats by canonical entity ID](../GUARDRAILS/guardrails.md#resolve-cached-and-aggregated-stats-by-canonical-entity-id)
- [History exercise browsers use canonical catalog loader](../GUARDRAILS/guardrails.md#history-exercise-browsers-use-canonical-catalog-loader)
- [Recompute derived caches after additive and destructive mutations](../GUARDRAILS/guardrails.md#recompute-derived-caches-after-additive-and-destructive-mutations)

## Common failure modes
- Random/time-dependent behavior embedded in transition logic.
- Side effects executed outside traceable transaction boundaries.
- Canonical caches queried via wrapper IDs.
- Browser/catalog surfaces reading divergent exercise sources.
- Symmetric recompute omitted for destructive mutations.
- Undo offered without deterministic restore state.

## Sources
- Dump A — `2) Core Principles / deterministic and explainable`.
- Dump B — `Core Principles / Deterministic, reversible state changes`.
- `docs/PLAYBOOK_NOTES.md` (2026-02-28 guardrails batch: canonical IDs, unified goal mapping, bounded recompute, risk-tiered undo; 2026-03-01 shared catalog loader guardrail).
