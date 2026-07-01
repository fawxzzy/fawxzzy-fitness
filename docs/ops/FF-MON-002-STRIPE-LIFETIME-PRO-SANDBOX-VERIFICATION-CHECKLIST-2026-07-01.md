# FF-MON-002 - Stripe Lifetime Pro Sandbox Verification Checklist

Date: 2026-07-01
Card Title: `FF-MON-002 - Implement Stripe Lifetime Pro Purchase Flow`
Source row id: `16afd8c6-aab9-447d-ac9c-29126cc11843`
Forum thread title: `Feature: Payments - Implement Stripe Lifetime Pro Purchase Flow`

## Purpose

This checklist defines the exact proof required to move `FF-MON-002` from code-complete MVP into sandbox-verified truth.

It intentionally separates:

- proof already completed locally
- proof that still requires live Stripe sandbox configuration
- user-owned prerequisites versus agent-owned execution

## Proof Already Completed

The following is already true in repo state:

- billing schema migration exists:
  - `supabase/migrations/20260701183000_062_billing_lifetime_pro.sql`
- Stripe config reader is implemented
- Pro access settings lane is implemented
- checkout session route is implemented:
  - `POST /api/billing/checkout`
- Stripe webhook route is implemented:
  - `POST /api/billing/webhook/stripe`
- deterministic billing tests pass:
  - `src/lib/billing/stripe-config.test.ts`
  - `src/lib/billing/pro-access.test.ts`
- repo verification passes:
  - `npm run typecheck`
  - `npm run verify`

This means the remaining gap is no longer implementation ambiguity. It is live sandbox readiness and proof.

## User-Owned Prerequisites

These are the only meaningful things needed from the operator side before full sandbox proof can run:

### 1. Stripe sandbox env values must exist

Required:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_LIFETIME_PRO_FOUNDING_PRICE_ID`
- `STRIPE_LIFETIME_PRO_STANDARD_PRICE_ID`

Optional but recommended:

- `STRIPE_LIFETIME_PRO_ACTIVE_PRICE_MODE`
  - `founding`
  - `standard`

### 2. Billing migration must be applied on the active Supabase project

The active runtime must actually contain:

- `billing_customers`
- `billing_purchases`
- `user_entitlements`

### 3. Stripe webhook destination must be pointed at the live app route

Expected route:

- `/api/billing/webhook/stripe`

The configured webhook signing secret must match `STRIPE_WEBHOOK_SECRET`.

## Agent-Owned Verification Steps

Once the prerequisites exist, the remaining proof can be executed without further product design work.

### Lane A - Settings surface truth

Route:

- `/settings?section=pro`

Check:

- `Pro Access` section renders
- current status shows `Free` for a non-Pro account
- current offer label is truthful:
  - `Founding offer`
  - or `Standard offer`
- checkout readiness changes from `Not ready` to `Configured`
- no fallback billing-schema warning appears once migration is applied

Expected result:

- settings surface truthfully reflects configured billing state before any purchase starts

### Lane B - Checkout start proof

Action:

- open `Pro Access`
- click `Upgrade to Pro`

Check:

- app successfully calls `POST /api/billing/checkout`
- Stripe hosted checkout opens
- a pending purchase row is created with:
  - `purchase_kind = lifetime_pro`
  - `status = pending`
  - matching checkout session id

Expected result:

- checkout starts from authenticated user context only
- no false success state is shown before payment completes

### Lane C - Cancel-path proof

Action:

- start checkout
- cancel from Stripe Checkout

Check:

- user returns safely to `/settings?section=pro&billing=cancel`
- settings still shows `Free`
- no entitlement is granted
- cancel notice is truthful and bounded

Expected result:

- cancel flow never grants access and never misreports success

### Lane D - Successful purchase proof

Action:

- complete hosted checkout using Stripe sandbox payment details

Check:

- Stripe sends `checkout.session.completed`
- webhook verifies the signature successfully
- billing purchase row transitions to `completed`
- `user_entitlements` upserts:
  - `entitlement_key = pro_lifetime`
  - `status = active`
- `billing_customers` contains a user-to-customer mapping

Expected result:

- one successful checkout deterministically grants Lifetime Pro

### Lane E - Post-purchase UI truth

Route:

- `/settings?section=pro&billing=success`

Check:

- settings now shows:
  - `Lifetime Pro`
  - successful purchase status
  - granted timestamp if available
- no stale “next slice” messaging remains once entitlement is active

Expected result:

- payment truth and UI truth match immediately after webhook-backed completion

### Lane F - Relog persistence proof

Action:

- logout
- log back in
- reopen `/settings?section=pro`

Check:

- access state still shows `Lifetime Pro`
- no refresh loop or temporary downgrade appears

Expected result:

- entitlement survives session churn and reads from durable truth

### Lane G - Free-flow non-regression

Check:

- free user can still access normal app flows without upgrade
- no paid-only gate leaks into:
  - Today
  - Current Session
  - Routines
  - History
  - Settings core sections

Expected result:

- Pro purchase flow does not break free-user product access

## Evidence To Capture

Minimum receipts for closing the card:

1. settings screenshot before checkout
2. checkout-start proof
3. cancel-path screenshot/result
4. successful purchase proof
5. webhook receipt or verified entitlement data proof
6. settings screenshot after entitlement grant
7. relog persistence proof

## Pass / Fail Rules

### Blocker failures

Any of these keep `FF-MON-002` open:

- checkout cannot start
- checkout starts but no pending purchase receipt is written
- completed payment does not grant entitlement
- entitlement grants without a completed purchase
- success/cancel states lie to the user
- entitlement is lost after relog
- webhook signature verification cannot be proved

### Non-blocker follow-up

These can be handled after MVP if the core payment truth is correct:

- copy refinements
- extra upgrade marketing polish
- richer purchase history display
- customer portal or refund tooling

## Exact Answer To "Do I Need To Do Anything?"

Usually: yes, but only on the Stripe/runtime side.

What the operator may need to do:

- provision the Stripe sandbox keys and price ids
- ensure the webhook endpoint is configured in Stripe
- ensure the billing migration is applied on the active Supabase project

What the operator does **not** need to do:

- hand-write product test steps
- manually reason through entitlement logic
- manually audit the code path

Once the sandbox inputs exist, the remaining verification can be run as a bounded execution pass.

## Current Status

`FF-MON-002` is now in this state:

- implementation MVP: landed
- deterministic local proof: landed
- live sandbox proof: waiting on Stripe runtime configuration
