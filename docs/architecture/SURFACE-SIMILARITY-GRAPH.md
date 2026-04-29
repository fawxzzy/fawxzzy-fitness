# Surface Similarity Graph

This graph records design-oriented similarity edges.

It is intentionally about mutation behavior, not just code reuse.

Similarity edges can connect:

- parent screen families
- child surface families
- element families

Navigation-only and open/close relationships belong in interaction edges inside `SCREEN-SURFACE-VARIANT-LEDGER.md`, not here.

## Parent screen families

### Auth and install family

- `screen.02.install` -> `screen.04.login`
  - edge: `shared-screen-family`
  - reason: both depend on the auth shell, auth card, and dock language
  - mutation expectation: `mutate-together`
- `screen.04.login` -> `screen.06.forgot-password`
  - edge: `local-exception`
  - reason: login owns the live reset-launch affordance, while `/forgot-password` is only a redirect alias into the auth family rather than its own stable visual surface
  - mutation expectation: `inspect-manually`
- `screen.04.login` -> `screen.05.signup`
  - edge: `shared-screen-family`
  - reason: both are pre-login form templates with shared field shell expectations
  - mutation expectation: `mutate-together`
- `screen.04.login` -> `screen.07.reset-password`
  - edge: `shared-screen-family`
  - reason: both are auth-form surfaces built from the same shell, input, footer, and dock contracts with different credential semantics
  - mutation expectation: `mutate-together`
- `screen.05.signup` -> `screen.07.reset-password`
  - edge: `shared-screen-family`
  - reason: reset form and signup form share auth-shell input and dock semantics
  - mutation expectation: `mutate-together`
- `screen.03.entry` -> `screen.02.install`
  - edge: `local-exception`
  - reason: install and entry are both transition screens, but install owns a stable pre-auth panel while entry mostly owns post-auth loading and redirect handoff
  - mutation expectation: `inspect-manually`
- `screen.03.entry` -> `screen.04.login`
  - edge: `local-exception`
  - reason: entry borrows the auth shell, card, and dock language only for its failure fallback; the default state is an authenticated handoff overlay rather than a credential form
  - mutation expectation: `inspect-manually`
- `screen.03.entry` -> `screen.07.reset-password`
  - edge: `local-exception`
  - reason: both own recovery-oriented fallback states inside auth-family chrome when the happy path cannot continue cleanly
  - mutation expectation: `inspect-manually`

### Today, routine day, and session family

- `screen.08.today` -> `screen.11.routine-day`
  - edge: `shared-screen-family`
  - reason: both render day identity plus exercise-row families
  - mutation expectation: `mutate-together`
- `screen.08.today` -> `screen.15.session`
  - edge: `same-state-language`
  - reason: current, completed, skipped, and progress meaning must stay coherent across pre-session and in-session contexts
  - mutation expectation: `mutate-together`
- `screen.15.session` -> `screen.19.history-session`
  - edge: `shared-screen-family`
  - reason: history session detail inherits much of the session card and set-row language in a read/edit context
  - mutation expectation: `inspect-manually`

### Routine planning family

- `screen.09.routines` -> `screen.10.routines-new`
  - edge: `shared-screen-family`
  - reason: both belong to routine-planning flows with shared dock and section-shell expectations
  - mutation expectation: `inspect-manually`
- `screen.10.routines-new` -> `screen.12.routine-edit`
  - edge: `shared-screen-family`
  - reason: they are new/edit twins for the same routine-details surface family
  - mutation expectation: `mutate-together`
- `screen.13.routine-day-edit` -> `screen.14.routine-day-add-exercise`
  - edge: `shared-screen-family`
  - reason: day editing and chooser flows are part of the same routine-composition journey
  - mutation expectation: `mutate-together`

### History family

- `screen.17.history` -> `screen.18.history-exercises`
  - edge: `shared-screen-family`
  - reason: both use the history header, search/filter controls, and bottom dock family
  - mutation expectation: `mutate-together`
- `screen.18.history-exercises` -> `screen.19.history-session`
  - edge: `shared-screen-family`
  - reason: both are history-owned detail/browse surfaces built on the same route family shell
  - mutation expectation: `mutate-together`

### Settings as validation harness

- `screen.21.settings` -> `screen.08.today`
  - edge: `local-exception`
  - reason: settings may become the theme harness, but its form and accordion surfaces must not collapse into Today's exercise surfaces
  - mutation expectation: `inspect-manually`
- `screen.21.settings` -> `screen.15.session`
  - edge: `local-exception`
  - reason: settings is a validator for session theme coverage, not a visual twin of session logging
  - mutation expectation: `inspect-manually`

## Child surface families

### Shared auth shell and form families

- `surface.auth.login-shell` -> `surface.auth.install-shell`
  - edge: `shared-auth-shell-family`
  - reason: both use the same auth shell/card backdrop language while swapping different route-local body content
  - mutation expectation: `mutate-together`
- `surface.auth.login-form` -> `surface.auth.signup-form`
  - edge: `shared-input-family`
  - reason: both are pre-auth credential forms built from the same field-shell and footer-link language
  - mutation expectation: `mutate-together`
- `surface.auth.login-form` -> `surface.auth.reset-form`
  - edge: `shared-input-family`
  - reason: login and reset both rely on the same auth-form primitives, disabled CTA behavior, and loading-state contract
  - mutation expectation: `mutate-together`

### Shared action and dock families

- `surface.auth.install-dock` -> `surface.auth.login-dock`
  - edge: `shared-bottom-dock-family`
  - reason: install and login both keep their primary route action in the auth-family bottom dock instead of inside the card body
  - mutation expectation: `mutate-together`
- `surface.auth.login-dock` -> `surface.auth.signup-dock`
  - edge: `shared-bottom-dock-family`
  - reason: both are single-primary auth submission docks with the same disabled and loading semantics
  - mutation expectation: `mutate-together`
- `surface.auth.login-dock` -> `surface.auth.reset-dock`
  - edge: `shared-bottom-dock-family`
  - reason: login and reset share one-button auth dock behavior even though the copy and credential semantics differ
  - mutation expectation: `mutate-together`
- `surface.auth.install-dock` -> `surface.auth.signup-dock`
  - edge: `shared-bottom-dock-family`
  - reason: install now uses the same dock-owned action family as other auth surfaces even when the panel only carries explanatory copy
  - mutation expectation: `mutate-together`
- `surface.entry.fallback-dock` -> `surface.auth.install-dock`
  - edge: `shared-bottom-dock-family`
  - reason: both use split auth-family dock actions with a primary positive path plus a secondary support action
  - mutation expectation: `inspect-manually`
- `surface.today.sticky-dock` -> `surface.session.sticky-controls`
  - edge: `shared-bottom-dock-family`
  - reason: both are workout-journey sticky action hosts
  - mutation expectation: `mutate-together`
- `surface.routine-editor.bottom-dock` -> `surface.history-session.bottom-dock`
  - edge: `local-exception`
  - reason: both are bottom rails, but one is form commit and one is audit/destructive
  - mutation expectation: `mutate-separately`

### Shared card and row families

- `surface.today.exercise-list` -> `surface.routine-day.exercise-list`
  - edge: `shared-card-family`
  - reason: both are day-level exercise-row stacks
  - mutation expectation: `mutate-together`
- `surface.today.exercise-list` -> `surface.session.exercise-list`
  - edge: `same-state-language`
  - reason: today resume rows and live-session cards share skipped/current/completed meaning
  - mutation expectation: `mutate-together`
- `surface.session.exercise-list` -> `surface.history-session.exercise-list`
  - edge: `shared-card-family`
  - reason: history session cards reuse the same exercise summary language with different editing affordances
  - mutation expectation: `inspect-manually`
- `surface.routines.day-list` -> `surface.history.session-list`
  - edge: `same-visual-role`
  - reason: both are metadata-heavy tappable data lists
  - mutation expectation: `inspect-manually`

### Shared chooser families

- `surface.exercise-chooser.header` in `screen.14.routine-day-add-exercise` -> `surface.exercise-chooser.header` in `screen.16.session-add-exercise`
  - edge: `shared-screen-family`
  - reason: same chooser shell with different submit semantics
  - mutation expectation: `mutate-together`
- `surface.exercise-chooser.result-list` in `screen.14.routine-day-add-exercise` -> `surface.exercise-chooser.result-list` in `screen.16.session-add-exercise`
  - edge: `shared-card-family`
  - reason: same selectable result-card family
  - mutation expectation: `mutate-together`
- `surface.exercise-chooser.goal-editor` -> `surface.session.set-rows`
  - edge: `shared-input-family`
  - reason: both expose measurement and target-entry controls
  - mutation expectation: `inspect-manually`

### Shared overlay and interruption families

- `surface.today.discard-confirm` -> `surface.routine-editor.discard-confirm`
  - edge: `same-semantic-role`
  - reason: both confirm abandoning or destroying in-progress work
  - mutation expectation: `mutate-together`
- `surface.routine-editor.delete-confirm` -> `surface.session.destructive-confirm`
  - edge: `same-state-language`
  - reason: destructive confirm language must stay stable across edit and live-session contexts
  - mutation expectation: `mutate-together`
- `surface.history.exercise-info-sheet` -> `surface.exercise-chooser.goal-editor`
  - edge: `must-not-coalesce`
  - reason: both appear as secondary layers, but one is informational and the other is action/configuration-focused
  - mutation expectation: `mutate-separately`

## Element families

### Action elements

- `element.action.primary-button` -> `element.action.primary-dock-button`
  - edge: `same-semantic-role`
  - reason: both commit or continue the user to the next state
  - mutation expectation: `mutate-together`
- `element.action.destructive-button` -> `element.action.confirm-destructive-button`
  - edge: `same-state-language`
  - reason: destructive meaning must remain stable across inline and modal contexts
  - mutation expectation: `mutate-together`
- `element.action.primary-button` -> `element.navigation.segmented-active`
  - edge: `must-not-coalesce`
  - reason: selection context is not the same semantic role as primary submit/commit
  - mutation expectation: `mutate-separately`

### Field elements

- `element.field.auth-input` -> `element.field.settings-input`
  - edge: `shared-input-family`
  - reason: both now depend on the same field-shell language
  - mutation expectation: `mutate-together`
- `element.field.settings-input` -> `element.field.measurement-input`
  - edge: `shared-input-family`
  - reason: both are editable field shells, but inline measurement state is denser and more stateful
  - mutation expectation: `inspect-manually`

### Progress and row-end elements

- `element.today.exercise-progress-count` -> `element.session.exercise-progress-count`
  - edge: `same-state-language`
  - reason: `# / #` logged-set progress should read consistently across Today and Session
  - mutation expectation: `mutate-together`
- `element.today.exercise-progress-count` -> `element.history.exercise-metadata-count`
  - edge: `must-not-coalesce`
  - reason: progress counts are live-state meaning, not passive metadata
  - mutation expectation: `mutate-separately`
- `element.row.chevron` -> `element.row.trailing-action`
  - edge: `same-visual-role`
  - reason: both occupy row-end navigation/action affordance slots
  - mutation expectation: `inspect-manually`

## Mutation-sensitive exception list

These surfaces need explicit inspection during any future theme prototype:

- `surface.session.exercise-card`
- `surface.today.exercise-list`
- `surface.install.primary-panel`
- `surface.history.search-filter`
- `surface.history.exercise-info-sheet`
- `surface.routine-day-edit.expanded-editor`
- `surface.settings.accordion-nav`

## Surfaces that should stay separate

- segmented active state vs primary submit button
- success/completed workout card vs selected/current workout card
- settings accordion trigger vs workout card row
- install info panel vs auth form panel
- overlay sheet chrome vs normal page card
