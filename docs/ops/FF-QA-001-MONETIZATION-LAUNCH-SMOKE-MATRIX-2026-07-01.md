# FF-QA-001 Monetization Launch Smoke Matrix - 2026-07-01

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
- payment / entitlement implementation is not yet surfaced strongly enough in current app-code inspection to claim the paid lane is executable end-to-end

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
- `FF-MON-002` Stripe lifetime Pro purchase flow
- `FF-BETA-001` real-user beta
- `FF-MON-001` monetization readiness gate

Additional operator note:

- Current repo search shows strong PWA/install coverage and doctrine.
- Current repo search does not yet surface a strong, obvious Stripe / entitlement execution lane in app code.
- Therefore `Payments / Pro Access` must remain a hard blocker-class prerequisite before the full gate can be run.

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

- Stripe checkout success grants Pro
- checkout cancel returns safely without false entitlement
- checkout failure is handled clearly
- entitlement reflects in UI immediately or with a bounded refresh
- returning Pro user keeps entitlement after relog and reopen
- free users do not get accidental Pro access

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
- do not run the full gate until upstream monetization blockers are closed with proof
