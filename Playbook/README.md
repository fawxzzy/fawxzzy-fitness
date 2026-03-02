# Playbook

Playbook is a versioned governance engine for engineering execution across repositories. It defines immutable principles, reusable patterns, enforceable guardrails, operational workflows, and reference contracts so teams can ship quickly without governance drift.

This repository is maintained as doctrine infrastructure: governance updates are versioned, guardrails are indexed for enforcement, and downstream repositories consume updates through a defined sync strategy. Treat this as the source of truth for reusable governance assets.

## Governance layers
- `docs/PRINCIPLES/`: immutable philosophy.
- `docs/PATTERNS/`: reusable implementation patterns.
- `docs/GUARDRAILS/`: enforceable constraints and invariants.
- `docs/WORKFLOWS/`: execution workflows and checklists.
- `docs/REFERENCE/`: definitions, standards, and decision records.
- `docs/VERSIONING.md`: governance semantic version contract.

## Proposing a new pattern
1. Add or update a file in `docs/PATTERNS/` using: Problem, Context, Solution, Tradeoffs, Example.
2. Link any related guardrail(s) from `docs/GUARDRAILS/_index.md`.
3. Update `docs/CHANGELOG.md` with WHAT + WHY.
4. Bump version in `docs/VERSIONING.md` (MINOR for new pattern).

## Proposing a new guardrail
1. Add guardrail entry using the required template fields in `docs/GUARDRAILS/guardrails.md`.
2. Register it in `docs/GUARDRAILS/_index.md` under the correct Type and Status.
3. Link related pattern(s).
4. Update `docs/CHANGELOG.md` and `docs/VERSIONING.md` (MINOR for new guardrail).

## Versioning model
Governance changes follow semantic versioning:
- MAJOR: breaking governance contract.
- MINOR: new pattern/guardrail.
- PATCH: clarity/non-semantic updates.

## Downstream consumption
Downstream repositories should start with `docs/PROJECT_GOVERNANCE.md` as the governance contract entrypoint, then follow `docs/CONSUMPTION.md` for subtree integration and safe sync workflow.
