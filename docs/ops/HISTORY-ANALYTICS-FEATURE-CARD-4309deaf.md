Feature Request
Type: Feature
Status: Resolved
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

Completed Build State
history summary hierarchy, cycle review surfaces, session recap cards, exercise cards, logged-session detail, exercise-info analytics, and progression review surfaces have been rebuilt around usefulness-first metrics
shared metric-card, horizontal-scroll metric rows, structured detail-row formatting, recap-row separators, and signal tags now carry the history-family UI language across the main surfaces
logged-session detail uses the shared app loading pattern, keeps detail content contained, hides unsafe back navigation while disclosures are open, and formats recap targets/logged values with multi-set measurement series
history sessions now prioritize compact cards, move secondary compact metrics into detail metric rows, dedupe promotion/progression copy, and keep completion/session time as leading detail metrics
history summary, routine progression, and cycle summary cards now focus on planned/completed/skipped/completion/exercise/progression metrics and avoid empty watch or duplicate hotspot sections
exercise-history cards now initialize compact, use detailed-card image placement without the old left-strip waste, move last/best/history facts into metric rows, and include scoped mini trend graphs
exercise-info now has the filtered scope model, graph legend/layers/grid/axis treatment, proportional day/set spacing, selected-point scoping, skipped-day support, progression metric priority ordering, and cleaned history day/set rows
progression signals now use promotion, regression, manual, and watch consistently where they are meaningful; low-value generic update tags and totals were removed
routine deletion now cascades owned session data so deleted routines do not leave orphaned history/session rows

Build Split Completed
history shell, filtering, summary hierarchy, and compact/detailed card behavior
session recap, logged-session detail, and exercise disclosure analytics
exercise browser cards, detailed exercise cards, mini trend graphs, and exercise-info graph/history analytics
progression events, signal density, tag cleanup, duplicated metric removal, skipped-day semantics, and cascade-delete cleanup

Remaining Follow-Up
one authenticated visual QA sweep is still useful after production to catch device-specific layout drift, especially mobile graph and dense recap rows

Acceptance Criteria
Add clear card and progression analytics across exercise info, session summaries, logged-session detail, and selected history surfaces.
Surface plain-language outcomes such as promotions, regressions, stalled exercises, net progress, hotspots, PR moments, and needs attention.
Keep surface metrics beginner-clear, avoid repeated low-value stats, and reuse one normalized metric-card language across the history family.

Evidence
Updated Jun 13, 2026. The feature pass is complete, merged to `main`, pushed, synced to the live Discord feedback forum card, and deployed to production at `https://fawxzzy-fitness-local.vercel.app`. History-family summaries, logged-session detail, exercise-history cards, exercise-info graph/history analytics, progression signal tags, scoped filtering, skipped-day handling, and routine-delete cascade cleanup are live. Focused lint/tests, mobile-regression typecheck, deploy preflight, production deploy, and a production login health check passed during closeout.
