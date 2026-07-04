# FF-MON-001 Billing App-UI Proof Packet

Date: 2026-07-03
Status: partial execution completed; hosted-checkout completion still blocked by Stripe anti-bot challenge in automation
Scope: recurring Pro subscription proof from the user-facing app UI

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

## Known Open Blockers Outside This Packet

These remain real launch blockers even if the billing UI proof passes:

- private support path for billing, deletion, privacy, and health-related requests
- governing law / venue / dispute language finalized by counsel
- refund language finalized for launch geography
- Washington consumer-health-data review if launch includes Washington users
- final beta proof in `FF-BETA-001`
- full launch smoke execution in `FF-QA-001`

## Current Readiness Call

As of `2026-07-03`:

- legal copy is materially improved but still counsel-open
- Pro screen is ready for visual trust review
- Stripe recurring subscription implementation is ready for app-UI proof
- paid launch remains blocked until this proof packet is executed and the remaining legal/support blockers are closed

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

### Remaining blocker

```text
[BLOCKED] FF-MON-001 / hosted-checkout-completion | disposable codex sandbox proof account | Stripe hosted checkout | automated browser | complete sandbox payment with Stripe test card and return through success URL | Stripe hCaptcha anti-bot challenge rendered inside hosted checkout during automated completion in both headless and headed Chrome, so no truthful autonomous payment completion was possible in this pass | hCaptcha frame text: "Please try again. Verify"
```

## Current Proof Outcome

- The app-side monthly Pro contract is real.
- The app can start the correct Stripe sandbox checkout from a true free account.
- The existing bounded QA paid account still proves:
  - completed recurring monthly purchase
  - active entitlement
  - cancel-at-period-end state
  - app-started Stripe billing portal access
- The checkout-start lane had a real cleanup bug around repeated pending receipts and that bug is now fixed.
- The reusable QA reset lane had a fixed-id reseed bug and that bug is now fixed.
- Final autonomous closeout is still blocked on Stripe-hosted checkout completion because of Stripe hCaptcha / anti-bot on automated payment entry.

## What Still Needs To Happen Before Live Paid Launch

- One human-operated Stripe sandbox checkout completion from the disposable free proof lane:
  - confirm Sandbox label
  - use test card `4242 4242 4242 4242`
  - verify success return to `/settings?section=pro&billing=success`
  - verify app entitlement flips to Pro on that same proof account
- Counsel signoff and private support path remain separate launch blockers.
