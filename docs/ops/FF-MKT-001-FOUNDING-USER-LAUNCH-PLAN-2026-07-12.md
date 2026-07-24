# FF-MKT-001 Founding User Launch Plan

Date: 2026-07-12

Status:
- Local review packet only.
- No outreach, paid push, production deploy, or public announcement is authorized by this document.

## First audience

- Start with existing opt-in Fitness community members and direct operator contacts who already train at least three days per week.
- Prefer people willing to log real sessions, report confusing setup moments, and tolerate a small founding-user product.
- Exclude cold paid traffic, broad influencer outreach, and anyone expecting medical, injury, nutrition, or AI-coaching advice.

## Batch and channels

- Batch 1: 10 invited testers through direct, consent-based outreach.
- Batch 2: expand to 20 only after Batch 1 support load and blockers are reviewed.
- Paid founding offer: no more than five initial conversions until the beta packet has real-user evidence.
- Channels: direct messages to opted-in contacts, the existing Fitness Discord update lane, and one operator-owned social post only after go approval.
- Paid acquisition budget: zero for the founding pass.

## Launch message draft

> Fitness is a deterministic workout tracker built around routines, current-session logging, history, and explainable progression. I am opening a small founding-user group for people who train regularly and are willing to give direct feedback. The first group is intentionally small so setup problems and support requests can be handled personally. This is not medical guidance or an AI coach. If you want to test it, reply through the Fitness feedback path and I will send the current access details after launch review.

## Demo asset shot list

Capture from the local review build before outreach:

1. `assets/ff-mkt-001/01-history-overview.png` - History overview with calendar, progress summary, premium preview, and achievements.
2. `assets/ff-mkt-001/02-curated-generated-plan.png` - Curated generated-plan review with deterministic routine days and targets.
3. `assets/ff-mkt-001/03-current-session-exercise-timer.png` - Current Session with an expanded exercise, normal set logging, and the optional exercise timer.
4. `assets/ff-mkt-001/04-shareable-workout-recap.png` - Completed-session recap with PR context plus Copy recap and Share recap actions.

Asset rules:
- Use QA or deterministic fixture data only.
- Do not show email addresses, member IDs, tokens, billing identifiers, or personal notes.
- Label local/preview captures as review build until a production deployment is separately approved and verified.

## Feedback and support

- Product feedback: canonical Fitness feedback forum and existing board cards.
- Bugs: existing in-app/Discord bug-report path with reproduction steps and screenshots when safe.
- Support owner: operator-managed Fitness Discord support path; keep the first batch small enough for direct response.
- Triage: safety/data-loss/auth/billing issues first, blocked workout logging second, UX polish third.
- Never request passwords, service-role keys, payment details, or raw authentication tokens from testers.

## Go / no-go

Required before outreach:

- `FF-BETA-001` has real-user evidence, not fixture-only evidence.
- The monetization readiness and launch smoke packets have current readback.
- Legal links and paid offer copy match the deployed checkout behavior.
- The release candidate has operator-reviewed production authorization and a post-deploy smoke receipt.
- No unresolved data-loss, auth, billing, session-completion, or routine-capacity blocker remains.
- Support and feedback channels are reachable with a named operator owner.

No-go conditions:

- Production has not been explicitly deployed and verified.
- Claims say a review build is live when it is not.
- Beta evidence is missing or only automated.
- Billing, cancellation, legal, data ownership, or support behavior is ambiguous.
- The current support load cannot absorb ten users.

## First review metrics

- Invite acceptance and completed onboarding count.
- First routine created or generated.
- First completed workout.
- Seven-day return count.
- Actionable feedback count and median operator response time.
- Support incidents by severity.
- Paid conversion is secondary to safe product learning in this pass.
