# Fitness Governance Loop

Fitness participates only through the governed loop:

`signal -> plan -> action -> receipt`

## Constraints

- Signals are routed to Playbook in deterministic shapes.
- Plans are authored in Playbook and then routed across the Playbook/Lifeline seam.
- Actions are bounded and deterministic.
- Receipts are mandatory outcomes for each action type.
- Direct bypass of the Playbook/Lifeline seam is not allowed.
