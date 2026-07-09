# FF-BETA-001 Beta Execution Kit - 2026-07-08

Card: `FF-BETA-001 - Run 10-20 Real User Beta Before Paid Push`

## Status

This is the operator runbook for starting beta execution.

It does not prove beta completion. `FF-BETA-001` remains blocked until real tester evidence exists.

## Canonical Links

- App: `https://fawxzzy-fitness-local.vercel.app`
- Community invite: `https://discord.gg/tnnV7BNJ7h`
- Sensitive support: `fawxzzy@gmail.com`
- Ledger template: `docs/ops/FF-BETA-001-TESTER-LEDGER-TEMPLATE-2026-07-01.md`
- Proof packet: `docs/ops/FF-BETA-001-REAL-USER-BETA-PROOF-PACKET-2026-07-01.md`

## Privacy Rules

- Use anonymized tester ids only in repo-tracked docs: `FFB26-001`, `FFB26-002`, etc.
- Keep real names, Discord handles, emails, and invite source mappings outside the repo.
- Do not ask testers to post billing, account, deletion, or sensitive wellness details publicly.
- Route billing, privacy, deletion, account recovery, refund, and sensitive support to `fawxzzy@gmail.com`.

## Minimum Beta Acceptance Rule

Beta proof is accepted only when all of the following are true:

- [ ] at least `10` real testers complete the script, with a target range of `10-20`
- [ ] tester ids remain anonymized as `FFB26-001`, `FFB26-002`, etc.
- [ ] platform coverage includes:
  - iOS Safari
  - Android Chrome
  - Windows Chrome or Edge
  - macOS Safari or Chrome
- [ ] every tester reaches `/today`
- [ ] every tester can create or load a workout lane
- [ ] free limits are observed and understood:
  - `3` routines
  - `14` saved workout plans
- [ ] Pro is understood as capacity-only:
  - unlimited routines
  - unlimited saved workout plans
  - `$5/month` recurring subscription
- [ ] support path is understood:
  - email for billing, privacy, deletion, refund, account recovery, and sensitive wellness/account issues
  - Discord for community/product discussion only
- [ ] no `P0` or `P1` blocker remains open

## Tester Invite Copy

```text
I am running a small beta for Fawxzzy Fitness before paid launch.

Goal: see whether real users can get in, build or pick a routine, start a workout, log a workout, and understand what the app recommends next.

If you test it, please use the app naturally and tell me:
- where you got stuck
- what confused you
- whether the workout flow felt trustworthy
- whether the progression/next-target idea made sense

App:
https://fawxzzy-fitness-local.vercel.app

Community:
https://discord.gg/tnnV7BNJ7h

Do not post private account, billing, medical, or sensitive wellness details publicly. Send sensitive support requests to fawxzzy@gmail.com.
```

## Tester Run Script

Ask each tester to attempt this flow in `10-15` minutes without live handholding when possible:

1. Open the install link.
2. Follow the install guidance if it is offered and appropriate for the device/browser.
3. Create an account or log in.
4. Open `/today`.
5. Start, resume, or inspect a workout lane.
6. Create routines until the tester understands the free routine limit.
7. Create or save workout plans until the tester understands the saved-plan limit.
8. Open the Pro screen.
9. Answer:
   - What do you get for free?
   - What does Pro unlock?
   - How much does it cost?
   - Is it recurring?
   - Where would you go for sensitive support?
10. Report one confusing thing, if any.

## Beta Proof Ledger Fields

Record only anonymized beta evidence in the repo ledger using this shape:

| Tester ID | Platform | Browser | Install path | Account state | `/today` loaded | Workout lane loaded | Free limits understood | Pro offer understood | Support path understood | Blockers | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FFB26-001` | iOS | Safari | `ios-safari` | Free | Yes | Yes | Yes | Yes | Yes | None | Pass |

## Feedback Questions

Use these questions after the run:

1. What did you expect to happen first?
2. Where did you hesitate?
3. Did anything feel broken or untrustworthy?
4. Could you tell how to start a workout?
5. Could you tell what to log?
6. Did the app explain the next target or progression clearly enough?
7. Would you use this again without me watching?
8. What would stop you from paying for it?
9. What one change would make it feel more polished?

## Pass / No-Go Rules

Beta can support paid launch only if:

- at least `10` real testers complete the core flow
- every tester reaches `/today`
- every tester can create or load a workout lane
- most testers understand both free limits and Pro capacity unlocks
- most testers understand where sensitive support goes
- blocker issues are fixed
- high-severity issues are fixed or explicitly accepted with rationale

Beta remains no-go if:

- users repeatedly fail to start or complete workouts
- app state/history/progression truth appears unreliable
- mobile/install flow blocks first use
- users cannot explain the value after a workout
- account, privacy, billing, or support concerns remain unclear

## Operator Closeout

When beta execution is complete, create a closeout receipt with:

- tester count and platform mix
- onboarding pass rate
- routine setup pass rate
- workout completion pass rate
- progression understanding summary
- repeated friction patterns
- cards spawned or updated
- blocker/high issues remaining
- final recommendation: `GO`, `GO WITH EXPLICIT EXCEPTIONS`, or `NO-GO`

Do not mark `FF-BETA-001` fixed until the receipt exists and the board reflects any spawned blocker/high findings.
