# Fitness Design Contract

The one rule sheet for every Fitness screen, current and future. It sits on top of the existing owner docs and does not replace them:

| Layer | Owner doc | What it owns |
|---|---|---|
| Frozen token pack | `truth-pack/fitness/design-system/` (`tokens.v1.json`, `primitives.v1.json`), see `FITNESS-DESIGN-SYSTEM.md` | spacing, type, colour, radius, shadow values; ids `header, card, badge, section-layout` |
| Card system | `CARD-SYSTEM.md` | card surface, header, controls, chips, action row, per-screen decisions D1-D51 |
| Loader | `LOADER-SPEC.md` (shared with Mazer) | loading screen timing, geometry, colours |
| This contract | `DESIGN-CONTRACT.md` | app-wide decisions where screens disagreed: colour, type, dock, inputs, toasts, states, copy, flows, a11y, known violations |

Rule: when this file and an older doc disagree, this file wins and the older doc gets a pointer (done for `CARD-SYSTEM.md` section 4.5). A new design starts here, then reads the owner doc for the area it touches.

Evidence base: the 2026-11-15 screen gallery (184 phone shots at 390x844, DPR3, dark, standalone; QA and fixture data only). Shot ids below (for example `pub--login-err-confirm_failed`) are the gallery's ids; the gallery itself is a local folder and is not committed. Gallery limits: pixel sizes were read off downscaled sheets (estimates, not DOM measurements), and production shots may predate the gallery commit, so every row in section 11 must be re-measured in the redesign lane that fixes it.

How to read the decisions: each conflict found in the gallery is decided here, with the reason in one line. "Canonical" means new work follows it and old screens migrate to it when touched.

## 1. Principles (inherited, restated once)

1. One surface, one header, one control set, one status vocabulary (`CARD-SYSTEM.md` section 2).
2. Tokens and theme variables only: no hex, no per-screen radius, no restated button chrome (`!` utilities are banned outside `cardTokens.ts`).
3. Mobile first at 390x844; correct at 320x568 and 430x932; no horizontal page scroll and no scroller nested in a card.
4. Colour is never the only signal: pair tone with text, a glyph or a label.
5. Deterministic presentation: props in, markup out; no timers that rotate content; dates are local-day truth.
6. Content first, chrome second: the dock and toasts never hide page titles or the last row of content.

## 2. Colour

Source of values: `src/app/globals.css` `:root` theme variables (default theme). Themes (rose, test, others) change `--accent*` only; every rule below is expressed in variables so themes keep working.

| Role | Token | Default value | Use |
|---|---|---|---|
| Page | `--bg-0` | `7 17 27` (`#07111b`) | page background, manifest colours, loader backdrop |
| Panel / card / shell | `--bg-1`, `--surface-2-rgb`, `--surface-3-rgb` | see `:root` | glass surfaces |
| Text | `--text-primary` / `--text-secondary` / `--text-muted` | `244 248 252` / `205 217 232` / `144 164 188` | primary copy / meta / helper and legends |
| Accent (the green) | `--accent`, `--accent-strong` | `32 151 78`, `68 168 106` | selected, current, primary action, success, focus ring |
| Warning | `--warning-rgb` | `240 178 78` | attention state only (rest, needs setup, PR/Best) |
| Danger | `--danger-rgb`, `--button-destructive-*` | `238 62 78` | destructive actions, errors |
| Brand mark | `#c8ed66` (loader ring only) | n/a | the app icon and the loader ring; never a UI colour |

Decisions:

- **C1. One green: `--accent` (emerald).** The gallery found lime (`#a8e063`-like: auth and public screen legends, links, divider bars, the Sign in gradient) against emerald in-app. Emerald wins because it is the theme variable every in-app control, the focus ring and all themes already use; lime exists in code only as the loader/icon brand ring (`#c8ed66`, LOADER-SPEC), which stays because the loader is shared with Mazer. Auth and public screens migrate to `--accent` / `--accent-strong`; the lime Sign in gradient becomes the standard primary button (section 4.2).
- **C2. One page colour: `--bg-0` navy.** The gallery found a flat `#06131d`-like splash and a near-black green auth shell (`#070b09` plus emerald glows in `designSystem.ts` `auth.shell*`). `--bg-0` is already the loader backdrop and manifest colour, so the auth shell and every splash use it; the auth glows may stay as a faint overlay but not as a different base colour.
- **C3. Amber means attention, never "secondary".** Amber is for rest, needs-setup, PR and Best. It is not a button colour or a selected colour (it measured about 3:1 on dark brown, `auth-lab--entry-handoff-error`, `dev--stretch-session-preview`).
- **C4. Selected is always green** (`current` tone plus a SELECTED chip or `aria-pressed`); the History progression tab control used amber for the active tab (`mr--history-progression-default`) and migrates to green.
- **C6. App backdrop (Zac 2026-11-19, lane D).** Screens may opt out of the animated ambient scene for a static, token-only backdrop (`AppBackdrop`, `src/lib/ambient/app-backdrop.ts`, `.app-backdrop` in `globals.css`): CSS gradients only, aria-hidden, pointer-events none, absolute (no layout), a safe-area scrim top and bottom. Three looks are compared live on `/dev/today-backgrounds`: aurora, grid, contour. **Today ships aurora** because it is gradients only (nothing behind a card can read as a glyph, the class of artifact behind the Switch Day "+" report), it keeps text contrast highest (contour lines cross headings; grid dots read as specks), and it is the cheapest to paint. Other screens keep the ambient scene until they opt in.
- **C5. Text on any surface meets 4.5:1** (3:1 for 18px+ or non-text UI). `toggleInactive` at 3.66:1 and disabled amber text at about 3:1 (`auth-lab--entry-handoff-error`, `real--session-id--active-workout-logger`) are violations, not styles.

## 3. Surfaces and the left bar

- Page = `--bg-0`. Card = `CardSurface` (glass `base`, 1px theme outline, `--card-radius`, no drop shadow in lists). Sheets and modals use an opaque surface (see 8.3), never a translucent one over visible content.
- **C6. Left bar (rail) = tone, 4px, always present on a card.** One meaning per colour: green `current` (selected, today, active), green `logged` (in session / logged), `completed` (done), amber `attention` (rest, needs setup, no data to act on), neutral (everything else). Cards without any status still carry the neutral rail; rail-less cards (`mr--today-empty`, `dev--history-preview-status`) are violations. Reason: a missing rail reads as a different card family.
- Unselected list rows are neutral; amber rails on unselected picker rows (`mr--add-exercise-default`, `real--routines-id-edit-day-dayid-add-exercise--add-exercise-picker`) and amber for "no history yet" (`real--history-exercises--exercise-browser`) are replaced by neutral, with the state in text ("No rep history yet." stays).
- Empty/placeholder cards are dashed (`CardSurface empty`). Nested cards inside a card are not allowed (`routine-editor--new-routine` sheet rows); use `StatBlock`/`StatGrid` or divided rows.

## 4. Components

### 4.1 Card, header and chips

Defined in `CARD-SYSTEM.md` (anatomy, primitives, 44px controls, one affordance per card). This contract adds:

- **C7. One status vocabulary, spelled in `cardStatusChips`.** Chip set: `ACTIVE, TODAY, IN SESSION, DONE, SKIPPED, REST, OPTIONAL, SELECTED` (cards) plus `PR, BEST, PROMOTION, REGRESSION, WATCH, MANUAL` (progression and history signals; full words, D50) plus `EARNED, LOCKED` (achievements and Pro unlocks). Look: 11px uppercase text in a tone-coloured outlined pill with `px-2.5 py-1` (the `uisys--default` chips are the reference), tones neutral / current(green) / success(green) / attention(amber) / danger(red). The text chip carries meaning; glyph only for DONE (check) and SKIPPED. Retired looks: grey MANUAL, text-only PROMO, 9px uppercase TYPE chip, circle PR badge, NOT EARNED (use no chip for an unearned item, or a neutral `LOCKED`).
- Counts and facts are meta text, not chips; duplicate chips are dropped (`dev--exercise-detail-cardio` repeats "Cardio").
- Header grammar (**C8**): superseded by section 15 (one `ScreenHeader`, left-aligned, single-line title). The separator rule still holds: facts are joined by ` · ` (middle dot), never colon, pipe or bullet.
- Chevron grammar: right = navigates, down = expands (CARD-SYSTEM 4.1); applies to Settings rows too.

### 4.2 Buttons and the dock

Buttons: `--button-height` 48px (`sm` 40px visual, 44px hit area), radius `--button-radius`, 15px / 650 (`--button-*` tokens). Four intents, one look each:

| Intent | Look | Use | Where |
|---|---|---|---|
| primary | `--button-primary-*`: dark fill, `--accent` border, primary text | the one forward action | right slot of the dock; Sign in; Save; Confirm |
| secondary / neutral | `--button-secondary-*`, full-strength text | back, cancel, switch, add, edit | left slot of the dock; in-card actions |
| destructive | `--button-destructive-*`: dark red fill, red border | delete, discard, sign out of everywhere | left slot, never the right |
| text (ghost) | `--button-ghost-*` | tertiary only: Hide, Clear filters | inline, still 44px hit area |

Decisions:

- **C9. Dock = actions of this screen, at most two buttons, destructive or neutral on the left, primary on the right.** Never three, never a full-width pair of equal weight. A single action is full width and primary.
- **C10. Amber is retired as a dock/button colour** (C3). "Switch Day", "Back", "Cancel", "Add", "Workout Plans", "View Detailed" are neutral secondary. Reason: one neutral style; amber text on dark brown fails contrast and made the dock pair differ per state (`mr--today-default` amber, `mr--today-rest` grey, `real--today--default-routine-day-exercises` red).
- **C11. Terminal vs additive:** in a live session, `Finish` is primary and `Add` is secondary (`mr--active-workout-session`: both were green). `Discard` is destructive and requires the confirm modal (8.3).
- **C12. Dock labels:** 1-2 words, at most 14 characters, one line at 320px; no label wraps (`Workout Plans`, `View Detailed`, `View Compact`, `Discard Workout`, `Resume Workout` all wrap today). Verb first, object only when two screens would collide. Canonical set: `Start`, `Resume`, `Finish`, `Add`, `Add Day`, `Add Exercise`, `New Routine`, `Create Day`, `Edit`, `Save`, `Delete`, `Discard`, `Back`, `Cancel`, `Confirm`, `Switch Day`, `Export`, `Upgrade`. Longer meaning goes in the screen, not the button. A disabled primary uses `aria-disabled` and still shows what is missing in text (`Enter routine name` as helper, not as the button label).
- Dock never decides content: pages reserve `FIXED_CTA_RESERVE_CLASS` (92px plus safe area) at the bottom so the last card, footer links and helper text are never covered (`real--history--sessions-overview-with-data`, `settings-cards--pro-pro`, `real--account--signed-in-account-screen`). A screen shows only actions that apply in context: no Export on Settings root or Achievements (`mr--settings-default`).
- Two save buttons on one page are forbidden (`Update password` in card plus `Save` in dock, `real--account--signed-in-account-screen`): the dock holds the page's save; a card has no second one.

### 4.3 Section switching: segmented control, not dock

- **C13. Switching views of one section is a segmented control at the top of the content; the dock is for actions.** History Sessions / Exercises / Progression use the segmented control directly under the History header; `View Exercises`, `View History` dock buttons are gone (H0). Density (Compact / Detailed) is the header's one trailing icon action (section 15), not a dock button. Segments: 44px tall, equal width, active = green fill (C4), 3 segments max at 390px, labels 1 word. Reason: dock buttons swap the page the user is on; a segmented control says "same place, other view" and removes the wrapping labels.
- The bottom tab bar (Today / Routines / History / Settings, 15.6) is the app navigation; a screen never has both a tab and a segmented control that change the same thing, and no dock repeats a tab (no `Routines` / `Today` dock buttons).

### 4.4 Form inputs

- **C14. One field recipe:** visible 11px uppercase label above the field (not on the border), 44px minimum height, `--radius-sm` (16px), 16px input text (stops iOS zoom), helper text 12px muted below, error text 12px danger with the "!" glyph below. Reason: legends sitting on the border at 8-9px collide with the border and cannot wrap (`mr--add-exercise-custom-taxonomy`, `auth-lab--login`); underline inputs (`dev--curated-onboarding`) are a second style and migrate.
- Placeholder is an example, never the label, and meets 4.5:1 (`routine-editor--new-day`).
- **C15. Native controls:** no native `<select>` (use `AppListboxField`; History progression filters and the routine editor weekday anchor migrate). Date: native `<input type="date">` is allowed because the OS picker is the best phone picker and keeps local-day truth, but only inside the standard field (44px, label above, `color-scheme: dark`, accent from the theme); never a bare browser control (`mr--history-progression-default`, `mr--settings-data-export`, `routine-editor--editor-open`).
- Steppers: 44x44 buttons with a 16px glyph, value 16px / 600, label 11px (`SETS`, `MIN REPS`, `MAX REPS` must not wrap: use `Min reps` on one line or put the label above).
- Toggles/switch: a real switch control with a visible on/off state and a text state; copy `Off: a training day...` is helper text, not the control (`routine-editor--new-day`).
- Password field: the eye button shows the action (eye = show, crossed eye = hide) and is a 44px target.

### 4.5 Toasts and inline messages

- **C16. Toasts never cover a title.** Today the toast host is `fixed right-3 top-[...]` (`ToastProvider.tsx`) and covers the 36px auth title on every auth error (`pub--login-err-*`, `pub--signup-err-*`). Canonical: (a) auth and public screens show their message as an inline message block above the form (the `auth.messageClassName` family, role `alert` for error and `status` for info), not a toast; (b) in-app notices (the toast host, `data-app-notice-stack`) anchor top-right just under the header row: `top: var(--app-notice-top)`, inset by `var(--app-notice-inset-x)` (the screen gutter), up to `var(--app-notice-max-width)` (26rem) wide and only as wide as the message, text left-aligned across the whole box with a 44px dismiss target. `--app-notice-top` falls back to the top chrome offset in `globals.css`; `MobileScreenShell` (`useAppNoticeAnchor`) measures the element marked `data-app-notice-anchor` (else the floating header, else the top chrome) and sets it 8px below, so a header that grows (for example a menu button row) moves the notices with it. Info/success auto-dismiss after 2.2s, errors after 6s; a screen-owned error the person must read (Today's `?notice=` / `?error=`) is persistent until dismissed. (Revised 2026-11-19, Today review: bottom notices sat over the dock and the last rows of content.) Layer stays 110 (above the loader cover 95, below modals 120). In flow (2026-11-23): `MobileScreenShell` has a notice slot between the header and the scroll area; error notices render there (content moves down) instead of floating, and a screen that passes `noticesInFlow="all"` renders every tone there. Above the dock (2026-11-24, replaces `noticesInFlow="all"` on the live workout, where an in-flow notice moved every card down): a screen that passes `noticePlacement="above-dock"` (`MobileScreenShell`, `MobileScreenScaffold`, `ScrollScreenWithBottomActions`) gets an absolutely positioned, pointer-events-none slot (`data-app-notice-placement="above-dock"`) pinned 8px above the bottom dock, outside the scroll area; every tone renders there, one notice at a time (a new one replaces the old), so a notice never moves a card and never sits over the header (it can sit for up to 4s over card content that is passing the band just above the dock; zero overlap would need a permanently reserved band). Info and success dismiss after 4s (`DOCK_NOTICE_DURATION_MS`); errors stay until dismissed, tapped, or the next action (a press on any other control). Role `status`, errors `alert`. The scroll area reserves the band (`--app-dock-notice-band`, default 3.5rem) so the last card can scroll clear of it. Other screens keep their placement until they opt in. In-app screens (not the auth and public screens of (a)) never show an error as red text inline: the notice carries the message and a field gets at most a neutral outline. Reason: titles are always at the top of every screen; the dock zone is already reserved space.
- Tick colour: red = error, green = success/info (as today); the text states the severity for assistive tech (`role="alert"` / `role="status"`).
- One message per event: an unknown or unallowed message shows nothing today (`pub--login-err-unknown-text`); instead it shows the generic fallback for its screen (section 9.2).

### 4.6 Sheets and modals

- Pickers and choosers (Add Day, New Routine, exercise picker) are `BottomSheet`s: opaque surface, 18px title, 44px back/close, the list scrolls inside with a bottom fade so rows never clip mid-row without a cue (`mr--routines-current-add-day-duplicate`).
- Confirmation is `ConfirmDestructiveModal` only: opaque, centred, names the object and the consequence (`Delete Day 3? Its exercises are removed. This cannot be undone.`), `Cancel` neutral left, destructive confirm right, both 44px (`real--routines-id-edit--delete-confirm-modal` had no text and a see-through edge).

## 5. Typography

Frozen pack classes (`typography.*`) stay. App-wide scale, in px at 390 wide:

| Role | Size / weight | Use |
|---|---|---|
| Hero | clamp(32, 6vw, 36) / 600, tight | auth and public screen title only (one size; the 48px in `designSystem.ts` `auth.introTitle` and 36px in the gallery are reconciled to the pack token) |
| Screen / sheet title | 18 / 600 | header title, sheet title |
| Card title | 16 / 600 | `CardHeader` title |
| Body, subtitle | 14 / 400-500 | paragraphs, form text |
| Input text | 16 | text inputs (no iOS zoom) |
| Meta | 12 / 500 | card meta, helper, errors |
| Eyebrow, label, chip, legend | 11 / 600 uppercase, 0.12-0.16em | the floor |

- **C17. 11px is the floor, for everything**, including legends, TARGET eyebrows, logger labels, week-strip labels, calendar legends, toast text and footer links. The gallery found 6-10px text on session logger, steppers, history grids, settings grids and filters (section 11); `appTokens` entries at 8.5-9.9px (`exerciseLogMetricLabelClassName` 10px, `measurementInlineValueLabelClassName` 9px) are known debt to retire.
- Long names wrap (`overflow-wrap: anywhere`), never ellipsis (CARD-SYSTEM 4.2). Exception: the screen header title is one line and truncates with an ellipsis (section 15); the full name is in its `title` attribute and in the body.
- Numbers use tabular figures; units are spaced consistently (`1.7 mi`, `-0.4 mi`, `225 lbs`).
- Monospace blocks are not used for user content (the recap block in History detail is regular text and is not repeated under the summary row it duplicates).

## 6. Spacing, radii, elevation

| Token | Value | Source |
|---|---|---|
| Base unit | 4px (scale `0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48`) | frozen `spacing` |
| Screen gutter | 16px | `--screen-gutter` |
| Content max width | 430px | `--content-max` |
| Section gap | 12px | `--section-gap` |
| Card gap in lists | 8px | `cardTokens.list` |
| Card padding | header 6/10/12, body 16 | CARD-SYSTEM 3.1 |
| Bottom reserve | 92px + safe area | `BOTTOM_ACTION_BAR_HEIGHT_PX` |
| Radii | card 24 (`--card-radius`), `--radius-lg` 24, `--radius-md` 20, `--radius-sm` 16, pill 999 | `globals.css` |
| Shadow | none inside lists; `glassRaised` for sheets, dock, popovers | frozen `shadows` |

Rules: stacked blocks never touch (zero gap and overlap in `mr--view-day-rest`: 12px minimum between sibling blocks); empty-state boxes have 16px inner padding so labels never sit on a border (`mr--view-day-empty`, `mr--edit-day-empty`); images never exceed the card radius (clip thumbnails to the card corner: `mr--add-exercise-default`).

Layers (z-index, from source): content < dock < listbox menu 90 < loader cover 95 < filter popover 96 < dev banner 100 < toasts 110 < sheets and modals 120. The bottom tab bar is not a layer: it is in flow after `<main>` (layout.tsx), so nothing overlaps it and nothing scrolls behind it (15.6). A z-index only counts inside its stacking context: `<main>` (layout.tsx, `relative z-10`) caps everything rendered inside it below the body-level toasts. Anything else that must beat toasts needs the same portal; raising a z-index inside `<main>` does nothing. New layers need an entry here.

## 7. Motion

- Interaction: press scale `0.992`, 120ms (`--button-transition`, `cubic-bezier(0.22, 1, 0.36, 1)`); chevron rotation 150ms; dock/action chrome 180ms. Opacity and transform only.
- Loader: `LOADER-SPEC.md` is the only definition (150ms show delay, 350ms hold, 200/300ms fades, 1200ms beat). Not repeated or altered here.
- `prefers-reduced-motion`: every transition drops to none or a 200ms crossfade; there is no motion-only feedback.
- No auto-rotating or timed content (D44); no looping animation except the loader beat.

## 8. States (templates)

Every list/screen implements the same four states with these shapes. A new screen ships all four or says why one cannot occur.

### 8.1 Loading

- One loader (LOADER-SPEC): screens register a wait, none draws its own spinner or splash. The six near-identical splash screens (`auth-lab--install`, `--reset-password-linking`, `--loading-boot`, `--loading-route`, `--entry-handoff`, `--curated-restore-loading`) are one state visually; they differ only by the polite live-region label (`Opening Fitness`, `Checking your link`, `Restoring your draft`, `Signing you in`). Backdrop `--bg-0` (C2).
- Inline loading (a card refreshing): keep the card, show `aria-busy` and a 44px-row skeleton of the same height; never collapse the layout.

### 8.2 Empty

`CardEmptyState`: dashed surface, 16px heading, one plain sentence saying what is missing and why, exactly one action that fixes it (44px). Examples: `No exercises planned` / `Add exercises to this day to start a workout.` / [Add exercises]. Empty views inside a screen have the same shape, never a bare outlined box. The no-progress-history state in `real--history-progression--progression-history` is the model. Empty states with nothing to do (no sessions yet) say what will appear and where it comes from.

Today exception (Zac 2026-11-19, lane D): Today's day states share one `TodayEmptyDayCard` (`src/app/today/TodayEmptyDayCard.tsx`): a small mark, a centred title and no second line. `No exercises planned` + [Edit day] (Edit Day editor, returns to Today), `Rest day` (no action), `No scheduled workout` + [Edit routine] (routine editor). The action is omitted when there is no editor to open, never a dead button.

### 8.3 Error

- Template: icon-less card, 16px heading (what failed, plain words), ONE notice (what the user can do, words from the shared copy matrix), actions `Try again` (primary) then `Reload app` (secondary) or a way back; 44px.
- Never shown to users: raw error strings (`Failed to fetch` in `mr--settings-data-export`), error class names (`(Error)`), component or route names (`app-shell`), env flags, ids, `durable ledger` / `mutation semantics` style copy. Show the generic line instead: `Could not connect. Check your connection and try again.` with Retry.
- Route error boundary and global error (Auth Surface v2 status screen, words from the shared copy matrix, FawxzzyWeb `status-copy.ts`): `Could not load` / one notice `Check your connection and try again.` (`page.crash`) / [Try again] in the dock, `Go to Today` link (replaces `Fitness could not load app-shell.` and `(Error)`, `dev--app-boundary-probe-crash`). `Something went wrong` is retired copy. The in-app card boundary keeps the same title and body with [Try again] [Reload app].
- Not found: a branded page (app name, back to Today, same header grammar), not the framework default: `Page not found` / `That page does not exist.` / [Go to Today] (`pub--not-found`, `real--routines-id--id-not-found-other-user-s-routine-404`). An unknown id on a detail route is a 404 everywhere; redirects that hide it (`real--exercises-exerciseid--redirect-to-history-exercises`) are violations. `src/app/not-found.tsx` is that page.
- Expired link (`auth-lab--reset-password-expired`): error template with the cause and the fix: `This reset link has expired.` / `Links work once and for a short time. Request a new one.` / [Request new link] primary, [Sign in] secondary. Not a 470px empty card.
- Entry hand-off failure (`auth-lab--entry-handoff-error`): `Could not open the app.` / `Check your connection and try again.` / [Retry] primary, [Start offline] secondary, both 44px and contrast-safe.

### 8.4 Success and in-progress

Success is a toast (in-app) or an inline info block (auth), one sentence, past tense: `Routine saved.` Autosave surfaces say `Saved` quietly in the control, no toast. A long or stalled wait says what is happening and offers cancel/retry after the loader wait ceiling (LOADER-SPEC 15s).

## 9. Copy rules

### 9.1 Terms (canonical)

`routine`, `day`, `workout`, `session`, `exercise`, `set`, `progression`, `PR` (AGENT.md). Decisions:

- **C18. "day", never "workout plan".** Drop `Workout Plan(s)`, `Create Workout Plan`, `New Workout Plan`, `Blank workout plan`, `Duplicate workout plan` from every surface incl. docks, headers and the day editor header (`real--routines-workout-plans--workout-plans-list`, `real--routines-id-new-workout-plan--new-workout-plan`, `real--routines-id-edit-day-dayid--edit-day`, `settings-cards--pro-free`). The route `/routines/workout-plans` is a second list of the same objects as the day cards, and `/routines/[id]/new-workout-plan` duplicates `/routines/[id]/new-day`: the redesign lane folds each into the day screens (a route change is a behaviour change to declare in its PR). `CARD-SYSTEM.md` 4.5's "keep their product names" is superseded. Legal copy ("routines, workout plans, exercises, sets") changes to "routines, days" only with Zac's OK (section 12). Planned items are "exercises", not "workouts" (`dev--ui-contract` `5 planned workouts`).
- **C19. Sign in / Sign out / Create account / Reset password** (not Log in / Log In / Login). Link text and messages use the same verb (`login` route name stays; copy changes: `You can log in now` becomes `You can sign in now`).
- **C20. One name for the entitlement: "Pro".** Section `Pro`, status `Pro active`, action `Upgrade`, never `Monthly Pro` / `Pro Access` / `Upgrade to Pro` as parallel names.
- Section words: `Today`, `Routines`, `History`, `Settings` (tabs). `Account` is the Settings row that opens the shared account portal (section 15.4).
- No internal vocabulary: `scope`, `stored snapshot`, `durable ledger`, `lane`, `schema`, `mutation semantics`, `Set current target`, `Resync`, `Use Last`, `Active Set` without context. Write what the user gets.

### 9.2 Messages

- Auth and route messages are **code-based and allow-listed** (`auth-route-feedback.ts`, `signupFeedback.ts`): the URL carries a code, the screen owns the sentence, unknown codes show the screen's generic fallback. Allow-list codes today: login errors `confirm_failed, recovery_session_missing, rate_limited, send_failed, session_expired, identifier_required, email_required` plus the fixed sign-in failure sentences; login info `confirmed, reset_requested`; reset-password errors `password_requirement, passwords_must_match, session_expired, not_recovery_session, rate_limited, same_password, weak_password, failed`; signup errors `password_too_short, username_invalid, email_invalid, username_taken, rate_limited, signup_failed`; signup info `check_email`. A new message type adds a code and its copy to the allow-list module and its test, never free text in a URL. Provider error text never reaches the screen.
- Sentence form (**C21**): sentence case, one sentence where possible (two maximum), ends with a period, no leading `Please` (say what to do: `Wait a few minutes and try again.`), no exclamation marks, no `>` path separators (`use Account, Change password`). Today `Invalid email, username, or password` and `Passwords must match` lack periods and the two rate-limit sentences differ; they converge when the allow-list module and its pinning test (`auth-route-feedback.test.ts`) are updated together.
- Length: toast and inline message at most 90 characters on one idea; the 3-line `username_invalid` text is the upper bound and moves to helper text under the field.
- Names the cause and the next step, never blames: `Could not send reset email. Try again in a few minutes.`
- Empty-feedback rule: a failed action always produces a visible message (generic fallback), never silence.
- Date and number format follow the device locale except where a fixed format is specified; weekday names are `Mon`..`Sun` in chips and meta.

### 9.3 Labels and length limits

- Dock buttons: see C12 (<= 14 characters, one line).
- Card titles: no limit (they wrap); chip text: <= 12 characters, one word where possible; tab labels: one word; segmented labels: one word; section eyebrows: <= 24 characters.
- Meta separators: ` · ` only. Pipes, bullets, colons and slashes as separators are banned; lists in prose use commas.
- Ranges use an en dash without spaces (`5–8 reps`); counts are lower-case nouns (`12 sessions`, `4 sets`).
- Placeholders end without punctuation; helper text ends with a period; no `..` (`Search 190 exercises..` is a typo).

## 10. Flow patterns

1. **Create flow** (routine, day, exercise): one screen or one sheet, title in the header, fields in the standard recipe, one primary in the dock that names the result (`Create Day`), `Back`/`Cancel` neutral on the left; the primary is disabled with `aria-disabled` and a helper naming what is missing. After success, return to where the user started (CARD-SYSTEM navigation return paths) with a toast.
2. **Edit flow:** the same fields, `Save` primary; leaving with unsaved changes asks via the confirm modal; autosaved controls (rest toggle) show `Saved`, never a Save button.
3. **Picker flow** (add exercise, choose routine): `BottomSheet`; one selected row (green rail and SELECTED chip); the configuration controls appear under the selected row; the primary names the result (`Confirm`); `Use Last` becomes a plain labelled helper row (`Reuse last values`) if kept.
4. **Destructive flow:** the action is in the card action row or dock (destructive style, left), never in a corner; it opens the confirm modal (4.6); after confirm, a toast with Undo where undo exists.
5. **Live session flow:** the dock is `Add` (secondary) + `Finish` (primary); `Discard` is the destructive control and always confirms (4.6); set logging controls are 44px (section 11); Resume/Start are the single primary on Today.
6. **Navigation:** tabs navigate between sections; segmented controls switch views within a section; chevron-right rows open a screen; chevron-down rows expand in place. A screen reached from a tab has no back chevron; a screen reached by drill-down does.
7. **Auth flow:** one centred column; title, message block, form, primary, then a footer row of links (44px row, in flow, never `fixed` over the dock zone); no empty void between title and form (form top-aligned under the title with the keyboard-safe layout); the same primary button on login, signup, reset and forgot.
8. **Offline:** screens that have a cached copy say so in one line (`Offline copy`); actions that need the network are disabled with a text reason, never hidden.
9. **Dev and fixture screens** (`/dev/*`) are not product: their copy never ships, and they are exempt from the copy rules but not from the token rules.

## 11. Accessibility floor

- Hit area 44 x 44 CSS px for every standalone control (buttons, chips that act, calendar cells, step circles, select pills, week-strip chips when tappable, footer links, toast close). Visual size may be smaller only if the hit area is padded to 44.
- Text 11px minimum (C17); contrast 4.5:1 body, 3:1 large text and UI parts; amber and disabled text included.
- Colour is never the only signal (principle 4). Disabled uses `aria-disabled` (focus stays), not the native attribute, when the control may be focused during a pending save (D38).
- Headings: one `h1` per screen (sr-only allowed), card titles `h2`/`h3`/`h4` (CARD-SYSTEM 4.7); label in name; header button name = title, description = meta.
- Focus: visible 2px ring from `--button-focus-ring` on every control; a focus ring left as a thick white selection outline (`real--history-sessionid--session-detail`) is a bug.
- Live regions: toasts `role="alert"` (error) or `status`; loader label per LOADER-SPEC; month and count changes announce politely.
- Reduced motion honoured (section 7); no content that moves without user action.
- Lists are `ul > li`; description lists for stats; tables only for real tables.
- Real-device behaviour (iOS standalone safe areas, keyboard) is verified on a phone by Zac; emulation does not replace it.

## 12. Known violations (checklist for redesign lanes)

Shot ids from the gallery. "Rule" points at the section above. Each lane re-measures before and after.

| # | Violation | Shot ids | Rule |
|---|---|---|---|
| 1 | "Workout Plan(s)" in docks, headers, day editor, create flow, Pro copy | `real--routines-workout-plans--workout-plans-list`, `real--routines--routine-list-current-routine-view`, `real--routines-id-new-workout-plan--new-workout-plan`, `real--routines-id-edit-day-dayid--edit-day`, `settings-cards--pro-free`, `pub--privacy` | C18 |
| 2 | Lime accent on auth/public screens (legends, links, bars, Sign in gradient) | `pub--login`, `auth-lab--login`, `pub--signup`, `auth-lab--signup` | C1 |
| 3 | Flat navy splash vs near-black green auth shell | `auth-lab--loading-boot`, `auth-lab--install`, `pub--login` | C2 |
| 4 | Error toast covers the 36px title | all `pub--login-err-*`, `pub--login-info-*`, `pub--signup-err-*`, `pub--signup-info-check_email`, `pub--reset-err-*` | C16 |
| 5 | Sub-11px text: logger labels and values, steppers, TARGET eyebrow, legends, settings grids, calendar legend, history eyebrows | `mr--session-logger-combo-board*`, `mr--active-workout-session-expanded`, `dev--session-cards`, `mr--edit-day-edit-exercise`, `mr--history-sessions-detailed`, `settings-cards--pro-free`, `settings-cards--data-free`, `mr--exercise-detail-*` | C17 |
| 6 | Sub-44px targets: week-strip chips, calendar cells, RATE, Delete, select pills, step circles, toast close, footer links, uisys chips, Retry/Reload pills, Open route buttons | `mr--routines-list-view`, `dev--card-system`, `mr--history-sessions-compact`, `dev--curated-onboarding`, `pub--login`, `dev--app-boundary-probe-crash`, `real--routines-id-edit--delete-confirm-modal`, `uisys--default` | 11 |
| 7 | Dock buttons wrap to two lines | `real--routines--routine-list-current-routine-view`, `real--today--default-routine-day-exercises`, `mr--history-sessions-detailed`, `mr--history-exercises-detailed` | C12 |
| 8 | Dock pair inconsistent (amber/grey/red secondary; Add and Finish both green; Discard red filled vs amber) | `mr--today-default`, `mr--today-rest`, `real--today--default-routine-day-exercises`, `mr--active-workout-session`, `real--session-id--active-workout-logger` | C9, C10, C11 |
| 9 | Dock overlaps content (footer links, Update password, last history card, "quiet stretch" text) | `settings-cards--pro-pro`, `real--account--signed-in-account-screen`, `real--history--sessions-overview-with-data`, `dev--history-overview-detailed` | 4.2 |
| 10 | Section switched by dock vs segmented control; amber active tab | `mr--history-sessions-compact`, `mr--history-progression-default` | C13, C4 |
| 11 | Chip vocabulary: five or more looks (outlined, grey, text-only, circle, uppercase 9px, EARNED/NOT EARNED, LOCKED/ACTIVE) | `mr--history-detail-progression-expanded`, `mr--history-progression-filtered`, `dev--history-cards`, `settings-cards--achievements-free` | C7 |
| 12 | Header grammar: left vs centred; colon/pipe/bullet separators; 13px titles; title under the back chevron (tab screens fixed in H0; detail screens in H1) | `mr--today-in-session-summary`, `mr--view-day`, `mr--edit-day-default`, `mr--add-exercise-default`, `mr--create-routine`, `mr--exercise-detail-strength`, `dev--ui-contract` | 15 |
| 13 | Same control, two treatments (Measurement Labels / Routine Type / Time Zone: card rows vs centred rules; underline title) | `routine-editor--editor-collapsed` vs `real--routines-new--create-routine-draft`, `mr--edit-routine`, `real--routines-id-edit--edit-routine` | 3, 4.4 |
| 14 | Native date and select leak; legend-on-border; underline inputs | `mr--history-progression-default`, `mr--settings-data-export`, `routine-editor--editor-open`, `dev--curated-onboarding`, `mr--add-exercise-custom-taxonomy` | C14, C15 |
| 15 | Developer and internal copy visible; raw error strings | `mr--history-progression-default`, `real--history-progression--progression-history`, `mr--settings-data-export` ("Failed to fetch"), `dev--app-boundary-probe-crash` ("(Error)", "app-shell"), `mr--edit-day-add-exercise`, `real--review-optional-planned-day--optional-planned-day-review` (retired route: it now redirects to `/routines`, so this capture id is historical and no longer renders), `dev--history-preview-status` | 8.3, 9.1 |
| 16 | Bare framework 404 | `pub--not-found`, `pub--not-found-privacy-subpath`, `real--routines-id--id-not-found-other-user-s-routine-404` | 8.3 |
| 17 | Expired-link and hand-off error cards: tiny text in a huge card, no action | `auth-lab--reset-password-expired`, `pub--reset-password`, `auth-lab--entry-handoff-error` | 8.3 |
| 18 | Six indistinguishable splash screens | `auth-lab--install`, `auth-lab--reset-password-linking`, `auth-lab--loading-boot`, `auth-lab--loading-route`, `auth-lab--entry-handoff`, `auth-lab--curated-restore-loading` | 8.1 |
| 19 | Empty-state quality: label on the border, zero gap blocks, no rail, no action | `mr--view-day-empty`, `mr--edit-day-empty`, `mr--view-day-rest`, `mr--today-empty` | 3, 6, 8.2 |
| 20 | Clipped or overflowing text: header under chevron, toggle pills, chip rows, overview grids, thumbnail over card corner | `mr--add-exercise-default`, `mr--active-workout-session-expanded`, `mr--add-exercise-custom-taxonomy`, `mr--history-detail-feedback-note`, `dev--stretch-info-preview` | 5, 6 |
| 21 | Delete confirm has no text, see-through edge, 36px buttons | `real--routines-id-edit--delete-confirm-modal` | 4.6 |
| 22 | Copy punctuation and verb drift: Log in / Log In / Sign in; trailing periods; "Please"; ">" path | `pub--login-err-invalid-credentials`, `pub--reset-password`, `pub--reset-err-passwords_must_match`, `pub--reset-err-not_recovery_session`, `pub--signup-err-signup_failed` | C19, C21 |
| 23 | Chevron-right vs chevron-down mixed; duplicated section card; two save buttons; Export dock out of context | `mr--settings-default`, `settings-cards--account-free`, `real--account--signed-in-account-screen`, `mr--settings-achievements` | 4.1, 4.2 |
| 24 | Auth void: form floats mid-screen, footer links fixed over the dock zone | `pub--login`, `auth-lab--login` | flow 7 |
| 25 | Dev showcase dock ghosting (stacked labels) | `uisys--default` (fixture only) | fix in the fixture |

Data oddities found in QA data (not design, report to the owning lane): session time 146h on an unclosed session and 100% completion with 0/2 sets (`real--history-sessionid--session-detail`); two exercises named `Adductor Machine`; `Search 190 exercises..`.

## 13. Adopting this contract

- New screens: read sections 2-10, build from `card-system/` primitives, add the screen to the gallery fixtures with its states.
- Existing screens: the redesign lanes fix rows in section 12; each PR lists the rows it closes and keeps persisted and server-visible behaviour unchanged unless the PR body declares it (route moves, copy pinned by tests, allow-list changes).
- Where to enforce: new contract tests belong next to `npm run test:card-system`; section 4 and 5 floors (11px, 44px, no wrapping dock labels) are the first candidates. This PR is docs only and adds none.
- The frozen truth pack is unchanged. Token values that move (a `--accent` change, a type-scale token) go through the pack's own freeze test in their own PR.

## 14. Open decisions for Zac

Only items that are not design choices:

1. **Legal and policy copy.** Replacing `workout plans` in the Privacy and Terms pages (C18) and the legal pages naming an individual operator are content and legal decisions. Contract assumes the product copy changes and legal copy waits for Zac.
2. **Lime on Sign in.** C1 removes the one lime button. Veto this if the lime Sign in is a deliberate brand moment; the alternative is lime as an explicit brand accent restricted to the Sign in button.
3. **Paid analytics cards and the elbow safety rule** (existing open decisions) change Pro and Settings content; this contract defines how they look (chip `LOCKED`, `Pro` naming) but not whether they ship.

Mazer: nothing here changes `LOADER-SPEC.md`, the loader numbers, the shared app-image source, or Mazer's colours. Decisions that look shared but are Fitness only: C1/C2 (Fitness accent and page colour), the type and hit-area floors, toast placement and z-order. Mazer may adopt the 11px and 44px floors separately.

## 15. Header, surfaces and ease of use (2026-11-15, supersedes C8)

Enforced by `tests/screen-header-contract.test.mjs`. Component: `src/components/ui/app/ScreenHeader.tsx`; metrics: `screenHeaderTokens` in `src/components/ui/app/headerTokens.ts` (no per-screen overrides).

### 15.1 One header, two kinds

- **tab**: the four screens reached from the bottom tab bar: Today, Routines, History, Settings. No Back button and no navigation in the header (15.6).
- **detail**: every pushed screen (routine overview, day, edit day, edit routine, add exercise, session, history detail, exercise detail, review, create flows, onboarding steps). Back on the left. The live workout is the one exception: no Back, a Pause button top right instead (15.5). Migrated in lane H1: routines and the create flows (H1a) and the session, history, exercise, setup, account, legal and review screens (H1b, 15.5). Lane H3 moved the last screens (both Add exercise routes, the dev fixtures) and deleted the old header pieces (`AppHeader`, `SharedScreenHeader`, `BackButton`, `TopRightBackButton`, `RoutineDayHeaderTitle`, `standaloneHeaderFamily`, the info-rail helpers); `tests/screen-header-contract.test.mjs` fails if any of them, or a raw header title class, comes back anywhere in `src`, dev fixtures included.
- Anatomy, always this order: [Back 44x44, left, detail only] [title block] [trailing slot]. Title block = the title line (the `h1`, one style: 22px / 600 in the app accent `--accent` on every screen, left aligned, one line, ellipsis, full text in `title`; then at most ONE inline status, e.g. `– Offline`) plus at most ONE muted subtitle line (14px, plain words, one line). The row is top aligned: the title line is centred on the 44px line shared with Back and the trailing action; the subtitle hangs below. Trailing slot = at most ONE 44x44 icon action or ONE chip (the live workout's 44px `Pause` pill is the one labelled exception, 15.5). Nothing else.
- Every screen has a title, a plain noun: `Today`, `Routines`, `History`, `Settings`, the routine / day / exercise name, `Add exercise`, `Workout`.
- No line under the header (no hairline, no accent bar): "none" is the one choice, applied everywhere.
- Banned in headers: centred titles, eyebrows and kickers, pipes and green separators, rotating info rails, counts as the subtitle (`3 logged` belongs in the body), duplicate captions, second action rows, status chips that repeat the body. What still matters moves into the first card of the body.

### 15.2 The tab family (H0)

| Screen | Title | Subtitle | Trailing | Under the header |
|---|---|---|---|---|
| Today | `Today` (+ `– Offline` / sync status inline on the title line) | `<day> · <routine>`; picker open: the routine; no routine: `No active routine` | none | body |
| Routines | `Routines` (+ `– Offline` inline when showing the cached copy) | none | none | body |
| History | `History` | none | density toggle (Sessions and Exercises; icon button, `aria-pressed`, label says what tapping does) | one segmented control `Sessions / Exercises / Progression` (equal width, green when selected, C4/C13); Exercises adds its search row |
| Settings | `Settings` | none | none | section cards; an open section shows its card at the top of the body, not in the header |

### 15.3 Minimal surfaces (applies to every screen; H1 and later lanes migrate the rest)

- One surface style (`CardSurface`), one accent (the standard green `--accent`), quiet type. Prefer fewer borders, shadows, glows, gradients, badges and captions: if an element does not help the user act or understand, remove it.
- Headers have no surface at all (no card, panel, glow or border behind the title).
- A badge appears only when it changes what the user does (an `ACTIVE` chip on the one active routine is fine; an `IN SESSION` chip next to a `Resume` button is not).
- Generous spacing beats separators: sections are split by the 12px section gap, not by rules.

### 15.4 Easy to understand (3-second test)

Judge every screen by one question: can a first-time user tell what it is and what to do within 3 seconds?

- One obvious primary action per screen, in the dock on the right (C9). Back is always top left (detail screens). The same job uses the same pattern everywhere.
- Plain words; labels say what happens (`Save theme`, `Change password`, `Show detailed rows`), no jargon or developer copy (9.1).
- Navigation is predictable: the bottom tab bar only switches the four sections; it never leaves the app. Everything the old app menu reached is in the bar; Account, Sign out, Pro and data export live in Settings. The Settings `Account` row opens the shared account portal (`account.fawxzzy.com`, `getFitnessAccountPortalUrl`), with the destination named in its summary (`Opens account.fawxzzy.com`). Sign out is a quiet secondary button in the Settings body, not the dock: it ends the session on THIS device only (server revoke, local sign-out, then one navigation: the portal `/signout?app=fitness` in a browser tab, `/login` in the installed app), with a `Signing out…` pending state. `Sign out everywhere` is a separate quiet link below it, to the portal Account page (its two-step `Sign out everywhere`).
- Username, email and password are changed only on the portal (`account.fawxzzy.com/account?app=fitness`; the password row goes to its `Reset password`). Fitness has no edit or password form. The `/account` route stays for direct visits as a read-only screen: Username, Email and Password rows that show the current value and link to the portal, plus the same sign-out actions. Coming back from the portal reads identity again (fresh server render, a refresh on return to the tab, and the remembered sign-in name on Settings).

### 15.5 The detail family: session, history, exercise, setup (H1b)

Back is the one shared `ScreenHeaderBackButton` (`src/components/ui/app/ScreenHeaderBackButton.tsx`, also used by the routines screens): 44x44, chevron, top left, its accessible name says where it goes. History detail passes `historyBehavior="history-first"` (return to where you came from, else the named screen); the others go straight to the named screen. While an exercise is open on history detail (opened in place, no history entry), the first Back tap closes it (`Back to workout`) and the second leaves.

Live workout (2026-11-23): no Back and no tab bar. One 44px `Pause` pill top right (back arrow + `Pause`, named `Pause workout and return to Today`, `SessionPauseButton` in `src/components/SessionHeaderControls.tsx`, rules in `src/components/sessionBackAction.ts`) goes to Today in one tap, also with an exercise open; the workout keeps running (nothing is finished or discarded, set drafts stay in the session draft store). It uses history back only when the previous in-app path is `/today`, else it pushes `/today`. It carries the notice anchor, and `– Offline` stays on the title line. The only other way out is Finish. A completed workout (opened by link after Finish) has nothing to pause: its header shows the plain left Back (`ScreenHeaderBackButton`, history first, Today fallback, no Pause) and the dock shows Continue.

Workout cards open and close three ways (2026-11-24), all the same toggle and only one card open at a time: the whole header (`aria-expanded`), a thin grab handle centred on the card's bottom edge (`SessionCardExpandHandle`: a shallow V, 64x44 target, pointing down while closed and flipped up while open), and a `Close` text control (44px) at the top of the open logger that hands focus back to the header. Still no chevron and no check on the card. Under the logger chips one plain line says what the pressed chip does (`src/components/session/loggerChipCaption.ts`): nothing pressed `Tap a chip to mark the next set`; Warm-up `Warm-up: not counted for progression`; Failure `Failure: a tag only. Enter reps reached` (pressing it clears reps; blank reps save as 0); Timer alone `Timer: shown on this card` (with a mark pressed the caption names only the mark, so it stays one line at 320px). The Log set button names the marked set (`Log warm-up set`, `Log failure set`). Never the word Target.

| Screen | Title | Subtitle | Back goes to | Trailing |
|---|---|---|---|---|
| Live workout (`/session/[id]`) | `Workout` (+ `– Offline` / sync status inline) | `<day> · <routine>` | no Back; `Pause` top right goes to Today (completed workout: left Back, no Pause) | `Pause`; no tab bar |
| History detail (`/history/[sessionId]`) | the day name, else `Workout` | `<weekday>, <date> · <routine>` | History; with one exercise open, `Back to workout` closes it first | none |
| Exercise detail (sheet over a screen) | the exercise name | `<equipment> · <movement>` | closes the sheet | the filter toggle |
| Routine setup (`/onboarding`) | `Routine setup` | none (the step and `N% done` sit in the body, the step name is an `h2`) | Today | `Start over` |
| Account (`/account`, direct visit only) | `Account` | none (the rows show the username and email) | Settings | none |
| Terms, Privacy | the document name | none | `returnTo` when it is an in-app path, else Settings | none |
| Add exercise, routine day (`/routines/[id]/edit/day/[dayId]/add-exercise`) | `Add exercise` | `<day> · <routine>` | the day editor (`Back to day`) | none |
| Add exercise, live workout (`/session/[id]/add-exercise`) | `Add exercise` | `<day> · <routine>` | the workout (`Back to workout`) | none |

Both Add exercise routes share one frame (`src/components/exercises/AddExerciseScaffold.tsx`). Signed-out fixtures for these and for Create day / Copy a day / Days (and its empty state): `/dev/detail-screens?screen=<id>`, add `&long=1` for long day and routine names (dev only, fail-closed).

- Nothing else renders an `h1`: `tests/screen-header-contract.test.mjs` fails on a raw `<h1>` (or `as="h1"` / `titleAs="h1"`) anywhere in `src/app`, `src/components` or `src/features` outside `ScreenHeader`. Allowed: the auth shell (Auth Surface v2), `src/app/dev/**` fixtures and `src/app/api/**` HTML strings.
- What used to sit in these headers and still matters is in the body: the history editor's day name and notes fields, the onboarding step name.
- Segmented controls whose options are all links render as `nav` with `aria-current="page"` (not a tab list).
- Auth: the primary dock button (Sign in and the other auth primaries) is the standard green `rgb(32 151 78)`, flat, no glow. The whole auth accent (kicker, focus ring, links, notice, the Account screen) is the same fixed standard green (`32 151 78`, not `var(--accent-mint)`, which the colour themes override); no lime in the `.fx-auth` or `.fx-account` tokens (`accountSurfaceParity.contract.test.ts` pins it). The Today install card (`.fx-earned`, not an auth screen) keeps its lime. Auth copy is identical to FawxzzyWeb `src/lib/auth/copy-matrix.ts`: the generic sign-up failure shows `page.crash`, a reset that could not be sent shows `reset.sendfail`.

### 15.6 Bottom tab bar, header anchor and dock look (2026-11-26, replaces the app menu)

- **Bottom tab bar** (`AppTabBar` in `src/components/AppTabBar.tsx`; pure rules in `src/lib/app-tabs.ts`): one bar, mounted once in the root layout as an in-flow sibling after `<main>`, so `<main>` (and every screen dock) ends above it. Four tabs in one list, `APP_TAB_DESTINATIONS` (Today, Routines, History, Settings), each a quarter of the width and 56px tall (44px floor), a 22px icon over an 11px label. Active tab: accent colour, a short 2px accent bar at the top edge, `aria-current="page"` (Settings stays current on `/account`); a tap highlights the new tab at once. Opaque `--bg-app` with one hairline on top; it carries `env(safe-area-inset-bottom)` (home indicator, iOS standalone included), so a dock above it drops its own safe-area padding (`body:has(> [data-app-tab-bar])` in globals.css). Token colours only. The header holds no navigation: the old hamburger (`AppMenu`, `AppNav.tsx`, `app-menu.ts`, `ScreenHeaderMenu`) is gone.
- **Where it shows**: decided only by `resolveAppTabBarVisibility` (src/lib/app-tabs.ts; table in docs/mobile-shell-contract.md "Bottom tab bar"). Visible on the four roots and their read-only children (routine home, Days, history detail, history views, `/account`). Hidden in the live workout, every editor, picker and create flow, auth pages, the offline page and anything unlisted (fail closed); hidden while an in-route editor is open (`useHideAppTabBar`, history Edit) and while the keyboard shrinks the layout viewport. `/dev` fixtures preview it with `AppTabBarPreview`.
- **Inline status**: the offline / sync state sits on the title line after the title as muted text, `– Offline` (`OfflineSyncBadge variant="header"` in `ScreenHeader`'s `status`), on Today, Routines (cached copy), History (cached copy) and the live workout. No status pill in the body. The title wins the line: on a narrow phone (320px with `Workout` and `Pause`) the status shrinks first and ends in an ellipsis.
- **Header anchor for notices**: one anchor, C16's `--app-notice-top` (`src/lib/app-notice-anchor.ts`, `useAppNoticeAnchor`). The live workout's `Pause` pill carries `data-app-notice-anchor`, so notices sit 8px under it; every other screen falls back to the floating header (notices sit under the whole header), then the top chrome. No other header-height variables.
- **Dock look** (C9-C12 unchanged), scoped to the screen dock (`[data-app-bottom-dock]` on MobileScreenShell) so card action rows, timers and sheets that reuse `.bottom-action` keep their own look: flat token fills and a 1px keyline, no gloss gradient, no drop shadow, opaque (the tint sits on the surface colour so list text never shows through). Primary = accent tint 0.2 with the 0.62 accent keyline, secondary = neutral surface with a soft neutral keyline, active toggle = selection tint, destructive unchanged. Pressed = a slightly stronger fill and a 0.98 scale (no scale under reduced motion); focus = a 2px accent ring. Height 44px minimum and the safe-area bottom padding are unchanged.
