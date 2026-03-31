# Today screen state matrix

This document defines the canonical Today mode model used by the Today route and day picker.

## Canonical mode fields

- `selectedDay`: The effective selected routine day (explicit selection, or fallback to calendar day).
- `dayPickerOpen`: Whether the routine day list reveal panel is open.
- `restDay`: Whether `selectedDay.state === "rest"`.
- `emptyState`: Whether selected day has zero runnable exercises.
- `noRoutine`: Whether no selectable day exists (`days.length === 0` or no selected day resolved).
- `runnableSelection`: Whether selected day can start (`state === "runnable" | "partial"`).
- `hasInProgressSession`: Whether resume should be shown.

Derived UI selectors are emitted from `deriveTodayScreenMode`.

## State matrix

| Mode case | Hero | List content | Dock buttons | Badge/chip usage |
| --- | --- | --- | --- | --- |
| `noRoutine = true` | No day hero is rendered by picker shell. | No day list rows or exercise rows in picker body. | Secondary only: `Select Day` / `Hide Days` based on `dayPickerOpen`. | None from picker model. |
| `dayPickerOpen = true` | Hero shows selected day title and exercise meta/rest label. | Day selector list visible; exercise rows hidden. | Secondary label switches to `Hide Days`. Primary shown only when `hasInProgressSession` or `runnableSelection`. | Day card chips/badges use shared day-card contracts (`resolveDayCardState` / `resolveDayCardBadgeText`). |
| `restDay = true` and picker closed | Hero shows selected day + right subtitle `Rest Day`. | Rest copy only (`Rest and recover.`); no exercise rows. | Secondary shown. Primary hidden unless `hasInProgressSession = true` (resume). | Header badge can still show `In Session` / `Completed` from shared AppBadge logic. |
| `emptyState = true` and picker closed | Hero shows selected day + total exercise meta (`0 exercises`). | Summary card visible (`No exercises yet.` or blocking invalid-exercise message). Empty exercise fallback row visible. | Secondary shown. Primary hidden unless `hasInProgressSession = true`. | Summary tone chip style derives from `getTodayDaySummaryTone` (`blocking` / `warning`). |
| Runnable/partial day and picker closed | Hero shows selected day + exercise count meta. | Optional warning summary for partial day, plus exercise rows. | Split dock: `Start Workout` primary when no in-progress session; `Resume Session` when in progress. Secondary `Select Day`. | Header badge shows `In Session` or `Completed`; row and day-card contracts remain shared. |

## Source of truth

- Mode and selectors: `src/lib/today-page-state.ts`
- Today picker rendering: `src/app/today/TodayDayPicker.tsx`
