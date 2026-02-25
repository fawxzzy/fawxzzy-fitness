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

# Changelog

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
