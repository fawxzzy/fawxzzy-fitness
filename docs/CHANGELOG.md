# Changelog

## [Unreleased]

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
