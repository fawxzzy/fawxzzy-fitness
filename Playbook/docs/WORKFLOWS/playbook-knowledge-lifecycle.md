# Playbook Knowledge Lifecycle

[Back to Workflows Index](./_index.md)

This lifecycle is the canonical model for converting field learnings into enforceable governance.

## Lifecycle states

Observation *(optional)* → Draft → Proposed → Promoted → Contract

- **Observation (optional):** raw signal captured quickly; may be incomplete.
- **Draft:** structured note with enough context to review in the next promotion pass.
- **Proposed:** reviewed by maintainers and considered reusable beyond one incident.
- **Promoted:** accepted doctrine candidate that should be reflected in principles/patterns/guardrails.
- **Contract:** doctrine elevated into explicit, machine-verifiable enforcement.

## Required fields for each `PLAYBOOK_NOTES` entry

Every entry in `docs/PLAYBOOK_NOTES.md` must include:

- `Type`
- `Summary`
- `Rationale`
- `Evidence`
- `Suggested Playbook File`
- `Status`

## Promotion criteria

### Draft → Proposed
Promote when all are true:
- Required fields are complete and concrete.
- Evidence points to real files/incidents, not hypothetical scenarios.
- Rule is reusable across at least one additional feature or team.

### Proposed → Promoted
Promote when all are true:
- Candidate has been reviewed in at least one governance pass.
- Candidate is mapped to a canonical Playbook location (principle/pattern/guardrail/workflow).
- Tradeoffs and adoption guidance are clear enough for downstream repos.

### Promoted → Contract
Promote to Contract when at least one is true and machine checks are feasible:
- **Machine-verifiable:** can be detected statically or by deterministic heuristics.
- **High ROI:** repeated failures are costly (security, reliability, velocity).
- **Frequently violated:** recurring drift is observed across PRs or repos.

## Operator UX (`npm run playbook`)

The engine must print:

1. **Lifecycle snapshot:** Draft / Proposed / Promoted counts.
2. **Contracts status:** `PASS`, `WARN`, or `FAIL`.
3. **Recommended next command:** a concrete command the operator should run next.

Example:

```txt
Playbook Knowledge Lifecycle Snapshot
Draft: 2
Proposed: 6
Promoted: 3
Contracts: WARN
Suggested next command: npm run playbook:contracts
```
