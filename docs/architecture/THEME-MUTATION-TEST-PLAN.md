# Theme Mutation Test Plan

This is the docs-based acceptance test for Pass 2.

Pass 2 succeeds if a later theme prototype can predictably mutate major surface families without manual hunting.

That validation now applies to both:

- parent screen templates
- child surfaces and meaningful variants inside those screens

## Baseline

Theme A is the current default app.

Future test variants can include:

- Theme B: high contrast
- Theme C: rounded / soft
- Theme D: sharp / compact
- Theme E: dark mode / low-light variant
- Theme F: high-energy fitness accent variant

Pass 2 does not build those themes. It only maps what they should affect.

## Validation layers

### Layer 1: parent screen coverage

Confirm docs can predict which first-class route templates should visually respond to a mutation.

Examples:

- `/install`
- `/login`
- `/today`
- `/session/[id]`
- `/history`
- `/settings`

### Layer 2: child surface coverage

Confirm docs can predict which in-screen surfaces should mutate together or stay separate.

Examples:

- auth shell card vs install info panel
- today exercise list vs session exercise list
- chooser result list vs history result list
- settings accordion nav vs settings account form

### Layer 3: surface variant coverage

Confirm docs can predict whether expanded cards, selected rows, skipped/completed states, dropdowns, modals, drawers, sheets, inline editors, empty states, and sticky mobile controls respond correctly.

Examples:

- expanded session exercise card
- today skipped row
- reset-password expired fallback
- history exercise info sheet
- routine edit discard confirm
- mobile sticky dock states

## Mutation matrix

| Mutation | Should change globally | Must preserve meaning | High-risk exceptions |
| --- | --- | --- | --- |
| primary action color | primary buttons, dock primary buttons, key submit actions | destructive stays destructive, success stays success | segmented active states, current/selected cards |
| secondary control color | neutral buttons, inactive segmented options, low-emphasis controls | warning and destructive do not drift into neutral | nav shell hover/active text |
| app background color | app page shell, ambient-compatible base surfaces | overlay readability, text contrast | ambient/background decorative layers |
| card/surface color | shared cards, section shells, auth cards, history cards | state meaning remains legible | exercise-card local gradients |
| border color | panel borders, selection borders, input borders, nav shell borders | focus ring remains readable | overlay chrome literals |
| text color | titles, subtitles, metadata, body text | disabled and muted hierarchy remains clear | local history/editor captions |
| button radius | `AppButton`, `BottomDockButton`, auth buttons | segmented controls still feel related | local button-like links |
| card radius | `AppPanel`, `SurfaceCard`, shared sections, exercise cards | sheet/top-only radii may diverge intentionally | nav shell, sheet chrome |
| input radius | `Input`, auth fields, measurement fields | inline editors remain usable | measurement side-label shells |
| spacing density | section gaps, card padding, row padding | tap targets remain safe | mobile-only picker trays and sticky bars |
| shadow/elevation | panel shadows, nav shell, floating headers, sheets | status meaning must not rely only on shadow | overlay and nav families |

## Variant checklist by surface family

### Auth and install

Validate:

- default auth form state
- submitting/error auth form state
- remembered-account or recovery branch
- install iOS gate variants
- install bottom dock

Watch for:

- install info panel keeping old border/background values
- auth field shells mutating differently from settings-style field shells
- dock primary action changing while in-card action language does not

### Today, session, and routine-day

Validate:

- today planned-day list
- today resume-state list
- skipped today row
- completed today row
- session collapsed card
- session expanded card
- set-row editing state
- finish-session flow
- mobile sticky controls

Watch for:

- current/selected/completed/skipped meaning collapsing into one accent
- row-end progress count and chevron drifting apart
- sticky action rail mutating differently from auth/editor docks

### Routine editing and chooser flows

Validate:

- routine details form
- day editor default list
- expanded inline day editor
- reorder mode
- chooser selected result
- chooser invalid/valid goal editor
- discard/delete confirmations

Watch for:

- chooser selected state reading like success/completed state
- inline measurement controls mutating differently from shared field shells
- destructive confirms borrowing primary-action color logic

### History family

Validate:

- history sessions list
- history exercises list
- exercise info sheet
- history session detail summary
- history focused audit editor

Watch for:

- filter/search chrome mutating separately from the rest of history family
- exercise info overlay keeping old scrim/panel values
- audit editor fields failing to match shared field shells

### Settings family

Validate:

- identity header
- accordion trigger surface
- expanded account form
- status/success/error messaging
- sign-out rail

Watch for:

- accordion triggers inheriting card colors but not border/radius rules
- settings field shells drifting away from login/signup/reset fields
- destructive sign-out reading like a neutral secondary action

## Screenshot requirement

For each real visual parent screen, capture:

1. default screenshot
2. mobile screenshot if meaningfully different
3. each major child-surface variant
4. each major empty/loading/error/success state if reachable or forceable
5. modal, drawer, dropdown, sheet, or sticky-control states

Pass 2 does not require that every screenshot exists immediately, but every required screenshot should be called out in the child-surface ledger.

## Pass/fail criteria

### Pass

- docs can predict which parent screens change globally
- docs can predict which child surfaces mutate together
- docs can predict which variants need dedicated inspection
- docs identify which misses are expected due to current debt
- semantic meaning remains distinct after planned mutation

### Fail

- global mutation target is unclear from docs
- child surfaces are flattened into route-only summaries
- expanded cards, drawers, modals, sheets, or inline editors are undocumented
- local exceptions are undocumented
- status/destructive/current/success meanings would collapse under mutation

## Feedback loop after future prototype

When the future theme prototype reveals misses, treat them as mapping feedback:

1. identify missed surface or variant
2. decide whether it should be global or local
3. update the screen/variant ledger and similarity graph
4. extract the stronger contract
5. only then refactor or promote

That is the intended value of this pass.
