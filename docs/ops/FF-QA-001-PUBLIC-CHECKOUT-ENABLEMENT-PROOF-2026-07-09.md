# FF-QA-001 Public Checkout Enablement Proof - 2026-07-09

## Decision

Public paid checkout is enabled for the MVP soft-launch path.

This was explicitly approved by the operator after guarded visual smoke, legal/support risk acceptance, Supabase hardening, bounded live paid smoke, and final production preflight.

## Production Deploy

- Stable alias: `https://fawxzzy-fitness-local.vercel.app`
- Deployment: `dpl_8CuUJWAK1VHZFHhKmm46zj3ECji6`
- Deployment URL: `https://fawxzzy-fitness-83d2mfhlq-fawxzzy.vercel.app`
- Production flag: `PAID_LAUNCH_ENABLED=true`
- Active Stripe mode: live
- Active monthly Pro price: `$5.00 / month`

## Pre-Enable Verification

- `npm run release:preflight` passed before deploy.
- Local release preflight ran:
  - repo verification
  - typecheck
  - production build
- Build completed with existing ESLint warnings only.

## Post-Deploy Route Verification

- `/privacy` returned `200`.
- `/terms` returned `200`.
- `/install?installContext=desktop` returned `200`.
- unauthenticated `/settings?section=pro` returned `307` to `/login`.

## Post-Deploy Auth Verification

Authenticated production smoke passed against the stable alias for:

- `/today`
- `/routines`
- `/history`
- `/settings`
- `/dev/progression-audit`

QA account used:

- `atlas-fitness-billing-qa@fawxzzy.test`

## Live Webhook Readiness

Command:

```bash
FITNESS_ENV_FILE=C:\ATLAS\secrets\fitness-vercel-production-after-enable-2026-07-09.env npm run qa:stripe:webhook-readiness -- --mode live --json
```

Result:

- `ok: true`
- Stripe mode: `live`
- Stripe account: `acct_1ToSxw1n5lBbRYoV`
- Endpoint: `we_1Tqldd1n5lBbRYoVkvltrp1J`
- Endpoint status: `enabled`
- Endpoint URL: `https://fawxzzy-fitness-local.vercel.app/api/billing/webhook/stripe`
- Missing required events: none

Required events covered:

- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## Public Checkout Start Proof

A temporary live free QA account was created only to verify public checkout start without charging money.

The app-created Checkout Session proved:

- `POST /api/billing/checkout` returned `200`.
- Hosted checkout host was `checkout.stripe.com`.
- Checkout Session mode was `subscription`.
- Checkout Session amount was `500`.
- Currency was `usd`.
- Recurring interval was `month`.
- Active price id matched production `STRIPE_PRO_STANDARD_PRICE_ID`.
- Payment status stayed `unpaid`.

The unpaid Checkout Session was immediately expired.

Cleanup completed:

- temporary `billing_purchases` rows deleted
- temporary `billing_customers` row deleted
- temporary `user_entitlements` rows deleted
- temporary Supabase Auth user deleted
- temporary Stripe customer deleted
- unpaid live Checkout Session expired

## Live Expired-Checkout Webhook Freshness

The checkout expiration generated live event:

- Event: `evt_1TrKPm1n5lBbRYoVQ1TboDND`
- Type: `checkout.session.expired`
- Mode: live
- Checkout Session: `cs_live_a10AzTCWh5M5aPDRcNmM8OknMrsfUw4EunivJ5q3VAByOCZKceewLwW5Xq`
- `pending_webhooks: 0`

Interpretation:

- The unpaid public-checkout probe did not create a charge.
- The live webhook endpoint had no pending delivery remaining for the generated expiration event at readback time.

## Billing Test Verification

`npm run test:billing` passed:

- `36/36` tests passed
- includes paid-launch env normalization, subscription status, cancellation/downgrade policy, webhook signature fallback, receipt reconciliation, and Pro tier limits.

## Final State

`FF-QA-001` and `FF-MON-001` are proof-closed for MVP soft launch.

Post-launch follow-ups remain:

- actual live post-period downgrade recheck after the paid QA subscription period ends
- 10-20 real-user beta learning loop
- counsel/legal review before broader scale
- Supabase restore drill and deferred security posture checks
- post-launch monitoring of checkout, webhook, entitlement, support, and cancellation behavior

