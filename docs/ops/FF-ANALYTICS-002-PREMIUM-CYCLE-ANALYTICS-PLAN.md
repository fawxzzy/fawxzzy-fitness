# FF-ANALYTICS-002 Premium Cycle Analytics Plan

Status: plan document only (2026-11-14). No UI, no migration, no database query, no `src/**` change. Nothing here is built, enabled or deployed. Grounded in repo source and migrations at `origin/main` c6396fc0, not production data.

Card: `FF-ANALYTICS-002` Plan Premium Cycle Analytics Experience (planning). Depends on `FF-HISTORY-001`, `FF-MON-003`. Context: the operator rejected an empty "Locked Pro" History preview on 2026-07-15; this plan defines real value first.

## 1. What "cycle" means here (source truth)

- A routine has `cycle_length_days` (1..365) and `start_date` (`002_routines.sql`). A cycle is one pass through that length, starting at `start_date` plus N x length. `src/lib/current-cycle-window.ts` (`buildCurrentCycleWindow`) already computes the window, in the member's local day (local-day truth, not UTC).
- `sessions` carries `routine_id`, `routine_day_index`, `routine_day_name`, `status` (in_progress | completed), `performed_at`, `duration_seconds`. Planned days come from `routine_days`; skipped exercises from `session_exercises.is_skipped`.
- History already loads current-cycle data (`currentCycleScopeSummary`, `currentCycleWeeklyProgress`, `currentCycleWeeklyProgressByWeek`, `cycleOptions` per routine in `HistorySessionsClient.tsx` and `src/lib/history-sessions-page-loader.ts`), and exercise history accepts a `cycleStartDate` filter.

## 2. What the app already stores (inputs, no new capture needed)

| Source | Fields | Use |
| --- | --- | --- |
| `sessions` | performed_at, status, routine_id, routine_day_index, duration_seconds | adherence, timing, per-day completion |
| `session_exercises` | exercise_id, position, is_skipped | skipped vs completed work |
| `sets` | weight, reps, rpe, is_warmup, duration_seconds, set_index | volume, top sets, est. 1RM, effort |
| `exercise_stats` | pr_weight, pr_reps, pr_est_1rm, pr_achieved_at, last_* | all-time PR baselines (written by `session_follow_up_jobs` kind `exercise_stats`) |
| `progression_events` | event_type (promotion_applied, promotion_reverted, lock_in, deload_applied, review_acknowledged, manual_target_change), from_target, to_target, reason, source_session_id | target movement inside a cycle |
| `routines` / `routine_days` / `routine_day_exercises` | cycle_length_days, start_date, planned days, targets | plan denominators |
| `exercises` | primary_muscle, equipment | muscle grouping (primary_muscle may be null; see risks) |

Existing pure logic to reuse, not duplicate: `history-scope-summary.ts`, `history-weekly-progress.ts`, `pr-evaluator.ts`, `session-analytics.ts`, `progression-event-analytics.ts`, `exercise-history-aggregation.ts`, `exercise-info-strength-progress.ts`, `workout-recap.ts`.

## 3. Candidate cycle insights (each must pass the "real data, rule-defined" test)

Every metric below is a deterministic function of stored rows. No score is invented; each states its rule so a member can reproduce it by hand.

1. **Cycle vs previous cycle: adherence.** Completed planned days / planned days (this cycle vs last cycle of the same routine). Rule: a planned day counts when a completed session maps to its `routine_day_index` inside the window. Skipped = planned, past, no completed session.
2. **Cycle vs previous cycle: volume by exercise.** Sum of weight x reps over non-warmup sets, per exercise, this cycle vs last. Show only exercises present in both; unit-consistent only (see risks).
3. **Top-set trend per exercise across cycles.** Best working set (highest est. 1RM, Epley as already used for `pr_est_1rm`) per cycle, last N cycles (cap 6). Needs at least 2 cycles with data, else show nothing.
4. **PR moments by cycle.** Count and list of PRs set in-window using the existing evaluator; baseline is all sets before the window.
5. **Progression movement.** Promotions, deloads, manual changes, reverts in the cycle from `progression_events`, with the stored `reason` text verbatim. No inference beyond the events.
6. **Missed-target pattern.** Exercises where logged reps/weight fell short of the stored target in 2+ consecutive sessions in the cycle. Rule stated on screen.
7. **Muscle-group volume split** (phase 3, only where `primary_muscle` is present on at least 80 percent of logged exercises in the window; otherwise hidden, not estimated).

Explicitly NOT in scope (per card criteria): readiness score, fatigue or recovery scoring, predictions, "AI coach" language, personalized recommendations. Those belong to `FF-ENGINE-002` / recovery lanes. Operator analytics (`FF-ANALYTICS-001`) stays a separate lane and shares no code path or UI.

## 4. Screens and flow

Principle: no new tab. Follow the compact History card language (`HistoryDisclosureCard`, `CardHeader`, `StatGrid`, `CardMeta`); every card must earn its vertical space and be collapsed by default with plain-fact summary items.

- **History overview, current-cycle scope:** one new compact "Cycle review" disclosure card after the existing scope summary. Collapsed summary line: adherence delta and PR count. Open: insights 1, 4, 5 for the selected cycle.
- **Cycle picker:** reuse the existing `cycleOptions` selector; add "compare with previous cycle" as a toggle, not a new screen.
- **History > Exercises > exercise detail:** insight 3 (top-set trend across cycles) and 6 as a section in the existing exercise info scope `current_cycle`, replacing nothing.
- **Detail route (phase 2):** `/history/cycle/[routineId]/[cycleStartDate]` read-only full review, deep-linked from the card, for insights 2 and 7 where lists exceed a card.
- **Empty and low-data states:** a cycle with fewer than 2 completed sessions shows nothing premium (the card is not rendered), never a locked box. A free user with premium-eligible data sees one plain sentence under the free cycle card describing what Pro adds, with the legal-visible upgrade link already used by FF-MON-003. No placeholder metrics.
- **Offline:** History has an offline shell (`HistoryOfflineShell`). Phase 1 cards render only when the data is in the cached payload; otherwise omitted.

## 5. Data and calculation architecture

- New pure module (proposed) `src/lib/cycle-analytics.ts` plus tests: input = already-loaded sessions, session_exercises, sets, planned days, progression events and the `CurrentCycleWindow`; output = typed cycle review. No new DB access in phase 1: extend the existing history loader's selected columns only if a needed column is missing.
- Previous-cycle windows computed by the same `buildCurrentCycleWindow` logic with an offset; local-day keys only.
- Server computes and checks entitlement; the client receives either the review or nothing. Gate on the server, never by hiding on the client (so a free user's payload contains no premium numbers).
- Migrations: none expected for phases 1 and 2. Phase 3 materialization (see section 8) would be a database change and requires owner approval with exact SQL.
- Tests: unit tests for each rule with fixtures (partial cycle, mid-cycle routine edit, unit mix, zero-data), contract test that a free payload contains no premium keys, added to the `ci.yml` contract step.

## 6. Free versus Pro boundary (recommendation, owner decides)

Current Pro (`FF-MON-003`, `src/lib/pro-tier-limits.ts`): capacity only (free 3 routines, 14 saved plans; Pro unlimited). Entitlement keys in `user_entitlements` migration are `pro_lifetime` (checkout code also handles `pro`; confirm the live key set before building the gate).

Recommended split, principle: never lock the member's own raw history or basic scoreboard; charge for synthesis across cycles.

| Free (stays free) | Pro (proposed) |
| --- | --- |
| Current-cycle scope summary, weekly progress, calendar, heatmap, streaks (already shipped) | Cycle-over-cycle comparison (insights 1 and 2) |
| Session and exercise history, PR list, current-cycle PR count | Top-set trend across last N cycles (3) |
| Progression events list on exercise detail | Missed-target pattern (6) and progression movement summary (5) |
| Account data export (FF-ACCOUNT-001) stays free and complete | Muscle-group split (7), detail route |

Rules: downgrading never deletes or hides raw data; premium insights simply stop rendering. Export always includes the underlying rows.

## 7. Phasing

1. **Phase 0 (this card):** plan approved by owner; open decisions below answered.
2. **Phase 1 (about 5 points):** `cycle-analytics.ts` with insights 1, 4, 5 + Cycle review card in History + server entitlement gate, flag-off by default, dev fixture route under `src/app/dev/*` at 320, 390, 430 widths.
3. **Phase 2:** insights 3 and 6 in exercise detail, cycle comparison toggle, detail route.
4. **Phase 3 (optional):** insight 7 and any caching or materialization, only if load measurements justify it.
Each phase ships behind a flag; each phase needs a headless check and owner phone check listed as not verified until done.

## 8. Risks

- **Small samples.** Most members have few cycles; insights must hide below minimum data rather than show noisy deltas. Thresholds are in section 3/4; owner may tune.
- **Mid-cycle edits.** Routine day changes alter denominators; use the planned-day set as stored now, label "based on your current plan", or snapshot at session start (`routine_day_name` is stored on the session, but planned-day history is not versioned: UNKNOWN, needs a decision).
- **Unit mix** (`last_unit` on stats; sets store `weight` without a unit): mixed lb/kg history could mislead. Needs a check of how units are normalized before insight 2/3 ship.
- **Warmups and RPE.** `is_warmup` must be excluded; RPE is optional so no insight may depend on it.
- **`primary_muscle` coverage** may be sparse for custom exercises.
- **Perf.** Cycle windows over 365-day cycles and multi-cycle comparisons scan many sets; keep to bounded queries (cap 6 cycles) and measure before any materialization.
- **Claims risk.** Copy must say "your logged data shows", never "you are ready", "you will", or coaching phrasing. Public-text screen on cards forbids several words; card copy goes through the existing copy tests.
- **Privacy.** Derived analytics are member-only and not sent to operator analytics; no new Privacy Policy event collection unless phase 3 adds persistence (then re-check legal copy).
- **Scope creep** into recovery/engine lanes (FF-ENGINE-002) and recap (FF-RECAP-001, which shares PR/consistency callouts; share the PR evaluation, not the UI).

## 9. Open owner decisions

1. Does Pro expand from capacity-only to include cycle analytics, and does that change the $5/month copy and the "capacity-based for MVP" statement in FF-MON-003? (Policy and pricing copy; not delegated.)
2. Approve the free/Pro table in section 6, or move any row.
3. Minimum-data thresholds (2 cycles for comparison, 2 sessions per cycle) and the 6-cycle cap.
4. Mid-cycle plan edits: label as "current plan" only, or accept a future migration to version planned days (database change, needs exact-hash approval).
5. Unit handling for kg/lb mixed history before volume and top-set trends ship.
6. Whether phase 1 should be flagged to a beta cohort first.

## 10. Acceptance criteria mapping (FF-ANALYTICS-002)

| Criterion | Where met |
| --- | --- |
| No premium analytics UI until metrics and value defined | Sections 3, 7: UI only from phase 1 after owner answers section 9 |
| No empty locked boxes or preview-only copy | Section 4 empty states: card not rendered when data is thin |
| Identifies insights, source data, rules, free/paid boundary | Sections 2, 3, 6 |
| Follows compact History card language | Section 4 |
| No coaching, readiness or prediction claims | Sections 3 (out of scope), 8 |
| Separate from operator analytics and engine | Sections 3, 8 |

Not verified: no production data was read, so real cycle depth and data sparsity per member are UNKNOWN; no device check applies to a plan.
