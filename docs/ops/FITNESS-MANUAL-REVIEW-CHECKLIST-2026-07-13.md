# Fitness Manual Review Checklist

## Review Boundary

This checklist covers every Fitness roadmap card implemented locally in the current review batch.

- Review-ready cards: 18
- Production deployments: 0
- Production database migrations applied: 0
- Board state for review-ready cards: `in_progress`
- External cards not executable from the repository: 2

Use the local review server at `http://127.0.0.1:3004`. These routes are local-only QA surfaces and do not represent the production deployment.

## 1. History Overview

Cards: `FF-RET-001`, `FF-RET-002`, `FF-RET-003`, `FF-RET-004`, `FF-GAM-001`, `FF-ANALYTICS-002`

Route: `http://127.0.0.1:3004/dev/mobile-regression?scenario=history-sessions-compact`

- [ ] Calendar shows completed workout days and filters sessions by day.
- [ ] Workout streak and monthly progress are easy to scan.
- [ ] Consistency heatmap remains compact on mobile.
- [ ] Achievements are small, deterministic, and do not reward unsafe volume.
- [ ] Premium analytics appears only as a locked preview without scores or coaching claims.

## 2. Curated Workout Builder

Cards: `FF-ENGINE-001`, `FF-ENGINE-002`, `FF-ONBOARD-001`

Route: `http://127.0.0.1:3004/curated-onboarding`

- [ ] Intake supports 2-6 requested workout days and available equipment.
- [ ] Generated plans use real exercise names and remain editable.
- [ ] Adaptive generation can reduce the schedule when recent completion history supports it.
- [ ] The reason for an adaptive schedule change is clear.
- [ ] Continue opens the normal routine builder with the generated draft.

## 3. Exercise Timer

Cards: `FF-SESSION-001`, `FF-SESSION-002`, `FF-SESSION-003`, `FF-SESSION-004`

Route: `http://127.0.0.1:3004/dev/mobile-regression?scenario=session-logger-cardio-time-distance`

- [ ] Timer is attached to one exercise rather than the whole session.
- [ ] Start, pause, resume, reset, and done states work without blocking set logging.
- [ ] Exercises without the timer remain uncluttered.
- [ ] History can distinguish timer-backed exercise timing.

## 4. Observed Rest

Card: `FF-SESSION-005`

Route: `http://127.0.0.1:3004/dev/mobile-regression?scenario=session-logger-bodyweight-reps&exerciseId=session-ex-4`

- [ ] Pull-Up shows only the compact `Observed rest 1:40` value.
- [ ] No recovery summary appears when there are fewer than two valid intervals.
- [ ] The feature remains separate from the exercise timer.

## 5. Recap And Sharing

Cards: `FF-RECAP-001`, `FF-SOC-001`

Route: `http://127.0.0.1:3004/dev/mobile-regression?scenario=history-detail-feedback-note`

- [ ] Completed workout recap is concise and deterministic.
- [ ] Copy works and Share uses native sharing when supported.
- [ ] Sharing is explicit and user-initiated.
- [ ] No feed, follows, groups, leaderboards, or public profile scope was added.

Scope decision: `docs/ops/FF-SOC-001-SOCIAL-SCOPE-DECISION-2026-07-12.md`

## 6. Earned Install Prompt

Card: `FF-PWA-003`

Route: `http://127.0.0.1:3004/install`

- [ ] Install promotion remains capability-aware.
- [ ] It can appear after a completed workout or a stable return pattern.
- [ ] It does not repeatedly prompt after the earned moment is consumed.

## 7. Founding User Launch Plan

Card: `FF-MKT-001`

Review: `docs/ops/FF-MKT-001-FOUNDING-USER-LAUNCH-PLAN-2026-07-12.md`

- [ ] Audience, channel, message, support path, go/no-go gate, and metrics are acceptable.
- [ ] Included screenshots accurately represent the local review build.

## External Follow-Up

- `FF-BETA-001` remains `confirmed`: it requires 10-20 real users and cannot be completed through repository implementation.
- `FF-ANALYTICS-001` remains `confirmed`: it depends on `FF-BETA-001` and requires real activation and retention traffic.

## Previously Fixed Cards

Existing cards already marked `fixed` were not reopened in this batch: account export, Copilot interface, progression engine, routine builder, prior History work, legal, monetization, subscription flow, progression updates, base install experience, offline restore, launch QA, Supabase hardening, and routine templates.

## Release Gate

Do not mark the 18 review cards `fixed` or describe them as live until manual review is accepted, the two local migrations are applied through the approved database release path, and a separately authorized Fitness production deployment succeeds.
