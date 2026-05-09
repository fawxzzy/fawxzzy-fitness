# Exercise Catalog Analysis

Generated: 2026-05-07T22:08:00.818Z

Source of truth: `supabase/data/global_exercises_canonical.json`

## Snapshot

- Total exercises: 186
- Unique equipment values: 9
- Unique movement patterns: 5
- Unique measurement types: 4
- Unique pattern-detail tags: 47
- Review-queue items: 0
- Manual spot-check rows (non-reps): 24

## Coverage

- How-to copy populated: 186/186
- Measurement type populated: 186/186
- Default unit populated: 186/186
- Primary muscles array populated: 186/186
- Secondary muscles array populated: 159/186
- Full curation-tag coverage: 186/186

## Top Facets

### Equipment

- `Bodyweight`: 57
- `Barbell`: 32
- `Cable`: 28
- `Dumbbell`: 27
- `Machine`: 24
- `Cardio Machine`: 6
- `Smith Machine`: 6
- `Plate`: 3
- `Sled`: 3

### Movement Pattern

- `push`: 92
- `pull`: 40
- `hinge`: 32
- `squat`: 16
- `rotation`: 6

### Measurement Type

- `reps`: 162
- `time`: 16
- `time_distance`: 5
- `distance`: 3

### Pattern Detail

- `horizontal_push`: 19
- `horizontal_pull`: 14
- `squat`: 13
- `elbow_flexion`: 11
- `vertical_pull`: 11
- `hinge`: 10
- `hip_extension`: 9
- `trunk_bracing`: 9
- `vertical_push`: 8
- `split_squat_lunge`: 7
- `trunk_rotation`: 7
- `chest_fly`: 6
- `elbow_extension`: 6
- `plantar_flexion`: 4
- `anti_rotation`: 3
- `hip_abduction`: 3
- `knee_flexion`: 3
- `shoulder_abduction`: 3
- `shoulder_horizontal_abduction`: 3
- `anti_extension`: 2
- `cycling`: 2
- `hip_adduction`: 2
- `leg_raise`: 2
- `mobility_drill`: 2
- `plyometric_jump`: 2
- `shoulder_flexion`: 2
- `sled_drag`: 2
- `trunk_flexion`: 2
- `contralateral_extension`: 1
- `full_body_conditioning`: 1
- `hamstring_mobility`: 1
- `hip_circumduction`: 1
- `hip_external_rotation`: 1
- `knee_extension`: 1
- `lateral_flexion_mobility`: 1
- `lateral_trunk_bracing`: 1
- `locomotion_drill`: 1
- `rope_skip`: 1
- `rowing`: 1
- `running`: 1
- `shoulder_circumduction`: 1
- `sled_drive`: 1
- `spinal_extension`: 1
- `spinal_flexion`: 1
- `spinal_flexion_mobility`: 1
- `step_cardio`: 1
- `walking`: 1

### Plane Of Motion

- `sagittal`: 151
- `transverse`: 22
- `frontal`: 11
- `multi_planar`: 2

### Exercise Utility

- `basic`: 103
- `isolation`: 45
- `auxiliary`: 35
- `preparatory`: 3

### Body Position

- `standing`: 89
- `supine`: 32
- `seated`: 28
- `prone`: 10
- `split_stance`: 7
- `hanging`: 6
- `kneeling`: 5
- `side_lying`: 5
- `plank`: 1
- `side_plank`: 1
- `supported`: 1
- `variable`: 1

### Training Goal

- `hypertrophy`: 130
- `accessory`: 95
- `strength`: 54
- `core_stability`: 30
- `mobility`: 21
- `skill`: 18
- `conditioning`: 15
- `endurance`: 8
- `power`: 5
- `recovery`: 2

## Prep Notes

- Keep `global_exercises_canonical.json` as the editable source of truth and regenerate every other artifact from it.
- Use `global_exercises_catalog_index.json` for analysis, audits, and future admin tooling instead of reading UI-facing code paths.
- Use `global_exercises_catalog_index.csv` when you want fast spreadsheet-style review or bulk cleanup planning.
- For runtime efficiency, the history/browser surfaces should eventually read a trimmed catalog payload and lazy-load long how-to/media fields only in detail contexts.
- Before expanding the total catalog aggressively, lock a stable slug/id strategy so future search, overrides, and migrations stay deterministic.

