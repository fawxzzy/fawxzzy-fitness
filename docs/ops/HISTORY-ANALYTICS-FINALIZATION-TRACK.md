# History / Analytics Finalization Track

Date: 2026-06-10
Owner: Codex lane inside `fawxzzy-fitness`
Feature card: `History / Analytics - Rebuild useful history metrics and progression analytics`
Forum report id: `4309deaf`
Status: active finalization lane

## Purpose

This track turns the long history and analytics rebuild into one measurable closeout lane.

It exists to stop drift between:

- the Discord feature card
- Codex QA notes
- what is already shipped in the app
- what is still incomplete or only partially normalized

## Current Marker

- History / Analytics Finalization Track: `97%`

Marker rules:

- move the marker only when executed app behavior changes or verified lane scope expands
- do not move the marker for wording cleanup alone
- do not count stale runtime or cache confusion as new product progress

## Sub-Lane Markers

- Runtime Hardening and Route Loading: `95%`
- Shared Metric Card Normalization: `97%`
- Progression Analytics and Scope Filters: `95%`
- Signal Density, Legends, and Color Coding: `92%`
- Final QA, Post Alignment, and Closeout: `85%`

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

## Runtime Note

The stale `Loading session detail` screen was not present in current source during this pass.

Verified state on 2026-06-10:

- [src/app/history/[sessionId]/loading.tsx](C:/ATLAS/repos/fawxzzy-fitness/src/app/history/[sessionId]/loading.tsx) uses the shared route loader
- the old `Loading session detail` string was absent from `src/`
- the repo-local dev server on `127.0.0.1:3002` was restarted from recorded runtime state so live output stops lagging behind source
- the dedicated local preview lane on `http://localhost:3004/history` now renders deterministic history fixtures directly when `HISTORY_QA_PREVIEW_ENABLED=1`
- the preview helper at [src/app/dev/history-preview/page.tsx](C:/ATLAS/repos/fawxzzy-fitness/src/app/dev/history-preview/page.tsx) now matches that direct-preview behavior instead of describing a stale cookie-only flow

If the old copy appears again after this restart, treat that as cache or stale-client verification work, not as missing source work.

## What Still Counts As Remaining

### 1. Runtime Hardening and Route Loading

Remaining:

- verify the shared route loader is what the user sees on real authenticated logged-session entry after the restart
- keep replacing one-off loading or recovery shells with canonical app surfaces where drift still exists
- continue route gating that blocks bad navigation targets before they soft-crash the user into a dead-end screen

### 2. Shared Metric Card Normalization

Remaining:

- finish the last exercise-info and logged-session oddball seams where long dual-measurement values still need better packing
- keep chronology, underbar sizing, title color, and row-centering consistent across every metric-board family
- remove any remaining low-value repeated metrics so one fact only appears in one useful place

### 3. Progression Analytics and Scope Filters

Remaining:

- finish deeper exercise-info curation beyond the first pass so Progression, PR History, and Recent History each keep a distinct purpose
- continue richer progression review only where it still adds signal after the row-structure cleanup
- finish broader scope expansion beyond the current all-time and current-routine pair only where the product truth stays clear

### 4. Signal Density, Legends, and Color Coding

Remaining:

- do the final visual QA pass on row-tag spacing, wrapping, and chip alignment across history summaries, logged session, and exercise info
- keep the signal system semantic and stable so color is carrying real meaning, not decoration
- decide whether any remaining dense recap or summary rows still need one-column fallback more often than they do now

### 5. Final QA, Post Alignment, and Closeout

Remaining:

- compress the Discord feature post so it reflects the real landed state without older filler
- make the card and update copy explicitly mention what still remains instead of implying the lane is already done
- run one final history-family QA sweep across session history, exercise history, exercise info, logged session, and logged-session exercise disclosure
- only mark the feature lane complete once the remaining legend and final-normalization work is actually shipped and verified

## Discord Card Alignment

The forum card is mostly accurate about the rebuild, but it still under-represents the new closeout lane split.

The card should reflect:

- the rebuild phase is no longer the hard part
- the remaining work is finalization, normalization, signal-density cleanup, and closeout QA
- the structured row plus tag system is now the shipped baseline, and the remaining work is final visual QA and cleanup
- logged-session route loading and crash-softening are part of the closeout lane

## Next Packet

1. QA the row-tag spacing and one-column fallback behavior across history summaries, logged session, and exercise info.
2. Verify the real authenticated logged-session route and recovered-screen handling now that the deterministic preview lane is stable.
3. Refresh the Discord feature card wording from this tracker after the next executed-state change.
4. Run one final history-family QA sweep and move the marker only from proof-backed improvements.

## Verification Note

This track is currently using:

- focused lint on touched surfaces
- history summary tests
- mobile regression fixture coverage

Known verification caveat:

- direct `src/lib/exercise-info.test.ts` invocation is currently blocked by an existing `next/cache` module-resolution issue in the test path, so that test is not a reliable signal for this lane until the underlying harness problem is repaired

## Done Means

This lane is done only when:

- logged-session and exercise-info entry is stable and uses shared loading and crash handling
- metric-card structure is normalized across the history family
- progression sections are curated without obvious repeats or weak filler
- the legend and color-density pattern is intentionally rolled out where it improves readability
- the Discord feature card and update wording match the real shipped state
- final QA passes without new history-family regressions
