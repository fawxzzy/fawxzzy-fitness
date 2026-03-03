# Changelog

All notable changes to this project are documented in this file.

## 0.3.6 - 2026-03-03

### WHAT
- Updated the Routines switcher summary metadata to remove cycle length and show only training/rest day counts.
- Cleaned up duplicated changelog document blocks so release entries live in one canonical changelog stream.

### WHY
- Keeps routine summary text compact and focused on the day breakdown users requested.
- Restores changelog readability and prevents future release entries from being appended into duplicate sections.

## 0.3.5 — 2026-03-03

### WHAT
- Added a small header-to-content spacing gap on main-nav routes by extending the shared AppShell top offset contract.

### WHY
- Prevents the fixed top nav container from visually touching the first content panel on initial load and keeps spacing more consistent across main-tab screens.

## 0.3.4 — 2026-03-03

### WHAT
- Converted BottomActionBar to support in-flow sticky footers by default, while preserving an explicit fixed variant for true viewport overlays.
- Moved Today, Current Session set logging, Routines overview, Routines day view, and History log-detail bottom actions to sticky in-flow placement inside their scrollable page content.
- Removed fixed-overlay compensation padding and measured reserve-height contracts tied to BottomActionBar.

### WHY
- Prevents bottom action bars from covering final content rows on mobile by placing actions under content in the same scroll flow without reserve-height math.

## 0.3.3 — 2026-03-03

### WHAT
- Prepared a patch production release by bumping the app version from 0.3.2 to 0.3.3.

### WHY
- Keeps production deployments intentional and traceable through an explicit SemVer patch release.

## 0.3.2 — 2026-03-03

### WHAT
- (fill in)

### WHY
- (fill in)

## 0.3.1 — 2026-03-03

### WHAT
- Enforced a skin-to-skin safe-area contract so no-nav screens now use only top safe-area inset by default and fixed-bottom spacing uses a shared bottom inset + 3px gap token.
- Replaced static BottomActionBar reserve assumptions with measured bar-height publishing and unified content reserve consumption through `--app-bottom-offset`.
- Removed extra local bottom compensation on Today bottom-action surfaces so reserve comes from one owner.

### WHY
- Eliminates persistent extra top gutters on no-nav screens and keeps fixed bottom actions from either covering content or creating oversized dead space across iOS Safari/PWA layouts.

### Fixed
WHAT:
- Centralized shell safe-area contracts so top spacing is derived from one top-offset variable and bottom spacing reserves fixed action bars through a shared bottom-offset variable.
- Normalized BottomActionBar/content reservation to use shared shell variables instead of per-screen `calc(env(...)+magic-number)` padding.
- Removed duplicate per-surface bottom compensation in Current Session surfaces and aligned no-nav edit/detail screens to the shared top-nav mode contract.
WHY:
- Eliminates inconsistent extra top/bottom whitespace and ensures fixed bottom actions stay reachable without obscuring content across iOS Safari/PWA screens.

## 0.3.0 — 2026-03-03

### Changed
WHAT:
- Prepared a minor production release by bumping the app version from 0.2.0 to 0.3.0.
WHY:
- Marks this deployment as an intentional SemVer minor release so production rollout remains explicit and traceable.

### Fixed
WHAT:
- Fixed oversized and unstable top whitespace on screens without MainTopNav by making top header offset conditional and using a single safe-area top spacing contract for those screens.
- Applied the no-nav top spacing mode to Current Session, Edit Day, and History log detail surfaces.
WHY:
- Prevents the top gap from over-allocating or growing after scroll-to-top on no-nav screens while keeping MainTopNav screen spacing unchanged.

### Fixed
WHAT:
- Restored the top spacing between the floating NavBar and the Routines page primary container to match the Today tab rhythm.
WHY:
- Keeps primary tab layouts visually consistent and prevents Routines content from crowding the sticky header.

### Fixed
WHAT:
- Reduced internal padding for History Sessions compact-view cards.
WHY:
- Decreases compact card height so more session rows fit on screen while preserving the existing details-view layout.

### Fixed
WHAT:
- Fixed the Routines screen shell so the bottom Edit Routine action bar is truly viewport-pinned with safe-area support and the page content reserves matching bottom space.
- Consolidated routine cycle metadata into the routine switcher trigger title line as `Routine Title | {cycle summary}` and removed the duplicate standalone gray metadata line from the page body.
WHY:
- Keeps the primary action consistently reachable at the true bottom on mobile, prevents list content from being obscured, and removes duplicated metadata for a cleaner single-source routine summary.

### Fixed
WHAT:
- Polished the Routine screen header by removing duplicate standalone title/subtitle text, moving the Routine edit action into the shared bottom action bar, and showing routine subtitle context inline in the routine switch trigger as `Title | subtitle`.
- Normalized Today in-progress workout controls so “Resume Workout” and “Discard Workout” use matching button sizing, padding, and shape while keeping the destructive color treatment for discard.
WHY:
- Reduces header clutter, keeps routine-switch context in one compact control, improves action discoverability with a consistent bottom CTA pattern, and prevents visual drift between paired resume/discard actions.

### Fixed
WHAT:
- Updated Day Viewer → Edit Day navigation so Edit Day back now returns to the originating Day Viewer route context.
- Simplified Day Viewer and Today headers by removing subtitle lines and normalizing Today title format to “Routine Name | Day Name” while keeping the exercise-count indicator.
- Added a consistent full goal line on planned exercise cards across Day Viewer and Today surfaces, including a fallback when a goal is unset.
WHY:
- Improves navigation predictability, reduces header clutter, and makes planned training targets immediately visible while scanning exercise lists.

### Fixed
WHAT:
- Standardized Today in-progress actions so “Resume Workout” and “Discard Workout” now use the shared frosted bottom action bar in a side-by-side layout.
- Standardized Current Session set logging so the “Save Set” action now uses the same bottom action bar surface.
WHY:
- Keeps core workout actions in one consistent, thumb-reachable location and removes heavier card-backed action treatments for a cleaner, more predictable mobile flow.

### Fixed
WHAT:
- Added the shared frosted bottom page action bar to Routines → Day View with a single full-width “Edit Day” action.
- Reserved matching bottom content space in Day View so planned exercise cards remain fully visible above the fixed action bar.
WHY:
- Improves Edit Day action discoverability and aligns Day View with the new consistent bottom action-bar pattern used across primary app surfaces.

### Fixed
WHAT:
- Standardized planned-exercise list UI across Routine Day, Today, and Session surfaces with one canonical `ExerciseCard` presentation contract.
- Updated these screens to reuse the same card styling, subtitle treatment, chevron alignment, and optional set-count pill behavior.
WHY:
- Removes visual drift between equivalent exercise planning surfaces and makes interaction patterns more consistent and predictable.

### Fixed
WHAT:
- Replaced the Today and History Log vertical bottom action stacks with a reusable fixed bottom frosted action bar that keeps two actions side-by-side.
- Updated Today (“Start Workout”, “Change Workout”) and History Log (“Edit”, “Delete”) actions to stay anchored at the page bottom with safe-area-aware spacing and matching content bottom padding.
WHY:
- Normalizes primary action placement, reduces visual weight from card-like action containers, and improves thumb reach and consistency with the app’s frosted navigation language.

### Fixed
WHAT:
- Updated the Routines “Switch routine” sheet so selecting a routine reliably applies it as the active routine and updates the on-screen routine state immediately.
WHY:
- Prevents intermittent missed routine switches caused by sheet-close timing and ensures users see the newly active routine without manual refresh.

### Fixed
WHAT:
- Polished History → Sessions view mode labeling and controls by renaming the user-facing “List” mode to “Details” and tightening the mode picker layout directly beneath the Sessions/Exercises segmented control.
- Updated History → Sessions compact cards to render only a centered single-line summary in the format “Routine | Day | Date”.
- Updated History → Sessions details cards to prioritize session duration metadata and move timestamp context beneath it with clearer time labeling.
WHY:
- Makes mode selection and card metadata easier to scan on mobile while normalizing how session timing information is understood across view modes.

## 0.2.0 — 2026-03-02

### Fixed
WHAT:
- Normalized Exercise Info so the Stats panel is always visible across all Exercise Info entry flows.
- Added a stable empty-state message when an exercise has no recorded stats.
WHY:
- Removes confusing cases where the Stats section disappeared for some exercises and keeps Exercise Info layout consistent.

### Changed
WHAT:
- Prepared a minor production release by bumping the app version from 0.1.0 to 0.2.0.
WHY:
- Marks this deployment as an intentional SemVer minor release so production rollout is explicit and traceable.

## 0.1.0 — 2026-03-02

### Changed
WHAT:
- Added a deterministic Exercise ↔ icon audit command that scans the canonical global exercise seed list against `public/exercises/icons/` and exports review-ready bucket CSVs plus a markdown report.
- Committed generated icon audit artifacts under `artifacts/icon-audit/` and `docs/icon-audit-report.md` for fast reviewer triage.
WHY:
- Gives a single source of truth for new-icon, off-by-name, and imageless exercise gaps without silent file mutation, so icon linkage decisions stay explicit and auditable.

### Fixed
WHAT:
- Updated History → Sessions card text ordering for Compact and List view modes.
WHY:
- Improve scanability and standardize key metadata presentation.

### WHAT
- Added an intentional release workflow with SemVer bump commands for patch/minor/major releases.
- Added a release governance ritual that requires local validation before creating and pushing a `v*` release tag.

### WHY
- Makes production deployments explicit, repeatable, and tied to versioned release intent instead of ad-hoc pushes.

### Fixed
WHAT:
- Integrated production PWA app icons and updated manifest paths.
WHY:
- Remove missing icon 404s and improve installability and mobile home-screen presentation.

### Fixed
WHAT:
- Fixed History → Sessions hydration mismatches by keeping the initial render on the server-selected view mode and restoring local view-mode preference only after client mount.
- Standardized History → Sessions date/time display to a deterministic locale/timezone so server and client render the same timestamp strings.
WHY:
- Prevents Suspense hydration boundary crashes caused by server/client first-paint text drift in view-mode labels and timestamp formatting.

### Fixed
WHAT:
- Updated History → Log Details so read-mode bottom actions stack vertically (full-width Edit above full-width destructive Delete) and session notes render in a dedicated panel directly under the summary only when notes exist.
- Updated Log Details edit mode to remove per-set Save actions and persist set edits only when the global Save action is pressed, while keeping immediate Delete Set behavior and collapsible set editors.
WHY:
- Clarifies action hierarchy in read mode, makes saved session notes discoverable without entering edit mode, and keeps edit sessions reversible until explicit global Save.

### Fixed
WHAT:
- Unified History Sessions controls by wrapping the Sessions/Exercises tabs and View Mode selector in a single highlighted container.
WHY:
- Strengthens visual hierarchy and groups related controls into one cohesive interaction block.

### Fixed
WHAT:
- Log Details: renamed the bottom destructive action to “Delete”, aligned it to match the Edit button shape/size, corrected summary panel top-left alignment with top-right back control, and added collapsible per-set editors in edit mode with one expanded set at a time and auto-expand for newly added sets.
WHY:
- Improves action consistency and scanability while reducing edit-mode clutter so set updates stay fast and focused.

### Fixed
WHAT:
- Polished History → Log Details summary/header spacing and standardized set-count badge rendering so the top panel/back row and `X SETS` pills stay consistently aligned without wrapping artifacts.
- Anchored Log Details primary actions to the viewport bottom with safe-area support, and reserved matching content bottom space so list content remains fully reachable above the action bar.
- Normalized Log Details sticky action button sizing to balanced two-column full-width controls for both Edit/Delete and Cancel/Save states.
- Reused the shared “Modify measurements” editor in Log Details set edit mode so measurement toggles, unit pickers, and metric input behavior match Current Session/Add Exercise.
WHY:
- Removes remaining layout drift in Log Details, keeps critical actions persistently reachable during scrolling, and aligns measurement editing behavior across workout logging and history correction flows.

### Changed
WHAT:
- Rehauled History → Log Details into a dedicated detail-view layout with no tab/nav shell, a normalized top-right Back action, header-level Edit/Delete Log actions, compact summary lines, and denser exercise/set cards.
WHY:
- Improves scan speed and visual consistency with History list cards while reducing action clutter and keeping the log detail flow focused.

### Changed
WHAT:
- Added a GitHub Actions workflow that deploys production to Vercel when version tags matching `v*` are pushed.
WHY:
- Automates release deployment from tag events to make production rollouts consistent and repeatable.

### Fixed
WHAT:
- Rehauled History Log Details UI with a unified top header/back action pattern, a structured session summary panel, normalized exercise and set editor layout, and a simplified sticky action area.
WHY:
- Improves readability, reduces action-placement confusion, and aligns Log Details with the app’s normalized mobile page-shell interaction contract.

### Fixed
WHAT:
- History Sessions now uses a compact collapsible “View Mode” selector instead of the segmented “Log view” toggle, and session cards now follow normalized List/Compact text layouts.
WHY:
- Reduces header UI clutter while making session information easier to scan consistently across view modes.

### Fixed
WHAT:
- Accepted known legacy exercise IDs in the Exercise Info open/load path so built-in legacy selections (including Barbell Row-era IDs) can still resolve the info sheet.
WHY:
- Prevents invalid-ID guardrails from blocking legitimate legacy exercise selections and restores reliable access to their info screens.

### Fixed
WHAT:
- Removed the Exercise Info Stats debug diagnostics line that displayed canonical/stat exercise IDs in the Info sheet.
WHY:
- Keeps the Info screen user-facing content clean by removing internal debugging text.

### Fixed
WHAT:
- Removed the nested History → Exercises list viewport scroll owner and its iOS momentum-scroll styling so the page-level `ScrollContainer` is the only vertical scroller.
WHY:
- Eliminates the secondary scrollbar indicator on Safari/iOS and enforces the single-scroll-owner page shell contract.

### Fixed
WHAT:
- Updated History → Exercises row cards so the right-side image column now sizes from row height as a square and the divider position adapts naturally with card height.
- Switched History exercise thumbnails in these rows to edge-to-edge fill mode for the standardized square icon set.
WHY:
- Removes fixed-width thumbnail constraints so divider placement stays proportional to each row and standardized square icons render without letterboxing.

### Fixed
WHAT:
- Removed `AppPanel` from History → Exercises row cards and switched the row shell to a direct non-panel container so card fill reaches the highlight border edge-to-edge.
WHY:
- Eliminates the persistent inset gap caused by inherited panel base padding and restores the intended flush card treatment without changing row behavior.

### Fixed
WHAT:
- Refined History → Exercises row cards so the dark card fill is flush to the outer highlight border, softened the card highlight intensity, and allowed long exercise titles to wrap to two lines.
WHY:
- Improves card polish and title readability while preserving the existing History list interaction behavior.

### Changed
WHAT:
- Formalized the shared app-wide filter panel contract in `ExerciseTagFilterControl`, including canonical header/summary behavior and minimal prop-based customization (`countDisplayMode`, `defaultOpen`, `headerLabel`) while preserving default rendering on existing screens.
WHY:
- Prevents filter UI drift across screens while still allowing intentional, constrained variations without forking bespoke filter UIs.

### Fixed
WHAT:
- Followed up History → Exercises row layout so text content is left-aligned and the exercise image sits flush on the right edge of the card.
- Removed remaining inner card inset spacing so the row fill reaches the highlight border as a single shell.
WHY:
- Matches the intended left-content/right-image hierarchy and removes the remaining sticker/inset visual gap in exercise history rows.

### Fixed
WHAT:
- Simplified History → Exercises card shells so each row uses a single visible border/highlight surface and no inset border/fill gap.
- Updated the History exercise icon treatment to remove the inner icon border so the image blends with the row card edge while preserving full-row tap and Info-open behavior.
WHY:
- Eliminates the double-border/sticker look in History exercise rows and improves visual cohesion without changing interaction contracts.

### Changed
WHAT:
- Added a governance scope declaration and Playbook version pin in local project governance to align with the Playbook v0.3.3 contract model.
WHY:
- Prevents doctrine drift and clarifies the local adoption boundary.

### Fixed
WHAT:
- Added a deterministic Exercise Info fallback for canonical built-in exercises when the `exercises` table lookup does not return a row.
WHY:
- Prevents Pull-Up and other baseline Exercise Info screens from returning 404 when legacy/missing catalog rows drift from the seeded built-in ID set.

### Fixed
WHAT:
- Added a canonical Exercise Info open guard that blocks falsy, sentinel, and non-UUID exercise IDs before any network request, with a user-facing invalid-link toast and source-tagged diagnostics.
- Upgraded `/api/exercise-info/[exerciseId]` failures to always include `step` and `requestId` in JSON and response headers, and added request-scoped server logging for fatal and non-fatal phases.
- Corrected Exercise Info base payload loading to query only schema-backed exercise columns so valid exercise UUIDs resolve successfully instead of failing in the base payload phase.
WHY:
- Prevents invalid sentinel traffic from reaching the API and makes remaining bad callers immediately attributable at the open source.
- Reduces production triage time by making every 400/401/404/500 response self-diagnosing and traceable via request correlation.
- Restores reliable 200 responses for valid exercise info lookups by removing schema/select mismatch failure paths.

### Fixed
WHAT:
- Stabilized `/api/exercise-info/[exerciseId]` responses to a consistent envelope contract for success and failure cases, including explicit invalid-id, unauthenticated, not-found, and unexpected-error outcomes.
- Hardened Exercise Info loading so expected missing/visibility cases resolve to not-found behavior and downstream stats/media failures degrade gracefully instead of crashing the endpoint.
- Updated Exercise Info client error parsing to prefer stable server `message` values while preserving compatibility with legacy `error` payloads, and added an endpoint validation script for the 400/401/404/(optional 200) status matrix.
WHY:
- Prevents production 500s for expected Exercise Info edge cases and makes route behavior deterministic across runtime environments.
- Improves debugging and user-facing reliability by standardizing API errors, preserving canonical UI behavior, and adding a repeatable regression check for endpoint status handling.

### Changed
WHAT:
- Unified Exercise Info across History Exercises, Today, Routines Day View, Edit Day info buttons, and the exercise picker so all entry points open the same canonical Exercise Info sheet.
- Standardized Exercise Info data loading to a single server-backed resolver path keyed by exercise ID, and retired the separate Exercise Details page as an alternate UI path.
WHY:
- Eliminates UI/content drift between entry points and ensures identical sections, media behavior, and stats formatting everywhere Exercise Info is opened.

### Changed
WHAT:
- Replaced the Current Session “Add Exercise” action surface with explicit “Edit Day” and “Quick Add” actions.
- Added a minimal Quick Add flow that appends session-only exercises unlinked from routine day templates.
WHY:
- Keeps Current Session focused on training/logging while making template edits explicit.
- Prevents accidental routine/template drift while still supporting one-off in-session additions.

### Changed
WHAT:
- Removed heuristic routine/template matching from session rendering and target resolution.
- Template-derived targets now apply only when a session exercise has an explicit `routine_day_exercise_id` link.
WHY:
- Prevents silent metric/target drift when routine exercises are reordered, duplicated, inserted, or removed.
- Makes routine-to-session linkage deterministic and easier to reason about across planned and ad-hoc exercises.

### Fixed
WHAT:
- Re-applied the shared main-tab spacing wrapper on History Sessions and History Exercises so both tabs keep consistent breathing room between the top Nav bar and the primary content panel.
WHY:
- Restores the intended top gap under the glass navigation header and prevents the History panel from visually touching the Nav bar after the layout regression.

### Changed
WHAT:
- Introduced a shared page layout contract with `AppShell` and `ScrollContainer` so each page has one deterministic vertical scroll owner.
- Refactored History pages to adopt the single-scroll-owner structure, including Sessions, Exercises, and Log Details screens.
WHY:
- Prevents nested overflow conflicts that could cause non-scrollable/trapped lists and mobile layout jumpiness.
- Normalizes scroll behavior and sticky element stability across History surfaces.

### Fixed
WHAT:
- Added deterministic auth middleware for protected routes to refresh expired/near-expiry access tokens using the refresh token.
- Secured server-owned session cookies with httpOnly defaults and production-only secure flags across login/signup and auth confirmation flows.
WHY:
- Prevents token drift between client/server auth state and removes session refresh instability.
- Makes SSR and server action authentication deterministic while reducing random logout behavior.

### Fixed
WHAT:
- Reworked History → Exercises card tap targets so card content is rendered inside the interactive control instead of beneath an absolute overlay.
WHY:
- Prevents mobile WebKit from painting native button chrome over the card surface, which could make exercise rows look blank while keeping the same tap-to-open behavior.

### Fixed
WHAT:
- Fixed History → Exercises cards so each row’s primary exercise label remains visible while preserving full-card tap behavior for opening exercise details.
WHY:
- On some mobile browsers, the full-card overlay button could render with default button chrome and obscure row content, making cards appear blank.

### Fixed
WHAT:
- Reduced the vertical spacing between the top navigation bar and main content on Today, Routines, and Settings so first-load layout matches the tighter History tab rhythm.
WHY:
- Removes the extra perceived gap under the nav on primary tabs and makes top-of-screen composition feel consistent at initial load.

### Changed
WHAT:
- Removed the top-of-app live clock from the navigation header so only the screen title and tab bar remain.
WHY:
- Simplifies the app chrome and removes a non-essential moving UI element at the top of every screen.

### Changed
WHAT:
- Refined the Routines screen active routine card spacing and typography hierarchy for the routine title, subtitle, and day-list rhythm.
- Updated Routines day rows to use brighter emerald accent text, cleaner left/right alignment, and improved long-name wrapping behavior.
- Restyled the TODAY badge with a white-highlight border treatment and subtle emphasis on the current-day row.
WHY:
- Improves readability and scanability on dark backgrounds, keeps row alignment consistent across varying day names, and makes the current-day indicator easier to recognize at a glance.

### Changed
WHAT:
- Removed the inner scroll constraint from Today's “Choose workout day” options so the day list expands naturally within page flow.
WHY:
- Prevents nested scrolling in the day picker and keeps workout-day selection aligned with a single, natural page-level scroll experience on mobile.

### Changed
WHAT:
- Refined Today screen workout/day info panel styling to use the same highlighted thin-outline treatment as the routine overview card style.
- Updated Routines screen selection flow so the selector emphasizes routine picking (with routine rows plus a Create New Routine action), while day details remain in the main routine view.
- Moved the TODAY indicator in the routine day list to sit beneath the DAY label and converted each day row into a compact clickable card.
- Added routine day detail navigation so tapping a day opens a dedicated day plan screen with planned exercises (or a clear rest-day state).
WHY:
- Improves visual consistency between Today and Routines, increases selector clarity, and makes day-plan inspection faster and more discoverable from the routine overview.

### Changed
WHAT:
- Refined History navigation and layout: Sessions/Exercises tabs now fill the segmented container without the extra inner backing box, Exercises now uses one shared highlighted container for Search + Filters, and Log Details now presents as a dedicated page layout with a top-right Back affordance.
- Kept Delete Session accessible within the Log Details header while separating it from the primary Back navigation action.
WHY:
- Improves visual hierarchy and consistency across History screens, makes filters/search feel like one cohesive control area, and clarifies navigation in Log Details without sacrificing destructive-action access.

### Changed
WHAT:
- Refined visual contrast, blur intensity, card boundaries, accent emphasis, and typography hierarchy across Today, Routines, History, and Settings for a crisper presentation.
- Improved History log scan hierarchy with clearer monthly separation cues and subtler de-emphasis of older entries while keeping structure intact.
WHY:
- Improve visual hierarchy, readability, and perceived product maturity without altering layout structure, architecture, or data flow.

### Changed
WHAT:
- Polished the History Sessions screen so list scrolling ends cleanly against the viewport with mobile safe-area breathing room and without an inner nested scroll region.
- Replaced the misleading session-row overflow affordance with explicit view navigation behavior (full-row tap + right-side View label).
- Moved session deletion from the History list into the session detail view with destructive confirmation before removal.
WHY:
- Improves mobile scroll finish quality, aligns row affordances with actual behavior, and reduces accidental destructive actions from the list surface.

### Changed
WHAT:
- Overhauled the History experience with a stronger Sessions/Exercises segmented control, denser scan-friendly cards, and calmer visual hierarchy for metadata and actions.
- Updated session deletion affordances to a compact overflow-style action while keeping explicit confirmation context (session name + date/time).
- Refined History → Exercises rows to surface last-performed context and key stats, with a dedicated info action that opens the existing Exercise Info overlay using canonical exercise IDs.
WHY:
- Improves at-a-glance readability, reduces destructive-action visual noise, and aligns History with the refreshed app UI language while preserving reliable in-place exercise info behavior.

### Changed
WHAT:
- Polished the Routines day list layout with fixed-width day labels for stable row alignment, a softer TODAY row emphasis, lighter row dividers, and cleaner Rest text styling.
WHY:
- Improves scanability and visual stability on long day names while reducing wireframe-like contrast without changing routine behavior.

### Changed
WHAT:
- Moved the History → Exercises back-navigation control to the right side of the card header area.
WHY:
- Matches requested navigation placement and keeps the exercise browser header actions visually consistent with top-right back affordances used elsewhere.

### Changed
WHAT:
- Updated the Exercise Info overlay layout to remove the “HOW-TO” heading, remove the duplicate bottom “Primary Muscles” section, and place exercise description content in a highlighted bordered box above Stats.
- Replaced the Exercise Info header “Close” control with a back-arrow button that preserves the same dismiss behavior.
WHY:
- Aligns Exercise Info with the new content hierarchy, removes redundant muscle labeling, and improves scanability and consistency with expected back-navigation affordances.

### Changed
WHAT:
- Removed the Exercise Info “Muscles” image section and consolidated both Info surfaces to a single canonical How-to image slot.
- Removed application-layer usage of `image_muscles_path` and deleted muscle-image resolver code paths so how-to media resolution is now the only image fallback chain.
WHY:
- Reduces duplicate media surface area, simplifies deterministic fallback behavior, and gives the remaining image slot more useful space in the existing dark-theme layout.

### Changed
WHAT:
- Expanded History → Exercises cards so each exercise row uses the full card footprint with larger visual treatment for names and thumbnails.
WHY:
- Improves readability for long exercise names and gives exercise images more useful space when scanning progress history.

### Fixed
WHAT:
- Polished the Current Session sticky header spacing at the top-of-page by adding reliable iOS safe-area breathing room, a stable minimum header height, and an opaque surface background behind the status bar area.
WHY:
- Prevents the header from feeling cramped or visually cut off at scroll-top on iPhone while preserving the existing sticky behavior during workout logging.

### Changed
WHAT:
- Added a deterministic missing-icons backfill mode to the exercise icon sync workflow, with a report-first default and explicit apply-only behavior for unambiguous matches.
- Added a generated `icon-missing-backfill-report.md` output that lists missing slugs, ambiguous candidates, and skipped file inventory reasons.
WHY:
- Improves icon coverage auditing and safe backfill operations without guessing, so missing exercise icons can be resolved predictably.

### Fixed
WHAT:
- Adjusted the Current Session sticky header to respect iOS safe-area spacing, swapped Save Session and Back positions, and moved the session title into page content so it can fully wrap.
WHY:
- Prevents notch/status-bar overlap while keeping critical controls and workout context readable and always accessible during logging.

### Changed
WHAT:
- Replaced the exercise icon sync tooling with a deterministic canonical-folder workflow that validates filename contracts, regenerates the existing icon manifest, and writes a stable human-readable sync report.
WHY:
- Gives a predictable manual drop-and-sync path for new exercise icons while preventing silent renames and reducing icon catalog drift risk.

### Changed
WHAT:
- Updated Current Session with a compact sticky top control bar that keeps Back, session title, elapsed session time, and Save Session visible while scrolling.
- Added a sticky Save set footer in expanded exercise logging so the primary set action stays reachable, with extra spacing to keep final inputs visible above the footer.
- Simplified expanded exercise goal presentation to a single compact goal line and reduced visual emphasis on the Modify measurements control.
WHY:
- Keeps workout context and core actions continuously available during long logging flows, reducing navigation and reach friction without changing session behavior.

### Fixed
WHAT:
- Ensured Add Exercise always submits the selected measurement targets (reps/weight/time/distance/calories) even when the Measurements panel is collapsed.
WHY:
- Measurement selection checkboxes were only rendered while expanded, so collapsed submissions dropped measurement flags and persisted empty goal/target fields.

### Fixed
WHAT:
- Restored deterministic goal target persistence across routine-day editing and active-session exercise creation by using a shared measurement-goal mapping contract.
- Restored session seeding from routine templates so Today → Start Workout carries sets and measurement targets (reps/weight/time/distance/calories) into `session_exercises` goals.
- Restored Current Session logger goal prefill behavior when switching exercises so target defaults populate consistently regardless of measurement panel disclosure state.
WHY:
- Goal target fields had drifted between routine/session create flows and session seeding, which caused target columns to be dropped and downstream Today/Current Session goal rendering to appear blank.

### Changed
WHAT:
- Refined Today screen information hierarchy with a stronger two-line workout header, denser-but-more-readable exercise rows, and a subtle content panel that better separates foreground content from the atmospheric background.
- Removed Today’s inner exercise-list scroll constraint so workout preview content now follows a single natural page scroll.
- Rebalanced Today action emphasis so Start/Resume Workout uses a premium muted-green primary treatment while Change Workout remains a clearly secondary control, and tightened top navigation spacing/corner treatment for consistency.
WHY:
- Improves scanability, perceived quality, and interaction clarity on the Today surface while reducing scroll friction and preserving the existing workout/session behavior.

### Fixed
WHAT:
- Updated exercise How-to image resolution to ignore the seeded how-to placeholder path, use the exercise icon as the fallback visual, and hide the How-to panel when neither a real how-to image nor a real icon exists.
- Applied the same How-to hide-on-placeholder behavior in both the Exercise Info sheet and the Exercise details page.
WHY:
- Seeded placeholder values in `image_howto_path` were treated as real assets, which prevented icon fallback and forced placeholder visuals even when icon media existed.

### Fixed
WHAT:
- Re-synced the Exercise Info overlay HOW-TO image to the canonical exercise media resolution path so icon-backed exercises reliably render the same visual used in the picker thumbnail, with a guaranteed placeholder fallback when no icon exists.
- Tightened Exercise Info section styling for STATS, HOW-TO, and MUSCLES with consistent section headers and more compact, single-surface media containers.
WHY:
- Prevents blank HOW-TO panels, keeps exercise visuals predictable when switching between items, and improves information density/consistency without changing data flow or schema.

### Changed
WHAT:
- Fixed `/history/exercises` row interactions to open the existing in-place Exercise Info overlay instead of navigating to a non-existent `/exercises/[id]` destination.
- Expanded exercise personal records to cache and expose both “Actual PR” (best recorded weighted set) and “Strength PR” (best estimated 1RM), and updated Exercise Info/Exercise Browser UI labels to show Last + Actual PR + e1RM PR together.
WHY:
- Restores deterministic, in-context exercise detail navigation without 404 regressions.
- Separates intuitive literal best-set tracking from strength-estimate progression so users can read progress more clearly.

### Fixed
WHAT:
- Hardened `/history/exercises` server rendering with a safe fallback state so users see a friendly error card instead of a route crash when exercise history data fails to load.
- Added server-side diagnostics for history exercise data failures and tolerated missing `exercise_stats` relation/column schema drift by gracefully rendering rows without stats.
WHY:
- Prevents production-only Server Components failures from hard-crashing the page while giving actionable server logs to diagnose RLS/schema/query issues safely.

### Added
WHAT:
- Added an Exercise Browser under History with a dedicated `/history/exercises` view, searchable compact exercise rows, and Last/PR stat previews sourced from the existing `exercise_stats` cache.
- Added a lightweight Sessions/Exercises switch on History so users can move between the existing Sessions timeline and the new Exercise Browser.
WHY:
- Makes exercise progress discoverable without digging through session history, while keeping the experience fast and glanceable.

### Changed
WHAT:
- Showed per-exercise Personal stats (Last performed + PR) directly on the Exercise Info overlay opened from Add Exercise, using canonical exercise UUID mapping from `exercise.exercise_id ?? exercise.id`.
WHY:
- Makes progress visible anywhere users inspect exercise details, reducing friction and reinforcing motivation without requiring navigation to Measurements.

### Fixed
WHAT:
- Fixed Exercise Info overlay scroll locking so body/page scrolling is fully restored immediately after closing the overlay.
WHY:
- Prevents the Add Exercise screen from becoming non-scrollable after viewing Exercise Info, especially on iOS Safari/PWA.

### Changed
WHAT:
- Added a left-side Info button on each “Currently added workouts” exercise row in the Edit Day list and wired it to open the existing Exercise Info overlay for that exercise.
- Kept the row layout stable by preserving right-side Edit controls and tightening left text truncation behavior for long exercise summaries.
WHY:
- Gives users fast in-context access to exercise guidance/details while editing a day without navigating away.
- Prevents control collisions and awkward wrapping on smaller screens while retaining the existing quick-edit workflow.

### Fixed
WHAT:
- Added missing `session_exercises` goal target columns for reps, weight, time (seconds), distance, and calories so Current Session add-exercise goal reads/writes align with the live schema.
- Fixed Exercise Info personal stats lookup to query `exercise_stats` with the exercise’s canonical ID and render Last/PR when either stat exists.
WHY:
- Prevents runtime schema-cache errors when Add Exercise includes supported goal metrics like distance/time/calories and ensures session goals persist after reload.
- Surfaces derived personal stats consistently on Exercise Info instead of dropping Last/PR when route-level IDs differ from canonical exercise IDs.

### Added
WHAT:
- Restored a destructive “Delete Routine” control on the Edit Routine screen with an explicit confirmation dialog and safer danger-zone placement.
- Added post-delete feedback handling so successful deletion routes users back to Routines with a success notice, while failures keep users on the edit screen with an error message.
WHY:
- Restores routine deletion from the place users edit a specific routine while reducing accidental data loss risk through explicit confirmation and clear destructive UX.

### Fixed
WHAT:
- Fixed the session exercise goals schema contract by adding support for `target_calories` on session exercises and aligned add-exercise goal persistence/loading with that column.
- Unified Add Exercise measurement guidance so both Current Session and Edit Routine → Edit Day show the same Last/PR stats and “Use last” behavior.
WHY:
- Prevents runtime schema-cache failures when session exercise goal payloads include calories.
- Keeps exercise add flows consistent so users get the same historical guidance and faster input wherever they add exercises.

### Fixed
WHAT:
- Restored Last/PR visibility in Add Exercise Measurements and Exercise Info by ensuring stats resolve against the selected exercise's canonical ID and by rendering stats when either Last or PR data exists.
- Added development-gated diagnostics around exercise stats fetch/query and render wiring for faster verification of query ID to stats ID matching.
WHY:
- Existing exercise_stats rows could be hidden when custom exercise IDs diverged from canonical IDs or when strict render guards suppressed partial valid stats, making personal history appear missing.
- Fixed Current Session “Add Exercise” so measurement inputs (reps/weight/time/distance/calories) are saved as the new session exercise’s goal fields when the exercise is created.
- Aligned measurement-to-goal mapping between Edit Routine add-exercise and Current Session add-exercise flows.
- Updated session goal resolution to prefer saved session-exercise goals (including ad-hoc/non-template exercises) so goals remain visible immediately and after refresh.
WHY:
- The Current Session add path was not persisting measurement goal values, so created session exercises lost targets that users had entered in the Add Exercise UI.
- Using one shared mapping contract prevents payload drift between routine editing and active-session exercise creation.

### Added
WHAT:
- Added cached per-exercise personal stats (Last performed + PR based on best estimated 1RM set) and surfaced them in Add Exercise measurements and Exercise info.
- Added a “Use last” action in Add Exercise measurements so users can tap to populate measurement fields from their latest logged set.
- Added deterministic stat recomputation on session save and completed-session delete so Last/PR always reflect remaining history.
WHY:
- Reduces friction while adding exercises, improves motivation with immediate personal context, and preserves trust by preventing stale PR/Last values after history changes.

### Fixed
WHAT:
- Moved the Edit Routine day-card Rest day checkbox auto-submit interaction into a dedicated client component while keeping the server action mutation flow unchanged.
WHY:
- Prevents Server Components render/runtime failures in production while preserving quick rest-day toggling from the routine overview.

### Changed
WHAT:
- Added a Rest day toggle directly on each Edit Routine day card so rest status can be updated without opening the day editor.
WHY:
- Reduces taps for frequent routine adjustments and makes rest-day management faster from the routine overview.

### Changed
WHAT:
- Added a Rest day toggle directly on each Edit Routine day card so rest status can be updated without opening the day editor.
WHY:
- Reduces taps for frequent routine adjustments and makes rest-day management faster from the routine overview.

### Changed
WHAT:
- Updated the Routines active overview card to display every configured day for the selected routine and added a compact summary row showing cycle length, training-day count, and rest-day count.
WHY:
- Better uses available space and improves at-a-glance understanding of routine structure without requiring extra navigation.

### Changed
WHAT:
- Simplified the Routines overview layout by removing the duplicate in-content “Routines” label and reducing border noise between the routine switcher and overview card.
WHY:
- Improves visual hierarchy and the glass aesthetic by avoiding stacked wireframe-like outlines while keeping the same behavior.

### Fixed
WHAT:
- Fixed routine overview day numbering so active routine preview rows start at Day 1 and follow the routine’s canonical day order without skipping labels.
WHY:
- Prevents misleading routine previews (for example showing Monday as Day 2) and reduces confusion when reviewing the active routine at a glance.

### Fixed
WHAT:
- Refined the History screen destructive confirmation modal with stronger viewport backdrop isolation, cleaner centered dialog hierarchy, and contextual session details for the delete prompt.
WHY:
- The prior modal allowed underlying card content to visually compete with confirmation content, reducing clarity and confidence for destructive actions on iOS.

### Changed
WHAT:
- Refactored the Routines page into a Current Active Routine overview with a routine switcher dropdown, compact active-day preview, and a single primary Edit Routine action.
- Moved routine creation into the switcher menu as “+ Create New Routine” when routines already exist, and replaced the previous list view with a dedicated empty-state CTA when no routines exist.
- Removed Active and Delete controls from the Routines overview screen.
WHY:
- Reduces CRUD-heavy screen complexity, aligns the page to the one-active-routine model, and makes routine management faster with a cleaner, overview-first UX.

### Changed
WHAT:
- Standardized destructive UX across routines, today, history, session, and routine-day editing flows with explicit destructive confirmations for high-risk deletions and clearer destructive wording (including “Discard Workout” and “Replace Day”).
- Added reusable destructive confirmation and undo-toast patterns, and applied undo affordances to active-session set and exercise removals where state can be safely restored.
- Applied confirmation for medium-risk deletions that are not safely undoable (completed-log exercise removal and custom exercise deletion).
WHY:
- The destructive-action audit identified inconsistent and ambiguous deletion behavior; users need predictable, explicit safeguards to prevent accidental data loss while keeping fast recovery available for reversible actions.

### Changed
WHAT:
- Grouped Add Exercise search and filter controls into one shared container, added a clear “Selected exercise” header with multiline name support, and made measurement input fields always visible in the Measurements section.
WHY:
- Reduces nested-card clutter, improves selected-exercise clarity for long names, and lowers interaction friction by removing extra taps to edit measurements.

### Changed
WHAT:
- Removed the chevron from History cards so only the trash affordance remains on the right edge.
WHY:
- Reduces redundant visual noise and avoids implying a second right-side action while keeping the existing card-open and delete interactions clear.

### Changed
WHAT:
- Removed chevron icon from Change Workout button on Today screen.
WHY:
- The chevron implied dropdown/accordion behavior and added unnecessary visual noise. Removing it clarifies that this is a direct action button and improves UI consistency.

### Changed
WHAT:
- Redesigned the History tab list into compact performance timeline cards with clearer hierarchy (session, day + duration, timestamp), subdued destructive controls, and a themed empty state.
- Refined Log Details and in-place edit UI to be denser and calmer in dark glass mode, including cleaner set presentation, explicit edit-state signaling, and normalized action buttons across Back/Edit/Cancel/Save/Delete/Add/Remove flows.
- Removed filler/empty-value text in History surfaces so optional notes only render when present.
WHY:
- Improves scanability and reduces visual noise while preserving existing history behaviors and data workflows.
- Aligns History interactions with the app’s normalized dark glass + green accent UI system for more consistent tap confidence across screens.

### Changed
WHAT:
- Merged “Add custom exercise” into the expanded “Add exercises” panel on both the Edit Routine day screen and the Current Session screen so each flow now has a single exercise-add section.
WHY:
- Reduces UI clutter, improves discoverability, and keeps one consistent mental model for adding exercises in both planning and in-session workflows.

### Changed
WHAT:
- Normalized Today and Current Session interaction surfaces to remove bright light/grey press and container states in favor of consistent dark-theme surfaces.
- Updated Current Session disclosure controls so “Modify measurements” defaults closed per exercise focus, includes a clear chevron indicator, and preserves reliable open/close toggling.
- Standardized scoped session controls onto the shared app button system for Save set, Add Exercise, Save Custom Exercise, Rename/Delete custom exercise, Skip/Remove exercise, and End Workout.
WHY:
- Improves clarity and confidence for expandable controls, prevents abrasive flash states during high-frequency taps, and keeps action styling deterministic across the Today → Current Session flow.

### Changed
WHAT:
- Refined the Set Logger “Modify measurements” control in Session Exercise Focus with a clearer expandable header treatment, explicit chevron affordance, and dark-mode-first visual hierarchy.
- Replaced the expanded measurements panel and metric chips with dark elevated surfaces and subtle borders to remove the prior bright/abrasive light block appearance.
WHY:
- Makes expand/collapse behavior obvious at a glance and improves tap confidence while preserving a consistent dark workout UI during active logging.

### Changed
WHAT:
- Refined History list cards so each card now acts as the primary navigation target to the same session detail destination, while the explicit View CTA is removed.
- Demoted per-card delete affordance to a compact icon action and standardized card row styling with subtler borders/separators and cleaner text hierarchy.
WHY:
- Improves navigation speed and tap confidence, reduces visual clutter from competing actions, and keeps destructive actions de-emphasized without changing behavior.

### Changed
WHAT:
- Polished the Current Session Exercise Focus and set-logging UI to reduce nested boxed styling, improve section hierarchy, and better align action/input spacing with the design system.
- Clarified action emphasis so Save set remains the dominant primary action while Skip/Remove and Modify Metrics read as secondary controls, and refined logged-set rows to a flatter, less boxy presentation.
- Tightened RPE + warm-up layout spacing and applied safe-area-aware top padding in the focused exercise container.
WHY:
- Improves scanability and tap confidence during active workouts, reduces visual noise, and makes rapid set logging feel faster and more premium without changing behavior.

### Changed
WHAT:
- Standardized the Add Exercise experience with shared UI tokens/primitives, flatter list styling, muted filled filter pills, and a clearer visual hierarchy for search/filter/list content.
- Updated Add Exercise controls to use a clear primary Add Exercise CTA and a collapsible Measurements section that is closed by default.
WHY:
- Reduces visual noise from nested boxed treatments, improves scanability and action clarity on mobile, and keeps the add-exercise flow visually consistent with the rest of the app.

### Fixed
WHAT:
- Updated the fullscreen Exercise Info overlay so every HOW-TO image now uses each exercise’s canonical icon source with manifest-aware placeholder fallback.
WHY:
- This ensures the HOW-TO slot always shows the exercise-specific visual when available and safely degrades to the placeholder without noisy missing-asset requests.

### Changed
WHAT:
- Updated the Exercise Info overlay HOW-TO visual slot to always render the canonical exercise how-to/icon image inside the existing framed area.
WHY:
- This removes placeholder-only presentation, preserves graceful fallback behavior, and keeps missing media from generating repeated noisy requests.

### Changed
WHAT:
- Updated ExercisePicker's Exercise Info overlay to render as a true fullscreen takeover panel with an internal scrolling body and interaction lockout behind the overlay.
- Added safe-area-aware top/bottom spacing for the overlay chrome/content so header controls remain clear of iOS notch/dynamic island regions.
WHY:
- This removes the modal-card presentation on mobile, prevents clipping within overflow-hidden mount contexts, and ensures a consistent full-screen detail experience.

### Changed
WHAT:
- Updated the Exercise Info overlay shell to a true full-screen takeover panel with an in-panel sticky header and a scrollable content region.
- Applied desktop width constraints only within an inner wrapper so the outer overlay remains full-bleed across viewport sizes.
WHY:
- This enforces a consistent screen-level detail experience and prevents background interaction while Exercise Info is open.

### Changed
WHAT:
- Updated the ExercisePicker Info experience to open as a dedicated full-screen overlay with a persistent header and an internally scrolling content area.
WHY:
- This restores a true screen-like mobile/desktop detail experience while keeping Info open/close in local component state and preserving the current URL.

### Changed
WHAT:
- Restored ExercisePicker’s Info action to open the full-screen Exercise Info experience (name/tags, how-to summary text, how-to image, muscles image, and muscle metadata) in-place instead of the placeholder-style overlay.
- Standardized muscles-image resolution to use canonical safe fallback behavior so missing or invalid paths render placeholders cleanly.
WHY:
- This brings back the intended instructional details UX without route navigation and ensures media failures degrade gracefully without noisy missing-asset behavior.

### Fixed
WHAT:
- Restored ExercisePicker Info interactions to open the in-place Exercise info modal/overlay again instead of navigating to `/exercises/[exerciseId]` routes.
- Updated the restored Info modal to resolve How-to imagery through the canonical exercise image helper and render it with the shared safe image component.
WHY:
- Route-based Info navigation was causing production route-level 404s for picker flows and regressed the earlier in-place detail UX.
- Using the canonical image resolver plus safe image fallback preserves prior detail behavior while preventing missing-image 404 noise.

### Fixed
WHAT:
- Fixed Exercise Info image resolution to reuse the canonical manifest-aware helper and safe fallback behavior used by ExercisePicker thumbnails.
WHY:
- This restores a single source of truth for exercise image paths, prevents Info-view 404 requests from divergent path logic, and keeps thumbnail and Info imagery consistent.

### Fixed
WHAT:
- Added a build-generated exercise icon manifest and switched runtime icon resolution to only request known icon files (with extension-aware paths), while falling back to the shared placeholder for unknown slugs.
- Added dev-only missing-icon warnings (logged once per slug) and aligned Exercise Info “How-to” image selection to use the same canonical icon source unless a dedicated how-to asset path is provided.
WHY:
- Production was issuing repeated 404 requests for non-existent `/exercises/icons/<slug>.png` files; constraining requests to known assets removes 404 spam and keeps list/detail imagery deterministic.

### Changed
WHAT:
- Stabilized exercise icon rendering with deterministic placeholder fallback and missing-src memoization so missing icon URLs are attempted once per browser session in both list thumbnails and Exercise Info how-to visuals.
- Completed an architecture and data-model compliance audit for exercise image resolution (runtime order, schema invariants, file-structure contracts, and offline/PWA behavior) and documented deterministic follow-up guardrails.
- Aligned exercise detail data loading with the existing exercises schema by reading `image_muscles_path` from the database path contract instead of forcing a null placeholder source in-app.
WHY:
- The image system is being expanded; we need a single audited contract before adding more assets or metadata paths.
- Keeping detail rendering aligned to database metadata preserves single-source-of-truth behavior and avoids silent drift between schema intent and runtime resolution.

### Changed
WHAT:
- Improved exercise icon rendering to use a consistent placeholder fallback and an in-memory cache for missing icon URLs to prevent repeated 404 requests in the list and Info screen.
WHY:
- Many icons are intentionally missing during asset rollout; previously the UI could repeatedly request missing files and trigger noisy error stacks, harming UX and performance.

### Fixed
WHAT:
- Restored the Exercise Info button to open the dedicated route-based Exercise info screen instead of the inline modal/overlay in ExercisePicker.
WHY:
- A recent merge regressed the prior standalone screen flow, reducing clarity and breaking the intended navigation experience for viewing exercise details.

### Changed
WHAT:
- Normalized all exercise icon PNG filenames under `/public/exercises/icons/` to a single kebab-case contract, and deterministically resolved filename collisions so only one kebab-case icon remains per exercise name variant.
- Added an `icons:normalize` maintenance script to audit current icon state, report already-normalized vs pending files, and apply deterministic normalization/overwrite cleanup.
- Aligned runtime exercise icon resolution to the same kebab-case normalization behavior, with slug-first/name-fallback lookup and a tiny documented alias for known naming mismatch (`pull-up` -> `pullup`).
WHY:
- A single deterministic asset naming contract prevents case-sensitive path breakage and duplicate drift, while making icon onboarding predictable.
- Matching runtime resolution to the normalization contract guarantees exercise thumbnails and info how-to images resolve consistently without per-exercise manual mapping.

### Changed
WHAT:
- Unified exercise image rendering so the Info modal “How-To” image now uses the same deterministic icon source as the Exercise list thumbnail.
WHY:
- Previously, separate how-to image resolution introduced duplication and unnecessary complexity. Since exercise icons are manually curated and slug-based, using a single deterministic image source ensures consistency, reduces surface area for bugs, and simplifies future asset management.

### Fixed
WHAT:
- Restored the Exercise info muscles visual block so each exercise shows the muscles placeholder image when no dedicated muscles asset is available.
WHY:
- The muscles section was conditionally hidden when `image_muscles_path` was absent, which removed the expected placeholder UI and made the info card feel incomplete.

### Fixed
WHAT:
- Corrected the exercise info detail query to use the current exercises schema fields so tapping **Info** opens the exercise detail page instead of returning a 404.
WHY:
- The detail route was selecting metadata columns that are not present in the current database shape, which caused query errors and forced a not-found response for valid exercises.

### Fixed

### Changed
WHAT:
- History log details now preserve the performed exercise order from the active session, showing exercises first by first logged-set order and appending untouched exercises afterward in their existing stable order.
WHY:
- This better reflects real workout flow during review and improves post-session accuracy when users log exercises out of planned routine order.

WHAT:
- Updated the exercise info route to resolve built-in exercise IDs from the app’s canonical fallback exercise catalog when a matching database row is unavailable.
WHY:
- Prevents false 404 pages when users tap the Exercise “Info” button for selectable catalog exercises that are present in the picker but missing from the current database dataset.

### Changed
WHAT:
- Updated exercise info visuals so the How-to image always reuses the same deterministic source as the exercise list thumbnail icon.
- Added a new `sync:exercise-icons` script to normalize PNG filenames from `exerciseIcons/` to kebab-case and sync them into `/public/exercises/icons/` for static serving.
WHY:
- Keeps exercise imagery consistent between list and info views, and streamlines onboarding of new icon assets with deterministic naming and less manual file prep.

### Changed
WHAT:
- Added an inline SVG archetype fallback in ExercisePicker thumbnails when slug-based local PNG icons are missing or fail to load, while keeping PNG icons as the preferred first path.
- Updated exercise icon scaffold docs to clarify PNG-first behavior with SVG archetype fallback.
WHY:
- Ensures every exercise row has a consistent, readable 48x48 thumbnail without requiring a full binary icon set immediately.

### Changed
WHAT:
- Removed the programmatic ExerciseIcon SVG icon system, including icon specs, slug-to-spec mappings, and related fallback placeholder detection logic.
- Added local exercise icon scaffolding under `/public/exercise-icons` with a README and example manifest, plus a slug-based icon path helper.
- Updated ExercisePicker thumbnails to load local repo icon files with a safe inline placeholder when an icon file is missing.
WHY:
- We are moving to manually provided, higher-quality exercise icon files that are maintained directly in the repository without generated SVG pipelines.

### Changed
WHAT:
- Increased ExerciseIcon visual scale and optical centering within the 48px tile, reduced internal icon padding, and strengthened equipment silhouette weight.
WHY:
- Icons felt undersized and weak inside the tile; increasing fill and weight improves visual strength and readability at 48px.

### Changed
WHAT:
- Updated ExerciseIcon to render equipment-first glyph icons (barbell, dumbbell, cable, machine, cardio, bodyweight) with a subtle movement cue overlay per icon kind, replacing the tiny person silhouette for clearer 48px tiles.
WHY:
- Person silhouettes at small sizes felt clip-arty; equipment-first glyphs better match the app's minimal glass UI and read as a more premium, scalable text-only icon system.

### Changed
WHAT:
- Increased ExerciseIcon glyph scale/centering and strengthened kind-specific silhouettes (squat/bench/row/curl/pulldown/cardio), plus improved implement weight for better 48px readability.
WHY:
- Improve icon clarity and perceived polish in the ExercisePicker list without adding binary assets.

### Changed
WHAT:
- Switched ExerciseIcon person rendering to a filled silhouette glyph style while keeping the text-only deterministic icon pipeline; implement remains accent-colored for contrast.
WHY:
- Stroke-based stick figures read as placeholders at small sizes; filled silhouettes improve perceived quality and readability in the picker.

### Changed
WHAT:
- Polished ExerciseIcon tile styling to better match glass UI surfaces and refined the person glyph to a capsule-torso + segmented-limb silhouette for a more premium icon set.
WHY:
- Reduce the “sticker” look in the picker and improve icon readability/quality without introducing binary assets.

### Changed
WHAT:
- Refined ExerciseIcon person silhouette and movement poses to a higher-quality glyph style (less stick-figure) while keeping text-only deterministic icons.
WHY:
- Improve perceived UI polish and make exercise icons more readable and movement-specific in the picker without introducing binary assets.

### Changed
WHAT:
- Refined the ExerciseIcon renderer to use a more polished outlined glyph silhouette (less stick-figure) while keeping the existing text-only deterministic icon pipeline and icon mapping contracts unchanged.
WHY:
- Improves perceived UI quality and 48px readability in the exercise picker without introducing binary assets.

### Changed
WHAT:
- Adjusted ExercisePicker thumbnail logic to treat placeholder `image_howto_path` values as missing so ExerciseIcon fallback tiles render for seeded placeholder entries.
- Kept how-to thumbnails using Next `<Image>` when `image_howto_path` contains a usable image path/URL.
WHY:
- Seeded placeholder image path values were suppressing the new icon fallback, so users still saw placeholder tiles instead of the intended text-only icon system.

### Changed
WHAT:
- Refined ExerciseIcon rendering for theming (currentColor), sizing via the `size` prop, and cleaner grip/unilateral differentiation through pose/equipment geometry instead of extra marker glyphs.
- Corrected misclassified exercise icon mappings for arnold-press, face-pull, front-raise, lateral-raise, and rear-delt-fly.
WHY:
- This ensures generated icons adapt consistently to app themes (including dark mode), are reusable at multiple tile sizes, reduce visual noise at 48px, and better match exercise equipment semantics.

### Changed
WHAT:
- Added a text-only exercise icon system with deterministic React SVG how-to icons for all 137 catalog exercises, plus slug-based icon lookup helpers/specs.
- Updated ExercisePicker rows to always show an icon by rendering generated SVGs whenever an exercise does not have an `image_howto_path` override.
WHY:
- This removes the need for binary icon assets while guaranteeing complete visual coverage and maintaining consistent black-person/green-implement styling for faster exercise scanning.

### Fixed
WHAT:
- Restored a live session elapsed-time display in the session header while keeping the old Set Timer feature removed from logging inputs.
- Updated session save submission to send the current elapsed duration derived from session start time so saved workout length matches what the header shows.
WHY:
- This brings back visible session timing context during workouts without reintroducing the removed set-level timer flow, matching the intended UX.

### Fixed
WHAT:
- Added faint right-aligned inline metric hints inside routine/session numeric inputs (reps, weight, duration mm:ss, distance unit, calories, and min/max reps) using a reusable input pattern that remains visible while typing.
- Updated Add Exercise measurement behavior to preserve selected measurement toggles, entered targets, and distance-unit defaults after add; these values now reset only when the selected exercise changes or when the new Reset measurements control is used.
- Saving a session now exits the active session flow and routes to History (session detail when available, otherwise list), and the legacy Set Timer UI/state was removed while keeping duration logging through metric inputs.
- Fixed Today day display consistency so in-progress sessions drive the displayed day/exercises, keeping Change Day + Resume behavior aligned after navigation.
- Removed extra blank space around the RPE tooltip when closed and aligned History duration display to session-style clock formatting (e.g., 90 seconds -> 1:30) across log detail/set summaries.
WHY:
- These changes tighten logging clarity and flow continuity, prevent accidental routine-add re-entry work, eliminate stale day-context confusion between Today and Resume, and ensure duration/readability consistency without changing data ownership or sync semantics.

### Changed
WHAT:
- Polished the active session screen UX with consistent metric microcopy (including “Modify Metrics,” simplified input labels, and inline RPE tooltip text), refreshed timer presentation, and clearer visual hierarchy between exercise identity, plan goal line, and the logging action zone.
- Updated session goal rendering to a stat-line format with compact separators, singular units, emphasized primary segment, muted secondary metrics, and an explicit “Goal: Open” fallback when no targets are defined.
- Stabilized the measurement logger layout so metric groups keep consistent pairing/order and animate in/out within a fixed-height container while the Save button remains anchored without vertical jumping.
WHY:
- This improves scanability and input confidence on mobile during live logging, reduces copy/format inconsistency, and minimizes distracting layout shifts without changing workout business logic or data behavior.

### Fixed
WHAT:
- Added a nullable `session_exercises.routine_day_exercise_id` link and now stamp each seeded session exercise with its exact source routine-day exercise when starting from Today.
- Updated session goal/metric resolution to prefer that explicit routine-row link (with legacy-safe fallbacks) so duplicate planned exercises keep distinct targets and logger defaults.
- Fixed Set Logger metric initialization so plan-enabled metrics auto-render on open unless the user has already manually changed toggles, renamed the in-session control to “Modify Measurements,” added subtle RPE guidance text, and tightened measurement input pairing layout.
WHY:
- This preserves one-to-one plan-to-session integrity for duplicate exercises, eliminates missing planned metric inputs in active logging, and improves mobile clarity without changing routine-builder behavior or data ownership boundaries.

### Changed
WHAT:
- Reordered the Add Exercise picker layout so the exercise list appears before the Measurements controls, while preserving existing add/goal behavior.
- Replaced Current Session’s bespoke add-exercise block with the same add cards/pattern used in routine editing, including goal-setting controls in the add flow.
WHY:
- Keeping list-first ordering makes exercise selection flow consistent and easier to scan.
- Reusing the routine add UI in Current Session unlocks goal entry there without duplicating UI patterns, while preserving session-only add behavior.

### Changed
WHAT:
- Updated active session logging to derive each session exercise’s effective measurement contract from session snapshots first, then routine-day plan metadata, then exercise defaults, and to use routine target presence as default metric enablement for logger inputs.
- Updated Set Logger UI to support metric-driven input rendering (reps/weight/time/distance/calories), cardio “Intervals” labeling, client-side “+ Add Measurement” toggles, mm:ss duration entry, and persisted saving of all supported set metrics without hiding already-logged values.
WHY:
- This keeps session logging aligned with planned routine measurement selections while preserving open-workout flexibility and deterministic set persistence across online/offline flows.

### Changed
WHAT:
- Made measurement type and default distance unit configurable at the routine-day exercise level, and snapshot those effective values into session exercises so cardio logging uses per-plan/per-session settings instead of only exercise catalog defaults.
- Updated routine editor, active session logging, and history rendering to consistently prefer snapshotted session exercise measurement/unit values with safe fallbacks (`routine override -> exercise default -> reps/mi`).
WHY:
- This lets users choose cardio logging mode per routine exercise (with `mi` as the default distance unit), keeps in-progress/completed sessions deterministic even if exercise definitions change later, and ensures cardio inputs/rendering stay correct across planning, logging, and history views.

### Changed
WHAT:
- Added routine target support for cardio-driven plans by introducing optional distance, distance unit, and calorie targets in routine-day exercises, and updated routine day editing/forms to show target inputs based on each exercise `measurement_type` while always requiring sets.
- Updated goal text formatting and history log set rendering so cardio logs display deterministic goal output and logged duration/distance/unit/calorie values without breaking existing set edit flows.
WHY:
- This keeps routine programming aligned with measurement-specific exercise contracts (reps/time/distance/time+distance), improves cardio target clarity, and ensures completed session history accurately reflects logged cardio metrics.

### Changed
WHAT:
- Updated session set logging so each exercise row now renders and saves set inputs based on `exercises.measurement_type` (`reps`, `time`, `distance`, `time_distance`), including distance unit defaults from `exercises.default_unit` and optional calorie capture.
- Extended session set save/sync paths to persist cardio metrics (`duration_seconds`, `distance`, `distance_unit`, `calories`) alongside existing strength fields while preserving queued/offline idempotent syncing behavior.
WHY:
- This enables cardio-focused exercises to be logged with the correct metrics in `public.sets` without regressing existing strength workflows, and keeps online/offline logging behavior consistent.

### Fixed
WHAT:
- Added slight horizontal and vertical padding around Add Exercise filter-chip rows so chip border/highlight edges have breathing room and no longer render clipped at the row boundaries.
WHY:
- Prevents visual border cut-off artifacts on tag chips and keeps filter controls clean and readable on mobile-sized layouts.

### Changed
WHAT:
- Reordered exercise metadata tag display so Movement tags render last in Add Exercise picker rows and the selected-exercise summary.
WHY:
- Keeping Movement at the end ensures it is the first tag to be visually truncated when horizontal space is limited, preserving higher-priority context earlier in the tag list.

### Changed
WHAT:
- Updated Add Exercise filter chips so selected tags use a bright outer highlight ring/border treatment (matching the high-contrast "Close" tag style direction) and automatically return to the neutral chip style when deselected.
WHY:
- This makes active filters immediately obvious while preserving a clear unselected state for faster scanning on mobile.

### Changed
WHAT:
- Added a schema-safe exercise seed migration that updates global Bench Press metadata by `(is_global, name)` and inserts global Chest Press only when missing, with SQL variants for both `TEXT[]` and `JSONB` muscle columns.
WHY:
- Keeps global exercise metadata consistent across environments with different column representations while preventing duplicate Chest Press seed rows.

### Changed
WHAT:
- Enriched the canonical global exercise dataset so every exercise now includes standardized metadata fields: one-sentence `how_to_short`, normalized `movement_pattern`, normalized `primary_muscles` and `secondary_muscles`, and SVG placeholder image paths.
- Added cardio-only metadata in the canonical dataset (`measurement_type`, `default_unit`, and `calories_estimation_method`) for exercises classified as cardio.
WHY:
- This makes exercise metadata immediately usable by downstream UI and logging flows with consistent field shapes and constrained values, including cardio-specific tracking defaults.

### Changed
WHAT:
- Added a canonical global exercise export JSON containing only `{name, primary_muscle, equipment, is_global}` rows derived from the latest exercise export.
WHY:
- Provides a normalized, reusable source for global exercise metadata while preserving exact exported names/equipment and global-only scope.

### Changed
WHAT:
- Renamed app/web branding references to `FawxzzyFitness` across document title metadata, PWA manifest naming, Apple web app title fields, fallback in-app nav label text, icon source title text, and the package name identifier.
WHY:
- Ensures the installed app label and browser title consistently use your intended product name.

### Changed
WHAT:
- Added a text-based app icon source (`public/icon-source.svg`) and a build-time icon generation script that renders required PNG icon outputs into `public/icons/`.
- Updated PWA manifest and Apple touch icon metadata paths to use the generated `/icons/*` assets.
WHY:
- Repository and PR policy reject committed binary assets; generating icons during build preserves diffable source control while still shipping proper install/app icons for PWA and iOS home-screen usage.

### Changed
WHAT:
- Updated the Add Exercise filter summary text to always show state, defaulting to "0 filters selected: All" and listing selected filter names when active.
WHY:
- This makes filter status clearer at a glance and confirms exactly which filters are applied.

### Changed
WHAT:
- Updated Add Exercise tag chips so selected filters use a green-filled state for clearer visual selection feedback.
- Tightened Add Exercise multi-tag filtering so results only include exercises that contain every selected tag (all-tags match).
WHY:
- This makes filter state easier to scan and ensures combined tag filtering returns precise, expected exercise matches.

### Changed
WHAT:
- Increased Add Exercise filter chip contrast so selected tags pop more strongly while unselected tags look clearly greyed out.
- Made the filter card status pill visually consistent between Open and Close states (neutral styling in both states).
- Reduced exercise-list scroll jank by debouncing scroll-position persistence updates and stabilizing scrollbar layout in the picker viewport.
WHY:
- This makes filter state easier to read at a glance, keeps control styling consistent, and improves scrolling smoothness while preserving return-to-position behavior from Exercise Info.

### Changed
WHAT:
- Updated the exercise picker filter controls to use a dedicated clickable Filter card with an Open/Close status tag, expandable tag list visibility, and clearer selected/unselected tag states.
- Kept tag filtering multi-select so users can combine multiple tags when narrowing the exercise list.
WHY:
- This improves filter discoverability and clarity on mobile while preserving fast, flexible exercise filtering behavior.

### Changed
WHAT:
- Added exercise-tag filters to the Add Exercise picker with compact multi-select chips (including an All reset) that combine with text search using the already loaded exercise dataset.
- Removed the History empty-state card and replaced it with minimal inline text when there are no completed sessions.
- Added shared iOS safe-area top inset handling to the root app content container so headers/titles remain visible on notch/dynamic-island devices and home-screen PWAs.
- Updated browser Supabase client auth initialization to explicitly persist and auto-refresh sessions with browser localStorage, plus lightweight development-only auth event logging.
- Replaced the Edit Routine back-navigation native confirm prompt with an in-app discard-changes modal for in-app navigation.
WHY:
- These changes improve mobile UX clarity and reliability by making exercise discovery faster, reducing visual clutter in empty history states, preventing top-content overlap on iPhones, reducing unexpected auth sign-outs, and avoiding disruptive browser-native discard dialogs.

### Fixed
WHAT:
- Canonicalized routine timezone writes in create/edit actions so submitted timezone aliases (for example device/legacy values) are normalized before persistence.
WHY:
- Timezone form UX can stay intentionally simple while server-side scheduling continues to read deterministic canonical timezone values from storage.

### Changed
WHAT:
- Reworked Today's day-switch interaction so Change Workout opens as an inline chooser card instead of a fixed overlay, preventing clipped content and reducing background rendering glitches.
- Added copy/paste day controls in Edit Routine so a day's planned exercises and targets can be copied onto another day in one step.
- Simplified the Add custom exercise card to only require exercise name input, removing optional metadata fields from that UI.
WHY:
- The previous overlay could be cut off inside constrained cards and could interact poorly with the layered glass background effects.
- Copy/paste speeds up routine editing when multiple days share similar programming.
- Removing optional fields keeps custom exercise creation faster and less cluttered.

### Changed
WHAT:
- Restored the Add Exercise picker's high-contrast scroll container and card treatment (including scroll affordance text/gradient and clearer row framing) while keeping the current dedicated Exercise Info navigation flow.
WHY:
- The recent styling simplification made the picker feel visually regressed on mobile; this brings back the cleaner, easier-to-scan list presentation users preferred.

### Changed
WHAT:
- Made Day Editor’s existing exercise list read as a dedicated “Currently added workouts” section with clearer visual grouping and count context, and removed the redundant subtitle line under the page title.
- Removed the extra “Back to day editor” button from Exercise info so only the top-right back arrow is shown.
- Preserved Add Exercise context when opening Exercise info by returning with the picker expanded, selected exercise retained, and exercise-list scroll position restored.
WHY:
- This improves day-edit scanability, reduces duplicate navigation controls, and keeps users anchored in the add-exercise workflow after viewing exercise details.

### Changed
WHAT:
- Replaced the exercise picker’s inline info overlay with navigation to a dedicated exercise details screen that has room for how-to text, tags, and media.
- Updated exercise-picker Info actions to pass users to the new details route with a return link back to the current editor context.
WHY:
- A full-screen details layout resolves the cramped modal issues on mobile and makes exercise guidance easier to scan without nested overlay UI.

### Changed
WHAT:
- Prevented mobile input-focus zoom jumps by enforcing a 16px minimum font size for form controls on small screens.
- Updated routine day exercise cards so the right-side disclosure label now reads “Close” while a card is expanded and “Edit” when collapsed.
- Improved add-exercise list affordance with explicit scroll cue text, a bordered scroll viewport, and a bottom gradient hint.
WHY:
- This removes disruptive focus zoom behavior on mobile, makes open/close state clearer in routine editing, and helps users discover that the exercise list is scrollable.

### Changed
WHAT:
- Renamed Today’s day-picker action label from “Change Day” to “Change Workout,” reverted the picker list to immediate single-tap selection, and removed the extra confirmation flow (checkboxes + OK) while keeping cancel/overlay-dismiss behavior.
- Updated the routines “Create Routine” call-to-action to use the same secondary button visual treatment as history card “View” actions.
WHY:
- This restores the faster one-tap day switching behavior users expected and keeps high-visibility list actions visually consistent across routine/history surfaces.

### Changed
WHAT:
- Enhanced the exercise picker summary row and exercise list cards to surface muscle-group tags alongside existing metadata when layout space allows.
- Completed the fallback global exercise catalog metadata so each built-in exercise now has consistent primary muscle, equipment, movement pattern, and short how-to guidance.
WHY:
- This improves exercise selection clarity without crowding constrained mobile layouts and keeps baseline exercise information consistent when fallback catalog data is used.

### Changed
WHAT:
- Refined main-screen action styling for Today/Routines/History so key actions use a more consistent mid-weight button treatment, including Start Workout, Change Day, End Session, Create Routine, and View.
- Updated Today day selection to tap-to-select day choices (with Cancel only), added right-aligned per-exercise goal targets in Today exercise rows, and adjusted routine-card typography (underlined routine titles plus lighter Edit text).
WHY:
- This improves cross-screen visual consistency and readability while speeding up day switching and making workout goals visible at a glance before users start sessions.

### Fixed
WHAT:
- Updated the Add Exercise expanded-card picker to remove the legacy dropdown control, keep a selected-exercise summary box, increase list image/button fill, and deduplicate duplicate exercise-name entries in the scroll list (including duplicate Abductor Machine rows).
- Reversed selection emphasis in the exercise list so parameter/meta emphasis is now tied to the selected item while unselected rows are visually de-emphasized.
WHY:
- This reduces clutter in the Add Exercise flow, improves scanability/tap ergonomics on mobile, and avoids confusing duplicate entries while keeping selection state clearer.

### Changed
WHAT:
- Repositioned routine-card move controls to a left-side vertical stack, added a temporary Today day-picker for session start, added an explicit “End Session (Don't Save)” action for in-progress workouts, and updated session back behavior so an open exercise card closes before navigating away.
WHY:
- These updates make day/order controls easier to hit on mobile, let users run a different day without permanently changing routines, and reduce accidental session loss/navigation friction during active workouts.

### Changed
WHAT:
- Updated Today's day-change interaction so tapping `CHANGE DAY` now swaps the Start Session content out for a dedicated inline chooser card instead of opening an overlay inside the same surface.
- Added explicit `OK`/`Cancel` confirmation in that dedicated chooser card before applying a new pre-start day selection.
WHY:
- This keeps the Today UI cleaner and avoids cramped nested card layering while preserving temporary day selection before starting a workout.
