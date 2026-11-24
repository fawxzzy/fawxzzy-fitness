# Design foundation

The shared primitives and tokens every section redesign builds on. Live reference: `/dev/ui-kit` (dev only).
Layer, colour and card rules stay in `docs/design-system/DESIGN-CONTRACT.md`; this file is the component API and the
old-to-new map.

## Tokens (`src/app/globals.css`, `:root`)

| Group | Tokens | Rule |
| --- | --- | --- |
| Colour | `--palette-green-rgb`, `--palette-red-rgb`; `--danger-rgb` | One green, one red. The legacy accent names (`--accent-mint`, `--accent-blue`, `--accent-purple`, `--selection-rgb`, `--metric-accent-rgb`, `--accent-divider-rgb`, `--success-rgb`) and red names (`--accent-red`, `--danger-text-rgb`) stay because the theme script (`src/lib/app-theme.ts`) writes them for custom themes; at default they all resolve to the palette value. New code uses `--accent` / `--success-rgb` / `--danger-rgb` only. |
| Type | `--type-label` 11, `--type-caption` 12, `--type-body-sm` 13, `--type-body` 15, `--type-title-sm` 17, `--type-title` 20, `--type-display` 28 (px) | Content never goes under 12px; 11px is only for uppercase labels. |
| Space | `--space-1`..`--space-6` (4, 8, 12, 16, 24, 32 px), `--gap-stack` | Card-to-card gap is `--gap-stack`. |
| Touch | `--hit-min` 44px, `--button-height-sm` 44px | Nothing tappable is smaller than 44x44. |
| Layers | `--z-listbox` 90 < `--z-loader` 95 < `--z-popover` 96 < dev banner 100 < `--z-toast` 110 < `--z-menu` 115 < `--z-sheet` = `--z-modal` 120 | Values match DESIGN-CONTRACT section 15. |

## Components

### AppButton (`src/components/ui/AppButton.tsx`)

`<AppButton variant size loading fullWidth disabled />`

- `variant`, three looks you can tell apart at a glance plus two special ones:
  - `primary`: the one main action. Solid accent-tinted fill over an opaque base and a strong accent keyline.
  - `secondary`: other actions. A lifted neutral grey surface with a visible grey keyline (not the green border token).
  - `quiet`: low emphasis. No keyline, no fill, secondary-colour text; pressed shows a soft grey wash, never an underline.
  - `promote`: success-green fill with a soft glow + the shared `.promote-shine` sweep; only for a ready-to-apply
    progression.
  - `danger`: destructive; red text and keyline.
  The looks live in `globals.css` (`.action-chrome.app-button-primary` / `-secondary` / `-tertiary`), scoped to the
  AppButton markers so rails and toggles that share `action-chrome` keep their own intent look. Text is text-primary
  (primary, secondary) or text-secondary (quiet) on dark fills, AA on every theme accent.
- `size`: `lg` 56px, `md` 48px (default), `sm` 44px. No size is under 44px.
- `loading`: keeps the width, shows a spinner and "Label...", sets `aria-busy` and disables the button.
- Shortcuts: `PrimaryButton`, `SecondaryButton`, `PromoteButton`, `QuietButton`, `DestructiveButton`, `GhostButton`.
- Legacy variants still work: `tertiary` and `ghost` render as `quiet`, `destructive` as `danger`
  (`normalizeAppButtonVariant`).

### Sheet (`src/components/ui/Sheet.tsx`)

`<Sheet open title onClose eyebrow? description? footer? titleTone? showCloseButton? initialFocusSelector? dialogProps? />`

The one bottom sheet: portal to `<body>`, z 120, token scrim (dims + blurs; a tap on it closes), drag handle, title row
with a visible 44px Close, scrolling body, optional pinned footer that clears the home indicator, focus entry / trap /
return, Escape, body scroll lock. Sheets stack: only the top one answers Escape and Tab. While it animates out the sheet
drops `role="dialog"` and is `inert`, so it is gone for screen readers, focus and tests at once.

- No eyebrow by default (the generic "Sheet" eyebrow is gone). Pass one only when it adds context.
- Its own notice slot: while a sheet is open, every notice (`ToastProvider`) renders inside the top sheet, in flow
  between the title row and the body, so a form error raised in a sheet is readable instead of hidden under the sheet
  layer (the floating notice stack is z 110, under the sheet's 120, and stays there). The slot is handed back when the
  sheet closes; a stacked sheet takes it over and returns it.
- `BottomSheet` is a thin wrapper over `Sheet` (same props, `eyebrow?: string | null`); existing callers keep working.

### Confirm (`src/components/ui/ConfirmDestructiveModal.tsx`)

`<ConfirmDestructiveModal open title objectName? consequenceText? confirmLabel confirmVariant? onCancel onConfirm />`

Runs on `Sheet`. Title reads "Confirm <action>", `objectName` shows the thing being acted on in its own row, then the
consequence, then [Cancel | Confirm]. Focus starts on Cancel. Always pass `objectName` for anything destructive.
While `isLoading`, Confirm is busy and disabled, Cancel is disabled, and Escape / a scrim tap do nothing.
`details`, `contextLines`, `bullets` and `children` always show (the old delete layout hid them);
`showDetailsInDeleteLayout` is accepted and ignored.
All 16 existing import sites work unchanged.

### Menu (`src/components/ui/Menu.tsx`)

`<Menu label items={[{ id, label, onSelect, icon?, tone?: "danger", disabled? }]} triggerIcon? onOpenChange? />`

A 44px kebab trigger and a popover anchored under it, right-aligned (top-right of a screen or card). Arrow keys / Home /
End move between enabled rows, Escape closes and returns focus to the trigger, an outside tap closes it and is
swallowed (it does not activate what is under it), rows are 44px. Use a Menu for 2-6 secondary actions on one object;
use a Sheet when the choice needs explanation or a form.

### Chips (`src/components/ui/Chip.tsx`)

- `Chip`: a non-interactive label/badge. `tone`: `neutral`, `accent`, `success`, `attention`, `danger`; `variant`:
  `badge` (small caps) or `label`; `onRemove` adds a named remove control ("Remove Chest") whose 20px icon carries a 44px hit area.
- `ChipButton`: a selectable filter chip (`selected`); the selected look matches the strong segmented selection.
- `Pill`, `PillButton` (`Pill.tsx`) and `AppBadge` (`app/AppBadge.tsx`) are thin wrappers; old tone names
  (`default`, `today`, `current`, `warning`, `destructive`) map through `normalizeChipTone`.

### SegmentedControl (`src/components/ui/SegmentedControl.tsx`)

2 to 5 options (`SEGMENTED_CONTROL_MIN_OPTIONS` / `MAX_OPTIONS`; dev warns outside that). The selected segment is
visibly strong by default (accent tint + keyline, `.segmented-selected-strong`); pass `activeIntent` or
`selectedStyle="intent"` to keep a caller's own intent colours. Tabs mode (`role="tablist"`, arrow keys) or navigation
mode (links, `aria-current`).

### FieldNotice and FormField (`src/components/ui/FieldNotice.tsx`, `FormField.tsx`)

Errors never render as red text on the screen. They go to the shared notice (`ToastProvider`), which renders in the
slot the screen shell provides (in flow under the header today; the session screen's above-dock slot uses the same
path), so one implementation serves every screen.

- `FormField` (server-compatible, no "use client"): `error` is `string | null` (it goes to the notice, so a ReactNode
  could not be shown); when set it mounts `FieldNotice`, which shows the
  error notice once per new message and dismisses it when the error clears or the field unmounts. The field itself
  gets `aria-invalid`, keeps its danger keyline, a neutral "!" marker by the label and an `sr-only` description for
  screen readers.
- `useFieldNotice(id)` -> `{ report(message), clear() }` for form-level errors (a failed save).
- `useFieldErrorNotice(error, { id })` for custom fields that do not use `FormField`.
- Without a `ToastProvider` these are no-ops (tests, isolated fixtures).

## App-wide states (F1, 2026-11-24)

One look for every state a screen can be in other than "has data".

| State | Component | Rule |
| --- | --- | --- |
| Loading (boot, a route, a gate) | `RouteLoading` / `loading.tsx` -> the single `AppLoaderHost` overlay | `RouteLoading` draws nothing, it only registers a wait; the host owns the delay, hold and fade (`src/lib/app-loader.ts`). Every `page.tsx` has a `loading.tsx` at or above its segment (root `app/loading.tsx` covers the rest; `appStates.contract.test.tsx` enforces it). A loading.tsx never draws its own spinner or skeleton. |
| Loading a list inside a screen | `SkeletonList` (`SkeletonRow`, `SkeletonCard`, `SkeletonLine`, `SkeletonThumb`) | Card-shaped blocks on the card tokens, 8px apart, `animate-pulse motion-reduce:animate-none`; the wrapper carries `role="status"`, a name ("Loading sessions") and `aria-busy`, the blocks are `aria-hidden`. |
| Nothing here yet | `EmptyState` (a thin wrapper over `CardEmptyState`) | Dashed card, a heading, one plain sentence saying what to do, at most one action. Never red. |
| Could not load, whole screen | `AppRecoveryScreen`, `error.tsx`, `global-error.tsx` | The Auth Surface v2 status shell (`AuthStatusScreen`): "Could not load", the shared crash notice, `Try again` plus `Go to Today`. The error name never shows. |
| Could not load, one area | `AppSoftErrorBoundary` | The same words on a `CardSurface` with the one primary `AppButton`, so a crashed area still looks like the app. |
| Not found | `not-found.tsx` (`NotFoundScreen`) | "Page not found" + `Go to Today`. |
| Offline | each route's `*OfflineShell` | Cached content when there is a snapshot, else a `CardEmptyState` saying nothing is cached. |
| Retired routes | `/exercises/[exerciseId]`, `/review/optional-planned-day` | Redirect-only (the first to its safe `returnTo` or `/history/exercises`, the second to `/routines`); nothing links to either, a stale bookmark still lands somewhere useful. |

Auth and status screens (login, install, privacy, terms, the screens above) keep their link rows as real 44px boxes:
`.fx-links` and `.fx-legal` are each 44px tall and stack with no gap, and every `.fx-link` / `.fx-legal a` is
`inline-flex` with `min-height` / `min-width` 44px. Nothing hangs past its row on an invisible `::after`, so two
neighbouring rows can never overlap (the old 11px overhang overlapped the legal row at 390 and 320).

### Notice placement (decision, 2026-11-24)

Errors and status notices go through the shared notice (`ToastProvider`); where it renders is one prop on the screen
shell, `noticePlacement`:

- `under-header` (the default, in flow): every screen. The message sits where the person just looked, directly under
  the title, and content moves down by one row while it shows. Right for forms, settings, auth and list screens: a
  notice appears after a deliberate tap near the top or after a save, and the screen is not under live manipulation.
- `above-dock` (overlay, out of flow): only a screen that is manipulated continuously with its dock in reach, where a
  notice that moves cards would move the card the person is about to tap. Today that is the live workout alone
  (`SessionPageClient`, `SessionOfflineShell`).
- Inside a `Sheet`, notices render in the sheet's own slot (see Sheet).

Not migrated in this lane, because each belongs to a lane that is open or in review: the dock screens Add exercise
(PR #306), Create day / Days library and the routine and day editors (Routines lane). They keep the in-flow default
until their lane decides, with the same two-line test: does a long scrolling body sit above a dock that raises the
error? If yes, opt in with `noticePlacement="above-dock"` (and reserve `--app-dock-notice-band`), otherwise stay in flow.

## Cascade trap: the global button surface

`globals.css` has an unlayered `button, [type="button"] { background; border; color }` rule after `@tailwind utilities`.
At equal specificity it beats plain `bg-*` / `border-*` / `text-*` utilities on a `<button>`, so a button's own colour
classes silently do nothing. Shared primitives set button colours with the `[button&]:` variant (`button.cls`,
specificity 0,1,1), which beats the global rule and still loses to a caller's `!` override. `Chip`'s `ChipButton`, the
`Menu` rows and the Sheet Close button do this; before, every filter chip looked the same on or off and menu rows were boxed with no danger red.

Moving that rule into `@layer base` (or `:where()`) was evaluated in the F1 lane and left alone: it flips the winner
for every `<button>` that carries its own `bg-*` / `border-*` / `text-*` classes, which today are silently ignored, so
every such button would change look at once. That needs a per-surface capture pass (not a one-lane sweep); it is listed as
a follow-up. Until then keep using the `[button&]:` variant in shared primitives.

## When to use which

| Need | Use |
| --- | --- |
| One main action on a screen | `AppButton variant="primary"` (or the dock button) |
| Apply a ready progression | `AppButton variant="promote"` |
| Destructive action | `AppButton variant="danger"`, then `ConfirmDestructiveModal` with `objectName` |
| A few actions on one object | `Menu` |
| Pick from a list, a short form, a chooser | `Sheet` |
| Switch between 2-5 views | `SegmentedControl` |
| Status label | `Chip` |
| Filter | `ChipButton` |
| A form or save error | `FormField error` / `useFieldNotice` |

## Migration map

| Old | New |
| --- | --- |
| `variant="tertiary"` / `"ghost"` | `variant="quiet"` |
| `variant="destructive"` | `variant="danger"` |
| Inline `fixed inset-0 z-[120]` modal with its own Escape / scroll lock | `Sheet` |
| `BottomSheet` | `Sheet` (wrapper stays) |
| `ConfirmDestructiveModal` with the object only in the description | add `objectName` |
| Hand-rolled kebab popover | `Menu` |
| `Pill`, `PillButton`, `AppBadge` | `Chip`, `ChipButton` |
| `<p className="text-[rgb(var(--danger-rgb))]">{error}</p>` | `FormField error` or `useFieldNotice().report` |
| `--accent-red`, `--danger-text-rgb`, `rgb(255,116,116)` | `--danger-rgb` |
| `--accent-mint`, `--accent-blue`, `--accent-purple` | `--accent` / `--success-rgb` |
| `z-[120]` literals | `--z-sheet` |

## Migrated in the foundation PR

- Routines: the Add Day modal (`RoutineHomeClient`) and the New routine chooser (`CreateRoutineClient`) are Sheets.
- `ConfirmDestructiveModal` and `BottomSheet` run on `Sheet`.
- The toast dismiss is a real 44x44 target.
- `StatGrid`, `MetricItem` and `ExerciseInfoSheet` decrease/regression text uses `--danger-rgb` instead of the
  hard-coded `rgb(255,116,116)`.
- `showDetailsInDeleteLayout` (added by the History redesign) is still accepted by `ConfirmDestructiveModal`; the Sheet
  confirm always shows the consequence, so it has no effect.

## Still to migrate (owned by later section lanes)

Inline danger text remains in: `ProgressionPlaybookEditor`, `EditDaySettingsAutosaveForm`, `EditDayAddExerciseScreen`,
`EditableRoutineDayExerciseList`, `RoutineEditorForm`,
`HistoryExerciseCard`.
(The curated onboarding wizard moved in the Sign-in / onboarding lane; Data and Discord moved in the Settings lane.) Each moves to `FormField error` / `useFieldNotice` when its section is redesigned.
