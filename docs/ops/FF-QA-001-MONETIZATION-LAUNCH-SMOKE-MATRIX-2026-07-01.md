# FF-QA-001 Monetization Launch Smoke Matrix - 2026-07-01

## Current Launch Status

Live paid production is enabled for MVP soft launch.

Reason:

- Legal/operator risk posture is accepted for MVP; counsel review remains recommended before broader scale.
- Pro offer is aligned to capacity-only gates.
- Stripe sandbox checkout, Customer Portal proof, sandbox signed current-deploy webhook freshness, live env installation, guarded production redeploy, and `Live expired-session webhook proof only` are complete.
- Monitored support path is accepted as `fawxzzy@gmail.com`; app legal/pro surfaces point to it, and Stripe live Public details now show it as the customer support email.
- Live Stripe/Vercel/domain/webhook configuration is verified for MVP soft launch; live no-charge subscription webhook/entitlement proof, live no-charge Customer Portal route proof, sandbox no-money failed-payment/downgrade proof, sandbox no-money cancel-at-period-end source proof, one explicitly approved live paid checkout/customer-portal-cancel proof, accepted downgrade-equivalent proof, beta-skip risk acceptance, final guarded smoke, and explicit public-checkout enablement are closed.
- Supabase SECURITY DEFINER public execution hardening is closed for the three Discord/member-number internal maintenance functions. Internal Discord/support table access is also locked to service-role-only with explicit deny policies. `FF-SEC-001` is operator-accepted for MVP after leaked-password/PITR/MFA/backup-visibility risk acceptance and restore-readiness documentation; actual restore drill remains deferred.

Production paid checkout is enabled. Keep this matrix as the launch proof and rollback contract.

## Launch Gate Classes

Treat the remaining work as post-launch follow-up unless the operator changes the decision.

### 1. Accepted-Risk / Post-Launch Follow-Ups

- monitored support inbox: `fawxzzy@gmail.com`
- Stripe live Public details support email proof
- live Customer Portal settings proof
- Terms/Privacy policy links sourced through Public business information
- legal identity/governing-law/geography/health-privacy posture accepted as MVP operator risk, with counsel review recommended before broader scale
- `FF-BETA-001` intentionally deferred to post-launch learning
- downgrade-equivalent proof accepted for MVP; actual live post-period recheck remains a later audit after `2026-08-09`

### 2. Final Human-Proof Gate

- final whole-app launch-smoke execution is closed for MVP soft launch

### 3. Explicit Live-Money Enablement

- public-checkout enablement approval is closed
- final operator go/no-go on enabling public paid checkout is closed

## Required Execution Chain

Historical execution order:

1. Keep current billing/webhook source behind `PAID_LAUNCH_ENABLED=false`.
2. Confirm beta skip, legal risk, Supabase risk, and downgrade equivalent are recorded as accepted MVP risk.
3. Run the final `FF-QA-001` launch smoke.
4. Enable public paid checkout only after explicit approval.

This order is preserved as historical runbook context. Current production state is `PAID_LAUNCH_ENABLED=true`.

## Post-Launch Follow-Up Order

1. Monitor public checkout, webhook delivery, entitlement grant, Customer Portal, cancellation, and support signals.
2. Keep the bounded live paid smoke receipt as closed evidence:
   - successful bounded live checkout
   - subscription creation
   - entitlement grant
   - Customer Portal
   - cancel-at-period-end
   - bounded live paid-smoke runbook: `docs/ops/FF-MON-001-BOUNDED-LIVE-PAID-SMOKE-RUNBOOK-2026-07-08.md`
3. Recheck actual live post-period downgrade after the paid QA subscription period ends.
4. Run the post-launch beta learning loop.
5. Complete counsel/legal review before broader scale.

## Final Enable / Rollback Runbook

### Current invariant

Public paid checkout is enabled after final smoke and explicit approval:

```txt
PAID_LAUNCH_ENABLED=true
```

Expected behavior while enabled:

- `/settings?section=pro` shows Pro copy and legal links.
- Existing Pro users may manage billing through Customer Portal.
- Non-Pro users may start live `$5/month` Stripe Checkout.

### Enable action

Completed on `2026-07-09`:

1. Set production `PAID_LAUNCH_ENABLED=true`.
2. Redeploy the production app.
3. Verify `/settings?section=pro` can open live Stripe Checkout for a non-Pro account.
4. Verify the live Checkout page shows:
   - `Fawxzzy Fitness Pro Monthly`
   - `$5.00 / month`
   - live mode, not sandbox/test mode
   - Terms and Privacy links
   - support path `fawxzzy@gmail.com`
5. Do not use test cards on the live Checkout page.

### Rollback action

If final smoke or post-enable monitoring finds a blocker:

1. Set production `PAID_LAUNCH_ENABLED=false`.
2. Redeploy the production app.
3. Verify checkout creation fails closed with `BILLING_CHECKOUT_LAUNCH_DISABLED`.
4. Keep existing subscriber management available through Customer Portal.
5. Record the blocker against `FF-QA-001` before attempting re-enable.

## Purpose

`FF-QA-001` is the final paid-launch release gate for Fitness.

This lane is not a generic exploratory QA pass. It exists to answer one operator question:

`Can we safely ask a stranger to sign up, trust progression, complete workouts, and pay for Pro without breaking trust or state truth?`

## Current Scope Decision

As of `2026-07-01`, this card should be treated as:

- `launch gate defined`
- not `launch gate executed`

Reason:

- the launch-smoke doctrine can be made deterministic now
- several upstream launch blockers are still not fully closed
- the executable launch pass was completed on `2026-07-09`; this document now preserves the proof and rollback contract

This matrix is therefore the canonical contract for the future launch pass, not evidence that launch has already cleared.

## Source Inputs

- `docs/ops/FITNESS-MONETIZATION-ROADMAP.md`
- seeded roadmap card `FF-QA-001`
- current repo implementation scan on `2026-07-01`
- existing PWA doctrine and offline audit:
  - `docs/ops/FF-PWA-002-MVP-DOCTRINE-2026-06-30.md`
  - `docs/ops/FF-PWA-002-MVP-CROSSWALK-2026-06-30.md`
  - `docs/ops/FF-PWA-002-OFFLINE-PWA-AUDIT-2026-06-30.md`

## Execution Preconditions

This launch matrix is only executable when the blocker lane below is materially shipped and truth-backed:

- `FF-CORE-001` progression engine V2
- `FF-CORE-002` routine builder paid-user polish
- `FF-PWA-001` install experience and onboarding
- `FF-LEGAL-001` privacy policy and terms of service
- `FF-MON-002` Stripe Pro subscription checkout flow
- `FF-MON-001` monetization readiness gate
- `FF-SEC-001` Supabase production hardening before paid launch

Additional operator note:

- As of `2026-07-01`, `FF-CORE-001`, `FF-CORE-002`, `FF-PWA-001`, `FF-LEGAL-001`, and `FF-MON-002` are already proof-closed.
- `FF-BETA-001` is deferred by explicit operator MVP risk acceptance.
- `FF-MON-001` remained the truthful umbrella gate until final smoke proof and public-checkout enablement were completed on `2026-07-09`.
- As of `2026-07-06`, `FF-MON-001` has additional proof for recurring Pro app UI, production env-name alignment, corrected Stripe sandbox webhook destination, and signed webhook delivery with `pending_webhooks=0`; the remaining proof gap is human-operated hosted checkout completion because Stripe hCaptcha blocks truthful autonomous payment entry.
- As of `2026-07-07`, live paid launch was still `no-go` until the business/legal and billing-proof blockers were closed or explicitly accepted by the operator: final business entity, launch geography, counsel review of accepted refund/deletion posture, health-data exposure review, signed live Stripe/Customer Portal/webhook verification, and keep/main Vercel project/domain verification.
- As of `2026-07-07`, the stable Vercel alias is verified on fresh deployment `dpl_2rrQPh4hjDsG1eat8vvtQdvQxnhD`, and the webhook route fail-closes without a Stripe signature. The remaining webhook freshness proof is a signed Stripe Dashboard resend or new sandbox checkout event hitting that fresh deployment.
- As of `2026-07-07`, `/privacy` and `/terms` return `200` without auth cookies on the stable production alias and include the interim private-support/legal-warning copy required for checkout review.
- As of `2026-07-07`, Stripe Dashboard resend of `evt_1Tqeg71z3plnI3SEbX5Ax7uv` proof-closed sandbox current-deploy signed webhook freshness: Dashboard showed a fresh `200 OK` manual retry, Vercel production logs showed `POST /api/billing/webhook/stripe` returning `200` on deployment `dpl_2rrQPh4hjDsG1eat8vvtQdvQxnhD`, and Supabase stored `raw_event_id = evt_1Tqeg71z3plnI3SEbX5Ax7uv` with `purchase_kind = pro_subscription`.
- As of `2026-07-08`, the monitored support path is accepted as `fawxzzy@gmail.com`; app legal/pro surfaces point to it, Stripe live `Business details > Public details` shows it as `Support email`, and live Customer Portal settings still show Terms/Privacy policy links sourced from Public business information.
- As of `2026-07-07`, live Stripe config audit is captured at `docs/ops/FF-MON-001-LIVE-STRIPE-CONFIG-AUDIT-2026-07-07.md`; the live product was renamed to `Fawxzzy Fitness Pro Monthly`, live webhook destination `we_1Tqldd1n5lBbRYoVkvltrp1J` is the single enabled live endpoint for the stable production alias, Vercel production live publishable keys, live server key, live webhook secret, recurring price id, and price mode were refreshed, and Stripe public business Terms/Privacy URLs were persisted.
- As of `2026-07-07`, production redeploy and no-charge live expired-session smoke are proof-closed: deployment `dpl_HZKzo5XwakgyBj1KGBdpNS1HbK1R` is aliased at `https://fawxzzy-fitness-local.vercel.app`; live Checkout Session `cs_live_a1EQzcOj0aivMIdcA3kF04VXa2WB9AgxFRqFtgqCCsUVrOLTxSsAxPLHIZ` was created and immediately expired unpaid; Stripe event `evt_1TqmOH1n5lBbRYoVW3er3wW4` reached `pending_webhooks=0`; Vercel logs showed `POST /api/billing/webhook/stripe` returned `200`.
- As of `2026-07-08`, `Live expired-session webhook proof only` was rechecked read-only: event `evt_1Tqm4f1n5lBbRYoV2npIrzV0` was `livemode=true`, type `checkout.session.expired`, Checkout mode `subscription`, status `expired`, payment status `unpaid`, `pending_webhooks=0` with no pending delivery remaining at readback time, and no customer, subscription, payment, or live charge created.
- As of `2026-07-08`, source-side `invoice.payment_failed` handling is implemented through the shared subscription-status policy. Stripe Dashboard event-list enablement is closed for live and sandbox endpoints, and sandbox endpoint readiness passes with `missingEvents: []`. Deployment proof and sandbox/live failed-payment event proof remain open.
- The `2026-07-08` live event receipt closes only `Live expired-session webhook proof only`. It does not prove successful checkout, subscription creation, `invoice.paid` handling, entitlement grant, Customer Portal access from app UI, cancel-at-period-end, subscription deletion/downgrade, failed payment handling, refund/support/deletion operations, beta readiness, or final paid smoke.
- As of `2026-07-08`, server-side failed-payment proof was probed and intentionally left open: `pm_card_chargeDeclined` fails at Customer attach/create time, raw server-side use of the special subscription failure card is disabled, and natural `invoice.payment_failed` proof still requires a Stripe-hosted/client-side card collection path or Dashboard/test-clock setup.
- As of `2026-07-08`, `PAID_LAUNCH_ENABLED` was added as a fail-closed checkout-start guard. The guard lets webhook-capable source be deployed for proof while public checkout stays disabled unless explicitly enabled.
- As of `2026-07-08`, production live no-charge subscription proof is closed on deployment `dpl_3Xo7X5nH9ptykwXvxB3cSPVxAiRs`: signed live webhook probe returned `200`, live trial subscription `sub_1Tr5Zu1n5lBbRYoVAOjev7wQ` delivered `customer.subscription.created` with `pending_webhooks=0`, the app wrote `pro_subscription` purchase and `pro` entitlement truth, and temporary Stripe/Supabase QA data was removed.
- As of `2026-07-08`, production live no-charge Customer Portal route proof is closed: the app-started `POST /api/billing/portal` on the stable alias returned `200`, `ok: true`, and a Stripe-hosted portal URL for temporary no-charge subscription customer `cus_UqoDlhRQQul9jN`; Vercel request id `32749d04-0c69-42cb-bb62-35df073c4d74`; no payment method/card/charge was used; temporary Stripe/Supabase QA data was removed.
- As of `2026-07-08`, deterministic failed-payment policy tests pass for `past_due`, `paused`, `unpaid`, `incomplete`, and `incomplete_expired` subscription states. Natural Stripe-delivered `invoice.payment_failed` lifecycle proof remains open.
- As of `2026-07-09`, no-money sandbox lifecycle proof is closed for local/source behavior. `npm run qa:stripe:lifecycle-proof -- --apply --cleanup` created sandbox subscriptions against price `price_1ToVq11z3plnI3SE2fXGZOW5`, proved app-started Customer Portal route creation, replayed `customer.subscription.updated` with `cancel_at_period_end=true`, proved Pro stays active through the paid window, generated real sandbox `invoice.payment_failed` event `evt_1TrBmP1z3plnI3SE0cmkqbZp` with a Stripe test clock and `pm_card_chargeCustomerFail`, replayed it locally with a valid Stripe signature, and verified `user_entitlements.status=revoked` once the billing window was expired. Temporary Stripe and Supabase QA data was removed.
- As of `2026-07-09`, bounded live paid smoke is closed for one explicitly approved `$5/month` live subscription. Live QA account `atlas-fitness-live-paid-smoke@fawxzzy.test` completed Checkout Session `cs_live_a10u8ZHl7q2gQszAO07cqzGLMBrQAxPpVToGBPAaMcqH1G0aJ1r6F5za3m`, customer `cus_Uqsoov3SXetpJ3`, subscription `sub_1TrBAy1n5lBbRYoVnmxAwmFx`, price `price_1ToU8R1n5lBbRYoV3VmWk3n6`; Customer Portal cancellation at period end was completed; the app shows Pro active through `2026-08-09`.
- As of `2026-07-09`, the live paid smoke exposed duplicate subscription purchase receipts; this was fixed before closeout. Production Supabase was deduped, unique partial index `billing_purchases_subscription_uq` was applied for `pro_subscription` rows by `stripe_subscription_id`, webhook receipt canonicalization/merge/delete handling was deployed on `dpl_ChzYfyQjfdagrpdYaev28LvQHert`, and post-deploy readback showed `duplicate_groups = 0`, `qa_receipts = 1`, and `qa_active_entitlements = 1`.
- As of `2026-07-09`, Supabase production hardening card `FF-SEC-001` was created. Migration `20260709072134_harden_discord_security_definer_execute` revoked public/anon/authenticated direct `EXECUTE` from the three internal Discord/member-number SECURITY DEFINER functions while preserving `service_role` execution. Migration `20260709073257_harden_discord_internal_table_access` revoked public API table grants from ten internal Discord/support tables and added explicit deny policies for `anon` and `authenticated`. Migration `20260709074946_supabase_performance_advisor_safe_indexes` closed three unindexed foreign-key findings and one duplicate-index finding.
- As of `2026-07-09`, the operator accepted MVP launch risk for leaked password protection remaining disabled, unverified MFA proof, deferred PITR, and unverified backup visibility. Restore-readiness posture is recorded in `FF-SEC-001`; an actual restore drill remains deferred and must not be claimed as tested.
- As of `2026-07-09`, the operator accepted the existing sandbox/test-clock downgrade proof as the MVP equivalent for the live post-period downgrade wait. Do not claim the actual live `2026-08-09` downgrade happened until it is rechecked after that date.
- As of `2026-07-09`, the operator explicitly deferred `FF-BETA-001` for MVP and accepted the risk of launching without 10-20 real beta-user proof.
- As of `2026-07-09`, guarded smoke subset proof passed. Receipt: `docs/ops/FF-QA-001-GUARDED-SMOKE-PROOF-2026-07-09.md`. Closed in that subset: public legal/install route availability, protected route auth smoke, live Stripe webhook endpoint readiness, billing policy tests, Pro capacity gating, protected mobile-width visual captures, and fail-closed checkout guard while `PAID_LAUNCH_ENABLED=false`.
- Current state: `MVP Soft Launch Enabled`; public checkout enablement is closed. Closed/defined: monitored support inbox `fawxzzy@gmail.com`, Stripe live public support email proof, live Customer Portal settings proof, draft refund/cancellation/deletion posture, sandbox checkout, sandbox Customer Portal proof, source-side failed-payment handler support, deterministic failed-payment policy tests, failed-payment automation-boundary proof, sandbox no-money failed-payment/downgrade proof, sandbox no-money cancel-at-period-end source proof, paid-launch-disabled checkout guard, guarded production deploy proof, live no-charge subscription webhook/entitlement proof, live no-charge Customer Portal route proof, live/sandbox failed-payment webhook event-list enablement, one bounded live paid checkout/charge proof, live paid Customer Portal cancel-at-period-end proof, live receipt dedupe repair, Supabase SECURITY DEFINER public execute revokes, internal Discord/support table service-role lockdown, `FF-SEC-001` accepted-risk closure for MVP, accepted downgrade-equivalent proof, beta-skip risk acceptance, protected visual smoke, and public checkout-start proof. Still open as post-launch follow-up: actual live post-period downgrade recheck, beta learning, counsel review before broader scale, restore drill, and monitoring.
- As of `2026-07-09`, public paid checkout was enabled after explicit approval. Receipt: `docs/ops/FF-QA-001-PUBLIC-CHECKOUT-ENABLEMENT-PROOF-2026-07-09.md`. Production deployment `dpl_8CuUJWAK1VHZFHhKmm46zj3ECji6` is aliased at `https://fawxzzy-fitness-local.vercel.app`; `PAID_LAUNCH_ENABLED=true`; route/auth/webhook checks passed; temporary live free-account checkout-start proof returned a `$5/month` subscription Checkout Session, which was expired unpaid and cleaned up; generated live expiration event `evt_1TrKPm1n5lBbRYoVQ1TboDND` had `pending_webhooks=0`.

## Severity Contract

Every smoke lane result must be tagged with exactly one severity:

- `blocker`
  - launch cannot proceed
  - any failure in auth, payment, entitlement, legal links, session truth, or state-corruption paths defaults here
- `high`
  - launch should not proceed without an explicit operator exception
  - major UX confusion, unstable onboarding, progression-truth mismatch, or mobile breakage on a core route
- `medium`
  - fix before scale push when practical
  - not launch-fatal by itself, but creates trust drag or support burden
- `low`
  - cosmetic or polish-only
  - safe to ship if documented

## Evidence Contract

Every executed lane must record:

- route or surface checked
- account used
- environment used
- device class
- expected outcome
- actual outcome
- pass or fail
- severity if failed
- screenshot, capture, or operator note

Minimum artifact line per executed step:

```text
[PASS|FAIL] lane / step | account | route | device | expected | actual | evidence
```

## Launch Matrix

### 1. Auth / Entry

Goal:

- prove a new or returning user can enter the product without false auth state

Checks:

- fresh signup succeeds
- returning login succeeds
- expired session recovers cleanly
- logout then relog works
- no redirect loops
- protected routes do not false-pass unauthenticated

Default failure severity:

- `blocker`

Required evidence:

- login route
- post-auth landing route
- one logout and relog receipt

### 2. Onboarding / Install

Goal:

- prove the app installs, restores, and explains offline/install behavior truthfully

Checks:

- install prompt behavior is correct on supported mobile-capable surfaces
- standalone launch works
- first launch lands on a valid surface
- session restore after relaunch works
- offline fallback messaging does not mislead users

Primary launch routes to prove:

- `/install?installContext=android-chrome`
- `/install?installContext=ios-safari`
- `/install?installContext=desktop-windows-edge`
- `/install?installContext=desktop-windows-chrome`
- `/install?installContext=desktop-macos-safari`
- `/install?installContext=desktop-macos-chrome`
- `/install?installContext=desktop` as generic fallback only

Default failure severity:

- install or restore breakage: `high`
- misleading offline state or false claims: `blocker`

Required evidence:

- browser mode screenshot
- standalone/PWA screenshot
- one offline fallback receipt

### 3. Routine / Workout Creation

Goal:

- prove core setup flows do not corrupt data before the user ever trains

Checks:

- create routine from blank works
- duplicate routine works
- create workout plan works
- duplicate reusable workout plan/template flow works
- edit and save flows persist
- reorder, delete, duplicate, and create flows do not corrupt state

Default failure severity:

- corruption, wrong saves, duplicate truth drift: `blocker`
- ordinary editor bug: `high`

Required evidence:

- one blank routine flow receipt
- one duplicate routine flow receipt
- one workout plan create/edit receipt

### 4. Workout Execution

Goal:

- prove a user can actually train and finish a session without data loss

Checks:

- Today opens the correct workout
- Start Workout creates or resumes the correct session
- set logging works
- current target updates correctly
- session completion writes correct history and state
- hide, skip, complete, and resume behaviors remain truthful

Default failure severity:

- data loss, wrong session truth, wrong workout loaded: `blocker`
- state lag or visual truth mismatch: `high`

Required evidence:

- Today route receipt
- Current Session receipt
- completion receipt
- history receipt for the same session

### 5. Progression Truth

Goal:

- prove the product’s paid core value stays coherent before, during, and after the workout

Checks:

- progression state is visible before session
- progression state is visible during session
- progression state is visible after session
- manual vs auto truth is correct
- history, today, session, and recap surfaces agree
- user can understand the next recommended target

Default failure severity:

- recommendation truth wrong or contradictory: `blocker`
- explanation continuity weak or unclear: `high`

Required evidence:

- one exercise shown across Today, Session, and History
- one progression recommendation receipt
- one progression recap receipt

### 6. Payments / Pro Access

Goal:

- prove the paid lane is safe, bounded, and reversible

Checks:

- Pro copy presents the current offer as capacity-only: unlimited routines and unlimited saved workout plans
- Free copy presents the current limits: 3 routines and 14 saved workout plans
- Pro copy does not claim advanced progression, progression receipts, review tools, coaching, AI coaching, or medical-grade guidance
- Stripe checkout success grants Pro
- checkout cancel returns safely without false entitlement
- checkout failure is handled clearly
- entitlement reflects in UI immediately or with a bounded refresh
- returning Pro user keeps entitlement after relog and reopen
- free users do not get accidental Pro access
- Manage Billing opens Stripe Customer Portal from the app
- cancel-at-period-end preserves Pro through the paid period
- expired/canceled access downgrades after the entitlement window ends

Default failure severity:

- every failure here is `blocker`

Required evidence:

- success path receipt
- cancel path receipt
- failure path receipt
- entitlement persistence receipt

### 7. Legal / Trust

Goal:

- prove paid and account surfaces are not missing basic legal trust requirements

Checks:

- Privacy Policy link works
- Terms of Service link works
- links open the intended destination on mobile and desktop
- paid flow does not surface missing legal links

Default failure severity:

- missing or broken legal links on paid surfaces: `blocker`

Required evidence:

- route + destination proof for each link

### 8. Mobile View

Goal:

- prove the core paid-launch surfaces are visually stable on mobile

Required routes:

- login or signup
- today
- current session
- routines
- workout plans
- account
- payment or upgrade surfaces

Checks:

- no critical truncation
- no overlap
- no hidden primary action
- no false spacing that breaks trust or completion

Default failure severity:

- broken primary action or unreadable core state: `high`
- major paid-surface breakage: `blocker`

Required evidence:

- one screenshot per route family
- note of viewport used

### 9. History / State Truth

Goal:

- prove completed activity remains auditable after the session ends

Checks:

- completed session appears in history
- notes and feedback persist
- progression receipt remains consistent
- no duplicate, missing, or stale wrong state after relaunch

Default failure severity:

- wrong or missing history truth: `blocker`

Required evidence:

- session completion route
- history list receipt
- history detail receipt

### 10. Rollback / Go-No-Go

Goal:

- make launch decisions deterministic instead of emotional

Checks:

- rollback owner is named
- rollback path is written
- blocker-class failures stop launch
- any operator exception is explicitly recorded

Default failure severity:

- missing rollback or no-go doctrine: `blocker`

Required evidence:

- named rollback command or operator path
- written final release decision note

## Pass Rules

The launch gate can only pass when:

- no `blocker` failures exist
- `FF-SEC-001` launch-blocking security items are closed or explicitly accepted as risk; actual restore-drill proof may remain deferred if recorded as an accepted MVP risk
- no unreviewed `high` failures exist
- the payment and entitlement lane is fully executed
- the legal links lane is fully executed
- Today, Session, History, and progression truth all agree on the same completed proof session

## Stop-Ship Rules

Launch must stop immediately if any of the following are observed:

- user can pay but does not get Pro
- user gets Pro without paying
- user loses workout or session state during first-use flows
- progression recommendation truth is wrong on a paid-value surface
- legal or payment surfaces are missing required links or contract text
- mobile launch-critical routes are unusable

## Suggested Execution Order When Unblocked

1. Auth / Entry
2. Onboarding / Install
3. Routine / Workout Creation
4. Workout Execution
5. Progression Truth
6. Payments / Pro Access
7. Legal / Trust
8. Mobile View
9. History / State Truth
10. Rollback / Go-No-Go closeout

## Closeout Receipt Contract

When the gate is eventually executed, the operator packet should end with:

- launch date
- build or commit
- environment
- accounts used
- blocker summary
- high summary
- final recommendation:
  - `GO`
  - `GO WITH EXPLICIT EXCEPTIONS`
  - `NO-GO`

## Current Recommendation

Current card recommendation on `2026-07-01`:

- move `FF-QA-001` to `in_progress`
- point the card to this matrix as the canonical launch-gate contract
- do not mark the card `resolved`
- do not run the full gate until `FF-MON-001` confirms all upstream proof/risk-acceptance items are recorded and public checkout remains disabled
