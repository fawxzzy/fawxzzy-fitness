## 0.3.87 — 2026-03-19

### WHAT
- Rebuilt the shared `bottom-actions` host around a single ref-backed slot registry that tracks footer owners locally and only notifies the sticky slot when the active owner or rendered footer node actually changes.
- Kept publisher identities stable across rerenders while removing provider-level JSX state churn, so overview/set-entry footer swaps no longer feed back into publisher rerenders during current-session transitions.
- Preserved the existing `usePublishBottomActions` / `PublishBottomActions` consumer API while restoring stable sticky footer behavior for Save Session / Discard, set entry, Today, and Edit Day screens.

### WHY
- Fixes the remaining `Maximum update depth exceeded` crash caused by render-coupled sticky-footer publication whenever the active footer switched owners.
- Reinforces the layout rule that shared sticky footers should use one local host slot with ref-based ownership bookkeeping instead of provider state for published JSX.

## 0.3.86 — 2026-03-19

### WHAT
- Split the shared `bottom-actions` primitive into separate API and published-state contexts so footer publishers no longer rerender just because the sticky host renders the current footer node.
- Replaced provider-local `setPublished` bookkeeping with a ref-backed external-store registry so publish/unpublish only notify slot subscribers when the active owner or rendered node truly changes.
- Preserved the single screen-owned sticky slot contract while stopping self-retriggering publish cycles across current session, set entry, and other shared footer screens.

### WHY
- Fixes the `Maximum update depth exceeded` crash triggered when footer publishers indirectly rerendered themselves through provider-level `setPublished` updates.
- Reinforces the layout primitive rule that sticky footer registration must use stable identities plus ref-based bookkeeping, with React state reserved for real rendered output transitions.

## 0.3.85 — 2026-03-19

### WHAT
- Removed steady-state info logging from exercise catalog fallback/filter paths and exercise-stats lookup tracing so routine navigation stops printing expected loader chatter on every pass.
- Kept runnable-day and exercise-list observability at the summary level behind the explicit debug flag, while preserving real warning/error output for genuinely invalid exercise ids or failed catalog loads.
- Left runnable-day normalization and exercise filtering behavior unchanged; this release is observability cleanup only.

### WHY
- Keeps terminal output readable during normal navigation so real regressions are easier to spot.
- Reinforces the rule that expected fallback and sentinel-suppression behavior should emit, at most, optional loader summaries instead of row-by-row noise.

## 0.3.84 — 2026-03-19

### WHAT
- Reordered Quick Add and shared Add Exercise chooser flows so the selected exercise summary now sits above the chooser it contextualizes, with configuration still following selection and commit remaining last.
- Reduced visible chooser viewport height in both flows and memoized row rendering so scanning feels lighter while preserving the newer selected-card glow treatment.
- Changed chooser row interaction so tapping an already-selected exercise now opens Exercise Info, while the selected-summary Exercise Info action remains intact.
- Moved exercise-list scroll persistence off render-coupled state updates so scrolling no longer triggers repeated list rerenders during normal movement.

### WHY
- Reinforces the documented mobile pattern of select row → selected summary → configure → commit instead of making the flow feel upside down.
- Keeps Quick Add from sitting awkwardly off-screen by shrinking the chooser footprint and moving summary context higher in the sheet.
- Improves perceived scroll smoothness by reducing unnecessary work during list movement and by avoiding recalculating visible-row selection state for unrelated scroll snapshots.
- Preserves exercise-info discovery in both the summary and selected-row reselect path without reintroducing noisy per-row secondary controls.

## 0.3.83 — 2026-03-19

### WHAT
- Fixed Current Session save/discard return handling so those footer actions now reuse the same safe in-app back-return contract as the session header Back button, with Today as the deterministic fallback instead of History.
- Propagated explicit `returnTo` context from Today resume/start and Today → Edit Day entry points so save/discard flows can preserve originating screen context even after refresh or direct route handling.
- Updated Edit Day to submit the resolved originating return target back to the server action, keeping Save Day aligned with Back when opened from Day View or other valid in-app routes.
- Added focused return-contract coverage around explicit return targets, prior in-app history, and unsafe/self-referential fallbacks.

### WHY
- Prevents destructive or save actions from teleporting users to unrelated screens after they finish or discard high-frequency workout flows.
- Makes Today, Day View, and Edit Day feel like one navigation system by preserving the screen the user actually came from instead of defaulting to an editor hub.
- Reinforces the documented rule that save/discard actions must honor the same return semantics as Back, not a parallel hard-coded route map.
- Refactored the shared `bottom-actions` registration primitive to use stable publisher ownership tokens plus guarded publish/unpublish updates instead of a render-coupled `set(node)` / cleanup `set(null)` loop.
- Preserved the normalized sticky footer slot behavior while preventing bottom-action cleanup from clearing and re-registering the same host during routine rerenders across session, today, and editor screens.

### WHY
- Fixes the `Maximum update depth exceeded` regression caused by unstable layout-effect registration churn in the shared sticky footer system.
- Reinforces the shared-layout rule that portal/sticky action surfaces must register through stable identities rather than render-time effect cleanup cycles.

## 0.3.82 — 2026-03-19

### WHAT
- Removed steady-state per-exercise logging from runnable-day normalization, sentinel suppression, and exercise-stats list fetches so normal navigation no longer floods the terminal.
- Added a shared explicit observability gate for these paths and converted the remaining diagnostics to debug-only summary logs that report loader-level counts instead of one line per entity.
- Preserved real warnings/errors for bad states while keeping expected fallback and sentinel filtering silent unless the explicit debug flag is enabled.

### WHY
- Keeps terminal output focused on actionable warnings/errors instead of routine normalization noise that obscures real regressions.
- Establishes a reusable observability rule for canonical/fallback loader flows: expected steady-state behavior should surface as optional summaries, not background row-by-row spam.

## 0.3.81 — 2026-03-19

### WHAT
- Converged Quick Add toward the Add Exercise chooser language by reusing the same clean selection-first card treatment, selected summary affordances, and configure/commit rhythm inside the sheet.
- Kept Exercise Info access in the selected-exercise state for both chooser flows so rows stay uncluttered while selected actions still expose movement details.
- Fixed Edit Day add/update/delete/reorder feedback to refresh live on success, removing the stale-screen behavior that previously required leaving and re-entering the editor to see successful writes.
- Standardized user-facing workout language around Goal so compact summaries, current-session cards, add-exercise flows, and day editors stop mixing goal vs. target wording.
- Consolidated goal summary formatting behind the shared measurement display helpers so sets/reps/time/distance/calories summaries now follow one canonical `Goal: … — …` pattern with consistent chips and open-goal fallbacks.
- Lightened the shared measurement configurator framing, normalized toggle styling and unit-selector placement, and moved required-sets treatment into the Sets input block across add-exercise and edit-day flows.

### WHY
- Keeps chooser rows optimized for selection first, which makes Quick Add and Add Exercise feel like the same system instead of adjacent one-off pickers.
- Preserves exercise detail access without reintroducing cramped row chrome, reinforcing the row select → selected summary → configure → commit pattern.
- Makes Edit Day feel trustworthy after writes by showing add/delete/update/reorder results immediately, rather than making the editor look stale until a full screen re-entry.
- Makes workout planning and logging feel like one coherent product instead of a collection of screen-local measurement variants.
- Reduces drift risk by pushing goal display and measurement configuration rules into shared primitives used across the app.
- Unified save-return behavior around the same safe in-app history contract used by Back, including current-session save/discard navigation plus history log saves that previously diverged from the implied return path.
- Tightened the shared canonical bottom-action variants so split primary/secondary footers now use one consistent two-column mobile frame, spacing, and safe-area treatment across editor/detail screens.
- Preserved existing workout/editor business logic while removing context-losing save redirects and reinforcing the shared footer system in docs.

### WHY
- Keeps users in context by making Save honor the same return destination that Back would use when they arrived from another in-app screen.
- Reduces footer drift and overflow risk by routing remaining sticky CTA groups through one shared visual/action system instead of per-screen layout improvisation.

## 0.3.80 — 2026-03-19

### WHAT
- Reworked Add Exercise rows onto the app’s canonical list-card treatment so selection is the dominant row action, metadata has more breathing room, and the selected state reads clearly without cramped per-row controls.
- Added a cleaner selected-exercise summary action path by opening Exercise Info from the selected-state summary area instead of restoring the old per-row info button.
- Tightened the Add Exercise measurement/action area and refreshed Edit Routine plus Edit Day editor sections so their measurement configurators, section framing, and action surfaces stay aligned with the newer normalized workout-entry language.

### WHY
- Keeps choosers optimized for selection first, which avoids the cramped list density that made Add Exercise feel inconsistent with the rest of the app.
- Preserves exercise-info access in a way that is easier to discover after selection and reduces secondary-action noise while scanning the list.
- Brings remaining editor-style routine surfaces closer to Today, Day View, and Current Session so the normalized action + measurement system feels shared across the app.

## 0.3.79 — 2026-03-19

### WHAT
- Removed the duplicate Current Session exercise-workspace title treatment so the selected exercise now has one identity block with top-right back placement, summary metrics, and quieter secondary skip/delete actions.
- Reordered set entry around the shared workspace rhythm of target → measurement entry → effort details → logged sets while reusing the normalized measurement configurator without repeating local measurement chrome.
- Preserved sticky Save Set behavior and all existing skip, delete, and set logging contracts while tightening the exercise-detail hierarchy into one cohesive mobile workspace.

### WHY
- Keeps the exercise detail screen focused and easier to scan by eliminating repeated title chrome and balancing dense vs. sparse areas.
- Reinforces the app-wide normalized action and measurement systems so adjacent workout-entry screens feel like one product.

## 0.3.78 — 2026-03-19

### WHAT
- Tightened Edit Day spacing and hierarchy so the header, day settings, planned workout list, and add-exercise composer read like one lighter shared workout-detail system.
- Restyled planned workout rows onto the canonical shared list-card language with quieter surfaces, compact trailing reorder/edit/delete controls, preserved tap-for-info behavior, and a matching empty state.
- Updated Edit Day add-exercise copy to match the chooser flow language of choose → optional targets → add to day, while preserving all existing add/remove/update/reorder behavior.
- Added a reusable note that planned-workout editor rows should extend the canonical list row instead of drifting into heavier tooling-style variants once the shared primitives settle.

### WHY
- Keeps Edit Day visually aligned with Today, Day View, Current Session, and the Add Exercise chooser instead of feeling like a heavier adjacent editor.
- Preserves learned row/action behavior while finishing the last visual normalization pass on a high-frequency workout-management screen.

## 0.3.77 — 2026-03-19

### WHAT
- Reworked Current Session set entry into a more cohesive exercise-detail workspace with a stronger summary header, integrated target panel, and a clearer target → configure → enter → review flow.
- Added shared workout-entry section primitives and reused them across the set-entry form so measurements, finish-this-set details, and logged sets share one lighter hierarchy without introducing extra heavy boxes.
- Kept skip, delete, save-set, and logged-set review behaviors intact while making secondary actions visually quieter and preserving the existing sticky Save Set action contract.

### WHY
- Makes the set-entry screen feel like a complete detail workspace instead of a sparse form page.
- Improves section anchoring and scanability during active logging without changing write semantics.
- Restyled the Add Exercise chooser to use the same shared exercise-card row language as the rest of the app, with roomier metadata, a clearer selected state, and no per-row info button.
- Simplified the add-exercise sheet rhythm into one continuous choose → configure → add flow with lighter section framing and a dedicated selected-exercise summary between the list and target configuration.
- Extended the shared `ExerciseCard` primitive with optional leading visual support so chooser/list surfaces can stay visually consistent without inventing route-local row markup.

### WHY
- Keeps workout-entry selection screens aligned with the app’s canonical entity-row pattern instead of feeling like a one-off dense picker.
- Reduces row clutter and interaction noise so selection stays obvious while preserving the existing target configuration and add-exercise behavior.

## 0.3.75 — 2026-03-18

### WHAT
- Polished Edit Day so the header reads as a clearer dedicated day editor, with routine/day context surfaced directly under `Edit Day — <day name>`.
- Tightened the planned exercise list with lighter section framing, clearer reorder affordances, row numbering, and more compact action alignment while preserving tap-for-info, edit, delete, and drag-to-reorder behavior.
- Softened Edit Day section chrome so day settings and Add Exercises better match the newer mobile choose/configure patterns without changing routine write semantics.

### WHY
- Keeps Edit Day visually aligned with the newer workout overview, Quick Add, and set-entry interaction language instead of feeling like an older heavier editor.
- Improves mobile scanability and action clarity while preserving the existing routine-day editing workflow.

## 0.3.76 — 2026-03-19

### WHAT
- Switched Playbook runtime acquisition to treat the pinned GitHub release tarball as the canonical official distribution path, with package acquisition now opt-in only when explicitly enabled by env/config.
- Hardened official fallback download/install handling to log source URL, final resolved URL, HTTP status, temp tarball path, artifact size, and nested error causes before installing via `npm install --no-save <temp-tgz>`.
- Updated runtime tests, README, governance guidance, and CI so clean-environment bootstrap uses `npm ci` plus the official fallback path instead of depending on a known-missing npm package.

### WHY
- Makes clean-environment installs deterministic again by aligning runtime acquisition with the real release infrastructure.
- Improves operator diagnostics so release/download failures expose the actual root cause instead of a generic fetch error.

## 0.3.75 — 2026-03-19

### WHAT
- Normalized the workout detail shell around shared surface and action-bar primitives so current session, day editing, and today-related workout actions use one bottom-action language.
- Moved active-session navigation into a consistent top-right placement and removed the header overhang pattern that was causing horizontal overflow on the current session screen.
- Tuned related chooser and sheet surfaces to share the same fill, border, radius, and inset treatment across workout flows.

### WHY
- Keeps adjacent workout screens feeling like one product instead of several bespoke mini-flows.
- Fixes a root-cause layout bug on the active session screen without relying on a global overflow clamp.

## 0.3.74 — 2026-03-18

### WHAT
- Normalized active session set-entry hierarchy with a stronger exercise title, lighter target block, softer measurement panels, clearer finish-details framing, and a simpler logged-sets list for faster mobile scanning.
- Simplified Quick Add into one continuous choose → configure → commit sheet with less nested panel chrome, clearer selection state, and a lighter set-count configuration block.
- Aligned shared workout-entry primitives so BottomSheet and measurement controls use the same section language and reduced visual weight across session write flows.

### WHY
- Keeps detailed workout entry flows consistent with the cleaned-up session overview instead of feeling like a different app.
- Improves mobile scan speed and confidence by emphasizing one dominant path: choose, configure, commit.

## 0.3.73 — 2026-03-18

### WHAT
- Hardened the shared canonical runnable-day loader so legacy planned workout ids can resolve through current `exercises.id`, `exercises.exercise_id` aliases, or legacy global exercise names before Today, Day View, and Start Workout decide a day is invalid.
- Rewired Today session-start validation to use that same shared canonical catalog/normalization boundary instead of a route-local exercise lookup.
- Added runnable-day regression tests covering direct canonical rows, alias-resolved rows, legacy placeholder/global rows, sentinel placeholders, and mixed valid/invalid day payloads.

### WHY
- Fixes the broken-day inconsistency where Edit Day still rendered saved workouts while Today and Day View silently dropped the same planned rows as non-runnable.
- Preserves deterministic invalid-day handling for true sentinel or missing-canonical rows while making all day surfaces agree on the same runnable truth.

## 0.3.72 — 2026-03-18

### WHAT
- Refined the active session shell with a lighter two-row sticky header that separates Back, elapsed time, Quick Add, and a full-width Save Session action for clearer mobile scanning.
- Simplified collapsed active-workout exercise rows so titles lead, the goal stays on one concise secondary line, set-count pills sit consistently at the trailing edge, and optional status chips stay visually secondary.
- Tightened the current-session title block and expanded-card heading/goal hierarchy so overview scanning feels lighter without changing exercise logging, navigation, or save behavior.

### WHY
- Reduces header chrome density that made the workout overview feel cramped on mobile.
- Improves list scanability by keeping the primary read order to title first, goal second, and metadata only when needed.
- Preserves the existing session flow while aligning the active workout overview more closely with the app's simpler list patterns.

## 2026-03-18

- Consolidated Today and routine day detail onto one shared canonical day-loader boundary that resolves routine-day exercises, canonical exercise metadata, runnable filtering, and display normalization from the same source model.
- Updated Today state handling so runnable, rest-day, and zero-exercise states are derived from that canonical loader instead of Today-only shaping, and discard-workout failures now show a safe generic message instead of raw database text.
- Reinforced the rule that all screens representing the same day state must share one loader/normalization boundary, preventing Today from being the only route that breaks on edge-case day data.
- Fixed the production build break on routine day detail by aligning `RoutineDayExerciseList` with nullable `goalLine` domain data and rendering the subtitle only when a goal line exists.

- Refocused Edit Routine into a true routine-level editor by making Routine Details the primary expanded content, replacing oversized day cards with compact day management rows, and moving save/delete into a cleaner sticky bottom action area.
- Preserved routine update/delete behavior while keeping copy/replace available as lightweight row actions so day-level composition still lives in Edit Day instead of being previewed inline on the parent screen.
- Reinforced the parent-vs-child editor boundary rule for mobile routine management so parent screens stay metadata-first and child entities stay navigable through compact rows.

## 2026-03-18

- Simplified routine editing information architecture so Edit Routine focuses on routine metadata, day cards act as lighter summaries/entry points, Edit Day owns day naming/rest/workout composition, and the switch-routine sheet more clearly distinguishes the active routine from the create-new action.
- Reduced nesting in the Edit Day workout-composition flow by clarifying planned-workout hierarchy and turning exercise search, selection, and optional targets into one more linear add-exercise sequence.
- Reinforced the editor-boundary rule that parent editors should not duplicate child-editor workflows, improving mobile scanability without adding new routine features.

- Added a reusable auth shell and refreshed the login, signup, and forgot-password screens with stronger visual hierarchy, roomier spacing, and clearer secondary actions for mobile auth flows.
- Added browser-only install guidance on the login screen that recommends installing the app, includes Android Chrome and iPhone Safari steps, and stays dismissible so browser auth, recovery, and email-link flows still work.
- Reinforced the app-first auth entry pattern without hard-blocking browser access, preventing install coaching from breaking recovery and deep-link flows.

# Changelog

## 2026-03-18 — Normalize session set-entry and Quick Add mobile hierarchy

### WHAT
- Reworked the active session set-entry header into a clearer mobile hierarchy with an explicit `Set entry` label, a dedicated goal block, lighter measurement controls, and a cleaner finish-details section for RPE plus warm-up.
- Simplified `Quick Add` into one linear mobile sheet flow: search, optional filter, choose, configure set count, then add, while reducing nested bordered panels and keeping `Add to Session` as the final primary action.
- Upgraded the shared `BottomSheet` and measurement primitives so adjacent workout-entry flows share the same section framing and softer mobile form hierarchy.

### WHY
- Prevents adjacent workout-entry surfaces from feeling like unrelated systems with different hierarchy, spacing, and panel weight.
- Reinforces the product rule that workout entry should follow one interaction language: search, choose, configure, save/add.

## 2026-03-18 — Make mobile History density modes materially different

### WHAT
- Refactored `HistorySessionsClient` so Compact cards now collapse to a title, one context line, and a single condensed metrics row, while Details cards keep richer metric chips plus dedicated PR summary and top-set sections.
- Replaced the anchored per-session 3-dot popover with a mobile-first bottom-sheet action surface that preserves Edit/Delete plus the existing placeholder actions as full-width sheet rows.
- Cleaned up History → Exercises cards with tighter type hierarchy, clamped secondary lines, and a more balanced text/image split so key stats stay visible on narrow screens.

### WHY
- Prevents density toggles from feeling fake by removing lower-priority information in Compact mode instead of merely shrinking the same layout.
- Follows the mobile action rule that secondary card actions should live in stable bottom sheets rather than fragile anchored popovers.
## 2026-03-18 — Normalize Edit Day planned-workout list interactions

### WHAT
- Renamed the day editor header to `Edit Day — <day name>` so the screen reads as a dedicated day editor instead of a generic detail view.
- Reworked the Edit Day planned-workouts section onto the shared exercise-card row pattern, moved exercise info access to primary row tap, demoted edit/delete into trailing controls, and added direct drag-and-drop reordering that persists by rewriting routine-day exercise positions.
- Kept the Add Exercises composer visually separate but aligned its card treatment with the rest of the Edit Day screen.

### WHY
- Prevents one-off list controls from making the same exercise entity behave differently across Today, Day View, and Edit Day.
- Makes planned-workout management easier to learn by reserving row tap for entity access and keeping row actions secondary.

## 2026-03-18 — Enforce runnable-day integrity before Today session writes

### WHAT
- Added a shared runnable-day normalization boundary that canonicalizes routine-day exercise ids, rejects sentinel/non-canonical placeholders before session materialization, and returns deterministic app-level start-session failures instead of leaking raw `session_exercises` constraint text.
- Updated Today day selection and preview states so only runnable training days show `Start Workout`, while rest days and empty/invalid days surface explicit non-runnable messaging plus `Edit Day` and `View Day` actions.
- Aligned Today preview data with the write path by rendering only canonical runnable exercises in the pre-start surface and preserving matching empty/rest-day behavior across the selected-day card and sticky actions.

### WHY
- Prevents the mismatch where Today looked runnable even though the session write path still contained sentinel or placeholder entities that could fail at `session_exercises` insert time.
- Keeps screen-state validity and write-path validity synchronized so users never get a raw database constraint failure from an invalid non-runnable day.

## 2026-03-18 — Rebalance History Sessions cards for mobile scanability

### WHAT
- Reworked `HistorySessionsClient` mobile cards around a clearer hierarchy: title row with menu, separate day/date context row, wrapped compact metric chips, and a lower-priority top-set line with overflow-safe truncation.
- Lightened the History Sessions controls by shrinking the Sessions/Exercises segmented control and replacing the heavier dropdown-style view selector with a compact in-panel density pill switch.
- Preserved existing history data semantics and routes while reducing text density and improving narrow-width resilience for session cards.

### WHY
- Prevents important session metadata from being clipped or buried inside dense one-line prose on mobile widths.
- Makes the history timeline easier to scan quickly without changing workout history logic or regresssing exercise-history mode.

## 2026-03-18 — Seal exercise display normalization boundary and polish exercise info

### WHAT
- Added a shared exercise display normalizer that resolves legacy aliases, suppresses UUID/sentinel placeholder labels, and guarantees user-facing exercise surfaces receive either a canonical name or the deliberate `Unknown exercise` fallback.
- Applied the shared exercise-name normalization across Today, routine day detail, active session, and routine day edit flows so raw IDs and migration-only placeholder strings do not leak into cards, lists, or edit affordances.
- Tightened the exercise info sheet header/content spacing, upgraded the stats presentation into clearer labeled tiles, and removed raw exercise IDs from user-visible load-error toasts while preserving internal logging.

### WHY
- Prevents migration/sentinel artifacts from leaking into production UI and making valid routine/session data look broken.
- Keeps exercise-name integrity enforced once at the shared data/presentation boundary instead of relying on per-screen ad hoc cleanup.

## 2026-03-18 — Normalize shared in-app back navigation

### WHAT
- Added a shared `useBackNavigation` history stack for mobile back controls so route-level back buttons prefer prior in-app history and fall back to a safe per-screen route on direct loads or refreshes.
- Updated shared back-button primitives plus routine, history, and session header surfaces to use the same history-first/fallback-second semantics instead of bespoke screen-local back rules.
- Normalized routine mobile page-header composition onto the shared `AppHeader` spacing contract so top-right back-button placement is consistent across detail and edit screens.

### WHY
- Prevents browser back from ejecting users to an external referrer when the previous usable screen is not inside the app.
- Keeps mobile header navigation semantics centralized in shared page-shell primitives so future cleanup work does not reintroduce route-hardcoded back behavior.

## 2026-03-18 — Deterministic exercise stat invalidation on session writes

### WHAT
- Added exercise-stat helpers that deterministically derive affected canonical `exercise_id` values from `session_exercises` rows before recomputing, while keeping one centralized `recomputeExerciseStatsForExercises(userId, exerciseIds)` write target.
- Updated session completion and completed-history set/exercise mutation actions to emit affected exercise IDs explicitly and recompute only those exercises after add/edit/delete/write flows that change completed workout history.
- Preserved the shared history aggregation boundary so recompute continues to rebuild `exercise_stats` purely from completed source-of-truth sets instead of UI state or incremental patch logic.

### WHY
- Prevents stats drift caused by missing or inconsistent recompute triggers across session write paths.
- Makes invalidation idempotent and auditable because every relevant mutation now follows the same pattern: derive affected IDs from the write, then rerun centralized aggregation only for those IDs.

## 2026-03-18 — Consolidate exercise history aggregation

### WHAT
- Added a shared `src/lib/exercise-history-aggregation.ts` module so exercise stats recompute and exercise browser history shaping read from one authoritative raw aggregation path keyed by canonical `exercises.id` UUIDs.
- Replaced the exercise stats recompute N+1 loop with one batched completed-set history query plus grouped `exercise_stats` upsert/delete writes.
- Updated the session page data loader to request `exercise_stats` only for the canonical exercise IDs present in the active session instead of the entire exercise catalog.
- Added targeted aggregation tests covering batched strength stats derivation and shared cardio session rollups.

### WHY
- Prevents performance degradation from per-exercise set history recomputes while keeping stats semantics deterministic.
- Reduces correctness drift by separating raw history aggregation from surface-specific presentation formatting in one shared boundary.

## 2026-03-18 — Playbook integration reset cleanup
- Removed transitional Playbook resolution leftovers from `scripts/playbook-runtime.mjs`, including `PLAYBOOK_RUNTIME_BIN` compatibility and the machine-specific dev checkout fallback path, so repo command resolution is deterministic across environments.
- Updated `README.md`, `docs/PROJECT_GOVERNANCE.md`, and `.github/workflows/ci.yml` to describe the active package-first Playbook path without the retired transitional surfaces.
- Corrected the verified upstream Playbook coordinates to use package acquisition from `@fawxzzy/playbook-cli@0.1.8` and official fallback assets from `ZachariahRedfield/playbook` release `v0.1.8`.
- Deleted stale migration-only Playbook docs (`docs/PLAYBOOK_MIGRATION_INVENTORY.md` and `docs/PLAYBOOK_ANALYSIS_REPORT.md`) so active repo guidance no longer competes with historical cleanup notes.
- Added a new `docs/PLAYBOOK_NOTES.md` scaffold so Playbook governance has its required companion notes file and the initial integration lessons are captured in-repo.

## 0.3.80 — 2026-03-17

### WHAT
- Updated `scripts/playbook-runtime.mjs` official fallback acquisition to normalize remote `https/http` fallback specs into deterministic local tarball cache files under `.playbook/runtime/cache` before invoking npm install.
- Added fallback normalization/download diagnostics that log the original fallback spec, normalized local install target, and exact npm command shape executed for acquisition.
- Expanded `scripts/playbook-runtime.test.mjs` with coverage for local-file passthrough normalization, deterministic remote download normalization, and explicit download failure output handling.
- Clarified `README.md` fallback semantics to document the download-first/install-second behavior for remote fallback URLs.

### WHY
- Prevents environment-dependent npm parsing ambiguity for direct remote tarball URLs by always installing fallback artifacts from deterministic local file targets.
- Makes fallback acquisition behavior auditable and reproducible across local/CI environments while preserving runtime resolution order and package-first acquisition policy.

## 0.3.79 — 2026-03-17

### WHAT
- Refactored `scripts/playbook-runtime.mjs` acquisition flow into typed paths so package acquisition still installs package specs, while official fallback acquisition validates and installs direct distribution specs verbatim into `.playbook/runtime` without reinterpretation as registry syntax.
- Added acquisition diagnostics that print package/fallback targets plus the npm command shape used for each path to make CI and local failure modes explicit.
- Added `scripts/playbook-runtime.test.mjs` coverage for local tarball fallback specs, https tarball URL normalization/acceptance, and missing/registry-like fallback spec failure output.
- Updated `README.md` fallback guidance to document accepted direct fallback spec shapes and explicitly route registry package specs to package acquisition.

### WHY
- Fixes spec-shape conflation where direct tarball/git fallback targets could be treated like registry package/version specs and fail before runtime execution.
- Preserves package-first behavior while making fallback acquisition deterministic, typed, and auditable for clean CI environments.

## 0.3.78 — 2026-03-17

### WHAT
- Updated `.github/workflows/ci.yml` to set `PLAYBOOK_OFFICIAL_FALLBACK_SPEC` directly to a pinned official release tarball URL (`https://github.com/fawxzzy/playbook-cli/releases/download/v0.3.77/playbook-cli-0.3.77.tgz`) for the clean-environment Playbook CI job.
- Updated `README.md` and `docs/PROJECT_GOVERNANCE.md` wording to reflect that CI now pins the fallback spec in workflow configuration rather than expecting runtime provision through repository variables.

### WHY
- Fixes the guard-without-provisioning failure mode where CI enforced fallback input presence but did not provide a deterministic fallback source.
- Keeps runtime acquisition deterministic and reproducible across clean CI environments by using an explicit immutable fallback artifact.

## 0.3.77 — 2026-03-17

### WHAT
- Updated `.github/workflows/ci.yml` to define `PLAYBOOK_OFFICIAL_FALLBACK_SPEC` at job scope as a required deterministic input and fail fast when it is missing.
- Refined Playbook acquisition logic in CI to follow the explicit sequence `install -> acquire package -> acquire official fallback -> run`, including an opt-in `PLAYBOOK_SKIP_PACKAGE_ACQUIRE=1` path for deterministic fallback-only simulations.
- Tightened CI runtime validation to require `.playbook/findings.json`, `.playbook/plan.json`, `.playbook/repo-graph.json`, and `.playbook/last-run.json` instead of only checking for any file under `.playbook/`.
- Updated `README.md` and `docs/PROJECT_GOVERNANCE.md` to codify the deterministic fallback requirement and required artifact contract.

### WHY
- Closes the acquisition gap where install could succeed but runtime remained unavailable when package access failed and fallback wiring was implicit or absent.
- Makes registry-failure behavior explicit, auditable, and reproducible in CI instead of relying on silent fallback assumptions.
- Aligns CI success criteria with canonical Playbook ladder outputs required for downstream verification and planning.

## 0.3.76 — 2026-03-17

### WHAT
- Removed `@fawxzzy/playbook-cli` from `devDependencies` in `package.json` and regenerated `package-lock.json` so base `npm install` no longer hard-requires Playbook package resolution.
- Added `npm run playbook-runtime:install-package` in `package.json` and `scripts/playbook-runtime.mjs` as an explicit package acquisition step (`PLAYBOOK_PACKAGE_SPEC` override supported).
- Updated the clean-environment Playbook CI job in `.github/workflows/ci.yml` to acquire Playbook explicitly (package install first, then official fallback if `PLAYBOOK_OFFICIAL_FALLBACK_SPEC` is configured) before running the canonical ladder with dev fallback disabled.
- Updated `README.md` and `docs/PROJECT_GOVERNANCE.md` to codify the install-then-acquire model and the official fallback contingency path.

### WHY
- Eliminates install-graph deadlock where fallback acquisition exists but cannot be reached because `npm install` fails first on a constrained registry.
- Keeps `scripts/playbook-runtime.mjs` as the single Playbook acquisition/resolution surface while preserving canonical precedence (env override → repo-local package → official fallback → dev fallback).
- Makes CI behavior deterministic across registry-constrained environments by separating dependency installation from tool acquisition.

## 0.3.75 — 2026-03-17

### WHAT
- Added official non-registry Playbook fallback support in `scripts/playbook-runtime.mjs` by resolving `.playbook/runtime/node_modules/.bin/playbook` before the dev checkout fallback.
- Added `npm run playbook-runtime:install-official-fallback` to install the official fallback distribution into `.playbook/runtime` via `PLAYBOOK_OFFICIAL_FALLBACK_SPEC`.
- Updated `README.md` and `docs/PROJECT_GOVERNANCE.md` with explicit registry-failure behavior, fallback installation steps, and package-first precedence guidance.

### WHY
- Unblocks Playbook runtime acquisition in restricted environments where npm registry access to `@fawxzzy/playbook-cli` is unavailable.
- Preserves the long-term package-first consumer model by keeping registry install canonical and fallback install conditional.
- Prevents false runtime-quality diagnosis when missing `.playbook` artifacts are caused by acquisition failure rather than Playbook execution behavior.

## 0.3.74 — 2026-03-17

### WHAT
- Switched `@fawxzzy/playbook-cli` from the repo-local `file:tools/playbook-cli` bootstrap package to the published upstream wrapper dependency model in `package.json`/`package-lock.json`.
- Removed the temporary repo-local wrapper package at `tools/playbook-cli` now that upstream package parity is available.
- Kept `scripts/playbook-runtime.mjs` as a thin command bridge and refreshed wording to reflect steady-state upstream package usage.
- Updated `README.md` and `docs/PROJECT_GOVERNANCE.md` to document that consumer repos should use the published package model and treat local fallback only as backup recovery.

### WHY
- Enforces the migration rule that temporary bootstrap packages must be retired once upstream package parity is proven.
- Prevents local wrapper drift from masking whether real consumer package integration actually works.
- Keeps clean-environment Playbook proof runs aligned with the canonical upstream dependency path.

## 0.3.73 — 2026-03-17

### WHAT
- Added `docs/PLAYBOOK_ANALYSIS_REPORT.md` documenting the full requested Playbook analysis/verify/plan cycle run, observed artifact outputs, and a structured architecture/correctness risk assessment for this repository.
- Captured that the current repo-local Playbook package is command-logging only and does not yet emit `findings.json`, `plan.json`, or `repo-graph.json`.
- Recorded prioritized recommendations for enabling true product-level Playbook insights and tightening progression/data-integrity invariants.

### WHY
- Preserves a deterministic first product-level Playbook run record so the team can act on tooling and system-correctness gaps from a single source of truth.
- Makes the present analysis limitation explicit to avoid false confidence from successful command exits without semantic outputs.
- Creates a concrete, prioritized improvement backlog before implementation work begins.

## 0.3.72 — 2026-03-17

### WHAT
- Added a dedicated `playbook-clean-environment` CI job in `.github/workflows/ci.yml` that performs a clean `npm install`, unsets `PLAYBOOK_BIN` and `PLAYBOOK_RUNTIME_BIN`, sets `PLAYBOOK_DISABLE_DEV_FALLBACK=1`, and runs the canonical Playbook command ladder (`ai-context`, `ai-contract`, `context`, `index`, `verify`, `plan`, `pilot`).
- Added an explicit CI assertion that `.playbook/` exists and contains runtime artifact files after the ladder run, with clear failure messages when output is missing.
- Updated `README.md` and `docs/PROJECT_GOVERNANCE.md` to document that clean-environment package-first proof is now enforced in CI, not just expected locally.

### WHY
- Closes the local-success illusion where Playbook integration can appear healthy on one machine due to developer-specific state, but fail for real consumers in fresh environments.
- Enforces the operational rule that consumer-repo integration is only complete once it passes package-first validation outside local developer context.
- Keeps CI deterministic by removing local path overrides/fallback dependencies and verifying observable `.playbook/` runtime outputs.

## 0.3.71 — 2026-03-17

### WHAT
- Removed the redundant `playbook:*` npm script family so repo operators have one active command surface (top-level Playbook scripts only).
- Reclassified remaining Playbook migration surfaces in `docs/PLAYBOOK_MIGRATION_INVENTORY.md` using explicit retirement states (`REMOVE_NOW`, `KEEP_TEMPORARILY_WITH_NOTE`, `HISTORICAL_ONLY`) and completed immediate removals.
- Updated `README.md` and `docs/PROJECT_GOVERNANCE.md` to isolate retained compatibility behavior (`PLAYBOOK_RUNTIME_BIN`, dev fallback path) as transitional and non-canonical.
- Added a repo-local Playbook package dependency (`@fawxzzy/playbook-cli` via `file:tools/playbook-cli`) so `npm install` provisions `node_modules/.bin/playbook` as the canonical consumer runtime path.
- Added a minimal `PLAYBOOK_DISABLE_DEV_FALLBACK=1` switch in `scripts/playbook-runtime.mjs` to support package-first proof runs without machine-specific fallback capture.
- Updated `README.md` and `docs/PROJECT_GOVERNANCE.md` with explicit canonical setup/proof commands and backup-only fallback positioning.

### WHY
- Prevents dual-truth operator behavior where both legacy and package-first command families remain discoverable.
- Retires redundant migration-era surfaces now that package-first runtime resolution is proven.
- Keeps temporary compatibility scaffolding explicit so contributors converge on one canonical path while preserving short-term recovery options.
- Proves the package-first consumer model in a clean repo-local install flow instead of relying on developer-specific `PLAYBOOK_BIN` or fallback checkouts.
- Prevents temporary fallback infrastructure from silently becoming the de facto runtime path.
- Makes success criteria auditable: deterministic repo-local resolution, `.playbook/` state output, and precise unresolved failure messaging.

All notable changes to this project are documented in this file.


## 0.3.70 — 2026-03-17

### WHAT
- Refactored `scripts/playbook-runtime.mjs` to resolve Playbook deterministically via `PLAYBOOK_BIN` override first, repo-local package/bin resolution second, and a clearly marked dev-only fallback at `C:\Users\zjhre\dev\playbook` third.
- Removed default global `playbook` PATH assumptions from the runtime bridge and added precise failure output that lists all resolution checks and concrete remediation steps.
- Updated `README.md` with a dedicated **Playbook runtime setup** section documenting canonical package-first usage, env override behavior, optional dev fallback, and expected unresolved failure messaging.
- Updated `docs/PROJECT_GOVERNANCE.md` to codify the package-first consumer model, temporary fallback policy, and prohibition on treating global PATH resolution as canonical.

### WHY
- Prevents global-shadow dependency drift where Playbook appears to work on one machine due to PATH leakage but fails in clean environments/CI.
- Makes this repo behave like a real consumer of Playbook tooling with deterministic, auditable runtime resolution.
- Preserves migration compatibility for local developer checkouts without promoting them to long-term repository doctrine.

## 0.3.69 — 2026-03-17

### WHAT
- Expanded the Playbook bridge command surface to include canonical repo-intelligence and ignore flows (`context`, `query modules`, `explain architecture`, `ask --repo-context`, `ignore suggest`, `ignore apply --safe-defaults`) while preserving thin-forwarder behavior in `scripts/playbook-runtime.mjs`.
- Added npm script aliases and explicit `playbook:*` mappings for richer read surfaces and deterministic ignore tuning workflows.
- Tuned `.playbookignore` to reduce scan noise from dependency/build/archive/generated areas without excluding core application and architecture truth sources.
- Updated `README.md` and `docs/PROJECT_GOVERNANCE.md` to document the bootstrap → intelligence → remediation pattern, verification/planning flow, and ignore tuning expectations.

### WHY
- Graduates the integration from bootstrap-only usage to a more canonical repo-intelligence workflow that supports architectural understanding and module-level querying.
- Makes ignore tuning repeatable and safe by default so scans stay focused while preserving critical system visibility.
- Aligns contributor guidance with the operational sequence needed for dependable Playbook-assisted planning and remediation.


## 0.3.68 — 2026-03-17

### WHAT
- Refactored `scripts/playbook-runtime.mjs` into explicit temporary compatibility scaffolding that only validates known command aliases and forwards to the canonical Playbook runtime binary, removing local fake artifact/workflow behavior.
- Added explicit `playbook:*` npm scripts as the canonical local command names while keeping existing short names as temporary aliases that forward to the canonical names.
- Updated `README.md` and `docs/PROJECT_GOVERNANCE.md` to document the bridge as temporary, the long-term shared-core + local `.playbook/` model, and the requirement to retire wrapper logic once parity is proven.

### WHY
- Prevents the local helper from becoming a shadow product surface with repo-specific runtime semantics.
- Keeps local command behavior aligned to upstream Playbook docs by enforcing thin-adapter forwarding only.
- Makes the migration end-state explicit so compatibility aliases do not become permanent doctrine.


## 0.3.67 — 2026-03-17

### WHAT
- Added `docs/PLAYBOOK_MIGRATION_INVENTORY.md` with a deterministic inventory of all remaining legacy-Playbook-adjacent surfaces, explicit retirement classification (`KEEP_TEMPORARILY`, `REPLACE_WITH_NEW_PLAYBOOK`, `INVESTIGATE_USAGE`, `REMOVE_AFTER_PARITY`), and per-surface removal preconditions.
- Removed redundant, unreferenced `scripts/githooks/pre-commit.mjs` and retained `.githooks/pre-commit` as the single active pre-commit implementation.
- Simplified package hook setup surface by removing `hooks:install` and keeping `prepare` as the single install-time hook setup entrypoint.
- Updated `README.md` and `docs/PROJECT_GOVERNANCE.md` migration guidance to point directly to the migration inventory for ongoing retirement decisions.

### WHY
- Prevents half-migrated workflow drift by making all remaining legacy surfaces explicit, classified, and tied to deterministic removal gates.
- Reduces duplicate/discoverable command and hook entrypoints that can silently fork contributor behavior.
- Keeps governance, top-level docs, and executable surfaces aligned to one Playbook ownership model per repository.


## 0.3.66 — 2026-03-17

### WHAT
- Normalized Playbook workflow documentation to one canonical operator path in `README.md` and `docs/PROJECT_GOVERNANCE.md` using `ai-context`, `ai-contract`, `index`, `verify`, `plan`, and `pilot`.
- Removed stale migration wording that could imply legacy learning/subtree maintenance paths were still active operator flows.
- Revalidated GitHub Actions workflow docs/config to ensure CI references only active repository commands.

### WHY
- Prevents documentation drift from reintroducing fake or removed commands during onboarding and daily operations.
- Keeps local governance and top-level docs aligned with the actual installed command surface.
- Reinforces one clear Playbook runtime workflow after migration.


## 0.3.65 — 2026-03-17

### WHAT
- Reintroduced a minimal Playbook runtime integration using project-local state under `.playbook/`, including the command bridge script at `scripts/playbook-runtime.mjs`.
- Added package command surface for the current Playbook flow: `ai-context`, `ai-contract`, `index`, `verify`, `plan`, and `pilot`.
- Added `playbook.config.json` and `.playbookignore` to formalize local runtime state and scan behavior.
- Updated `.gitignore` and governance documentation so runtime artifacts remain local and uncommitted by default.

### WHY
- Restores the current shared-Playbook-core integration pattern without reintroducing vendored Playbook code.
- Ensures contributors can run a canonical local flow end-to-end while keeping generated runtime artifacts out of normal source control diffs.
- Prevents half-migration drift by aligning scripts, ignore behavior, and governance docs to one consistent runtime contract.


## 0.3.64 — 2026-03-17

### WHAT
- Removed the legacy vendored Playbook integration surface by deleting the `Playbook/` subtree, `scripts/playbook/`, and `tools/playbook/` helper mappings.
- Removed Playbook-only automation from GitHub Actions and git hooks, including the dedicated Playbook Learning workflow and pre-commit Playbook runner.
- Simplified `package.json` by removing `playbook:*` / `contracts:*` commands and repointing compatibility aliases (`sanity`, `verify`) to app quality checks (`lint` + `build`).
- Rewrote governance and README documentation to remove legacy Playbook learning/subtree workflow references and document the migration rationale.

### WHY
- Eliminates shadow governance surfaces that depended on vendored doctrine and legacy learning flows.
- Enforces a single ownership model for repository governance and quality checks.
- Prevents stale Playbook scripts/hooks from continuing to behave like required product/runtime paths after migration.


## 0.3.63 — 2026-03-04

### WHAT
- Updated Exercise Info Stats rows to render as a single left-aligned text flow (`Label: Value`) via a local `StatLine` renderer, replacing the prior split label/value row layout.
- Lightly normalized Exercise Info Stats card spacing/padding so RECENT, TOTALS, and BESTS use a consistent and deterministic vertical rhythm across device widths.

### WHY
- Prevents label/value splitting into opposite columns on smaller screens and keeps stat rows readable as one contiguous line that wraps naturally.
- Improves scan-ability and visual consistency for the full Stats section without introducing architectural changes.


## 0.3.62 — 2026-03-04

### WHAT
- Removed duplicate Playbook runtime import enforcement from `docs/contracts.json` and kept a single fail contract with a clearer ID (`no-runtime-imports-playbook`).
- Updated `scripts/playbook/auto.mjs` status output so `Promoted(last action)` reads `notes.promoted_last_action` with fallback to `notes.promoted` for compatibility.
- Refined contract suggestion heuristics by matching `server` and `client` keywords directly and updated repo/process suggestions to emit repo-contract fields (`watch_paths`, `require_touched`, `ci_only`) only.

### WHY
- Eliminates redundant contract noise while preserving a clear runtime boundary guardrail.
- Keeps automation output aligned with the new status schema without breaking older snapshots.
- Produces cleaner, directly actionable advisory repo contract suggestions that better reflect real enforcement behavior.


## 0.3.61 — 2026-03-04

### WHAT
- Extended Playbook status output to publish both run-scoped and lifetime note metrics by adding `notes.promoted_last_action` and `notes.promoted_total` while keeping `notes.promoted` for backward compatibility.
- Added promoted-total derivation from `docs/PLAYBOOK_NOTES.md` using `Status: Promoted` parsing, with a documented fallback to count dated note entries when status fields are missing/unparseable.
- Updated the Playbook Learning Status dashboard wording to separately report last-action promotion counts and lifetime promoted totals.

### WHY
- Restores accurate historical learning visibility after `notes.promoted` shifted to last-action semantics, preventing the dashboard from implying learning was lost.
- Preserves CI/tooling compatibility by keeping existing fields while introducing additive metrics for clearer operator guidance.


## 0.3.60 — 2026-03-04

### WHAT
- Added a new advisory contract suggestion generator at `scripts/playbook/contracts/suggest-contracts-from-notes.mjs` that parses `docs/PLAYBOOK_NOTES.md`, filters Guardrail entries, applies low-noise heuristics, and writes deterministic suggestions to `docs/contracts.suggestions.json`.
- Added `npm run contracts:suggest` to run the Guardrail-to-contract suggestion workflow on demand without mutating `docs/contracts.json`.
- Standardized the suggestion output to include stable per-note hashing (`source_note_hash`), confidence levels, human-readable rationale, and machine-readable candidate contract payloads.

### WHY
- Enables repeatable, machine-readable proposal of enforceable governance contracts from authored Guardrail learnings while keeping v1 strictly advisory (no auto-enforcement or automatic contract mutation).
- Improves governance scalability by making it faster to convert recurring note patterns (import boundaries, changelog/notes discipline) into candidate checks with clear confidence and rationale.


## 0.3.59 — 2026-03-04

### WHAT
- Added curated top-level workflow scripts `playbook:local` and `playbook:ci` so contributors can run a consistent golden-path local check and CI-style pipeline without memorizing longer command chains.
- Kept all existing scripts intact while repointing legacy validation aliases (`sanity`, `sanity:quick`, `verify`, `verify:strict`) to the curated playbook commands for compatibility.
- Documented golden-path, debug/advanced, and CI command expectations in `docs/PROJECT_GOVERNANCE.md`.

### WHY
- Reduces command sprawl and onboarding friction by making the intended workflow explicit and stable while preserving backward compatibility for existing habits and automation.



## 0.3.58 — 2026-03-04

### WHAT
- Added Contracts v1 governance artifacts via `docs/contracts.json` and new deterministic generation/check scripts under `scripts/playbook/contracts/`.
- Wired `contracts:gen` and `contracts:check` npm scripts, added CI enforcement to run `npm run contracts:check`, and made `playbook:auto` run contracts checks before exit.

### WHY
- Establishes machine-readable architecture guardrails that CI and AI agents can enforce automatically to prevent architectural drift with low-noise deterministic checks.



## 0.3.57 — 2026-03-04

### WHAT
- Updated `npm run playbook:auto` to execute Playbook Node entrypoint scripts directly (`playbook-command.mjs` and `update-playbook-from-notes.mjs`) instead of spawning `npm`/`npm.cmd` wrappers.

### WHY
- Fixes Windows `spawnSync npm.cmd EINVAL` failures and makes Playbook automation deterministic across platforms by invoking the current Node runtime directly.



## 0.3.56 — 2026-03-04

### WHAT
- Fixed `npm run playbook:auto` to resolve the npm executable cross-platform (`npm.cmd` on Windows) and to report explicit spawn failures when command resolution fails.

### WHY
- Ensures Playbook automation runs deterministically across operating systems and surfaces actionable ENOENT-style spawn errors instead of ambiguous unknown exit codes.

## 0.3.55 — 2026-03-04

### WHAT
- Added an idempotent local Playbook installer (`npm run playbook:install`) that ensures bootstrap docs/status files and required package scripts exist without overwriting existing repo-authored content.
- Added a local Playbook doctor (`npm run playbook:doctor`) that reports OK/WARN/FAIL for core governance artifacts, script coverage, package script wiring, and optional repo-local playbook helpers, with both human and JSON output modes.
- Added/standardized the repo-level `CODEX.md` bootstrap instructions so Codex prompts can stay short while still deterministically loading governance + required local context.

### WHY
- Makes the repository self-healing so contributors can rehydrate required Playbook wiring at any time with a safe, repeatable command.
- Reduces governance drift and repetitive prompt boilerplate by making Codex startup expectations explicit and versioned in-repo.

## 0.3.54 — 2026-03-04

### WHAT
- Added a shared Playbook status helper (`scripts/playbook/status.mjs`) and moved status generation to a stable, versioned `docs/playbook-status.json` schema with repo metadata, notes/contracts/signal counts, recommendation, and command hints.
- Updated `npm run playbook` and `npm run playbook:update` to always refresh `docs/playbook-status.json`, including explicit no-op promotion status output when no Proposed notes exist.
- Simplified `npm run playbook:auto` into a reliable run→promote-if-needed→final-summary flow that exits non-zero when `contracts.fail > 0`.
- Updated CI to run `npm run playbook:auto` and always print the recommended next action from the status artifact.

### WHY
- Establishes one deterministic machine-readable Signals/status artifact for local and CI consumers so guidance and gates do not drift.
- Makes Playbook automation easier and safer by giving developers a single command that handles promotion when needed and clearly reports what to do next.

## 0.3.53 — 2026-03-04

### WHAT
- Updated `npm run playbook` wrapper guidance so the “If unsure what to run → …” line follows `recommendation.nextCommand`, with a `playbook:auto:local` override when the recommendation is `playbook:update`.

### WHY
- Aligns uncertain-path guidance with Zac’s actual local workflow so Proposed-note states point to the correct ordered local automation instead of a generic command.

## 0.3.52 — 2026-03-04

### WHAT
- Added `docs/COMMANDS.md` as a concise script glossary grouped by workflow domain with What/How/Why summaries and recommended command flows.
- Added Playbook notes hygiene tooling: fingerprint helper + duplicate reporting/removal (`playbook:notes:dedupe`, `playbook:notes:dedupe:write`) and age-based monthly archiving (`playbook:notes:archive`) with non-destructive backups.
- Added `npm run sanity:quick`, and updated `npm run sanity` to run notes dedupe reporting before doctor/playbook/status/lint/build.
- Upgraded `scripts/playbook/auto.mjs` with diff-aware `playbook:update` skipping and `--force` override, plus startup phase-plan output including detected changed-file count.

### WHY
- Makes command discovery faster and lowers onboarding friction without requiring contributors to inspect script source.
- Controls `docs/PLAYBOOK_NOTES.md` growth by deduping repeated blocks and moving stale entries to archives instead of deleting history.
- Speeds daily validation loops with a quick-check path while keeping full preflight deterministic.
- Reduces unnecessary Playbook promotion runs and improves operator clarity on what automation will execute before work begins.

## 0.3.51 — 2026-03-04

### WHAT
- Added a repository-level `npm run sanity` script that runs the full health sequence in order: `playbook:doctor`, `playbook`, `playbook:status:ci -- --format=markdown`, `lint`, then `build`.
- Documented the Sanity Check workflow and expected coverage in Codex guardrails docs.

### WHY
- Replaces the manual multi-step health checklist with one deterministic command while keeping the individual commands available.
- Makes pre-push validation easier to run consistently across contributors and CI-like local checks.

## 0.3.50 — 2026-03-04

### WHAT
- Added the standard repo-local Playbook config footprint at `tools/playbook/config.json` with Smart Signals enabled plus minimal contracts/notes defaults.
- Updated Playbook status snapshot generation to persist a non-null `smartSignals` object, carrying forward prior snapshot artifacts when present and otherwise deriving a deterministic local summary during `npm run playbook`.
- Kept CI status rendering status-file-driven by reading Smart Signals from `docs/playbook-status.json` only (including explicit `unavailable` fallback messaging instead of `null`).
- Documented the repo-local Playbook config location in `docs/CODEX_GUARDRAILS.md`.

### WHY
- Restores the expected Playbook portable install footprint so Doctor and local automation have a canonical config path.
- Ensures `docs/playbook-status.json` remains the single source of truth for Smart Signals without requiring CI recomputation.
- Prevents ambiguous `smartSignals: null` snapshots by persisting a compact, machine-readable summary or explicit unavailability reason.

## 0.3.49 — 2026-03-04

### WHAT
- Updated Playbook signal adaptation to normalize dedupe metadata across legacy (`isDuplicate`) and new (`kind`, `score`, match details) signal shapes so downstream draft workflows consume one deterministic interface.
- Updated `playbook:suggest` and Guardian draft generation to treat `duplicate` as a success-path skip with explicit linkage guidance, and to keep `near-duplicate` drafts while appending a `Possible duplicate` context line plus console info output.
- Updated status-file dashboard formatting so CI summaries include Smart Signals metrics from `docs/playbook-status.json` when present, and preserved status-file-driven behavior by carrying forward existing `smartSignals` payload data.
- Expanded local signal fixture coverage for dedupe normalization and near-duplicate annotation behavior.
- Refreshed Codex guardrail docs to clarify duplicate-vs-near-duplicate behavior and operator action guidance (link vs refine).

### WHY
- Keeps local automation compatible with evolving central Playbook dedupe contracts without breaking older snapshots.
- Reduces noisy duplicate doctrine churn while still surfacing potentially overlapping ideas for human review.
- Improves CI/operator visibility into Smart Signals outcomes without re-running signal computation logic.

## 0.3.48 — 2026-03-04

### WHAT
- Added `scripts/playbook/signals-from-diff.mjs` as a thin adapter around the vendored central Playbook Signals Engine, including staged/PR diff modes and repo-local mapping support via `tools/playbook/signals-map.json`.
- Updated both note-generation paths (`playbook:suggest` and Guardian draft generation) to pre-fill `Type`, `Suggested Playbook File`, and `Evidence` from Signals output and skip duplicate drafts when the engine reports a match.
- Added fixture coverage for the adapter integration and documented auto-classification + duplicate-skip behavior in Codex guardrails.

### WHY
- Aligns local Playbook learning loops with central deterministic signal classification so note stubs are faster to review and less manual to fill.
- Reduces note churn by suppressing duplicate draft creation when an equivalent doctrine heading already exists.
- Preserves existing pre-commit and status/trend workflows while improving consistency between suggest and guardian draft paths.

## 0.3.47 — 2026-03-04

### WHAT
- Added `scripts/playbook/contracts-gate.mjs` to enforce `docs/playbook-status.json` as a hard gate: missing status snapshot or `contracts.status == FAIL` now exits non-zero and prints failing contract IDs.
- Wired the contracts gate into `scripts/playbook/precommit.mjs` immediately after `npm run playbook` so commit-time Playbook runs block on contract FAIL.
- Wired the same gate into both CI workflows (`.github/workflows/ci.yml` and `.github/workflows/playbook-learning.yml`) right after `npm run playbook` so merges are blocked when contract status is FAIL.
- Clarified Codex guardrails to explicitly treat contract FAIL as blocking even for unrelated work and to require agents to run verification before finalization.

### WHY
- Enforces a single status-file source of truth for contract health in local hooks and CI instead of duplicating contract recomputation logic.
- Prevents contract regressions from slipping through commit or merge flows by making FAIL states hard-stop gates.
- Preserves existing failure UX while adding actionable contract-failure output that points contributors to `npm run playbook` and remediation.

## 0.3.46 — 2026-03-04

### WHAT
- Added a local Playbook automation alias (`npm run playbook:auto:local`) that runs auto-mode without subtree sync.
- Improved Playbook CI failure UX so workflows emit a failure-only Step Summary block with the recommended next command and reason from `docs/playbook-status.json`.
- Hardened Playbook PR comment publishing so the workflow skips comment updates when `summary.md` is unavailable after earlier failures.

### WHY
- Makes day-to-day remediation faster by providing a predictable local command that avoids unnecessary sync work.
- Gives contributors immediate, actionable recovery guidance directly in failed Actions runs.
- Prevents secondary workflow errors from masking the original gate failure context.

## 0.3.45 — 2026-03-04

### WHAT
- Rewired the active `.githooks` pre-commit runner to execute `npm run -s playbook:precommit` and then `npm run -s playbook:check -- --staged` as blocking steps.
- Simplified `scripts/githooks/pre-commit.mjs` by removing legacy Playbook maintenance and auto-staging behavior so hook logic only orchestrates the two required pre-commit checks.
- Updated npm `prepare` to `node scripts/setup-githooks.mjs` so install-time hook setup matches the repo’s `.githooks` strategy without requiring Husky.
- Added `.gitattributes` normalization for `docs/*.json` files to enforce LF line endings and reduce cross-platform churn.

### WHY
- Aligns commit-time enforcement with the new Playbook pre-commit workflow while preserving fail-fast blocking behavior.
- Eliminates duplicate or conflicting hook responsibilities now that Playbook pre-commit orchestration lives in dedicated scripts.
- Prevents `npm install` failures caused by missing Husky and keeps hook installation relevant to configured Git hooksPath behavior.
- Reduces noisy diffs in generated Playbook JSON artifacts across Windows/macOS/Linux contributors.


## 0.3.44 — 2026-03-04

### WHAT
- Added cross-platform Playbook automation scripts: `npm run playbook:auto` for end-to-end sync/update/optional commit flow and `npm run playbook:precommit` for no-commit pre-commit hygiene checks.
- Wired package scripts for new Playbook automation commands and added Husky `prepare` setup so the repo can install Husky-managed hooks.
- Added a Husky pre-commit hook that runs Playbook pre-commit hygiene first and then continues with the existing staged Playbook notes check gate.

### WHY
- Gives developers one safe command for full Playbook maintenance (including explicit commit steps) while keeping git hooks free of nested commit behavior.
- Enforces Playbook output staging and dirty-repo protections in commit flow so Playbook repo updates are handled intentionally and consistently.


## 0.3.43 — 2026-03-04

### WHAT
- Updated the pre-commit hook to run `npm run -s playbook:check` as a blocking gate before non-blocking Playbook maintenance.
- Kept existing auto-staging behavior for `docs/PLAYBOOK_NOTES.md` and `docs/playbook-status.json`, and retained `npm run -s playbook` as best-effort/non-blocking after the check.

### WHY
- Fails fast locally when learning-zone requirements are missing for staged learning-zone code changes, preventing CI failures after push.
- Preserves current developer ergonomics for Playbook maintenance and status artifact staging while enforcing required documentation parity.


## 0.3.42 — 2026-03-04

### WHAT
- Centralized shell-owned safe-area tokens by defining `--app-safe-top|bottom|left|right` in the global/AppShell token layer and routing existing inset offsets through those shared variables.
- Removed direct `env(safe-area-inset-*)` usage from `ExerciseInfoSheet`, `BottomSheet`, `ConfirmDestructiveModal`, `ToastProvider`, and `BottomActionBar` so feature components consume AppShell-owned safe-area vars instead.
- Tightened the SAFE_AREA_OWNERSHIP allowlist by removing the `BottomActionBar` exception; only shell/global token files remain allowlisted.

### WHY
- Enforces the AppShell safe-area ownership contract so notch/home-indicator spacing is controlled from one shell source of truth instead of ad hoc component math.
- Restores contract-audit reliability by ensuring non-shell UI surfaces cannot silently bypass safe-area governance with direct `env(...)` usage.


## 0.3.41 — 2026-03-04

### WHAT
- Updated Playbook sync dirty-tree checks to allow top-level dirty state only when limited to `docs/playbook-status.json` and/or `docs/playbook-trend.json`, while preserving existing blocking behavior for any other dirty paths and Playbook subtree changes.
- Added automatic staging for generated Playbook status artifacts so update/maintenance flows stage `docs/playbook-status.json` and `docs/playbook-trend.json` when present without auto-committing.
- Documented the new status-artifact staging and sync-ignore behavior in local Playbook notes docs.

### WHY
- Removes recurring workflow friction where generated status snapshots keep the repo perpetually dirty and prevent intended Playbook sync/update flows.
- Keeps sync safety intact for real working-tree changes while allowing generated telemetry artifacts to coexist with normal Playbook operations.


## 0.3.40 — 2026-03-04

### WHAT
- Replaced the Playbook contracts threshold proxy with a real `scripts/playbook/contracts-audit.mjs` architecture audit that reports contract-level PASS/WARN/FAIL outcomes and per-violation file/line evidence.
- Updated `docs/playbook-status.json` generation to embed real contracts audit results (`contracts.summary`, `contracts.byContract`, and overall `contracts.status`) while keeping knowledge note thresholds under a separate `knowledgeGate` field.
- Updated Playbook dashboard rendering (`npm run playbook` and CI markdown status output) to show `Contracts: PASS/WARN(x)/FAIL(x)` and list top failing contract IDs when FAIL is present.
- Added fixtures and a focused audit test runner under `scripts/playbook/__fixtures__/contracts` to validate each v1 contract detector.

### WHY
- Makes contract health reflect actual architecture boundaries instead of inferred note-count pressure, so reported failures map to concrete code issues.
- Preserves existing learning-zone threshold guidance without conflating it with architecture contract compliance.
- Improves local/CI reviewer clarity with per-contract statuses and explicit failing contract IDs from the status snapshot source of truth.
- Adds lightweight regression coverage so future audit changes keep detecting the intended contract classes.


## 0.3.39 — 2026-03-04

### WHAT
- Adopted status snapshot-first Playbook dashboards end-to-end: CI PR reporting now renders from `docs/playbook-status.json` via `scripts/playbook/status-ci.mjs` + shared dashboard formatter, and removed in-workflow duplicate contract/knowledge computations.
- Strengthened pre-commit automation by moving staging logic to a cross-platform Node hook script that keeps Playbook maintenance non-blocking while auto-staging both `docs/PLAYBOOK_NOTES.md` and `docs/playbook-status.json`.
- Extended Playbook status payload/contracts to include `topOffenders`, and updated `npm run playbook` dashboard output to use the same status-file formatter consumed by CI.
- Updated Codex guardrails to require status-file-first execution, contract-fail-first remediation, recommendation command compliance (or explicit justification), and verification before finalization.

### WHY
- Enforces one status-file-driven source of truth for local and CI Playbook guidance while reducing drift from duplicated logic.
- Improves developer reliability on Windows and non-Windows environments by avoiding shell-specific pre-commit staging assumptions.
- Makes contract risk reporting more actionable by surfacing offenders directly in the dashboard output.
- Tightens agent execution discipline so governance recommendations and verification requirements are consistently followed.



## 0.3.38 — 2026-03-04

### WHAT
- Switched Playbook status reporting to a status-file-first contract: `scripts/playbook/write-status-files.mjs` now emits `contracts` and `recommendation` fields in `docs/playbook-status.json`, and `npm run playbook` now prints recommendations from that file.
- Updated Playbook CI status reporting to read `docs/playbook-status.json` exclusively for PR output (`Knowledge`, `Contracts`, `Next`) and removed duplicate notes parsing logic from CI status generation.
- Kept the pre-commit Playbook hook non-blocking while extending auto-staging to include `docs/playbook-status.json` alongside `docs/PLAYBOOK_NOTES.md`.
- Added Codex guardrails requiring agents to read `docs/playbook-status.json`, fix failing contracts before shipping, and follow `recommendation.nextCommand` when present.
- Expanded CI verification to run `npm run playbook` in addition to existing checks.

### WHY
- Makes Playbook status data the single source of truth for local and CI reporting, reducing drift from duplicated computations.
- Keeps developer and CI outputs aligned around one machine-readable contract for recommendations and contract health.
- Improves workflow composability by staging generated status snapshots that pre-commit already refreshes.
- Tightens agent execution discipline so contract failures and prescribed next steps are consistently enforced.


## 0.3.37 — 2026-03-04

### WHAT
- Hardened the Playbook npm runner on Windows by invoking `npm` with `shell: true` to avoid `spawnSync ... EINVAL` failures in shell-specific environments.
- Added a best-effort fallback in `npm run playbook` that directly runs Playbook maintenance scripts when the npm runner cannot spawn.

### WHY
- Keeps `npm run playbook` and pre-commit Playbook maintenance reliable on Windows terminals where npm command spawning can fail.
- Preserves non-blocking maintenance behavior by continuing with direct script execution when npm process launch fails.


## 0.3.36 — 2026-03-04

### WHAT
- Added a cross-platform Playbook npm runner helper so `npm run playbook` invokes `npm.cmd` on Windows and avoids `spawnSync npm ENOENT` failures.
- Updated `npm run playbook` flow to run maintenance, then best-effort local status/trend snapshot writers before reading and printing Playbook status.
- Updated Playbook learning workflow docs to note that `npm run playbook` now generates local snapshots before status output.

### WHY
- Makes the one-command Playbook operator flow reliable across Windows and non-Windows shells.
- Ensures `docs/playbook-status.json` exists locally when possible so status reporting is consistent outside CI.


## 0.3.35 — 2026-03-04

### WHAT
- Added `hooks:install` plus a repo-local `.githooks/pre-commit` hook that runs `npm run playbook` and auto-stages `docs/PLAYBOOK_NOTES.md` updates without blocking commits.
- Updated Playbook CI status UX to recommend `npm run playbook` as the primary suggested command while also reporting a direct command for power users.
- Added a Codex UI layout guardrail: AppShell owns safe-area insets and fixed-bar reserves.

### WHY
- Reduces operator memory burden with one default command and automatic local hook behavior for Playbook maintenance.
- Improves PR guidance clarity by showing both the unified command and a context-specific direct command.
- Prevents recurring mobile spacing/layout regressions by centralizing inset/reserve ownership at the AppShell/page-shell layer.


## 0.3.34 — 2026-03-04

### WHAT
- Added `docs/CODEX_GUARDRAILS.md` to codify pre-patch architecture enforcement rules for single scroll ownership, bottom-actions shell ownership, AppShell safe-area ownership, loader-derived summaries, and defensive UUID validation.
- Updated `docs/WORKFLOWS/playbook-learning.md` with a Codex Guardrails pre-patch gate that requires refusal output when a request conflicts with declared guardrails.

### WHY
- Prevents architecture drift by making core Playbook-derived UI and boundary rules explicit and enforceable before code generation.
- Establishes a deterministic refusal protocol so non-compliant requests are blocked until corrected.


## 0.3.33 — 2026-03-04

### WHAT
- Added a unified `npm run playbook` command that runs Playbook maintenance and then prints a clear status snapshot with a recommended next action.
- Updated the Playbook learning workflow docs to make `npm run playbook` the primary operator command for maintenance plus guidance.

### WHY
- Reduces workflow memory burden by giving operators one default command that both maintains notes and explains what to run next.
- Improves day-to-day Playbook operability with deterministic, visible next-step recommendations after each maintenance run.


## 0.3.32 — 2026-03-04

### WHAT
- Added Playbook knowledge trend tracking with CI-generated trend history artifacts and status snapshots that include trend metadata.
- Improved Playbook CI suggestions to favor maintain/update/sync-and-update commands based on proposed-note pressure and available drafts.
- Updated Playbook Learning workflow/status comment formatting to include command guidance, reminder text, and trend entry counts.

### WHY
- Makes the Playbook Learning system easier to operate by reducing command-memory burden with clearer next-step guidance.
- Preserves historical visibility into knowledge growth over time for future trend visualization.
- Keeps governance telemetry observable in CI without introducing commit-loop risk.


## 0.3.31 — 2026-03-04

### WHAT
- Added a `playbook:maintain` command to run guardian capture plus the proposed-notes threshold check in one step.
- Added CI-generated Playbook status snapshot artifact output (`docs/playbook-status.json`) for machine-readable visibility in workflow runs.
- Improved Playbook status suggestion logic to recommend sync-and-update at warning/fail thresholds and update/guardian for lower-note states.
- Added README and workflow documentation updates for the Playbook Learning status/reporting workflow.

### WHY
- Improves Playbook Learning visibility in CI while keeping automation artifact-only and non-noisy.
- Reduces manual command recall by providing a single maintenance command and clearer state-based next-step guidance.


## 0.3.30 — 2026-03-04

### WHAT
- Hardened Playbook Learning workflow revision reporting so the informational revision-print step cannot fail the CI job.
- Made the Playbook revision printer script gracefully handle missing integration or git read errors while always succeeding.

### WHY
- Keeps Playbook revision visibility available in CI logs without introducing flaky failures when Playbook isn't present in a checkout.
- Ensures informational governance telemetry remains non-blocking across all repository integration modes.


## 0.3.29 — 2026-03-04

### WHAT
- Added PR-visible Playbook Learning Status reporting so pull requests show current Drafts/Proposed/Promoted/Upstreamed note counts and per-push deltas.
- Added a CI status command for Playbook notes so workflows can generate consistent machine-readable count snapshots.
- Updated Playbook Learning workflow behavior to keep one persistent PR comment in sync with the latest status alongside a job summary.

### WHY
- Makes Playbook learning-state changes visible at review time without requiring maintainers to inspect raw notes files.
- Improves governance feedback loops by surfacing trend direction (up/down) on every push.
- Reduces PR noise by updating one stable status comment instead of posting duplicate comment threads.

## 0.3.28 — 2026-03-04

### WHAT
- Added Playbook Guardian automation to generate draft `docs/PLAYBOOK_NOTES.md` entries from recent git changes and append them under a dedicated `DRAFTS (auto)` section with duplicate-safe draft markers.
- Added Playbook Guardian npm commands for local and PR-style diff ranges.
- Documented Guardian workflow usage and optional manual pre-commit hook steps in Playbook learning docs.

### WHY
- Reduces missed reusable learnings by drafting candidate guardrails/patterns from real code changes with low manual overhead.
- Keeps draft note generation idempotent and review-friendly so teams can curate wording before promoting notes upstream.
- Makes the local learning capture loop easier to adopt in both developer flow and CI-oriented review flow.

## 0.3.26 — 2026-03-04

### WHAT
- Standardized Exercise Info STATS rows to a locked two-column label/value layout with consistent section and row spacing across RECENT, TOTALS, and BESTS.

### WHY
- Keeps stat labels and values visually aligned and deterministic across mixed content lengths, improving scanability in the Exercise Info panel.

## 0.3.27 — 2026-03-04

### WHAT
- Added deterministic Playbook sync automation with mode detection for submodule, in-tree sibling repo, or external repo path, plus `playbook:sync` and `playbook:sync-and-update` commands.
- Added a Proposed-notes threshold gate script with explicit warning/failure behavior (warn at 10, fail at 20) and mode-aware operator guidance.
- Added Playbook learning workflow CI coverage for the threshold gate and a non-blocking Playbook revision print step.
- Updated Playbook learning docs to include sync setup/usage and command responsibilities.

### WHY
- Makes Playbook pulls repeatable and deterministic across supported repository wiring patterns.
- Prevents local learning-note backlog from growing silently by surfacing clear escalation thresholds and actionable next commands.
- Improves CI visibility into Playbook linkage state without making informational revision reporting a failure condition.
- Keeps operator workflows discoverable so note promotion and Playbook sync are used together consistently.

## 0.3.26 — 2026-03-04

### WHAT
- Added a one-command Playbook promotion workflow (`playbook:update`) that promotes `Proposed` notes into Playbook destination docs with idempotent marker-based updates and marks local note status as `Promoted` with upstream tracking.
- Added autonomous learning scripts: `playbook:suggest` for git-diff-based note nudges and `playbook:check` for CI enforcement when learning-zone changes occur without note updates.
- Added Playbook learning workflow documentation, parser self-test fixture/script coverage, and CI wiring for the new playbook notes enforcement check.

### WHY
- Makes local-to-global doctrine promotion repeatable and low-friction while preserving traceability across `Proposed` → `Promoted` → `Upstreamed`.
- Reduces missed reusable learnings by nudging developers during local work and enforcing documentation discipline in pull requests.
- Keeps governance automation explicit and maintainable without changing runtime application behavior.


## 0.3.25 — 2026-03-04

### WHAT
- Locked cardio-vs-strength classification to explicit exercise measurement types so strength exercises no longer flip into cardio from incidental duration/distance set values.
- Tightened History Exercises and Exercise Info cardio-set filtering so only explicit cardio measurement types contribute cardio Last/Best summaries.
- Corrected Exercise Info stats row layout with a deterministic two-column grid where labels and values align consistently.
- Added a lightweight verification script for cardio best-metric rule ordering and strength classification guardrails.

### WHY
- Prevents strength movements (for example Machine Row) from rendering cardio-style “Best” rows when metadata noise exists in set fields.
- Ensures cardio Best metrics remain deterministic and only appear for truly-cardio exercises.
- Fixes invisible alignment regressions caused by the wrong row grid behavior in the actual stats box component.
- Adds a fast regression check for the exact classification and best-selection logic that caused this issue.


## 0.3.24 — 2026-03-04

### WHAT
- Promoted reusable Playbook guidance for preserving modality metadata through server stat-loader boundaries and deriving measurement-aware card summaries server-side.
- Promoted a reusable Playbook guardrail requiring literalized Tailwind arbitrary-value classes for layout-critical spacing.
- Marked the corresponding local Playbook notes as Promoted after upstreaming into Playbook docs.

### WHY
- Reduces cross-app regressions where metric-heavy stats silently downgrade due to metadata loss between API and aggregation layers.
- Prevents production-only UI overlap bugs caused by Tailwind extraction missing interpolated arbitrary-value spacing classes.
- Keeps project-local Playbook notes in sync with upstreamed doctrine.

## 0.3.21 — 2026-03-04

### WHAT
- Fixed Exercise Info stats loading so cardio exercises use their canonical measurement metadata when building RECENT/TOTALS/BESTS summaries.
- Normalized cardio measurement/unit metadata for existing session exercise rows and canonical exercise defaults so cardio history surfaces consistently format time/distance stats.
- Polished History → Exercises cards and Exercise Info stats presentation with clearer Last/Best hierarchy and compact aligned stat rows.
- Standardized Exercise Info stats rows to a deterministic 2-column grid layout so labels and values stay aligned when stat values wrap.
- Added cardio diagnosis SQL snippets and a lightweight verification script for Incline Walk cardio totals and Dips bodyweight PR expectations.
- Removed glass background from BottomActionBar inner container (now transparent).
- Tuned BottomActionBar inner container to remove border chrome, soften drop shadow, and slightly increase horizontal dock inset.
- Added back an ultra-subtle BottomActionBar inner tint (`rgb(var(--glass-tint-rgb)/0.22)`) while keeping the borderless dock treatment.
- Fine-tuned BottomActionBar dock tokens to `gap-4`, `pt-2`, tint `rgb(var(--glass-tint-rgb)/0.20)`, and shadow `0 6px 16px rgb(0 0 0 / 0.35)` while keeping the borderless rounded/blur treatment.
- Increased BottomActionBar fixed reserve padding offset from `+3px` to `+12px` in the shared reserve class.

### WHY
- Ensures logged cardio sets (duration/distance/calories) are counted and surfaced even when reps are empty.
- Prevents cardio rows from falling back to reps-style metadata that hides meaningful Last/Best summaries.
- Improves readability and scan speed on history/info surfaces while preserving the existing architecture.
- Prevents wrapped stat values from staggering label alignment in Exercise Info, especially on narrow/mobile viewports.
- Makes regression checks easier for the specific cardio/bodyweight failures observed.
- Improves visual integration and reduces heavy slab appearance while preserving sticky behavior and safe-area spacing.
- Keeps the bottom action dock visually lighter and more floating while preserving blur, sticky behavior, and safe-area reachability.
- Restores a minimal glass separation cue over varied page backgrounds without reintroducing the heavier slab effect.
- Improves dock rhythm and contrast balance with slightly tighter vertical padding and refined separation from varied backgrounds without returning to a heavy slab look.
- Adds intentional breathing room between trailing content and the dock so pages feel less cramped near the fixed action region.

## 0.3.20 — 2026-03-03

### WHAT
- Corrected cardio `session_exercises` defaults so `default_unit` stays aligned with `measurement_type` for new and previously logged rows.
- Updated cardio history/info rendering contracts to key display behavior from measurement type while treating stored default unit values as non-authoritative formatting hints.

### WHY
- Prevents cardio surfaces (including Incline Walk history/info) from falling back to reps-style empty states when time-based metrics are present.
- Keeps session-exercise measurement metadata internally consistent so server-derived summaries remain deterministic.

## 0.3.19 — 2026-03-03

### WHAT
- Made `FIXED_CTA_RESERVE_CLASS` a literal Tailwind utility string and safelisted it so bottom-action scroll reserve CSS is always emitted.

### WHY
- Tailwind may omit interpolated utility strings, which can remove bottom reserve padding and cause content overlap behind viewport-pinned action bars.

## 0.3.18 — 2026-03-03

### WHAT
- Improved History → Exercises card summaries so cardio exercises show measurement-aware Last/Best effort lines and bodyweight-only exercises show rep-led Last/PR lines instead of empty PR states.
- Expanded Exercise Info stats for cardio and bodyweight cases to surface meaningful RECENT/TOTALS/BESTS signals (including duration/distance/pace/calories where available).
- Added development-time stats verification checks for Incline Walk and Dips so key cardio/bodyweight stat signals are validated during local development.

### WHY
- Keeps history and exercise detail surfaces meaningful for cardio and pure bodyweight movements, not just weighted strength.
- Makes “best effort” deterministic by measurement type so users see the right performance signal for each exercise.
- Reduces regressions by checking for required signal presence without overfitting to exact values.

## 0.3.16 — 2026-03-03

### WHAT
- Made bottom-actions scroll reserve deterministic by always applying the shared fixed CTA reserve class in `ScrollScreenWithBottomActions`.
- Switched bottom-action publishing to a layout-timed publish cycle so action presence is established before initial paint when possible.
- Initialized the bottom-action portal root on first client render for portaled variants to keep sticky/fixed behavior stable from the first frame.

### WHY
- Viewport-pinned bottom actions require a reliable scroll reserve so final content can scroll fully above the action bar across screens.
- Reduces transient mount-order timing gaps that can cause one-frame overlap or layout jumps when bottom actions publish during hydration/transitions.

## 0.3.15 — 2026-03-03

### WHAT
- Added a shared `ScrollScreenWithBottomActions` layout wrapper that always renders bottom actions inside the single `ScrollContainer` scroll owner with the slot as the final child.
- Migrated Session, History Log Detail, Routines, Routine Day, and Today screens to use the wrapper so provider/slot placement is consistent across all bottom-action surfaces.
- Added a lightweight development warning when `BottomActionsSlot` is mounted without a detected scrollable ancestor.

### WHY
- Restores Today-style sticky bottom action behavior everywhere by structurally enforcing the required “slot inside scroller” contract.
- Prevents regressions where actions stop sticking because the slot is rendered outside the true scroll owner.

## 0.3.14 — 2026-03-03

### WHAT
- Migrated remaining screen-level bottom actions to the shared Today-style slot pattern by removing direct `BottomActionBar` usage from Today, Routines, and Routine Day surfaces.
- Added a reusable bottom-actions publisher helper so feature/UI nodes publish action content into one screen-owned sticky slot rendered once per scroll screen.

### WHY
- Eliminates fixed-bottom overlap/clipping regressions on mobile Safari by keeping bottom actions in-flow under a single scroll owner.
- Standardizes bottom action placement across app surfaces, reducing UI drift and making action rendering easier to maintain.

## 0.3.13 — 2026-03-03

### WHAT
- Enforced canonical exercise linking in session/logging writes so new `session_exercises` rows must resolve to a real exercise id before sets can be logged.
- Added a safe backfill for legacy `session_exercises` rows missing `exercise_id` when a linked routine-day exercise provides an unambiguous canonical match.
- Hardened Exercise Info/History exercise stat loading to prioritize canonical id joins and avoid cross-exercise PR leakage when canonical linkage is missing.

### WHY
- Ensures newly logged Pull-Up/bodyweight sets immediately appear in Exercise Info stats.
- Repairs prior unlinked rows safely so historical stats can recover without manual database edits.
- Prevents PR/stat contamination between similarly named movements (for example Pull-Up vs Weighted Pull-Up).

## 0.3.12 — 2026-03-03

### WHAT
- Formalized a single top-layout contract where `AppShell` owns top safe-area/nav offsets and `AppNav` reads those shell-provided variables instead of independent global header offsets.
- Marked legacy global header offset variables as non-canonical for layout and documented the fixed-bottom action reserve contract directly at the shared `FIXED_CTA_RESERVE_CLASS` source.
- Removed redundant route-level top spacing compensation on the Routines overview screen while preserving the existing bottom fixed-action reserve behavior on fixed-bar routes.
- Documented the mobile layout contract in architecture guidance so scroll ownership, top-nav spacing, and fixed CTA reserve usage remain consistent across routes.

### WHY
- Prevents spacing drift caused by competing top-offset sources and keeps notch/header clearance deterministic across main routes.
- Reduces overlap/whitespace regressions by keeping fixed-bottom reserve ownership on the single scroll container pattern.
- Makes the layout contract explicit for future route work so mobile spacing bugs are caught earlier.

## 0.3.11 — 2026-03-03

### WHAT
- Normalized Exercise Info stats into one server-derived view model that includes bodyweight and weighted set history, and now surfaces all meaningful computed rows (last performed, totals, best reps/weight, PR breakdown, and best set when available).
- Hardened Exercise Info ID flow and stats fallbacks so exercises with logged completed sets do not incorrectly show an empty "No stats yet" state.
- Portaled History view-mode dropdown and per-session context menus to a top-level overlay layer with consistent z-index behavior.
- Tightened History compact card spacing and removed redundant weekday/date duplication in session metadata lines.

### WHY
- Keeps Exercise Info trustworthy for both bodyweight and weighted movements, including legacy-id entry paths.
- Prevents card/container stacking contexts from clipping or overlapping dropdown/menu overlays on mobile.
- Improves scan speed in compact history mode with cleaner, less repetitive date presentation.

## 0.3.10 — 2026-03-03

### WHAT
- Reused the Today bottom-action CTA pattern across History Log Detail, Routines, Routine Day View, and Current Session exercise detail by standardizing on one shared fixed CTA reserve class on each route’s existing scroll owner.
- Normalized Edit/Delete, Edit routine, Edit Day, and Save Set actions to the same fixed bottom CTA behavior and removed route-specific bottom spacing compensation in those flows.

### WHY
- Prevents fixed CTAs from overlapping the final content while preserving existing full-screen scroll ownership and mobile safe-area consistency.

## 0.3.9 — 2026-03-03

### WHAT
- Restored viewport-fixed BottomActionBar behavior for History Log Detail and Current Session Exercise Detail actions, and standardized a shared bottom-content reserve class exported from the BottomActionBar component.
- Applied the shared reserve padding only to the existing scroll owners on `/history/[sessionId]` and `/session/[id]` so Edit/Delete and Save Set no longer cover final content.
- Tightened BottomActionBar bottom inset usage to the safe-area contract so there is no extra dead space below action buttons.

### WHY
- Keeps critical bottom actions always visible while ensuring long-form detail content remains fully reachable above the fixed bar.
- Preserves the existing full-screen single-scroll-owner behavior without introducing new overflow ownership or in-flow footer changes.

## 0.3.8 — 2026-03-03

### WHAT
- Updated PR detection so bodyweight/0-weight sets can generate rep PRs and session summaries now expose PR counts split by Rep PRs vs Weight PRs.
- Updated History session cards and History log header summaries to show PR breakdown labels (for example, `2 Rep PRs • 1 Weight PR`) instead of a single PR total.
- Expanded Exercise Info stats to consistently show bodyweight-friendly best reps/weight and category-based PR breakdown details while keeping the Stats section visible with empty-state messaging.

### WHY
- Bodyweight movements now produce meaningful progression records instead of being excluded from PR logic.
- Category-based PR labels make history summaries easier to interpret at a glance.
- Consistent stats rendering improves trust in exercise insights even when a movement has sparse or bodyweight-only history.

## 0.3.7 — 2026-03-03

### WHAT
- Made the History log detail and Current Session exercise-detail bottom actions use in-flow sticky BottomActionBar placement within the page scroll container contract.
- Removed sticky offset drift by tightening BottomActionBar sticky positioning and ensuring no alternate action placement remains after content.
- Updated the shared app shell to enforce app-contained vertical scrolling instead of body-level scrolling for no-nav detail flows.

### WHY
- Keeps Edit/Delete and Save Set actions pinned and reachable while users scroll long detail content.
- Prevents sticky action bars from behaving like normal bottom-of-document content when scroll ownership is inconsistent.

## 0.3.6 — 2026-03-03

### WHAT
- Redesigned History → Sessions cards in both Details and Compact modes with clearer hierarchy, a shared performance summary row, and optional top-set context in Details mode.
- Added server-derived `SessionSummary` shaping for History sessions and reused that summary in Log View header rendering.
- Added per-session 3-dot context menu actions on History cards (Edit, Delete, and disabled placeholders for future Perform Again / Save as Template actions).
- Added shared formatting helpers for short duration, counts, weight/set display, and short date labels, then applied them to History Sessions and Log View summary surfaces.

### WHY
- Makes history feel like a performance archive with faster scanability and consistent summary language.
- Keeps summary derivation deterministic and efficient by computing once during load/transform instead of during card render loops.
- Preserves existing data safety boundaries while preparing a clean path for the next Log View upgrade pass.

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

## 2026-03-18 — Normalize shared in-app back navigation

### WHAT
- Added a shared `useBackNavigation` history stack for mobile back controls so route-level back buttons prefer prior in-app history and fall back to a safe per-screen route on direct loads or refreshes.
- Updated shared back-button primitives plus routine, history, and session header surfaces to use the same history-first/fallback-second semantics instead of bespoke screen-local back rules.
- Normalized routine mobile page-header composition onto the shared `AppHeader` spacing contract so top-right back-button placement is consistent across detail and edit screens.

### WHY
- Prevents browser back from ejecting users to an external referrer when the previous usable screen is not inside the app.
- Keeps mobile header navigation semantics centralized in shared page-shell primitives so future cleanup work does not reintroduce route-hardcoded back behavior.

## 0.3.79 — 2026-03-17

### WHAT
- Refactored `scripts/playbook-runtime.mjs` acquisition flow into typed paths so package acquisition still installs package specs, while official fallback acquisition validates and installs direct distribution specs verbatim into `.playbook/runtime` without reinterpretation as registry syntax.
- Added acquisition diagnostics that print package/fallback targets plus the npm command shape used for each path to make CI and local failure modes explicit.
- Added `scripts/playbook-runtime.test.mjs` coverage for local tarball fallback specs, https tarball URL normalization/acceptance, and missing/registry-like fallback spec failure output.
- Updated `README.md` fallback guidance to document accepted direct fallback spec shapes and explicitly route registry package specs to package acquisition.

### WHY
- Fixes spec-shape conflation where direct tarball/git fallback targets could be treated like registry package/version specs and fail before runtime execution.
- Preserves package-first behavior while making fallback acquisition deterministic, typed, and auditable for clean CI environments.

## 0.3.74 — 2026-03-17

### WHAT
- Switched `@fawxzzy/playbook-cli` from the repo-local `file:tools/playbook-cli` bootstrap package to the published upstream wrapper dependency model in `package.json`/`package-lock.json`.
- Removed the temporary repo-local wrapper package at `tools/playbook-cli` now that upstream package parity is available.
- Kept `scripts/playbook-runtime.mjs` as a thin command bridge and refreshed wording to reflect steady-state upstream package usage.
- Updated `README.md` and `docs/PROJECT_GOVERNANCE.md` to document that consumer repos should use the published package model and treat local fallback only as backup recovery.

### WHY
- Enforces the migration rule that temporary bootstrap packages must be retired once upstream package parity is proven.
- Prevents local wrapper drift from masking whether real consumer package integration actually works.
- Keeps clean-environment Playbook proof runs aligned with the canonical upstream dependency path.

## [Unreleased]

### Changed
WHAT:
- Extended the exercise logging data contract with measurement metadata (`measurement_type`, `default_unit`, optional calorie estimation method) and added set-level distance/calorie fields to support cardio distance tracking alongside existing reps/weight/time logs.
- Propagated the new exercise contract fields through shared database types and server-loaded exercise option payloads used by session and routine exercise pickers.
WHY:
- Establishes schema-level support for measurement-type-driven logging (including distance and time+distance modes) without changing current UI behavior, so future cardio logging UX can ship on top of a stable, backward-compatible contract.

### Changed
WHAT:
- Backfilled canonical global exercise metadata so every global exercise has validated how-to text, movement pattern, primary/secondary muscles, and placeholder image paths from the canonical JSON source.
- Added a dedicated SQL backfill migration that updates global exercise metadata by normalized global exercise name and includes QA verification queries for Supabase SQL editor checks.
WHY:
- Ensures global exercise metadata stays complete and constraint-safe across environments while making the backfill repeatable and easy to verify against the canonical dataset.

### Changed
WHAT:
- Introduced a richer shared app-button API (variant/size/active state), then normalized key actions to those shared styles across Today, Routines, History, and Session screens (Start Workout, Resume Workout, CHANGE DAY, End Workout, Create Routine, View, and destructive Delete actions).
- Standardized top-right back controls through the shared back-button styling path and aligned Current Session UI copy/layout by renaming "Session Timer" to "Timer" and removing the standalone session date/time bar.
- Updated Today’s CHANGE DAY overlay flow to use explicit day selection with OK/Cancel confirmation while preserving pre-start day switching behavior.
WHY:
- This removes visual drift for high-frequency actions, keeps active/destructive affordances consistent on glass surfaces, and improves session-screen clarity without changing underlying workout/timer persistence behavior.

### Changed
WHAT:
- Expanded exercise metadata support with how-to text, muscle focus fields, movement/equipment tags, and image path references designed to point at SVG placeholders now and Supabase Storage URLs later.
- Updated exercise selection UX with searchable cards, metadata tags, and an on-demand info overlay that lazy-loads full exercise details from a strict server action.
- Added placeholder SVG exercise media, binary-file guardrails (.gitignore + CI tracked-file size check), and documented binary-restricted asset policy expectations.
WHY:
- This enables richer exercise guidance in-picker without client-side database writes, preserves RLS-safe server/client boundaries, and prevents binary-asset review failures while keeping a clean upgrade path to hosted media.

### Changed
WHAT:
- Removed the helper sentence under Today’s `CHANGE DAY` action and made day cards in the chooser immediately selectable on tap, applying the chosen day for the next workout start without requiring an extra confirmation button.
- Reverted Routines cards to the pre-reorder-arrow layout by removing up/down move controls and restoring the prior card action arrangement.
WHY:
- This matches requested day-picker interaction expectations (tap-to-select temporary day) and restores the preferred routines card UI without arrow-based ordering controls.

### Changed
WHAT:
- Replaced Today's pre-start day selector dropdown with a `CHANGE DAY` button that opens a centered chooser overlay with single-select routine-day options plus `OK`/`Cancel`.
WHY:
- This keeps the start flow cleaner on mobile while preserving temporary day selection control before launching a workout session.

### Changed
WHAT:
- Added a compact live clock above the top navigation card that shows local hour/minute with AM/PM in a subtle Apple-inspired style.
WHY:
- This provides an always-visible time reference at the top of the app without adding visual weight or disrupting the existing navigation layout.

### Changed
WHAT:
- Added visible routine-card reordering controls on the Routines list so routines can be moved up/down directly in-place.
- Strengthened destructive action styling across routines/history/day-edit surfaces to use a clearer red treatment.
- Improved Today flow clarity by making the pre-start day-change shortcut more prominent under Start Workout.
- Fixed Today day-resolution/session-window logic to use the active routine timezone consistently, preventing post-workout day/date mismatches.
- Added a day-save safeguard that preserves an existing day name if a save payload is accidentally blank.
WHY:
- These changes address reported usability and correctness issues around routine ordering, destructive affordances, day editing reliability, and deterministic day/date behavior after completing workouts.

### Changed
WHAT:
- Updated the Routines list header layout to keep the main card aligned directly under top navigation and moved the Create Routine CTA into the list container header for clearer placement.
- Removed cycle-length and weight-unit metadata lines from routine cards so each card focuses on routine name and actions.
- Updated History log title labels to use a squared badge style and restyled History delete actions to match routine-card delete button treatment.
WHY:
- These refinements improve cross-screen alignment under the shared nav pattern, reduce card noise, and make destructive actions visually consistent across routines/history surfaces.

### Changed
WHAT:
- Updated Today's workout-start flow to use an `ActionResult` server-action contract for non-navigation outcomes, with inline client toast feedback for failures and client-driven navigation on success.
WHY:
- This standardizes server-action semantics (return for data/errors, navigation only for route transitions), reducing mixed redirect/error handling complexity at the server/client boundary.

### Changed
WHAT:
- Updated History cards and Log Details to resolve and display the current routine day name for each session (while still honoring manual day-name overrides), instead of relying only on originally-captured auto-generated names.
- Switched History date/time rendering to client-local formatting for accurate local clock display.
- Expanded History Edit mode so users can add and remove exercises from completed logs (in addition to existing set and note edits).
- Fixed Today’s day-window/session-completion logic to use the profile timezone consistently and hide the Completed badge while a new in-progress workout exists.
- Stopped routine-level edits from auto-renaming all existing day names, preserving user-customized day labels.
WHY:
- These changes address reported correctness issues around day naming, timestamp trust, and daily-session status, while improving post-workout log maintenance without changing the server-action/RLS architecture.

### Changed
WHAT:
- Added in-session set removal controls in the active workout logger, including removal of queued offline set logs from local queue storage.
- Added goal-driven set logger prefill so target weight/reps/duration auto-populate when opening an exercise during an active session.
- Persisted active-session logged-set state/form inputs to local storage so set logs survive app/device restarts for the same resumable workout session.
- Expanded History log Edit mode to support adding, updating, and deleting individual sets (not just session/exercise notes).
WHY:
- These updates address requested workout continuity and editability gaps: users can correct live mistakes, recover in-progress logs after restart, and fully maintain completed history data from the existing Edit workflow.

### Changed
WHAT:
- Made active session timers resilient to app background/close by restoring running state from local session storage and persisting elapsed time when the app is hidden or closed.
- Added per-exercise target weight unit selection (kg/lbs) when adding routine-day exercises, and surfaced that unit in day/session target text.
- Added per-set weight unit selection (kg/lbs) in the current-session set logger and saved the chosen unit with each set log (including offline queue payloads).
- Fixed current-session set-count badges so counts update immediately after logging sets instead of staying at initial values.
- Fixed expanding a session exercise card after adding exercises by rendering only the selected expanded card, removing stacked hidden-card spacing gaps.
WHY:
- These updates address requested session reliability and correctness issues while preserving the existing server-action/RLS architecture and improving clarity for mixed-unit training logs.

### Changed
WHAT:
- Removed the routine-day empty-state line in day editing so the exercise list no longer shows the extra "No exercises yet" placeholder block.
- Added an inline clear (×) control to the exercise search field so users can reset filtering in one tap.
- Slightly reduced the Routines list viewport height on mobile so the bottom edge sits cleaner within the screen.
WHY:
- This matches requested UX cleanup for the routines flow, improves search ergonomics during exercise selection, and prevents the routines list from appearing to bleed off the bottom of the viewport.

### Changed
WHAT:
- Added a shared list-shell class token set and applied it to both Routines and History list surfaces to standardize mobile scroll viewport sizing, snap behavior, and card shell spacing.
- Increased list row action tap-target sizing for routine/history card controls using the shared shell tokens.
WHY:
- This keeps list behavior consistent across tabs while honoring the no-redesign request by limiting updates to shell ergonomics (scroll, padding, snap, and tap targets).
- Updated History list fetching to use cursor-based pagination with a server-rendered "Load more" control while keeping the existing 20-item initial page size.
WHY:
- Cursor pagination keeps large history feeds bounded and responsive without changing the first-load behavior users already expect.

### Fixed
WHAT:
- Softened the History card Delete action interaction state by removing the stronger hover/click highlight treatment.
WHY:
- The prior highlight drew too much attention during quick list interactions; a calmer state keeps destructive controls readable without visual flash.

### Changed
WHAT:
- Documented the standard Playbook subtree sync workflow in governance docs, including `git subtree pull --prefix=Playbook ... --squash`, the `git sync-playbook` alias path, and a concise ongoing update sequence.
WHY:
- Keeping subtree update guidance in-repo makes Playbook governance repeatable, reduces sync ambiguity, and reinforces intentional doctrine versioning.

### Changed
WHAT:
- Refined the bottom-nav Settings icon to a cleaner, sharper gear mark for improved small-size legibility.
WHY:
- The prior icon looked visually soft at mobile tab size; a simplified shape reads faster and feels crisper.

### Changed
WHAT:
- Updated routine creation flow so saving a new routine now sends users directly to that routine’s edit screen.
- Updated new-routine defaults and active-session date display to prefer device-local timezone/date when available.
- Refined routine list Edit button coloring for more consistent accent contrast.
- Added exercise count plus a short exercise-name preview on day cards in the routine edit screen.
- Updated logged set labels in active sessions from shorthand hash format to explicit "Set N" wording.
WHY:
- These changes align routine/session UX with requested navigation and readability improvements while making time/date context reflect the user’s local device more reliably.

### Changed
WHAT:
- Updated the active Session screen controls by removing the checkmark from the Save Session label, using a clearer green save CTA, and placing the Add exercise section before the session timer block.
- Refined current-session exercise cards so the set-count badge sits inline with the exercise title and a right-aligned Open control appears while cards are collapsed.
- Reworked in-card Set Timer layout to mirror the session timer pattern (title, running time, Start/Pause + Reset) while keeping compact sizing.
- Added reset behavior for Set Timer rep-source logic so resetting exits timer-tap rep mode and logging returns to manual reps input values.
WHY:
- These updates match the requested session UX flow, make expand/collapse actions clearer in dense card lists, and keep timer-driven logging behavior predictable after reset actions.

### Changed
WHAT:
- Replaced the time badge on History list cards with an inline Delete action, while keeping the existing detailed log view available via View.
- Removed the empty-state card from the Routines page so no extra bottom card appears when the list is empty.
- Refined Routines list layout and card actions: shortened list container height to avoid page-level right-edge overflow, and restyled Edit/Delete controls with a smoother glass-like treatment.
- Updated routine day seeding/naming to auto-assign weekday names based on the routine start date and corresponding calendar progression (e.g., Monday through Sunday alignment).
- Updated the active Session header layout by removing the "In progress" tag and placing the Back button on the right side of the title row.
WHY:
- History cards now prioritize direct lifecycle management where users requested it while retaining log navigation.
- Removing redundant empty-state chrome keeps the routines screen cleaner.
- The routines list now fits mobile viewport constraints better and action controls better match the app's glass visual language.
- Automatic weekday naming improves day-to-calendar clarity for routine planning and execution.
- Session header changes reduce visual noise and align back-navigation placement with the edit-routine screen pattern.

### Fixed
WHAT:
- Added explicit measurement units in set logging and history set displays so weight, rep, and time values are always labeled (for example `kg/lbs`, `reps`, and `sec`).
WHY:
- Unit-labeled values reduce ambiguity and make workout data quicker to scan accurately.

### Fixed
WHAT:
- Wrapped the Routines page "Create Routine" CTA in a glass card backdrop container so it visually matches surrounding list/navigation surfaces.
WHY:
- The primary action now aligns with the app's established card hierarchy and feels more cohesive in the Routines layout.

WHAT:
- Adjusted the Routines page primary "Create Routine" CTA to use the same button geometry and emphasis as other primary actions.
- Matched the Routines list container height behavior to History so the card list fills the same bounded viewport region and no longer appears to stop short.
WHY:
- Consistent CTA proportions improve visual polish and tap-target predictability on mobile.
- Aligning Routines with History container sizing removes uneven bottom spacing and keeps scrolling behavior consistent across tabs.

### Changed
WHAT:
- Added a back navigation control on the History log detail (view) screen so users can return to the history list in one tap.
- Updated log set statements on the History log detail screen to include the routine weight unit directly after each logged weight value (for example, `30lbs` or `30kg`).
WHY:
- The view flow now has an explicit, mobile-friendly way to return to the log list without relying on browser navigation.
- Showing units inline removes ambiguity when reviewing completed workouts across routines that may use different weight systems.

### Changed
WHAT:
- Added a dedicated History Log Details (audit) screen at `/history/[logId]` with a read-first layout and explicit Edit → Save/Cancel mode instead of reusing live session controls.
- Reintroduced editable history fields for completed logs: day name override, session notes, and per-exercise notes.
WHY:
- Completed workout logs should feel like auditable records rather than resumable live sessions.
- Explicit edit mode reduces accidental changes while still allowing lightweight post-workout context updates.

### Changed
WHAT:
- Updated the Routines tab layout to use a viewport-contained list region so long routine lists stay fully visible on screen instead of being clipped at the bottom.
- Removed the timezone text line from the Routines overview screen.
WHY:
- Matching the History tab’s anchored scroll behavior improves mobile usability and keeps list navigation predictable.
- The timezone line was redundant on the overview and removing it reduces visual clutter.

### Changed
WHAT:
- Slimmed the shared top tab bar spacing so it occupies less vertical height and leaves clearer separation from page content below.
- Updated the Routines page to use the same contained, snap-scrolling list structure as History logs for consistent mobile list behavior.
WHY:
- The prior header felt visually heavy and crowded adjacent content on mobile.
- Matching History’s scroll container pattern improves cross-tab consistency and keeps long routine lists easier to scan without shifting the full page.

### Fixed
WHAT:
- Consolidated session exercise removal to a single action button per focused exercise, using the existing form-action removal path with one in-flight state to prevent duplicate submits.
WHY:
- A single canonical removal flow avoids duplicated controls, keeps feedback/refresh behavior consistent, and reduces accidental double-submit risk during workout logging.

### Changed
WHAT:
- Added PWA install metadata (`manifest.ts`) and iOS Add-to-Home-Screen metadata in the root layout, including references to generated Android and Apple icon files.
- Added text-only PWA source assets plus a build-time asset generator script (`sharp`) that creates required PNG icons in `public/` during `prebuild`.
- Updated `.gitignore` to keep generated icon/splash PNG binaries out of git history.
WHY:
- iOS and Android install flows need PNG icon assets for reliable home-screen behavior.
- Generating binaries at build time keeps pull requests text-diffable and compatible with tooling that rejects binary file diffs.

### Fixed
WHAT:
- Retuned the glass visual tokens to reduce harsh glare: softer sheen intensity, lower blur/saturation levels, calmer elevation, and slightly denser tint for dark-mode readability.
- Adjusted shared glass highlight behavior to use a subtle edge-light treatment instead of a strong full-surface hotspot.
WHY:
- The prior glass pass looked too glossy and produced distracting glare on key cards/nav surfaces; the updated tuning better matches the softer frosted reference style while keeping contrast and legibility stable.

### Changed
WHAT:
- Introduced a centralized glass-design token system (blur/tint/border/shadow/radius/sheen) and reusable glass primitives, then applied those surfaces to core app UI shells (navigation, cards, and key page containers) for a consistent Liquid Glass-inspired look.
- Added a user-facing Glass Effects preference (On / Reduced / Off) in Settings, persisted locally and wired to global styling behavior.
WHY:
- A single source of truth for translucent surfaces keeps styling consistent and easier to maintain while avoiding ad hoc blur stacking.
- Giving users control over effect intensity improves accessibility/performance, especially when reduced motion or lower visual complexity is preferred.

### Changed
WHAT:
- Introduced a centralized glass-design token system (blur/tint/border/shadow/radius/sheen) and reusable glass primitives, then applied those surfaces to core app UI shells (navigation, cards, and key page containers) for a consistent Liquid Glass-inspired look.
- Added a user-facing Glass Effects preference (On / Reduced / Off) in Settings, persisted locally and wired to global styling behavior.
WHY:
- A single source of truth for translucent surfaces keeps styling consistent and easier to maintain while avoiding ad hoc blur stacking.
- Giving users control over effect intensity improves accessibility/performance, especially when reduced motion or lower visual complexity is preferred.
- Updated `docs/ARCHITECTURE.md` to explicitly document server/client boundaries, strict server-action write rules, RLS expectations, and architectural change-management guidance.
WHY:
- Keeping architecture guardrails explicit in-repo reduces accidental drift and keeps future feature work aligned with governance constraints.

### Changed
WHAT:
- Added a reusable `tapFeedbackClass` interaction pattern for session controls with press-scale, subtle press opacity shift, and short transition timing.
- Applied the pattern across session exercise focus controls, set timer/logger actions, session header save action, and session add/remove exercise buttons.
WHY:
- Consistent touch-first press feedback improves perceived responsiveness on mobile while preserving keyboard focus-visible rings for accessibility.

### Changed
WHAT:
- Added an app-level lightweight toast provider and shared client action-feedback helper, then routed session feedback (save workout, add/remove exercise, and set log success/failure states) through toast notifications instead of inline success/error banners.
WHY:
- Immediate transient toasts provide faster, native-app-style feedback during session logging while preserving server-side validation and RLS-safe server action boundaries.
- Replaced hard show/hide behavior for focused session exercise cards with quick expand/collapse transitions, and added reduced-motion-safe animation handling for session exercise card/list states.
- Added short enter/exit transitions for logged set rows so set list updates feel smoother while preserving fast logging flow.
WHY:
- Animated visibility/list updates improve spatial continuity during workout logging without slowing down interaction speed, and reduced-motion support keeps the flow accessible.

### Changed
WHAT:
- Added a lightweight offline/sync status badge component used in Session controls and Today cards to surface connection + queue state (`Offline`, `Saved locally`, `Syncing…`) with a brief `All changes synced` confirmation after queue drain.
WHY:
- Users logging workouts on mobile need low-noise confidence about whether entries are local-only, actively syncing, or fully synced without leaving the current flow.

### Changed
WHAT:
- Added an offline set-log sync engine that listens for reconnect events, processes queued logs in FIFO order, and tracks retry/backoff metadata for failed sync attempts.
- Added server-side queued-set ingestion support with idempotency via `client_log_id` when available and deterministic payload dedupe against recent set history.
- Added a nullable `client_log_id` column and a user-scoped unique index for durable idempotent set ingestion.
WHY:
- Reconnect sync needs deterministic retry behavior and duplicate protection so offline logging can recover safely without creating repeated set rows.

### Fixed
WHAT:
- Replaced count-based set index assignment in session set logging with conflict-safe append allocation (`max(set_index) + 1`) and bounded retry behavior.
- Added a database unique index on `(session_exercise_id, set_index)` for deterministic per-exercise set ordering.
- Narrowed session set idempotency checks to explicit `client_log_id` matches (scoped by session exercise + user) and removed payload-hash duplicate detection when no client log ID is supplied.
WHY:
- Count-based indexing can collide during reconnect/offline flush races; uniqueness plus retry preserves append semantics while preventing duplicate set indexes.
- Payload-based matching could suppress legitimate repeated sets with identical values; explicit client IDs preserve safe retries without blocking intentional logs.

### Changed
WHAT:
- Added an offline set-log queue for session set entries so failed/offline set submissions are stored locally and restored in-session with a visible queued state.
WHY:
- This keeps workout logging usable during network/server interruptions while preserving server-side data ownership and existing online save behavior.

### Changed
WHAT:
- Added a Today offline snapshot flow that writes normalized routine/day/exercise + session-start hints to browser storage after successful render hydration, using IndexedDB with localStorage fallback.
- Added a Today client fallback shell that reads cached data when live Today fetches fail and surfaces a subtle stale-data timestamp warning.
WHY:
- This keeps Today usable during connectivity or transient server failures without weakening server-side data ownership, while clearly signaling when the view is showing cached content.

### Fixed
WHAT:
- Replaced remaining inline dark-surface `bg-[rgb(var(--surface-2)/...)]` formulas in routine-edit and today UI states with named semantic utilities, and added a dedicated `bg-surface-2-active` utility for pressed states.
WHY:
- Named surface utilities keep dark-theme container states consistent, reduce class-string drift, and make future refactors less regression-prone.

### Changed
WHAT:
- Clarified History card split actions by keeping `View` as the primary button and relabeling the secondary action to `Manage` with a quieter visual treatment.
WHY:
- Explicit primary/secondary action hierarchy better signals “open vs manage” intent on mobile list cards and reduces accidental taps.

### Changed
WHAT:
- Tuned the History timeline to use an explicit fixed-height scroll window on mobile with snap alignment while relaxing the height cap on larger breakpoints.
WHY:
- A fixed mobile viewport keeps the surrounding shell anchored and improves orientation when cycling long chronological card feeds.

### Fixed
WHAT:
- Replaced inline dark-surface color formulas in routine-edit collapsible containers with shared `bg-surface*` token utilities.
WHY:
- Centralized theme surface tokens make collapsible/expanded panels less brittle and prevent regressions toward washed-out white-style backgrounds in dark mode.

### Fixed
WHAT:
- Added dedicated route-level loading boundaries for each primary mobile tab (`/today`, `/routines`, `/history`, `/settings`) while keeping a shared loading presentation.
WHY:
- Segment-level loading feedback makes tab switches feel immediate on dynamic routes instead of waiting silently for fresh server payloads.

### Fixed
WHAT:
- Added dark-theme utility overrides for `bg-slate-50` and `bg-slate-100` so newly logged set rows no longer render as pale/blank bars in the session logger.
WHY:
- Some set-list items were still using light Tailwind backgrounds that were not mapped to theme tokens, making text appear washed out or invisible in dark mode.

### Changed
WHAT:
- History cards now show a subtle sequential `Log #` badge on each session item to make order easier to scan at a glance.
- The history list now lives inside a fixed-height, scroll-snapping container so the page shell stays visually stationary while users wheel/scroll through many logs.
WHY:
- Users asked for clearer log ordering and a more "wheel-like" browsing experience that keeps context stable even with long history lists.

### Changed
WHAT:
- Session screen now loads with the “Add exercise” section collapsed by default so workout logging opens with less vertical clutter.
- Routine day cards on the Edit Routine screen now label the action as “Tap to edit” instead of “Edit.”
WHY:
- This matches the requested mobile flow, keeps the current workout context visible first, and gives clearer touch-oriented guidance on day-card actions.

### Fixed
WHAT:
- Resolved merge drift on the History page by reconciling the recent card redesign with the latest dark-theme token updates, keeping explicit View/Edit actions while restoring consistent contrast.
WHY:
- The prior merge left the history surface and text treatments visually inconsistent with the rest of the app, reducing clarity and perceived polish.

### Changed
WHAT:
- Refined the History list session cards with sharper visual hierarchy and split primary actions into dedicated View + Edit buttons, plus a compact duration badge for fast scanning.
WHY:
- The previous single-card tap target felt soft and low-information; clearer card structure and explicit actions improve readability and speed on mobile.

### Fixed
WHAT:
- Replaced light/white routine-edit card surfaces with dark theme surface tokens so the expanded “Routine details” section and day cards stay on-brand instead of flashing white/grey on mobile.
WHY:
- Hardcoded white/opacity utility classes created washed-out panels against the graphite theme, hurting readability and visual consistency.

### Changed
WHAT:
- Removed the "+ Add custom exercise" card from the main Edit Routine screen (`/routines/[id]/edit`).
WHY:
- This streamlines the primary routine-editing flow and removes a control that should not appear on that specific screen.

### Fixed
WHAT:
- Reduced perceived lag when switching between bottom home tabs by proactively prefetching the other tab routes from the nav component and adding a shared app-level loading state during route transitions.
WHY:
- Tab switches were waiting on server-rendered route payloads, which made navigation feel sluggish; prefetch + immediate loading feedback keeps the interaction feeling responsive.

### Fixed
WHAT:
- Refined the routine-card Delete control again by fully resetting native button appearance and removing the custom focus ring styling so the action behaves like a clean inline text link across browsers.
WHY:
- A follow-up review found the prior styling could still present a visible box-like highlight state after interaction in some environments, so this pass removes that artifact path while keeping the action readable.

WHAT:
- Standardized the routine-card Delete control styling so it renders as intended text action without browser-default button highlight artifacts.
WHY:
- The previous default button rendering could show an inconsistent highlight box around Delete, which looked broken and distracted from the routine card layout.

WHAT:
- Increased contrast for the Today screen primary “Start Workout” CTA text by switching it to white on the accent button for both new-session and resume-session states.
WHY:
- The prior text color could blend into the accent background and make the action label hard to read, reducing usability for a core workflow.

### Changed
WHAT:
- Added docs/PROJECT_GOVERNANCE.md (thin-docs governance)
- Added docs/PLAYBOOK_NOTES.md (project-local inbox for upstream playbook improvements)
- Removed duplicated playbook/doctrine docs from this repo (if present)
WHY:
- Centralize reusable engineering doctrine in one Playbook repo
- Keep project repositories minimal and focused
- Prevent drift across projects
- Ensure learnings are captured without relying on chat output

### Changed
- Added a new `docs/PLAYBOOK/` documentation set (index, principles, decisions, conventions, patterns, checklists, and Codex prompts) that captures the current engineering practices already present in this repo, so future work can move faster with consistent, evidence-based execution.
- Updated the Today primary CTA copy to always read “Start Workout” with explicit high-contrast text on the phthalo accent button, added an in-session Back control, and removed the bottom tab bar from the workout/session screen to keep focus on active logging.
- Reverted the Today main card surface from a light treatment back to dark theme surface tokens and normalized the Today in-progress badge + Resume CTA to the phthalo accent system to restore cohesive visual hierarchy.
- Updated the Today main routine card to the shared dark-surface treatment, replaced warm Resume/In progress accents with phthalo-accent button and status pill styles, and aligned exercise-search controls with the same dark input tokens used elsewhere for a cleaner, consistent mobile hierarchy.
- Normalized routine form Units, Timezone, and Start date control styling (including iOS date input polish) so these fields share the same height, padding, radius, background, border, and focus treatment across create/edit screens, improving mobile readability and preventing one-off style drift.
- Routine editing now starts with collapsed “Routine details” and “Add exercises” sections, and routine editor card-buttons use clearer hover/active/focus cues to make tap targets more discoverable while reducing initial clutter on mobile.
- Standardized Back navigation affordances with a shared Back control and consistent subdued styling, then applied it across routine editing, history editing, and forgot-password navigation touchpoints for predictable behavior.
- Improved bottom navigation dark-mode contrast by raising inactive tab icon/label opacity, restoring an explicit active tab state with phthalo accent emphasis, and keeping the styling minimal.
- Updated accent color to a Phthalo-green-inspired palette across primary actions, focus states, and selected-state treatments while keeping the graphite GitHub-dark base surfaces unchanged.
- Brightened the global dark theme tokens and increased contrast, updated cards/inputs/buttons to use solid surface colors for crisp separation, and improved typography smoothing for clearer text rendering.
- Routine edit day labels now collapse redundant names (like "Day 1") so cards and day-editor headers show clean titles such as "Day X" unless a meaningful custom name exists.
- In-progress session exercise cards now show a compact logged-set count badge, the add-exercise trigger now uses card-like styling, and Save Session now appears as a single clean button with mobile-friendly full-width behavior.
- History cards now navigate directly when tapped, and the front-list Open/Delete controls were removed so detail management stays inside the session detail flow.
- Added a Deftones Fog Terminal animated app background with graphite atmosphere, slow vertical flow, sigil texture, scanlines, and grain so the interface keeps a moody visual identity without changing workout workflows.
- Routine editing now uses dedicated day cards on `/routines/[id]/edit` that open a focused `/routines/[id]/edit/day/[dayId]` editor with Back + Save flow, while day exercise management and custom-exercise redirects stay route-aware for both edit screens.
- Session logging now uses a single-focus exercise mode on `/session/[id]`: lifters pick one exercise to expand, close back to the exercise list, and non-focused logger cards stay mounted so in-progress timer/input state is preserved.
- Exercise loading now always queries the database global catalog with a server anon client, only falls back to baseline when Postgres reports `42P01` (undefined table), logs loader branch/error details, and uses a bumped global cache key to flush stale baseline responses.
- Exercise picker data now treats exercise IDs strictly as strings, keeps UUID-based IDs in the merged catalog, and returns exercise options sorted by name for consistent selection ordering.
- Exercises now guarantee UUID `id` generation at the database layer, backfill missing `id` values for existing rows, enforce non-null primary-key constraints, and keep exercise reference foreign keys anchored to `exercises(id)` with restrictive deletes.
- Global exercise seed inserts now rely on auto-generated IDs (no explicit `id` values), preventing future null/invalid IDs during catalog seeding.
- Added a follow-up hardening migration that backfills any remaining null `exercises.id` values before enforcing defaults/constraints, preserves existing primary-key setups safely, and ensures global seed conflict handling targets the global-name uniqueness rule.
- Auth confirmation now treats successful non-recovery link verification as success even when no session is returned, and routes users to login with a verified message instead of a failure state.
- Password recovery confirmation still requires a recovery session before routing to reset-password, preventing dead-end reset links.
- Forgot-password now starts the one-minute client cooldown only after successful reset requests, while rate-limit and send-failure messages no longer imply that an email was sent.
- Routine day exercise defaults now support optional preset weight and preset duration values, and the live Session view now shows compact per-exercise Goal lines sourced from routine template defaults (sets/reps/weight/time).
- Forgot-password now enforces a one-minute client cooldown after successful reset requests, keeps the timer active across refresh, and uses clearer delivery/rate-limit guidance while preserving enumeration-safe messaging.

### Why
- Improve CTA readability/clarity on mobile while reducing active-workout UI clutter, so lifters can focus on logging with a clear path back to Today when needed.
- Restore visual consistency on Today by returning the main card and key status/action affordances to the dark graphite + phthalo palette instead of bright/light surfaces.
- Reduces palette drift on the most-used Today flow, improving visual consistency and readability by keeping actions/status cues inside the app's graphite + phthalo system.
- Mobile tab labels were too faint in dark mode, so higher-contrast inactive states and a clearer active accent improve readability/usability without brightening the overall GitHub-dark theme.
- Aligns the brand aesthetic with a deeper, mineral green accent while preserving the clean GitHub-dark visual system and restrained interaction styling.
- Improves readability and a crisp dark-mode feel while reducing muddy blending caused by semi-transparent surface treatments.
- Removes repeated wording and noisy labels so routine planning screens are faster to scan on mobile.
- Makes active session controls clearer and more consistent with surrounding cards while preserving the same logging behavior.
- Simplifies history browsing with larger tap targets and keeps destructive actions inside the detailed context where users expect them.
- Reinforces the product's focused aesthetic and atmosphere while keeping interactions unchanged, helping the app feel more distinctive without adding feature complexity.
- A two-screen routine edit flow removes dropdown-heavy day editing, reduces mobile scrolling friction, and keeps navigation/redirect behavior predictable when managing custom exercises.
- Single-focus session logging makes the workout screen easier to scan and act on without resetting active set-logging state, preserving fast deterministic logging UX.
- Prevent production from silently serving the old baseline catalog when the exercises table is healthy but a different query/configuration error occurs, and make loader behavior obvious in logs for fast diagnosis.
- Prevent UUID exercises from being filtered out when loading picker options, so seeded/custom UUID entries remain visible and selectable across routines and sessions.
- The app depends on valid UUID exercise IDs for picker selection and session/routine joins, so enforcing/backfilling IDs prevents seeded exercises from disappearing or becoming unselectable.
- Seed data must let Postgres generate IDs consistently to avoid reintroducing null IDs and breaking downstream exercise references.
- Production safety requires phased constraint enforcement and explicit conflict targets so schema hardening can ship without destructive PK/FK churn.
- Prevent false “verification failed” outcomes after valid email confirmation links, and keep account verification trustable when providers do not return a session for non-recovery flows.
- Keep password recovery deterministic by only entering reset-password when a valid recovery session exists.
- Prevent misleading “we sent it” feedback and avoid locking retry attempts after failed reset requests, while maintaining enumeration-safe behavior.
- Lifters need visible per-exercise targets while logging so they can execute faster in-session, and the target display pipeline now supports future progression-engine overrides without changing session UI structure.
- Reduce accidental reset-email spam and Supabase rate-limit hits during real use/testing while giving customers calmer expectations they can act on.

### Fixed
- Forgot-password now reports real delivery outcomes instead of always showing a sent state, with user-safe errors for retry guidance when requests are rate-limited or temporarily unavailable.
- Password reset and auth email redirects now prefer a canonical app URL environment origin in production, with header-derived origin fallback for local development.
- Exercise loading no longer uses request-scoped auth context inside cached reads, while global catalog data remains cached and user-specific exercises stay request-scoped for stability.
- Auth now uses dedicated login/signup/forgot/reset routes with reliable confirm + recovery handling so email confirmation and password reset links complete without redirect loops or silent failures.
- Middleware now treats auth confirmation routes as public so email verification links can complete without redirect loops.
- Middleware now keeps /reset-password and auth confirmation routes public, and auth confirmation now handles both OTP token-hash and code exchange links so recovery sessions are established before redirecting to set-password.
- Reset-password now validates recovery session presence before rendering, supports confirm-password input, and returns clear expired-link/retry messaging when update attempts fail.

### Why
- Prevent misleading reset-email success messaging when provider requests fail, reduce repeated support confusion, and keep production reset links aligned with allowlisted domains.
- Prevent runtime crashes tied to request-only cookie access during cached execution, keep deploy behavior predictable across schema rollout timing, and avoid broken account confirmation flows.
- Restore dependable account access flows by ensuring confirmation/recovery links stay public, reset links land on set-password correctly, and updated credentials persist for immediate sign-in.
- Fix production password recovery reliability so reset emails consistently land on a working set-password flow instead of falling back to login, while giving users clear guidance when links are expired or invalid.

### Added
- Exercise picker now supports per-user custom exercises (add, rename, and safe delete) so lifters can track movements not included in the default catalog without breaking routine/session history.
- Global exercise library was expanded with broad coverage across muscle groups, equipment types, and common variations to reduce setup friction and speed routine/session building.

### Changed
- Exercise selection now shows global and personal options together with search-first picking, so users can find movements faster while keeping a controlled UUID-backed exercise list.

### Added
- Sessions now track an explicit lifecycle (`in_progress` vs `completed`) so lifters can safely leave mid-workout and resume the same session later without losing confidence in saved progress.

### Changed
- Today now surfaces clear Resume vs Start behavior, shows an in-progress indicator, and marks rest days with unmistakable REST DAY messaging plus an optional-start label to remove ambiguity before training.
- Session logging now feels immediate with fast local set feedback and automatic next-set prefill so repeated set entry stays frictionless on mobile.
- Session screen now keeps a prominent sticky Save Session action and completing a session moves it into done state with final time, while History lists completed sessions only for cleaner records.

### Added
- History now supports inline edit and delete flows so lifters can correct or remove past logs without leaving the app.
- Routine templates now support lbs/kg units and rep-range targets (min/max reps) for faster plan customization across equipment preferences.
- Session logging now includes optional session/set timers plus tap-per-rep counting, so lifters can track pacing data quickly without mandatory extra input or per-rep event storage.
- Session history now records a session name and routine day snapshot so past workouts keep human-readable context even if routine templates change.
- Session logging now supports optional per-set time (seconds) and exercise-level skip state for faster real-world tracking flexibility.
- Routine template system with configurable cycle length, per-user timezone support, active routine selection, and routine/day exercise management so users can run repeatable plans without manual daily setup.
- Project documentation (PROJECT.md, AGENT.md, ENGINE.md).
- Initial vertical slice (auth, sessions, sets, history).

### Changed
- Routine save now returns users directly to the routines list, and routine day sections are collapsible to reduce scrolling during edits.
- Today and Session headers now use the "Routine Title: Current Day Title" format, and Today shows a completed-session count for the current date.
- Session timer controls now use a single Start/Pause toggle and sessions are completed with one Save Session action that returns to Today.
- Bottom navigation now hides the current tab to keep the mobile menu focused on available destinations.
- Routine cards now include delete actions and clearer Active vs Set Active styling for quicker state recognition.
- Routine setup/edit now uses preset IANA timezone dropdown choices to reduce input errors while preserving timezone-aware scheduling.
- Routine templates now use target sets + target reps instead of rep ranges to match the app's deterministic workout planning style.
- Today now resolves the correct routine day from timezone-aware date math and routine start date so training day selection stays deterministic across locales.
- Start Session now seeds today's template exercises immediately and session logging supports add/remove exercise during a live workout.
- History now shows session name, routine day snapshot, and performed timestamp for quicker scan of past training days.

### Fixed
- Exercise loading now avoids request-cookie access inside cached reads and keeps custom exercises request-scoped, preventing session/routine page crashes after recent merges while preserving fast global exercise loading.
- Auth confirmation links are now allowed through middleware, so email verification can complete and redirect users back to login instead of being blocked as unauthenticated traffic.
- History deletions now remove child session exercises and sets reliably through cascade-safe constraints and guarded delete actions.
- Routine cards no longer show the extra start-date/timezone subtitle line, reducing visual noise on the routines list.
- Routine-day exercise editing now uses a controlled UUID exercise picker and inserts `routine_day_exercises` with authenticated `user_id` + selected `routine_day_id`, so adding exercises saves reliably instead of failing on invalid free-text IDs.
- Today + Start Session now derive routine context from `profiles.active_routine_id` on the server, recompute the current day index, and persist `sessions.routine_id` + `sessions.routine_day_index` before seeding `session_exercises`, so session rows keep routine linkage and template exercises are consistently preloaded.
- Routine edit and Today now surface server action error messages inline, so users can see the real failure reason and recover quickly.
- Routine activation now uses `profiles.active_routine_id` as the only source of truth so Today and Routines stay in sync immediately after switching active routine.
- Protected page loads now ensure a profile exists (timezone + active routine pointer) so routine logic always has required user settings data.
- Today routine-day resolution now consistently uses the profile timezone and safe modulo day math (including future start dates) so the selected template day is deterministic.
- Routine cycle-length edits now safely resize day rows (add missing days, remove overflow days, preserve kept days) so template history remains stable while plans evolve.
- Email verification links now redirect to login with verified state and prefilled email instead of landing on an error page.
- Server/client boundary violations causing runtime crash.
- Middleware matcher exclusions.
- Environment variable handling.

### Fixed
- Exercise loading now falls back to the baseline global catalog when the new exercises table is not yet available, so the app no longer hard-crashes after deploys where schema rollout lags behind code rollout.
- Routine deletion now safely clears active-routine pointers and detaches historical sessions before removing the routine, preventing delete-time crashes and stale active state when removing cards at the top of the list.
- Today now labels completed counts with explicit scope (this routine, today) and uses routine-timezone day windows, reducing confusion around what the number means.
- Routine editing now supports rep targets with min-only, max-only, both, or neither, so lifters can save single-value rep intent without forced paired inputs.
- Session timer duration now persists during in-progress workouts (including pause/reset and final save), so resumed sessions keep accurate accumulated time.
- Rest-day UI now avoids redundant harsh accents on Today and hides routine exercise editing while rest mode is enabled, improving clarity without changing saved exercise data.

### Changed
- Routine and session copy now consistently uses “routine” wording instead of “template” in user-facing UI to match the product language and avoid mental model mismatch.
- Create/Edit routine screens now include explicit in-app Back actions with discard confirmation, giving users a clear exit path without accidental save behavior.

### Notes
- Manual test checklist: login → routines (create/select active) → today (verify day name/exercises) → Start Session (verify seeded exercise order) → edit routine cycle length up/down → switch active routine and confirm Today updates immediately.

### Changed
- Main tab navigation now lives in the top header area with the active page title inside the nav, replacing standalone page titles so tab screens feel more consistent and space-efficient on mobile.
- Today now shows a lighter workout preview (exercise names only), removes in-progress/completed-count helper copy, switches CTA text to Start vs Resume based on recoverable session state, and surfaces a clear Completed pill on the workout row after a saved workout.
- History cards now use a single consolidated label format (`{Routine Name} Log #{N}: {Day Name}`), remove redundant routine/day text from the card body, show concise date+time formatting (no seconds), and drop the Manage action in favor of the existing dedicated edit flow.
- Routines list cards now follow the same visual treatment pattern as history log cards for stronger cross-screen UI consistency.

### Why
- These updates reduce visual noise, improve scanability, and make workout state (start/resume/completed) easier to understand at a glance while keeping core logging flows intact.
- Consolidating top-level navigation and harmonizing card styling improves app-wide consistency and reduces context switching between main tabs.

### Changed
WHAT:
- Updated governance and architecture contracts to require explicit pre-change Playbook compliance review, enforce strict server-action and boundary guardrails, and codify checklist/quality-gate expectations in local docs.
WHY:
- This reduces process drift, keeps architectural boundaries explicit, and makes repo-level execution standards consistent with the Playbook contract.

### Changed
WHAT:
- Refactored `src/app/session/[id]/page.tsx` so route-owned server actions and session data-query assembly now live in adjacent `actions.ts` and `queries.ts` files, leaving the page focused on composition and rendering.
WHY:
- This reduces controller/query sprawl in the route page while preserving existing behavior and keeping server/client boundaries explicit with route-local ownership.

### Changed
WHAT:
- Standardized session feature server-action outcomes to a single `ActionResult<T>` contract (`{ ok: true, data?: T } | { ok: false, error: string }`) and aligned session clients/offline sync adapters to consume the new shape.
- Kept redirects scoped to navigation-only outcomes in the session flow; in-place mutations now return explicit error results instead of redirect-based error transport.
WHY:
- This creates a deterministic, consistent action contract for incremental rollout, reduces mixed result semantics, and keeps server/client interaction boundaries clearer without adding new structural layers.

### Changed
WHAT:
- Centralized repeated cache invalidation path usage behind shared revalidation helpers for session, history, and routines views, and updated route/server actions to call those helpers while preserving existing invalidation scope.
WHY:
- This reduces duplicated path literals and keeps invalidation behavior easier to audit and maintain without changing user-visible cache refresh behavior.

### Changed
WHAT:
- Added a compact “Change day” button under Today’s Start Workout action and upgraded routine day exercise cards to expandable, inline-editable cards in the Edit Day flow.
- Fixed session interaction continuity bugs: timer restore no longer double-counts after leaving/resuming, exercise-back navigation now closes the focused exercise first, exercise timer resets when backing out of a focused exercise, and local logged-set counters stay in sync when resuming a session.
WHY:
- These updates make day selection and day-exercise editing faster on mobile, while restoring deterministic session behavior so timers/navigation/set counts match user expectations during resume/back workflows.

### Changed
WHAT:
- Updated Today’s day-picker interaction to use a dedicated CHANGE DAY button that opens a centered single-select overlay with OK/Cancel confirmation, and aligned the button placement with the secondary session action slot under Start Workout.
WHY:
- This keeps Today’s action area visually stable between in-progress and not-started states while making day selection explicit, reversible, and more consistent with the app’s existing mobile interaction patterns.

### Changed
WHAT:
- Reworked routines card action layout so reorder arrows now live in the same right-side action cluster as the Active/Inactive control, with slightly tighter card spacing and square-corner arrow buttons.
WHY:
- This improves action grouping/scannability on routine cards while preserving existing behavior, accessibility affordances, and tap-target clarity.

### Fixed
WHAT:
- Updated session back behavior so a single back action now both closes an open exercise focus panel (including reset cleanup) and proceeds with navigation.
- Removed the intermediate history state insertion that previously required an extra back press when an exercise panel was open.
WHY:
- Back navigation should be deterministic and never trap users on the session screen behind a second press.
- Preserving panel cleanup while allowing immediate navigation maintains existing safety/reset behavior without degrading browser back expectations.

### Fixed
WHAT:
- Stabilized the Today “Start Workout” CTA styling so its green treatment remains consistent across interaction states.
- Updated Today’s day selection flow so choosing a day immediately updates the workout header and exercise preview to that selected day instead of showing only helper text.
WHY:
- This removes visual inconsistency on the primary CTA and makes Change Day behavior reflect the user’s selected workout context before starting a session.

### Fixed
WHAT:
- Expanded the Today “Change Day” chooser overlay sizing/scroll behavior so all day options remain visible on smaller/rest-day card contexts, and widened the routines “Create Routine” CTA to fill its list row.
- Hardened the Today “Start Workout” button text color across interaction states so the CTA color treatment does not degrade to grey after taps.
WHY:
- These updates keep primary workout actions legible and reachable on small/mobile layouts, while preserving consistent visual affordance for the main start action.

### Fixed
WHAT:
- Adjusted the Today selected-day preview layout so long day content uses a bounded, scrollable exercise list and keeps the CHANGE DAY control visible when the start-session card has less vertical space.
WHY:
- This prevents day-selection controls from being visually clipped on smaller mobile card layouts while preserving the existing Today workflow.

### Changed
WHAT:
- Standardized primary action buttons across Today, Session, Routines, and History using shared button tokens and reusable app button primitives, including label normalization for End Workout and CHANGE DAY.
- Standardized top-right back controls behind one shared back-button component and replaced inconsistent per-screen variants.
- Updated CHANGE DAY to open a compact overlay with multi-select day options and explicit OK/Cancel controls while preserving existing day-switch workout behavior.
WHY:
- This keeps critical actions visually consistent and predictable across mobile flows, reduces style drift for future screens, and preserves existing navigation/data boundaries with a minimal UI-focused diff.

### Fixed
WHAT:
- Removed the Today day-picker OK confirmation step so selecting a day now applies immediately and closes the chooser.
WHY:
- This restores the expected one-tap day-switch workflow and prevents regressions where users had to confirm selection with an extra action.

### Changed
WHAT:
- Refined the Add Exercise list rows to a denser, flatter list style and replaced the boxed Info action with a compact info icon button.
WHY:
- Reduces visual clunk and excess negative space so exercises are faster to scan and interact with on mobile during workouts.

### Changed
WHAT:
- Simplified routine timezone selection in create/edit forms to a short, familiar set (Pacific, Mountain, Central, Eastern, UTC) while still accepting previously saved timezone values.
- Added clearer helper copy for cycle length and start date so users understand that cycle days include rest days and that start date anchors Day 1.
- Strengthened mobile input-focus behavior by enforcing non-scalable viewport defaults and resetting viewport constraints after form-field blur events.
WHY:
- This reduces setup friction in routine creation/editing, aligns timezone defaults with device-local context, and minimizes disruptive mobile zoom jumps when interacting with form inputs.

### Changed
WHAT:
- Added a new exercises metadata migration that backfills missing placeholder image paths, sets image placeholder defaults for future rows, and enforces global-only completeness constraints (how-to text, movement pattern, primary muscles, and image paths), plus a normalized unique index for global exercise names.
WHY:
- Ensures global exercise records are consistently complete and prevents duplicate global naming while keeping custom exercises flexible.

### Fixed
WHAT:
- Updated the exercises metadata constraints migration to backfill missing required global metadata fields before adding global-only check constraints.
WHY:
- Prevents migration failure on existing global exercise rows that were missing required values while still enforcing completeness rules going forward.

### Fixed
WHAT:
- Adjusted the global exercise metadata backfill fallback for `movement_pattern` to use an allowed canonical value before constraints are applied.
WHY:
- Prevents migration failures from violating the existing `exercises_movement_pattern_check` while preserving global metadata completeness enforcement.

### Changed
WHAT:
- Organized Add Exercise tag filters into labeled category rows (Muscle, Movement, Equipment, and Other) while preserving the existing multi-select filter behavior.
WHY:
- This makes long filter lists easier to scan on mobile and reduces search friction when users are narrowing exercise results.

### Changed
WHAT:
- Updated routine day exercise planning so Sets (or Intervals for Cardio-tagged exercises) is the only required field, and added a “+ Add Measurement” workflow to optionally attach reps, weight, time, distance, and calorie targets.
- Updated routine-day save/update server actions to derive and persist `measurement_type` from selected primary metrics (`time`, `distance`, `time_distance`, fallback `reps`), persist distance `default_unit` only when distance is selected, and clear removed target fields safely.
- Updated goal text formatting to return `Goal: Open` for sets-only workouts and to render targets in deterministic metric order with backward-compatible fallback when `measurement_type` is missing.
WHY:
- This makes routine programming flexible for open workouts and mixed target styles while preserving deterministic target semantics at the routine-day exercise row level without changing session logging behavior in this step.

### Changed
WHAT:
- Moved the exercise icon PNG set into `public/exercises/icons/` and normalized filenames to kebab-case slugs for deterministic static URL lookup.
- Added shared exercise image helpers to resolve icon/how-to image URLs from DB path overrides when present, then slug/name-derived icon paths, with graceful placeholder fallback.
- Updated the exercise picker list and exercise info how-to visual to use derived static icon paths and a safe placeholder instead of broken images.
WHY:
- This gives the app consistent exercise visuals without manual one-off icon mapping and keeps asset resolution deterministic using static `/public` paths.

### Changed
WHAT:
- Added an icon sync workflow and npm commands to import and normalize new PNG exercise icons from `exerciseIcons/` into `/public/exercises/icons/` using deterministic kebab-case filenames.
WHY:
- Eliminates manual icon moving/renaming, preserves the static `/exercises/icons/<slug>.png` asset contract, and speeds up adding new exercise icons.

### Fixed
WHAT:
- Updated the Exercise info “How-to” visual to derive from each exercise’s icon slug/path contract instead of binding directly to the how-to placeholder asset field.
WHY:
- This allows exercises that already have icons to populate the How-to image slot automatically while preserving placeholder fallback for exercises without icons.

### Fixed
WHAT:
- Updated the ExercisePicker Info modal so its How-to image always uses the same deterministic per-exercise icon source shown in the list thumbnail, and refreshes per selected exercise.
WHY:
- Prevents stale/sticky image rendering where the modal could incorrectly show the same How-to image across different exercise selections.

### Fixed
WHAT:
- Unified exercise icon URL resolution to the canonical `/exercises/icons/<slug>.png` path and updated icon rendering to use the shared resolver with consistent fallback behavior.
WHY:
- A path contract mismatch was causing widespread icon 404s and unnecessary placeholder rendering; standardizing resolver behavior prevents broken images and reduces regression risk.

### Fixed
WHAT:
- Added a deterministic slug-to-icon override map for known filename mismatches and updated shared icon resolution to apply DB path overrides first, mapped filenames second, then canonical slug/name fallback paths.
- Expanded image error-state reset behavior to also react when fallback sources change.
WHY:
- This prevents widespread icon 404s when exercise slugs and PNG filenames diverge while keeping the canonical `/exercises/icons/<slug>.png` contract and stable fallback behavior.

### Changed
WHAT:
- Polished the SetLoggerCard logging surface with a flatter single-card layout, tighter input alignment for reps/weight/unit/RPE/warm-up, and a clearer primary Save set call-to-action.
- Reduced nested boxed styling in the logger area and fixed the RPE tooltip/layout spacing so closed tooltip state no longer leaves awkward empty space.
WHY:
- Improves perceived quality and input speed during active workouts while reducing visual noise and preserving existing set-logging behavior.

### Changed
WHAT:
- Polished Today and Resume Workout surfaces to reduce nested framing, clarify button hierarchy (primary Start/Resume with secondary Change/End), and simplify planned exercise row styling.
- Updated Current Session flow so session time is a lightweight text row, exercise list rows are fully tappable with subtle chevrons, and focused exercise close affordance uses a lighter icon-style back control.
- Refined Set logging UI hierarchy by keeping Save set as the dominant green action, lightening Modify metrics and logged-set row controls, and reducing extra visual borders.
WHY:
- Reduces visual clutter, improves scanability and navigation clarity, and emphasizes the most important actions during active workout logging.

### Changed
WHAT:
- Normalized the Routines flow UI (Routines list, New Routine, Edit Routine, Edit Day, and exercise picker/info surfaces) to use consistent dark-theme-safe cards, spacing, and button hierarchy with clearer primary/secondary/destructive actions.
- Added explicit chevron affordances for routine/day editing disclosure controls (routine details, custom exercise, measurement, add exercises, and exercise filters) and tightened day-card/readability polish for edit and copy/paste interactions.
- Updated Exercise Info overlay behavior so the How-to image appears only when a real exercise icon source exists, and otherwise omits the image frame.
WHY:
- Improves visual cohesion and scanability across routine management, removes harsh light-state styling in a dark UI, and makes expandable areas more obvious and predictable.
- Prevents confusing empty/missing-image presentation in Exercise Info while keeping the experience robust when icon assets are unavailable.

### Changed
WHAT:
- Updated Current Session logging polish so "Modify measurements" in set logging starts collapsed per exercise and now uses a clear rotating chevron disclosure affordance.
- Replaced light/slate-focused exercise header surfaces and text accents with consistent dark glass-safe styling in the Today + Current Session focus flow.
- Tuned destructive End Workout interaction styling to remove light flash behavior and keep pressed/focus feedback intentionally dark/red.
- Normalized the embedded Add exercises panel styling in Current Session (layout framing, borders, spacing, collapsible measurement header affordances, and section consistency).
WHY:
- This improves visual cohesion and tap clarity across workout flows, removes harsh light-state regressions in the dark theme, and makes collapsible controls more predictable and readable on mobile.

### Changed
WHAT:
- Polished Today, Current Session, Edit Routine, and Routines home UI surfaces to remove harsh light fills, normalize accordion/dropdown affordances with chevrons, and align destructive/button interaction styling with the dark theme system.
- Updated exercise-adding flows so "Add custom exercise" now lives as a collapsed sub-section inside "Add exercises" in both Session and Routine Day editor screens.
- Refined current-session focus/list and routines front-page card layouts for clearer hierarchy, cleaner spacing, and more consistent action controls.
WHY:
- Improves readability and interaction consistency on mobile, removes distracting bright pressed states, and keeps related workflows grouped where users expect them.

### Changed
WHAT:
- Adjusted Today screen action hierarchy so Start Workout remains the dominant primary CTA while Change Workout uses a lighter secondary treatment with tighter vertical spacing.
- Refined Settings sign-out presentation by placing it in a subtle Danger zone section and switching the button to a lower-emphasis destructive outline style.
WHY:
- Improves visual hierarchy and aligns Today + Settings with the cleaner glass UI language while reducing visual noise without changing behavior.

### Fixed
WHAT:
- Corrected Add Exercise measurement stats wiring so Last/PR always resolves against the selected exercise’s canonical `exercises.id` and reliably appears when an `exercise_stats` row exists.
- Added development-only diagnostics in the Measurements panel to show selected canonical ID, query ID, and matched stats row ID during selection.
- Updated stats reads to bypass stale caching for this path.
WHY:
- The stats UI could miss existing rows when identifier wiring or stale reads diverged from canonical exercise IDs; this restores deterministic stats visibility and debugging confidence.

### Fixed
WHAT:
- Updated the Edit Day exercise row actions so delete confirmation is no longer rendered inside the exercise update form.
WHY:
- Prevents unintended nested form submission when deleting an exercise, eliminating the React "unexpectedly submitted" runtime error in Edit Day.

### Fixed
WHAT:
- Standardized `session_exercises` goal persistence and reads on the range contract (`*_min` / `*_max`) and removed legacy single-value target column usage from active session query paths.
- Added a safe additive database migration for missing `session_exercises` range-goal columns (reps, weight, time seconds, distance, calories) with non-negative and NULL-safe min/max checks.
- Kept Exercise Info Last/PR rendering bound to canonical exercise ID lookups with guard-based display for available stats.
WHY:
- Prevents recurring runtime/schema-cache failures caused by selecting or writing mismatched legacy goal columns and keeps session goal behavior deterministic across schema evolution.

### Fixed
WHAT:
- Added additive `session_exercises` set-range schema support with `target_sets_min` / `target_sets_max` and NULL-safe non-negative/range checks.
- Updated current-session goal parsing, persistence, projections, and normalization paths to use set-range fields and stop referencing legacy `session_exercises.target_sets`.
- Refreshed app-level DB typing for `session_exercises` goal fields to reflect set-range columns.
WHY:
- Prevents Add Exercise schema-cache failures caused by selecting/writing a non-existent legacy set target column and keeps session goal behavior consistent with the range-target model.

### Fixed
WHAT:
- Corrected Current Session goal resolution so session-level `session_exercises` range goals are used as source of truth, with routine-template fallback only when all session goal ranges are empty.
- Updated Goal rendering to show full range-aware output for sets, reps, and weight (including unit) when present, while still handling partial goals cleanly.
WHY:
- Prevents recently-added exercises from showing incomplete Goal text (for example only sets) after the range-column migration, and keeps displayed goals consistent with persisted session values.

### Fixed
WHAT:
- Fixed History → Exercises Browser to load the same canonical exercise catalog used by Add Exercise so the browser shows the full exercise list instead of a reduced subset.
- Fixed History → Exercises row navigation to open the existing Exercise Info screen without routing to a 404 path.
WHY:
- Users need complete catalog coverage when browsing history and consistent Exercise Info navigation behavior from exercise stats browsing.

### Improved
WHAT:
- Smoothed History → Exercises browsing by tightening the list scrolling behavior and reducing per-row rendering overhead during scroll.
- Added the same tag-based Filter control used in Add Exercise directly beneath Search in History → Exercises.
WHY:
- Makes long history exercise lists easier to scan on mobile/desktop without sticky-feeling scroll, and keeps filtering UX consistent across exercise browsing surfaces.

### Changed
WHAT:
- Added a sticky bottom action bar on Today so Start/Resume Workout and Change/Discard Workout stay reachable while scrolling long exercise lists.
- Updated Today exercise goal subtext to render as `X sets • A–B` when reps exist, and only `X sets` when reps are not provided.
WHY:
- Keeps primary workout actions consistently accessible during long sessions and removes placeholder-style goal noise for a cleaner, mission-ready Today experience.

### Changed
WHAT:
- Standardized app Back controls to one shared Back button primitive so screen-level Back actions now inherit the same iconography and styling baseline.
- Updated history/log, exercise info, and session focus Back interactions to use the shared Back primitive while preserving each screen’s own destination or close behavior.
WHY:
- Creates a single visual/source-of-truth for Back behavior, reducing UI drift and making future Back-button updates faster and safer.

### Changed
WHAT:
- Refreshed the Routines main screen UI by replacing the inline routine dropdown with a bottom-sheet routine switcher, adding a compact in-card Edit action, and restructuring routine-day rows into aligned columns with clearer visual hierarchy.
- Updated the routine summary card styling to reduce heavy borders and use subtler separators and emphasis states, including softer Rest/TODAY differentiation.
WHY:
- Improves mobile usability and visual clarity by matching the newer app UI language while keeping routine switching and editing fast, predictable, and less visually noisy.

### Fixed
WHAT:
- Reused the canonical routine-day mapping from Today on the Routines screen so the current cycle day resolves consistently (including Sunday mapping to Day 7 when applicable).
- Highlighted the matching current day row directly in the routine day list and removed the incorrect footer-style "Today: Day X" display.
- Softened routine card border and internal divider opacity for a less wireframe-like presentation.
WHY:
- Prevents contradictory day-index information between Today and Routines while improving at-a-glance scanability of the active routine.

### Changed
WHAT:
- Polished History Sessions list metadata hierarchy so log cards now emphasize title/day while keeping duration/date and optional time-range details consistently muted.
- Updated History Sessions layout to use a full-height flex scroll region with safe-area-aware bottom padding and a bottom fade affordance that appears only when more rows remain.
- Added a History Sessions view-mode toggle with a denser Compact mode alongside the primary List mode.
WHY:
- Improves scanability and visual consistency of session metadata, fixes bottom-of-screen scroll landing on mobile viewports, and gives power users a faster high-density history browsing option.

### Fixed
WHAT:
- Fixed the History Sessions list scroll regression by restoring a proper full-height flex chain to the sessions scroll region and keeping the bottom fade overlay non-interactive.
WHY:
- Prevents blocked scrolling after the recent History layout and fade-overlay refinements, especially on iOS Safari/PWA.

### Fixed
WHAT:
- Corrected History screen layout so the Sessions log area uses a bounded flex-height scroll region again and no longer loses vertical scrolling.
- Unified the segmented control styling for History section tabs and the Sessions List/Compact toggle to remove clipping/misalignment artifacts.
WHY:
- Restores reliable log browsing on mobile/desktop and makes tab/toggle controls visually consistent and readable.

### Fixed
WHAT:
- Restored reliable scrolling in History → Sessions for both List and Compact views.
- Made History log detail Back navigation deterministic so it always returns to History → Sessions and keeps the selected view mode.
WHY:
- Prevents blocked session-list browsing on mobile/desktop and removes inconsistent Back navigation outcomes from log details.

### Changed
WHAT:
- Normalized repeated routine/day UI patterns across Today, Change Workout picker, Routine day detail, and Routines overview using shared app-local primitives for panels, headers, rows, badges, and sticky action bars.
- Aligned accent text, border treatments, spacing rhythm, and TODAY/completed badge presentation across those surfaces with shared style tokens.
WHY:
- Reduces repeated per-screen markup so future UI tuning compounds through one primitive layer instead of being reimplemented in each routine/day screen.
- Improves cross-screen visual and interaction consistency while keeping existing data, routing, and behavior contracts intact.

### Fixed
WHAT:
- Updated routine day rows on the Routines page so long right-side day titles wrap onto multiple lines while staying right-aligned.
- Preserved consistent spacing between the left "Day X" label and right title content across narrow and wide layouts.
WHY:
- Prevents long day names from colliding with left-side labels and keeps routine rows readable on iPhone-sized screens and desktop.

### Changed
WHAT:
- Normalized History Sessions, History Exercises, and Log Details to the same app-local panel/header/row/badge/sticky-action visual grammar used on Today and Routines.
- Unified History segmented controls (Sessions/Exercises and List/Compact density toggles) so both tabs share the same styling and interaction behavior.
- Kept compact rendering as a density variant of the same row structure rather than a separate card layout.
WHY:
- Reduces cross-screen UI drift and keeps history/log browsing visually and behaviorally consistent with the app’s newer surfaces.
- Improves mobile scrolling/touch reliability by keeping each screen on a single primary scroll region with non-blocking sticky controls.

### Fixed
WHAT:
- Moved the Exercise Info sheet Back control from the left side of the header to the top-right position.
- Updated History Log Details Back actions to use the shared app Back button style used across other screens.
WHY:
- Aligns Back control placement and styling with the app-wide navigation pattern so users get a consistent, predictable Back experience.

### Fixed
WHAT:
- Polished History page spacing and card presentation so Sessions and Exercises align with the same top rhythm and single-card border treatment used across other main tabs.
- Updated History Sessions rows so the full row opens log details, removed the separate View badge/button, and added day context to Compact rows in the title line.
- Scoped the LOG VIEW List/Compact toggle to Sessions only, while keeping Exercises in a consistent list presentation with preserved detail-open behavior.
- Added a non-interactive bottom fade/cap and extra bottom list padding to both Sessions and Exercises history scroll lists.
WHY:
- Resolves visual drift and interaction inconsistency in History, improves scanability in compact mode, and restores a clearer mobile list ending affordance without blocking taps or scroll.

### Fixed
WHAT:
- Updated History Sessions cards so long titles and metadata stay inside card bounds with clean wrapping/clipping on mobile.
- Restored visible primary/secondary text in History Exercises cards while keeping the same card chrome and tap-to-open detail behavior.
WHY:
- Prevents text overflow/bleed regressions in session history and resolves blank-looking exercise cards introduced by recent UI refactors.

### Fixed
WHAT:
- Hardened History → Exercises cards so every row resolves and renders a non-empty exercise name with a safe fallback label.
- Kept Exercises rows on the existing card chrome and tap-to-open detail flow while preserving Sessions behavior unchanged.
WHY:
- Prevents blank-looking exercise cards when upstream row shapes omit expected title fields or provide empty values.

### Fixed
WHAT:
- Fixed History → Exercises cards on iOS/mobile WebKit so card text and icons remain visible while preserving the same full-card tap target behavior.
WHY:
- Prevents rows from appearing blank when browser default button styling overlays the card content.

### Fixed
WHAT:
- Normalized top app navigation to a single safe-area-aware header contract using a shared top inset variable and one global content offset.
- Added visual viewport top inset syncing so iOS Safari and iOS Home Screen mode keep the header clear of notch/status bar regions during viewport changes.
- Tightened nav vertical spacing while preserving consistent 44px tab targets and shared glass header styling.
WHY:
- Prevents top navigation from being obscured by iOS status/notch/Dynamic Island areas and removes duplicate/competing top offsets that made the bar sit too low.

### Fixed
WHAT:
- Standardized main-tab screen spacing under the glass NavBar by introducing one shared top-level tab wrapper used by Today, Routines, History, and Settings.
- Removed History’s page-specific spacing drift so the first History content panel aligns to the same vertical rhythm as the other main tabs.
WHY:
- Keeps tab-to-tab navigation visually consistent and prevents subtle top-gap mismatch beneath the shared NavBar while preserving safe-area behavior.

### Fixed
WHAT:
- Applied the same shared main-tab spacing contract to History → Exercises so it aligns beneath the glass NavBar like History Sessions and the other primary tabs.
WHY:
- Eliminates remaining top-gap inconsistency between History tabs and keeps tab switching visually stable.

### Fixed
WHAT:
- Updated the History → Exercises info-sheet Back button behavior so exiting exercise details no longer navigates away from the Exercises tab.
WHY:
- Keeps users in the same History context when closing exercise info, preventing accidental jumps back to Sessions.

### Fixed
WHAT:
- Expanded History → Exercises row cards to better fill each list slot so the card no longer leaves a visible inset gap around the tap surface.
- Rounded the Today sticky action container that wraps Start Workout and Change Workout so it matches the app’s rounded panel style.
WHY:
- Improves visual consistency and removes the spacing/shape polish issues called out in the main workout flows.

### Fixed
WHAT:
- Restored the in-session expanded exercise close control to a collapse affordance (`^`) instead of a Back label.
- Updated that control so it only collapses the expanded exercise panel and does not navigate out of the active session.
WHY:
- Prevents accidental session exits when users intend to close exercise details and keeps the interaction consistent with in-place expand/collapse behavior.

### Fixed
WHAT:
- Simplified the Current Session header/actions by removing Edit Day access and removing the Custom Exercise management panel from the in-session screen.
- Improved Current Session Quick Add with clearer selected-exercise highlighting, a filter control placed below exercise search, and per-exercise saved set-count values.
- Cleaned the expanded exercise close control so it shows only the intended single collapse arrow affordance.
WHY:
- Reduces in-session clutter and prevents duplicate/ambiguous controls while making Quick Add faster and more predictable during active workouts.

### Fixed
WHAT:
- Made exercises tappable on Today and Routine Day views so tapping opens the Exercise Info sheet.
- Standardized Exercise Info back behavior so sheet contexts close back to the originating screen context.
WHY:
- Improves discoverability of exercise details in daily training and routine planning flows.
- Keeps users in their current context without route resets or unexpected navigation jumps.

### Fixed
WHAT:
- Corrected Exercise Info ID wiring so Today, Routine Day, and related open flows consistently use canonical exercise primary keys instead of secondary identifier fallbacks.
- Hardened `/api/exercise-info/[exerciseId]` to return structured 400/401/404 JSON for invalid IDs, unauthenticated access, and missing exercises.
- Added visible client-side error feedback when Exercise Info fetches fail instead of silently doing nothing.
WHY:
- Prevents Exercise Info from failing to open due to placeholder or mismapped IDs and makes failure modes explicit for users and debugging.

### Fixed
WHAT:
- Made `/api/exercise-info/[exerciseId]` return one stable API envelope shape for both success and failure, with explicit error codes including a server misconfiguration case.
- Added step-level observability (`validate`, `auth`, `payload:base`, `payload:stats`, `payload:images`, `respond`) so server logs identify the exact failing phase for 500s.
- Split Exercise Info payload loading into isolated base/stats/images phases and made stats failures non-fatal so valid exercise info still loads.
- Updated Exercise Info client error parsing/toasts to support both stable and legacy error shapes while surfacing request status + exercise id.
- Tightened the endpoint validation script to assert expected error statuses are non-500.
WHY:
- Restores reliable Exercise Info behavior across all entry points while making production failures diagnosable from logs.
- Prevents optional stats/image resolution issues from taking down the whole endpoint.
- Ensures expected invalid/unauth/not-found cases are handled deterministically without collapsing into generic 500 errors.

### Fixed
WHAT:
- Added a legacy exercise-id alias for Exercise Info so old routine rows using `66666666-6666-6666-6666-666666666666` resolve to the canonical Pull-Up exercise id.
- Updated both Exercise Info client fetches and `/api/exercise-info/[exerciseId]` route validation/loading to use the canonicalized id.
WHY:
- Restores Exercise Info opening from Today when routines still contain legacy Pull-Up ids and prevents invalid-id blocking in those flows.

### Fixed
WHAT:
- History Exercises UI: removed redundant in-content history titles, moved Sessions/Exercises tabs into the shared highlighted header panel, simplified filter header/count display, and refreshed exercise card alignment for icon + stat hierarchy.
WHY:
- Reduces visual clutter, strengthens hierarchy inside the shared header region, and improves readability/scanability of exercise rows without changing behavior.

### Fixed
WHAT:
- Increased the History → Exercises row image area so the card divider sits further left and standardized images display with stronger visual emphasis.
WHY:
- Improves scanability and visual balance for the updated exercise image set while keeping the existing row interactions and content hierarchy intact.

### Changed
WHAT:
- Added project-level `vercel.json` configuration to disable automatic Git-triggered deployments.
WHY:
- Ensures deployments are manually controlled through the Vercel CLI (`vercel` / `vercel --prod`) instead of running on every push.

### Fixed
WHAT:
- Log Details now places Back in the summary panel, removes the separate Log Details header box, and uses a sticky bottom action bar for Edit/Delete and Cancel/Save states.
- Log Details set editing now keeps newly added sets immediately deletable without leaving and re-entering the screen.
- Log Details measurements editor now matches the same measurement input style and unit picker behavior used in Add Exercise and Current Session set logging.
WHY:
- Reduces header clutter, keeps primary actions consistently anchored, and improves scanability of session summary content.
- Fixes a disruptive edit workflow reliability issue when adding then immediately deleting sets.
- Standardizes measurement interactions across workout entry and history editing surfaces for clearer, more predictable behavior.

### Fixed
WHAT:
- Made the Current Session header truly top-anchored with notch-safe spacing so header controls stay flush to the viewport top while respecting iOS safe-area insets.
- Updated Current Session exercise-open mode to hide both top header controls and the routine/day title line for a cleaner focused exercise view.
- Kept the session timer running continuously while toggling between list mode and exercise-open mode.
WHY:
- Removes top-gap drift and sticky inconsistencies on mobile devices with notches/Dynamic Island.
- Reduces visual clutter during active exercise logging while preserving full controls in list mode.
- Prevents perceived timer resets or pauses when UI sections are conditionally hidden.
## 0.3.6 — 2026-03-03

### WHAT
- Tightened `BottomActionBar` internal spacing so sticky action panels use a single compact bottom inset and no extra dead zone under primary buttons.
- Kept History Log Detail and Current Session exercise-detail actions in sticky in-flow BottomActionBar footers within their scroll containers so Edit/Delete and Save Set stay visible while scrolling.

### WHY
- Removes excess empty space in the shared action panel and makes CTA placement feel tighter and more predictable on mobile.
- Ensures critical actions remain reachable on long, scrollable detail screens without overlay-style content blocking.
## 0.3.11 — 2026-03-03

### WHAT
- Normalized `BottomActionBar` fixed behavior so fixed variants render through a shared viewport-level portal root instead of inheriting nested scroll container behavior.
- Updated the fixed-bottom reserve contract to use a measured CSS variable fallback (`--app-bottom-action-bar-height`, defaulting to 120px) for scroll-owner padding.
- Kept Routine Day, History Log Details, and Current Session reserve ownership on their single `ScrollContainer` scroll roots.

### WHY
- Prevents recurring iOS overlap bugs where fixed bars rendered inside overflow scrollers clip/anchor inconsistently and hide final rows.
- Keeps bottom reserve spacing resilient if fixed action bar height changes over time without requiring per-screen padding rewrites.
- Reinforces one normalized, future-proof fixed-bottom-bar contract across affected routes.

### Fixed
WHAT:
- Hardened the shared fixed bottom action bar contract used by Routine Day, Log Details, and Current Session so viewport-fixed actions remain reliable on iOS across browser/runtime variations.
WHY:
- Prevents regressions where bottom CTAs can overlap final scroll content when platform APIs behave differently, while preserving the single scroll-owner reserve model.

### Fixed
WHAT:
- Standardized Exercise Info opening contracts to use canonical `exerciseId` values tied to `exercises.id` across History Exercises list interactions.
- Updated legacy Pull-Up id alias resolution so non-canonical ids map to the canonical database exercise id before Exercise Info and stats lookups.
- Hardened Exercise Info stats lookup to flag non-canonical `exerciseId` inputs with structured diagnostics in development.
WHY:
- Prevents Exercise Info from querying stats with stale/non-canonical ids and restores reliable stat rendering for canonical exercises.
- Reduces id-shape ambiguity at UI boundaries so Exercise Info consistently targets real exercise rows.

### Fixed
WHAT:
- Normalized Session and History detail bottom actions to a screen-owned sticky pattern aligned with Today: Session Save Set and History Edit/Delete (plus Cancel/Save while editing) now render from screen-level sticky bottom action slots.
- Removed feature-level fixed bottom action bar mounting from Session logger and History log audit components.
WHY:
- Eliminates fixed-overlay overlap issues at the bottom of long scrollable screens on iOS/mobile by making bottom actions layout-aware.
- Keeps bottom action behavior consistent across key app surfaces and easier to maintain under the single-scroll-owner contract.

### Changed
WHAT:
- Introduced a reusable, screen-owned sticky bottom-actions pattern using a shared provider/slot + publish hook, and migrated Session Save Set plus History Log Edit/Delete/Cancel/Save to that pattern.
WHY:
- Standardizes bottom actions to the Today layout contract and prevents overlap/clipping issues from feature-level fixed bars on long mobile scroll screens.

## 0.3.17 — 2026-03-03

### WHAT
- Made Exercise Info and History Exercises stats measurement-aware so strength and cardio exercises now render context-appropriate Recent/Totals/Bests summaries.
- Reworked Exercise Info stats presentation into structured sections (Recent, Totals, Bests) that only show available fields.
- Suppressed sentinel and legacy placeholder exercise rows from server-emitted exercise lists so they no longer appear in UI surfaces.

### WHY
- Ensures users see meaningful exercise progress by measurement type instead of weight-centric stats on cardio entries.
- Improves scanability and consistency of stats by grouping related metrics into predictable sections.
- Prevents legacy placeholder records from leaking into production UI while preserving existing database rows.

## 0.3.20 — 2026-03-03

### WHAT
- Normalized cardio measurement metadata defaults so cardio exercises/session_exercises align to valid `minutes` and `miles` unit values without schema changes.
- Updated cardio history summaries and Exercise Info stats to derive Last/Totals/Bests from set-level duration, distance, pace, and calories with measurement-aware formatting.
- Polished Exercise Info stats layout into consistent two-column Recent/Totals/Bests rows and removed redundant cardio duplicate lines.

### WHY
- Prevents cardio rows from falling back to reps semantics due to invalid/missing legacy unit metadata.
- Ensures cardio exercises such as Incline Walk show meaningful summaries instead of blank placeholders when set data exists.
- Improves scanability and trust in stats presentation by showing one clear recent effort line plus deterministic best effort lines.


## 0.3.21 — 2026-03-04

### WHAT
- Added a values-only cardio metadata normalization migration so cardio exercises and linked session exercises use valid, measurement-aligned default units.
- Fixed cardio History/Exercise Info summary derivation to select Last/Best effort from meaningful set data (and ignore empty cardio session rows).
- Updated History → Exercises cards so cardio rows consistently show Last/Best effort summaries and bodyweight strength rows retain PR line signal when available.

### WHY
- Prevents cardio entries from rendering `Last: —` when valid duration/distance sets exist but legacy unit metadata is null/invalid.
- Ensures cardio effort summaries are deterministic, measurement-aware, and sourced from logged sets instead of empty metadata-only session rows.
- Keeps exercise cards trustworthy by preserving visible PR context for bodyweight strength movements.

## 0.3.22 — 2026-03-04

### WHAT
- Prevented cardio-only “Best” summaries from appearing on strength exercise cards and removed placeholder stat rows (Best/PR/Last) when values are missing.
- Standardized Exercise Info stats rows to a deterministic two-column grid so labels and right-aligned values stay aligned without mid-value wrapping.
- Updated cardio best-metric selection so Best now prefers distance when duration is missing, pace when both distance and duration exist, and duration when only duration exists.

### WHY
- Avoids misleading strength-card UI where cardio best lines leaked into lifting contexts.
- Improves readability and trust in the stats panel by keeping row alignment stable on narrow screens.
- Makes cardio Best values more meaningful and predictable across cards and Exercise Info surfaces.

## 0.3.23 — 2026-03-04

### WHAT
- Changed cardio-vs-strength stats classification to require meaningful cardio signal (duration/distance) before an exercise is treated as cardio in History Exercises and Exercise Info.
- Tightened cardio Best gating so cardio Best lines only render when positive duration or distance metrics exist.
- Added development warnings when cardio-labeled measurement metadata resolves to effective strength due to missing cardio signal.

### WHY
- Prevents strength exercises with stale or incorrect cardio measurement metadata from rendering misleading cardio summaries.
- Keeps Best/Last stats consistent across surfaces by deriving modality from actual logged effort, not metadata alone.
- Improves data-quality visibility in development without breaking production UX.


## 0.3.76 — 2026-03-19

### WHAT
- Switched Playbook runtime acquisition to treat the pinned GitHub release tarball as the canonical official distribution path, with package acquisition now opt-in only when explicitly enabled by env/config.
- Hardened official fallback download/install handling to log source URL, final resolved URL, HTTP status, temp tarball path, artifact size, and nested error causes before installing via `npm install --no-save <temp-tgz>`.
- Updated runtime tests, README, governance guidance, and CI so clean-environment bootstrap uses `npm ci` plus the official fallback path instead of depending on a known-missing npm package.

### WHY
- Makes clean-environment installs deterministic again by aligning runtime acquisition with the real release infrastructure.
- Improves operator diagnostics so release/download failures expose the actual root cause instead of a generic fetch error.

## 0.3.75 — 2026-03-19

### WHAT
- Normalized the workout detail shell around shared surface and action-bar primitives so current session, day editing, and today-related workout actions use one bottom-action language.
- Moved active-session navigation into a consistent top-right placement and removed the header overhang pattern that was causing horizontal overflow on the current session screen.
- Tuned related chooser and sheet surfaces to share the same fill, border, radius, and inset treatment across workout flows.

### WHY
- Keeps adjacent workout screens feeling like one product instead of several bespoke mini-flows.
- Fixes a root-cause layout bug on the active session screen without relying on a global overflow clamp.

## 0.3.74 — 2026-03-18

### WHAT
- Reworked the active workout overview into a lighter scan-first shell with a compact header layout: back on the left, centered routine name plus timer, quick add on the right, and the primary save action moved into a sticky bottom bar.
- Simplified active-session exercise rows by reducing nested visual layers, tightening spacing, standardizing a smaller set-count pill, and keeping row tap as the single primary path into set entry.
- Added an in-session discard action beside the sticky Save Session CTA so commit/cancel actions stay anchored at the bottom without changing workout-save or navigation logic.

### WHY
- Makes the workout overview faster to scan on mobile by preserving one clear hierarchy: header, list, bottom commit action.
- Reduces visual noise that previously made the overview feel heavier than the underlying interaction required.

## 0.3.77 — 2026-03-19

### WHAT
- Unified save-return behavior around the same in-app history contract used by Back, including current-session Save Session plus routine save flows that previously jumped to fixed routes.
- Added a reusable navigation-return helper/input so server actions can safely fall back to deterministic routes when no valid in-app history entry exists.
- Normalized remaining sticky bottom CTAs around the shared canonical action variants, including Edit Day save/cancel, History log edit/delete/save/cancel, and the Routines home Edit Routine footer.

### WHY
- Prevents Save actions from breaking user context by sending people somewhere different from where Back would have taken them.
- Reduces footer drift by keeping bottom actions on one shared visual and spacing system instead of ad hoc per-screen markup.
- Keeps workout-management flows safer on mobile by reusing one sticky-action contract with consistent safe-area and width behavior.
## 0.3.78 — 2026-03-19

### WHAT
- Added shared measurement configurator and summary primitives so reps, weight, time, distance, and calories now use one visual language for optional fields and one chip-based summary treatment.
- Reworked set entry, add-exercise target configuration, routine day editing, history log set review, and session target formatting to reuse that shared measurement system instead of per-screen layouts.
- Normalized empty measurement states and goal text so workout surfaces consistently show open goals and no-measurement cases with the same wording and ordering.

### WHY
- Prevents measurement UI drift from making workout flows feel like separate products stitched together.
- Makes optional measurements materially lighter while preserving the same saved values, target semantics, and available metric combinations.
- Simplified the Current Session exercise workspace into a focused logging flow by removing redundant helper copy/status chrome, tightening the identity → goal → entry → effort → review order, and moving Skip/Delete/Save Set into the shared normalized bottom action group.【F:src/components/SessionExerciseFocus.tsx†L1-L289】【F:src/components/SessionTimers.tsx†L1-L595】
- Added shared `BottomActionTriple` and `WorkoutEntryIdentity` primitives so focused workout-entry screens can reuse the normalized three-action footer and lighter exercise identity header without reintroducing local chrome drift.【F:src/components/layout/CanonicalBottomActions.tsx†L1-L61】【F:src/components/ui/workout-entry/EntrySection.tsx†L1-L74】
- Cleaned up Current Session effort and saved-set presentation with more balanced RPE/warm-up spacing, flatter logged-set rows, chip-based effort metadata, and a clearer delete affordance while preserving the existing logging contracts.【F:src/components/SessionTimers.tsx†L1-L595】
