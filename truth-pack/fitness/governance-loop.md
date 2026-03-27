# Fitness Governance Loop

Fitness participates only through the governed loop:

`signal -> plan -> action -> receipt`

## Boundary truths

- Rule: Fitness owns signal emission and inspectable app snapshots, not ecosystem planning.
- Pattern: app repos prepare governed payloads and consume receipts through a thin seam adapter.
- Failure Mode: embedding Playbook planning or Lifeline execution inside the app destroys the governed architecture.

## Constraints

- Signals are routed to Playbook in deterministic shapes.
- Plans are authored in Playbook and then routed across the Playbook/Lifeline seam.
- Actions are bounded and deterministic.
- Receipts are mandatory outcomes for each action type.
- Direct bypass of the Playbook/Lifeline seam is not allowed.
