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

- `variant`: `primary` (the one main action), `promote` (green fill + the shared `.promote-shine` sweep; only for a
  ready-to-apply progression), `secondary` (other actions), `quiet` (low-emphasis, no fill), `danger` (destructive).
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
- `BottomSheet` is a thin wrapper over `Sheet` (same props, `eyebrow?: string | null`); existing callers keep working.

### Confirm (`src/components/ui/ConfirmDestructiveModal.tsx`)

`<ConfirmDestructiveModal open title objectName? consequenceText? confirmLabel confirmVariant? onCancel onConfirm />`

Runs on `Sheet`. Title reads "Confirm <action>", `objectName` shows the thing being acted on in its own row, then the
consequence, then [Cancel | Confirm]. Focus starts on Cancel. Always pass `objectName` for anything destructive.
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
- `ChipButton`: a selectable filter chip (`selected`).
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

- `FormField` (server-compatible, no "use client"): when `error` is a string it mounts `FieldNotice`, which shows the
  error notice once per new message and dismisses it when the error clears or the field unmounts. The field itself
  gets `aria-invalid`, a neutral "!" marker by the label and an `sr-only` description for screen readers.
- `useFieldNotice(id)` -> `{ report(message), clear() }` for form-level errors (a failed save).
- `useFieldErrorNotice(error, { id })` for custom fields that do not use `FormField`.
- Without a `ToastProvider` these are no-ops (tests, isolated fixtures).

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
| `--accent-red`, `--danger-text-rgb` | `--danger-rgb` |
| `--accent-mint`, `--accent-blue`, `--accent-purple` | `--accent` / `--success-rgb` |
| `z-[120]` literals | `--z-sheet` |

## Migrated in the foundation PR

- Routines: the Add Day modal (`RoutineHomeClient`) and the New routine chooser (`CreateRoutineClient`) are Sheets.
- `ConfirmDestructiveModal` and `BottomSheet` run on `Sheet`.
- The toast dismiss is a real 44x44 target.

## Still to migrate (owned by later section lanes)

Inline danger text remains in: `ProgressionPlaybookEditor`, `EditDaySettingsAutosaveForm`, `EditDayAddExerciseScreen`,
`EditableRoutineDayExerciseList`, `RoutineEditorForm`, `DataSettingsSection`, `DiscordAccessSettings`,
`HistoryExerciseCard`, `CuratedOnboardingShell`, `GenerationHandoffStep`, `QuestionnaireStep`, `ReviewStep`.
Each moves to `FormField error` / `useFieldNotice` when its section is redesigned.
