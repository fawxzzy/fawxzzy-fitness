# Pattern: CI Guardrails and Verification Tiers

[Back to Index](../INDEX.md)

## Problem
Manual quality discipline drifts without automated guardrails.

## When to use
- Multiple contributors or high-change velocity.
- Need consistent merge-readiness checks.

## When NOT to use
- None for shared production systems.

## Implementation outline
- Define fast local checks and full verification tiers.
- Enforce changelog/test expectations in CI guard scripts.
- Allow explicit docs-only pathways where appropriate.

## Common failure modes
- CI rules diverge from documented process.
- Behavior changes merge without verification evidence.

## Sources
- Dump A — `6) Workflow Discipline / scripts and checks, CI status`.
- Dump B — `Documentation & Workflow Discipline / verification tiers, CI guard script`.
