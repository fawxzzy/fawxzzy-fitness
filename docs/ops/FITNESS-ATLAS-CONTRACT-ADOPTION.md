# Fitness ATLAS Contract Adoption

Fitness publishes repo-owned ATLAS platform v1 exports under `exports/fitness.atlas.*.json`.

This lane binds the app repo to the frozen root schema package in `packages/atlas-contracts/` without moving app implementation truth into ATLAS root.

ATLAS reusable workflow contract pinned at commit `b48f820d3eca094800c2f3ccb36901dadfd259a9`.

## Repo-Owned Surfaces

- `exports/fitness.atlas.app-registration.v1.json`
- `exports/fitness.atlas.env.v1.json`
- `exports/fitness.atlas.health.v1.json`
- `exports/fitness.atlas.event.v1.json`
- `exports/fitness.atlas.receipt.v1.json`
- `tests/atlas-platform-contracts.test.mjs`
- `.github/workflows/atlas-contracts.yml`

## Verification Path

Run:

```bash
npm run test:atlas-contracts
npm run verify
```

The ATLAS contract lane stays intentionally narrow:

- app registration stays repo-owned
- env posture stays explicit and negative-safe
- `/api/health` is the live repo-owned health surface
- exported event and receipt examples stay machine-validated against the root schemas

This tranche does not claim broader auth, deploy, or stack orchestration ownership. It only proves that Fitness can consume the frozen ATLAS platform v1 boundary in a repo-owned, testable shape.
