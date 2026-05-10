# Fitness ATLAS Contract Adoption

Fitness Wave 2A adopts the root-owned ATLAS platform v1 surface without moving implementation truth out of this repo.

## Owner-Lane Surface

Repo-owned ATLAS exports now live in `exports/`:

- `fitness.atlas.app-registration.v1.json`
- `fitness.atlas.env.v1.json`
- `fitness.atlas.health.v1.json`
- `fitness.atlas.event.v1.json`
- `fitness.atlas.receipt.v1.json`

Those files are representative owner-lane declarations that ATLAS root can consume read-only.

## Validation Path

Run:

```bash
npm run test:atlas-contracts
```

That command validates all five repo-owned exports against the root ATLAS schemas pinned to commit `b48f820d3eca094800c2f3ccb36901dadfd259a9`.

Resolution order:

- use the local surrounding ATLAS workspace `packages/atlas-contracts/schemas/` files when they exist
- otherwise fetch the pinned raw schema files from GitHub

## Runtime Surface

Fitness now exposes `/api/health` as the live ATLAS v1 health endpoint.

The route returns:

- canonical repo and app ids
- inferred ATLAS environment
- current app version
- best-effort commit sha
- explicit checks for public Supabase auth env, service-role availability, and configured app origin

## CI Lane

`.github/workflows/atlas-contracts.yml` is a Fitness-owned local workflow that mirrors the root-owned ATLAS reusable workflow contract pinned at commit `b48f820d3eca094800c2f3ccb36901dadfd259a9`.

It runs:

- `npm run test:atlas-contracts`
- `npm run verify`

ATLAS root remains the contract source under `ops/workflows/reusable-atlas-app.yml`. Fitness owns the executable repo-local workflow until ATLAS publishes a callable reusable workflow under `.github/workflows/`.
