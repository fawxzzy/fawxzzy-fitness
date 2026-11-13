# Fitness Card System

One card surface, one header, one set of controls. This document is the owner spec for every card-like UI in Fitness: routine cards, day cards, exercise cards, and (as they migrate) Today, History, Settings, Session and onboarding cards.

- Code: `src/components/ui/card-system/` (primitives), composed cards in `src/components/routines/`, `src/components/day-list/`, `src/components/workout/ExerciseRowCard.tsx`.
- Living gallery (dev only, blocked in production): `/dev/card-system`.
- Contract tests: `npm run test:card-system` (wired into the `CI` workflow).
- Relationship to the frozen truth pack (`truth-pack/fitness/design-system/`): the pack is unchanged. The card system consumes the same theme variables (`--card-radius`, `--accent`, `--surface-*`, `--text-*`, `--success-rgb`, `--warning-rgb`, `--danger-rgb`) and the existing tone map `src/components/cardSemanticTones.ts`. It does not add a primitive id to the pack (the design-system contract test freezes the ids `header, card, badge, section-layout`).

Status: PR 4 migrates the History screens (section 7.3). PR 1 migrated the Routines screens (routine list, routine detail with day cards, add-day chooser, workout-plan list, day editor exercise cards) and the shared pieces they carry into Today (day picker, rest-day card). PR 2 migrates the rest of Today: exercise rows (selected day, in-session summary, offline fallback, view-day list), the day state and empty states, the notices, and the exercise info control (section 7.2). Everything else is inventoried below with a migration plan.

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
| `DayDetailStateCard` | day editor | eyebrow-as-title + body, `rounded-[1.25rem]`, `appTokens.detailState*` | NOT migrated: the frozen design-system contract test (`tests/design-system-contract.test.mjs`) ties it to the `detailState*` tokens, and its only caller left is the day editor (routine editor lane decides). Today stopped using it in PR 2: `TodayDayStateCard` |
| Day-settings panel (`EditDaySettingsAutosaveForm`), routine editor panels (`RoutineEditorShared`, `RoutineEditorForm`, `ProgressionPlaybookEditor`) | edit routine / edit day | `AppPanel` + inner rows, section chrome | NOT migrated (lane R) |
| `ExerciseCard` (`components/ExerciseCard.tsx`, 664 lines, 40+ props) | session, picker, stretch panel, dev fixtures (through `StandardExerciseRow`, `ExerciseDisclosureCard`, `PlannedExerciseSummaryRow` and directly); History stopped using it in PR 4 | the shared engine for routine, day and exercise cards | no longer used by any Routines, Today or History card; still the engine for Session, the picker and the stretch panel |
| Today rows (`TodayExerciseRows`, the day picker rows, the compact skipped row) | Today page (in-session list, selected day), `TodayClientShell` (offline fallback), view-day list, dev fixtures | `PlannedExerciseSummaryRow` -> `StandardExerciseRow` -> `ExerciseCard` with `!` overrides, 88px media rail, 26px overlay info button, corner `1 / 4` text, sideways metric grid in `detailed` density, dimmed (opacity 60) compact skipped row | `TodayExerciseCard` -> `ExerciseRowCard` (`interaction: none`), 44px `CardInfoButton`, text progress, DONE / SKIPPED chips |
| Today state and empty cards, notices | `TodayDayPicker`, `TodayClientShell`, Today page | `EmptyState` (blank icon tile + 21px title), `DayDetailStateCard`, `rounded-[var(--radius-md)]` text boxes, `appTokens.detailStateCard` summary box, no empty-day message | `CardEmptyState`, `TodayDayStateCard`, `CardNotice` |
| `HistorySessionCard` (3 modes), `HistoryExerciseCard`, `HistoryDetailExerciseCard`, the copied expanded card in `HistoryScopeSummarySurface` / `WeeklyProgressSurface` / `HistoryMetricsDisclosure`, `HistoryCalendarSurface` (PR 4) | History list, exercise browser, session detail | `ExerciseCard` / Glass with `!` overrides, one recipe copied into three files, rotating badges, sideways stat rails, 35px calendar cells, `rounded-[1rem]` borderless header rows | `HistoryDisclosureCard`, `HistorySessionCard` (`CardHeader` `link`), `HistoryDetailExerciseCard` / `HistoryExerciseCard` on `CardSurface` + `CardHeader`, `StatGrid`, calendar pager |

### 1.2 Elsewhere (summary)

- Shared wrappers (24 rows): `AppPanel`, `SurfaceCard`, `Glass`, `EmptyState`, toast card, metric tiles, `AppBadge` / `Chip` / `Pill`, `StateChevron`, `ConfirmDestructiveModal`, and others.
- Session flow (21): `ExerciseCard`, `StandardExerciseRow`, `ExerciseDisclosureCard`, `SessionExerciseFocus` rows, `AttachedCardActionStripFrame` / quick-log strip, set logger panels, feedback prompt, `ExercisePicker` rows, info sheet.
- History (15): session cards (3 modes), exercise cards, expanded disclosure cards (the same recipe copied into 3 files), calendar, progression dashboard and charts, set cards.
- Today (6; migrated in PR 2 except the recovery shadow placement card), Settings/account (9), progression / exercises / stretch (7), onboarding (4, inventory only: `CuratedInfoCard`, `CuratedOptionCard`, review `<details>`, questionnaire rows, progress dots).
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
| `CardHeader` | `CardHeader.tsx` | `title` (heading level 2-4), `titleSecondary`, `meta`, `chips`, `details`, `leading`, `trailing`, `interaction` = `none` / `press` / `toggle` / `select` / `link` (a stretched anchor with `href`, right chevron, `aria-current`; PR 4). Interaction renders one stretched button labelled by the title and described by the meta (`aria-labelledby`, `aria-describedby`), with `aria-expanded` + `aria-controls` (toggle) or `aria-pressed` (select). The button has no children, so there is never a nested interactive element |
| `CardMeta` | `CardMeta.tsx` | `items`, dot separators, `flush` |
| `CardChip`, `CardStatusChip`, `CardChips` | `CardChip.tsx` | tones neutral / current / success / attention / danger; fixed vocabulary `active, today, inSession, done (check), skipped (glyph), rest, optional, selected` |
| `DragHandle` | `CardControls.tsx` | 44x44, `touch-none`, accessible name, `title="Drag to reorder"`, pointer handlers pass through, `onMove(-1 | 1)` for ArrowUp / ArrowDown |
| `CardIconButton`, `CardInfoButton` | `CardControls.tsx` | 44x44 icon controls with required `label` |
| `CardActionRow`, `CardActionFrame`, `getCardActionButtonClassName` | `CardActionRow.tsx` | labelled group, 44px buttons, intents `danger`, `neutral`, `toggle`, `primary` mapped onto the dock chrome; `neutral` uses the full-strength secondary look, not `toggleInactive` |
| `StatBlock` | `StatBlock.tsx` | `<dl>` label + dot-joined values |
| `StatGrid` | `StatGrid.tsx` | wrapping `<dl>` grid of label + value (+ meta, direction glyph with visually hidden text); replaces sideways stat rails; long values take their own row (PR 4) |
| `CardEmptyState` | `CardEmptyState.tsx` | dashed `CardSurface`, heading, plain body, optional action |
| `CardNotice` | `CardNotice.tsx` | inline screen notice (not a list card): tones `neutral`, `attention`, `danger`; `role="status"` (`alert` for danger); a "!" glyph backs the colour for attention and danger |

Rule for authors: only `cardTokens.ts` may restate button chrome with `!`. The global `button` rule is unlayered and out-ranks utilities; the contract test fails if a component adds its own `!bg-`, `!border-` or `!text-` utility.

### 3.3 Composed cards

| Card | Header | Details / body | Footer | Interaction |
|---|---|---|---|---|
| Routine (`RoutineBrowseCard`) | name; chips: ACTIVE; meta: counts (exercises, training days, rest days, sessions), last session, created date | week strip (active routines): one cell per day, weekday + exercise count or Rest, glyph for done / skipped, wraps | Delete (+ Set Active for inactive) behind a more control | header opens the routine; more control toggles the action row |
| Day (`RoutineOverviewDayCard`) | custom title or `Day N`; chips TODAY, IN SESSION, DONE, SKIPPED, REST, OPTIONAL, SELECTED; meta: `Day N` (when a custom title leads), weekday, split | vertical exercise recap while expanded (name, target, meta) | Delete, Set Optional / Rest / Required, Edit or Create | header toggles (routine detail) or presses (Today picker selects, workout-plan list opens); drag handle trails |
| Exercise (`ExerciseRowCard`) | 56px thumbnail; name; meta (muscle, pattern); `StatBlock` Target; progression state | editor panel while expanded | in-panel | header toggles (aria-expanded, panel id and test ids unchanged); drag handle + info trail, stacked |
| Rest day (`RestDayCard`) | "Rest"; shared rest copy | - | - | none |
| Today exercise (`TodayExerciseCard` on `ExerciseRowCard`) | 56px thumbnail; name (h2); meta (muscle, pattern; view-day adds equipment); chips DONE / SKIPPED | `StatBlock` Target; progression state; progress text (`2 / 4 sets`, or `Progression: 3/4 sets` in the picker) with a decorative bar | picker: `CardActionRow` (Promote / Apply regression / Revert) inside the card | none (static); info control trails, 44px |
| Today day state (`TodayDayStateCard`) | heading; chip `Partial` (warning) or `Can't start` (blocking) | plain body | - | none |
| Chooser (`WorkoutPlanChooserSourceCard`) | title; meta; SELECTED chip | vertical recap, max 4 + "+N more" | - | `select` (`aria-pressed`) |

Tones: routine active = `current`; inactive = `neutral` (no warning gradient); day today / selected = `current`, in session = `logged`, rest = `attention`; exercise expanded = `current`; selected chooser = `current`; Today exercise completed = `completed` (with a DONE chip); Today day state warning and blocking = `attention` (a chip carries the difference).

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
| Today | DONE in PR 2: `TodayExerciseRows` / picker rows / skipped row -> `TodayExerciseCard` on `ExerciseRowCard`; `EmptyState` -> `CardEmptyState`; summary and no-scheduled cards -> `TodayDayStateCard`; notices -> `CardNotice`; info control -> `CardInfoButton`. Left on Today: `TodayRecoveryShadowPlacement` (40px buttons, recovery lane), `DayDetailStateCard` (day editor, frozen tokens) | C1 findings 3, 21 fixed; 23 (finish screen) is Session, not Today |
| Session | `ExerciseDisclosureCard` (`session-exercise` scope) + `SessionExerciseFocus` rows -> `ExerciseRowCard` with the progress-fill variant; `AttachedQuickActionStrip` -> `CardActionRow`; set logger panels, feedback prompt (24px effort buttons), info buttons | `SessionExerciseFocus.tsx` is being edited by lane K1 (offline quick-log, UTC day key): adopt only after K1 lands, minimal diff |
| History | DONE in PR 4 (section 7.3): session, exercise and detail-exercise cards, the three copied expanded cards (one `HistoryDisclosureCard`), calendar pager with 44px-tall cells, stat rails -> `StatGrid` / wrapping lists. Left: the heatmap grid labels (9-10px, sized to fit 16 weeks at 320px), the filter toggle (60x36), the session detail set cards and focused panels (`rounded-[1.05rem]`, session lane), `ProgressionHistorySurface` and the dashboard cards | C1 findings 7, 8, 10 (History part) |
| Settings / account | remove call-site stripping (`!border-transparent ...`), `SettingsAccordion*` -> `CardHeader` toggle, theme tiles, "SLOT 1/2/3" placeholders | C1 findings 13, 15 |
| Routine editor and creation | `RoutineChooserMenu` cards, `CreateRoutine*`, `DayDetailStateCard`, day-settings panel, `RoutineEditorShared`, `ProgressionPlaybookEditor` (7.4k lines, own lane); Add Day modal terminology; Workout Plans screen naming; page header ACTIVE chip clipped at the right edge | C1 findings 5, 6, 14 |
| Onboarding | `CuratedInfoCard`, `CuratedOptionCard`, review `<details>` -> `CardSurface` / `select`; `routineCardChrome.ts` and `.routine-card-delete-*` CSS are kept only because `CuratedOnboardingShell` still imports them | blocked on lane B merge; adopt in a separate follow-up |
| Retire legacy | when no caller is left: `ExerciseCard`, `StandardExerciseRow`, `ExerciseDisclosureCard`, `PlannedExerciseSummaryRow` (only `SessionOfflineShell` left), `DayList` `DayCard`, `RoutinesListItemCard`, `ui/EmptyState` (only the dev `UiSystemShowcase` left), the `today-detailed` fixture id (now identical to `today-default`), the `todaySummaryCenteredShell` token (no caller); the 14 dead components; `cn` collisions in `AppPanel` / `SurfaceCard` | `ExerciseCard` still serves Session, the picker and the stretch panel; `HistoryMetaLine`, the session title builders, `HistoryDisclosureTitle` and `HistoryCompactDisclosure` were removed in PR 4 |
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

| D16 | Today exercise rows are static `ExerciseRowCard`s: `interaction: none`, no header button | Today rows never navigated or expanded (the old row had `onPress` unset); a button that does nothing is worse than none | Make the row open the exercise info: a second way to do what the info control does, changes tap behaviour |
| D17 | Info control = `CardInfoButton` (44px) in the trailing slot; `ExerciseInfoIconButton` now renders it and lost its `className` prop | C1 finding 8: 26px `i` overlay in the corner of the row; Today was its only caller | Keep the 26px overlay and pad its hit area: still absolutely positioned over the text block |
| D18 | Progress is text first (`2 / 4 sets`), the bar is decorative (`aria-hidden`); the old whole-row tint fill is gone | The fill carried the number only visually; text carries it for everyone | Keep the gradient fill and add a text label: two encodings of one number, and the fill needed the old engine |
| D19 | Picker progression readiness (`progressFill`) shows as `Progression: <label>` + bar | Same information as the old fill (the label comes from the same `ProgressionProgressFill`) | Drop it: loses the "ready to promote" cue |
| D20 | Skipped = compact card (no thumbnail, no target) with a SKIPPED chip; no dimming | `opacity-60 saturate-[0.78]` lowered text contrast below AA; the chip is the signal (principle 5) | Keep the dimmed row: contrast failure, colour-only meaning |
| D21 | The picker's progression action (Promote / Apply regression / Revert) is a `CardActionRow` inside the card; Revert uses the `neutral` intent | Same pattern as every other card footer (D13); the old strip was a sibling that squared off the card corners | Keep `AttachedCardActionStripFrame`: second action-strip recipe |
| D22 | `density="detailed"` is removed from Today rows and the picker (`exerciseDensity`) | Production never passed it (the picker defaulted to compact, the page never set it); only dev fixtures did; `detailed` rendered a three-metric sideways scroller (C1 finding 7) | Port the scroller: nested scroller, three facts (Logged, Next, Tracking) the card already shows as progress and target |
| D23 | Empty training day renders `CardEmptyState` + an `Add exercises` link to the day editor (`getRoutineDayEditHref(routineId, dayId, "/today")`) when the routine id is known | C1 finding 3: the page was blank | Message only: leaves the user without a way out |
| D24 | No-routine Today: one message. The header keeps "No active routine"; its second line is dropped; the card says "Choose a routine" | C1 finding 21: two messages for one state | Keep both and reword: still two |
| D25 | Blocking day state keeps the `attention` rail and adds a danger chip (`Can't start`); there is no danger tone in `cardSemanticTones.ts` | Adding a tone changes a frozen record used outside cards; the text chip carries the severity | Add a `danger` tone: wider blast radius for one card |
| D26 | `TodayDayStateCard` is new; `DayDetailStateCard` stays for the day editor | `tests/design-system-contract.test.mjs` asserts `DayDetailStateCard` reads `appTokens.detailState*` (truth pack); loosening a frozen contract belongs with the routine editor lane | Rewrite `DayDetailStateCard` and edit the contract test: touches the frozen pack and the routine editor in a Today PR |
| D27 | Target, progression and goal-line formatting lives in `exerciseRowCardValues.ts` and is shared by the day editor and Today | One rule for what a stored goal line becomes ("Goal:" prefix, "goal missing", separators) | Duplicate the helpers in Today: two rules drift |

| D28 | The streak, monthly, calendar, heatmap, scope and cycle summaries are one `HistoryDisclosureCard` (`CardSurface` + `CardHeader` toggle, panel stays mounted while collapsed) | One recipe was copied into three files with its own radius, chevron ternary and 4px yellow or green rail | Keep three copies and restyle each: drift |
| D29 | Rotating summaries and badges (3.2 s timers in Monthly, Streak, Consistency, session cards and exercise rows) are gone: all facts show at once on a wrapping meta line or as chips | A timer with no pause fails WCAG 2.2.2 and hid all but one fact; nothing is lost. The fire emoji in the streak summary was decorative and is dropped | Keep the rotation with a pause control: more UI for less information |
| D30 | The decorative yellow and green accent bars become tones: yellow (scope, weekly, monthly) -> `current`, green (streak, calendar, heatmap) -> `logged`; a selected session is `current` with `aria-current` | The colours carried no meaning of their own; the card tones already pair with text | Keep the custom gradients: a third rail system |
| D31 | `CardHeader` gets a `link` interaction (stretched `<a>`, same hit area and chevron as `press`); shared primitive, additive | History rows navigate and must stay real links (open in a new tab, prefetch). Wrapping the card in a link puts the heading and, in the detailed card, the whole body inside the anchor | `press` with `router.push`: loses link semantics |
| D32 | Stat rails are `StatGrid`: a wrapping description list. Arrow tints on transition values are dropped (direction is a glyph plus text) | `SurfaceMetricGrid scrollable` clipped values mid-word inside a card (C1 finding 7) | Edge fades on the rail: still hidden values and a scroller in a scroller |
| D33 | `DetailSectionItems` `inline` layout wraps (only History used it) and both layouts are `ul` / `li`; `DetailSectionBadge` and the AUTO / MANUAL tokens are 11px | The recap and rest rows were one-line scrollers; list semantics and the 11px floor are card-system rules. Shared: the exercise info sheet and the session detail get the same badge size | Fork a History-only list: two recap components |
| D34 | The calendar shows one month at a time (newest first) with older / newer 44px controls and a polite live month label; day cells are 44px tall and share the card width | Four 280px months side by side forced 35px cells and a sideways scroller. A month of 44px-wide cells is 332px, wider than the card at every supported width, and four stacked months are about 1100px | Keep the rail with bigger cells: a month wider than the screen |
| D35 | Session signals are status chips with full words (`Promotion`, `Regression`, `Watch`, `Manual`, `Progression event`); the compact card also shows the outcome and progress sentences | `PROMO` / `REG` / `EVENT` were cryptic abbreviations; the sentences were computed and never shown in the compact card | Keep abbreviations: needs a legend |
| D36 | History exercise rows use the 56px thumbnail; session detail rows put the set count and timer / rest facts in meta (`3/4 sets`) and PR / Best / Promotion / Regression / Watch / Manual in chips; the browser's detailed card moves the trend, stats and bullets into a body | The old detailed card cut a 120px thumbnail out of a float; the bare `3/4` badge had no unit | Keep the float cut-out: text wrapping around a picture at 320px |

### 7.1 Behaviour changes in PR 1 (explicit)

- Inactive routine cards: tapping the card now opens the routine (previously it expanded Set Active / Edit). Set Active and Delete moved behind the "Actions for X" control; Edit is the card tap.
- Delete on routine and day cards needs the expand step first (one extra tap), then the existing confirmation modal.
- Day cards: rest days show the user's custom title when one exists; day recap shows only while the card is expanded; recap is vertical.
- Routine list shows a week strip for the active routine instead of scrolling day tiles; inactive routines still show none.
- Drag handles are 44px and keyboard operable; reorder actions, payloads and endpoints are unchanged.
- Copy: day / session terminology on the cards listed in 4.5.
- Today is touched, and was in scope only through shared pieces: the Today day picker (`TodayDayPicker`) renders `RoutineOverviewDayCard` (each card wrapped in an `li` through `asListItem`, so the `DayList` `ul` keeps list semantics; it no longer goes through `DayCard`), and Today renders the shared `RestDayCard` (`TodayDayPicker`, `TodayExerciseRows`). The picker card gets the new anatomy, chips and 44px targets; picking a day, the selected state and `onPress` are unchanged. In PR 1 the rest of Today (exercise rows, empty states) was not migrated; PR 2 does that (7.2).
- Day editor: the `ORDER n` badge on exercise cards became a text meta fact (`Order n`, the first meta item), so the order cue survives the chip-for-status-only rule (D7).
- Set Active on a routine card has the accessible name `Set Active: <routine>` (the visible text leads the name, WCAG 2.5.3); while saving it reads `Saving: <routine>`.
- Reorder (days and exercises): the handle stays focusable while a save runs (`aria-disabled`, not `disabled`), arrow keys are ignored during a save (one save at a time on the day editor, as on the day list), a polite live region announces `<name> moved to position N of M`, and the handle is described by the arrow-key hint (`aria-describedby`).
- Day-settings autosave: the name field shows the render-side rule (a stored placeholder reads as empty) but a toggle sends the stored name back unchanged unless the field was edited, so no autosave persists the position number over a stored name (`resolveRoutineDaySettingsSubmitName`). It no longer strips a legacy own-weekday prefix on a toggle.
- Reorder announcements use the heading the day showed before the move (custom title, else `Day N` / `Rest`), and a failed save announces "Could not reorder ...; order restored".
- Escape closes an open "Actions for X" row and returns focus to its control (routine and workout-plan cards).
- Follow-up (not in PR 1): Escape does not close an expanded day-card footer; only the routine and workout-plan "Actions for X" rows close on Escape.
- "N training days" is normalized from older cached strings ("N workout plans"); the cached count and a freshly computed one can differ until the routines cache refreshes.

### 7.2 Behaviour changes in PR 2 (Today; explicit)

No server action, route, data shape, offline cache, session-start or sync code changed. `TodayStartButton`, `TodayOfflineBridge`, the progression apply / revert handlers and the applied-pin storage are untouched; only what is rendered changed.

- Exercise rows (selected day, in-session summary, offline fallback, view-day) are `ExerciseRowCard`s: 56px thumbnail (was an 88px rail), name as an `h2`, meta in the shared 12px style, target in a `StatBlock` ("Target"). Target and progression text are normalised like the day editor: a stored "Goal: ..." prefix and the "Goal missing" placeholder no longer show on Today.
- Logged progress reads `2 / 4 sets` under the target (was `2 / 4` in the corner and a tinted row fill). With no set goal it shows `3 logged`. Completed rows show a DONE chip and the `completed` tone (was a green gradient); skipped rows show a SKIPPED chip on a compact card (was a dimmed one-line row) and still show logged progress when sets were logged before the skip.
- The exercise info control is 44x44 and sits in the trailing slot (was a 26px overlay in the corner). Its accessible name is unchanged (`Open exercise info for <name>`); Enter and Space open it as before.
- Day picker rows: the progression action (Promote / Apply regression / Revert) is a `CardActionRow` inside the card (was an attached strip). Same handlers, same confirm dialog, same pending text ("Applying...", "Reverting..."); the button is still natively `disabled` while a save runs (the old button was too). Readiness shows as `Progression: <label>` with a bar (was a tinted fill).
- Empty training day: the page now says "No exercises planned" and, when the routine id is known, offers `Add exercises` (opens the day editor with `returnTo=/today`). It used to show only the header and Switch Day.
- No routine: one message (D24); the card is `CardEmptyState` ("Choose a routine"; the blank icon tile is gone). The rest-day card is an `h2` on Today (it was an `h3`).
- Partial and blocked day messages are `TodayDayStateCard`s with a heading and a chip; the blocking red box is now the `attention` rail plus a `Can't start` chip (D25). The titles are new ("Edit this day first", "Some exercises will be skipped"); the body text is the unchanged `getTodayDaySummary` string.
- Notices: "Start session requires a live connection." and the Today load error are `CardNotice`s (status / alert roles; the error carries a "!" glyph).
- Copy: the view-day empty message says "this day" (was "this workout plan"). The view-day list is no longer routed to (the route redirects); it renders only in the dev regression fixture.
- `density="detailed"` and the picker's `exerciseDensity` are gone (D22). The dev fixture id `today-detailed` stays so the visual registry keeps its ids; it now renders the same as `today-default`.
- Shared fix found on the way: `StatBlock` drew its dot separators at the card's left edge (absolutely positioned with no relative parent), so targets read "4 sets 5 reps 225 lbs" and a stray dot sat on the card edge. Values now use the `CardMeta` wrap pattern (each value carries its own leading dot, clipped at a line start). This also fixes the day editor target line.
- Not changed (follow-ups): the rotating header subtitle (C1 finding 20), the repeat Start after finishing (finding 4, needs a product decision), `TodayRecoveryShadowPlacement` 40px buttons.

### 7.3 Behaviour changes in PR 4 (History; explicit)

No loader, query, server action, sync, route, data shape, cache entry or persisted value changed. `HistorySessionsClient` state, filters and the calendar day filter work as before. The calendar's shown month is local component state and is not stored. What a user sees change:

- Summary cards (streak, monthly, consistency, scope summary, cycle progression, historical weeks): one card style. The title is the heading, the range or month is part of the heading, and every summary fact shows on a wrapping line (no rotation). The streak's fire emoji is gone. The detailed view shows the same card with the panel open.
- Stats and recaps wrap into a grid and a list instead of sideways rails. Values such as `Planned Logged`, `Volume`, `+2 workouts` and the recap names are always fully visible. Stat values with a transition (`135 -> 140 lbs | 5 reps`) read `135 → 140 lbs · 5 reps` without the old green / red arrow tint; stat arrows read as a glyph plus hidden text (`Up`, `Down`, `No change`).
- Calendar: one month at a time (newest first) with older / newer controls; days with sessions read `12 2 sessions` to a screen reader (hidden text after the printed day and count; the unlabeled count is no longer the only cue); the legend and weekday letters are 11px. At 390px and wider the day cells are 44px square; at 320px they are 37px wide by 44px tall.
- Session cards: the title is a heading and the header is the link (right chevron); date, day, outcome and progress are a meta line; signals are chips (PR, Promotion, Regression, Watch, Manual, Progression event), all visible at once; the selected session (the one the user came back from) has the `current` tone and `aria-current` (every compact card used to carry the `current` tone).
- Exercise rows (browser and session detail): 56px thumbnail, heading, facts as meta, `Top Set` / `Last` summary as a labelled stat, signals as chips. The session detail set count reads `3/4 sets`. The browser's second meta line lists rank, promotions, PRs, sessions and last date together (they rotated before). The detailed browser card shows the trend, stats and bullets in a body under the header; the large thumbnail cut-out is gone.
- Session detail: the exercise cards no longer strip their own border and square their bottom corners while editing; the Add Set / Delete strip under an expanded card is a separate rounded block.
- Copy: `PROMO`, `REG` and `EVENT` are spelled out (`Promotion`, `Regression`, `Progression event`); pipes in outcome sentences show as middle dots.
- Kept: the PR #234 rest row in the session detail overview (observed rest, warm-ups excluded) is the same `Rest` section built in `LogAuditClient`; it now wraps instead of scrolling.
- Shared changes (small; other screens see them): `DetailSectionItems` list markup and 11px badges (`ExerciseInfoSheet`, session detail); `CardHeader` `link`; `StatGrid`. Removed with no importer left: `HistoryMetaLine`, the session title builders, `HistoryDisclosureTitle`, `HistoryCompactDisclosure`.
- Not changed (follow-ups): heatmap axis labels and counts (9-10px, fitted to 16 weeks), the filter toggle (60x36), `ProgressionHistorySurface` and its dashboard cards, the session detail set cards and focused panels, the "Session Streak counts days" wording (C1 finding 14), the dead `ExerciseProgressionActivityPanel` / `ProgressionSummaryActivityPanel` and the `scrollable` option of `SurfaceMetricGrid` that they and `ExerciseSurfaceMetricGrid` still pass.
- Dev fixture: `/dev/history-overview` renders the real `HistorySessionsClient` on the static History preview data (`assertDevPageAvailable` is its first statement). `scripts/verify-history-family-ui.mjs` selectors were updated for the new markup; it needs the signed-in History preview lane and was not run.

## 8. Tests

- `npm run test:card-system` (15 files, 123 tests, wired into `CI` after the board export check; `TodayCards.contract.test.tsx` renders the Today rows, state cards and notices to static markup inside the router and toast providers the app shell supplies, and pins the picker wiring at source level because `TodayDayPicker` needs a mounted router): primitive anatomy, ARIA, tap targets, no sub-11px text, no sideways scroll, no hard-coded radius, dev route blocked in production, routine / day / chooser / rest-day cards, edit-day wiring, day-label rule, card copy, action wiring (`routineCardActions.test.ts`: Delete asks for confirmation with the routine, Set Active hands over the routine id, labels are contained in accessible names), reorder accessibility wiring, the Today picker `li` wrapping, and the pinned server duplicate-day behaviour (`routine-day-creation.test.ts`); `HistoryCards.contract.test.tsx` renders the History cards (list link, headerless detailed summary, disclosure toggle, exercise rows, calendar pager, stat grid) and scans their sources for sideways scrollers, timers, hand-rolled chevrons and sub-11px text. There is no DOM test library in the repo, so the delete-confirm and set-active flows are covered by the pure action builder plus source-level wiring assertions and a headless click pass on the dev fixture, not by simulated clicks in a unit test.
- Existing contract tests updated deliberately in the same PR: `RoutineBrowseCard`, `WorkoutPlanChooserSourceCard`, `RestDayCard` (now `RoutineDayCard`), `RoutineHomeSurface`, `RoutinesPageClient`. `test:rest-day-cards` now points at `RoutineDayCard.contract.test.tsx` (the deleted `RestDayCard.contract.test.ts` was still in that script). Their old assertions pinned class strings that no longer exist.
- Known pre-existing failure, not touched: `src/app/routines/CreateWorkoutPlanFlow.contract.test.ts` asserts strings that are not in `CreateRoutineDayClient.tsx` at `origin/main`; it was never wired into a workflow.
