# State Visibility Matrix

This matrix records which styling decisions are driven by interaction state, which are driven by product meaning, and what gates visibility.

Pass 2 state ownership is now explicit at three levels:

1. parent screen state
2. child surface state
3. element state

## State ownership rules

### Parent screen state

Use parent-screen state when the whole route changes meaningfully.

Examples:

- `/today` planned day vs active session
- `/routines` active-routine day list vs browse-all-routines list
- `/reset-password` authenticated form vs expired fallback

### Child surface state

Use child-surface state when one meaningful area changes without changing the entire screen.

Examples:

- session exercise card collapsed vs expanded
- settings accordion collapsed vs expanded
- history filter panel closed vs open
- install iOS gate variant vs desktop default

### Element state

Use element state for interaction and status behavior inside a stable surface.

Examples:

- button default, hover, active, disabled
- input focus, validation warning, filled
- card selected, completed, current, skipped

## Parent-screen state matrix

| Parent screen | Route-level states | Visibility drivers | Notes |
| --- | --- | --- | --- |
| `screen.02.install` | desktop default, iOS add-to-home, iOS open-in-safari | server-seeded install context, platform gate, standalone mode, native install availability | route meaning changes because different gate surfaces replace the default panel, and forced-state screenshot review is only trustworthy when the server route and client surface start from the same install context |
| `screen.03.entry` | bootstrap loading, redirect-to-home, redirect-to-curated-boundary, fallback error | auth guard, profile bootstrap, local gate-state storage, curated flag, existing-program presence | no unauthenticated visual state exists because `requireUser()` redirects before mount; the visible route contract is transient handoff plus auth-family fallback |
| `screen.04.login` | manual auth default, remembered-account choice, remembered credential step, route-message toast, authenticated-session redirect | client session probe, remembered-login storage, route error/info params, credential-step toggle, submit state | the shared auth shell stays fixed while form, footer, and dock ownership change below it; invalid input is mainly a disabled CTA state rather than an inline field-error surface |
| `screen.07.reset-password` | authenticated form, expired fallback, recovery bootstrap | recovery session and token validity | fallback route state should not be flattened into the form state |
| `screen.08.today` | planned day, active session, empty/degraded | active routine, in-progress session, fetch state | one of the highest-value parent-state splits in the app |
| `screen.09.routines` | active routine day list, browse routines, empty | active routine presence, query/view state | route-level state changes list ownership and bottom actions |
| `screen.11.routine-day` | runnable day, rest day | day type and canonical plan state | rest state is its own route-owned surface |
| `screen.15.session` | active logging, focus mode, finish flow, error/degraded | session validity, selected exercise, save state | route-level state changes sticky controls and header visibility |
| `screen.17.history` | session-history mode, filtered/empty | tabs, filters, search | parent state matters for result ownership |
| `screen.18.history-exercises` | exercise-history mode, filtered/empty | tabs, filters, search | paired route state with screen 17 |
| `screen.21.settings` | section-expanded, all-collapsed, saving/error | accordion selection, form dirty/save state | route meaning changes as section ownership shifts |

## Child-surface state matrix

| Child surface family | Surface states | Visibility gates | Product meaning ties | Notes |
| --- | --- | --- | --- | --- |
| `surface.today.exercise-list` | planned, resume, skipped-row, completed-row | active session state, row data | current day progress | `# / #` progress, skip tone, and completion tone must stay distinct |
| `surface.session.exercise-card` | collapsed, expanded, completed, current, skipped | selected exercise, logged data, skip state | live logging meaning | high-risk theme surface because product meaning is carried by tone and layout |
| `surface.session.set-rows` | default, editing, missing-data | expanded card and logged sets | workout logging control | editing state changes action set and density |
| `surface.routine-day-edit.expanded-editor` | closed, open | selected exercise row | routine template editing | inline editor is not just a visual tweak; it changes actions and inputs |
| `surface.exercise-chooser.result-list` | browsing, selected | selection state and filters | picker decision path | selected result must not collapse into success styling |
| `surface.history.exercise-info-sheet` | closed, open | row selection | reference/inspection context | overlay motion and chrome matter here |
| `surface.settings.accordion-nav` | collapsed, section-expanded | current section choice | settings navigation | expansion changes which child surface owns the screen body |
| `surface.routine-editor.discard-confirm` | hidden, shown | dirty-exit guard | destructive/reversible choice | belongs in surface ledger, not only in route notes |

## Element-state matrix

### Button and control family

| Surface | States | Visibility gates | Product meaning ties | Notes |
| --- | --- | --- | --- | --- |
| `AppButton` | default, hover, active, disabled, loading | visible when route action is available | primary vs secondary vs destructive action | color and border are intent-driven; loading overlay needs contrast verification |
| `BottomDockButton` | default, active press, disabled, loading | shown only when dock host publishes actions | commit, cancel, destructive, toggle | strong global mutation target; intent comes from dock action metadata |
| auth `Input` field | default, focused, active-valid, disabled-hidden branch | shown when the login/reset/signup surface exposes manual credentials | identifier/password entry, validation readiness | the base field shell is shared, but login validity emphasis is still route-local and should not be mistaken for a separate screen variant |
| `SegmentedControl` | default, active, focus, keyboard navigation | visible when alternate views or modes exist | current view, selected mode | active state and inactive state should mutate together across history and chooser surfaces |
| `AppNav` tab | default, hover, active, pending | hidden on auth/install routes, visible on tabbed app routes | route identity, pending navigation | active text/icon/pending dot are product-meaning states, not just generic accent usage |

### Card and row family

| Surface | States | Visibility gates | Product meaning ties | Notes |
| --- | --- | --- | --- | --- |
| `ExerciseCard` | default, selected, active, completed, skipped, empty, disabled press | visible when a workout row or exercise summary exists | current exercise, completed set history, skipped work, attention/needs-setup state | this family mixes interaction state and product meaning in the same visual shell |
| history session cards | compact, detailed, selected, disclosure open | depends on filters, history data, view mode | selected session, PR summary, metadata density | history density is route state; PR and selection tones are product meaning |
| `SurfaceCard` / `AppPanel` | default, dense variant | shown when section or summary panel exists | summary grouping | base panel is mostly state-agnostic |
| `EmptyState` | default, optional action | visible when collection is empty or blocked | no data, onboarding prompt, missing setup | empty-state icon tile currently owns local shape/background styling |

### Input and field family

| Surface | States | Visibility gates | Product meaning ties | Notes |
| --- | --- | --- | --- | --- |
| `Input` | default, focus, disabled | visible when editable text input is allowed | generic entry | many inline editors still bypass the shared input shell |
| measurement field family | default, focus, validation warning, filled, compact/wide layout | depends on enabled measurement types, cardio vs strength mode, inline editor expansion | workout logging control | one of the main shape and spacing mutation targets |
| auth fields | default, ready, pending, error | depend on remembered-login state, recovery state, signup/login flow | authentication identity and readiness | shared shell exists, but state ownership still lives partly in route logic |

### Modal, sheet, and overlay family

| Surface | States | Visibility gates | Product meaning ties | Notes |
| --- | --- | --- | --- | --- |
| `BottomSheet` | closed, opening, open, closing | route/client state controls mounting | chooser, exercise info, modal task | overlay state is motion-sensitive and tied to escape/backdrop behavior |
| `ConfirmDestructiveModal` | hidden, shown, confirming, disabled | only shown for destructive flow | destructive confirmation | must preserve destructive meaning during theme mutation |
| exercise info sheet | closed, open | visible from info affordance | educational detail, taxonomy context | uses overlay chrome plus local info-card clusters |

## Route-family visibility gates

| Route family | Gate type | Examples | Styling impact |
| --- | --- | --- | --- |
| Auth/install/entry | auth session, recovery token, standalone mode, native install availability, server/client install-context parity for forced review, remembered-login storage, route message codes, post-auth destination resolution | `/install`, `/entry`, `/login`, `/reset-password` | controls whether dock, shell copy, install gate card, remembered-account branch, route toast, or transient handoff/fallback state is shown; `/install` and `/entry` review routes must distinguish stable visual surfaces from transient gate logic before screenshot evidence is trusted |
| Today/session | active session presence, runnable day, recovery shadow placement, queued sync state | `/today`, `/session/[id]` | influences badge tones, sticky actions, offline indicators |
| Routines | existing routines, rest-day toggle, inline edit mode | `/routines`, edit-day routes | affects empty states, toggle tones, reorder handles, add-exercise affordances |
| History | preview mode, filters open, view mode, selected session | `/history`, `/history/exercises`, detail route | affects tabs, floating header content, density, filter panel visibility |
| Settings | optional legacy bridge env, accordion expansion | `/settings` | influences warning/success status messaging and section visibility |

## Product-meaning color rules

These meanings must survive theme mutation:

- destructive remains destructive
- warning remains warning
- success/progress remains success/progress
- selected/current remains distinct from success
- skipped remains distinct from disabled
- disabled remains visibly disabled
- pending/loading remains legible without stealing destructive or success meaning

## Known state-coverage gaps

- `ExerciseCard` selected/active/completed/skipped states still rely on local tone clusters
- generic `Input` and measurement field family are related but not unified enough to guarantee shared state mutation
- `AppNav` active/pending states are local to nav instead of clearly derived from shared semantic tokens
- install notice cards and some auth helper surfaces use literal borders/backgrounds outside shared state language
- overlay chrome owns its own scrim, blur, and shadow language instead of a documented overlay token family
