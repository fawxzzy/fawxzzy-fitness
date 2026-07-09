# FF-QA-001 Guarded Smoke Proof - 2026-07-09

## Status

Result: PASS for the safe guarded smoke subset.

This is not public paid launch approval. Public checkout remained disabled during the proof.

## Environment

- App: `https://fawxzzy-fitness-local.vercel.app`
- Production env source: fresh Vercel production env pull to local-only secrets file `C:\ATLAS\secrets\fitness-vercel-production-smoke-2026-07-09.env`
- Checkout guard: `PAID_LAUNCH_ENABLED=false`
- Live Stripe account: `acct_1ToSxw1n5lBbRYoV`
- Live webhook endpoint: `we_1Tqldd1n5lBbRYoVkvltrp1J`

Sensitive values were not printed in the proof output.

## Public Route Smoke

Command shape:

```powershell
curl.exe -s -o NUL -w '%{http_code} %{redirect_url}' <route>
```

Results:

| Route | Result |
| --- | --- |
| `/privacy` | `200` |
| `/terms` | `200` |
| `/install?installContext=desktop` | `200` |
| `/settings?section=pro` unauthenticated | `307` to `/login` |

## Authenticated Route Smoke

Commands:

```powershell
npm run qa:auth:bootstrap
npm run qa:auth:check
```

Result:

- QA account: `atlas-fitness-qa-local@fawxzzy.test`
- Auth bootstrap: PASS
- Protected route smoke: PASS
- Routes:
  - `/today` -> `200`
  - `/routines` -> `200`
  - `/history` -> `200`
  - `/settings` -> `200`
  - `/dev/progression-audit` -> `200`

## Live Stripe Webhook Readiness

Command:

```powershell
npm run qa:stripe:webhook-readiness -- --mode live --json
```

Result: PASS

- Live account: `acct_1ToSxw1n5lBbRYoV`
- Endpoint found: `we_1Tqldd1n5lBbRYoVkvltrp1J`
- Endpoint status: `enabled`
- Required events present:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- `missingEvents: []`

## Checkout Guard Proof

Command shape:

```js
POST https://fawxzzy-fitness-local.vercel.app/api/billing/checkout
```

Result: PASS

- Authenticated request status: `503`
- Response code: `BILLING_CHECKOUT_LAUNCH_DISABLED`
- Response message: `Monthly Pro checkout is not open yet.`
- Response included a request id.

Interpretation:

- Production has live Stripe configuration available.
- Public checkout creation remains fail-closed until `PAID_LAUNCH_ENABLED=true`.

## Billing Policy Tests

Command:

```powershell
npm run test:billing
```

Result: PASS

- `36/36` tests passed.
- Coverage includes Stripe config fail-closed behavior, Pro access snapshot truth, checkout reconciliation, webhook signature verification, subscription status policy, and Pro tier limits.

## Pro Capacity Gating Proof

Command:

```powershell
npm run qa:pro-tier-gating
```

Result: PASS

- QA account: `atlas-fitness-tier-qa@fawxzzy.test`
- Base tier:
  - routine limit: `3`
  - saved workout plan limit: `14`
  - hidden routines blocked from direct display
- Pro tier:
  - all `5` seeded routines visible
  - all `16` seeded saved workout plans visible
  - previously hidden routine directly visible after Pro entitlement

Residual state:

- This proof intentionally leaves the reusable tier QA account and seeded fixture state available for future gating checks.
- It is bounded to `atlas-fitness-tier-qa@fawxzzy.test`.

## Protected Visual Smoke

Setup:

```powershell
npm run qa:user:reset
npm run qa:session:refresh
npm run qa:session:check
```

Result: PASS

- Reusable QA baseline restored for `atlas-fitness-qa-local@fawxzzy.test`.
- QA session artifact refreshed for `https://fawxzzy-fitness-local.vercel.app`.
- Protected mobile-width visual captures passed:
  - `npm run visual:fitness:settings`
  - `npm run visual:fitness:today`
  - `npm run visual:fitness:routines`
  - `npm run visual:fitness:workout-plans`
  - `npm run visual:fitness:history`
  - `npm run visual:fitness:history-detail`
  - `npm run visual:fitness:session`

Representative local-only capture manifests:

- `C:\ATLAS\tmp\captures\fitness\settings\2026-07-09-15-35-26\capture-manifest.json`
- `C:\ATLAS\tmp\captures\fitness\today\2026-07-09-15-35-36\capture-manifest.json`
- `C:\ATLAS\tmp\captures\fitness\routines\2026-07-09-15-35-48\capture-manifest.json`
- `C:\ATLAS\tmp\captures\fitness\workout-plans\2026-07-09-15-35-59\capture-manifest.json`
- `C:\ATLAS\tmp\captures\fitness\history\2026-07-09-15-36-43\capture-manifest.json`
- `C:\ATLAS\tmp\captures\fitness\history-detail\2026-07-09-15-37-10\capture-manifest.json`
- `C:\ATLAS\tmp\captures\fitness\session\2026-07-09-15-37-19\capture-manifest.json`

Notes:

- A chained multi-suite run briefly hit a Next client auto-recovery from `/history` back to `/today` with `Cannot destructure property 'parallelRouterKey' of 'e' as it is null`.
- The isolated protected `/history` visual suite immediately passed afterward against the same refreshed QA baseline.
- Treat this as a route-transition runner caveat to watch in final manual smoke, not as a reproduced route-load failure.

## Verification

Already passing in this closeout lane:

```powershell
node --check scripts\feedback-monetization-roadmap.mjs
node --check scripts\seed-feedback-monetization-roadmap.mjs
npm run typecheck
npm run verify
```

## Still Open

- Operator visual review of the captured protected smoke screenshots.
- Explicit operator approval before public checkout is enabled.
- Production env mutation to `PAID_LAUNCH_ENABLED=true`.
- Redeploy after enablement.
- Post-enable live checkout verification.
- Post-enable monitoring and rollback readiness.

## Launch Call

Current state:

```txt
Final QA / Guarded
```

Public checkout must remain disabled until the final whole-app smoke passes and the operator explicitly approves enablement.

## Discord / Card Sync

- `FF-QA-001` forum card sync: `UPDATED FF-QA-001 -> 20f929fc-678c-4808-ade9-c48ece1da927`
- Discord updates post: `1524802864667426857`
- Updates channel: `1504671871512346695`
