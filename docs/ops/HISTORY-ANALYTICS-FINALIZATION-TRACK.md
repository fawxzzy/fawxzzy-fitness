# History / Analytics Finalization Track

Date: 2026-06-10
Owner: Codex lane inside `fawxzzy-fitness`
Feature card: `History / Analytics - Rebuild useful history metrics and progression analytics`
Forum report id: `4309deaf`
Status: resolved, merged, pushed, synced to Discord, and deployed to production

## Purpose

This track turns the long history and analytics rebuild into one measurable closeout lane.

It exists to stop drift between:

- the Discord feature card
- Codex QA notes
- what is already shipped in the app
- what is still incomplete or only partially normalized

## Current Marker

- History / Analytics Finalization Track: `100%`

Marker rules:

- move the marker only when executed app behavior changes or verified lane scope expands
- do not move the marker for wording cleanup alone
- do not count stale runtime or cache confusion as new product progress

## Sub-Lane Markers

- Runtime Hardening and Route Loading: `100%`
- Shared Metric Card Normalization: `100%`
- Progression Analytics and Scope Filters: `100%`
- Signal Density, Legends, and Color Coding: `100%`
- Final QA, Post Alignment, and Closeout: `100%`

## Landed State

The lane is materially past the rebuild stage and is now in normalization and closeout.

Already landed:

- history summary hierarchy and current-cycle review surfaces
- rebuilt session, exercise, logged-session, and exercise-info metric surfaces
- shared metric-card formatting across most history-family surfaces
- current-scope vs all-time filtering across exercise info and history-family entry points
- progression recap, hotspots, activity, and timeline-style review surfaces
- broader cardio handling across time, pace, distance, and calorie-first exercises
- logged-session expansion normalization, including focused progression detail and de-emphasized empty exercises
- route loading updated to use the shared app loader for logged-session detail
- shared detail-section rows now support structured item payloads instead of only loose strings
- shared section-level signal rendering now supports normalized `PR`, `PROMO`, `WATCH`, and `REGRESS` badges without bespoke screen-only markup
- shared detail rows can now carry compact label tags like `PR`, `BEST`, and `LAST` without bloating the row body
- session detail, focused logged-session recap, exercise-info PR history, and recent history now reuse the same signal-density treatment
- weekly cycle summaries and 30-day history summaries now use the shared section-block system instead of bespoke bullet-row markup
- exercise-info panels now read in a cleaner sequence so totals, bests, change, target progression, PR history, and recent history each keep a more distinct job
- exercise-info recent history now drops the duplicate latest-result echo when `Stats` already surfaces that same `Last` result
- history summary metrics now use clearer outcome wording such as `Unique Exercises`, `Weekly Change`, and `x/y completed`
- progression activity rows now render as structured full-width entries with signal tags plus exercise or routine context instead of raw bullet strings
- logged-session top detail is now recap-first instead of splitting the same meaning across separate recap, PR, and progression sections
- logged-session exercise cards now carry real `logged/target` set counts plus compact exercise tags, and logged-set rows can tag best or PR sets directly
- exercise info now moves `PR History` and `Recent History` under the how-to block and uses row tags to reduce repeated `last` and `best` noise
- localhost history preview now has a deterministic sidecar QA lane that can open session history, exercise history, and history detail without live-login friction
- preview-seeded exercise history rows can now open exercise info directly instead of tripping the API-only exercise-id guard
- history summary sections no longer duplicate `WATCH`, `PROMO`, or similar signals at both the title row and item-row level
- current-cycle history metrics now read more explicitly with `Planned Days`, `Completed`, and cleaner week-over-week wording
- progression-activity drill-in rows now use the shared structured item treatment without the old extra bullet dot fighting signal chips and row meta
- exercise-info `PR History` now stays row-tag driven instead of repeating a section-level PR badge above rows that already carry their own signal
- logged-session history cards now initialize compact, keep compact rows thin, and move secondary metrics into detail metric rows without duplicated promotion copy
- logged-session detail recap rows now support multi-set target and logged measurement series, structured exercise separators, centered tags, and a contained detail body
- history summary, routine progression, and cycle summary cards now avoid empty watch sections, duplicate hotspot sections, and low-value generic update counts
- exercise-history detailed cards now move last, best, PR, session, and set facts into metric rows and use scoped mini trend graphs with the same rep-layer plot logic as exercise info
- exercise-info graph/history now supports selected-point scope, proportional day/set spacing, skipped-day markers, graph legend filtering, grid/axis treatment, progression-priority metrics, and regression/watch/manual/promo day tags
- routine deletion now cascades owned session records so deleted routines do not leave leaked session history rows

## Runtime Note

The stale `Loading session detail` screen was not present in current source during this pass.

Verified state on 2026-06-10:

- `src/app/history/[sessionId]/loading.tsx` uses the shared route loader
- the old `Loading session detail` string was absent from `src/`
- the repo-local dev server on `127.0.0.1:3002` was restarted from recorded runtime state so live output stops lagging behind source
- the dedicated local preview lane on `http://localhost:3004/history` now renders deterministic history fixtures directly when `HISTORY_QA_PREVIEW_ENABLED=1`
- the preview helper at `src/app/dev/history-preview/page.tsx` now matches that direct-preview behavior instead of describing a stale cookie-only flow

If the old copy appears again after this restart, treat that as cache or stale-client verification work, not as missing source work.

## Closeout Review

The implementation pass is complete for this non-production branch. The remaining items are operational closeout, not feature-build scope.

### Completed In This Pass

- Exercise info: graph, legend, selected-point scope, skipped days, regression/watch/manual/promo tags, progression metric priority, scoped filtering, and history row cleanup.
- History exercises: compact initialization, detailed-card image placement, non-duplicated metrics, mini trend graph, and rep-layer plotting.
- History sessions: compact-card thinning, detail metric migration, completion/session-time leading metrics, recap-row structure, tag cleanup, and detail body containment.
- Summary/progression cards: planned/completed/skipped/completion metrics, deduped signals, hidden empty sections, recap rows, and normalized metric rows.
- Runtime/data: shared loading/error behavior coverage, routine delete cascade migration, and targeted regression tests for the touched logic.

### Still Worth Checking After Production

- Authenticated visual QA on the real app, especially mobile graph sizing, dense recap horizontal scroll hints, and long multi-set values.

## Discord Card Alignment

The local feature-card summary and live Discord forum card are aligned. The live forum card now carries the resolved state, the updated title/body, the resolved tag set, the approved completion review state, a success reaction, and a closeout audit comment.

## Next Packet

1. Continue with the next logged-session focused pass after this production closeout.
2. Keep any future visual polish scoped to dense graph, recap-row, and mobile layout issues discovered in authenticated use.

## Verification Note

This track is currently using:

- focused lint on touched surfaces
- history summary tests
- mobile regression fixture coverage

Known verification caveat:

- direct `src/lib/exercise-info.test.ts` invocation is currently blocked by an existing `next/cache` module-resolution issue in the test path, so that test is not a reliable signal for this lane until the underlying harness problem is repaired

## Done Means

This lane is done locally when:

- logged-session and exercise-info entry is stable and uses shared loading and crash handling
- metric-card structure is normalized across the history family
- progression sections are curated without obvious repeats or weak filler
- the legend and color-density pattern is intentionally rolled out where it improves readability
- the Discord feature card and update wording match the real shipped state
- final focused QA passes without new history-family regressions

As of June 13, 2026, the lane meets the local feature criteria and the operational closeout criteria: merged to `main`, pushed, production deployed, release-ledger ready, and synced to the live Discord feedback forum card.
