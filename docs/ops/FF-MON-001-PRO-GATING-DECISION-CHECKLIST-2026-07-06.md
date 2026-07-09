# FF-MON-001 Pro Gating Decision Checklist - 2026-07-06

## Purpose

This checklist records the current Free vs Pro access contract for the paid launch lane.

The recurring `$5/month` Stripe subscription lane has sandbox proof, but app feature gates must stay narrow, truthful, and easy to verify.

## Superseding Decision - 2026-07-07

The earlier Candidate A progression gate is no longer the product contract.

Do not gate these behind Pro right now:

- automatic progression setup
- progression receipts
- progression review tools
- manual/auto progression controls
- session progression visibility

These are allowed for Base users while the product proves core value.

The current MVP Pro gates are capacity gates only:

- Base users can access up to `3` routines.
- Base users can access up to `14` saved workout-plan templates.
- Pro users can access all routines and all saved workout-plan templates.

## Current Recommendation

Keep the Free/Base tier useful enough to prove trust:

- account creation
- routine creation and editing within the Base routine limit
- workout-plan creation and editing within the saved-plan limit
- Today and Current Session logging
- automatic progression setup and usage
- progression review and history visibility
- basic History

Sell Pro as expanded capacity and future power features:

- unlimited routines
- unlimited saved workout-plan templates
- future analytics and long-term trend views
- future advanced library/template management if explicitly approved

## Implementation Checklist

- Keep capacity enforcement in shared tier helpers, not one-off route checks.
- Keep server routes authoritative; UI filtering is not the only control.
- Base users must not see or directly access routines outside the allowed routine set.
- Base users must not see or directly access saved workout-plan templates outside the allowed template set.
- Pro users must see all routines and all saved workout-plan templates.
- Do not add `canUseAutoProgression` or equivalent billing checks to progression UI/actions.
- Do not present auto progression, receipts, or review tools as paid-only in the Pro Access screen.

## Stop-Ship Rules

Do not ship Pro gates if:

- a paid user cannot access all routines after entitlement proof
- a paid user cannot access all saved workout-plan templates after entitlement proof
- a Base user can directly open hidden over-limit routines or saved workout plans
- a Base user is blocked from ordinary logging, routine editing, workout-plan editing, or progression controls within the allowed capacity
- cancel-at-period-end removes Pro capacity access before the paid period ends
- expired/canceled access remains active after the entitlement window ends

## 2026-07-07 Capacity Gate Proof

Decision applied:

- Free/Base tier keeps routine creation useful but limits visible accessible routines to `3`.
- Free/Base tier limits the saved workout-plan template library to `14` saved plans.
- Pro tier sees all routines and all saved workout-plan templates.
- Hidden Base-tier routines are blocked from direct routine routes; client filtering is not the only control.

Repeatable proof:

- `npm run qa:pro-tier-gating`
- QA account: `atlas-fitness-tier-qa@fawxzzy.test`
- Fixture shape:
  - `5` routines
  - active routine intentionally older than hidden routines
  - `16` saved workout-plan templates
  - one real exercise per template so duplicate/template source filtering uses actual saved-plan cards

Latest proof result:

- Free visible routines: `Tier QA Routine 1`, `Tier QA Routine 4`, `Tier QA Routine 5`
- Free hidden routines: `Tier QA Routine 2`, `Tier QA Routine 3`
- Free visible saved workout plans: `14`
- Free hidden saved workout plans: `Tier QA Plan 01`, `Tier QA Plan 02`
- Free direct hidden-routine route returned the local not-found shell and did not leak the hidden routine name.
- After granting Pro entitlement to the same QA account, all `5` routines and all `16` saved workout-plan templates were visible.
- The previously hidden direct routine route became accessible after Pro entitlement.

Verification:

- `npm run qa:pro-tier-gating` passed.
- `npm run test:billing` passed, including `src/lib/pro-tier-limits.test.ts`.
- `npm run typecheck` passed.
- `npm run verify` passed.

Operational note:

- The proof script resets only the dedicated tier QA user rows before seeding. It does not mutate user-owned product data.

## 2026-07-07 Progression Gate Removal Receipt

The superseded progression gate was removed from runtime paths:

- no `canUseAutoProgression` billing helper
- no progression editor Pro-lock prop
- no route-level progression entitlement loads
- no server-action blocks for auto-progression mutations
- no QA proof assertion for Free auto-progression lock state

Required verification for this receipt:

- `npm run typecheck`
- `npm run test:billing`
- `npm run qa:pro-tier-gating`
- `npm run verify`

## 2026-07-07 Rendered UI Proof Receipt

Browser proof was run against the dedicated tier QA account:

- Account: `atlas-fitness-tier-qa@fawxzzy.test`
- Base fixture command: `npm run qa:pro-tier-gating -- --leave-free`
- Pro fixture command: `npm run qa:pro-tier-gating`

Base UI proof:

- `/routines` rendered the expected visible Base routines:
  - `Tier QA Routine 1`
  - `Tier QA Routine 4`
  - `Tier QA Routine 5`
- `/routines` did not render the over-limit hidden routines:
  - `Tier QA Routine 2`
  - `Tier QA Routine 3`
- `/routines/workout-plans` rendered `14` saved workout-plan cards.
- `/routines/workout-plans` did not render the over-limit hidden saved plans:
  - `Tier QA Plan 01`
  - `Tier QA Plan 02`

Pro UI proof:

- `/routines` rendered all `5` seeded routines.
- `/routines/workout-plans` rendered all `16` seeded saved workout plans.
- Boundary hidden plans `Tier QA Plan 01`, `Tier QA Plan 02`, and `Tier QA Plan 16` were visible after Pro entitlement proof.
- `/settings?section=pro` rendered the real gated features:
  - `Routine capacity`
  - `Saved workout plans`
- `/settings?section=pro` did not render obsolete progression-gate copy for automatic progression setup, progression receipts, review tools, or progression review actions.
