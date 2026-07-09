# FF-MON-001 Billing App-UI Proof Packet

## Current Launch Status

Live paid production is guarded behind final QA.

Reason:

- Legal copy is improved but counsel-open.
- Pro offer is aligned to capacity-only gates.
- Stripe sandbox checkout and Customer Portal proof are complete against a disposable proof account.
- Monitored private billing/privacy/deletion/refund/account-recovery support intake is defined as `fawxzzy@gmail.com`.
- Fresh Vercel production deployment and stable alias routing are verified; sandbox signed Stripe event delivery, no-charge live signed Stripe event delivery, and no-charge Customer Portal route proof are proof-closed. Live env values are installed and production has been redeployed.

No production paid launch may proceed until the final paid smoke matrix passes and public checkout is explicitly enabled.

Date: 2026-07-03
Status: sandbox checkout completion, Customer Portal cancellation, sandbox current-deploy signed webhook proof, live env installation, Stripe public legal URL persistence, production redeploy, live Customer Portal settings proof, `Live expired-session webhook proof only`, live no-charge subscription webhook proof, live no-charge Customer Portal route proof, bounded live paid checkout, live paid Customer Portal cancel-at-period-end proof, receipt dedupe repair, FF-SEC accepted-risk closure, legal/operator accepted-risk posture, and beta-skip risk acceptance captured; live paid launch remains guarded until final smoke and explicit public-checkout enablement
Scope: recurring Pro subscription proof from the user-facing app UI

## Current Card Status

Status: `Final QA / Guarded`.

This lane is no longer normal implementation. It is launch-gate proof.

Closed/defined:

- guarded deploy behind `PAID_LAUNCH_ENABLED=false`
- source-side failed-payment handler support
- deterministic failed-payment policy tests
- live no-charge subscription webhook proof
- live no-charge Customer Portal route proof
- sandbox no-money test-clock failed-payment/downgrade proof
- sandbox no-money Customer Portal cancel-at-period-end source proof

Open proof items:

- final whole-app `FF-QA-001` launch smoke
- explicit public-checkout enablement approval after smoke
- complete one explicitly approved final live paid smoke
- close beta and legal blockers outside this packet

Not allowed:

- no public live checkout
- no unapproved live charge
- no irreversible Stripe action
- no treating expired-session or no-charge webhook proof as full Stripe readiness

## 2026-07-09 Sandbox No-Money Subscription Lifecycle Proof

Result: no-real-money sandbox lifecycle proof is closed for source/local app behavior.

Reusable command:

```bash
npm run qa:stripe:lifecycle-proof -- --json
npm run qa:stripe:lifecycle-proof -- --apply --cleanup --json
npm run qa:stripe:lifecycle-proof -- --cleanup-only --json
```

Receipt:

- `runtime/fitness/stripe-subscription-lifecycle-proof.latest.json`
- Cleanup-only receipt: `runtime/fitness/stripe-subscription-lifecycle-proof.cleanup.latest.json`

Safety:

- Script refuses live Stripe keys.
- Script uses Stripe sandbox/test mode only.
- Script uses Stripe test `PaymentMethod` ids, not raw card data.
- Script creates no real charge and collects no real payment method.
- Script cleans up the temporary Stripe customers, subscriptions, test clocks, Supabase billing rows, and QA auth user.

Closed lane 1: sandbox paid subscription, app Customer Portal route, cancel-at-period-end.

- Stripe account: `acct_1ToSyD1z3plnI3SE`.
- Price id: `price_1ToVq11z3plnI3SE2fXGZOW5`.
- QA email: `atlas-fitness-billing-lifecycle-qa@fawxzzy.test`.
- Temporary customer: `cus_Uqp7d8pRTsTqR1`.
- Temporary subscription: `sub_1Tr7Te1z3plnI3SEwLFNy3ty`.
- `customer.subscription.created` event: `evt_1Tr7Th1z3plnI3SEKw4jqbc7`.
- `invoice.paid` event: `evt_1Tr7Th1z3plnI3SEoKXDngvW`.
- App local webhook signed replay returned `200` for both initial events.
- App-created portal route `POST http://127.0.0.1:3002/api/billing/portal` returned `200`, `ok: true`, and a Stripe-hosted portal URL.
- Portal request id: `2a987f77-d27a-414b-b74e-2390cc2ffbe0`.
- `customer.subscription.updated` cancel-at-period-end event: `evt_1Tr7Tp1z3plnI3SENXBgRUHk`.
- After replaying cancel-at-period-end, app billing truth remained:
  - `billing_purchases.status = completed`
  - `amount_total = 500`
  - `currency = usd`
  - `billing_interval = month`
  - `user_entitlements.entitlement_key = pro`
  - `user_entitlements.status = active`
  - `expires_at = 2026-08-09T02:14:12+00:00`

Closed lane 2: sandbox test-clock failed payment and downgrade.

- Temporary customer: `cus_Uqp8RGZDtLcp3i`.
- Temporary subscription: `sub_1Tr7Tu1z3plnI3SEs02AmnHD`.
- Initial paid invoice event: `evt_1Tr7Tx1z3plnI3SEaKtoXvb0`.
- Renewal failure event: `evt_1Tr7UI1z3plnI3SE1c3JROiT`.
- Stripe test clock generated a real `invoice.payment_failed` event using `pm_card_chargeCustomerFail`.
- Subscription status after renewal failure: `past_due`.
- Failure period end: `2026-06-30T02:14:28.000Z`.
- Real proof time: `2026-07-09T02:15:00.949Z`.
- App local webhook signed replay returned `200` for the failed-payment event.
- After replaying the failed-payment event, app billing truth changed to:
  - `billing_purchases.status = pending`
  - `billing_purchases.raw_event_id = evt_1Tr7UI1z3plnI3SE1c3JROiT`
  - `user_entitlements.entitlement_key = pro`
  - `user_entitlements.status = revoked`
  - `expires_at = 2026-06-30T02:14:28+00:00`

Cleanup proof:

- Cancelled temporary subscriptions:
  - `sub_1Tr7Te1z3plnI3SEwLFNy3ty`
  - `sub_1Tr7Tu1z3plnI3SEs02AmnHD`
- Deleted temporary customers:
  - `cus_Uqp7d8pRTsTqR1`
  - `cus_Uqp8RGZDtLcp3i`
- Deleted temporary test clocks:
  - `clock_1Tr7Tc1z3plnI3SEMAZYitEV`
  - `clock_1Tr7Tt1z3plnI3SEHBK18aRz`
- Deleted temporary Supabase auth user: `58e88c0f-fffb-4a66-9fa9-04c1b61301ab`.
- Cleanup-only rerun was idempotent and wrote a separate cleanup receipt without overwriting the proof receipt.

Interpretation:

- Closed: no-money sandbox Customer Portal route proof.
- Closed: cancel-at-period-end preserves Pro through the period.
- Closed: test-clock `invoice.payment_failed` can downgrade/revoke Pro when the billing window has expired.
- Not closed: deployed Stripe-delivered failed-payment event proof.
- Not closed: real live `$5/month` checkout/charge proof.
- Not closed: live paid-customer Customer Portal cancellation proof.

## 2026-07-07 Launch Call

Do not launch live paid production yet.

Current product truth:

- Free includes up to `3` routines.
- Free includes up to `14` saved workout plans.
- Pro unlocks unlimited routines and unlimited saved workout plans.
- Pro is `$5/month`, recurring, managed through Stripe Checkout and Stripe Customer Portal.

This is a capacity tier. Do not market the current Pro offer as advanced progression, progression receipts, review tools, coaching, AI coaching, or medical-grade guidance unless those gates are separately implemented and approved.

Remaining live-paid blockers:

- final legal entity, launch geography, refund posture, governing law, venue, and dispute language
- final paid live-mode Stripe/Vercel configuration proof after operator approval
- app-started paid billing portal cancellation proof for the final customer-facing state
- failed-payment/canceled/incomplete UI proof
- deployment plus Stripe-delivered `invoice.payment_failed` handler proof after the source-side handler update
- production live Stripe product, `$5/month` price, webhook, signing secret, server key, success URL, and cancel URL verification
- app-started live Customer Portal customer-flow proof once a bounded live paid customer exists
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

These remain current launch gates even if the billing UI proof passes:

- full launch smoke execution in `FF-QA-001`
- explicit approval before public paid checkout is enabled

The older legal/business, beta, security, and downgrade items are no longer current MVP blockers in this packet because they were either proof-closed or explicitly accepted as MVP risk in later receipts. Counsel review and beta learning remain recommended follow-up work.

## Current Readiness Call

As of `2026-07-03`:

- legal copy is materially improved but still counsel-open
- Pro screen is ready for visual trust review
- Stripe recurring subscription implementation is ready for app-UI proof
- paid launch was blocked at that checkpoint until counsel/operator decisions, beta proof, app-started live customer-flow proof, failed-payment proof, and final paid smoke were closed; later receipts supersede this with operator risk acceptance and completed billing proof

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
- Current local webhook code now handles `invoice.payment_failed` as a first-class webhook path, using the same subscription-status policy that keeps Pro only during a valid future billing window.
- A stale/live Stripe-delivered fulfillment path previously produced `lifetime_pro` / `pro_lifetime` for a monthly checkout before local replay corrected the disposable proof account; that state is superseded by current-deploy signed resend proof and no-charge live webhook delivery proof.
- Stripe Dashboard readback confirms the sandbox endpoint is active and points at the stable alias.
- Current-deploy signed webhook freshness is now proof-closed for sandbox.
- Final paid-launch closeout is now blocked on final `FF-QA-001` whole-app smoke and explicit public-checkout enablement, not on sandbox hosted checkout completion, production redeploy, live portal settings, no-charge live webhook freshness, legal/operator decisions, beta proof, or bounded live paid Customer Portal proof.

## 2026-07-07 Live Stripe Config Audit

See `docs/ops/FF-MON-001-LIVE-STRIPE-CONFIG-AUDIT-2026-07-07.md`.

Live-mode audit result:

- Live account `acct_1ToSxw1n5lBbRYoV` has a `$5/month` recurring price, `price_1ToU8R1n5lBbRYoV3VmWk3n6`.
- The live product was renamed to `Fawxzzy Fitness Pro Monthly` on `2026-07-07`.
- Live webhook destination `we_1Tqldd1n5lBbRYoVkvltrp1J` is the single enabled live endpoint after replacing dashboard-created endpoint `we_1TqlES1n5lBbRYoVNF2MxcIq`.
- The live webhook destination points at `https://fawxzzy-fitness-local.vercel.app/api/billing/webhook/stripe`.
- The live webhook destination listened to the six required billing events from the `2026-07-07` pass, then was updated through Stripe Dashboard on `2026-07-08` to include `invoice.payment_failed` as the seventh required event.
- Follow-up requirement after the `2026-07-08` source-side handler update: deploy the handler, then prove a Stripe-delivered failed-payment event reaches the current deployment before final paid smoke.
- Live Customer Portal cancellation settings are mostly correct, and Stripe public legal policy links are set.
- Vercel production `STRIPE_PRO_STANDARD_PRICE_ID` was refreshed to the live monthly price id.
- Vercel production `STRIPE_PRO_ACTIVE_PRICE_MODE` was refreshed to `standard`.
- Vercel production live publishable keys, live server key, and live webhook signing secret were installed.
- Production deploy `dpl_HZKzo5XwakgyBj1KGBdpNS1HbK1R` was deployed after env repair and app-side env normalization.
- No-charge live Checkout Session `cs_live_a1EQzcOj0aivMIdcA3kF04VXa2WB9AgxFRqFtgqCCsUVrOLTxSsAxPLHIZ` was created and immediately expired unpaid.
- Stripe event `evt_1TqmOH1n5lBbRYoVW3er3wW4` reached `pending_webhooks=0`.
- Vercel logs showed `POST /api/billing/webhook/stripe` returned `200` on the stable production alias.
- Therefore live paid production remains guarded for final `FF-QA-001` smoke and explicit public-checkout enablement. Later receipts supersede the older business/legal, beta, live Customer Portal, and Stripe-delivered failed-payment proof gaps.

### 2026-07-08 Live expired-session webhook proof only

Result: PASS for expired-session event delivery only.

Verified event:

- Event: `evt_1Tqm4f1n5lBbRYoV2npIrzV0`
- Mode: live
- Type: `checkout.session.expired`
- Checkout Session mode: `subscription`
- Checkout Session status: `expired`
- Payment status: `unpaid`
- Pending webhooks: `0`, meaning no pending delivery remained at readback time
- Customer created: no
- Subscription created: no
- Payment created: no
- Live charge created: no

Interpretation:

- Closed only: `Live expired-session webhook proof only`.
- This proves the live expired-session event path had no pending webhook deliveries remaining at readback time.
- This does not prove successful checkout, subscription creation, `invoice.paid` handling, entitlement grant, Customer Portal access from the app UI, cancel-at-period-end, subscription deletion/downgrade, failed-payment handling, refund handling, support operations, deletion operations, beta readiness, or final paid smoke.
- Live paid production remains guarded behind final QA.

Still open: final whole-app paid launch smoke and explicit approval before public checkout is enabled.

## 2026-07-08 Retired Billing Copy Cleanup

Result: PASS for active-source billing label cleanup.

Closed:

- Active source no longer surfaces `Founding Monthly Pro` as the current Pro offer label.
- Active source no longer surfaces `Lifetime Pro` as current user-facing billing copy.
- Compatibility support for existing legacy billing rows and legacy env names remains intact so stored data is not broken.
- Billing tests still pass after the cleanup.

Verification:

- `rg -n "Founding Monthly Pro|Lifetime Pro|lifetime Pro|founding offer|founding price|one-time lifetime|one-time/lifetime" src scripts tests --glob '!src/types/db.ts'` returned no active-source matches.
- `npm run test:billing` passed `25/25`.
- `npm run typecheck` passed.

## 2026-07-08 Source Failed-Payment Handler Support

Result: PASS for app-side handler and deterministic access policy support.

Closed:

- `invoice.payment_failed` is handled explicitly by the source Stripe webhook route.
- Failed-payment handling resolves the Stripe customer, subscription, Fitness user, invoice, price, and period window before updating local billing truth.
- The handler reuses the subscription-status policy so `past_due` remains pending and keeps Pro only while Stripe still exposes a future billing/access window.
- Hard-failed states such as `unpaid` and `incomplete_expired` do not keep Pro.

Verification:

- `npm run test:billing` passed `25/25`.
- Added reusable operator check: `npm run qa:stripe:webhook-readiness -- --json`.
- Read-only Stripe API check with local test key confirmed sandbox account `acct_1ToSyD1z3plnI3SE` has enabled endpoint `we_1ToTDX1z3plnI3SEl9Ko02a3` pointing at `https://fawxzzy-fitness-local.vercel.app/api/billing/webhook/stripe`.
- Stripe Dashboard browser proof on `2026-07-08` updated the sandbox endpoint to listen to seven events including `invoice.payment_failed`.
- `npm run qa:stripe:webhook-readiness -- --mode test --json` now passes with `missingEvents: []`.

Still open:

- Deploy the source handler before claiming production failed-payment support.
- Replay or trigger a Stripe-delivered failed-payment event against the current deployment before final paid launch.
- A real Stripe-delivered failed-payment event still needs sandbox/test-clock or equivalent proof before final paid launch.

## 2026-07-08 Stripe Failed-Payment Event-List Readiness

Closed:

- Live Stripe Dashboard endpoint `we_1Tqldd1n5lBbRYoVkvltrp1J` now shows `Listening to 7 events`.
- Live event list readback includes `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.deleted`, `customer.subscription.updated`, `invoice.paid`, and `invoice.payment_failed`.
- Sandbox Stripe Dashboard endpoint `we_1ToTDX1z3plnI3SEl9Ko02a3` now shows `Listening to 7 events`.
- Sandbox event list readback includes the same seven required events.
- Read-only script proof passed: `npm run qa:stripe:webhook-readiness -- --mode test --json`.

Not closed:

- Deployed production handler proof for the source-side `invoice.payment_failed` code path.
- Real Stripe-delivered failed-payment event proof.
- Final paid smoke.

## 2026-07-08 Repeatable Free-Trial Subscription QA Harness

Result: implementation-ready for test-mode-only subscription lifecycle rehearsal.

Closed:

- Added `npm run qa:stripe:free-trial-proof`.
- The command is test-mode only and refuses to run with a non-`sk_test_` Stripe secret.
- The command uses the real configured monthly Pro price id, but creates a free trial subscription without collecting a payment method.
- The trial uses Stripe's missing-payment-method end behavior so the subscription can cancel if no payment method is attached.
- The command writes a local receipt to `runtime/fitness/stripe-free-trial-subscription-proof.latest.json`.
- The command supports `--cleanup` and `--cleanup-only` so test Stripe customers, subscriptions, auth users, and billing rows can be removed after proof capture.

Runbook:

```bash
npm run qa:stripe:free-trial-proof -- --json
npm run qa:stripe:free-trial-proof -- --apply --cleanup --json
npm run qa:stripe:free-trial-proof -- --apply --local-replay --cleanup --json
npm run qa:stripe:free-trial-proof -- --cleanup-only --json
```

Interpretation:

- This is useful for repeated beta/test-account subscription lifecycle rehearsal because it creates Stripe subscription objects without a real payment or card entry.
- This does not replace final paid-smoke proof because it does not prove a successful `$5.00` charge, paid invoice, card failure, real Customer Portal paid-customer state, or paid checkout conversion.
- Final paid launch still requires an explicitly approved paid smoke against the real `$5/month` subscription path.

Execution receipt:

```text
[PASS] FF-MON-001 / free-trial-proof-dry-run | Stripe sandbox acct_1ToSyD1z3plnI3SE | npm run qa:stripe:free-trial-proof -- --json | local operator script | script should target sandbox only and use the configured monthly Pro price | dry-run selected price_1ToVq11z3plnI3SE2fXGZOW5, mode standard, QA account atlas-fitness-billing-free-trial-qa@fawxzzy.test, and refused to mutate without --apply | runtime receipt path C:\ATLAS\runtime\fitness\stripe-free-trial-subscription-proof.latest.json
[OPEN] FF-MON-001 / stripe-delivered-free-trial-proof | Stripe sandbox acct_1ToSyD1z3plnI3SE -> stable webhook endpoint | npm run qa:stripe:free-trial-proof -- --apply --json | Stripe-created trial subscription should naturally deliver to the deployed webhook endpoint and create billing truth | Stripe created trialing subscription sub_1Tr1fW1z3plnI3SEPbNaO6xn, but the deployed endpoint did not write DB proof within 90s because the script seeded local QA data while the stable webhook endpoint runs against its deployed environment | source-handler replay below proves current local handler logic, but deployed Stripe-delivery proof remains open
[PASS] FF-MON-001 / automated-local-free-trial-source-handler-replay | local /api/billing/webhook/stripe | npm run qa:stripe:free-trial-proof -- --apply --local-replay --cleanup --json | current source handler should process direct trialing subscription events into pro_subscription/pro truth | script created trialing subscription sub_1Tr1jF1z3plnI3SEkVdMdV4I, confirmed deployed Stripe delivery did not write local DB proof, then signed-replayed evt_1Tr1jG1z3plnI3SE8qt5w3qC to local dev; local route returned 200 and wrote billing_purchases.status completed, entitlement_key pro, status active, price price_1ToVq11z3plnI3SE2fXGZOW5, interval month | requestId 7527f6eb-e114-4c21-93b7-802a1bb76fbb
[PASS] FF-MON-001 / free-trial-proof-cleanup | Stripe sandbox + local QA DB | npm run qa:stripe:free-trial-proof -- --cleanup-only --json | temporary QA objects should be removed after proof/debug and cleanup should be idempotent | cleanup removed generated QA objects during the proof run, then cleanup-only rerun returned ok with no remaining deleted customers or QA auth users to remove | cleanup receipt written locally
```

## 2026-07-08 Server-Side Failed-Payment Probe

Goal: determine whether the remaining `invoice.payment_failed` proof could be closed fully by automation without a human-hosted Checkout, Dashboard, or client-side card-entry path.

Result: blocked for natural Stripe-delivered lifecycle proof, not blocked in app code.

Evidence:

- Stripe test mode exposes `pm_card_chargeDeclined`, but attaching it to a Customer or creating the Customer with it fails immediately with `card_declined`; it does not create the deferred subscription invoice failure path needed for this proof.
- Stripe documents active-subscription payment-failure testing through a special test-card path and test clocks, but raw server-side card creation with `4000000000000341` is disabled for this account and Stripe refused raw card data API usage.
- Direct subscription creation with `default_payment_method=pm_card_chargeDeclined` fails because it is not an attached concrete customer PaymentMethod.

Closed by this probe:

- Source handler support remains implemented for `invoice.payment_failed`.
- Stripe endpoint event-list readiness remains closed for sandbox/test endpoint.
- The remaining failed-payment proof now has a specific closure path instead of an ambiguous automation ask.

Still open:

- Natural Stripe-delivered `invoice.payment_failed` lifecycle proof.
- Deployed handler proof after current source is deployed.
- Final paid smoke.

Next valid closure path:

- Use a Stripe-hosted/client-side card collection path or Dashboard/test-clock setup to attach the `4000 0000 0000 0341` test card, advance the test clock, then verify the webhook writes the expected `billing_purchases` and entitlement state.

## 2026-07-08 Paid Launch Disabled Guard

Result: source-side guard implemented for safe deployable webhook proof.

Closed:

- Added `PAID_LAUNCH_ENABLED`, defaulting to `false`.
- `/api/billing/checkout` now fails closed with `BILLING_CHECKOUT_LAUNCH_DISABLED` when Stripe keys/prices are configured but paid launch is not explicitly enabled.
- Webhook handling and Customer Portal access remain independent of the checkout-start guard so deployed Stripe event proof and existing subscriber billing management can continue.
- Pro access snapshot copy now distinguishes "Stripe configured but paid launch disabled" from "Stripe not configured."

Required production posture before public paid checkout:

```txt
PAID_LAUNCH_ENABLED=false
```

This allows production/legal/support pages and Stripe webhook proof to exist on a stable deployed target without allowing unapproved public checkout creation.

## 2026-07-08 Guarded Production Deploy Proof

Result: guarded production source deploy is proof-closed with public checkout still disabled.

Deployment proof:

- Production env includes `PAID_LAUNCH_ENABLED`.
- Production env includes the required Stripe publishable key, recurring Pro price id, server key, and webhook secret names.
- Local billing tests passed: `npm run test:billing`.
- Local typecheck passed: `npm run typecheck`.
- Repo verification passed: `npm run verify`.
- Stripe sandbox free-trial proof script dry-run passed without mutation: `npm run qa:stripe:free-trial-proof -- --json`.
- Stripe sandbox webhook readiness passed with `missingEvents: []`: `npm run qa:stripe:webhook-readiness -- --mode test --json`.
- `vercel build --prod` compiled the Next.js app but local prebuilt packaging hit a Windows symlink `EPERM`; remote Vercel production build was used instead.
- Production deployment id: `dpl_2MP33RxbZDLzqhAzY8xzo37wK4tx`.
- Production deployment URL: `https://fawxzzy-fitness-fopth94ql-fawxzzy.vercel.app`.
- Stable aliases include:
  - `https://fawxzzy-fitness-local.vercel.app`
  - `https://fawxzzy-fitness-fawxzzy.vercel.app`
  - `https://fawxzzy-fitness-zachariahredfield-fawxzzy.vercel.app`
- `vercel inspect fawxzzy-fitness-fopth94ql-fawxzzy.vercel.app` returned status `Ready`, target `production`.
- Unsigned POST to `https://fawxzzy-fitness-local.vercel.app/api/billing/webhook/stripe` returned `400` with `BILLING_WEBHOOK_SIGNATURE_MISSING`, proving the deployed webhook route is live and still signature-gated.
- Deployment-specific error scan returned no error log rows:
  - `vercel logs dpl_2MP33RxbZDLzqhAzY8xzo37wK4tx --no-follow --level error --since 15m --json`

Interpretation:

- Closed: deploy current billing/webhook source behind the paid-launch-disabled guard.
- Closed: deployed route still rejects unsigned webhook traffic.
- Not closed: final whole-app paid launch smoke or explicit public-checkout enablement.

## 2026-07-08 Post-Deploy Free-Trial Stripe Delivery Recheck

Result: still open for natural Stripe-delivered no-money subscription proof.

Attempt:

- Command: `npm run qa:stripe:free-trial-proof -- --apply --cleanup --json`.
- Stripe mode: sandbox/test.
- Stripe account: `acct_1ToSyD1z3plnI3SE`.
- QA email: `atlas-fitness-billing-free-trial-qa@fawxzzy.test`.
- Price id: `price_1ToVq11z3plnI3SE2fXGZOW5`.
- Created trial subscription: `sub_1Tr57o1z3plnI3SEO68RgCZS`.
- Created customer: `cus_Uqmhl3ShXxYrQ6`.
- Cleanup ran and removed the temporary Stripe customer, QA auth user, and QA database rows.

Observed Stripe event state:

- `customer.subscription.created` event `evt_1Tr57q1z3plnI3SEunlqn1JT` had `pending_webhooks=1`.
- `invoice.paid` event `evt_1Tr57q1z3plnI3SExC0G9qrF` had `pending_webhooks=1`.
- `customer.subscription.deleted` event `evt_1Tr59I1z3plnI3SEeFcRu3aK` had `pending_webhooks=1`.
- `vercel logs dpl_2MP33RxbZDLzqhAzY8xzo37wK4tx --no-follow --since 10m --json --query '/api/billing/webhook/stripe'` returned no webhook request rows for this attempt.
- Stripe endpoint readiness still passes: `npm run qa:stripe:webhook-readiness -- --mode test --json` returns `missingEvents: []`.

Interpretation:

- The deployed app route and endpoint configuration are ready, but this particular no-money trial event did not naturally reach the stable webhook endpoint during the proof window.
- This does not regress the guarded deploy proof.
- The next valid closure path is a Stripe Dashboard manual retry/resend of the pending test event, or a fresh no-money/test-clock event that reaches the stable endpoint and writes `pro_subscription`/`pro` truth before cleanup.

## 2026-07-09 Deployed Sandbox Delivery Signature Recheck

Result: source-side fix implemented; deployed Stripe-delivered sandbox proof remains open until deploy/env approval.

Attempt:

- Command: `npm run qa:stripe:free-trial-proof -- --apply --cleanup --json`.
- Stripe mode: sandbox/test.
- Stripe account: `acct_1ToSyD1z3plnI3SE`.
- QA email: `atlas-fitness-billing-free-trial-qa@fawxzzy.test`.
- Price id: `price_1ToVq11z3plnI3SE2fXGZOW5`.
- Created trial subscription: `sub_1TrA1m1z3plnI3SE9zgmup5O`.
- Created customer: `cus_Uqrl6J69XBoUzV`.
- Cleanup ran and removed the temporary Stripe customer, QA auth user, and QA database rows.
- Receipt: `runtime/fitness/stripe-free-trial-subscription-proof.latest.json`.

Observed Stripe event state:

- `customer.subscription.created` event `evt_1TrA1o1z3plnI3SERiYtr1Lq` had `pending_webhooks=1`.
- `invoice.paid` event `evt_1TrA1o1z3plnI3SEgRBynqPI` had `pending_webhooks=1`.
- `customer.subscription.deleted` event `evt_1TrA3H1z3plnI3SESXYfy2hO` had `pending_webhooks=1`.

Observed Vercel state:

- Stable alias: `https://fawxzzy-fitness-local.vercel.app`.
- Deployment id inspected: `dpl_3Xo7X5nH9ptykwXvxB3cSPVxAiRs`.
- Vercel logs showed `POST /api/billing/webhook/stripe` returned `400`.
- The route logged `[billing-webhook-stripe] failed`.
- Error class: Stripe signature verification mismatch: `No signatures found matching the expected signature for payload`.

Root cause:

- The deployed production route was verifying only `STRIPE_WEBHOOK_SECRET`.
- The sandbox Stripe endpoint signs test-mode deliveries with a separate endpoint signing secret.
- A deployed production app can intentionally support both live and sandbox proof only if the sandbox/test webhook secret is separately configured.

Source fix:

- Added a tested webhook signature helper that tries the primary live webhook secret first, then an explicitly configured test/sandbox webhook secret.
- Added `STRIPE_TEST_WEBHOOK_SECRET`; `STRIPE_SANDBOX_WEBHOOK_SECRET` is accepted as an alias.
- Added focused billing tests for primary-secret success, test-secret fallback, no-secret fail-closed behavior, and bad-signature rejection.
- `npm run test:billing` passed after the source change.

Interpretation:

- Closed: source-side support for separate live and test Stripe endpoint signing secrets.
- Closed: the failed proof did not create a real charge and temporary Stripe/Supabase data was cleaned up.
- Not closed: deployed Stripe-delivered sandbox proof after the secondary signing secret is configured in Vercel and the source change is deployed.
- Do not mark this as full live paid readiness. This only prepares no-money deployed proof.

## 2026-07-09 Deployed Sandbox Free-Trial Delivery Proof

Result: deployed Stripe-delivered sandbox no-money subscription creation and entitlement proof is closed.

Environment/deploy proof:

- `STRIPE_TEST_WEBHOOK_SECRET` was added to Vercel Production without replacing or weakening the live `STRIPE_WEBHOOK_SECRET` path.
- The temporary local capture file used to transfer the signing secret was deleted after the Vercel env update.
- Production deployment id: `dpl_HUsDUbhofhJFEKxLCazcDfQk8pTM`.
- Stable alias: `https://fawxzzy-fitness-local.vercel.app`.
- Stripe sandbox webhook readiness passed after deploy:
  - Account: `acct_1ToSyD1z3plnI3SE`.
  - Endpoint id: `we_1ToTDX1z3plnI3SEl9Ko02a3`.
  - Endpoint URL: `https://fawxzzy-fitness-local.vercel.app/api/billing/webhook/stripe`.
  - `missingEvents: []`.

Proof command:

```bash
npm run qa:stripe:free-trial-proof -- --apply --cleanup --json
```

Proof result:

- Stripe mode: sandbox/test.
- Stripe account: `acct_1ToSyD1z3plnI3SE`.
- QA email: `atlas-fitness-billing-free-trial-qa@fawxzzy.test`.
- Price id: `price_1ToVq11z3plnI3SE2fXGZOW5`.
- Run id: `c5b9f0fa-2d46-4a14-b8ab-8eae294c0d3e`.
- Created test customer: `cus_Uqs8Owrkv7VyTl`.
- Created test subscription: `sub_1TrANw1z3plnI3SE5yze7sPt`.
- Subscription status: `trialing`.
- `stripeDeliveredWebhookProofReceived: true`.
- `webhookProofReceived: true`.
- App purchase proof:
  - Purchase id: `d60d2d36-ae0f-4423-81fc-5b4db43666eb`.
  - Purchase kind: `pro_subscription`.
  - Status: `completed`.
  - Billing interval: `month`.
  - Period end: `2026-07-10T05:20:32+00:00`.
- App entitlement proof:
  - Entitlement id: `90b583ca-083e-4fe0-baaa-30eae63342e0`.
  - Entitlement key: `pro`.
  - Status: `active`.
  - Expires at: `2026-07-10T05:20:32+00:00`.
- Cleanup proof:
  - Deleted Stripe customer: `cus_Uqs8Owrkv7VyTl`.
  - Deleted QA auth user: `87e07b88-8c81-4131-b71f-db4c5a9cdb1c`.
  - Deleted temporary database rows: `true`.

Deployed route evidence:

- Vercel logs for deployment `dpl_HUsDUbhofhJFEKxLCazcDfQk8pTM` showed three `POST /api/billing/webhook/stripe` requests for this proof window.
- Expanded Vercel logs showed all three deployed route requests returned `status=200`.
- Stripe readback for the proof subscription found related sandbox events including:
  - `customer.subscription.created` event `evt_1TrANy1z3plnI3SEyILDtSnZ`.
  - `invoice.payment_succeeded` event `evt_1TrANy1z3plnI3SE3iffCbgk`.
  - `invoice.paid` event `evt_1TrANy1z3plnI3SEP2IudhDD`.
  - `customer.subscription.deleted` event `evt_1TrAO21z3plnI3SEfcQ8cpVH`.

Interpretation:

- Closed: deployed Stripe-delivered sandbox no-money subscription creation processed into app `pro_subscription` purchase truth.
- Closed: deployed Stripe-delivered sandbox no-money subscription creation processed into app `pro` entitlement truth.
- Closed: proof did not use a real card, did not create a real charge, and removed temporary Stripe/Supabase data.
- Not closed at this checkpoint: deployed Stripe-delivered failed-payment event proof and final `FF-QA-001` paid launch smoke. Later receipts closed bounded live paid checkout, live paid Customer Portal cancel-at-period-end, legal/operator risk acceptance, and beta-skip risk acceptance.

## 2026-07-09 Deployed Sandbox Failed-Payment Delivery Proof

Result: deployed Stripe-delivered sandbox failed-payment processing proof is closed for the current-period failure path.

Root cause found and fixed before final proof:

- Deployed production had both live and sandbox webhook signing secrets after the previous proof.
- Test-mode invoice webhooks were verified successfully, but invoice handlers still attempted to retrieve test subscriptions through the primary live Stripe server client.
- That caused `No such subscription` on test invoice events.
- Source fix: invoice-paid and invoice-failed handlers now process invoice payload and subscription metadata first, so they do not require a same-mode follow-up Stripe subscription retrieve to write billing truth.

Deployment proof:

- Production deployment id: `dpl_8wP4sCVpZzk7hUg83cSLkjRaaTps`.
- Stable alias: `https://fawxzzy-fitness-local.vercel.app`.
- Focused billing tests passed after the source fix.
- Typecheck passed after the source fix.

Proof command:

- Operator inline proof used Stripe test mode only and wrote receipt:
  - `runtime/fitness/stripe-deployed-failed-payment-proof.latest.json`

Proof result:

- Stripe mode: sandbox/test.
- Stripe account: `acct_1ToSyD1z3plnI3SE`.
- QA email: `atlas-fitness-billing-deployed-failure-qa@fawxzzy.test`.
- Price id: `price_1ToVq11z3plnI3SE2fXGZOW5`.
- Run id: `91e4d8a8-4e95-4fc1-b74b-b7ddf666a32d`.
- Created test customer: `cus_UqsUJB8gSDKE6I`.
- Created test subscription: `sub_1TrAjk1z3plnI3SEKUcJfVaC`.
- Initial paid event:
  - `invoice.paid` event `evt_1TrAjn1z3plnI3SE5549Q0b1`.
  - App wrote `billing_purchases.status=completed`.
  - App wrote `user_entitlements.status=active`.
- Failed-payment event:
  - `invoice.payment_failed` event `evt_1TrAk71z3plnI3SE43U1mitQ`.
  - Subscription status after failure: `past_due`.
  - Failure window end: `2026-09-09T05:43:02.000Z`.
  - App wrote `billing_purchases.status=pending`.
  - App preserved `user_entitlements.status=active` through `2026-09-09T05:43:02+00:00` because the failed invoice still had a future access window.

Deployed route evidence:

- Vercel logs for deployment `dpl_8wP4sCVpZzk7hUg83cSLkjRaaTps` showed seven `POST /api/billing/webhook/stripe` requests during the proof window.
- Expanded Vercel logs showed all seven deployed route requests returned `status=200`.

Cleanup proof:

- Deleted temporary Stripe subscription: `sub_1TrAjk1z3plnI3SEKUcJfVaC`.
- Deleted temporary Stripe customer: `cus_UqsUJB8gSDKE6I`.
- Deleted temporary Stripe test clock: `clock_1TrAji1z3plnI3SEOYBpzKzY`.
- Deleted temporary QA auth user: `a5e8c586-6b13-4e0c-a2f1-54dabae1b6bb`.
- Deleted temporary database rows: `true`.
- Supabase readback after cleanup returned no `billing_purchases`, `user_entitlements`, or `billing_customers` rows for the proof subscription.

Interpretation:

- Closed: deployed Stripe-delivered `invoice.payment_failed` processing for a current-period failed renewal.
- Closed: app truth moves the purchase into `pending` and keeps Pro active only because the failed renewal still has a future paid/access window.
- Already closed separately: source/local expired-window failed-payment downgrade proof where the entitlement is revoked.
- Not closed at this checkpoint: final `FF-QA-001` paid launch smoke. Later receipts closed bounded live paid checkout, live paid Customer Portal cancel-at-period-end, legal/operator risk acceptance, and beta-skip risk acceptance.

## 2026-07-08 Live No-Charge Subscription Webhook Proof

Result: live no-charge subscription webhook and entitlement proof is closed.

Root cause repaired before proof:

- Production Stripe env is live-mode by design, while the sandbox endpoint is test-mode.
- A sandbox event cannot prove the production webhook unless production is pointed at test secrets, which is not the desired launch posture.
- Pulled production env values also exposed BOM / escaped-newline artifacts on some Stripe values.
- Source now strips leading BOM and trailing literal `\r\n` / `\n` artifacts in shared env normalization.
- Billing tests cover the BOM/newline case.

Guarded deployment:

- Deployment id: `dpl_3Xo7X5nH9ptykwXvxB3cSPVxAiRs`.
- Stable alias: `https://fawxzzy-fitness-local.vercel.app`.
- Public checkout remains guarded by `PAID_LAUNCH_ENABLED=false`.
- Signed live-mode unsupported webhook probe returned `200` with `ok:true`, request id `694325a5-6583-4406-8584-592899ba3e1e`.

No-charge live proof:

- Command: `npm run qa:stripe:free-trial-proof -- --allow-live-no-charge --apply --json`.
- Explicit local safety acknowledgement: `ALLOW_PROD_SUPABASE_IN_DEV=1`.
- Stripe mode: live.
- Stripe account: `acct_1ToSxw1n5lBbRYoV`.
- Price id: `price_1ToU8R1n5lBbRYoV3VmWk3n6`.
- QA email: `atlas-fitness-billing-free-trial-qa@fawxzzy.test`.
- Created live customer: `cus_UqnA8kIA3Vl7gQ`.
- Created live trial subscription: `sub_1Tr5Zu1n5lBbRYoVAOjev7wQ`.
- No payment method was collected.
- No real card was used.
- Subscription status at proof: `trialing`.
- Webhook proof received: `true`.
- DB proof before cleanup:
  - `billing_purchases.id = 6855d041-ab8b-41b1-9667-a0cae365bddf`
  - `billing_purchases.status = completed`
  - `billing_purchases.stripe_subscription_id = sub_1Tr5Zu1n5lBbRYoVAOjev7wQ`
  - `billing_purchases.stripe_price_id = price_1ToU8R1n5lBbRYoV3VmWk3n6`
  - `billing_purchases.billing_interval = month`
  - `user_entitlements.id = e51bf761-bd33-406f-afe4-ff50a012b891`
  - `user_entitlements.entitlement_key = pro`
  - `user_entitlements.status = active`
  - `user_entitlements.source_subscription_id = sub_1Tr5Zu1n5lBbRYoVAOjev7wQ`

Stripe delivery readback:

- `customer.subscription.created` event `evt_1Tr5Zv1n5lBbRYoVdiEVrBMp` had `pending_webhooks=0`.
- `invoice.paid` event `evt_1Tr5Zw1n5lBbRYoVKOo5KK4T` had `pending_webhooks=0`.
- `customer.subscription.trial_will_end` event `evt_1Tr5a01n5lBbRYoVw1awNG62` had `pending_webhooks=0`.

Cleanup proof:

- Cleanup cancelled/deleted the temporary live customer path.
- Stripe customer `cus_UqnA8kIA3Vl7gQ` now retrieves as `deleted=true`.
- Manual post-webhook cleanup removed delayed `customer.subscription.deleted` residue:
  - deleted `1` matching `user_entitlements` row
  - deleted `1` matching `billing_purchases` row
  - deleted `1` matching `billing_customers` row
- Final Supabase readback for the bounded QA `user_id`, `customer`, and `subscription` returned empty arrays for `billing_customers`, `billing_purchases`, `user_entitlements`, and `profiles`.
- Cleanup script was hardened to reuse prior receipt IDs and clear rows by QA email, customer id, subscription id, and metadata user id.

Interpretation:

- Closed: production live webhook can process a no-charge live subscription lifecycle enough to write subscription purchase and Pro entitlement truth.
- Closed: live webhook signing secret and live server key are consistent on the stable production alias.
- Closed: temporary live proof data was removed after delayed deletion webhook residue was handled.
- Not closed: final whole-app paid launch smoke or explicit public-checkout enablement.

## 2026-07-08 Live No-Charge Customer Portal Route Proof

Result: app-started Customer Portal route proof is closed for a no-charge active subscription customer. Paid customer cancellation proof remains open.

Route proof:

- Target route: `POST https://fawxzzy-fitness-local.vercel.app/api/billing/portal`.
- The request was made with a signed-in QA session for `atlas-fitness-billing-free-trial-qa@fawxzzy.test`.
- Stable alias request returned `200`.
- Response included `ok: true`.
- Response included a Stripe-hosted portal URL.
- Vercel request id: `32749d04-0c69-42cb-bb62-35df073c4d74`.
- No payment method was collected.
- No real card was used.
- No live charge was created.

Temporary proof objects:

- Temporary QA auth user: `8488c616-173e-45ce-a5ba-8c8e08a7f72f`.
- Temporary live customer: `cus_UqoDlhRQQul9jN`.
- Temporary live trial subscription: `sub_1Tr6bS1n5lBbRYoV2F3cyg5f`.
- The active proof state produced two `billing_purchases` rows for the subscription because both subscription and invoice lifecycle events can write receipts:
  - `6b02ee40-3f20-46ed-af98-a835ccb92d95`
  - `7851dcab-b494-4eb9-9274-4022eae2d9c5`
- Temporary entitlement: `0791b05c-54f5-4ed9-8101-e22d12b6625a`.

Cleanup proof:

- Cleanup command: `npm run qa:stripe:free-trial-proof -- --allow-live-no-charge --cleanup-only --json`.
- Deleted Stripe customer: `cus_UqoDlhRQQul9jN`.
- Cleaned database user id: `8488c616-173e-45ce-a5ba-8c8e08a7f72f`.
- Final Supabase readback returned empty arrays for `billing_customers`, `billing_purchases`, `user_entitlements`, and `profiles`.
- Stripe customer retrieve now returns `deleted: true`.

Harness hardening:

- The no-charge proof harness no longer assumes one purchase row per subscription.
- It now selects the latest completed receipt from the subscription's receipt rows and reports `purchaseRowCount`.
- This keeps proof strict on entitlement truth without treating legitimate subscription plus invoice receipt rows as a harness failure.

Interpretation:

- Closed: app route can create a Stripe Customer Portal session for an active subscription-backed Pro account.
- Not closed: final whole-app paid launch smoke or explicit public-checkout enablement.

## What Still Needs To Happen Before Live Paid Launch

- Bounded live paid-smoke runbook:
  - `docs/ops/FF-MON-001-BOUNDED-LIVE-PAID-SMOKE-RUNBOOK-2026-07-08.md`
- Live-mode production Stripe configuration proof:
  - re-verify live product name on final live Checkout/Portal smoke
  - re-verify live Stripe legal policy links on final live Checkout/Portal smoke
  - re-verify live webhook destination and selected events
  - re-verify Vercel production live publishable keys and live webhook signing secret metadata
  - re-verify Vercel production recurring price id points at the final live `$5/month` price
  - ~~confirm production `PAID_LAUNCH_ENABLED=false` for guarded deploy proof~~
  - ~~deploy current production source behind the paid-launch-disabled guard~~
  - ~~redeploy production after env changes~~
  - ~~complete no-charge bounded live webhook smoke~~
  - ~~complete no-charge app-started Customer Portal route proof~~
  - ~~complete live paid Customer Portal return/customer/cancel proof after a bounded live paid customer exists~~
  - ~~complete an explicitly approved paid live smoke before enabling real paid checkout broadly~~
  - complete final whole-app `FF-QA-001` launch smoke
  - explicitly approve public-checkout enablement after the final smoke passes
- Product approval for the first Pro feature gate:
  - recommended source: `docs/ops/FF-MON-001-PRO-GATING-DECISION-CHECKLIST-2026-07-06.md`
- Counsel/operator legal posture, downgrade-equivalent proof, and beta skip have explicit MVP risk-acceptance receipts. Beta remains post-launch learning, not a current MVP launch blocker. The support-path decision packet is `docs/ops/FF-LEGAL-001-PRIVATE-SUPPORT-DECISION-PACKET-2026-07-07.md`.
