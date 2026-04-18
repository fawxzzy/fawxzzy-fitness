# Fitness Playbook Verification

This repo publishes repo-owned verification truth in `exports/fitness.playbook.verification.report.v1.json`.

ATLAS root consumes that artifact read-only. The repo remains `adopted` for adoption posture, and root promotes it to `verification_status=verified` only when this report and the repo-owned adoption evidence are both green.

## Verification Scope

- verification kind: `targeted`
- current result: `verified`
- last verified at: `2026-04-18T00:25:20Z`

Covered by this report:

- repo-owned adoption export validity and owner-contract id coverage
- repo-owned verification report validity, scope, and evidence references
- deterministic repo-local lint and production build path for this convergence slice

Explicitly outside this report:

- Lifeline, `_stack`, or ATLAS-root operator boundaries
- product-wide end-to-end browser or device validation outside the convergence slice

## Reproducible Commands

Run the repo-owned validation path in this order:

```bash
npm run test:playbook-adoption
npm run test:playbook-verification
npm run verify:strict
npm run verify
```

Interpretation:

- `npm run test:playbook-adoption` proves the repo-owned adoption export still aligns to the Playbook owner contract.
- `npm run test:playbook-verification` proves the repo-owned verification report still matches the root schema and the declared command path.
- `npm run verify:strict` is the deterministic local green path for lint plus production build.
- `npm run verify` is the canonical repo-local Playbook verify bridge and must continue to resolve cleanly.

## Evidence

- `exports/fitness.playbook.adoption.evidence.v1.json`
- `exports/fitness.playbook.verification.report.v1.json`
- `tests/playbook-adoption-evidence.test.mjs`
- `tests/playbook-verification-report.test.mjs`
- `docs/COMMANDS.md`
- `package.json`
