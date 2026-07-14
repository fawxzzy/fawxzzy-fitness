# Community Monetization Delivery Research

Date: 2026-07-14

Cards:
- `FF-MON-004` Design Subscriber-Count Community Pricing
- `FF-MON-005` Add Optional Support Fawxzzy Payments
- `FF-SOC-002` Add Gifted Pro Subscription Credits

Status: operator-approved direction; Planning remains active until the existing Fitness review/iteration chain is accepted.

## Operator Decisions Recorded

- Use a permanent downward community-price ratchet rather than a continuously fluctuating price.
- Start at `$5/month`, then propose `$4` at 1,250 active paid subscribers, `$3` at 1,667, `$2` at 2,500, `$1` at 5,000, and `$0.50/month` at 10,000.
- Never automatically raise an existing subscriber's price.
- Apply lower monthly prices on a future renewal without a mid-cycle proration.
- Offer voluntary Support Fawxzzy payments separately from subscriptions and product access.
- Use a `$3` minimum with `$5`, `$10`, and `$25` presets, plus a custom amount.
- Keep the support entry point in the Settings/Account family, outside workout completion and other pressure moments.
- Add direct-recipient gifted Pro first after social identity/privacy is accepted; consider a community pool afterward.
- Finish the already-open Fitness review and iteration work before implementation starts on these cards.

## Recommended Delivery Architecture

### Community price truth

Use an app-owned, append-only community-price epoch as the decision record. Stripe Prices remain immutable billing objects referenced by each epoch.

Each epoch records:
- milestone and subscriber threshold
- monthly amount and Stripe Price ID
- activation timestamp
- evidence snapshot used to unlock it
- migration status and operator freeze state

The current Checkout route reads only the active epoch. Environment variables remain an emergency launch/freeze guard, not the long-term price selector.

### Count definition

Count one unique renewing paid subscription per Fitness user only when all of these are true:
- Stripe subscription status is `active`
- at least one non-zero invoice succeeded
- the paid period ends in the future
- cancellation at period end is not scheduled
- the subscription is not trialing, paused, past due, unpaid, incomplete, refunded, disputed, or fully discounted
- the access was not granted by lifetime access, support payment, gift credit, fixture, or administrative override

Use the Supabase billing mirror for fast daily calculation, then reconcile the candidate threshold against Stripe before an epoch unlock. Store daily count snapshots so the decision is auditable.

Require the threshold to remain satisfied for seven consecutive daily snapshots. This prevents a temporary webhook race, fraudulent burst, or one-day churn spike from unlocking a permanent lower price. Once unlocked, an epoch never relocks when membership falls.

### Existing subscriber migration

For monthly-to-monthly reductions:
- create the next immutable Stripe Price in advance
- update the existing subscription item, not add a second item
- preserve quantity `1`
- set `proration_behavior=none`
- preserve the billing-cycle anchor
- use an idempotency key scoped to epoch and subscription
- record pending, applied, failed, retry, and verified states in a durable migration ledger

Stripe then uses the lower price on the next invoice without changing the current paid period. Do not use immediate invoices or credits for the community reduction.

Do not silently convert monthly subscribers to annual billing. Stripe treats an interval change differently and can reset billing timing. Annual low-price billing is an explicit user opt-in with a clear total and renewal date.

### Work scheduling

Use a small, retryable server-side batch rather than one large migration request:
- one guarded daily reconciliation creates or advances an epoch
- a durable Supabase migration ledger holds one row per subscription and epoch
- a protected Vercel job processes bounded batches
- a database lock prevents overlapping epoch activation
- Stripe idempotency plus the local unique epoch/subscription key makes retries safe
- failed rows remain visible for retry and operator review

Vercel Cron does not retry failed invocations and can deliver duplicates, so the ledger, lock, and idempotency are required. Do not make the first release depend on a beta queue product. If subscriber volume later warrants it, the same ledger contract can feed Supabase Queues without changing billing semantics.

### Webhook and reconciliation behavior

- Continue verifying Stripe signatures.
- Record processed event IDs and object/type pairs.
- Never depend on webhook delivery order.
- Retrieve the latest Stripe subscription when an event arrives out of order.
- Keep one canonical subscription receipt using the existing unique subscription guard.
- Add price epoch and migration correlation to receipts without replacing current entitlement truth.

## Community Price UX

Reuse the existing `ProAccessSettings`, Settings accordion, status tiles, `SignatureMiniPipe`, `MetricAccentBar`, bottom dock action, and toast patterns.

Compact Settings state:
- title: `Pro Access`
- one light metadata row: `Community price | $5/month`
- no explanatory paragraph

Expanded Pro state:
- keep `Plan`, `Billing`, and `Status` as the primary three-tile row
- render current community price in the existing Billing tile
- add one compact milestone row below it: `1,108 / 1,250 | Next price $4`
- use one thin progress line, not a dashboard or a second visual language
- place `Price only moves down` and renewal details inside a small disclosure/footer area
- announce an unlocked price with the existing toast/notice treatment, not a blocking modal

Do not show revenue, gross subscriber value, migration internals, or an always-visible policy blurb in the main interface.

Pattern references:
- GitHub Sponsors exposes a goal title, target, and percent complete; Fitness should reuse only the simple milestone/progress concept.
- Fitness history and settings already establish the canonical compact/detailed card rhythm; those local components override external styling.

## Support Fawxzzy Delivery

Use authenticated one-time Stripe Checkout in `payment` mode. Keep it independent from Pro Checkout, Customer Portal, and entitlement writes.

Recommended flow:
1. A separate `Support Fawxzzy` Settings accordion appears after Pro Access.
2. Compact state has only the title and `Optional` metadata.
3. Expanded state shows `$5`, `$10`, and `$25` chips plus `Custom` with a `$3` server-enforced minimum.
4. The existing bottom dock action says `Continue to Stripe`.
5. Stripe Checkout shows the final amount and handles payment details.
6. Return to the same Settings section with a short success toast and receipt state.

Use server-validated one-time `price_data` for the selected amount so Fitness can preserve its own preset/custom UI. Stripe's hosted pay-what-you-want field is a fallback, but it cannot be combined with other line items, quantities, discounts, or recurring billing and would move amount selection out of the app.

Support receipts need a distinct purchase kind and webhook path. They never create or extend a Pro entitlement. Copy must state that support is optional, grants no additional access, and is not represented as charitable or tax-deductible.

The existing customer-support email label must remain `Billing help` or `Contact support` so it is not confused with the new payment action.

Pattern references:
- GitHub Sponsors separates one-time and recurring support and supports minimum/custom amounts.
- Stripe Checkout keeps sensitive payment collection off the Fitness surface.
- Fitness Settings accordion and bottom dock remain the visual source of truth.

## Gifted Pro Delivery

Gifting remains after `FF-SOC-001` and accepted social identity/privacy rules.

First release:
- direct recipient only
- recipient must be a verified Fitness user and eligible for gifted access
- purchaser selects whole months and may add a short message
- Checkout snapshots the active community price
- one-time payment creates app-owned recipient-month credits
- credits cannot be transferred, resold, or cashed out
- gift purchase and redemption have separate durable IDs and idempotency guards

Do not initially gift to an actively renewing Pro subscriber. Pausing or extending an existing paid subscription without losing paid time requires a separate accepted billing design. The first release should clearly mark those recipients ineligible rather than charging for an ambiguous benefit.

After direct gifting is proven, a community pool may accept whole-month credits with claim limits, moderation, expiry, and anti-abuse controls.

Pattern references:
- Patreon separates direct gifts from community gifts, uses whole-month durations, and defines redemption/expiry behavior.
- Discord keeps unclaimed gifts in an inventory and supports revoking or regenerating an unclaimed link.
- Fitness should use its own user identity and entitlement ledger rather than Stripe customer balance transfers.

## Implementation Packets

Do not combine these into one implementation PR.

1. `FF-MON-004A` community count snapshots and epoch read model
2. `FF-MON-004B` Stripe price migration ledger, dry-run, and sandbox worker
3. `FF-MON-004C` Fitness-native community price UI and notices
4. `FF-MON-005A` support receipt schema and sandbox Checkout/webhook path
5. `FF-MON-005B` Support Fawxzzy Settings UI
6. `FF-SOC-002A` gift-credit ledger and eligibility rules after social acceptance
7. `FF-SOC-002B` direct gift purchase, redemption, inventory, and UI
8. `FF-SOC-002C` optional community pool after direct gifting proof

These are implementation packet names, not authorization to create duplicate Discord cards before checking the canonical board.

## Required Proof Before Release

- deterministic threshold and seven-day confirmation tests
- out-of-order and duplicate webhook tests
- migration dry-run with zero Stripe mutation
- sandbox monthly-to-monthly migration with no proration and unchanged billing date
- retry, partial failure, and idempotent replay proof
- support success, cancellation, refund, and duplicate webhook proof
- no entitlement change after support payment
- gift purchase/redemption/refund/expiry/overlap proof
- mobile and desktop review on real Settings surfaces using current Fitness card patterns
- legal/tax copy review before public enablement
- explicit current-thread production deployment approval for any production release

## Sources

- Stripe price changes: https://docs.stripe.com/billing/subscriptions/change-price
- Stripe prorations: https://docs.stripe.com/billing/subscriptions/prorations
- Stripe subscription schedules: https://docs.stripe.com/billing/subscriptions/subscription-schedules
- Stripe idempotency: https://docs.stripe.com/api/idempotent_requests
- Stripe webhooks: https://docs.stripe.com/webhooks
- Stripe custom amounts: https://docs.stripe.com/payments/checkout/pay-what-you-want
- Stripe Checkout tax: https://docs.stripe.com/tax/checkout
- Stripe pricing: https://stripe.com/pricing
- Supabase Cron: https://supabase.com/docs/guides/cron
- Supabase Queues: https://supabase.com/docs/guides/queues
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel Cron reliability: https://vercel.com/docs/cron-jobs/manage-cron-jobs
- GitHub Sponsors tiers: https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/managing-your-sponsorship-tiers
- Patreon gifting: https://support.patreon.com/hc/en-us/articles/31345065123597-Gifting-memberships-to-your-fans-creator-to-fan-gifts
- Discord Nitro gifting: https://support.discord.com/hc/en-us/articles/360020877112-Nitro-Gifting

No Stripe object, subscription, entitlement, database schema, production environment, deployment, or user data was changed by this research packet.
