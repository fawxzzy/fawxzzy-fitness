# FF-MON-001 Bounded Live Paid Smoke Runbook - 2026-07-08

Card: `FF-MON-001 - Monetization Readiness Gate`

## Status

This runbook is ready, but not executed.

Do not execute this runbook until the operator gives explicit action-time approval for a real live Stripe charge.

## Purpose

Prove that the production paid subscription lifecycle works with a real live Stripe customer before public paid launch.

This is not a sandbox test. This creates real Stripe objects and may create a real `$5.00` charge.

## Preconditions

Required before execution:

- Operator explicitly approves the real-money smoke at action time.
- Production app is on the intended deployment/domain.
- Live Stripe price is the intended `$5/month` recurring Pro price.
- Live webhook endpoint is enabled and points to the stable production alias.
- Live Customer Portal settings are enabled.
- Legal links are visible before checkout.
- Support inbox is visible in app/legal surfaces and Stripe Public details.
- A bounded test account is chosen.
- No public paid launch announcement is active.

## Hard Safety Rules

- Do not use Stripe test cards in live mode.
- Do not write full card numbers, CVC, or payment details into repo docs, chat, screenshots, or logs.
- Do not run this against a random user account.
- Stop immediately if the product, price, currency, billing interval, legal links, or account identity is wrong.
- Stop immediately if checkout appears to use the wrong Stripe account.
- Stop immediately if entitlement does not update from Stripe-backed proof.
- Do not mark paid launch `GO` from this smoke alone; beta and counsel/business blockers still apply.

## Test Account

Use one bounded account and record only non-sensitive identifiers:

```text
App account email:
Stripe customer id:
Stripe subscription id:
Stripe checkout session id:
Stripe invoice id:
Stripe event ids:
Vercel deployment:
Supabase entitlement row:
```

## Execution Steps

1. Open production app.
2. Log in as the bounded test account.
3. Open `Settings > Pro`.
4. Confirm the Pro surface shows:
   - `$5/month`
   - recurring/monthly wording
   - legal links
   - support path
   - correct Free vs Pro capacity-gate copy
5. Click the live checkout CTA.
6. Confirm hosted Stripe checkout shows:
   - Fawxzzy Fitness Pro Monthly
   - `$5.00`
   - monthly recurring subscription
   - correct business/brand
   - Terms and Privacy links
7. Complete payment only after all checkout details are correct.
8. Return to the app success URL.
9. Confirm app shows active Pro state.
10. Confirm database entitlement state is Stripe-backed and not manually granted.
11. Confirm Stripe Dashboard has:
    - live Customer
    - active Subscription
    - paid Invoice
    - successful PaymentIntent/Charge if applicable
12. Confirm webhook evidence:
    - `checkout.session.completed`
    - `customer.subscription.created` or `customer.subscription.updated`
    - `invoice.paid`
    - live endpoint is configured to receive `invoice.payment_failed`
    - app webhook receipt row if stored
13. Open Manage Billing from the app.
14. Confirm Stripe Customer Portal opens for the correct customer.
15. Confirm Customer Portal shows:
    - current subscription
    - payment method
    - invoice history
    - cancellation option
    - Terms and Privacy links
16. Cancel at end of billing period from the portal.
17. Return to app.
18. Confirm app reflects cancellation-pending state while preserving Pro access through the paid period.
19. Confirm Stripe subscription has `cancel_at_period_end=true`.
20. Record evidence in the closeout receipt.

## Optional Refund Handling

Refund is optional and must be an explicit operator decision after the smoke.

If refunded:

- process through Stripe Dashboard
- record refund id
- verify app entitlement behavior remains correct for refunded/cancelled state

If not refunded:

- record that the operator intentionally kept the live smoke charge
- confirm subscription remains scheduled to cancel at period end

## Failed Payment Proof

Do not try to manufacture a live failed payment with unsafe payment details.

Acceptable failed-payment closure options:

1. Sandbox proof for failed-payment/dunning UI plus live monitoring readiness.
2. Stripe-supported live invoice/payment failure simulation if available without creating deceptive or unsafe payment activity.
3. Counsel/operator acceptance that failed-payment proof remains a launch risk until the first real failed invoice occurs, with monitoring and support response documented.

App-side prerequisite:

- The app webhook route must process `invoice.payment_failed` through the subscription-status policy.
- The updated handler must be deployed before production failed-payment support is claimed.
- The Stripe endpoint must be verified to send `invoice.payment_failed` after deployment and before any final paid smoke is called complete.
- Use `npm run qa:stripe:webhook-readiness -- --json` for the read-only endpoint event-list check. The command must pass for the target Stripe mode before final paid smoke closeout.

The final launch receipt must say which option was used.

## Evidence Required

Record:

- app route tested
- account email or anonymized account id
- Stripe customer id
- Stripe subscription id
- Stripe checkout session id
- Stripe invoice id
- relevant event ids
- webhook delivery result
- app entitlement readback
- Customer Portal readback
- cancellation state readback
- final billing state

Do not record:

- full card number
- CVC
- private billing address details
- raw secret keys
- webhook signing secret

## Pass Criteria

Pass only if:

- live checkout creates a real subscription for the correct product/price
- entitlement is granted from Stripe-backed proof
- app UI reflects active Pro correctly
- Customer Portal opens from app for the correct customer
- cancellation at period end is available and works
- app preserves access through paid period after cancellation
- webhook receipts are present and successful
- no manual DB edits were needed to make the app truthful

## Fail Criteria

Fail if:

- checkout uses wrong product, price, currency, interval, or Stripe account
- legal links are missing
- user pays but app does not grant Pro
- app grants Pro without Stripe proof
- Customer Portal cannot open from app
- cancellation state is unclear or wrong
- webhook delivery fails
- entitlement state requires manual correction
- any payment/support/legal surface looks misleading

## Closeout Rule

After execution, append a dated receipt to:

- `docs/ops/FF-MON-001-BILLING-APP-UI-PROOF-PACKET-2026-07-03.md`
- `docs/ops/FF-QA-001-MONETIZATION-LAUNCH-SMOKE-MATRIX-2026-07-01.md`

Then sync the Discord roadmap card.

Until the receipt exists, the runbook is readiness only, not proof.
