# Changelog

## [Unreleased]

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
WHY:
- Count-based indexing can collide during reconnect/offline flush races; uniqueness plus retry preserves append semantics while preventing duplicate set indexes.

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
