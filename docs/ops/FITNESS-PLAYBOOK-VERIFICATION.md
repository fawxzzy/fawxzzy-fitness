# Fitness Playbook Verification

This repo publishes repo-owned verification truth in `exports/fitness.playbook.verification.report.v1.json`.

ATLAS root consumes that artifact read-only. The repo remains `adopted` for adoption posture, and root promotes it to `verification_status=verified` only when this report and the repo-owned adoption evidence are both green.

## Verification Scope

- verification kind: `targeted`
- current result: `verified`
- last verified at: `2026-04-18T21:58:59Z`

Covered by this report:

- repo-owned adoption export validity and owner-contract id coverage
- repo-owned verification report validity, scope, and evidence references
- repo-owned Fitness event contract and shadow receipt validation
- repo-owned shadow warehouse smoke checks for critical event arrival, schema conformance, and funnel/dashboard KPI acceptance
- deterministic repo-local mobile-regression harness parity, lint, and production build path for this convergence slice

Explicitly outside this report:

- Lifeline, `_stack`, or ATLAS-root operator boundaries
- product-wide end-to-end browser or device validation outside the convergence slice

## Reproducible Commands

Run the repo-owned validation path in this order:

```bash
npm run test:playbook-adoption
npm run test:fitness-event-contracts
npm run test:fitness-shadow-warehouse
npm run test:playbook-verification
npm run verify:mobile-regression
npm run verify:strict
npm run verify
```

Interpretation:

- `npm run test:playbook-adoption` proves the repo-owned adoption export still aligns to the Playbook owner contract.
- `npm run test:fitness-event-contracts` proves the repo-owned Fitness event contract and shadow receipt validators stay aligned.
- `npm run test:fitness-shadow-warehouse` proves critical shadow-mode events still arrive in the receipt sink with the expected persisted shape and that the first funnel/dashboard consumer pack computes KPI denominators from those receipts correctly.
- `npm run test:playbook-verification` proves the repo-owned verification report still matches the root schema and the declared command path.
- `npm run verify:mobile-regression` proves the dev-only mobile harness still satisfies current screen contracts before release build time.
- `npm run verify:strict` is the deterministic local green path for lint, harness parity, and production build.
- `npm run verify` is the canonical repo-local Playbook verify bridge and must continue to resolve cleanly.

## Evidence

- `exports/fitness.playbook.adoption.evidence.v1.json`
- `exports/fitness.playbook.verification.report.v1.json`
- `src/lib/ecosystem/fitness-integration-contract.test.ts`
- `src/lib/ecosystem/fitness-shadow-events.test.ts`
- `src/lib/ecosystem/fitness-shadow-warehouse.test.ts`
- `src/lib/ecosystem/fitness-funnel-dashboard.test.ts`
- `tests/playbook-adoption-evidence.test.mjs`
- `tests/playbook-verification-report.test.mjs`
- `docs/COMMANDS.md`
- `package.json`
