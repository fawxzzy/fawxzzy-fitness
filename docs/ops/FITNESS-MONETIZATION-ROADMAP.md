# Fitness Monetization Roadmap

## Current Launch Status

Live paid production is enabled for MVP soft launch.

Reason:

- Legal/operator risk posture is accepted for MVP; counsel review remains recommended before broader scale.
- Pro offer is aligned to capacity-only gates.
- Stripe sandbox checkout and Customer Portal proof are complete.
- `Live expired-session webhook proof only` is proof-closed for expired unpaid subscription checkout events.
- Monitored billing/privacy/deletion support path is accepted as `fawxzzy@gmail.com`; app legal/pro surfaces and Stripe live Public details now point to it.
- Live Stripe/Vercel/domain/webhook configuration is proof-closed for the current stable production alias.
- Live no-charge subscription webhook proof is closed: production processed a live trial subscription event into Pro purchase/entitlement truth, then temporary data was removed.
- Live no-charge Customer Portal route proof is closed: the app-created portal route returned a Stripe-hosted portal URL for a temporary active no-charge subscription customer, then temporary data was removed.
- Sandbox no-money lifecycle proof is closed: test-clock `invoice.payment_failed` downgraded/revoked Pro when the billing window was expired, and app-started Customer Portal cancel-at-period-end preserved Pro through the paid period.
- Stripe launch completion report is captured at `docs/ops/FF-MON-001-STRIPE-LAUNCH-COMPLETION-REPORT-2026-07-09.md`; it keeps the distinction between implementation wiring, no-money proof, and final live paid proof.
- Current billing/webhook source is deployed with `PAID_LAUNCH_ENABLED=true` after explicit operator approval.
- Deployed sandbox no-money free-trial proof is closed: production processed a Stripe-delivered test trial subscription into Pro purchase/entitlement truth after separate sandbox/test webhook secret configuration and redeploy.
- Deployed sandbox failed-payment proof is closed: production processed Stripe-delivered `invoice.payment_failed` into `billing_purchases.status=pending` while preserving active Pro through the future access window.
- Bounded live paid checkout and Customer Portal cancel-at-period-end proof are closed for one explicitly approved `$5/month` QA subscription.
- Supabase SECURITY DEFINER public execution hardening is closed for the three Discord/member-number maintenance functions through migration `20260709072134_harden_discord_security_definer_execute`.
- Supabase internal Discord/support table access is locked to service-role-only with explicit deny policies through migration `20260709073257_harden_discord_internal_table_access`.
- Supabase launch-risk acceptance is recorded for leaked password protection, MFA proof, PITR, and backup-visibility proof; restore-readiness posture is recorded, while an actual restore drill remains deferred.
- Supabase P1 performance cleanup closed the launch-adjacent unindexed foreign-key findings and duplicate index finding through migration `20260709074946_supabase_performance_advisor_safe_indexes`.
- Public paid checkout enablement proof is closed in `docs/ops/FF-QA-001-PUBLIC-CHECKOUT-ENABLEMENT-PROOF-2026-07-09.md`.

Production paid checkout is live for the MVP soft-launch path. Continue monitoring billing, webhook, entitlement, support, cancellation, and account-deletion behavior during the first real-user wave.

This doc is the operator summary for the monetization-readiness card set seeded into the Feedback Board.

Board status mapping:
- Prompt-level `Planned` cards are stored as board status `confirmed` plus the `Backlog` tag because the bounded feedback schema does not expose a dedicated `planned` status.
- Card sequencing lives in `card_id`, `card_phase`, `card_priority`, `depends_on`, and `dependency_notes`.
- Discord forum threads are render targets. The repo-owned roadmap data and seeded feedback rows remain the source of truth.

Canonical operator command:

```bash
npm run feedback:monetization:seed -- --apply
```

Board targeting:
- monetization roadmap cards belong on the dedicated `#fawxzzy-fitness` forum, not the general `#feedback` forum
- prefer `DISCORD_FITNESS_FEEDBACK_FORUM_CHANNEL_ID` as the default target
- use `--forum-channel-id <forumId>` only for an intentional one-off override

Dry-run command:

```bash
npm run feedback:monetization:seed
```

## Launch Blockers

Paid launch blocker cards now proof-closed for MVP:
- `FF-CORE-001` Complete Progression Engine V2
- `FF-CORE-002` Polish Routine Builder for Paid-User Readiness
- `FF-PWA-001` Complete Install Experience and Onboarding
- `FF-LEGAL-001` Add Privacy Policy and Terms of Service
- `FF-MON-002` Implement Stripe Pro Subscription Checkout Flow
- `FF-SEC-001` Supabase Production Hardening Before Paid Launch
- `FF-MON-001` Monetization Readiness Gate
- `FF-QA-001` Monetization Launch Smoke Test Checklist

Go or no-go framing:
- A stranger should be able to onboard, build or select a routine, complete workouts, understand progression value, install or use the app confidently, and pay safely.
- Retention enhancers, social work, and deeper intelligence follow after the launch blockers are clear.

## Implementation Order

Recommended order:
1. `FF-CORE-001` Complete Progression Engine V2
2. `FF-CORE-002` Polish Routine Builder for Paid-User Readiness
3. `FF-PWA-001` Complete Install Experience and Onboarding
4. `FF-LEGAL-001` Add Privacy Policy and Terms of Service
5. `FF-MON-002` Implement Stripe Pro Subscription Checkout Flow
6. `FF-SEC-001` Supabase Production Hardening Before Paid Launch
7. `FF-MON-003` Define Pro Plan Pricing and Gated Value Copy
8. `FF-MON-004` Design Subscriber-Count Community Pricing
9. `FF-MON-005` Add Optional Support Fawxzzy Payments
10. `FF-MON-001` Monetization Readiness Gate
11. `FF-QA-001` Monetization Launch Smoke Test Checklist
12. `FF-QA-002` Harden Atlas Contracts and CI Environment Verification
13. `FF-BETA-001` Run 10-20 Real User Beta Before Paid Push
14. `FF-RET-001` Add Calendar View
15. `FF-RET-004` Add Weekly and Monthly Progress Summaries
16. `FF-RET-002` Add Workout Streaks
17. `FF-RET-003` Add Consistency Heatmap
18. `FF-PWA-003` Expand Earned Install Promotion Moments
19. `FF-ENGINE-001` Build Curated Workout Engine V1
20. `FF-ONBOARD-001` Ship Curated Onboarding Intake And Generator Handoff
21. `FF-RECAP-001` Ship Shareable Workout Recap Artifacts
22. `FF-ANALYTICS-002` Add Premium Cycle Analytics Preview Placement
23. `FF-MKT-001` Founding User Launch Plan
24. `FF-ANALYTICS-001` Add Active User and Product Usage Statistics
25. `FF-ENGINE-002` Expand Curated Workout Engine Beyond V1
26. `FF-GAM-001` Add Achievements and Badges
27. `FF-SOC-001` Explore Social Features
28. `FF-SOC-002` Add Gifted Pro Subscription Credits
29. `FF-PROG-001` Ship Today And Routines Progression Updates Surface
30. `FF-ACCOUNT-001` Add Account Workout Data Export

Backfilled shipped cards:
- `FF-PROG-001` and `FF-ACCOUNT-001` stay in the roadmap for coverage, but they are intentionally placed below active future implementation lanes so resolved work does not crowd the live queue.

Do not start yet:
- `FF-ENGINE-002` waits on `FF-ENGINE-001` and `FF-RET-004`.
- `FF-GAM-001` waits on retention loops.
- `FF-SOC-001` waits on the paid core plus legal clarity.
- `FF-MON-004` direction is operator-accepted and waits for the active Fitness review/iteration chain plus its bounded implementation admission.
- `FF-MON-005` direction is operator-accepted and waits for the active Fitness review/iteration chain plus its bounded implementation admission.
- `FF-SOC-002` waits on accepted social identity/privacy rules and `FF-MON-004` price-snapshot semantics.

## 2026-07-14 Community Monetization Planning

- `FF-MON-004` owns subscriber-count community pricing. The first proposal permanently ratchets down from `$5` to `$4` at 1,250 paid subscribers, `$3` at 1,667, `$2` at 2,500, `$1` at 5,000, and a `$0.50` floor at 10,000.
- A `$0.01` recurring USD charge is not viable: Stripe's standard minimum non-zero USD charge is `$0.50`, and fixed transaction fees make micro-monthly billing inefficient.
- At the `$0.50/month` equivalent floor, `$6/year` is the preferred planning option because one annual transaction preserves much more of the same gross revenue than twelve monthly transactions.
- `FF-MON-005` owns optional one-time Support Fawxzzy payments. This is separate from subscriptions, grants no additional entitlement, and must not be described as a charitable or tax-deductible donation.
- `FF-SOC-002` owns gifted Pro months after social identity exists. A one-time gift snapshots the current community price and creates whole recipient-month credits in an app-owned entitlement ledger.
- These cards are Planning only. No Stripe price, subscription, entitlement, production environment, deployment, or user data was changed during admission.

### Operator Acceptance And Delivery Research

- On 2026-07-14 the operator accepted the proposed pricing ladder, permanent downward-only behavior, `$3` support minimum, `$5/$10/$25` support presets, Settings/Account placement, direct-recipient gifting first, and a community pool later.
- Implementation remains sequenced behind the already-open Fitness review and iteration chain. Acceptance does not authorize interleaving billing work into those shared branches.
- The selected pricing architecture uses immutable Stripe Prices, seven consecutive daily threshold snapshots, an append-only community-price epoch, next-invoice monthly migration with `proration_behavior=none`, and a durable idempotent migration ledger.
- Monthly subscribers are never silently converted to annual billing. Any annual low-price option requires explicit user opt-in.
- Support uses a separate one-time Checkout and never writes Pro entitlement state.
- The first gifting release excludes actively renewing Pro recipients until paid-period overlap semantics are separately accepted and proven.
- Full delivery and UI pattern research: `docs/ops/FF-COMMUNITY-MONETIZATION-DELIVERY-RESEARCH-2026-07-14.md`.

## 2026-07-07 Card Reconciliation

- `FF-MON-002` is now scoped to the current `$5/month` recurring Stripe Pro subscription flow, not the earlier lifetime/founding purchase concept.
- `FF-MON-003` is now scoped to Pro plan pricing, renewal/cancellation copy, and gated-value copy, not founding lifetime offer copy.
- Current Pro value is a capacity tier only: unlimited routines and unlimited saved workout plans.
- Do not market Pro as advanced progression, progression receipts, review tools, coaching, AI coaching, or medical-grade guidance unless a later card explicitly implements and verifies those gates.
- `FF-MON-001` remained the umbrella readiness gate until final smoke and explicit public-checkout enablement were completed on `2026-07-09`.
- `FF-QA-001` remains the paid-launch proof contract and rollback checklist.
- Launch call after the `2026-07-09` enablement is MVP Soft Launch Enabled.

## 2026-07-08 Live Expired-Session Webhook Proof Only

- Read-only Stripe API proof retrieved live event `evt_1Tqm4f1n5lBbRYoV2npIrzV0`.
- Event type: `checkout.session.expired`.
- Event mode: live.
- Checkout Session mode: `subscription`.
- Checkout Session status: `expired`.
- Payment status: `unpaid`.
- Customer: none.
- Subscription: none.
- Pending webhooks: `0`, meaning no pending delivery remained at readback time.
- Live webhook endpoint remains enabled at `https://fawxzzy-fitness-local.vercel.app/api/billing/webhook/stripe`.
- Enabled events remain:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- Source follow-up on `2026-07-08` added first-class `invoice.payment_failed` handling.
- Stripe Dashboard browser proof on `2026-07-08` expanded both live and sandbox webhook endpoints to include `invoice.payment_failed`.
- Reusable endpoint proof command exists: `npm run qa:stripe:webhook-readiness -- --json`; the sandbox check now passes with `missingEvents: []`.
- No live payment was completed and no real customer was charged.

Interpretation:

- Closed only: `Live expired-session webhook proof only`.
- It does not prove successful checkout, subscription creation, invoice paid handling, entitlement grant, Customer Portal access from an app-started live paid customer, cancel-at-period-end, failed payment handling, refund handling, support operations, deletion operations, or final downgrade behavior.
- Live paid production remains guarded behind final QA.

Current state: `MVP Soft Launch Enabled`, with public checkout enabled.

Closed/defined: monitored support inbox `fawxzzy@gmail.com`, Stripe live public support email proof, live Customer Portal settings proof, draft refund/cancellation/deletion posture, sandbox checkout, sandbox Customer Portal proof, source-side failed-payment handler support, deterministic failed-payment policy tests, server-side failed-payment automation-boundary proof, paid-launch-disabled checkout guard, guarded production deploy proof, source support for separate live/test webhook signing secrets, deployed sandbox no-money free-trial proof, deployed sandbox failed-payment proof, live no-charge subscription webhook/entitlement proof, live no-charge Customer Portal route proof, sandbox no-money test-clock failed-payment/downgrade proof, sandbox no-money Customer Portal cancel-at-period-end source proof, live/sandbox failed-payment webhook event-list enablement, one bounded live paid checkout/charge proof, live paid Customer Portal cancel-at-period-end proof, live subscription receipt dedupe repair, Supabase SECURITY DEFINER public execute revokes for the three Discord/member-number maintenance functions, and service-role-only lockdown for the identified internal Discord/support tables.

Still open as post-launch follow-up: actual live post-period downgrade recheck after the paid QA subscription period ends, 10-20 real-user beta learning loop, counsel/legal review before broader scale, Supabase restore drill, and post-launch billing/support monitoring.

## 2026-07-09 Public Checkout Enabled

- Durable receipt: `docs/ops/FF-QA-001-PUBLIC-CHECKOUT-ENABLEMENT-PROOF-2026-07-09.md`.
- Production deployment: `dpl_8CuUJWAK1VHZFHhKmm46zj3ECji6`.
- Stable alias: `https://fawxzzy-fitness-local.vercel.app`.
- `PAID_LAUNCH_ENABLED=true` is active in Vercel Production.
- Public/legal/install route smoke passed after deploy.
- Authenticated production route smoke passed for `/today`, `/routines`, `/history`, `/settings`, and `/dev/progression-audit`.
- Live Stripe webhook readiness passed for endpoint `we_1Tqldd1n5lBbRYoVkvltrp1J` with all required events and no missing events.
- Public checkout-start proof passed using a temporary free QA account:
  - app route returned `200`
  - Stripe Checkout Session mode was `subscription`
  - amount was `$5.00`
  - currency was `usd`
  - interval was `month`
  - active price id matched production config
  - no payment was completed
  - unpaid session was expired
  - temporary Supabase and Stripe records were cleaned up
- Generated live `checkout.session.expired` event `evt_1TrKPm1n5lBbRYoVQ1TboDND` had `pending_webhooks=0` at readback.
- `npm run test:billing` passed `36/36`.
- `FF-MON-001` and `FF-QA-001` are proof-closed for MVP soft launch.

## 2026-07-09 FF-QA-001 Guarded Smoke Subset

- Durable receipt: `docs/ops/FF-QA-001-GUARDED-SMOKE-PROOF-2026-07-09.md`.
- Public route smoke passed:
  - `/privacy` -> `200`
  - `/terms` -> `200`
  - `/install?installContext=desktop` -> `200`
  - unauthenticated `/settings?section=pro` -> `307` to `/login`
- Authenticated route smoke passed for:
  - `/today`
  - `/routines`
  - `/history`
  - `/settings`
  - `/dev/progression-audit`
- Live Stripe webhook readiness passed for endpoint `we_1Tqldd1n5lBbRYoVkvltrp1J` with all seven required events and `missingEvents: []`.
- Checkout guard proof passed: authenticated `POST /api/billing/checkout` returned `503` with `BILLING_CHECKOUT_LAUNCH_DISABLED`.
- Billing policy tests passed: `36/36`.
- Pro capacity gating proof passed on the reusable tier QA account:
  - base tier: `3` routines, `14` saved workout plans
  - Pro tier: all seeded routines/plans visible
- Protected visual smoke passed for settings, today, routines, workout plans, history, history detail, and current session.
- Historical guarded proof note: public checkout was disabled for this subset.
- Superseded by `2026-07-09` public checkout enablement proof.

## 2026-07-09 FF-SEC-001 Supabase Hardening

- New launch-blocking security card: `FF-SEC-001 - Supabase Production Hardening Before Paid Launch`.
- Durable receipt: `docs/ops/FF-SEC-001-SUPABASE-PRODUCTION-HARDENING-2026-07-09.md`.
- Applied production Supabase migration: `20260709072134_harden_discord_security_definer_execute`.
- Applied production Supabase migration: `20260709073257_harden_discord_internal_table_access`.
- Closed finding slice: public/anon/authenticated direct `EXECUTE` on these internal SECURITY DEFINER maintenance functions:
  - `public.compact_human_member_numbers_after_profile_delete()`
  - `public.compact_human_member_numbers_preserving_zero()`
  - `public.refresh_discord_member_link_member_number_snapshots()`
- After function proof: `public=false`, `anon=false`, `authenticated=false`, `service_role=true` for each function.
- After internal table proof: `anon`/`authenticated` have no direct table privileges and explicit deny policies exist; `service_role` access is preserved.
- Operator risk acceptance recorded for leaked password protection, Supabase/org MFA proof, GitHub/operator 2FA proof, PITR, and backup visibility.
- Restore-readiness posture recorded: owner Zachariah John Harold Redfield; primary restore path is Supabase Dashboard backup restore or Supabase support-assisted restore; PITR and a restore drill are deferred.
- Applied production Supabase migration: `20260709074946_supabase_performance_advisor_safe_indexes`.
- Closed P1 performance findings: three unindexed foreign-key advisories and the duplicate `discord_update_drafts` deployment id index.
- Still open as deferred follow-up: actual restore drill, leaked-password protection enablement, MFA verification proof, and non-critical unused-index/auth-connection performance advisories.

## 2026-07-09 Downgrade Equivalent Accepted

- The live paid QA subscription remains scheduled to preserve access through its paid period.
- Waiting until `2026-08-09` would prove the real post-period downgrade path, but the operator explicitly accepted the existing sandbox/test-clock downgrade proof as the MVP launch equivalent.
- Accepted equivalent evidence:
  - deterministic subscription-status tests for cancelled, expired, past-due, terminal, and failed states
  - sandbox no-money test-clock `invoice.payment_failed` downgrade proof
  - sandbox no-money cancel-at-period-end source proof
  - bounded live paid checkout and Customer Portal cancel-at-period-end proof
- Do not claim the actual live `2026-08-09` downgrade happened until it is rechecked after that date.

## 2026-07-09 Deployed Sandbox Webhook Secret Split

- Re-ran the sandbox no-money free-trial proof against stable alias `https://fawxzzy-fitness-local.vercel.app`.
- The run created test subscription `sub_1TrA1m1z3plnI3SE9zgmup5O` and test customer `cus_Uqrl6J69XBoUzV`.
- Cleanup removed the temporary Stripe customer, QA auth user, and QA database rows.
- Vercel logs showed the deployed webhook route received Stripe requests but returned `400` because signature verification used only the deployed primary webhook secret.
- Root cause: the sandbox endpoint signs with a separate endpoint signing secret, while production keeps the live webhook secret in `STRIPE_WEBHOOK_SECRET`.
- Source fix: webhook verification now supports primary live secret first plus an explicit test/sandbox secret through `STRIPE_TEST_WEBHOOK_SECRET` or `STRIPE_SANDBOX_WEBHOOK_SECRET`.
- Focused billing tests passed with the new signature helper.
- Follow-up: the Vercel secret, redeploy, and rerun were completed in the proof section below.

## 2026-07-09 Deployed Sandbox Free-Trial Proof Closed

- Added the separate sandbox/test webhook signing secret to Vercel Production without replacing the live webhook secret path.
- Redeployed production as deployment `dpl_HUsDUbhofhJFEKxLCazcDfQk8pTM`.
- Stable alias remained `https://fawxzzy-fitness-local.vercel.app`.
- Stripe sandbox webhook readiness passed after deploy with `missingEvents: []`.
- Reran:

```bash
npm run qa:stripe:free-trial-proof -- --apply --cleanup --json
```

- The proof created test subscription `sub_1TrANw1z3plnI3SE5yze7sPt` for test customer `cus_Uqs8Owrkv7VyTl`.
- The app received Stripe-delivered webhook proof and wrote:
  - `billing_purchases.status=completed`
  - `billing_purchases.purchase_kind=pro_subscription`
  - `user_entitlements.entitlement_key=pro`
  - `user_entitlements.status=active`
- Expanded Vercel logs for the proof window showed three `POST /api/billing/webhook/stripe` requests returning `status=200`.
- Cleanup removed the temporary Stripe customer, QA auth user, and QA database rows.
- This closes deployed sandbox no-money subscription creation and entitlement proof.
- Later `2026-07-09` proof closed deployed failed-payment proof, bounded live paid checkout, and live paid Customer Portal customer-flow/cancellation proof.
- Superseded by later `2026-07-09` bounded live paid proof and public checkout enablement.

## 2026-07-09 Deployed Sandbox Failed-Payment Proof Closed

- First attempted deployed failed-payment proof exposed a real source gap: sandbox invoice events could verify through the sandbox webhook secret, but invoice handlers still used the primary live Stripe server client for subscription retrieval.
- Source fix: invoice-paid and invoice-failed handlers now process invoice payload and subscription metadata first, avoiding same-mode subscription retrieval as a prerequisite for billing truth writes.
- Redeployed production as deployment `dpl_8wP4sCVpZzk7hUg83cSLkjRaaTps`.
- Reran a no-money Stripe test-clock failed-payment proof using Stripe test mode only.
- The proof created test subscription `sub_1TrAjk1z3plnI3SEKUcJfVaC` for test customer `cus_UqsUJB8gSDKE6I`.
- Stripe generated `invoice.payment_failed` event `evt_1TrAk71z3plnI3SE43U1mitQ`.
- App billing truth after Stripe-delivered webhook processing:
  - `billing_purchases.status=pending`
  - `billing_purchases.raw_event_id=evt_1TrAk71z3plnI3SE43U1mitQ`
  - `user_entitlements.status=active`
  - `user_entitlements.expires_at=2026-09-09T05:43:02+00:00`
- Active Pro was preserved because this failed renewal still had a future paid/access window.
- Vercel logs for deployment `dpl_8wP4sCVpZzk7hUg83cSLkjRaaTps` showed seven proof-window `POST /api/billing/webhook/stripe` requests returning `status=200`.
- Cleanup removed the temporary Stripe subscription, customer, test clock, QA auth user, and related database rows.
- This closes deployed sandbox failed-payment processing proof.
- Later `2026-07-09` proof closed bounded live paid checkout and live paid Customer Portal customer-flow/cancellation proof.
- Superseded by later `2026-07-09` bounded live paid proof and public checkout enablement.

## 2026-07-09 No-Money Sandbox Subscription Lifecycle Proof

Command:

```bash
npm run qa:stripe:lifecycle-proof -- --apply --cleanup --json
```

Closed:

- Added reusable proof command: `npm run qa:stripe:lifecycle-proof`.
- Dry-run verifies sandbox/test mode, account `acct_1ToSyD1z3plnI3SE`, and monthly Pro price `price_1ToVq11z3plnI3SE2fXGZOW5`.
- The command refuses live Stripe keys.
- The command uses Stripe test PaymentMethod ids, not raw card data.
- The command creates no real charges.
- The command writes proof to `runtime/fitness/stripe-subscription-lifecycle-proof.latest.json`.
- Cleanup-only writes separately to `runtime/fitness/stripe-subscription-lifecycle-proof.cleanup.latest.json`.
- The proof run cleaned up the temporary Stripe customers, subscriptions, test clocks, Supabase billing rows, and QA auth user.

Portal/cancel proof:

- Temporary subscription `sub_1Tr7Te1z3plnI3SEwLFNy3ty` was active with a completed `$5/month` sandbox invoice.
- The local app `POST /api/billing/portal` route returned `200`, `ok: true`, and a Stripe-hosted portal URL.
- Stripe `customer.subscription.updated` with `cancel_at_period_end=true` was replayed into the local webhook with a valid signature.
- App truth remained `billing_purchases.status=completed` and `user_entitlements.status=active` through `2026-08-09T02:14:12+00:00`.

Failed-payment/downgrade proof:

- Temporary subscription `sub_1Tr7Tu1z3plnI3SEs02AmnHD` used a Stripe test clock and `pm_card_chargeCustomerFail`.
- Stripe generated real sandbox event `invoice.payment_failed` as `evt_1Tr7UI1z3plnI3SE1c3JROiT`.
- The local webhook replay returned `200`.
- Because the test-clock billing window ended `2026-06-30T02:14:28+00:00`, the app downgraded to `user_entitlements.status=revoked` and `billing_purchases.status=pending`.

Interpretation:

- This closes no-money sandbox/source proof for failure and cancel-at-period-end behavior.
- This is superseded by the later deployed sandbox failed-payment proof and bounded live paid proof sections for those lanes.
- Superseded by later `2026-07-09` bounded live paid proof and public checkout enablement.

## 2026-07-09 Stripe Launch Completion Report

Durable report:

```txt
docs/ops/FF-MON-001-STRIPE-LAUNCH-COMPLETION-REPORT-2026-07-09.md
```

Interpretation:

- Stripe implementation is no longer blocked by basic app wiring.
- The remaining work is post-launch monitoring, governance follow-up, customer-facing consistency review, and broader-scale legal/counsel review.
- The proof ladder is split into sandbox/no-money proof, live/no-charge production proof, and bounded live paid smoke.
- All three billing proof layers are materially proofed for the bounded QA lane: sandbox/no-money, live/no-charge, and one explicitly approved live paid smoke.
- Later `2026-07-09` guarded smoke and public checkout enablement closed this launch blocker for MVP.

Current launch call:

```txt
MVP Soft Launch Enabled
```

## 2026-07-08 Blocker Class Split

The original blocker class split below has been superseded by later proof, operator risk-acceptance receipts, and public checkout enablement. Current post-launch follow-ups are:

- monitor checkout, webhook, entitlement, support, cancellation, and account-deletion behavior
- recheck actual live post-period downgrade after the paid QA subscription period ends
- run post-launch beta learning
- complete counsel/legal review before broader scale

Legal/business, beta, security, and downgrade items remain as counsel/post-launch/follow-up work unless the operator reopens them as blockers.

Current monitoring order:

1. Keep `PAID_LAUNCH_ENABLED=true` while monitoring public checkout.
2. Watch Stripe webhook delivery and app entitlement truth for new subscribers.
3. Record support/refund/cancellation/deletion issues as feedback cards.
4. Use the rollback runbook if a blocker appears.

Do not claim the actual live post-period downgrade has happened until it is rechecked after the paid QA subscription period ends.

Counsel/business handoff:

- `docs/ops/FF-LEGAL-001-COUNSEL-HANDOFF-PACKET-2026-07-08.md`

Bounded live paid-smoke runbook:

- `docs/ops/FF-MON-001-BOUNDED-LIVE-PAID-SMOKE-RUNBOOK-2026-07-08.md`

## Recommended Execution Path

- `Codex` for implementation against the P0 and P1 cards.
- `ChatGPT` for quick copy refinement and operator phrasing.
- `Playbook CLI` for repeatable verify, export, and board-audit loops.
