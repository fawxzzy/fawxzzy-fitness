# Pattern: CI Guardrails and Verification Tiers

[Back to Index](../INDEX.md)

## Problem
Manual quality discipline drifts without automated guardrails.

## Context
- Applies when multiple contributors merge behavior changes continuously.
- Assumes CI can enforce baseline checks and repository contracts.
- Requires a documented distinction between docs-only and behavior changes.

## Solution
- Define tiered checks (static, build, contract) with clear pass criteria.
- Run fast checks on every change and full checks before release gates.
- Require changelog WHAT+WHY entries for non-trivial updates.
- Validate required governance files and workflow checklists in CI scripts.
- Attach evidence of verification in PR descriptions.

## Tradeoffs
- Stricter gates can slow small PR throughput.
- CI policy maintenance is ongoing work as stack/tools evolve.
- Over-gating docs-only changes can cause unnecessary friction.

## Example
A behavior PR fails contract tier when changelog is missing, then passes after adding WHAT+WHY and rerunning lint/build/contract checks.

## When to use
- Multiple contributors or high-change velocity.
- Need consistent merge-readiness checks.

## When NOT to use
- None for shared production systems.

## Implementation outline
- Define fast local checks and full verification tiers.
- Enforce changelog/test expectations in CI guard scripts.
- Allow explicit docs-only pathways where appropriate.

## Formal Model

### Tier 1 — Static Integrity
- Linting passes.
- Typechecking passes.

### Tier 2 — Build Integrity
- Production build passes using release-like settings.

### Tier 3 — Contract Integrity
- Required governance files are present.
- Changelog is updated with concise **WHAT + WHY** when required.
- Checklist gates are satisfied and evidenced.

## Related guardrails
- [API errors ship phase and correlation metadata](../GUARDRAILS/guardrails.md#api-errors-ship-phase-and-correlation-metadata)
- [Guardrail Enforcement Index](../GUARDRAILS/_index.md)

## Common failure modes
- CI rules diverge from documented process.
- Behavior changes merge without verification evidence.

## Sources
- Dump A — `6) Workflow Discipline / scripts and checks, CI status`.
- Dump B — `Documentation & Workflow Discipline / verification tiers, CI guard script`.
- Cross-repository governance audits — contract-integrity enforcement gaps (2026-02 doctrine patch request).
