# FF Live Paid Launch Readiness Audit - 2026-07-08

## Status

Live paid production is `FINAL QA / SOFT-LAUNCH CANDIDATE`.

This is a Fitness owner-lane readiness receipt. The original receipt did not mutate Stripe live mode, Vercel environment variables, deployments, ATLAS root state, Mazer, Supabase data, or secrets.

Update on `2026-07-07`: a bounded live-configuration pass did mutate live Stripe and Vercel production env state as explicitly approved by the operator. See "Live Configuration Update" below.

## Scope

This pass classifies the current live paid launch blockers after sandbox proof closure. It is not legal advice and does not replace counsel, operator, or business approval.

## Current Proof State

- Sandbox hosted Stripe Checkout proof: closed.
- Sandbox Customer Portal proof: closed.
- Sandbox cancel-at-period-end proof: closed.
- Current-deploy sandbox webhook freshness proof: closed.
- Pro capacity gate proof: closed for the local QA proof lane on `2026-07-08`.
- Live product naming: closed.
- Live webhook destination creation: closed.
- Live production Stripe env installation: closed for the current live values.
- Live no-charge webhook readiness smoke: closed.
- Live paid transaction proof: closed for one explicitly approved bounded `$5/month` QA subscription.

The app-side recurring Pro implementation and bounded live paid proof are materially ready for final launch smoke, but public checkout is not enabled.

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

## Current Live Gate

The current live gate is final smoke plus explicit checkout enablement. The table below preserves original readiness items and marks later accepted-risk or proof-closed updates where applicable.

| Blocker | Current state | Required closure |
| --- | --- | --- |
| Live Stripe product name | Closed. Product is now `Fawxzzy Fitness Pro Monthly`. | Re-verify on final live checkout/portal smoke. |
| Live webhook endpoint | Closed. Live destination `we_1Tqldd1n5lBbRYoVkvltrp1J` points at `/api/billing/webhook/stripe`. | Re-verify on final paid smoke only if webhook config changes. |
| Live webhook events | Closed. Destination is listening to the seven required events, including `invoice.payment_failed`. | Re-verify on final paid smoke only if webhook config changes. |
| Vercel production publishable key mode | Closed by env metadata refresh. Live publishable keys were installed without printing values. | Re-verify checkout uses live mode after redeploy. |
| Vercel production server key mode | Closed by redacted env readback and no-charge live Checkout Session creation. Operator accepted the installed live server key state. | Re-verify on final paid smoke only if env changes. |
| Vercel production webhook secret | Closed by signed live event delivery for endpoint `we_1Tqldd1n5lBbRYoVkvltrp1J`. | Re-verify on final paid smoke only if env changes. |
| Production redeploy after env change | Closed. Stable alias points at post-env deployment `dpl_HZKzo5XwakgyBj1KGBdpNS1HbK1R`. | Redeploy again only if env/code changes before launch. |
| Stripe public legal links | Closed. Live Stripe public business details persist production Terms and Privacy URLs. | Re-verify links on final live Checkout/Portal smoke. |
| Customer Portal return behavior | Closed for one explicitly approved live paid customer. App-started portal returned to `/settings?section=pro` and the app showed the paid customer state. | Re-verify on final launch smoke only if portal settings or app routing change. |
| Support path | Closed for MVP. Monitored support email is `fawxzzy@gmail.com`. | Re-verify links/copy during final smoke. |
| Refund posture | Accepted as MVP operator risk. | Counsel review remains recommended before broader scale. |
| Launch geography | Accepted as MVP operator risk. | Counsel/geography controls remain recommended before broader scale. |
| Legal entity posture | Accepted as MVP operator risk. | Formal entity/DBA review remains recommended before broader scale. |
| Deletion with active subscription | Accepted as MVP operator risk. | Re-verify support/legal copy during final smoke. |
| Counsel/operator acceptance | Closed for MVP by explicit operator risk acceptance. | Do not represent this as legal advice or counsel signoff. |

## Go / No-Go Criteria

### `NO-GO`

Live paid launch must remain blocked if any of these are true:

- Live product can surface as `test`.
- Production public key shape is still `pk_test_...`.
- Live webhook endpoint is missing or unverified.
- Production is not on a post-env-change deployment.
- Portal cancellation or return behavior regresses from the bounded live paid proof.
- Terms or Privacy links are missing from Stripe public business information.
- Support, refund, geography, legal entity, or active-subscription deletion decisions are reopened as blockers by operator/counsel.
- A live test could charge a real user without explicit operator approval.

### `READY-FOR-BOUNDED-PAID-SMOKE`

The lane can move to `READY-FOR-BOUNDED-PAID-SMOKE` only after:

- live Stripe product, price, webhook, portal, and public legal links are configured;
- Vercel production env uses live key shapes and live webhook signing secret;
- production is redeployed after env changes;
- no-charge live webhook delivery has passed;
- the operator explicitly approves the exact bounded paid live smoke and any real-money handling.

## Human Operator Actions Required

1. Re-verify live product name on final Checkout/Portal smoke.
2. Confirm the final live `$5/month` recurring price.
3. Re-verify the live webhook destination at the production HTTPS endpoint.
4. Re-verify required live webhook events.
5. Confirm production Stripe server key env metadata remains present.
6. Confirm production public key shape is `pk_live_...`.
7. Confirm production server key is accepted for live checkout by final smoke.
8. Re-verify production `STRIPE_PRO_STANDARD_PRICE_ID` is the final live recurring price id.
9. Re-verify `STRIPE_PRO_ACTIVE_PRICE_MODE` is `standard` unless the operator intentionally launches a different live offer.
10. ~~Redeploy production after Vercel env changes.~~ Closed on `2026-07-07` with `dpl_HZKzo5XwakgyBj1KGBdpNS1HbK1R`.
11. Re-verify Stripe public business Terms and Privacy links on final live Checkout/Portal smoke.
12. Confirm Customer Portal cancellation behavior and return URL.
13. Choose support path and record the accepted support SLA/risk.
14. Finalize refund posture.
15. Finalize launch geography and health-data review posture.
16. Finalize legal entity, governing law, venue, and dispute posture.
17. Write deletion-with-active-subscription procedure.
18. Record counsel signoff or explicit operator risk acceptance.
19. ~~Run a bounded live-readiness smoke only after the above are complete.~~ Closed for one explicitly approved live paid QA subscription on `2026-07-09`.

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

## Live Configuration Update

Date: `2026-07-07`

Approved operator action: mutate live Stripe/Vercel configuration short of live charge or production deploy.

Completed:

- Live Stripe product `prod_Uo67WohHiQI1qE` renamed to `Fawxzzy Fitness Pro Monthly`.
- Live Stripe webhook destination `we_1TqlES1n5lBbRYoVNF2MxcIq` created through Dashboard, then replaced with API-created destination `we_1Tqldd1n5lBbRYoVkvltrp1J`.
- Live destination endpoint set to `https://fawxzzy-fitness-local.vercel.app/api/billing/webhook/stripe`.
- Live destination status verified as enabled.
- Live destination initially selected six required events:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
- Follow-up source-side handler update on `2026-07-08` makes `invoice.payment_failed` a required live endpoint event before final paid smoke.
- Vercel production `STRIPE_PRO_STANDARD_PRICE_ID` refreshed to the live monthly price id.
- Vercel production `STRIPE_PRO_ACTIVE_PRICE_MODE` refreshed to `standard`.
- Vercel production `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_PUBLISHABLE_KEY` refreshed with live publishable key values.
- Vercel production `STRIPE_SECRET_KEY` refreshed with the operator-provided live secret key.
- Vercel production `STRIPE_WEBHOOK_SECRET` refreshed with the signing secret for `we_1Tqldd1n5lBbRYoVkvltrp1J`.
- Production deploy was later performed after env repair and app-side env normalization.

Blocked:

- Initial Stripe public business Terms/Privacy URL save failed because Stripe Dashboard showed an internal page issue after the fields were filled. A reload showed the links were not persisted.
- Stripe API account update also could not persist public legal URLs because Stripe rejects using that account-update method on the platform account itself.
- Follow-up Dashboard pass from the signed-in in-app browser saved both legal URLs and reopened the editor to verify persisted values:
  - `https://fawxzzy-fitness-local.vercel.app/privacy`
  - `https://fawxzzy-fitness-local.vercel.app/terms`
- Operator reviewed the live server key exposure concern and did not classify it as a launch blocker.
- Vercel production redeploy is now closed for the repaired live env setup.

## 2026-07-07 Production Redeploy And No-Charge Live Smoke

Completed:

- Added app-side env normalization for literal `\r\n` suffixes from Vercel CLI stdin writes.
- `npm run test:billing`: passed, `23/23`.
- `npm run verify`: passed.
- Deployed production deployment `dpl_HZKzo5XwakgyBj1KGBdpNS1HbK1R`.
- Stable alias `https://fawxzzy-fitness-local.vercel.app` points at `dpl_HZKzo5XwakgyBj1KGBdpNS1HbK1R`.
- Redacted production env readback showed cleaned live billing values with expected live prefixes and lengths.
- Created live Checkout Session `cs_live_a1EQzcOj0aivMIdcA3kF04VXa2WB9AgxFRqFtgqCCsUVrOLTxSsAxPLHIZ` in subscription mode and immediately expired it unpaid.
- Stripe event `evt_1TqmOH1n5lBbRYoVW3er3wW4` reached `pending_webhooks=0`.
- Vercel logs showed signed live webhook delivery: `POST /api/billing/webhook/stripe` returned `200` on `fawxzzy-fitness-local.vercel.app` at `2026-07-07 23:43:18 EDT`.
- No live payment was completed and no real customer was charged.

Remaining:

- App-started live Customer Portal return behavior still needs proof from a bounded live paid customer.
- Deployment plus Stripe-delivered failed-payment proof still need closure after the source handler update.
- Final real-money smoke still requires explicit operator approval.
- Business/legal/support/deletion/geography decisions remain launch blockers.

## Read-Only Vercel Recheck

Date: `2026-07-08`

Scope: read-only Vercel CLI metadata check. No env values were pulled or printed. No deploy was triggered.

Findings:

- Stable production alias `fawxzzy-fitness-local.vercel.app` points at deployment `dpl_2rrQPh4hjDsG1eat8vvtQdvQxnhD`.
- That deployment was created at `2026-07-07T21:23:46.046Z`.
- Vercel production env metadata shows `STRIPE_PRO_STANDARD_PRICE_ID` updated at `2026-07-08T02:32:28.575Z`.
- Vercel production env metadata shows `STRIPE_PRO_ACTIVE_PRICE_MODE` updated at `2026-07-08T02:32:32.263Z`.
- Vercel production env metadata shows `STRIPE_SECRET_KEY` updated at `2026-07-08T02:52:27.741Z`.
- Vercel production env metadata shows `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` updated at `2026-07-08T02:53:48.936Z`.
- Vercel production env metadata shows `STRIPE_PUBLISHABLE_KEY` updated at `2026-07-08T02:53:53.392Z`.
- Vercel production env metadata shows `STRIPE_WEBHOOK_SECRET` updated at `2026-07-08T02:57:05.527Z`.
- Therefore the current aliased production deployment predates the latest recurring Pro, live key, and live webhook production env updates.

Result:

- Redeploy-after-env is now closed by `dpl_HZKzo5XwakgyBj1KGBdpNS1HbK1R`.
- No-charge live webhook smoke is now closed.
- Do not run final paid live smoke yet.
- Next operator action is final whole-app launch smoke while public checkout remains disabled.

## 2026-07-08 Follow-Up Readiness Recheck

Scope: read-only Vercel metadata check plus safe local owner-lane verification. No env values were pulled or printed. No live charge was created. No Stripe, Vercel, ATLAS root, Mazer, Supabase, or secret state was mutated by this recheck.

Operator decision:

- The operator explicitly chose to leave the currently installed live server key in place.
- This receipt treats key rotation as intentionally deferred by operator risk acceptance, not as a security best-practice closure.
- If the operator later changes that decision, the correct action is still to rotate the exposed live key, reinstall the replacement in Vercel production, redeploy, and revoke or expire the old key.

Current Vercel findings:

- Stable production alias `fawxzzy-fitness-local.vercel.app` points at deployment `dpl_HZKzo5XwakgyBj1KGBdpNS1HbK1R`.
- Deployment `dpl_HZKzo5XwakgyBj1KGBdpNS1HbK1R` was created at `2026-07-08T03:39:57.773Z`.
- Vercel production env metadata shows `STRIPE_SECRET_KEY` updated at `2026-07-08T03:39:00.353Z`.
- Vercel production env metadata shows `STRIPE_PRO_STANDARD_PRICE_ID` updated at `2026-07-08T03:36:27.051Z`.
- Vercel production env metadata shows `STRIPE_PRO_ACTIVE_PRICE_MODE` updated at `2026-07-08T03:36:30.293Z`.
- Therefore the stable production alias is on a post-live-env-update deployment for the currently observed Stripe production env metadata.

Safe verification run:

```text
npm run test:billing
npm run typecheck
npm run qa:pro-tier-gating
```

Results:

- `npm run test:billing`: pass, `23/23`.
- `npm run typecheck`: pass.
- `npm run qa:pro-tier-gating`: pass.
- QA gating account: `atlas-fitness-tier-qa@fawxzzy.test`.
- QA base URL: `http://127.0.0.1:3002`.
- Free gate verified: `3` visible routines and `14` visible saved workout plans.
- Pro gate verified: `5` routines and `16` saved workout plans visible after Pro entitlement fixture.

Result:

- Redeploy-after-env remains closed for the currently observed production env metadata.
- Server-key rotation is intentionally deferred by operator risk acceptance.
- Final paid live smoke remains blocked until explicit operator approval for a bounded real-money test.
- Business/legal/support/refund/geography/deletion decisions remain launch blockers.

## Live Expired-Session Webhook Proof Only

Date: `2026-07-08`

Result: PASS for expired-session event delivery only.

Read-only Stripe API proof retrieved live event `evt_1Tqm4f1n5lBbRYoV2npIrzV0`:

- `livemode=true`
- `type=checkout.session.expired`
- Checkout Session mode `subscription`
- Checkout Session status `expired`
- Payment status `unpaid`
- `pending_webhooks=0`, meaning no pending delivery remained at readback time
- Customer: none
- Subscription: none
- Payment: none
- Live charge: none

Interpretation:

- Closed only: `Live expired-session webhook proof only`.
- Successful checkout, subscription creation, invoice paid handling, entitlement grant, Customer Portal access from app UI, cancel-at-period-end, failed payment handling, refund/support/deletion operations, and downgrade-equivalent proof are now accepted for MVP from later proof packets.
- Beta proof is intentionally deferred by operator MVP risk acceptance.
- Live paid production remains guarded until final paid smoke passes and public checkout is explicitly enabled.

Still open: final whole-app launch smoke and explicit public-checkout enablement. Legal/business/health-privacy items are operator-accepted MVP risk as of 2026-07-09. Beta proof is deferred by operator MVP risk acceptance. Final post-period downgrade wait is replaced for MVP by accepted sandbox/test-clock equivalent proof; recheck the actual live downgrade after 2026-08-09 as a later audit.

## 2026-07-09 Bounded Live Paid Smoke

Result: PASS for the explicitly approved bounded live paid subscription and Customer Portal cancellation path.

Completed:

- Live Checkout Session completed for `atlas-fitness-live-paid-smoke@fawxzzy.test`.
- Stripe customer: `cus_Uqsoov3SXetpJ3`.
- Stripe subscription: `sub_1TrBAy1n5lBbRYoVnmxAwmFx`.
- Stripe price: `price_1ToU8R1n5lBbRYoV3VmWk3n6`.
- Checkout session: `cs_live_a10u8ZHl7q2gQszAO07cqzGLMBrQAxPpVToGBPAaMcqH1G0aJ1r6F5za3m`.
- App showed active Pro subscription state after checkout.
- App-started Customer Portal opened for the live paid customer.
- Customer Portal cancel-at-period-end was completed.
- Stripe Portal showed service ends on `2026-08-09`.
- App showed `SUBSCRIPTION ENDS AUG 9`, `PLAN Pro active`, `BILLING $5/month`, `STATUS Cancels at period end`, and current access ending `2026-08-09`.

Proof finding and repair:

- The live paid smoke exposed duplicate `billing_purchases` rows for the same live subscription.
- Production Supabase was repaired with migration `20260709073000_billing_subscription_receipt_dedupe.sql`.
- Source webhook fulfillment was updated to canonicalize subscription receipts, merge richer event data, delete duplicate rows, and retry after uniqueness conflicts.
- Production deployment `dpl_ChzYfyQjfdagrpdYaev28LvQHert` was deployed and aliased to the stable production domains.
- Post-deploy readback showed:
  - `duplicate_groups = 0`
  - `subscription_unique_index = 1`
  - `qa_receipts = 1`
  - `qa_active_entitlements = 1`

Remaining:

- Recheck final downgrade truth after `2026-08-09`, unless an accepted equivalent proof replaces that wait.
- Do not enable public paid checkout until final `FF-QA-001` launch smoke is complete and explicit public-checkout enablement is approved.

## 2026-07-08 Failed-Payment Endpoint Event-List Enablement

Scope: Stripe Dashboard browser configuration and readback only. No live charge was created. No final paid smoke was attempted.

Completed:

- Live endpoint `we_1Tqldd1n5lBbRYoVkvltrp1J` was edited in Stripe Dashboard to add `invoice.payment_failed`.
- Live Dashboard readback shows `Listening to 7 events`.
- Live Dashboard readback shows all seven required events:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `customer.subscription.created`
  - `customer.subscription.deleted`
  - `customer.subscription.updated`
  - `invoice.paid`
  - `invoice.payment_failed`
- Sandbox endpoint `we_1ToTDX1z3plnI3SEl9Ko02a3` was edited in Stripe Dashboard to add `invoice.payment_failed`.
- Sandbox Dashboard readback shows `Listening to 7 events`.
- `npm run qa:stripe:webhook-readiness -- --mode test --json` passed with `missingEvents: []`.

Still open:

- Deploy the source-side failed-payment handler before claiming production failed-payment support.
- Prove a real Stripe-delivered failed-payment event reaches the deployed handler.
- Keep public paid checkout disabled until final smoke passes and explicit enablement is approved.

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

`FINAL QA / SOFT-LAUNCH CANDIDATE`.

The next move is not more sandbox proof. The next move is operator-owned live configuration and legal/business decision closure, followed by a bounded live-readiness smoke only after explicit approval.

## ATLAS / Mazer Boundary

- ATLAS root was not mutated by this Fitness owner-lane receipt.
- Mazer was not inspected or mutated.
- No ATLAS marker movement is claimed from this Fitness receipt.
- ATLAS may later preserve a read-only owner-lane receipt only if a separate ATLAS root packet requests that projection.

## Exact Next Action

Operator should complete the live/business/legal checklist above. After that, run a separate bounded Fitness live-configuration proof packet that verifies live product name, live webhook delivery, Vercel live key shapes, Customer Portal links/return behavior, and post-redeploy production smoke readiness without exposing secrets.
