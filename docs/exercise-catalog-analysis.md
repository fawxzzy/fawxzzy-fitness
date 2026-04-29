# Exercise Catalog Analysis

Generated: 2026-04-29T03:38:45.169Z

Source of truth: `supabase/data/global_exercises_canonical.json`

## Snapshot

- Total exercises: 137
- Unique equipment values: 9
- Unique movement patterns: 4
- Unique measurement types: 4
- Unique pattern-detail tags: 32
- Review-queue items: 0
- Manual spot-check rows (non-reps): 13

## Coverage

- How-to copy populated: 137/137
- Measurement type populated: 137/137
- Default unit populated: 137/137
- Primary muscles array populated: 137/137
- Secondary muscles array populated: 124/137
- Full curation-tag coverage: 137/137

## Top Facets

### Equipment

- `Barbell`: 32
- `Dumbbell`: 26
- `Bodyweight`: 24
- `Cable`: 22
- `Machine`: 22
- `Cardio Machine`: 6
- `Smith Machine`: 3
- `Plate`: 1
- `Sled`: 1

### Movement Pattern

- `push`: 71
- `pull`: 34
- `hinge`: 19
- `squat`: 13

### Measurement Type

- `reps`: 124
- `time`: 7
- `time_distance`: 5
- `distance`: 1

### Pattern Detail

- `horizontal_push`: 18
- `horizontal_pull`: 12
- `elbow_flexion`: 11
- `squat`: 10
- `vertical_pull`: 9
- `vertical_push`: 9
- `hinge`: 8
- `chest_fly`: 6
- `elbow_extension`: 6
- `hip_extension`: 6
- `trunk_bracing`: 6
- `split_squat_lunge`: 4
- `knee_flexion`: 3
- `plantar_flexion`: 3
- `shoulder_abduction`: 3
- `shoulder_horizontal_abduction`: 3
- `cycling`: 2
- `leg_raise`: 2
- `shoulder_flexion`: 2
- `trunk_flexion`: 2
- `anti_rotation`: 1
- `hip_abduction`: 1
- `hip_adduction`: 1
- `knee_extension`: 1
- `mobility_drill`: 1
- `rope_skip`: 1
- `rowing`: 1
- `running`: 1
- `sled_drive`: 1
- `step_cardio`: 1
- `trunk_rotation`: 1
- `walking`: 1

### Plane Of Motion

- `sagittal`: 119
- `transverse`: 11
- `frontal`: 6
- `multi_planar`: 1

### Exercise Utility

- `basic`: 78
- `isolation`: 42
- `auxiliary`: 16
- `preparatory`: 1

### Body Position

- `standing`: 81
- `seated`: 25
- `supine`: 19
- `hanging`: 5
- `split_stance`: 4
- `kneeling`: 1
- `prone`: 1
- `variable`: 1

### Training Goal

- `hypertrophy`: 112
- `accessory`: 77
- `strength`: 47
- `conditioning`: 12
- `endurance`: 10
- `skill`: 9
- `core_stability`: 3
- `power`: 2
- `mobility`: 1
- `recovery`: 1

## Prep Notes

- Keep `global_exercises_canonical.json` as the editable source of truth and regenerate every other artifact from it.
- Use `global_exercises_catalog_index.json` for analysis, audits, and future admin tooling instead of reading UI-facing code paths.
- Use `global_exercises_catalog_index.csv` when you want fast spreadsheet-style review or bulk cleanup planning.
- For runtime efficiency, the history/browser surfaces should eventually read a trimmed catalog payload and lazy-load long how-to/media fields only in detail contexts.
- Before expanding the total catalog aggressively, lock a stable slug/id strategy so future search, overrides, and migrations stay deterministic.
