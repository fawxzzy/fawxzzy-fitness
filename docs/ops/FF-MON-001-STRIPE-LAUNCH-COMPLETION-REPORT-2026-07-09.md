# FF-MON-001 - Stripe Launch Completion Report

Status: FINAL QA / SOFT-LAUNCH CANDIDATE

This report captures where Stripe launch work really stands. The billing implementation is accepted for MVP; the remaining pre-enable risk is final whole-app smoke and explicit public-checkout enablement.

Live paid production remains blocked until final launch smoke passes and public checkout is explicitly enabled.

## Current Truth

- Product: Fawxzzy Fitness.
- Operator posture: no formal Fawxzzy or Fawxzzy Fitness entity has been confirmed.
- Interim public operator identity: Zachariah John Harold Redfield operating Fawxzzy Fitness.
- Paid model: $5/month recurring Pro subscription.
- Current Pro value: capacity-only MVP gates.
- Free tier: up to 3 routines.
- Free tier: up to 14 saved workout plans.
- Pro tier: unlimited routines and unlimited saved workout plans.
- Payment surface: Stripe Checkout in subscription mode.
- Billing management: Stripe Customer Portal.
- Sensitive support: `fawxzzy@gmail.com`.
- Public paid checkout must remain guarded until final launch approval.

## What Is Closed

- App-side Stripe subscription implementation exists.
- Sandbox Checkout and Customer Portal proof exists.
- Live Stripe public support email proof exists.
- Live Stripe Customer Portal settings proof exists.
- Live webhook destination proof exists for the stable production alias.
- Production environment variables for live Stripe billing were installed and redeployed.
- Live no-charge expired-session webhook proof exists.
- Live no-charge subscription webhook and entitlement proof exists.
- Live no-charge Customer Portal route proof exists.
- Sandbox no-money test-clock failed-payment and downgrade proof exists.
- Sandbox no-money cancel-at-period-end source proof exists.
- `invoice.payment_failed` handling exists in source-side policy and proof.
- Deployed Stripe-delivered sandbox failed-payment processing proof exists for the current-period failure path.
- Temporary test Stripe/Supabase data from proof runs was cleaned up.
- Source now supports a separate test/sandbox Stripe webhook signing secret for no-money deployed proof without weakening the live webhook secret path.
- Vercel Production now has the separate sandbox/test webhook signing secret configured.
- Deployed Stripe-delivered sandbox no-money free-trial proof exists for subscription creation and Pro entitlement grant.
- Live bounded paid checkout proof exists for one explicitly approved `$5/month` subscription.
- Live paid Customer Portal cancel-at-period-end proof exists for that paid customer.
- Live app entitlement proof exists for that paid customer, with access preserved through the current paid period after cancellation.
- Live subscription receipt dedupe was repaired with a production database unique-index guard and deployed webhook merge/delete handling.
- Post-deploy production checks showed no duplicate subscription receipts for the live QA subscription.

## What Is Not Closed

- Final public paid launch approval.
- Final `FF-QA-001` paid launch smoke.

## Proof Ladder

The Stripe launch gate closes only when all three layers are complete.

### 1. Sandbox / No-Money Proof

Required proof:

- Successful sandbox subscription checkout creates correlated Stripe objects.
- App entitlement reflects the Stripe-backed subscription state.
- App-started Customer Portal route works.
- Customer Portal cancel-at-period-end keeps Pro through the paid period.
- Failed-payment simulation produces `invoice.payment_failed`.
- App downgrades/revokes Pro only when the billing window has expired or the policy requires it.

Current state:

- Closed for local/source behavior.
- Closed using sandbox/test clocks and no real charges.
- Closed for deployed Stripe-delivered subscription creation and entitlement grant after separate sandbox/test webhook secret configuration.
- Does not prove final live customer behavior.

### 2. Live / No-Charge Production Proof

Required proof:

- Stable production alias receives signed live Stripe webhooks.
- Live environment is using live Stripe credentials and the live webhook secret.
- Production deployment was rebuilt after final environment changes.
- No-charge live events prove endpoint reachability without creating a real charge.

Current state:

- Closed for no-charge webhook reachability, no-charge subscription entitlement handling, and app-started no-charge Customer Portal route proof.
- Does not prove successful live payment, live paid customer portal behavior, or live paid cancellation.

### 3. Bounded Live Paid Smoke

Required proof:

- One explicitly approved real $5/month live subscription attempt.
- Checkout Session, Customer, Subscription, first invoice, payment success, and webhook events are correlated.
- App grants Pro entitlement from Stripe-backed state.
- App-started Customer Portal opens for that paid customer.
- Customer Portal cancellation at period end works.
- App preserves access through the paid period.
- App reflects cancellation/downgrade truth after the billing period or cancellation event path requires it.

Current state:

- Closed for one explicitly approved live paid smoke account:
  - account: `atlas-fitness-live-paid-smoke@fawxzzy.test`
  - customer: `cus_Uqsoov3SXetpJ3`
  - subscription: `sub_1TrBAy1n5lBbRYoVnmxAwmFx`
  - price: `price_1ToU8R1n5lBbRYoV3VmWk3n6`
  - checkout session: `cs_live_a10u8ZHl7q2gQszAO07cqzGLMBrQAxPpVToGBPAaMcqH1G0aJ1r6F5za3m`
- Closed for live paid Customer Portal cancel-at-period-end: Stripe Portal showed service ends on `2026-08-09`, and the app shows `SUBSCRIPTION ENDS AUG 9` / `Cancels at period end`.
- Closed for live paid app receipt and entitlement truth after receipt dedupe repair:
  - one canonical `billing_purchases` row for the live subscription
  - one active `pro` entitlement through `2026-08-09 06:11:09+00`
  - `duplicate_groups = 0`
  - `subscription_unique_index = 1`
- Still open for final public launch: final whole-app smoke and explicit public-checkout enablement.

## Stripe Configuration Requirements Before Live Paid Launch

- Live product name and description must be customer-facing and recognizable.
- Live price must remain the intended `$5/month` recurring price.
- Checkout and Customer Portal must show correct support and legal links.
- Customer Portal should keep the launch configuration narrow:
  - payment method updates
  - invoice history
  - subscription cancellation
  - cancel at period end
  - no plan switching unless intentionally added later
- Production webhook endpoint must include:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- Production deployment must be rebuilt after Stripe/Vercel environment changes.
- Live/test Stripe modes must remain separated.
- If a production deployment is also used for sandbox/no-money proof, configure the sandbox endpoint signing secret separately as `STRIPE_TEST_WEBHOOK_SECRET` or `STRIPE_SANDBOX_WEBHOOK_SECRET`; do not replace the live `STRIPE_WEBHOOK_SECRET`.

## Legal / Privacy Launch Constraints

Public paid launch is no longer blocked by legal/business posture for MVP because the operator accepted MVP legal/business risk. Counsel review remains recommended before broader public scale.

Accepted MVP decisions:

- Legal identity: Zachariah John Harold Redfield operating Fawxzzy Fitness for MVP.
- Launch geography: controlled MVP launch; do not claim enforceable geography restrictions unless implemented.
- Washington/MHMDA and FTC HBNR: deferred by operator risk acceptance; do not market as medical/clinical care.
- Minors: paid Pro intended for 18+ or age of majority.
- Refunds: no guaranteed partial-month refund unless required by law or stated at checkout; duplicate/accidental charges reviewed by support.
- Cancellation: Customer Portal self-serve cancel-at-period-end.
- Deletion: account deletion/uninstall does not cancel Stripe subscription; active billing must be handled before destructive deletion.

## Current Launch Decision

`FF-MON-001` remains:

```txt
Final QA / Soft-Launch Candidate
```

`FF-QA-001` remains:

```txt
In Progress / Guarded
```

The correct next order is:

1. Keep public paid checkout guarded.
2. Recheck deployed live Stripe configuration after any final env or dashboard changes.
3. Run final `FF-QA-001` launch smoke.
4. Enable public checkout only after explicit approval.

## 2026-07-09 Live Paid Smoke And Receipt Dedupe Closure

Result: PASS for the bounded live paid subscription lifecycle that was explicitly approved by the operator.

Completed:

- One live `$5/month` subscription was created through Stripe Checkout for `atlas-fitness-live-paid-smoke@fawxzzy.test`.
- App Pro state reflected the live Stripe-backed subscription.
- App-started Stripe Customer Portal opened for the live paid customer.
- Customer Portal cancellation at period end was completed.
- App state after cancellation correctly preserved Pro access through the paid period and showed `Cancels at period end`.
- A webhook race produced duplicate purchase receipts for the same live subscription; this was treated as a launch-blocking proof finding and repaired before closeout.
- Production Supabase was deduped and guarded with unique partial index `billing_purchases_subscription_uq` on `stripe_subscription_id` for `purchase_kind = 'pro_subscription'`.
- Webhook fulfillment now canonicalizes subscription receipts, merges richer event data, deletes duplicate rows, and retries after uniqueness conflicts.
- Production deploy `dpl_ChzYfyQjfdagrpdYaev28LvQHert` was completed and aliased to the stable production domains.
- Post-deploy Vercel error log checks returned no billing errors in the checked window.
- Post-deploy live app review showed:
  - `SUBSCRIPTION ENDS AUG 9`
  - `PLAN Pro active`
  - `BILLING $5/month`
  - `STATUS Cancels at period end`
  - `PURCHASE DATE Jul 9, 2026, 2:11 AM`
  - `CURRENT ACCESS ENDS Aug 9, 2026, 2:11 AM`

Verification:

- `npm run typecheck`: passed after the webhook dedupe patch.
- Production DB readback:
  - `duplicate_groups = 0`
  - `subscription_unique_index = 1`
  - `qa_receipts = 1`
  - `qa_active_entitlements = 1`
- `npm run qa:stripe:lifecycle-proof -- --apply --cleanup`: passed in sandbox/test mode with no real charge, proving cancel-at-period-end and failed-payment downgrade behavior with cleanup.
- `npm run qa:stripe:webhook-readiness -- --json`: passed for the sandbox endpoint with `missingEvents: []`.

Still not implied by this closure:

- Public paid launch approval.
- Final whole-app `FF-QA-001` smoke.
- Automatic proof that the live paid QA account downgrades after `2026-08-09`; that is replaced for MVP by accepted equivalent proof, but should still be rechecked later.

## Source Links

- Stripe go-live checklist: `https://docs.stripe.com/get-started/checklist/go-live`
- Stripe webhooks: `https://docs.stripe.com/webhooks`
- Stripe Customer Portal: `https://docs.stripe.com/customer-management`
- Stripe Customer Portal integration: `https://docs.stripe.com/customer-management/integrate-customer-portal`
- Stripe Billing testing and test clocks: `https://docs.stripe.com/billing/testing`
- Stripe subscriptions: `https://docs.stripe.com/billing/subscriptions/build-subscriptions`
- Stripe API keys and live/test mode: `https://docs.stripe.com/keys`
- ROSCA recurring charge rule: `https://www.law.cornell.edu/uscode/text/15/8403`
- Washington MHMDA statute: `https://app.leg.wa.gov/RCW/default.aspx?cite=19.373&full=true`
- FTC Health Breach Notification Rule: `https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule`
- FTC COPPA FAQ: `https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions`
