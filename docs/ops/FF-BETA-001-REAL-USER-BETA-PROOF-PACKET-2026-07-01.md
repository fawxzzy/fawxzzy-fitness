# FF-BETA-001 Real User Beta Proof Packet - 2026-07-01

Card: `FF-BETA-001 - Run 10-20 Real User Beta Before Paid Push`

## Purpose

This packet turns the beta card into an operator-ready execution contract.

The goal is not generic “get feedback.” The goal is to prove that real people can:

- get into Fitness
- understand how to start
- create or select a usable routine
- complete a workout
- understand the progression value
- surface real friction before paid launch

## Current Gate Position

As of 2026-07-01:

- `FF-CORE-001` fixed
- `FF-CORE-002` fixed
- `FF-PWA-001` fixed
- `FF-LEGAL-001` fixed
- `FF-MON-002` fixed
- `FF-MON-001` in progress as the umbrella gate
- `FF-QA-001` in progress as the launch smoke matrix

`FF-BETA-001` remains blocked on live tester execution, not on missing product doctrine.

## Beta Objective

Collect bounded, structured evidence from 10-20 real users that answers:

1. Can they get started without confusion?
2. Can they reach a workout without operator intervention?
3. Can they complete a first workout and understand what the app wants them to do next?
4. What friction points repeat often enough to block paid launch?

## Required Tester Mix

Target 10-20 testers total with at least:

- 3 iPhone users
- 3 Android users
- 2 desktop-first users
- a mix of beginner and experienced lifters

If the exact mix is not achievable, record the gap explicitly in the beta receipt.

## Required Beta Lanes

Each tester run should attempt to answer all of these:

1. `Entry`
- Can the tester open the app and understand how to continue?
- If install is offered, is the choice clear?

2. `Routine Setup`
- Can the tester create a routine from blank or select a usable one?
- Do naming, duplicate, and add-day flows make sense?

3. `Workout Start`
- Can the tester reach Today and start or resume a workout?

4. `Workout Completion`
- Can the tester log a real workout without confusion or broken state?

5. `Progression Understanding`
- After the workout, can the tester explain what the app is recommending next?

6. `Friction Capture`
- What did the tester hesitate on?
- What did the tester misunderstand?
- What felt broken, untrustworthy, or too technical?

## Evidence Contract Per Tester

For each tester, capture:

- tester id or alias
- platform/device
- install mode:
  - browser
  - installed/PWA
- onboarding result:
  - passed
  - blocked
- first routine result:
  - created
  - selected
  - blocked
- first workout result:
  - completed
  - partially completed
  - blocked
- progression understanding:
  - understood
  - partially understood
  - unclear
- top friction points
- whether operator intervention was needed

## Severity Rules

Use these severity buckets when converting findings:

- `Blocker`
  - prevents workout start, workout completion, account access, progression truth, or payment trust
- `High`
  - user can finish, but with strong confusion or repeated intervention
- `Medium`
  - clear friction, but not launch-stopping by itself
- `Low`
  - polish, wording, or preference-level issues

## Board Conversion Rules

Every repeated or meaningful finding should become a board artifact.

Convert to a new or existing card when:

- the same confusion appears more than once
- a single issue blocks workout completion
- a trust issue appears around progression, login, payment, or history truth
- an install or onboarding problem causes hesitation before first workout

Each converted card should include:

- tester lane where it happened
- platform/device
- what the user expected
- what the app actually did
- why that matters before paid launch

## Beta Pass Threshold

The beta can support a paid-launch go decision only if:

- at least 10 real testers completed the flow
- most testers can reach and complete a workout without live operator help
- progression value is understandable to most testers
- blocker issues are closed
- high-severity issues are either closed or explicitly accepted with rationale

## Beta Fail Conditions

Do not treat the beta as passed if any of these are true:

- testers repeatedly fail to start or finish workouts
- progression recommendations are consistently misunderstood
- install/onboarding confusion prevents first use
- history/state truth appears untrustworthy
- trust or payment-adjacent concerns appear unresolved

## Suggested Receipt Template

Use a final closeout receipt with:

1. tester count and platform mix
2. onboarding pass rate
3. routine setup pass rate
4. workout completion pass rate
5. progression understanding summary
6. top repeated friction points
7. blocker/high findings converted into cards
8. final recommendation:
   - go
   - go with bounded risks
   - no-go

## Closeout Rule

`FF-BETA-001` should only move to `fixed` after:

- the real tester evidence exists
- major findings are converted into board truth
- a clear go/no-go recommendation is written

Until then, this packet is the execution contract, not the execution proof.
