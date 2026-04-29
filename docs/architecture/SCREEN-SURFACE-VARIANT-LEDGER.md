# Screen Surface Variant Ledger

This ledger records the child-surface and major-variant layer under the 21 parent screen templates in `SCREEN-DELTA-LEDGER.md`.

Use it when route-level counting is not detailed enough to answer:

- what meaningful surfaces exist inside a parent screen
- which variants deserve separate screenshot evidence
- which overlays, drawers, modals, sheets, inline editors, and sticky controls must be theme-mapped separately

## Counting rules

Keep the 21 parent screen templates unchanged.

Count a child surface or surface variant when it changes at least one of these:

- layout
- available actions
- visibility
- data source
- theme behavior
- state meaning
- curated-engine relevance
- user decision path
- component ownership

Do not count copy-only or label-only differences as separate variants.

## Stable ID convention

- parent screen: `screen.xx.name`
- child surface: `surface.<family>.<name>`
- surface variant: `variant.<family>.<name>.<state>`
- element: `element.<family>.<name>`

## Parent index

| Screen ID | Route | Child surface focus |
| --- | --- | --- |
| `screen.01.root` | `/` | redirect contract only |
| `screen.02.install` | `/install` | auth shell, install panel, dock, iOS gates |
| `screen.03.entry` | `/entry` | bootstrap loading, fallback card, fallback dock, redirect handoff |
| `screen.04.login` | `/login` | auth shell, login form, fields, footer links, remembered-account branch, route toast, dock |
| `screen.05.signup` | `/signup` | auth shell, signup form, dock |
| `screen.06.forgot-password` | `/forgot-password` | redirect contract only |
| `screen.07.reset-password` | `/reset-password` | reset form, expired fallback, recovery bridge |
| `screen.08.today` | `/today` | header, day picker, exercise list, sticky dock, discard confirm |
| `screen.09.routines` | `/routines` | header card, day list, routine list, bottom dock |
| `screen.10.routines-new` | `/routines/new` | editor shell, details form, discard confirm dock |
| `screen.11.routine-day` | `/routines/[id]/days/[dayId]` | header, exercise list, rest-state dock |
| `screen.12.routine-edit` | `/routines/[id]/edit` | editor shell, details form, delete confirm |
| `screen.13.routine-day-edit` | `/routines/[id]/edit/day/[dayId]` | day settings, editable list, expanded editor, reorder mode |
| `screen.14.routine-day-add-exercise` | `/routines/[id]/edit/day/[dayId]/add-exercise` | chooser header, search bar, result list, goal editor, bottom actions |
| `screen.15.session` | `/session/[id]` | header, exercise list, exercise card, set rows, sticky controls, finish flow |
| `screen.16.session-add-exercise` | `/session/[id]/add-exercise` | chooser header, search bar, result list, goal editor, bottom actions |
| `screen.17.history` | `/history` | history header, search/filter, session list, bottom dock |
| `screen.18.history-exercises` | `/history/exercises` | history header, search/filter, exercise list, info sheet |
| `screen.19.history-session` | `/history/[sessionId]` | summary card, exercise list, focused editor, destructive confirms |
| `screen.20.exercise-redirect` | `/exercises/[exerciseId]` | redirect contract only |
| `screen.21.settings` | `/settings` | identity header, accordion sections, account form, sign-out rail |

## Parent screen records

### `screen.01.root`

- Route: `/`
- Screen name: Root / landing / app entry surface
- Route owner file: `src/app/page.tsx`
- Primary surface owner: redirect only
- Child surfaces:
  - `surface.redirect.root`
    - purpose: preserve root route ownership and redirect to `/entry`
    - variants: `variant.redirect.root.default`
    - screenshot evidence: none required

### `screen.02.install`

- Route: `/install`
- Screen name: Install screen
- Route owner file: `src/app/install/page.tsx`
- Primary surface owner: `src/components/install/InstallRouteSurface.tsx`
- Forced-state review note: `src/app/install/page.tsx` passes `searchParams.installContext` into `InstallRouteSurface` so iOS gate screenshots start from server/client parity instead of a client-only override
- Child surfaces:
  - `surface.auth.install-shell`
    - owning component: `InstallRouteSurface`
    - purpose: host the install/auth card shell
    - variants: `variant.auth.install-shell.desktop-default`, `variant.auth.install-shell.mobile-default`
    - screenshot evidence: `tmp/install-review-v2/install-desktop-v2.png`
  - `surface.install.primary-panel`
    - owning component: `InstallRouteSurface`
    - purpose: explain install state and supporting copy while deferring primary action ownership to the dock
    - variants: `variant.install.primary-panel.install-ready`, `variant.install.primary-panel.install-unavailable`
    - notes: desktop no longer owns an in-card `Continue to app` CTA
  - `surface.install.ios-gate`
    - owning component: `IOSAddToHomeScreenGate`, `IOSOpenInSafariGate`
    - purpose: show iOS-specific install instructions from a server/client-parity install context
    - variants: `variant.install.ios-gate.add-to-home`, `variant.install.ios-gate.open-in-safari`
    - notes: long subtitle copy was removed from both forced iOS gate variants after runtime review cleanup
    - screenshot evidence: `tmp/install-review-v2/install-ios-safari-v2.png`, `tmp/install-review-v2/install-ios-inapp-v2.png`
  - `surface.auth.install-dock`
    - owning component: `AuthDock`
    - purpose: own the bottom-left install action and sibling dock actions for the desktop/default install flow
    - variants: `variant.auth.install-dock.install-available`, `variant.auth.install-dock.login-only`
    - screenshot evidence: `tmp/install-review-v2/install-desktop-v2.png`

### `screen.03.entry`

- Route: `/entry`
- Screen name: Entry screen
- Route owner file: `src/app/entry/page.tsx`
- Primary surface owner: `src/components/auth/InitialExperienceGate.tsx`
- Route guard note: `requireUser()` redirects unauthenticated requests to `/login` before any `/entry` visual surface mounts
- Evidence seam note: screenshot evidence uses `src/app/dev/auth-screen-lab/page.tsx` because live `/entry` is a transient authenticated handoff that usually resolves before a stable browser capture exists
- Child surfaces:
  - `surface.entry.bootstrap-loading`
    - owning component: `InitialExperienceGate` via `RouteLoading`
    - purpose: show the authenticated handoff overlay while gate state and destination resolve
    - variants: `variant.entry.bootstrap-loading.checking-session`, `variant.entry.bootstrap-loading.preparing-experience`
    - screenshot evidence: `tmp/entry-review/entry-handoff-mobile-v1.png`
  - `surface.entry.fallback-card`
    - owning component: `InitialExperienceGate`
    - purpose: recover from handoff failure inside the shared auth shell/card language
    - variants: `variant.entry.fallback-card.error-mobile`, `variant.entry.fallback-card.error-desktop`
    - screenshot evidence: `tmp/entry-review/entry-handoff-error-mobile-v1.png`, `tmp/entry-review/entry-handoff-error-desktop-v1.png`
  - `surface.entry.fallback-dock`
    - owning component: `BottomActionSplit`
    - purpose: own the `Retry` and `Start Offline` recovery actions when the handoff fails
    - variants: `variant.entry.fallback-dock.error-mobile`, `variant.entry.fallback-dock.error-desktop`
    - screenshot evidence: `tmp/entry-review/entry-handoff-error-mobile-v1.png`, `tmp/entry-review/entry-handoff-error-desktop-v1.png`
  - `surface.entry.redirect-handoff`
    - owning component: `InitialExperienceGate`
    - purpose: delegate to `/today` or the frozen curated boundary without owning a stable destination UI
    - variants: `variant.entry.redirect-handoff.home`, `variant.entry.redirect-handoff.curated-boundary`
    - notes: the visible shell matches the loading overlay; curated onboarding remains a frozen read-only boundary for Pass 2 and is not expanded here

### `screen.04.login`

- Route: `/login`
- Screen name: Login
- Route owner file: `src/app/login/page.tsx`
- Primary surface owner: `src/app/login/LoginScreen.tsx`
- Evidence seam note: `src/app/dev/auth-screen-lab/page.tsx` is the authoritative screenshot seam for remembered-account and submitting states that are awkward to hold on the live route long enough for deterministic capture
- Child surfaces:
  - `surface.auth.login-shell`
    - owning component: `LoginScreen` via `AuthShell` and `AuthCard`
    - purpose: host the shared auth card/dock frame around all login states
    - variants: `variant.auth.login-shell.default-mobile`, `variant.auth.login-shell.default-desktop`, `variant.auth.login-shell.remembered-account`
    - screenshot evidence: `tmp/login-review/login-default-mobile-v1.png`, `tmp/login-review/login-default-desktop-v1.png`, `tmp/login-review/login-remembered-mobile-v1.png`
  - `surface.auth.login-form`
    - owning component: `LoginScreen`
    - purpose: switch between manual credential collection and the remembered-account credential step, then submit auth
    - variants: `variant.auth.login-form.default-empty`, `variant.auth.login-form.remembered-password-only`, `variant.auth.login-form.submitting`
    - screenshot evidence: `tmp/login-review/login-default-mobile-v1.png`, `tmp/login-review/login-remembered-password-mobile-v1.png`, `tmp/login-review/login-submitting-mobile-v1.png`
  - `surface.auth.login-fields`
    - owning component: `LabeledEditorField`, `Input`
    - purpose: own email/username and password field shells plus local validity emphasis
    - variants: `variant.auth.login-fields.empty-disabled`, `variant.auth.login-fields.ready`, `variant.auth.login-fields.password-only-remembered`
    - notes: no password-visibility toggle is present on `/login` in the current Pass 2 runtime
  - `surface.auth.remembered-account`
    - owning component: `LoginScreen`
    - purpose: quick re-login / remembered-account branch
    - variants: `variant.auth.remembered-account.available`, `variant.auth.remembered-account.credential-step`
    - screenshot evidence: `tmp/login-review/login-remembered-mobile-v1.png`, `tmp/login-review/login-remembered-password-mobile-v1.png`
  - `surface.auth.login-footer-links`
    - owning component: `AuthFooter`
    - purpose: expose secondary auth actions such as `Create account`, `Reset password`, and remembered-account `Log Out`
    - variants: `variant.auth.login-footer-links.manual-auth`, `variant.auth.login-footer-links.remembered-account`
    - screenshot evidence: `tmp/login-review/login-default-mobile-v1.png`, `tmp/login-review/login-remembered-mobile-v1.png`
  - `surface.auth.login-route-toast`
    - owning component: `ToastProvider` via `useToastMessageEffect`
    - purpose: show route-level auth, verification, and recovery feedback without replacing the shared card shell
    - variants: `variant.auth.login-route-toast.error`, `variant.auth.login-route-toast.info`
    - screenshot evidence: `tmp/login-review/login-route-error-mobile-v1.png`
  - `surface.auth.login-dock`
    - owning component: `AuthDock`
    - purpose: own the bottom primary login or continue action, including disabled and loading states
    - variants: `variant.auth.login-dock.manual-disabled`, `variant.auth.login-dock.manual-ready`, `variant.auth.login-dock.manual-submitting`, `variant.auth.login-dock.remembered-continue`
    - screenshot evidence: `tmp/login-review/login-default-mobile-v1.png`, `tmp/login-review/login-remembered-mobile-v1.png`, `tmp/login-review/login-submitting-mobile-v1.png`
  - `surface.auth.login-session-redirect`
    - owning component: `AuthStatusCard`
    - purpose: redirect an already authenticated browser session back into `/entry` without reopening manual login
    - variants: `variant.auth.login-session-redirect.authenticated`
    - notes: reachable with a live authenticated browser session, but too transient for a reliable stable screenshot in this pass

### `screen.05.signup`

- Route: `/signup`
- Screen name: Signup
- Route owner file: `src/app/signup/page.tsx`
- Primary surface owner: `src/components/auth/SignupForm.tsx`
- Child surfaces:
  - `surface.auth.signup-shell`
    - owning component: `AuthShell`
    - purpose: host signup card and dock
  - `surface.auth.signup-form`
    - owning component: `SignupForm`
    - purpose: collect username, email, and password
    - variants: `variant.auth.signup-form.default`, `variant.auth.signup-form.submitting`, `variant.auth.signup-form.error`
  - `surface.auth.signup-dock`
    - owning component: `AuthDock`
    - purpose: own account-creation action

### `screen.06.forgot-password`

- Route: `/forgot-password`
- Screen name: Forgot password
- Route owner file: `src/app/forgot-password/page.tsx`
- Primary surface owner: redirect only
- Child surfaces:
  - `surface.redirect.forgot-password`
    - purpose: preserve route ownership and redirect to `/login`
    - variants: `variant.redirect.forgot-password.default`
    - screenshot evidence: none required

### `screen.07.reset-password`

- Route: `/reset-password`
- Screen name: Reset password
- Route owner file: `src/app/reset-password/page.tsx`
- Primary surface owner: `src/app/reset-password/ResetPasswordForm.tsx`
- Child surfaces:
  - `surface.auth.reset-form`
    - owning component: `ResetPasswordForm`
    - purpose: collect replacement password
    - variants: `variant.auth.reset-form.authenticated`, `variant.auth.reset-form.submitting`, `variant.auth.reset-form.error`
    - screenshot evidence: `tmp/reset-password-review/reset-password-form-authenticated.png`
  - `surface.auth.reset-fallback`
    - owning component: `RecoverySessionBridge`
    - purpose: explain expired or missing recovery session and route back to login
    - variants: `variant.auth.reset-fallback.expired`, `variant.auth.reset-fallback.recovery-bootstrap`
    - screenshot evidence: `tmp/reset-password-review/reset-password-expired.png`, `tmp/reset-password-review/reset-password-recovery-bottom-v4.png`
  - `surface.auth.reset-dock`
    - owning component: route-owned bottom action
    - purpose: host the single fallback login action

### `screen.08.today`

- Route: `/today`
- Screen name: Today dashboard
- Route owner file: `src/app/today/page.tsx`
- Primary surface owner: `src/components/today/TodayScreenFamily.tsx`
- Child surfaces:
  - `surface.today.header`
    - owning component: `TodayOverviewHeader`
    - purpose: show routine/day identity and top summary
    - variants: `variant.today.header.planned-day`, `variant.today.header.active-session`
  - `surface.today.day-picker`
    - owning component: `TodayDayPicker`
    - purpose: select a runnable day before session start
    - variants: `variant.today.day-picker.visible`
  - `surface.today.exercise-list`
    - owning component: `TodayExerciseRows`
    - purpose: display planned or resume-state exercise rows
    - variants: `variant.today.exercise-list.planned`, `variant.today.exercise-list.resume`, `variant.today.exercise-list.skipped-row`, `variant.today.exercise-list.completed-row`
    - screenshot evidence: `tmp/today-review/today-current-v2-after-discard.png`, `tmp/today-review/today-inline-count-v10-chevron-restored.png`
  - `surface.today.sticky-dock`
    - owning component: `PublishBottomActions`
    - purpose: host `Start`, `Switch`, `Resume`, `Discard`
    - variants: `variant.today.sticky-dock.planned`, `variant.today.sticky-dock.active-session`
  - `surface.today.discard-confirm`
    - owning component: `ConfirmedServerFormButton`
    - purpose: destructive discard confirmation overlay
  - `surface.today.error-fallback`
    - owning component: route-local fallback banner/client shell
    - purpose: show error or degraded/offline messaging

### `screen.09.routines`

- Route: `/routines`
- Screen name: Routines list
- Route owner file: `src/app/routines/page.tsx`
- Primary surface owner: `src/app/routines/RoutinesPageClient.tsx`
- Child surfaces:
  - `surface.routines.header-card`
    - owning component: route header card family
    - purpose: show active routine identity and view context
  - `surface.routines.day-list`
    - owning component: day-list view
    - purpose: show current routine days
    - variants: `variant.routines.day-list.active-routine`
    - screenshot evidence: `tmp/routines-review/routines-default-v1.png`
  - `surface.routines.routine-list`
    - owning component: browse-all-routines list
    - purpose: choose or inspect routines
    - variants: `variant.routines.routine-list.view-list`
    - screenshot evidence: `tmp/routines-review/routines-list-v1.png`
  - `surface.routines.bottom-dock`
    - owning component: bottom dock publisher
    - purpose: host toggle, edit, and new actions

### `screen.10.routines-new`

- Route: `/routines/new`
- Screen name: New routine
- Route owner file: `src/app/routines/new/page.tsx`
- Primary surface owner: `src/app/routines/new/NewRoutineDraftForm.tsx`
- Child surfaces:
  - `surface.routine-editor.header`
    - owning component: `RoutineDetailsScreenShell`
    - purpose: screen identity and top scaffold
  - `surface.routine-editor.details-form`
    - owning component: `NewRoutineDraftForm`
    - purpose: collect routine metadata and defaults
    - variants: `variant.routine-editor.details-form.default`, `variant.routine-editor.details-form.invalid`, `variant.routine-editor.details-form.saving`
    - screenshot evidence: `tmp/routines-review/routines-new-mobile-v1.png`
  - `surface.routine-editor.bottom-dock`
    - owning component: bottom actions publisher
    - purpose: own `Cancel` and `Create`
  - `surface.routine-editor.discard-confirm`
    - owning component: exit guard family
    - purpose: confirm abandoning dirty draft

### `screen.11.routine-day`

- Route: `/routines/[id]/days/[dayId]`
- Screen name: Routine day view
- Route owner file: `src/app/routines/[id]/days/[dayId]/page.tsx`
- Primary surface owner: `src/app/routines/[id]/days/[dayId]/RoutineDayExerciseList.tsx`
- Child surfaces:
  - `surface.routine-day.header`
    - purpose: show routine/day identity
  - `surface.routine-day.exercise-list`
    - purpose: show planned exercises in read-only day-preview mode
    - variants: `variant.routine-day.exercise-list.runnable`
    - screenshot evidence: `tmp/routines-review/routine-day-runnable-mobile-v1.png`
  - `surface.routine-day.rest-state`
    - purpose: show resting-day state and controls
    - variants: `variant.routine-day.rest-state.rest-day`
    - screenshot evidence: `tmp/routines-review/routine-day-rest-mobile-v1.png`
  - `surface.routine-day.bottom-dock`
    - purpose: host edit and rest/training actions

### `screen.12.routine-edit`

- Route: `/routines/[id]/edit`
- Screen name: Edit routine
- Route owner file: `src/app/routines/[id]/edit/page.tsx`
- Primary surface owner: `src/app/routines/[id]/edit/EditRoutineAutosaveForm.tsx`
- Child surfaces:
  - `surface.routine-editor.header`
    - purpose: shared routine-editor scaffold
  - `surface.routine-editor.details-form`
    - purpose: edit metadata, units, and schedule anchors
    - variants: `variant.routine-editor.details-form.default`, `variant.routine-editor.details-form.saving`, `variant.routine-editor.details-form.error`
    - screenshot evidence: `tmp/routines-review/routine-edit-mobile-v1.png`
  - `surface.routine-editor.bottom-dock`
    - purpose: own `Delete` and `Save`
  - `surface.routine-editor.delete-confirm`
    - purpose: destructive delete confirmation
  - `surface.routine-editor.discard-confirm`
    - purpose: dirty-exit confirmation

### `screen.13.routine-day-edit`

- Route: `/routines/[id]/edit/day/[dayId]`
- Screen name: Edit routine day
- Route owner file: `src/app/routines/[id]/edit/day/[dayId]/page.tsx`
- Primary surface owner: `src/app/routines/[id]/edit/day/[dayId]/EditableRoutineDayExerciseList.tsx`
- Child surfaces:
  - `surface.routine-day-edit.day-settings`
    - purpose: rename day and toggle rest/training state
  - `surface.routine-day-edit.exercise-list`
    - purpose: show editable exercise cards
    - variants: `variant.routine-day-edit.exercise-list.default`, `variant.routine-day-edit.exercise-list.rest-day`
    - screenshot evidence: `tmp/routines-review/routine-edit-day-mobile-v1.png`
  - `surface.routine-day-edit.expanded-editor`
    - purpose: inline editing for one exercise card
    - variants: `variant.routine-day-edit.expanded-editor.open`
  - `surface.routine-day-edit.reorder-mode`
    - purpose: reorder exercises with alternate row chrome
    - variants: `variant.routine-day-edit.reorder-mode.active`
  - `surface.routine-day-edit.delete-confirm`
    - purpose: destructive confirm for remove exercise flow
  - `surface.routine-day-edit.bottom-dock`
    - purpose: own `Reorder` and `Add`

### `screen.14.routine-day-add-exercise`

- Route: `/routines/[id]/edit/day/[dayId]/add-exercise`
- Screen name: Add exercise to routine day
- Route owner file: `src/app/routines/[id]/edit/day/[dayId]/add-exercise/page.tsx`
- Primary surface owner: `src/app/routines/[id]/edit/day/[dayId]/EditDayAddExerciseScreen.tsx`
- Child surfaces:
  - `surface.exercise-chooser.header`
    - purpose: show picker identity and back context
  - `surface.exercise-chooser.search-bar`
    - purpose: own search and filter controls
  - `surface.exercise-chooser.result-list`
    - purpose: show selectable exercise result cards
    - variants: `variant.exercise-chooser.result-list.browsing`, `variant.exercise-chooser.result-list.selected`
  - `surface.exercise-chooser.goal-editor`
    - purpose: configure targets for the selected exercise
    - variants: `variant.exercise-chooser.goal-editor.invalid`, `variant.exercise-chooser.goal-editor.valid`
  - `surface.exercise-chooser.bottom-actions`
    - purpose: own `View` and `Add`
    - screenshot evidence: `tmp/routines-review/routine-edit-day-add-exercise-mobile-v3-header-match.png`

### `screen.15.session`

- Route: `/session/[id]`
- Screen name: Active session
- Route owner file: `src/app/session/[id]/page.tsx`
- Primary surface owner: `src/components/SessionPageClient.tsx`
- Child surfaces:
  - `surface.session.header`
    - purpose: show routine/session identity, duration, and top controls
    - variants: `variant.session.header.default`, `variant.session.header.focus-hidden`
    - screenshot evidence: `tmp/session-review/session-active-mobile-v1.png`
  - `surface.session.exercise-list`
    - purpose: host the stack of exercise cards
    - variants: `variant.session.exercise-list.default`, `variant.session.exercise-list.focused-exercise`
  - `surface.session.exercise-card`
    - purpose: display one exercise inside the active workout
    - variants: `variant.session.exercise-card.collapsed`, `variant.session.exercise-card.expanded`, `variant.session.exercise-card.completed`, `variant.session.exercise-card.skipped`, `variant.session.exercise-card.current`
  - `surface.session.set-rows`
    - purpose: show logged sets and inline edit affordances
    - variants: `variant.session.set-rows.default`, `variant.session.set-rows.editing`, `variant.session.set-rows.missing-data`
  - `surface.session.quick-add`
    - purpose: open session add-exercise flow
    - interaction edges: opens `screen.16.session-add-exercise`
  - `surface.session.sticky-controls`
    - purpose: own bottom add/finish controls and mobile sticky behavior
  - `surface.session.finish-flow`
    - purpose: confirm and complete session
    - variants: `variant.session.finish-flow.confirm`, `variant.session.finish-flow.saving`
  - `surface.session.destructive-confirm`
    - purpose: confirm delete/remove actions from the live logging flow

### `screen.16.session-add-exercise`

- Route: `/session/[id]/add-exercise`
- Screen name: Add exercise to session
- Route owner file: `src/app/session/[id]/add-exercise/page.tsx`
- Primary surface owner: `src/app/session/[id]/SessionQuickAddExerciseForm.tsx`
- Child surfaces:
  - `surface.exercise-chooser.header`
    - purpose: shared chooser identity with live-session wording
  - `surface.exercise-chooser.search-bar`
    - purpose: search and filter controls
  - `surface.exercise-chooser.result-list`
    - purpose: selectable result cards
    - variants: `variant.exercise-chooser.result-list.browsing`, `variant.exercise-chooser.result-list.selected`
  - `surface.exercise-chooser.goal-editor`
    - purpose: configure targets before adding to session
  - `surface.exercise-chooser.bottom-actions`
    - purpose: own `View` and `Add`
    - screenshot evidence: `tmp/session-review/session-add-exercise-mobile-v1.png`

### `screen.17.history`

- Route: `/history`
- Screen name: History overview
- Route owner file: `src/app/history/page.tsx`
- Primary surface owner: `src/app/history/HistorySessionsClient.tsx`
- Child surfaces:
  - `surface.history.header`
    - purpose: route identity and tab context
  - `surface.history.search-filter`
    - purpose: search, filter, and density controls
  - `surface.history.session-list`
    - purpose: show historical sessions
    - variants: `variant.history.session-list.default`, `variant.history.session-list.filtered`, `variant.history.session-list.empty`
    - screenshot evidence: `tmp/history-review/history-mobile-v1.png`
  - `surface.history.bottom-dock`
    - purpose: own `Detailed` and `Exercises`

### `screen.18.history-exercises`

- Route: `/history/exercises`
- Screen name: Exercise history list
- Route owner file: `src/app/history/exercises/page.tsx`
- Primary surface owner: `src/app/history/exercises/ExerciseBrowserClient.tsx`
- Child surfaces:
  - `surface.history.header`
    - purpose: route identity and tab context
  - `surface.history.search-filter`
    - purpose: search, filter, and density controls
  - `surface.history.exercise-list`
    - purpose: show exercise-centric history results
    - variants: `variant.history.exercise-list.default`, `variant.history.exercise-list.filtered`, `variant.history.exercise-list.empty`
    - screenshot evidence: `tmp/history-review/history-exercises-mobile-v1.png`
  - `surface.history.exercise-info-sheet`
    - purpose: show overlay exercise information from a history row
  - `surface.history.bottom-dock`
    - purpose: own `Detailed` and `Sessions`

### `screen.19.history-session`

- Route: `/history/[sessionId]`
- Screen name: Session history detail
- Route owner file: `src/app/history/[sessionId]/page.tsx`
- Primary surface owner: `src/app/history/[sessionId]/LogAuditClient.tsx`
- Child surfaces:
  - `surface.history-session.summary-card`
    - purpose: show session KPI and summary context
  - `surface.history-session.exercise-list`
    - purpose: show completed exercise cards
    - variants: `variant.history-session.exercise-list.default`, `variant.history-session.exercise-list.focused`
    - screenshot evidence: `tmp/history-review/history-session-detail-mobile-v1.png`
  - `surface.history-session.focused-editor`
    - purpose: edit sets, notes, and exercise data in audit mode
    - variants: `variant.history-session.focused-editor.edit-mode`, `variant.history-session.focused-editor.expanded-set-row`
  - `surface.history-session.destructive-confirm`
    - purpose: delete set, exercise, or session
  - `surface.history-session.bottom-dock`
    - purpose: own `Delete` and `Edit`

### `screen.20.exercise-redirect`

- Route: `/exercises/[exerciseId]`
- Screen name: Exercise detail/reference
- Route owner file: `src/app/exercises/[exerciseId]/page.tsx`
- Primary surface owner: redirect only
- Child surfaces:
  - `surface.redirect.exercise-detail`
    - purpose: validate `returnTo` and redirect safely
    - variants: `variant.redirect.exercise-detail.default`, `variant.redirect.exercise-detail.invalid-return`
    - screenshot evidence: none required

### `screen.21.settings`

- Route: `/settings`
- Screen name: Settings / account surface
- Route owner file: `src/app/settings/page.tsx`
- Primary surface owner: `src/components/settings/SettingsAccordionClient.tsx`
- Child surfaces:
  - `surface.settings.identity-header`
    - purpose: show user identity and page context
    - screenshot evidence: `tmp/settings-review/settings-mobile-v1.png`
  - `surface.settings.accordion-nav`
    - purpose: own expand/collapse triggers for settings sections
    - variants: `variant.settings.accordion-nav.all-collapsed`, `variant.settings.accordion-nav.section-expanded`
  - `surface.settings.account-form`
    - purpose: edit account fields and save
    - variants: `variant.settings.account-form.default`, `variant.settings.account-form.dirty`, `variant.settings.account-form.saving`, `variant.settings.account-form.success`
  - `surface.settings.preferences-panel`
    - purpose: hold non-account preferences and future theme harness location
  - `surface.settings.legacy-panel`
    - purpose: hold legacy import/migration status content
  - `surface.settings.sign-out-rail`
    - purpose: own destructive sign-out action

## Screenshot rule

For every real visual parent screen, capture:

1. default screenshot
2. mobile screenshot when layout meaningfully differs
3. each major child-surface variant
4. each major empty/loading/error/success state if reachable
5. modal, drawer, dropdown, or sheet states that change ownership, actions, or theme behavior

Redirect-only parent screens do not require screenshots unless they temporarily own a visible fallback state.
