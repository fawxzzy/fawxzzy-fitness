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

## Doctrine
Declared requirements without CI enforcement are advisory, not binding.

## Common failure modes
- CI rules diverge from documented process.
- Behavior changes merge without verification evidence.

## Sources
- Dump A — `6) Workflow Discipline / scripts and checks, CI status`.
- Dump B — `Documentation & Workflow Discipline / verification tiers, CI guard script`.
- Cross-repository governance audits — contract-integrity enforcement gaps (2026-02 doctrine patch request).
