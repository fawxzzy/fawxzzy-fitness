# Fitness Card System

One card surface, one header, one set of controls. This document is the owner spec for every card-like UI in Fitness: routine cards, day cards, exercise cards, and (as they migrate) Today, History, Settings, Session and onboarding cards.

- Code: `src/components/ui/card-system/` (primitives), composed cards in `src/components/routines/`, `src/components/day-list/`, `src/components/workout/ExerciseRowCard.tsx`.
- Living gallery (dev only, blocked in production): `/dev/card-system`.
- Contract tests: `npm run test:card-system` (wired into the `CI` workflow).
- Relationship to the frozen truth pack (`truth-pack/fitness/design-system/`): the pack is unchanged. The card system consumes the same theme variables (`--card-radius`, `--accent`, `--surface-*`, `--text-*`, `--success-rgb`, `--warning-rgb`, `--danger-rgb`) and the existing tone map `src/components/cardSemanticTones.ts`. It does not add a primitive id to the pack (the design-system contract test freezes the ids `header, card, badge, section-layout`).

Status: PR 1 migrates the Routines screens (routine list, routine detail with day cards, add-day chooser, workout-plan list, day editor exercise cards) and the shared pieces they carry into Today (day picker, rest-day card). Everything else is inventoried below with a migration plan.

## 1. Inventory

Method: read every card-like component; usage from import graph; class strings read from source. Counts are floors (multi-line `className` strings are not matched by the scans). Rows below group files that share one anatomy. 98 inventory rows in total: 12 in the Routines area (listed here) and 86 elsewhere (shared 24, session flow 21, history 15, today 6, settings/account 9, progression/exercises/stretch 7, onboarding 4; the per-row detail with exact classes was captured in the working inventory for this lane).

### 1.1 Routines area (migrated in PR 1 unless noted)

| Component (path) | Used by | Anatomy before | Now |
|---|---|---|---|
| `RoutineBrowseCard` (`components/routines/RoutineBrowseCard.tsx`) | `RoutinesPageClient`, `RoutinesOfflineShell` | `ExerciseCard` via `RoutinesListItemCard`; title with accent underline; 5 count chips; nested horizontally scrolling tiles with `border-2`; corner `DELETE` text (global CSS class); ~12 `!` overrides; chevron overlay | `CardSurface` + `CardHeader` + week strip + `CardActionRow` behind a more control |
| `WorkoutPlanChooserSourceCard` (`components/routines/`) | add-day modal in `RoutineHomeClient` | `ExerciseCard`, horizontal recap rail, `Source` / `Select` text label | select card (`aria-pressed`, SELECTED chip), vertical recap |
| `RoutineOverviewDayCard` (`components/day-list/RoutineDayCardPresentation.tsx`) | `RoutineHomeClient`, `WorkoutPlansPageClient`, `TodayDayPicker` | `DayCard` -> `ExerciseCard`; centered or "cornered" header variants; drag handle pill 28x48 floating in the middle; corner `DELETE`; one tag in the right rail; horizontal recap tiles | `CardSurface` + `CardHeader` (+ `DragHandle`, chips) + vertical recap + `CardActionRow` footer |
| `RestDayCard` (same file) | `TodayDayPicker`, `TodayExerciseRows` | `ExerciseCard` state `empty` + yellow overrides | `CardSurface` tone `attention`, title + shared copy |
| `DayList` / `DayCard` (`components/day-list/DayList.tsx`) | `ProgressionReviewCard` (0 importers) | wrapper over `ExerciseCard` | unchanged, legacy; remove with `ExerciseCard` (section 6) |
| `DayDetailExerciseList` (`components/routines/day-detail/`) | `EditableRoutineDayExerciseList` | `ExerciseDisclosureCard` -> `StandardExerciseRow` -> `ExerciseCard`; media rail, accent underline under name and under "Current Target", abs-positioned overlay actions, 26px info button, 28px drag handle | `ExerciseRowCard` (thumbnail, name, meta, `StatBlock`) + stacked 44px `DragHandle` and `CardInfoButton` |
| `ReorderExerciseRow` | dev fixtures only | `StandardExerciseRow` variant `reorder`, text jammed against the media rail | `ExerciseRowCard` with trailing `DragHandle` |
| `RoutineChooserOptionCard` / `RoutineChooserSourceCard` / duplicate panel (`RoutineChooserMenu.tsx`) | `CreateRoutineClient`, `CreateRoutineDayClient`, add-day modal | own `rounded-[1rem]` recipes, own 3px rail, 10px labels | NOT migrated (section 6, lane R) |
| `DayDetailStateCard` | day editor, Today | eyebrow-as-title + body, `rounded-[1.25rem]` | NOT migrated (lane R / Today) |
| Day-settings panel (`EditDaySettingsAutosaveForm`), routine editor panels (`RoutineEditorShared`, `RoutineEditorForm`, `ProgressionPlaybookEditor`) | edit routine / edit day | `AppPanel` + inner rows, section chrome | NOT migrated (lane R) |
| `ExerciseCard` (`components/ExerciseCard.tsx`, 664 lines, 40+ props) | 10 files (session, history, picker, Today rows) | the shared engine for routine, day and exercise cards | no longer used by any Routines card; still the engine for Session, History, Today rows, picker |

### 1.2 Elsewhere (summary)

- Shared wrappers (24 rows): `AppPanel`, `SurfaceCard`, `Glass`, `EmptyState`, toast card, metric tiles, `AppBadge` / `Chip` / `Pill`, `StateChevron`, `ConfirmDestructiveModal`, and others.
- Session flow (21): `ExerciseCard`, `StandardExerciseRow`, `ExerciseDisclosureCard`, `SessionExerciseFocus` rows, `AttachedCardActionStripFrame` / quick-log strip, set logger panels, feedback prompt, `ExercisePicker` rows, info sheet.
- History (15): session cards (3 modes), exercise cards, expanded disclosure cards (the same recipe copied into 3 files), calendar, progression dashboard and charts, set cards.
- Today (6), Settings/account (9), progression / exercises / stretch (7), onboarding (4, inventory only: `CuratedInfoCard`, `CuratedOptionCard`, review `<details>`, questionnaire rows, progress dots).
- Dead code (0 importers under `src`): `SessionSummaryCard`, `ProgressionReviewCard`, `ProgressionStatusSection`, `CollapsibleCard`, `SwipeActionRow`, `ConsistencyHeatmapSurface`, `RoutineSwitcherBar`, `RecoveryTimingPrompt`, `ExerciseProgressionActivityPanel`, `AppRow`, `Card`, `Skeleton`, `HistoryMetaChip`, `DetailSection`/`DetailMetaChip`.

### 1.3 Inconsistencies found (before PR 1)

Evidence is source or screenshots; counts are floors.

1. Surface: at least 15 distinct card radii (24/22px `--card-radius`, 1.5rem, 1.25rem, 1.2rem, 1.05rem, 1rem, 0.95rem, 0.9rem, 0.8rem, `--radius-md/-lg`, `calc(--radius-lg - n)`, `rounded-xl`, 1.3/1.35/1.4rem, 34px). 45 distinct `rounded-*` values on bordered, filled elements across `src`.
2. `cn()` is a plain join, not tailwind-merge. `AppPanel` emits both `rounded-[1.5rem]` and `rounded-[var(--card-radius)]` and both `overflow-hidden` and `overflow-visible`; `SurfaceCard` emits `p-[0.875rem]` and `p-5`. Which wins depends on generated CSS order. This is why call sites are full of `!` overrides.
3. Global `button, [type="button"] { background; border; color }` in `globals.css` is unlayered and out-ranks utilities, so every card control restates background, border and colour with `!`.
4. Cards stripped at the call site (`!border-transparent !bg-transparent !shadow-none` on Settings and Account, `!border-0 !bg-transparent` in the log audit).
5. Header anatomy: routine card = title left, `DELETE` top right, chevron overlay; day card = title left, drag pill centred, `DELETE` right, chevron right, tag in a rail; exercise card = rail media, title, accent underline, "Current Target" block, drag handle top right, info bottom right, no visible chevron. Three anatomies for the same idea.
6. Meta lines: 15 distinct title sizes and at least 14 distinct meta sizes, from 8.5px to `text-sm`; separators are accent dots, pipes, mini pipes, bullets.
7. Chips: three systems (`AppBadge`, `Pill`, `SignatureMetaTag`) plus 11 files with hand-rolled `rounded-full border` spans at 8.5-11px. Routine cards used chips for counts, which hid the real status chips.
8. Affordances: expand built 5+ ways (`StateChevron`, manual ternaries in 9 files, `rotate-180`, text glyphs, native `<details>`); chevron sizes h-3, 3.5, 4 and 5; navigation vs expansion indistinguishable.
9. Action placement: `DELETE` 46x16 in the corner next to the row tap area; destructive and primary actions mixed in attached strips; info button 26px; drag handle 28px (`!h-7 !w-12` on days, `h-7 w-7` on exercises); 17 hard-coded sub-44px controls found.
10. Sideways rails inside cards (routine and day recap tiles, summary chips) clipped content mid-word and nested a scroller inside the page scroller (C1 finding 7).
11. States: empty states in at least 5 treatments; no loading/error card vocabulary; `state="empty"` dashed warning card for rest days.
12. Tones: `cardSemanticTones.ts` defines six tones but rest days used separate yellow overrides (`ROUTINE_REST_DAY_CARD_CLASS_NAME`), inactive routines used a bespoke warning gradient.
13. Day labels: the day label rule treated a stored name equal to the day index as default and any other string as a custom title, so a reordered default-named day showed `7 Tue` instead of `Day 7`.
14. Terminology: a day was called "workout plan" in card copy (`7 PLANS`, `Delete workout plan?`), a session "log" (`3 LOGS`, `No sessions logged`).
15. Contrast and size: 8.5-9.9px text on exercise rows; gold secondary actions at 3.66:1 (`toggleInactive`, 64% alpha text); 10px green labels 4.2-4.45:1.
16. Tests: the six routine card contract tests (`RoutineBrowseCard`, `WorkoutPlanChooserSourceCard`, `RestDayCard`, `RoutineHomeSurface`, `RoutineHomeDayKind`, `RoutinesPageClient`) were not wired into any workflow; they asserted class strings, not behaviour.

## 2. Principles

1. One surface (`CardSurface`), one header (`CardHeader`), one control set (`DragHandle`, `CardIconButton`, `CardInfoButton`, `CardActionRow`), one status vocabulary (`CardStatusChip`).
2. Theme variables only. Radius from `--card-radius`, outline from the theme card outline, tones from `cardSemanticTones.ts`. No per-card radius, no hex.
3. Mobile first: designed at 390x844, correct at 320x568 and 430x932, no horizontal page scroll and no horizontal scroll inside a card.
4. 44px minimum hit area for every standalone control; whole-header tap for expand or navigate.
5. Colour is never the only signal: tone is paired with a text chip, a glyph or a label.
6. Deterministic: stateless presentation, props in, markup out. No dates, randomness or measuring in render.
7. Preserve behaviour: server actions, data shapes, routes, test ids and drag-to-reorder keep working; changes to interaction are listed in section 7.

## 3. Anatomy

```
+--[rail]------------------------------------------------------+
| [media]  Title (heading)  secondary         [controls] [chevron]|   CardHeader
|          meta - meta - meta                                     |
|          [chip] [chip]                                          |
|          details (StatBlock)                                    |
+----------------------------------------------------------------+
| body (recap, week strip, editor panel)                          |   optional
+----------------------------------------------------------------+
| [Delete]  [secondary]  [Primary]                                |   CardActionRow, 44px, expanded only
+----------------------------------------------------------------+
```

- Surface: glass `base`, flat (no drop shadow inside lists), 1px theme outline, radius `var(--card-radius)` set through `--glass-radius` (no radius utility, so nothing can conflict), 4px leading rail in the tone colour, `overflow: hidden` unless a sticky header needs `allowOverflow`.
- Header grid: `[leading media (decorative)] [main: title, meta, chips, details] [trailing controls] [affordance chevron]`. Padding 6px outside, 10px inside the main block (12px when there is no media), so the text starts about 16-18px from the card edge.
- Title: real heading, `h2` for top-level cards on a page, `h3` default, `h4` nested. 16px / 600 / `leading-snug`, balanced wrap, `overflow-wrap: anywhere` so long names wrap instead of clipping. Optional secondary text inline in muted 14px.
- Meta: one style, 12px / 500, secondary text, facts joined by a middle dot (decorative, `aria-hidden`). Falsy items drop out.
- Chips: status only (see 4.3). Counts and facts are meta, not chips.
- Details: `StatBlock` (11px eyebrow label, 14px / 600 values joined by a dot) for targets; a quiet 11px uppercase line for progression state.
- Affordance: decorative chevron, last in the row. Right = the header navigates or runs an action. Down (rotates 180 degrees when open) = the header expands a panel. None = static or select card.
- Controls: standalone controls sit in `trailing`, never inside the header button. Order: [info] [drag handle] then the chevron; exercise rows stack them vertically.
- Action row: attached inside the surface as its last child, 44px buttons, destructive first (left), neutral or toggle next, primary last (right). Destructive actions never live in a card corner.

### 3.1 Tokens (`cardTokens.ts`)

| Token | Value | Notes |
|---|---|---|
| surface | `glass-surface glass-sheen ... shadow-none [--glass-radius:var(--card-radius)]` | theme radius, theme outline |
| tone rail / ring | `cardAccentRailClassNames` / `cardShellToneClassNames` | neutral, current, logged, completed, attention, pr |
| title | 16px / 600 / snug / -0.01em | `text-base font-semibold` |
| title secondary | 14px / 500 muted | inline after the title |
| meta | 12px / 500, `text-secondary/0.92` | min 11px floor enforced by test |
| eyebrow label | 11px / 600 / uppercase / 0.12em | `StatBlock` label |
| chip | `Chip` (`AppBadge`) with `px-2.5 py-1`, 11px uppercase | the shared badge tokens |
| padding | header 6px / 10px / 12px; body 16px | `px-4 pb-3` for body, divider `border-t` |
| tap target | `min-h-11 min-w-11` | in `cardTokens.iconControl` and the action buttons |
| gap between cards | 8px (`gap-2`) | `cardTokens.list` |
| motion | chevron rotation 150ms, `motion-reduce:transition-none` | no transform animation on press beyond the glass press state |

### 3.2 Primitives

| Primitive | File | Contract |
|---|---|---|
| `CardSurface` | `CardSurface.tsx` | `tone`, `empty` (dashed), `showRail`, `allowOverflow`; renders `data-card-surface`, `data-card-tone` |
| `CardHeader` | `CardHeader.tsx` | `title` (heading level 2-4), `titleSecondary`, `meta`, `chips`, `details`, `leading`, `trailing`, `interaction` = `none` / `press` / `toggle` / `select`. Interaction renders one stretched button labelled by the title and described by the meta (`aria-labelledby`, `aria-describedby`), with `aria-expanded` + `aria-controls` (toggle) or `aria-pressed` (select). The button has no children, so there is never a nested interactive element |
| `CardMeta` | `CardMeta.tsx` | `items`, dot separators, `flush` |
| `CardChip`, `CardStatusChip`, `CardChips` | `CardChip.tsx` | tones neutral / current / success / attention / danger; fixed vocabulary `active, today, inSession, done (check), skipped (glyph), rest, optional, selected` |
| `DragHandle` | `CardControls.tsx` | 44x44, `touch-none`, accessible name, `title="Drag to reorder"`, pointer handlers pass through, `onMove(-1 | 1)` for ArrowUp / ArrowDown |
| `CardIconButton`, `CardInfoButton` | `CardControls.tsx` | 44x44 icon controls with required `label` |
| `CardActionRow`, `CardActionFrame`, `getCardActionButtonClassName` | `CardActionRow.tsx` | labelled group, 44px buttons, intents `danger`, `neutral`, `toggle`, `primary` mapped onto the dock chrome; `neutral` uses the full-strength secondary look, not `toggleInactive` |
| `StatBlock` | `StatBlock.tsx` | `<dl>` label + dot-joined values |
| `CardEmptyState` | `CardEmptyState.tsx` | dashed `CardSurface`, heading, plain body, optional action |

Rule for authors: only `cardTokens.ts` may restate button chrome with `!`. The global `button` rule is unlayered and out-ranks utilities; the contract test fails if a component adds its own `!bg-`, `!border-` or `!text-` utility.

### 3.3 Composed cards

| Card | Header | Details / body | Footer | Interaction |
|---|---|---|---|---|
| Routine (`RoutineBrowseCard`) | name; chips: ACTIVE; meta: counts (exercises, training days, rest days, sessions), last session, created date | week strip (active routines): one cell per day, weekday + exercise count or Rest, glyph for done / skipped, wraps | Delete (+ Set Active for inactive) behind a more control | header opens the routine; more control toggles the action row |
| Day (`RoutineOverviewDayCard`) | custom title or `Day N`; chips TODAY, IN SESSION, DONE, SKIPPED, REST, OPTIONAL, SELECTED; meta: `Day N` (when a custom title leads), weekday, split | vertical exercise recap while expanded (name, target, meta) | Delete, Set Optional / Rest / Required, Edit or Create | header toggles (routine detail) or presses (Today picker selects, workout-plan list opens); drag handle trails |
| Exercise (`ExerciseRowCard`) | 56px thumbnail; name; meta (muscle, pattern); `StatBlock` Target; progression state | editor panel while expanded | in-panel | header toggles (aria-expanded, panel id and test ids unchanged); drag handle + info trail, stacked |
| Rest day (`RestDayCard`) | "Rest"; shared rest copy | - | - | none |
| Chooser (`WorkoutPlanChooserSourceCard`) | title; meta; SELECTED chip | vertical recap, max 4 + "+N more" | - | `select` (`aria-pressed`) |

Tones: routine active = `current`; inactive = `neutral` (no warning gradient); day today / selected = `current`, in session = `logged`, rest = `attention`; exercise expanded = `current`; selected chooser = `current`.

## 4. Rules

### 4.1 Interaction and affordance

- One affordance per card. Chevron right navigates, chevron down expands. A card that both navigates and reveals actions (routine card) uses the header for navigation and a separate "Actions for X" control (more dots, `aria-expanded`) for the action row.
- Whole header is the target (>= 44px tall). Standalone controls keep their own 44px target and are siblings of the header button.
- Delete is never a corner control. It sits in the action row and still goes through `ConfirmDestructiveModal`.
- Drag: pointer drag is unchanged (handlers pass through). Keyboard: focus the handle, ArrowUp / ArrowDown moves one position and submits the same reorder action; focus returns to the moved handle.

### 4.2 Typography

Title 16px, meta 12px, labels and chips 11px. Nothing under 11px. Tabular or semibold numbers for counts. Long names wrap; nothing is truncated with an ellipsis.

### 4.3 Status chips

Always text; DONE and SKIPPED add a glyph; tone maps onto `Chip` tones. Vocabulary is fixed in `cardStatusChips` so every surface spells and tones them identically. Chips are for status, not counts.

### 4.4 Day-label rule

Single rule, implemented in `src/lib/routines.ts`:

- A stored day name is a generated placeholder when it is a bare number (`7`), `Day 7`, or any weekday name (`Tue`, `Tuesday`). Placeholders are ignored: position and weekday are derived from `dayIndex` and the routine start date, never from the stored name. Seeds store `name = String(index + 1)`, so after a reorder the stored number no longer equals the position; previously that made the day look custom (`7 Tue`).
- Headline = custom title, otherwise `Day N` (`Rest` for an unnamed rest day). When a custom title leads, `Day N` moves to the meta line. The weekday is always meta.
- Only the day's own weekday prefix in a legacy name (`Wed | Forge` at a Wednesday position) is stripped from the editable name. Another weekday prefix (`Sat | Long run` at a Monday position) is a user title and is kept.
- No stored data changes and no server behaviour change. The broader placeholder test is render-side only (`isRoutineDayDisplayPlaceholderName`, used by `getRoutineDayEditableName`). The server duplicate-day path (`resolveDuplicatedRoutineDayName`) keeps the original position-matching predicate `isRoutineDayDefaultName`, so what a duplicate persists is unchanged: a stored `7` at position 6 is copied as `7`, not renumbered. A user title that is itself a placeholder pattern (`Day 7`, `Tue`, `7`) reads as default on screen; that is intentional.
- API: `getRoutineDayHeading`, `isRoutineDayGeneratedPlaceholderName`, `isRoutineDayDisplayPlaceholderName`, `isRoutineDayDefaultName` (unchanged), `getRoutineDayEditableName` (strips the day's own weekday prefix).

### 4.5 Copy

Canonical terms (AGENT.md): routine, day, workout, session, exercise, set. Card copy touched by PR 1 changed: `workout plans` -> `training days`, `rest` -> `rest days`, `sessions logged` -> `sessions`, `No sessions logged` -> `No sessions yet`; toasts and delete confirmation on day cards say `day`. The Add Day chooser ("Blank workout plan", "Duplicate workout plan") and the Workout Plans screen keep their product names; see the migration plan.

### 4.6 States

- Empty: `CardEmptyState` (dashed surface, heading, plain body, one action).
- Selected / current / attention: tone rail and ring plus a text chip.
- Disabled: native `disabled` on the control; actions in the row dim; no hidden state.
- Loading and error cards: not part of PR 1; use the same surface with a heading and plain text (migration plan, lane G-shared).

### 4.7 Accessibility

- Headings: each card title is a heading (`h2` on list pages) so assistive tech can jump between cards.
- Header button name = title, description = meta; state in `aria-expanded` / `aria-pressed`, not in the label.
- Label in name: visible action text is contained in its accessible name (`Set Optional: Day 1 is currently Active`).
- Focus: 2px inset ring on the header, ring on controls; order follows the DOM (header, trailing controls, action row).
- Reduced motion: chevron rotation `motion-reduce:transition-none`; no other card animation.
- Non-colour cues: chips with text, glyphs for done / skipped, "Rest" text in week cells, dashed outline for empty.

## 5. Visual verification

- Fixture: `/dev/card-system` (gallery), and the existing `/dev/mobile-regression?screen=routines|edit-day...` scenarios exercise the migrated screens with fixture data.
- Viewports 320x568, 390x844, 430x932; themes default, rose and test (`fawxzzy:app-theme-selection` in `localStorage`). The app is dark-only (`color-scheme: dark`); there is no light theme to test.
- Probes per screenshot: horizontal page overflow, controls under 44px.

## 6. Migration plan (not in PR 1)

| Lane | Scope | Notes |
|---|---|---|
| Today | `TodayExerciseRows`, `PlannedExerciseSummaryRow`, `StandardExerciseRow` -> `ExerciseRowCard` (press / none); skipped-row card; `DayDetailStateCard` -> `CardSurface`; `EmptyState` -> `CardEmptyState`; day picker already adopts the day card | C1 findings 3, 21 (empty day has no message; flush empty text) |
| Session | `ExerciseDisclosureCard` (`session-exercise` scope) + `SessionExerciseFocus` rows -> `ExerciseRowCard` with the progress-fill variant; `AttachedQuickActionStrip` -> `CardActionRow`; set logger panels, feedback prompt (24px effort buttons), info buttons | `SessionExerciseFocus.tsx` is being edited by lane K1 (offline quick-log, UTC day key): adopt only after K1 lands, minimal diff |
| History | `HistorySessionCard`, `HistoryExerciseCard`, `HistoryDetailExerciseCard`, the copied expanded card in `HistoryScopeSummarySurface` / `WeeklyProgressSurface` / `HistoryMetricsDisclosure` -> `CardSurface` + `CardHeader` toggle; calendar day cells 35 -> 44px; rails -> wrapping rows | coordinate with the History heatmap lane (E); C1 finding 7 |
| Settings / account | remove call-site stripping (`!border-transparent ...`), `SettingsAccordion*` -> `CardHeader` toggle, theme tiles, "SLOT 1/2/3" placeholders | C1 findings 13, 15 |
| Routine editor and creation | `RoutineChooserMenu` cards, `CreateRoutine*`, `DayDetailStateCard`, day-settings panel, `RoutineEditorShared`, `ProgressionPlaybookEditor` (7.4k lines, own lane); Add Day modal terminology; Workout Plans screen naming; page header ACTIVE chip clipped at the right edge | C1 findings 5, 6, 14 |
| Onboarding | `CuratedInfoCard`, `CuratedOptionCard`, review `<details>` -> `CardSurface` / `select`; `routineCardChrome.ts` and `.routine-card-delete-*` CSS are kept only because `CuratedOnboardingShell` still imports them | blocked on lane B merge; adopt in a separate follow-up |
| Retire legacy | when no caller is left: `ExerciseCard`, `StandardExerciseRow`, `ExerciseDisclosureCard`, `DayList` `DayCard`, `RoutinesListItemCard`; the 14 dead components; `cn` collisions in `AppPanel` / `SurfaceCard` | `ExerciseCard` still serves Session, History, Today rows and the picker |
| Global a11y tokens | `.bottom-action` `toggleInactive` text at 64% (3.66:1), 8.5-9.9px text in `ExerciseCardStandardTitle` and `appTokens`, `[type="button"]` unlayered rule (wrap in `:where()` once nothing depends on the override), a shared hit-area utility | C1 findings 8, 9, 10 |

## 7. Decisions (and why the alternatives lost)

| # | Decision | Reason | Alternatives rejected |
|---|---|---|---|
| D1 | New primitives, not another prop on `ExerciseCard` | `ExerciseCard` has 40+ props and exists to be overridden (`!` everywhere). Routine and day cards have no exercise semantics. | Restyle `ExerciseCard` globally: changes Session and History in PR 1 with no verification; bigger blast radius |
| D2 | Surface = glass `base` with `--glass-radius: var(--card-radius)` | Keeps the user-selectable card outline and theme radius; no radius utility to collide with `.glass-surface` | `AppPanel` / `Card`: collisions listed in 1.3; `Card.tsx` has 0 importers |
| D3 | Header is one stretched, labelled button; controls are siblings | Valid HTML (no button in button, no heading in button), one 44px+ target, exact test ids kept | Make the whole card a button: nested controls become invalid and unreachable |
| D4 | Delete moves from the corner into the action row | 46x16 target next to the row tap area; destructive action beside navigation is an accident risk | Keep a 44px corner icon: crowds 320px headers, still adjacent to the tap area |
| D5 | Routine card: header always opens the routine; a more control reveals Delete / Set Active | One rule for active and inactive; removes the "tap expands on inactive, navigates on active" split | Keep the split: same card, two behaviours. This is the one deliberate behaviour change (7.1) |
| D6 | Week strip (weekday + count, wraps) replaces horizontally scrolling day tiles | Nested scroller clipped content (C1 #7), nested `border-2` cards, 3x the height | Keep a rail with edge fades: still hides content, still a scroller in a scroller |
| D7 | Chips are status only; counts are meta text | Status was buried in a row of count chips; 11px meta reads better than 9.5px chips | Keep count chips: three chip sizes, clipped |
| D8 | Drag handle is a conventional grip in a 44px control, trailing; keyboard ArrowUp / ArrowDown added | The up/down arrows glyph floated mid-card at 28px; pointer-only drag had no keyboard path | Keep the glyph: unreadable at 28px, still pointer-only |
| D9 | Day label: position-derived `Day N`; custom title replaces the headline; position and weekday stay in meta | Fixes `7 Tue`; position is always visible after a reorder; no data migration | `Day N` always the headline with the title secondary: hides the label users actually scan for |
| D10 | Custom day title wins on rest days (`Recovery` + REST chip) | The title is user-authored; the chip carries the type. The old card forced "Rest" over the user's title | Force "Rest": discards user text |
| D11 | No accent underline under titles | It repeated under every title and label (3 per exercise card) and added no information | Keep: visual noise, extra DOM |
| D12 | Inactive routine tone = `neutral`, not a warning gradient | Inactive is not a warning; `attention` is reserved for rest and needs-setup | Keep gradient: reads as an error state |
| D13 | `neutral` action intent uses the full-strength secondary look | `toggleInactive` measured 3.66:1; the fix belongs in a global token PR, the card system just avoids it | Reuse `toggleInactive`: inherits the contrast failure |
| D14 | Directory `card-system/`, not `card/` | `ui/Card.tsx` exists; `card/` collides on case-insensitive filesystems (it broke typecheck on Windows) | `card/`: breaks on Windows |
| D15 | Truth pack untouched | The pack is frozen and its ids are asserted | Add `exercise-card` / `day-card` ids: requires changing the freeze test |

### 7.1 Behaviour changes in PR 1 (explicit)

- Inactive routine cards: tapping the card now opens the routine (previously it expanded Set Active / Edit). Set Active and Delete moved behind the "Actions for X" control; Edit is the card tap.
- Delete on routine and day cards needs the expand step first (one extra tap), then the existing confirmation modal.
- Day cards: rest days show the user's custom title when one exists; day recap shows only while the card is expanded; recap is vertical.
- Routine list shows a week strip for the active routine instead of scrolling day tiles; inactive routines still show none.
- Drag handles are 44px and keyboard operable; reorder actions, payloads and endpoints are unchanged.
- Copy: day / session terminology on the cards listed in 4.5.
- Today is touched, and was in scope only through shared pieces: the Today day picker (`TodayDayPicker`) renders `RoutineOverviewDayCard` (each card wrapped in an `li` through `asListItem`, so the `DayList` `ul` keeps list semantics; it no longer goes through `DayCard`), and Today renders the shared `RestDayCard` (`TodayDayPicker`, `TodayExerciseRows`). The picker card gets the new anatomy, chips and 44px targets; picking a day, the selected state and `onPress` are unchanged. The rest of Today (exercise rows, empty states) is not migrated.
- Day editor: the `ORDER n` badge on exercise cards became a text meta fact (`Order n`, the first meta item), so the order cue survives the chip-for-status-only rule (D7).
- Set Active on a routine card has the accessible name `Set Active: <routine>` (the visible text leads the name, WCAG 2.5.3); while saving it reads `Saving: <routine>`.
- Reorder (days and exercises): the handle stays focusable while a save runs (`aria-disabled`, not `disabled`), arrow keys are ignored during a save (one save at a time on the day editor, as on the day list), a polite live region announces `<name> moved to position N of M`, and the handle is described by the arrow-key hint (`aria-describedby`).
- Day-settings autosave: the name field shows the render-side rule (a stored placeholder reads as empty) but a toggle sends the stored name back unchanged unless the field was edited, so no autosave persists the position number over a stored name (`resolveRoutineDaySettingsSubmitName`). It no longer strips a legacy own-weekday prefix on a toggle.
- Reorder announcements use the heading the day showed before the move (custom title, else `Day N` / `Rest`), and a failed save announces "Could not reorder ...; order restored".
- Escape closes an open "Actions for X" row and returns focus to its control (routine and workout-plan cards).
- Follow-up (not in PR 1): Escape does not close an expanded day-card footer; only the routine and workout-plan "Actions for X" rows close on Escape.
- "N training days" is normalized from older cached strings ("N workout plans"); the cached count and a freshly computed one can differ until the routines cache refreshes.

## 8. Tests

- `npm run test:card-system` (13 files, 89 tests, wired into `CI` after the board export check): primitive anatomy, ARIA, tap targets, no sub-11px text, no sideways scroll, no hard-coded radius, dev route blocked in production, routine / day / chooser / rest-day cards, edit-day wiring, day-label rule, card copy, action wiring (`routineCardActions.test.ts`: Delete asks for confirmation with the routine, Set Active hands over the routine id, labels are contained in accessible names), reorder accessibility wiring, the Today picker `li` wrapping, and the pinned server duplicate-day behaviour (`routine-day-creation.test.ts`). There is no DOM test library in the repo, so the delete-confirm and set-active flows are covered by the pure action builder plus source-level wiring assertions and a headless click pass on the dev fixture, not by simulated clicks in a unit test.
- Existing contract tests updated deliberately in the same PR: `RoutineBrowseCard`, `WorkoutPlanChooserSourceCard`, `RestDayCard` (now `RoutineDayCard`), `RoutineHomeSurface`, `RoutinesPageClient`. `test:rest-day-cards` now points at `RoutineDayCard.contract.test.tsx` (the deleted `RestDayCard.contract.test.ts` was still in that script). Their old assertions pinned class strings that no longer exist.
- Known pre-existing failure, not touched: `src/app/routines/CreateWorkoutPlanFlow.contract.test.ts` asserts strings that are not in `CreateRoutineDayClient.tsx` at `origin/main`; it was never wired into a workflow.
