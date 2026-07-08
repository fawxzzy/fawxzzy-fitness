# FF-QA-001 Monetization Launch Smoke Matrix - 2026-07-01

## Current Launch Status

Live paid production is NO-GO.

Reason:

- Legal copy is improved but counsel-open.
- Pro offer is aligned to capacity-only gates.
- Stripe sandbox checkout, Customer Portal proof, sandbox signed current-deploy webhook freshness, live env installation, production redeploy, and no-charge live webhook delivery are complete.
- Interim private billing/privacy/deletion support copy is present, but the final monitored intake mechanism is not business/legal closed.
- Live Stripe/Vercel/domain/webhook configuration is mostly verified; final live readiness still requires live Customer Portal return proof, business/legal/support closure, and an explicitly approved bounded paid smoke.

No production paid launch may proceed until the billing proof packet, support path, counsel review, and final smoke matrix are complete.

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
- the executable launch pass still depends on live beta evidence and one final full smoke execution packet

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
- `FF-BETA-001` real-user beta
- `FF-MON-001` monetization readiness gate

Additional operator note:

- As of `2026-07-01`, `FF-CORE-001`, `FF-CORE-002`, `FF-PWA-001`, `FF-LEGAL-001`, and `FF-MON-002` are already proof-closed.
- `FF-BETA-001` is now defined as a live execution packet and still requires real tester evidence.
- `FF-MON-001` remains the truthful umbrella gate that cannot close until beta and final smoke proof are both complete.
- As of `2026-07-06`, `FF-MON-001` has additional proof for recurring Pro app UI, production env-name alignment, corrected Stripe sandbox webhook destination, and signed webhook delivery with `pending_webhooks=0`; the remaining proof gap is human-operated hosted checkout completion because Stripe hCaptcha blocks truthful autonomous payment entry.
- As of `2026-07-07`, live paid launch is still `no-go` until the business/legal/support blockers are closed: final business entity, launch geography, final monitored private paid-support path, refund posture, account deletion versus active subscription procedure, health-data exposure review, signed live Stripe/Customer Portal/webhook verification, and keep/main Vercel project/domain verification.
- As of `2026-07-07`, the stable Vercel alias is verified on fresh deployment `dpl_2rrQPh4hjDsG1eat8vvtQdvQxnhD`, and the webhook route fail-closes without a Stripe signature. The remaining webhook freshness proof is a signed Stripe Dashboard resend or new sandbox checkout event hitting that fresh deployment.
- As of `2026-07-07`, `/privacy` and `/terms` return `200` without auth cookies on the stable production alias and include the interim private-support/legal-warning copy required for checkout review.
- As of `2026-07-07`, Stripe Dashboard resend of `evt_1Tqeg71z3plnI3SEbX5Ax7uv` proof-closed sandbox current-deploy signed webhook freshness: Dashboard showed a fresh `200 OK` manual retry, Vercel production logs showed `POST /api/billing/webhook/stripe` returning `200` on deployment `dpl_2rrQPh4hjDsG1eat8vvtQdvQxnhD`, and Supabase stored `raw_event_id = evt_1Tqeg71z3plnI3SEbX5Ax7uv` with `purchase_kind = pro_subscription`.
- As of `2026-07-07`, the remaining legal support blocker has a decision packet at `docs/ops/FF-LEGAL-001-PRIVATE-SUPPORT-DECISION-PACKET-2026-07-07.md`; the operator still needs to pick and accept the final monitored support path before live paid launch.
- As of `2026-07-07`, live Stripe config audit is captured at `docs/ops/FF-MON-001-LIVE-STRIPE-CONFIG-AUDIT-2026-07-07.md`; the live product was renamed to `Fawxzzy Fitness Pro Monthly`, live webhook destination `we_1Tqldd1n5lBbRYoVkvltrp1J` is the single enabled live endpoint for the stable production alias, Vercel production live publishable keys, live server key, live webhook secret, recurring price id, and price mode were refreshed, and Stripe public business Terms/Privacy URLs were persisted.
- As of `2026-07-07`, production redeploy and no-charge live webhook smoke are proof-closed: deployment `dpl_HZKzo5XwakgyBj1KGBdpNS1HbK1R` is aliased at `https://fawxzzy-fitness-local.vercel.app`; live Checkout Session `cs_live_a1EQzcOj0aivMIdcA3kF04VXa2WB9AgxFRqFtgqCCsUVrOLTxSsAxPLHIZ` was created and immediately expired unpaid; Stripe event `evt_1TqmOH1n5lBbRYoVW3er3wW4` reached `pending_webhooks=0`; Vercel logs showed `POST /api/billing/webhook/stripe` returned `200`.

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
- do not run the full gate until the remaining upstream blockers, especially `FF-BETA-001` and `FF-MON-001`, are closed with proof
