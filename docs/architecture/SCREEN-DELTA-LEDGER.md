# Screen Delta Ledger

This ledger is the deterministic traversal order for Pass 2 parent screen mapping.

It preserves the route-backed parent screen count and leaves nested child surfaces, overlays, drawers, inline editors, and meaningful variants to `SCREEN-SURFACE-VARIANT-LEDGER.md`.

## Scope outcome

- First-class parent screen templates: `21`
- Evidence-only `/dev/*` screen templates: `15`
- Frozen curated boundary: `1`
- Counting rule: dynamic routes count as one parent screen template each, not as one entry per user instance

## First-class parent screen index

| # | Screen ID | Route | Screen name | Ownership class | Child surface inventory |
| --- | --- | --- | --- | --- | --- |
| 1 | `screen.01.root` | `/` | Root / landing / app entry surface | Redirect-owned | `screen.01.root` |
| 2 | `screen.02.install` | `/install` | Install screen | First-class | `screen.02.install` |
| 3 | `screen.03.entry` | `/entry` | Entry screen | First-class | `screen.03.entry` |
| 4 | `screen.04.login` | `/login` | Login | First-class | `screen.04.login` |
| 5 | `screen.05.signup` | `/signup` | Signup | First-class | `screen.05.signup` |
| 6 | `screen.06.forgot-password` | `/forgot-password` | Forgot password | Redirect-owned | `screen.06.forgot-password` |
| 7 | `screen.07.reset-password` | `/reset-password` | Reset password | First-class | `screen.07.reset-password` |
| 8 | `screen.08.today` | `/today` | Today dashboard | First-class | `screen.08.today` |
| 9 | `screen.09.routines` | `/routines` | Routines list | First-class | `screen.09.routines` |
| 10 | `screen.10.routines-new` | `/routines/new` | New routine | First-class | `screen.10.routines-new` |
| 11 | `screen.11.routine-day` | `/routines/[id]/days/[dayId]` | Routine day view | First-class | `screen.11.routine-day` |
| 12 | `screen.12.routine-edit` | `/routines/[id]/edit` | Edit routine | First-class | `screen.12.routine-edit` |
| 13 | `screen.13.routine-day-edit` | `/routines/[id]/edit/day/[dayId]` | Edit routine day | First-class | `screen.13.routine-day-edit` |
| 14 | `screen.14.routine-day-add-exercise` | `/routines/[id]/edit/day/[dayId]/add-exercise` | Add exercise to routine day | First-class | `screen.14.routine-day-add-exercise` |
| 15 | `screen.15.session` | `/session/[id]` | Active session | First-class | `screen.15.session` |
| 16 | `screen.16.session-add-exercise` | `/session/[id]/add-exercise` | Add exercise to session | First-class | `screen.16.session-add-exercise` |
| 17 | `screen.17.history` | `/history` | History overview | First-class | `screen.17.history` |
| 18 | `screen.18.history-exercises` | `/history/exercises` | Exercise history list | First-class | `screen.18.history-exercises` |
| 19 | `screen.19.history-session` | `/history/[sessionId]` | Session history detail | First-class | `screen.19.history-session` |
| 20 | `screen.20.exercise-redirect` | `/exercises/[exerciseId]` | Exercise detail/reference | Redirect-owned | `screen.20.exercise-redirect` |
| 21 | `screen.21.settings` | `/settings` | Settings / account surface | First-class | `screen.21.settings` |

## Evidence-only screen templates

These routes are valid evidence seams for Pass 2, but they are not counted as first-class product surfaces:

- `/dev/auth-screen-lab`
- `/dev/exercise-info-live`
- `/dev/history-exercises-live`
- `/dev/history-exercises-shot`
- `/dev/history-preview`
- `/dev/history-session-detail-live`
- `/dev/history-sessions-live`
- `/dev/mobile-regression`
- `/dev/mobile-scaffold`
- `/dev/qa-shot`
- `/dev/stretch-card-pass`
- `/dev/stretch-info-preview`
- `/dev/stretch-session-preview`
- `/dev/ui-contract`
- `/dev/ui-system`

## Frozen boundary

- Route: `/curated-onboarding`
- File: `src/app/curated-onboarding/page.tsx`
- Status: frozen read-only boundary
- Pass 2 handling: document prerequisites and token-readiness risk only; do not normalize or expand curated-engine behavior here

## Parent screen cards

Each card below is route-level only. Nested child surfaces and variants are recorded in `SCREEN-SURFACE-VARIANT-LEDGER.md`.

### 1. Root / landing / app entry surface

- Screen ID: `screen.01.root`
- Route: `/`
- Route owner file: `src/app/page.tsx`
- Primary surface owner: redirect only
- Ownership class: redirect-owned parent screen template
- Child surface inventory: `screen.01.root`
- Notes: counts for route completeness; no route-owned visual surface

### 2. Install screen

- Screen ID: `screen.02.install`
- Route: `/install`
- Route owner file: `src/app/install/page.tsx`
- Primary surface owner: `src/components/install/InstallRouteSurface.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.02.install`
- Notes: desktop install action is dock-owned in the bottom-left auth dock, the in-card `Continue to app` CTA is no longer present, and forced iOS gate review now depends on server-seeded `installContext` parity before screenshot evidence is trusted

### 3. Entry screen

- Screen ID: `screen.03.entry`
- Route: `/entry`
- Route owner file: `src/app/entry/page.tsx`
- Primary surface owner: `src/components/auth/InitialExperienceGate.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.03.entry`
- Notes: `/entry` is an authenticated handoff route, not an unauthenticated chooser screen; `requireUser()` redirects missing sessions to `/login`, while the visible contract is the transient route-loading handoff plus the shared auth-shell fallback card/dock, with curated onboarding remaining a frozen destination boundary only

### 4. Login

- Screen ID: `screen.04.login`
- Route: `/login`
- Route owner file: `src/app/login/page.tsx`
- Primary surface owner: `src/app/login/LoginScreen.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.04.login`
- Notes: `/login` is the first stable auth-form contract in the family; the shared auth shell/card/dock stay fixed while remembered-account, route-message toast, submitting, and authenticated-session redirect states swap child-surface ownership underneath it, and invalid input is primarily expressed through a disabled dock CTA rather than a separate inline error card

### 5. Signup

- Screen ID: `screen.05.signup`
- Route: `/signup`
- Route owner file: `src/app/signup/page.tsx`
- Primary surface owner: `src/components/auth/SignupForm.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.05.signup`
- Notes: same auth-shell family as login with signup-specific field group and submit state

### 6. Forgot password

- Screen ID: `screen.06.forgot-password`
- Route: `/forgot-password`
- Route owner file: `src/app/forgot-password/page.tsx`
- Primary surface owner: redirect only
- Ownership class: redirect-owned parent screen template
- Child surface inventory: `screen.06.forgot-password`
- Notes: route contract matters even though visible ownership is delegated

### 7. Reset password

- Screen ID: `screen.07.reset-password`
- Route: `/reset-password`
- Route owner file: `src/app/reset-password/page.tsx`
- Primary surface owner: `src/app/reset-password/ResetPasswordForm.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.07.reset-password`
- Notes: form branch and expired/recovery fallback branch are separate child variants

### 8. Today dashboard

- Screen ID: `screen.08.today`
- Route: `/today`
- Route owner file: `src/app/today/page.tsx`
- Primary surface owner: `src/components/today/TodayScreenFamily.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.08.today`
- Notes: planned-day, active-session, discard-confirm, and recovery placements belong in the variant ledger

### 9. Routines list

- Screen ID: `screen.09.routines`
- Route: `/routines`
- Route owner file: `src/app/routines/page.tsx`
- Primary surface owner: `src/app/routines/RoutinesPageClient.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.09.routines`
- Notes: active-routine day list and browse-all-routines list are separate child variants

### 10. New routine

- Screen ID: `screen.10.routines-new`
- Route: `/routines/new`
- Route owner file: `src/app/routines/new/page.tsx`
- Primary surface owner: `src/app/routines/new/NewRoutineDraftForm.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.10.routines-new`
- Notes: discard-confirm is mapped as a child interruption surface

### 11. Routine day view

- Screen ID: `screen.11.routine-day`
- Route: `/routines/[id]/days/[dayId]`
- Route owner file: `src/app/routines/[id]/days/[dayId]/page.tsx`
- Primary surface owner: `src/app/routines/[id]/days/[dayId]/RoutineDayExerciseList.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.11.routine-day`
- Notes: runnable-day and rest-day are separate route-owned variants

### 12. Edit routine

- Screen ID: `screen.12.routine-edit`
- Route: `/routines/[id]/edit`
- Route owner file: `src/app/routines/[id]/edit/page.tsx`
- Primary surface owner: `src/app/routines/[id]/edit/EditRoutineAutosaveForm.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.12.routine-edit`
- Notes: delete confirmation and discard-confirm are child interruption surfaces

### 13. Edit routine day

- Screen ID: `screen.13.routine-day-edit`
- Route: `/routines/[id]/edit/day/[dayId]`
- Route owner file: `src/app/routines/[id]/edit/day/[dayId]/page.tsx`
- Primary surface owner: `src/app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.13.routine-day-edit`
- Notes: expanded editor, reorder mode, and delete modal are child variants

### 14. Add exercise to routine day

- Screen ID: `screen.14.routine-day-add-exercise`
- Route: `/routines/[id]/edit/day/[dayId]/add-exercise`
- Route owner file: `src/app/routines/[id]/edit/day/[dayId]/add-exercise/page.tsx`
- Primary surface owner: `src/app/routines/[id]/edit/day/[dayId]/EditDayAddExerciseScreen.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.14.routine-day-add-exercise`
- Notes: selected result, goal validation, and bottom action pair live in the variant ledger

### 15. Active session

- Screen ID: `screen.15.session`
- Route: `/session/[id]`
- Route owner file: `src/app/session/[id]/page.tsx`
- Primary surface owner: `src/components/SessionPageClient.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.15.session`
- Notes: this route is intentionally split into child surfaces rather than flattened into one card

### 16. Add exercise to session

- Screen ID: `screen.16.session-add-exercise`
- Route: `/session/[id]/add-exercise`
- Route owner file: `src/app/session/[id]/add-exercise/page.tsx`
- Primary surface owner: `src/app/session/[id]/SessionQuickAddExerciseForm.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.16.session-add-exercise`
- Notes: chooser shell aligns to screen 14, but live-session submit semantics stay separate

### 17. History overview

- Screen ID: `screen.17.history`
- Route: `/history`
- Route owner file: `src/app/history/page.tsx`
- Primary surface owner: `src/app/history/HistorySessionsClient.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.17.history`
- Notes: search/filter, session list, and bottom dock actions are separate child surfaces

### 18. Exercise history list

- Screen ID: `screen.18.history-exercises`
- Route: `/history/exercises`
- Route owner file: `src/app/history/exercises/page.tsx`
- Primary surface owner: `src/app/history/exercises/ExerciseBrowserClient.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.18.history-exercises`
- Notes: exercise info sheet is cataloged as an overlay child surface

### 19. Session history detail

- Screen ID: `screen.19.history-session`
- Route: `/history/[sessionId]`
- Route owner file: `src/app/history/[sessionId]/page.tsx`
- Primary surface owner: `src/app/history/[sessionId]/LogAuditClient.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.19.history-session`
- Notes: focused-exercise, edit mode, and destructive confirms are child variants

### 20. Exercise detail/reference

- Screen ID: `screen.20.exercise-redirect`
- Route: `/exercises/[exerciseId]`
- Route owner file: `src/app/exercises/[exerciseId]/page.tsx`
- Primary surface owner: redirect only
- Ownership class: redirect-owned parent screen template
- Child surface inventory: `screen.20.exercise-redirect`
- Notes: safe return-path handling remains the route-owned contract

### 21. Settings / account surface

- Screen ID: `screen.21.settings`
- Route: `/settings`
- Route owner file: `src/app/settings/page.tsx`
- Primary surface owner: `src/components/settings/SettingsAccordionClient.tsx`
- Ownership class: first-class parent screen template
- Child surface inventory: `screen.21.settings`
- Notes: accordion panels and sign-out rail should be treated as distinct child surfaces before theme harness work begins

## Parent-screen traversal rule

`SCREEN-DELTA-LEDGER.md` is now intentionally shallow.

It should answer:

- what route-backed parent screens exist
- which files own them
- which primary surface owns the route
- where to find the child surface inventory

It should not attempt to inline every modal, drawer, expanded card, inline editor, or mobile-only variant.
