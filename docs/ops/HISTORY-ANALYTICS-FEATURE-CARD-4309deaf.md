Feature Request
Type: Feature
Status: Ready for Fawxzzy Review
Points: 34
Area: History / Analytics
Reporter: @fawxzzy / fawxzzy
Report ID: 4309deaf
Duplicate signals: 1

Title
Rebuild useful history metrics and progression analytics

User Story
As a Fitness user, I want every metric to feel immediately useful, so I can see what improved, stalled, regressed, or changed recently without decoding filler stats.

Description
History / Analytics was rebuilt around usefulness-first review instead of stat volume. Surface metrics should stay beginner-clear and action-guiding while secondary or diagnostic stats move deeper. Scope covers current-cycle progression, the all-time history summary, session recap cards, exercise analytics, exercise info, logged-session detail, and progression review surfaces.

Current Build State
history summary hierarchy and progression review surfaces are live
session, exercise, logged-session, and exercise-info metric cards were rebuilt and mostly normalized
shared metric-card and structured detail-row formatting is now in place across most history-family surfaces
logged-session detail now uses the shared app loading pattern instead of a custom route shell
shared signal-density treatment now supports reusable PR, promotion, watch, and regression badges plus compact row tags across history-family detail sections
weekly cycle summaries and 30-day history summaries now use the shared section-block system instead of bespoke bullet rows
cardio handling is broader across timed, pace, distance, calorie-first, and mixed measurement families
exercise-info now reads in a cleaner sequence so stats, performance, progress, progression, PR history, and recent history are more intentionally separated
exercise-info recent history now avoids repeating the exact latest result when that same result is already surfaced in Stats
history summary metrics now use clearer outcome wording such as unique exercises, vs-prior-week delta, planned days, and completed-vs-planned cycle review
progression activity rows now render as structured full-width entries with tags and exercise or routine context instead of raw bullet strings
logged-session top detail is now recap-first, and logged-session exercise cards plus logged-set rows can carry compact PR, promo, best, and regression tags
exercise info now moves PR History and Recent History under the how-to block and uses row tags to reduce repeated last or best copy
localhost history preview now has a deterministic direct-open QA lane, and preview-seeded exercise history rows can open exercise info instead of failing the API-only id guard

Build Split
history shell and summary hierarchy
session recap and exercise analytics surfaces
exercise info and logged-session detail
progression events, signal density, and cleanup of weak or repeated metrics

Remaining Follow-Up
finish the last visual QA and cleanup pass so row-tag spacing, fallback column behavior, and long-value packing stay consistent across the history family
continue final route hardening and shared crash-soft handling on remaining real authenticated history-family entry paths
run the last history-family QA sweep, then remove any remaining low-value repeats

Acceptance Criteria
Add clear card and progression analytics across exercise info, session summaries, logged-session detail, and selected history surfaces.
Surface plain-language outcomes such as promotions, regressions, stalled exercises, net progress, hotspots, PR moments, and needs attention.
Keep surface metrics beginner-clear, avoid repeated low-value stats, and reuse one normalized metric-card language across the history family.

Evidence
Updated Jun 10, 2026. The lane is in late finalization: shared loaders, structured detail rows, summary metric cleanup, progression activity normalization, recap-first logged-session detail, the deterministic local preview lane, and the latest exercise-info pass are in place; remaining work is final visual cleanup, authenticated-route hardening, and closeout QA.
