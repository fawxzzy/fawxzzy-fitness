# FF-MON-002 - Monetization Checkout Flow Audit

> SUPERSEDED CONTEXT NOTE: Lifetime Pro was abandoned. Current production direction is `$5/month` recurring Pro. Historical lifetime references below are audit context only.

Date: 2026-07-01
Card Title at audit start: `FF-MON-002 - Implement Stripe Lifetime Pro Purchase Flow`
Current source row id: `16afd8c6-aab9-447d-ac9c-29126cc11843`
Current board status at audit time: `confirmed`
Forum thread title at audit start: `Feature: Payments - Implement Stripe Lifetime Pro Purchase Flow`

Current implementation note:

- the original card/forum wording was `Lifetime Pro`
- the shipped app implementation now targets a recurring monthly Pro subscription flow
- treat lifetime-specific references below as historical audit context unless a section explicitly says otherwise

## Why This Audit Exists

`FF-QA-001 - Monetization Launch Smoke Test Checklist` is now defined as the final paid-launch gate.

That gate cannot become executable until the upstream monetization lane is real. The next blocking card by title is:

- `FF-MON-002 - Implement Stripe Lifetime Pro Purchase Flow`

This audit captures what is already shipped, what is still missing, and what the minimum viable implementation should be.

## Live Audit Findings

### Source contract

Current source-row acceptance criteria still expect:

- Stripe Checkout or equivalent simple Stripe flow
- founding and future price configurability
- successful purchase grants Pro entitlement
- failed or cancelled purchase returns safely
- webhook handling is verified if used
- entitlement survives logout and login
- payment state is visible in account and settings
- no paid-only gating breaks free flows unexpectedly

### Current app-code reality

Repo audit on 2026-07-01 found:

- no `stripe` SDK dependency in `package.json`
- no `@stripe/stripe-js` or `@stripe/react-stripe-js`
- no `src/lib/stripe.*` client
- no checkout route under `src/app/api/checkout/**` or `src/app/api/stripe/**`
- no webhook route under `src/app/api/webhook/stripe/**` or `src/app/api/webhooks/stripe/**`
- no account or settings surface that shows billing, payment, upgrade, Pro state, or entitlement state
- no current profile entitlement fields in `src/types/db.ts`
- no obvious billing tables or Stripe identifiers surfaced in the current typed DB model

### Surface audit

Verified current user-facing state:

- `/account` is only an alias redirect to `/settings`
- `/settings` has no payment or upgrade lane
- no clear Upgrade CTA or Lifetime Pro presentation exists in the product UI yet

## Shipped During This Pass

The repo no longer matches the empty-state audit above. The following MVP pieces are now landed in code:

- billing schema migration:
  - `billing_customers`
  - `billing_purchases`
  - `user_entitlements`
- Stripe env/config contract helpers in app code
- `Pro Access` settings section with:
  - current access state
  - offer mode surfacing
  - checkout readiness state
  - safe success/cancel return notice support
- guarded hosted checkout API contract:
  - `POST /api/billing/checkout`
- Stripe webhook entitlement contract:
  - `POST /api/billing/webhook/stripe`

Local proof already completed in this pass:

- `npm run typecheck`
- `npm run verify`

This means the remaining blocker is no longer “missing product code.” It is now primarily:

- Stripe env provisioning
- live Stripe sandbox verification
- final user-facing purchase success/cancel proof

## Current Overlap Versus Missing Work

### Already available and reusable

The app already has infrastructure that helps this lane:

- authenticated app shell and stable settings route
- deterministic routine, session, progression, and history model
- Discord card/forum workflow for operator tracking
- governed production deploy path through `_stack`
- release-gate doctrine in `FF-QA-001`

### Missing implementation classes

The real missing work is not polish. It is foundational:

1. payment provider integration
2. billing data model
3. entitlement grant path
4. purchase success/cancel/error UX
5. account/settings visibility
6. launch-proof verification for payment truth

## Recommended MVP Scope

This card should stay intentionally narrow. For V1, use:

- Stripe-hosted Checkout, not a custom card-entry form
- one-time lifetime Pro purchase only
- no subscriptions yet
- no customer portal requirement for this slice

Stripe's current hosted Checkout documentation still presents the full-page Checkout Sessions flow as the recommended low-complexity option, and Vercel Marketplace Stripe still supports fast sandbox provisioning for this style of integration.

## Recommended Data Model

Do not overload `profiles` with every billing fact. Use a small billing + entitlement model:

### 1. `billing_customers`

Purpose:
- map Fitness users to Stripe customers

Suggested fields:
- `user_id`
- `stripe_customer_id`
- `billing_email`
- timestamps

### 2. `billing_purchases`

Purpose:
- durable receipt and idempotency surface for completed or attempted lifetime purchases

Suggested fields:
- `id`
- `user_id`
- `purchase_kind` (`lifetime_pro`)
- `status`
- `stripe_checkout_session_id`
- `stripe_payment_intent_id`
- `stripe_customer_id`
- `stripe_price_id`
- `amount_total`
- `currency`
- `completed_at`
- `raw_event_id`
- timestamps

### 3. `user_entitlements`

Purpose:
- durable user-facing access truth

Suggested fields:
- `user_id`
- `entitlement_key` (`pro_lifetime`)
- `status` (`active`, optionally `revoked`)
- `granted_at`
- `granted_via_purchase_id`
- timestamps

This keeps:

- Stripe event facts
- purchase receipts
- product access truth

separate and auditable.

## Recommended UI Contract

### Entry surface

Add a minimal upgrade lane in Settings first.

Suggested first surface:
- a `Pro Access` settings card
- current status:
  - `Free`
  - `Lifetime Pro`
- one clear CTA:
  - `Upgrade to Pro`

### Purchase copy

Do not solve final pricing copy here beyond the essentials:

- product name
- current launch price
- optional future price config path
- short bullet list of what Pro unlocks

### Post-purchase routes

Need explicit routes or equivalent state surfaces for:

- success
- cancel
- failure / generic payment issue

Those surfaces must never falsely claim Pro access before webhook-backed entitlement is real.

## Recommended Technical Contract

### Stripe setup

Use the Vercel Marketplace Stripe integration path and standard env keys:

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

Add explicit app config for the product pricing:

- `STRIPE_LIFETIME_PRO_FOUNDING_PRICE_ID`
- `STRIPE_LIFETIME_PRO_STANDARD_PRICE_ID`
- one app-level selector for which price is active

### Checkout

Use a server-side create-session path that:

- requires an authenticated user
- ensures or creates a Stripe customer mapping
- creates a hosted Checkout Session in `mode: payment`
- binds metadata to the Fitness user id
- redirects the user to the returned Checkout URL

### Webhook

Use a Stripe webhook route with raw-body verification.

For MVP, the critical event is:

- `checkout.session.completed`

That webhook should:

1. verify signature
2. validate expected purchase kind
3. upsert the purchase receipt
4. grant `pro_lifetime` entitlement idempotently
5. leave a durable billing trail

### App read model

Add one reusable entitlement reader that can answer:

- does this user have active lifetime Pro
- what purchase granted it
- when it was granted

Settings should render from that read model instead of guessing from redirect params or client-only state.

## Recommended Verification Contract

Minimum proof required before `FF-MON-002` can be considered resolved:

1. local or sandbox checkout success proof
2. cancel-path proof
3. failure-path proof
4. webhook signature verification proof
5. durable entitlement proof after relog
6. settings/account visibility proof
7. explicit evidence that free flows still work without Pro

## Recommended Slice Order

### Slice 1 - Billing foundation

- install Stripe SDKs
- add Stripe env contract
- add billing and entitlement schema
- add typed DB support

### Slice 2 - Checkout path

- add upgrade CTA in Settings
- add hosted Checkout session creation
- add success/cancel return path

### Slice 3 - Entitlement truth

- add webhook route
- persist purchase receipt
- grant entitlement idempotently
- show payment state in Settings

### Slice 4 - Proof

- deterministic sandbox QA
- card/forum update
- release-gate dependency update for `FF-QA-001`

## Remaining Enablement Checklist

The next required operator steps are now concrete:

1. Provision the real Stripe env surface
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_LIFETIME_PRO_FOUNDING_PRICE_ID`
- `STRIPE_LIFETIME_PRO_STANDARD_PRICE_ID`
- optional explicit mode selector:
  - `STRIPE_LIFETIME_PRO_ACTIVE_PRICE_MODE`

2. Apply the billing migration to the active Supabase project
- verify the three billing tables exist
- verify RLS permits user-owned reads and service-role writes as intended

3. Run Stripe sandbox proof
- free user opens `Pro Access`
- checkout session opens correctly
- cancel returns to Settings safely
- completed checkout triggers webhook
- webhook grants `pro_lifetime`
- relog and reopen still show `Lifetime Pro`

4. Capture proof for `FF-QA-001`
- settings screenshot
- checkout start proof
- cancel proof
- webhook + entitlement proof
- relog persistence proof

## Decision

`FF-MON-002 - Implement Stripe Lifetime Pro Purchase Flow` should move to `in_progress`.

Reason:

- the implementation lane is not shipped
- the scope is now concrete enough to execute
- it is the next real blocker preventing `FF-QA-001` from becoming executable

## Immediate Next Move

Start the MVP on the first implementation slice only:

- billing schema
- Stripe client/env contract
- Settings upgrade entry surface

Do not jump straight to polishing copy or advanced billing UX before those three truths exist.
