# Goal schema matrix by exercise modality

This matrix defines the **minimum valid goal state** required before the Add Exercise CTA can be enabled.

| Modality | Required fields | Optional fields | Rendered in form (Add + inline Edit) | Notes |
| --- | --- | --- | --- | --- |
| Strength | `sets` (>=1), `repsMin` (>=1) | `repsMax`, `weight` | Sets + reps (with optional min/max range), weight | Strength no longer surfaces cardio-only fields in the default goal panel. |
| Bodyweight | `sets` (>=1), `repsMin` (>=1) | `repsMax` | Sets + reps (with optional min/max range) | Bodyweight strength goals hide time/distance by default unless the exercise modality is cardio-based. |
| Cardio (time) | `sets` (>=1), `duration` (>0 sec) | None | Sets + time | Duration accepts seconds or `mm:ss`. |
| Cardio (distance) | `sets` (>=1), `distance` (>0) | None | Sets + distance | Distance uses selected distance unit. |
| Cardio (time + distance) | `sets` (>=1), at least one of `duration` or `distance` | None | Goal mode switcher controls Time / Distance / Time + Distance cards | UI exposes explicit goal mode choices: Time, Distance, or Time + Distance. |

## Validation UX contract

- Add Exercise is disabled until the minimum valid goal state is met.
- Validation state is communicated in text directly under goal fields and under the CTA.
- Goal mode only renders relevant metric cards for the chosen modality mode to improve mobile readability.
- Empty goal previews use explicit guidance text instead of a visual-only "Goal missing" badge.
- Add and inline Edit flows both mount the same shared `SharedExerciseGoalForm` wrapper so modality logic does not drift.

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
- **Cardio time + distance:** show both by value-derived mode (`time`, `distance`, or combined) and only include visible metrics in summary/payload.
