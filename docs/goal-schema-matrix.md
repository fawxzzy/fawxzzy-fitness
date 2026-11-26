# Goal schema matrix by exercise modality

This matrix defines the **minimum valid goal state** required before the Add CTA can be enabled.

| Modality | Required fields | Optional fields | Rendered in form (Add + inline Edit) | Notes |
| --- | --- | --- | --- | --- |
| Strength | `sets` (>=1), `repsMin` (>=1) | `repsMax`, `weight` | Sets, Reps, Weight (optional); the "Rep range" switch reveals Max reps | New goals start at 3 x 8-12. Time, distance and calories never show for strength unless an existing goal already holds a value. |
| Bodyweight | `sets` (>=1), `repsMin` (>=1) | `repsMax` | Sets + reps (with optional min/max range) | Bodyweight strength goals hide time/distance by default unless the exercise modality is cardio-based. |
| Cardio (time) | `sets` (>=1), `duration` (>0 sec) | None | Sets + time | Duration accepts seconds or `mm:ss`. |
| Cardio (distance) | `sets` (>=1), `distance` (>0) | None | Sets + distance | Distance uses selected distance unit. |
| Cardio (time + distance) | `sets` (>=1), at least one of `duration` or `distance` | None | Sets + Time + Distance, fill either or both | No mode switcher: the filled values decide which metrics are saved. |

## Validation UX contract

- Add is disabled until the minimum valid goal state is met.
- Validation state is communicated in text directly under goal fields and under the CTA.
- Goal mode only renders relevant metric cards for the chosen modality mode to improve mobile readability.
- Empty goal previews use explicit guidance text instead of a visual-only "Goal missing" badge.
- Add and inline Edit flows both mount the same shared `SharedExerciseGoalForm` wrapper so modality logic does not drift.
- Which fields render is one pure function, `resolveGoalVisibleMetrics` (`src/components/ui/measurements/goalVisibleMetrics.ts`, unit-tested): the exercise's base modality plus any metric that already holds a value. Auto-progress, Timer, To failure and Calories live under "More options". Cardio calories are saved only when Calories is opened there: an auto-estimate is not submitted while it is closed, and the picker summary reads the submitted values (`resolveSubmittedGoalState`), so it never shows a calorie goal that is not saved.
- "Same as last time" fills the goal from the last logged workout and only shows when that history exists.

## Measurement presence contract

- Measurement presence is **value-derived, never tap-derived**.
- Focusing/tapping an input does not enable or disable that metric.
- Empty (`"-"`) fields are logically absent from summary and payload.
- Any entered numeric/string value (including zero-like input) is treated as present, then validated by existing rules.

## Modality-specific visibility rules

- **Strength:** show `reps`, optional `repsMax`, optional `weight`.
- **Bodyweight strength:** show `reps`, optional `repsMax` only.
- **Cardio time:** show `duration`.
- **Cardio distance:** show `distance`.
- **Cardio time + distance:** show both fields; the value-derived mode (`time`, `distance`, or combined) decides what is saved, and only filled metrics go into summary/payload.
