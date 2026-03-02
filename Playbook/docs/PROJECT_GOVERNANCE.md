# Project Governance Contract

Use this document as the canonical Playbook-owned governance contract for consuming repositories.

## Governance Scope Declaration

```md
Governance Scope: Normative | Reference
Playbook Version Pin: vX.Y.Z
Sync Cadence: <e.g., monthly / per release>
```

- **Normative**: Playbook doctrine is binding for local governance and architectural contracts unless documented divergence is approved.
- **Reference**: Playbook doctrine is advisory; local governance defines final constraints and must explicitly document where it diverges.

## Required local docs in consuming repositories

- `docs/PROJECT_GOVERNANCE.md`: declares governance scope, version pin, sync cadence, and divergence policy.
- `docs/ARCHITECTURE.md`: defines local architectural contracts and invariants.
- `docs/CHANGELOG.md`: records governance-relevant changes using WHAT + WHY.
- `docs/PLAYBOOK_NOTES.md`: captures reusable doctrine candidates for upstreaming.
- `docs/PLAYBOOK_CHECKLIST.md`: points maintainers to active workflow/checklist requirements.

These local docs map Playbook doctrine to repository-specific contracts without weakening core invariants silently.

## Referencing Playbook layers

When citing Playbook, reference the canonical layer explicitly:

- `docs/PRINCIPLES/` for immutable governance philosophy.
- `docs/PATTERNS/` for reusable implementation strategies.
- `docs/GUARDRAILS/` for enforceable invariants.
- `docs/WORKFLOWS/` for operational checklists and execution steps.
- `docs/REFERENCE/` for glossary, standards, and decision records.

## Version pinning and update expectations

- Pin a specific Playbook version (`vX.Y.Z`) in local governance scope.
- Sync on a declared cadence (recommended: monthly or release-aligned).
- Use subtree updates through a dedicated branch and run local governance checks before merge.
- Bump local Playbook pin only after documenting contract-impacting changes in local changelog.

## Do / Don't

**Do**
- Declare governance scope and version pin explicitly.
- Document approved divergence with reason, owner, and sunset/review target.
- Keep local architecture and changelog aligned with applied Playbook updates.

**Don't**
- Silently weaken invariants or enforcement expectations.
- Treat reference material as binding without explicit local adoption.
- Modify local governance docs solely because upstream changed unless local contracts are affected.
