# FF-MON-001 Billing App-UI Proof Packet

## Current Launch Status

Live paid production is NO-GO.

Reason:

- Legal copy is improved but counsel-open.
- Pro offer is aligned to capacity-only gates.
- Stripe sandbox checkout and Customer Portal proof are complete against a disposable proof account.
- Interim private billing/privacy/deletion support path copy is now present, but the final monitored intake mechanism is not business/legal closed.
- Fresh Vercel production deployment and stable alias routing are verified; sandbox signed Stripe event delivery and no-charge live signed Stripe event delivery are proof-closed. Live env values are installed and production has been redeployed.

No production paid launch may proceed until the billing proof packet, support path, counsel review, and final smoke matrix are complete.

Date: 2026-07-03
Status: sandbox checkout completion, Customer Portal cancellation, sandbox current-deploy signed webhook proof, live env installation, Stripe public legal URL persistence, production redeploy, and no-charge live webhook smoke captured; live paid launch remains blocked by business/legal/support decisions, live Customer Portal return proof, and explicitly approved paid smoke
Scope: recurring Pro subscription proof from the user-facing app UI

## 2026-07-07 Launch Call

Do not launch live paid production yet.

Current product truth:

- Free includes up to `3` routines.
- Free includes up to `14` saved workout plans.
- Pro unlocks unlimited routines and unlimited saved workout plans.
- Pro is `$5/month`, recurring, managed through Stripe Checkout and Stripe Customer Portal.

This is a capacity tier. Do not market the current Pro offer as advanced progression, progression receipts, review tools, coaching, AI coaching, or medical-grade guidance unless those gates are separately implemented and approved.

Remaining live-paid blockers:

- final monitored private support intake mechanism for billing/privacy/deletion/account requests
- final legal entity, launch geography, refund posture, governing law, venue, and dispute language
- final paid live-mode Stripe/Vercel configuration proof after operator approval
- app-started billing portal cancellation proof for the final customer-facing state
- failed-payment/canceled/incomplete UI proof
- production live Stripe product, `$5/month` price, webhook, signing secret, server key, success URL, and cancel URL verification
- app-started live Customer Portal return proof once a bounded live paid customer exists
- confirmation that the production webhook URL belongs to the keep/main Vercel project and no stale preview/duplicate project webhook URLs remain active

## 2026-07-07 Stable Webhook Freshness Recheck

Fresh deployment proof:

- `vercel --prod --yes` deployed the current local code to production.
- Fresh deployment id: `dpl_2rrQPh4hjDsG1eat8vvtQdvQxnhD`.
- Fresh deployment URL: `https://fawxzzy-fitness-icuthxkmo-fawxzzy.vercel.app`.
- Stable alias now resolves to that fresh deployment: `https://fawxzzy-fitness-local.vercel.app`.
- `vercel inspect fawxzzy-fitness-local.vercel.app` confirms the stable alias points at `dpl_2rrQPh4hjDsG1eat8vvtQdvQxnhD`, created `2026-07-07`.
- Unsigned webhook probe to `https://fawxzzy-fitness-local.vercel.app/api/billing/webhook/stripe` returned fail-closed `400` with `BILLING_WEBHOOK_SIGNATURE_MISSING`, proving the fresh route is live and still signature-gated.
- Vercel request id for the unsigned probe: `07423547-5f8d-4995-91b3-344d5af518a4`.

Legal route proof on the same stable alias:

- `https://fawxzzy-fitness-local.vercel.app/privacy?returnTo=%2Fsettings%3Fsection%3Dpro` returns `200` without auth cookies.
- `https://fawxzzy-fitness-local.vercel.app/terms?returnTo=%2Fsettings%3Fsection%3Dpro` returns `200` without auth cookies.
- Both routes include the Discord invite URL, private-support path copy, and sensitive-info warning in the rendered payload.

Database truth after current-code replay:

- Disposable proof account: `atlas-fitness-checkout-proof-20260707@fawxzzy.test`.
- User id: `85ee6eac-7d80-4516-bc08-4de9693d3c1d`.
- Customer id: `cus_UqLJNDQxtqpVa3`.
- Subscription id: `sub_1Tqeg51z3plnI3SEnpeUF91D`.
- Purchase id: `4607df5e-53bd-4d2f-ba33-873be00c26df`.
- `billing_purchases.purchase_kind`: `pro_subscription`.
- `billing_purchases.status`: `completed`.
- `billing_purchases.amount_total`: `500`.
- `billing_purchases.currency`: `usd`.
- `billing_purchases.billing_interval`: `month`.
- `user_entitlements.entitlement_key`: `pro`.
- `user_entitlements.status`: `active`.
- `user_entitlements.source_subscription_id`: `sub_1Tqeg51z3plnI3SEnpeUF91D`.

Current-deploy signed webhook freshness proof:

- Stripe Dashboard resend of `evt_1Tqeg71z3plnI3SEbX5Ax7uv` to endpoint `we_1ToTDX1z3plnI3SEl9Ko02a3` succeeded.
- Stripe Dashboard showed `200 OK`, `Delivered`, `Retried manually`, `Jul 8, 2026, 1:36:20 AM` for `https://fawxzzy-fitness-local.vercel.app/api/billing/webhook/stripe`.
- Vercel production logs for `dpl_2rrQPh4hjDsG1eat8vvtQdvQxnhD` showed `POST /api/billing/webhook/stripe` on `fawxzzy-fitness-local.vercel.app` with `responseStatusCode=200`.
- Vercel log id: `lm8vk-1783474575848-cb4b8ef3c5a5`.
- Supabase `billing_purchases.raw_event_id` now stores the real Stripe event id `evt_1Tqeg71z3plnI3SEbX5Ax7uv`, not a local replay id.
- Supabase `billing_purchases.purchase_kind` remains `pro_subscription`.
- Supabase `billing_purchases.amount_total` remains `500`.
- Supabase `billing_purchases.currency` remains `usd`.
- Supabase `billing_purchases.billing_interval` remains `month`.
- Supabase `user_entitlements.entitlement_key` remains `pro`.
- Supabase `user_entitlements.status` remains `active`.
- Supabase `user_entitlements.source_subscription_id` remains `sub_1Tqeg51z3plnI3SEnpeUF91D`.

## Purpose

`FF-MON-001` is the truthful umbrella gate for monetization readiness.

The code and sandbox configuration are now materially in place. The remaining work is no longer implementation-first. It is proof-first:

- customer-facing Pro UI truth
- Stripe-hosted checkout truth
- app-started billing-management truth
- cancel-at-period-end truth
- failure-state truth

This packet is the canonical receipt target for that pass.

## Preconditions

- Stripe remains in sandbox / test mode only
- use Stripe test payment details only
- use a bounded QA account, not a personal production account
- do not deploy to production until this packet is executed and reviewed

## Review Surfaces

Visual trust review should happen before the live billing proof sequence.

- `/settings?section=pro`
- `/privacy?returnTo=%2Fsettings%3Fsection%3Dpro`
- `/terms?returnTo=%2Fsettings%3Fsection%3Dpro`
- `/install?installContext=desktop`

Additional install lanes required by launch smoke:

- `/install?installContext=android-chrome`
- `/install?installContext=ios-safari`
- `/install?installContext=desktop-windows-edge`
- `/install?installContext=desktop-windows-chrome`
- `/install?installContext=desktop-macos-safari`
- `/install?installContext=desktop-macos-chrome`

## Customer-Facing Pro Screen Contract

Approve `/settings?section=pro` only if it clearly answers:

- what plan am I on
- what does Pro cost
- is this recurring
- when does it renew or end
- how do I manage or cancel
- where are Terms and Privacy
- who processes payment

The normal customer UI must not expose implementation language such as:

- configured
- completed
- checkout configured
- billing truth
- sandbox proof
- entitlement sync

## Billing Proof Sequence

### Free to paid success path

- [ ] Free QA account opens `/settings?section=pro`
- [ ] UI shows `Free`
- [ ] UI shows `$5/month`
- [ ] UI says the subscription renews monthly until cancelled
- [ ] Terms and Privacy links are present before checkout
- [ ] `Upgrade to Pro` opens Stripe hosted checkout in sandbox mode
- [ ] Checkout shows correct product, recurring monthly price, currency, and amount
- [ ] Test payment succeeds with Stripe test details only
- [ ] Success return lands back in app cleanly
- [ ] App shows `Pro active`
- [ ] App still shows Stripe as payment processor

### Billing-management and cancel path

- [ ] `Manage Billing` opens Stripe billing or customer portal from the app
- [ ] User can schedule cancellation at period end from the app-started billing flow
- [ ] Return to app shows `Pro active until <period_end>` truth
- [ ] App keeps Pro access while `cancel_at_period_end=true`
- [ ] App message makes clear access continues through the already-paid period

### Failure-state proof

- [ ] `past_due` UI reviewed
- [ ] `unpaid` UI reviewed
- [ ] `canceled` UI reviewed
- [ ] incomplete or abandoned checkout path reviewed

Recommended customer wording for payment trouble:

```text
Payment needs attention

We could not verify your latest subscription payment.
Update billing in Stripe to keep Pro access.
```

Primary button:

```text
Manage Billing
```

## Human Stripe Sandbox Billing Proof Packet

This is the next execution packet. Run it from a bounded QA account only, in Stripe sandbox/test mode only, with Stripe test payment details only.

### 1. Free account pre-check

- [ ] Open `/settings?section=pro`.
- [ ] Confirm current plan is `Free`.
- [ ] Confirm Free limits show `3 routines` and `14 saved workout plans`.
- [ ] Confirm Pro shows unlimited routines, unlimited saved workout plans, `$5/month`, and renews monthly until cancelled.
- [ ] Confirm Terms and Privacy links are visible before checkout.
- [ ] Confirm CTA says `Upgrade to Pro`.
- [ ] Confirm no stale Pro feature claims appear:
  - automatic progression
  - progression receipts
  - review tools
  - lifetime Pro

### 2. Checkout start

- [ ] Click `Upgrade to Pro`.
- [ ] Confirm Stripe Checkout opens in test/sandbox mode.
- [ ] Confirm product is the intended Pro monthly subscription.
- [ ] Confirm amount is `$5.00`.
- [ ] Confirm billing interval is monthly / recurring.
- [ ] Capture checkout session id, customer id, price id, and QA account id/email.

### 3. Successful payment

- [ ] Complete checkout manually with Stripe test payment details only.
- [ ] Confirm success return lands back in the app.
- [ ] Confirm app shows `Pro active`.
- [ ] Confirm entitlement is based on verified Stripe subscription truth, not only redirect truth.
- [ ] Confirm unlimited routine and saved-plan gates unlock.
- [ ] Capture subscription id, invoice/payment id, webhook event ids, and app state screenshot/note.

### 4. Manage Billing proof

- [ ] From `/settings?section=pro`, click `Manage Billing`.
- [ ] Confirm Stripe Customer Portal opens from the app UI.
- [ ] Confirm the active subscription is visible.
- [ ] Confirm billing-management/cancellation path is available.
- [ ] Return to app cleanly.

### 5. Cancel-at-period-end proof

- [ ] From the app-started Stripe billing portal, schedule cancellation at period end.
- [ ] Return to app.
- [ ] Confirm app shows equivalent truth:
  - `Pro active until <period_end>`
  - `Your subscription is scheduled to cancel`
  - `You will keep Pro access through the period you already paid for`
- [ ] Confirm app does not revoke Pro immediately.
- [ ] Capture subscription id, `cancel_at_period_end` / cancel date evidence, `current_period_end`, and `customer.subscription.updated` event if available.

### 6. Final canceled / downgrade proof

- [ ] Use Stripe test tooling or test clocks where practical.
- [ ] Advance or simulate through cancellation end.
- [ ] Confirm subscription becomes canceled.
- [ ] Confirm app removes Pro capacity after entitlement ends.
- [ ] Confirm app does not keep stale `Pro active`.
- [ ] Capture final subscription status, `customer.subscription.deleted` event if available, and app downgraded state.

### 7. Failure-state proof

- [ ] `past_due`
- [ ] `unpaid`
- [ ] `canceled`
- [ ] `incomplete`
- [ ] abandoned checkout / no entitlement granted

## Stripe Object Receipts

Record all applicable sandbox ids used in the proof:

- customer id
- subscription id
- price id
- checkout session id
- invoice id if applicable

Webhook receipts to capture if available:

- `checkout.session.completed`
- `customer.subscription.updated` when `cancel_at_period_end` becomes true
- `customer.subscription.deleted` when cancellation actually takes effect

## Evidence Format

Each executed step should end in a receipt line:

```text
[PASS|FAIL] lane / step | account | route | device | expected | actual | evidence
```

Minimum evidence per step:

- route checked
- QA account used
- expected outcome
- actual outcome
- screenshot, Stripe id, or operator note

Use this block for structured proof entries when a terse receipt line is not enough:

```md
## Proof: <lane name>

Date:
Operator:
QA account:
Route:
Stripe mode:
Expected:
Actual:
Stripe checkout session:
Stripe customer:
Stripe subscription:
Stripe price:
Stripe invoice/payment:
Webhook event ids:
Screenshot/receipt:
Result:
Notes:
```

Use this block for any launch-blocking issue:

```md
## Blocker

Date:
Route:
Action:
Expected:
Actual:
Risk:
Launch impact:
Owner:
Status:
```

## Hard Fail Conditions

Mark the packet failed and keep production blocked if any of these happen:

- Stripe opens in live mode.
- Checkout shows the wrong amount.
- Checkout shows one-time/lifetime instead of monthly recurring.
- Legal links are missing before purchase.
- App grants Pro only from redirect without verified Stripe subscription truth.
- Manage Billing is missing for active Pro users.
- User cannot cancel from the app-started billing flow.
- Cancel-at-period-end immediately revokes access.
- App fails to show paid-period access after scheduled cancellation.
- Failed-payment states show raw, confusing, or internal-only text.
- Canceled or unpaid users retain unlimited Pro capacity incorrectly.

## Known Open Blockers Outside This Packet

These remain real launch blockers even if the billing UI proof passes:

- private support path for billing, deletion, privacy, and health-related requests
- governing law / venue / dispute language finalized by counsel
- refund language finalized for launch geography
- final business/legal entity chosen
- launch geography chosen
- account deletion versus active Stripe subscription procedure written
- Washington consumer-health-data review if launch includes Washington users
- FTC health-breach classification reviewed if workout/progression data triggers exposure
- final beta proof in `FF-BETA-001`
- full launch smoke execution in `FF-QA-001`
- live Stripe product, price, webhook, signing secret, Customer Portal, success URL, and cancel URL verification
- production webhook/domain verification against the keep/main Vercel project
- stale duplicate/preview webhook URLs removed from Stripe

## Current Readiness Call

As of `2026-07-03`:

- legal copy is materially improved but still counsel-open
- Pro screen is ready for visual trust review
- Stripe recurring subscription implementation is ready for app-UI proof
- paid launch remains blocked until this proof packet is executed and the remaining legal/support blockers are closed

As of `2026-07-07`:

- app-side recurring Pro proof is materially stronger than the original packet
- the Pro screen and gating proof are capacity-only and no longer claim progression-only paid value
- the live paid launch call remains `no-go` until the remaining blocker list above is closed with evidence

## Execution Receipts

### Verified app-started free-state lane

```text
[PASS] FF-MON-001 / free-proof-account-signup | disposable codex sandbox proof account | /signup -> /today | desktop automation | account can be created from the public app UI | account created and landed on /today | new auth user + authenticated route load
[PASS] FF-MON-001 / pro-screen-free-state | disposable codex sandbox proof account | /settings?section=pro | desktop automation | UI shows Free, $5/month, recurring language, legal links | UI showed Free, $5/month, monthly recurring copy, Privacy, Terms, and Stripe processor note | live app DOM text
[PASS] FF-MON-001 / hosted-checkout-open | disposable codex sandbox proof account | /settings?section=pro -> Stripe Checkout | desktop automation | Upgrade to Pro opens hosted Stripe sandbox checkout with correct monthly price | Stripe hosted checkout opened in Sandbox with Fawxzzy Fitness Pro Monthly (sandbox), $5.00 per month, matching proof-account email, and checkout session ids | cs_test_a1mttLbwPHObU2y7oTAMGpnCUhJxL8c2kwpPy7zKV2VFmsiTxUpQc6xxxa ; cs_test_a1PeMjWWI63E4yxJkJ8f0tm8vtr4tBVpFFOTjRmcOZosWyTX1Rnn1dRkIa ; cs_test_a1kZCKpRrNu28FcpUJYL51n48wn7CXcqdqt9oraCXRnrzIIsvU99DLI9sM ; cs_test_a1Kb3MTSPY9PdDbT8HFe5d0D9mzshRdeboqhRRI85d07gkh5wA20eLPZp5
[PASS] FF-MON-001 / free-proof-account-db-truth | disposable codex sandbox proof account | billing tables | service-role verification | free account should have no entitlement after checkout is only opened | no user_entitlements rows; Stripe customer mapping exists; latest checkout receipt is pending until payment completes | user_id f186d500-f5fd-4131-8e7d-c42558b8e652 ; customer cus_UombTCklMzvqPC ; price price_1ToVq11z3plnI3SE2fXGZOW5
```

### Verified existing paid-state and portal lane

```text
[PASS] FF-MON-001 / bounded-billing-qa-state | atlas-fitness-billing-qa@fawxzzy.test | /settings?section=pro | desktop automation | paid QA account should show active monthly Pro with cancelled renewal truth | app showed Pro active, $5/month, Cancels at period end, purchase date Jul 1 2026, access end Aug 1 2026 | live app DOM text + billing rows
[PASS] FF-MON-001 / manage-billing-portal-open | atlas-fitness-billing-qa@fawxzzy.test | /settings?section=pro -> Stripe billing portal | desktop automation | Manage Billing opens Stripe sandbox portal with current subscription truth | portal opened at billing.stripe.com and showed Fawxzzy Fitness Pro Monthly (sandbox), $5.00/month, Cancels Aug 1, Visa •••• 4242, invoice history | customer cus_Uo8HFedVFoV1Ih ; subscription sub_1ToWMT1z3plnI3SEEmSKZYn6 ; price price_1ToVq11z3plnI3SE2fXGZOW5
[PASS] FF-MON-001 / completed-purchase-db-truth | atlas-fitness-billing-qa@fawxzzy.test | billing tables | service-role verification | completed subscription purchase should map to active Pro entitlement | completed pro_subscription receipt, active pro entitlement, matching customer/subscription/price ids, period Jul 1 -> Aug 1 2026 | purchase 12b75d7d-3905-443f-87cb-fc259da9ed12 ; entitlement 052135c1-aa42-4212-8c20-573f9ad5e25c
```

### Billing-lane bugs found and fixed during proof

```text
[PASS] FF-MON-001 / qa-reset-bugfix | reusable billing QA account | npm run qa:user:reset | local verification | reusable QA reset should reseed without duplicate baseline-id collisions | fixed-id cleanup now removes orphaned baseline rows and qa:user:reset passes again | scripts/qa/fitness-qa-user.mjs ; qa:user:reset receipt
[PASS] FF-MON-001 / pending-checkout-reconcile-bugfix | disposable codex sandbox proof account | /api/billing/checkout | route + DB verification | repeated Upgrade to Pro attempts should not accumulate stale pending purchase rows | checkout now reconciles all prior pending pro_subscription receipts before creating the next hosted session; legacy pending rows were swept to cancelled and only the newest checkout remains pending | src/app/api/billing/checkout/route.ts ; src/lib/billing/reconcile-cancelled-checkout.ts ; billing row audit after live recheck
```

### Webhook, production-config, and final UI proof captured on 2026-07-06

```text
[PASS] FF-MON-001 / stripe-webhook-endpoint-repair | Stripe sandbox acct_1ToSyD1z3plnI3SE | webhook destination we_1ToTDX1z3plnI3SEl9Ko02a3 | Stripe Dashboard + Vercel probes | endpoint should target the stable production alias and preserve the configured signing secret | edited destination from stale preview URL to https://fawxzzy-fitness-local.vercel.app/api/billing/webhook/stripe; stale preview URL still returns 503 but is no longer configured; stable alias unsigned probe returns configured-webhook 400 | endpoint we_1ToTDX1z3plnI3SEl9Ko02a3
[PASS] FF-MON-001 / signed-webhook-delivery-proof | Stripe sandbox acct_1ToSyD1z3plnI3SE | checkout.session.expired | Stripe CLI 1.43.6 | signed Stripe event should reach the corrected endpoint with no pending webhook deliveries | stripe trigger succeeded; latest checkout.session.expired event has pending_webhooks=0 | evt_1TqF4H1z3plnI3SEfutSmZr2 ; req_MlDb7tLwGExYfo
[PASS] FF-MON-001 / recurring-prod-env-name-alignment | Vercel fawxzzy/fawxzzy-fitness | production env | Vercel CLI | next production deployment should use recurring STRIPE_PRO_* names rather than relying only on legacy lifetime fallback names | STRIPE_PRO_STANDARD_PRICE_ID and STRIPE_PRO_ACTIVE_PRICE_MODE are present in Production with no newline warnings; no production deployment was performed | price_1ToVq11z3plnI3SE2fXGZOW5 ; mode standard
[PASS] FF-MON-001 / pro-access-layout-anchor-polish | /settings?section=pro | local app UI | in-app browser + repo verification | active status should sit directly under the Pro section and legal acknowledgement plus links should stay anchored above the bottom action bar | local DOM verified the intended order; legal link block is bottom-anchored with the acknowledgement; npm run typecheck and npm run test:billing passed | src/components/settings/ProAccessSettings.tsx
[PASS] FF-MON-001 / subscription-cancel-access-policy | Stripe subscription status policy | deterministic billing tests | repo test suite | cancel-at-period-end should keep Pro through the paid period and remove Pro after expiry | shared subscription-status helper verifies canceled+future period remains completed/entitled, canceled+expired period becomes cancelled/not entitled, and failed states do not keep Pro | src/lib/billing/subscription-status.ts ; src/lib/billing/subscription-status.test.ts ; npm run test:billing
[PASS] FF-MON-001 / stripe-dashboard-period-end-cancel-proof | Stripe sandbox acct_1ToSyD1z3plnI3SE | subscription sub_1ToWMT1z3plnI3SEEmSKZYn6 | Stripe Dashboard test mode | cancel action should allow period-end cancellation without immediate access loss or refund | selected End of the current period in the Stripe cancel dialog; Stripe confirmed subscription remains Active and Cancels Aug 1 with No further invoice and Scheduled to cancel on Aug 1, 2026 | customer cus_Uo8HFedVFoV1Ih ; price price_1ToVq11z3plnI3SE2fXGZOW5 ; payment method Visa 4242
[PASS] FF-MON-001 / qa-pro-screen-period-end-cancel-truth | atlas-fitness-billing-qa@fawxzzy.test | /settings?section=pro | local app UI after Stripe sandbox cancel-at-period-end | app should preserve Pro access while showing the scheduled cancellation truth | Pro screen showed Subscription ends Aug 1, Plan Pro active, Billing $5/month, Status Cancels at period end, Current access ends Aug 1, 2026, and Manage Billing | browser logged in through local dev QA auto-login
```

### Superseded historical blocker

```text
[BLOCKED] FF-MON-001 / hosted-checkout-completion | disposable codex sandbox proof account | Stripe hosted checkout | automated browser | complete sandbox payment with Stripe test card and return through success URL | Stripe hCaptcha anti-bot challenge rendered inside hosted checkout during automated completion in both headless and headed Chrome, so no truthful autonomous payment completion was possible in this pass; signed webhook delivery is separately proven and no longer blocked | hCaptcha frame text: "Please try again. Verify"
```

This blocker was superseded on `2026-07-07` when the in-app browser completed hosted Stripe sandbox checkout with the standard Stripe test card. The later production/stable webhook freshness blocker was superseded by the current-deploy sandbox resend proof and the no-charge live webhook smoke below.

### 2026-07-07 disposable checkout completion and webhook freshness proof

```text
[PASS] FF-MON-001 / disposable-proof-account-free-state | atlas-fitness-checkout-proof-20260707@fawxzzy.test | /settings?section=pro | in-app browser + service-role verification | checkout proof account must start as Free with no local entitlement | account was authenticated through local QA storage state and showed Free, $5/month, base 3 routines, base 14 saved workout plans, Privacy, Terms, and Upgrade to Pro | user_id 85ee6eac-7d80-4516-bc08-4de9693d3c1d
[PASS] FF-MON-001 / hosted-checkout-completion | atlas-fitness-checkout-proof-20260707@fawxzzy.test | Stripe Checkout sandbox | in-app browser | hosted checkout must show sandbox monthly Pro product and complete with Stripe test card only | Checkout showed Sandbox, Fawxzzy Fitness Pro Monthly (sandbox), $5.00 per month, proof-account email, and completed with Stripe test card 4242 in sandbox only | checkout cs_test_a15CHAUAi8RgDbLGBYHwcOjeRS8rF41eBUGbeHrWaXZkcO7U5O7lSQW3cj ; customer cus_UqLJNDQxtqpVa3 ; price price_1ToVq11z3plnI3SE2fXGZOW5
[FAIL] FF-MON-001 / remote-fulfillment-classification | same proof account | Stripe-delivered checkout completion -> Supabase billing tables | DB verification | monthly subscription checkout must write pro_subscription/pro entitlement | after hosted checkout returned, the DB contained purchase_kind lifetime_pro and entitlement_key pro_lifetime for the monthly price; this indicates a stale remote webhook/deployment fulfillment path is still able to write legacy lifetime rows | checkout cs_test_a15CHAUAi8RgDbLGBYHwcOjeRS8rF41eBUGbeHrWaXZkcO7U5O7lSQW3cj ; erroneous purchase 4607df5e-53bd-4d2f-ba33-873be00c26df
[PASS] FF-MON-001 / local-current-webhook-replay | same proof account | local /api/billing/webhook/stripe | signed local Stripe event replay | current local webhook code must classify the same checkout as a subscription | signed local checkout.session.completed replay returned 200 and corrected the receipt to purchase_kind pro_subscription, entitlement_key pro, amount_total 500, currency usd, billing_interval month, subscription sub_1Tqeg51z3plnI3SEnpeUF91D; the stale pro_lifetime row from the remote path was deleted for the disposable proof user | local requestId 5e0d9943-d59a-4079-8b89-d3a14e775c9c ; event evt_local_replay_1783452728191
[PASS] FF-MON-001 / billing-customer-email-preservation-bugfix | same proof account | local webhook subscription update replay | code + DB verification | subscription update webhooks must not erase billing_email when Stripe event lacks customer_email | patched syncBillingCustomer so billing_email is only written when present; local replay preserved atlas-fitness-checkout-proof-20260707@fawxzzy.test while updating latest_stripe_subscription_id | src/app/api/billing/webhook/stripe/route.ts ; local requestId b4c2f676-aef1-4fe3-9431-dd741abdec63
[PASS] FF-MON-001 / app-pro-subscription-success-ui | same proof account | /settings?section=pro&billing=success | in-app browser | successful subscription must show paid monthly truth, not legacy/included truth | app showed Monthly subscription active, Plan Pro active, Billing $5/month, Status Renews monthly, Purchase date Jul 7 2026, Renewal date Aug 7 2026, and Manage Billing | live DOM text after local webhook replay
[PASS] FF-MON-001 / customer-portal-cancel-at-period-end | same proof account | Stripe Billing Portal sandbox | in-app browser | Manage Billing must show subscription truth and allow period-end cancellation | portal showed Fawxzzy Fitness Pro Monthly (sandbox), $5.00/month, Visa 4242, invoice history, proof email, then cancellation flow stated access remains available until Aug 7 2026 and final portal state showed Cancels Aug 7 / service ends Aug 7 | subscription sub_1Tqeg51z3plnI3SEnpeUF91D
[PASS] FF-MON-001 / app-period-end-cancel-ui | same proof account | /settings?section=pro | in-app browser | app must keep Pro active while showing scheduled cancellation truth | app showed Subscription ends Aug 7, Purchase date Jul 7 2026, Current access ends Aug 7 2026, Plan Pro active, Billing $5/month, Status Cancels at period end, and unlocked capacity features remained Active | live DOM text
[FAIL] FF-MON-001 / enabled-sandbox-webhook-freshness | Stripe sandbox acct_1ToSyD1z3plnI3SE | webhook endpoint we_1ToTDX1z3plnI3SEl9Ko02a3 | Stripe API + DB verification | enabled sandbox webhook endpoint must run current monthly-subscription fulfillment code | Stripe reports one enabled endpoint at https://fawxzzy-fitness-local.vercel.app/api/billing/webhook/stripe and the latest checkout event has pending_webhooks=0, but the first natural fulfillment write still classified the monthly checkout as lifetime; endpoint delivery works, endpoint code freshness does not | evt_1Tqeg71z3plnI3SEbX5Ax7uv ; evt_1Tqen91z3plnI3SEbRFU1KrD
[PASS] FF-MON-001 / current-deploy-signed-webhook-freshness | Stripe sandbox acct_1ToSyD1z3plnI3SE | webhook endpoint we_1ToTDX1z3plnI3SEl9Ko02a3 -> dpl_2rrQPh4hjDsG1eat8vvtQdvQxnhD | Stripe Dashboard + Vercel logs + Supabase DB verification | a signed Stripe event must hit the current stable deployment after the approved deploy and naturally keep/write pro_subscription/pro monthly truth | Stripe Dashboard resend produced a fresh 200 OK manual retry on Jul 8 2026 1:36:20 AM; Vercel logs show POST /api/billing/webhook/stripe responseStatusCode=200 on deployment dpl_2rrQPh4hjDsG1eat8vvtQdvQxnhD; Supabase purchase row now stores raw_event_id evt_1Tqeg71z3plnI3SEbX5Ax7uv, purchase_kind pro_subscription, amount_total 500, currency usd, billing_interval month, and the entitlement row remains pro active for sub_1Tqeg51z3plnI3SEnpeUF91D | vercel log lm8vk-1783474575848-cb4b8ef3c5a5 ; subscription sub_1Tqeg51z3plnI3SEnpeUF91D ; customer cus_UqLJNDQxtqpVa3
```

Current interpretation:

- User-facing checkout, Customer Portal, and cancel-at-period-end behavior work in sandbox.
- Current local webhook code handles monthly subscription checkout and subscription update events correctly.
- The stale remote fulfillment bug was historical and is superseded by the current-deploy signed resend proof plus the no-charge live webhook delivery proof.
- Before any production paid launch, a final explicitly approved paid smoke should still prove a real paid live checkout naturally produces `pro_subscription` / `pro` without local replay or manual DB cleanup.

## Current Proof Outcome

- The app-side monthly Pro contract is real.
- The app can start the correct Stripe sandbox checkout from a true free account.
- A disposable checkout proof account now proves:
  - free-state Pro screen truth
  - hosted Stripe sandbox checkout completion
  - active recurring subscription state
  - Customer Portal cancellation at period end
  - app UI cancellation truth with access preserved through the paid period
- The existing bounded QA paid account also proves:
  - completed recurring monthly purchase
  - active entitlement
  - cancel-at-period-end state
  - app-started Stripe billing portal access
- The checkout-start lane had a real cleanup bug around repeated pending receipts and that bug is now fixed.
- The reusable QA reset lane had a fixed-id reseed bug and that bug is now fixed.
- Current local webhook code correctly handles subscription checkout and subscription-update events when signed events are replayed locally.
- A stale/live Stripe-delivered fulfillment path previously produced `lifetime_pro` / `pro_lifetime` for a monthly checkout before local replay corrected the disposable proof account; that state is superseded by current-deploy signed resend proof and no-charge live webhook delivery proof.
- Stripe Dashboard readback confirms the sandbox endpoint is active and points at the stable alias.
- Current-deploy signed webhook freshness is now proof-closed for sandbox.
- Final paid-launch closeout is now blocked on the remaining legal/support/business launch decisions, live Customer Portal return proof, and explicitly approved paid live smoke, not on sandbox hosted checkout completion, production redeploy, or no-charge live webhook freshness.

## 2026-07-07 Live Stripe Config Audit

See `docs/ops/FF-MON-001-LIVE-STRIPE-CONFIG-AUDIT-2026-07-07.md`.

Live-mode audit result:

- Live account `acct_1ToSxw1n5lBbRYoV` has a `$5/month` recurring price, `price_1ToU8R1n5lBbRYoV3VmWk3n6`.
- The live product was renamed to `Fawxzzy Fitness Pro Monthly` on `2026-07-07`.
- Live webhook destination `we_1Tqldd1n5lBbRYoVkvltrp1J` is the single enabled live endpoint after replacing dashboard-created endpoint `we_1TqlES1n5lBbRYoVNF2MxcIq`.
- The live webhook destination points at `https://fawxzzy-fitness-local.vercel.app/api/billing/webhook/stripe`.
- The live webhook destination listens to the six required billing events.
- Live Customer Portal cancellation settings are mostly correct, and Stripe public legal policy links are set.
- Vercel production `STRIPE_PRO_STANDARD_PRICE_ID` was refreshed to the live monthly price id.
- Vercel production `STRIPE_PRO_ACTIVE_PRICE_MODE` was refreshed to `standard`.
- Vercel production live publishable keys, live server key, and live webhook signing secret were installed.
- Production deploy `dpl_HZKzo5XwakgyBj1KGBdpNS1HbK1R` was deployed after env repair and app-side env normalization.
- No-charge live Checkout Session `cs_live_a1EQzcOj0aivMIdcA3kF04VXa2WB9AgxFRqFtgqCCsUVrOLTxSsAxPLHIZ` was created and immediately expired unpaid.
- Stripe event `evt_1TqmOH1n5lBbRYoVW3er3wW4` reached `pending_webhooks=0`.
- Vercel logs showed `POST /api/billing/webhook/stripe` returned `200` on the stable production alias.
- Therefore live paid production remains NO-GO only for remaining business/legal/support decisions, live Customer Portal return proof, and explicitly approved final paid smoke.

## What Still Needs To Happen Before Live Paid Launch

- Live-mode production Stripe configuration proof:
  - re-verify live product name on final live Checkout/Portal smoke
  - re-verify live Stripe legal policy links on final live Checkout/Portal smoke
  - re-verify live webhook destination and selected events
  - re-verify Vercel production live publishable keys and live webhook signing secret metadata
  - re-verify Vercel production recurring price id points at the final live `$5/month` price
  - ~~redeploy production after env changes~~
  - ~~complete no-charge bounded live webhook smoke~~
  - complete live Customer Portal return proof after a bounded live paid customer exists
  - complete an explicitly approved paid live smoke before enabling real paid checkout broadly
- Product approval for the first Pro feature gate:
  - recommended source: `docs/ops/FF-MON-001-PRO-GATING-DECISION-CHECKLIST-2026-07-06.md`
- Counsel signoff and private support path remain separate launch blockers. The support-path decision packet is `docs/ops/FF-LEGAL-001-PRIVATE-SUPPORT-DECISION-PACKET-2026-07-07.md`.
