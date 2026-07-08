# FF Live Paid Launch Readiness Audit - 2026-07-08

## Status

Live paid production is `NO-GO`.

This is a Fitness owner-lane readiness receipt. It does not mutate Stripe live mode, Vercel environment variables, deployments, ATLAS root state, Mazer, Supabase data, or secrets.

## Scope

This pass classifies the current live paid launch blockers after sandbox proof closure. It is not legal advice and does not replace counsel, operator, or business approval.

## Current Proof State

- Sandbox hosted Stripe Checkout proof: closed.
- Sandbox Customer Portal proof: closed.
- Sandbox cancel-at-period-end proof: closed.
- Current-deploy sandbox webhook freshness proof: closed.
- Pro capacity gate proof: closed for the local QA proof lane on `2026-07-08`.
- Live paid launch proof: not closed.

The app-side recurring Pro implementation is materially ready for live configuration review, but live mode is not launch-ready.

## Code Path Confirmation

Reviewed paths:

- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/webhook/stripe/route.ts`
- `src/app/api/billing/portal/route.ts`
- `src/components/settings/ProAccessSettings.tsx`
- `src/lib/env.ts`
- `docs/ops/FF-MON-001-BILLING-APP-UI-PROOF-PACKET-2026-07-03.md`
- `docs/ops/FF-MON-001-LIVE-STRIPE-CONFIG-AUDIT-2026-07-07.md`
- `docs/ops/FF-LEGAL-001-PRIVATE-SUPPORT-DECISION-PACKET-2026-07-07.md`
- `docs/ops/FF-QA-001-MONETIZATION-LAUNCH-SMOKE-MATRIX-2026-07-01.md`

Findings:

- Checkout creates Stripe Checkout Sessions with `mode: "subscription"`.
- Checkout metadata records `purchase_kind: "pro_subscription"`.
- Pending purchase rows are created as `purchase_kind: "pro_subscription"`.
- Webhook handling routes `checkout.session.completed` with `session.mode === "subscription"` into subscription fulfillment.
- Subscription fulfillment writes `purchase_kind: "pro_subscription"` and `entitlement_key: "pro"`.
- Legacy lifetime handling still exists for non-subscription checkout sessions, but it is not the active paid-launch path for Monthly Pro.
- The billing portal route creates app-started Stripe Customer Portal sessions with return URL `/settings?section=pro`.
- The Pro settings UI presents the current customer-facing offer as `$5/month`, recurring, Stripe-processed, and capacity-only.

## Live Blockers

The live paid launch remains blocked until all items below are closed with operator-owned proof.

| Blocker | Current state | Required closure |
| --- | --- | --- |
| Live Stripe product name | Live product was audited as `test`. | Rename or replace with the final customer-facing product name before users can see receipts, invoices, checkout, or portal surfaces. |
| Live webhook endpoint | No live webhook destination was configured in the live account audit. | Create the live HTTPS webhook destination for `/api/billing/webhook/stripe`. |
| Live webhook events | Not configured in live mode. | Include at minimum `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.paid`. |
| Vercel production publishable key mode | Prior audit observed test-mode public key shape in production env pull. | Production browser key must use live publishable key shape, recorded only as `pk_live_...`. |
| Vercel production server key mode | Not proven live-mode ready. | Production server key must be a live secret or restricted live key. Do not commit or print the value. |
| Vercel production webhook secret | Not proven for a live webhook endpoint. | Install the signing secret from the live webhook endpoint into Vercel production. Do not commit or print the value. |
| Production redeploy after env change | Not yet performed for final live env. | Redeploy after Vercel production env changes; previous deployments do not receive changed env values. |
| Stripe public legal links | Prior audit says live Terms and Privacy links are not set. | Set Stripe public business Terms and Privacy URLs to the production legal routes. |
| Customer Portal return behavior | Not final-proofed for live. | Confirm live portal return/default redirect path lands back on the production account/settings Pro surface. |
| Support path | Operator decision still open. | Choose monitored Discord-private, mailbox, or ticket path and record accepted risk. |
| Refund posture | Operator/legal decision still open. | Record refund window, partial-month posture, duplicate payment handling, disputes/chargebacks, and Stripe refund handling. |
| Launch geography | Operator/legal decision still open. | Record launch geography and any consumer health-data review obligations. |
| Legal entity posture | Operator/legal decision still open. | Record operating entity, governing law, venue, dispute language, and public provider disclosures. |
| Deletion with active subscription | Procedure still open. | Document and verify how account deletion interacts with active Stripe subscriptions and retained billing records. |
| Counsel/operator acceptance | Not closed. | Record counsel signoff or explicit operator MVP-risk acceptance before live payment collection. |

## Go / No-Go Criteria

### `NO-GO`

Live paid launch must remain blocked if any of these are true:

- Live product can surface as `test`.
- Production public key shape is still `pk_test_...`.
- Live webhook endpoint is missing or unverified.
- Live webhook signing secret is not installed in production.
- Production has not been redeployed after live env changes.
- Portal cancellation or return behavior is not verified for live.
- Terms or Privacy links are missing from Stripe public business information.
- Support, refund, geography, legal entity, or active-subscription deletion decisions remain open.
- A live test could charge a real user without explicit operator approval.

### `READY-FOR-OPERATOR-LIVE-CONFIG`

The lane can move from `NO-GO` to `READY-FOR-OPERATOR-LIVE-CONFIG` only after the operator accepts the legal/business decisions and prepares to manually configure live Stripe and Vercel settings.

### `READY-FOR-BOUNDED-LIVE-SMOKE`

The lane can move to `READY-FOR-BOUNDED-LIVE-SMOKE` only after:

- live Stripe product, price, webhook, portal, and public legal links are configured;
- Vercel production env uses live key shapes and live webhook signing secret;
- production is redeployed after env changes;
- the operator explicitly approves the exact bounded live smoke and any real-money handling.

## Human Operator Actions Required

1. Rename or replace the live Stripe product currently named `test`.
2. Confirm the final live `$5/month` recurring price.
3. Configure the live webhook destination at the production HTTPS endpoint.
4. Select required live webhook events.
5. Copy the live webhook signing secret into Vercel production manually.
6. Confirm production public key shape is `pk_live_...`.
7. Confirm production server key is a live server key or live restricted key.
8. Set production `STRIPE_PRO_STANDARD_PRICE_ID` to the final live recurring price id.
9. Keep `STRIPE_PRO_ACTIVE_PRICE_MODE` set to `standard` unless the operator intentionally launches a different live offer.
10. Redeploy production after Vercel env changes.
11. Set Stripe public business Terms and Privacy links.
12. Confirm Customer Portal cancellation behavior and return URL.
13. Choose support path and record the accepted support SLA/risk.
14. Finalize refund posture.
15. Finalize launch geography and health-data review posture.
16. Finalize legal entity, governing law, venue, and dispute posture.
17. Write deletion-with-active-subscription procedure.
18. Record counsel signoff or explicit operator risk acceptance.
19. Run a bounded live-readiness smoke only after the above are complete.

## Safe Verification Run

Commands run on `2026-07-08`:

```text
git status -sb
git branch --show-current
git fetch origin
git rev-list --left-right --count origin/main...HEAD
git log -8 --oneline --decorate
git diff --name-only
npm run test:billing
npm run typecheck
npm run qa:pro-tier-gating
```

Results:

- Branch: `main`.
- Fitness parity: `origin/main...HEAD = 0 0` before this receipt.
- `npm run test:billing`: pass, `22/22`.
- `npm run typecheck`: pass.
- `npm run qa:pro-tier-gating`: pass.
- QA gating account: `atlas-fitness-tier-qa@fawxzzy.test`.
- QA base URL: `http://127.0.0.1:3002`.
- Free gate verified: `3` visible routines and `14` visible saved workout plans.
- Pro gate verified: `5` routines and `16` saved workout plans visible after Pro entitlement fixture.

## Dirty Worktree Classification

The Fitness repo had a broad pre-existing dirty worktree before this receipt was added:

- Modified files: `47`.
- Deleted files: `2`.
- Untracked files: `11`.

Observed categories:

- Monetization/legal docs and launch proof receipts.
- Stripe billing webhook and subscription status logic.
- Pro capacity gating tests and helper scripts.
- Legal/settings UI copy and tests.
- Routine/workout plan/session UI and action surfaces.
- PWA icon/manifest assets and generation scripts.

This receipt does not classify that dirty bundle as ready to commit. It only records that the bundle exists and should be handled as separate Fitness owner-lane implementation/proof work.

Commit hygiene rule for this receipt:

- Stage only `docs/ops/FF-LIVE-PAID-LAUNCH-READINESS-AUDIT-2026-07-08.md`.
- Do not stage unrelated dirty files.
- Do not touch `.env*`, secrets, ATLAS root, Mazer, Vercel, Supabase, live Stripe settings, or deploy state.

## Source Guidance Applied

- Stripe subscriptions should use Billing APIs paired with Checkout Sessions in subscription mode.
- Stripe Customer Portal is the expected self-service path for subscription management and cancellation.
- Vercel production environment changes require a new deployment before runtime behavior changes.
- Secrets must stay in Vercel environment variables or local ignored env files, never committed docs or tracked source.

## Current Launch Posture

`NO-GO`.

The next move is not more sandbox proof. The next move is operator-owned live configuration and legal/business decision closure, followed by a bounded live-readiness smoke only after explicit approval.

## ATLAS / Mazer Boundary

- ATLAS root was not mutated by this Fitness owner-lane receipt.
- Mazer was not inspected or mutated.
- No ATLAS marker movement is claimed from this Fitness receipt.
- ATLAS may later preserve a read-only owner-lane receipt only if a separate ATLAS root packet requests that projection.

## Exact Next Action

Operator should complete the live/business/legal checklist above. After that, run a separate bounded Fitness live-configuration proof packet that verifies live product name, live webhook delivery, Vercel live key shapes, Customer Portal links/return behavior, and post-redeploy production smoke readiness without exposing secrets.
