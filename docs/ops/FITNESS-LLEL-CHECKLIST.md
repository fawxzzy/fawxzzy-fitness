# Fitness LLEL Checklist

Purpose: run a structured live-local-edit-loop pass across FIT-03 and FIT-04 without relying on memory or manually recreating every progression history state.

## Start

```powershell
cd repos\fawxzzy-fitness
npm run qa:fitness:ui-checkpoint
```

Open:

```text
http://127.0.0.1:3002/dev/env
http://127.0.0.1:3002/dev/progression-scenarios
http://127.0.0.1:3002/dev/progression-audit
http://127.0.0.1:3002/login
http://127.0.0.1:3002/routines/new
http://127.0.0.1:3002/routines
http://127.0.0.1:3002/today
http://127.0.0.1:3002/history
```

The repo-default Fitness UI proof lane is now:

1. `npm run qa:dev:fresh -- --port 3002`
2. `npm run qa:auth:bootstrap`
3. `npm run qa:llel:progression`
4. browser or manual proof for touched routes

`npm run qa:fitness:ui-checkpoint` runs the first three steps and prints the current receipt paths.

Protected routes require a browser profile with valid auth cookies. Browser automation without cookies should redirect to `/login`.

## Master LLEL Status

Legend:

- `[ ]` Pending manual review.
- `[x]` Passed manual or live route review.
- `[!]` Failed and needs a targeted patch.
- `[-]` Blocked or not reviewable in the current environment.

Current run:

- `[x]` Local server is responding on `127.0.0.1:3002`.
- `[x]` `/dev/env` returns `200` and shows `lpswxoyfniocuhljgzbc.supabase.co`.
- `[x]` `/dev/progression-scenarios` returns `200`.
- `[ ]` `/dev/progression-audit` renders in a logged-in dev browser and explains every active routine exercise candidate.
- `[x]` `/login` returns `200`.
- `[x]` Localhost runner was restored after connection loss.
- `[x]` Today Progression Updates card chrome patch is code-verified.
- `[x]` Pilates catalog migration `20260507162000` applied to `lpswxoyfniocuhljgzbc` and 18 global Pilates rows are queryable.
- `[ ]` Today Progression Updates Ready Updates-only behavior and card progress fill need manual visual confirmation with auth cookies.
- `[-]` Authenticated visual routes redirect to `/login` without manual browser auth cookies.
- `[-]` Automated browser visual pass is blocked in this environment by Chrome launch failure.
- `[x]` `npm run fitness:followups:process:dry-run` reports missing service role cleanly and performs no mutation.

Manual review sections:

- `[ ]` Env / auth
- `[ ]` FIT-03 History / Cycle Summary
- `[ ]` Boot / theme
- `[ ]` New Routine
- `[ ]` Edit Routine
- `[ ]` Add Exercise
- `[ ]` Edit Day
- `[ ]` Today base screen
- `[ ]` Today switch-day screen
- `[ ]` Current Session / live logger
- `[x]` Dev progression scenarios route availability
- `[x]` FIT-05 dry-run safety

Patch rule:

- Patch only the failed item.
- Do not touch unrelated route shells.
- Do not change `SessionTimers` unless the failure is in the session logger.
- Do not change DB schema during LLEL.
- Do not alter progression math unless a scenario proves the math is wrong.
- After any patch, run `npm run typecheck` and `npm run verify`.

## Dev Environment

- `/dev/env` shows `lpswxoyfniocuhljgzbc.supabase.co`.
- No migration-chain warning appears.
- No `045/046` schema error appears.
- Hard refresh of `/login` and `/today` does not crash.

## Progression Scenarios

Use `/dev/progression-scenarios` as the deterministic source of expected states. The page itself is read-only, while the listed QA commands can seed/reset real scenario rows under the Codex automation user only:

- No production route exposure.
- No browser-triggered destructive reset path.
- No scenario rows are persisted from the dev page itself.
- Writable scenario rows must be owned by the automation user and prefixed with `[QA-PROGRESSION]` or `[QA-FULL-ROUTINE]`.
- Human-facing product routes should keep QA/LLEL rows hidden unless the Account setting `Show QA/LLEL data` is enabled.

Scenarios covered:

- no candidate
- double progression promote
- legacy Hold & Review / Manual Review behavior
- Deload after stall
- time cardio promote
- distance cardio promote
- time + distance promote
- active session hides review card
- stretch no candidate
- 3-day cycle occurrence labels
- Training Focus customized state
- Set Flow defaults by goal
- Set Flow planned target examples
- required-first logger inputs by measurement type

## Progression Candidate Audit

Use `/dev/progression-audit` in a logged-in local browser when Today Progression Updates does not show an exercise you expect.

The audit is read-only and lists every active-routine planned exercise with:

- routine day exercise id and catalog exercise id
- measurement type, equipment, progression method, qualification policy, progression vector, regression policy, Set Flow, and Progression Step
- target sets/reps/load/duration/distance/calories
- history source: routine-day exercise id, unique catalog fallback, linked same-fingerprint context, global exercise context, blocked duplicate catalog fallback, or none
- completed set/session counts, skipped count, latest completed session, and best/latest set summary
- candidate result and rejection reason
- target fingerprint, linked match count, candidate source session, and cache-ready evaluation fingerprint

The audit mirrors Today's safety rule: repeated catalog exercises need routine-day exercise history; catalog fallback is only allowed when the catalog exercise appears once in the active routine. Linked same-fingerprint Ready Updates require explicit selected rows and server-side fingerprint verification before Apply/Revert mutates multiple planned rows. Global history remains context-only.

Progression math should be read as three separate layers: qualification policy proves whether an update was earned, progression vector describes what target metric changes, and step policy describes the amount of that change. Do not add new visible progression methods when a measurement-aware vector can express the same math.

## Codex QA Account

Use this path when Codex needs writable authenticated data without touching Zac's account:

```powershell
npm run qa:codex:seed:dry-run
npm run qa:codex:seed
```

Required env:

- `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FITNESS_CODEX_QA_EMAIL`
- `FITNESS_CODEX_QA_PASSWORD`
- `SOURCE_ROUTINE_ID` or `SOURCE_USER_EMAIL`

Rules:

- Codex QA profile must be `user_kind=automation`.
- Codex QA profile `user_number` must stay `null`.
- Source routine is read-only.
- Cloned routine is prefixed with `[Codex QA]`.
- Reset preserves the auth user and removes only rows owned by the Codex QA user:

```powershell
npm run qa:codex:reset:dry-run
npm run qa:codex:reset
```

Writable progression scenario lane:

```powershell
npm run qa:codex:seed:dry-run -- --scenario strength_promote_above_target
npm run qa:codex:seed -- --scenario strength_promote_above_target
npm run qa:codex:reset:dry-run -- --scenario strength_promote_above_target
npm run qa:codex:reset -- --scenario strength_promote_above_target
```

Full routine suite lane:

```powershell
npm run qa:codex:seed:dry-run -- --all-full-routine-scenarios
npm run qa:codex:seed -- --all-full-routine-scenarios
npm run qa:codex:reset:dry-run -- --all-full-routine-scenarios
npm run qa:codex:reset -- --all-full-routine-scenarios
```

Scenario ids:

- `strength_promote_exact_target`
- `strength_promote_above_target`
- `strength_partial_not_ready`
- `huge_weight_low_rep_not_ready`
- `below_target_load_not_ready`
- `hold_review_ready`
- `cardio_time_promote`
- `cardio_distance_promote`
- `same_exercise_same_target_linked`
- `linked_same_target_all_ready`
- `linked_same_target_partial_selection`
- `linked_target_drift_reject`
- `linked_apply_revert_group`
- `linked_pinned_revalidation`
- `linked_status_only`
- `same_exercise_different_target_separate`
- `deload_after_stall`
- `no_history`
- `stretch_hidden`
- `ui_stress_full_inputs`

Full routine suite ids:

- `full_strength_cycle_mixed`
- `full_cardio_cycle_mixed`
- `full_linked_targets_cycle`
- `full_duplicate_exercise_different_targets`
- `full_deload_cycle`
- `full_training_focus_defaults`
- `full_history_context_cycle`
- `full_stats_analytics_cycle`

Wave 1 QA data hygiene:

- Account now owns a `Show QA/LLEL data` setting for human-facing views.
- Leave the setting off for normal product review unless you are explicitly validating fixture visibility.
- QA/LLEL controls and dev routes are limited to Zac (`user_number=0`) and automation users.
- The normal-view filter affects only those authorized accounts; it is not a public toggle for every user.

Wave 1 export hygiene:

- Account export is truth-first and import-friendly.
- CSV, JSON, and Excel `.xlsx` are supported formats.
- Export filenames are sanitized before download.

Release evidence hygiene:

- Every production deploy should record a release ledger entry.
- The canonical machine-readable stream is `docs/releases/RELEASE_LEDGER.jsonl`.
- Draft release metadata is prepared locally in `runtime/fitness/release-draft.json`.
- Use `npm run release:fitness:prepare` and `npm run release:fitness:diff` before a prod push.
- Use `npm run release:fitness:record` only when the release facts are final after deployment metadata is known.
- Keep `CHANGELOG.md` user-facing and short; keep deploy truth in the ledger and release note.

Rules:

- Scenario routines are prefixed with `[QA-PROGRESSION]`.
- Full routine suite routines are prefixed with `[QA-FULL-ROUTINE]`.
- Scenario seed creates real routines, routine days, routine day exercises, completed sessions, session exercises, and sets under the Codex automation user only.
- Scenario reset deletes only Codex QA rows for selected `[QA-PROGRESSION]` and `[QA-FULL-ROUTINE]` routines and preserves the auth user.
- Use `/dev/progression-audit`, `/dev/progression-scenarios`, and `/today` to inspect expected candidate/status output.

## Feature Flags

Use `/dev/flags` to inspect deterministic feature flag resolution.

- Flag names are typed in code.
- Values resolve from defaults plus env overrides.
- Dev diagnostics show source as default or env.
- No secrets are exposed.
- Progression Updates and recap artifacts must stay gateable.

## New Routine

- Routine name input has its own section bar.
- Cycle Start is a calendar date, not weekday source.
- Weekday chips are preview only.
- Cycle Length explains repeat interval.
- Training Focus seeds defaults.
- Manual changes show Customized, not blank goal.
- Progression card uses account-style card chrome.
- Info content appears only on New/Edit Routine.
- Terms use Meaning / Affects / Example.
- Set Flow appears as model/default only, not logger behavior.
- Set Flow planned targets are advisory examples only.

## Edit Routine

- Existing routine loads Cycle Start correctly.
- Changing Training Focus opens app modal, not browser confirm.
- No = routine default only.
- Yes = current non-Stretch exercises only.
- No hidden cascade rewrites exercise targets.

## Add Exercise

- Existing Exercise picker behavior stays intact.
- Custom Exercise creation stays inside the existing picker flow.
- Custom Exercise confirmation reuses the shared confirm modal surface.
- Create Custom Exercise writes a user-owned custom exercise row only.
- Custom exercise flow never mutates or reflags a global catalog row.
- Custom exercise metadata stays searchable and filterable after save.
- Exercise list scrolls fully.
- No bottom panel seam/gap.
- Exercise rows use green app dots.
- Stretch sets count to 1.
- Stretch hides preview row.
- Stretch hides unsupported measurement/progression controls.
- Add Exercise inherits routine default.
- Equipment progression step copy is clear, especially dumbbell per-dumbbell copy.

## Edit Day

- Day name input is centered and sized like the Account theme name input.
- Stretch dropdown hides measurement targets.
- Progression dropdown is compact.
- Apply routine default is centered.
- Manual / Double labels are correct; legacy Hold & Review rows remain compatible but are not the normal new-selection model.
- Deload appears as regression policy, not progression method.

## Today

- Normal Today header uses day name in white, green dot, weekday in green.
- Normal Today header does not show calendar date.
- Switch-day screen uses routine-home header wrapper.
- Switch-day subtitle uses routine-level training/rest summary.
- Switch-day cards match routine day cards.
- Dynamic weekday updates for non-7-day cycles.
- Today Progression Updates shows selected-day Ready Updates only; status detail stays in audit/dev surfaces.
- Routines Progression Updates shows all-day Ready Updates only.
- Today and Current Session exercise cards may show subtle progress fill derived from existing progression evidence.
- Progress fill is visual-only; it must not create candidates or diverge from Progression Updates/audit.
- Progression Updates can show selected-day status even when there are no Ready Updates.
- Ready Updates may come from the best fully qualifying completed session, not only the latest session.
- Sets from multiple sessions must not pool into one fake promotion.
- Same-exercise linked Ready Updates may update multiple rows only when the user selects the planned rows and the server verifies identical target/config fingerprints.
- Same-exercise global history is context-only and must not silently update rows.
- Progression Updates hides during active session.
- Promote Apply updates one exercise target only.
- Revert restores previous target.
- Legacy Hold & Review says review only, no auto-bump.
- Deload says stall detected, not skipped.

## Current Session

- Saved sets use translucent vertical scroll box.
- Many saved sets do not push input row down.
- Apply Last sits left in measurement row.
- Apply Last text does not clip.
- Input row sits close to bottom button bar.
- Optional inputs dim until used.
- Required inputs come first.
- Failure keeps reps available.
- Hide/Unhide uses secondary color scheme.
- Measurementless Stretch quick-log works.
- No noisy Next/Reason guidance appears in logger.
- Set Flow planned targets do not mutate logged sets.

## FIT-05 Follow-Up Jobs

Dry-run the processor:

```powershell
npm run fitness:followups:process:dry-run
```

If service role env is configured, process a bounded batch:

```powershell
npm run fitness:followups:process -- --limit 10
```

Checks:

- Session completion writes raw truth before derived work.
- `exercise_stats` and `fitness_integrations` jobs can fail independently.
- Pending, failed, and stale processing jobs can be claimed.
- Completed jobs are not retried.
- Max-attempt jobs settle as failed instead of retrying forever.
- Recap generation remains derived follow-up work and does not block session completion.

## Authenticated LLEL Bootstrap

Use one origin for all authenticated automation checks:

```powershell
$env:FITNESS_APP_URL = "http://127.0.0.1:3002"
npm run qa:auth:bootstrap
npm run qa:auth:check
```

For the Zac-owned `[ZAC-LLEL]` product pass only:

```powershell
npm run qa:auth:bootstrap:zac
npm run qa:auth:check
```

Checks:

- `runtime/fitness/qa-storage-state.json` exists and is not committed.
- `/today`, `/routines`, `/history`, `/settings` (Account tab), and `/dev/progression-audit` return authenticated responses.
- No passwords or tokens are printed to the terminal.
- Do not mix `localhost` and `127.0.0.1`; cookies are origin-scoped.

Optional visual helpers:

```powershell
npm run qa:llel:open
npm run qa:llel:capture
```

## Zac-Owned LLEL Fixture

Use only when the final product pass needs Zac's real authenticated browser context without touching the real Atlas routine:

```powershell
$env:SOURCE_USER_EMAIL = "<zac email>"
$env:SET_LLEL_ACTIVE = "true"
npm run qa:zac:llel:seed:dry-run
npm run qa:zac:llel:seed
```

Reset and restore the previous active routine:

```powershell
$env:RESTORE_ACTIVE_ROUTINE = "true"
npm run qa:zac:llel:reset:dry-run
npm run qa:zac:llel:reset
```

Rules:

- Seed only `[ZAC-LLEL]` routines and sessions.
- Use canonical global exercise IDs only; Zac LLEL must insert zero exercise rows.
- If a needed exercise is missing, add it through the canonical catalog flow or fail the seed.
- Reset only rows owned by `SOURCE_USER_EMAIL` and scoped to `[ZAC-LLEL]`.
- Reset may remove stale user-owned `[ZAC-LLEL]` exercise rows left by older bad seeds only after references are gone.
- Never delete auth users or non-prefixed Atlas data.
- Capture previous `active_routine_id` before setting the LLEL routine active.
- Treat the real Atlas routine as final-smoke only, not edge-case fixture data.

Catalog repair for older bad seeds:

```powershell
npm run qa:zac:llel:repair-catalog:dry-run
npm run qa:zac:llel:repair-catalog
```

Checks:

- Dry-run lists every stale `[ZAC-LLEL]` exercise and its canonical replacement.
- `routine_day_exercises.exercise_id` and `session_exercises.exercise_id` remap only inside `[ZAC-LLEL]` rows owned by `SOURCE_USER_EMAIL`.
- Prefixed user-owned exercise rows are deleted only after remap.
- Canonical global exercises are never deleted.

## History / Cycle Summary

- Uses Cycle language.
- Current cycle card is clear.
- Historical cycle cards match visual shell.
- Search rail sticky behavior works.
- No duplicate compact headers.
- Score formula copy matches current logic.
- Recap artifacts render only when the shareable recap flag is enabled.
- Recap copy is derived from completed session/exercise/set truth.

## Debug Questions

- For this exercise, what is the resolved config: trainingGoal, measurementType, progressionMethod, progressionStep, setFlow, intensityTarget, regressionPolicy, promotionPolicy?
- Why did this Today Progression Updates card appear? Show the candidate inputs and branch.
- When Apply is clicked, what exact row and fields change?
- Where is previous target stored for Revert?
- After training on an applied target, does the Revert pin finalize so the next earned candidate can appear?
- For load-based Double Progression, does the app build reps first (`230 x 4 -> 230 x 5 -> 230 x 6`) before increasing load and resetting reps (`235 x 4`)?
- For this routine start date and cycle length, what are the next 14 cycle occurrences?
- Where does Set Flow persist today, and what behavior does it not change yet?
- For this live set row, why are these inputs required vs optional?
