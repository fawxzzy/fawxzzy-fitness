# Goal schema matrix by exercise modality

This matrix defines the **minimum valid goal state** required before the Add Exercise CTA can be enabled.

| Modality | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| Strength | `sets` (>=1), `repsMin` (>=1) | `repsMax`, `weight`, `time`, `calories` | If weight is enabled, weight must be >= 0. |
| Bodyweight | `sets` (>=1), `repsMin` (>=1) | `repsMax`, `time`, `calories` | Weight target is hidden because bodyweight prescriptions are rep-driven. |
| Cardio (time) | `sets` (>=1), `duration` (>0 sec) | `calories` | Duration accepts seconds or `mm:ss`. |
| Cardio (distance) | `sets` (>=1), `distance` (>0) | `calories` | Distance uses selected distance unit. |
| Cardio (time + distance) | `sets` (>=1), at least one of `duration` or `distance` | `calories` | UI exposes explicit goal mode choices: Time, Distance, or Time + Distance. |

## Validation UX contract

- Add Exercise is disabled until the minimum valid goal state is met.
- Validation state is communicated in text directly under goal fields and under the CTA.
- Goal mode only renders relevant metric cards for the chosen modality mode to improve mobile readability.
- Empty goal previews use explicit guidance text instead of a visual-only "Goal missing" badge.
