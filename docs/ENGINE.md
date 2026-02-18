# Progression Engine Spec

## Philosophy

“If you can do a little more than last time, you’re progressing.”

---

## Model

Default: Double progression.

Reps increase first.
Weight increases after top rep range is consistently hit.

---

## Inputs

- exercise_id
- rep_range_min
- rep_range_max
- last_sets (weight, reps, rpe, warmup)
- temperament (Conservative / Moderate / Aggressive)

---

## Outputs

- recommended_weight
- recommended_rep_targets
- unlock_condition_text
- push_level (High / Medium / Low)

---

## Rules (High-Level)

1. Compare to last session for that exercise only.
2. If all working sets hit top rep range:
   - Increase weight (based on temperament).
3. Else:
   - Keep weight.
   - Target +1–2 total reps next session.
4. If RPE high:
   - Maintain weight.
5. Internal workload metrics may influence push_level but are not displayed.
