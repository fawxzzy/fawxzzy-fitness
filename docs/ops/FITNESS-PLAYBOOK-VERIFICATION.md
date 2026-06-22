# Fitness Playbook Verification

This repo publishes repo-owned verification truth in `exports/fitness.playbook.verification.report.v1.json`.

ATLAS root consumes that artifact read-only. The repo remains `adopted` for adoption posture, and the targeted convergence slice is promoted through `verification_status=verified` only when the report, tests, and command surface all stay reproducible.

## Verification Scope

- verification kind: `targeted`
- current result: `verified`
- last verified at: `2026-06-19T17:10:00Z`

Covered by this report:

- repo-owned Playbook adoption export validity and owner-contract id coverage
- repo-owned Playbook verification report validity, scope, and evidence references
- repo-local Fitness event-contract and shadow-warehouse checks that bound this convergence slice
- repo-local strict verify and canonical verify command surfaces

Explicitly outside this report:

- Lifeline, `_stack`, or ATLAS-root operator boundaries
- broader Fitness product certification outside this targeted convergence slice
- direct authorization for deploy, approval, or promotion boundaries

## Reproducible Commands

Run the repo-owned validation path in this order:

```bash
npm run test:fitness-event-contracts
npm run test:fitness-shadow-warehouse
npm run test:playbook-verification
npm run verify:strict
npm run verify
```

Interpretation:

- `npm run test:fitness-event-contracts` keeps the Fitness event and metrics packs honest.
- `npm run test:fitness-shadow-warehouse` keeps the shadow-only warehouse and downstream consumer lane honest.
- `npm run test:playbook-verification` proves the repo-owned verification report still matches the ATLAS root schema and declared command path.
- `npm run verify:strict` keeps the stricter repo-local contract and build gate green.
- `npm run verify` is the canonical repo-local verification bridge for the targeted convergence slice.

## Evidence

- `exports/fitness.playbook.adoption.evidence.v1.json`
- `exports/fitness.playbook.verification.report.v1.json`
- `tests/playbook-adoption-evidence.test.mjs`
- `tests/playbook-verification-report.test.mjs`
- `docs/COMMANDS.md`
- `package.json`
