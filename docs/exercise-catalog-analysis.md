# Exercise Catalog Analysis

Generated: 2026-05-03T23:58:36.382Z

Source of truth: `supabase/data/global_exercises_canonical.json`

## Snapshot

- Total exercises: 168
- Unique equipment values: 9
- Unique movement patterns: 4
- Unique measurement types: 4
- Unique pattern-detail tags: 37
- Review-queue items: 0
- Manual spot-check rows (non-reps): 16

## Coverage

- How-to copy populated: 168/168
- Measurement type populated: 168/168
- Default unit populated: 168/168
- Primary muscles array populated: 168/168
- Secondary muscles array populated: 141/168
- Full curation-tag coverage: 168/168

## Top Facets

### Equipment

- `Bodyweight`: 39
- `Barbell`: 32
- `Cable`: 28
- `Dumbbell`: 27
- `Machine`: 24
- `Cardio Machine`: 6
- `Smith Machine`: 6
- `Plate`: 3
- `Sled`: 3

### Movement Pattern

- `push`: 88
- `pull`: 40
- `hinge`: 24
- `squat`: 16

### Measurement Type

- `reps`: 152
- `time`: 8
- `time_distance`: 5
- `distance`: 3

### Pattern Detail

- `horizontal_push`: 19
- `horizontal_pull`: 14
- `squat`: 13
- `elbow_flexion`: 11
- `vertical_pull`: 11
- `hinge`: 10
- `hip_extension`: 8
- `vertical_push`: 8
- `split_squat_lunge`: 7
- `chest_fly`: 6
- `elbow_extension`: 6
- `trunk_bracing`: 6
- `trunk_rotation`: 5
- `plantar_flexion`: 4
- `anti_rotation`: 3
- `knee_flexion`: 3
- `shoulder_abduction`: 3
- `shoulder_horizontal_abduction`: 3
- `cycling`: 2
- `hip_abduction`: 2
- `hip_adduction`: 2
- `leg_raise`: 2
- `mobility_drill`: 2
- `plyometric_jump`: 2
- `shoulder_flexion`: 2
- `sled_drag`: 2
- `trunk_flexion`: 2
- `full_body_conditioning`: 1
- `knee_extension`: 1
- `locomotion_drill`: 1
- `rope_skip`: 1
- `rowing`: 1
- `running`: 1
- `shoulder_circumduction`: 1
- `sled_drive`: 1
- `step_cardio`: 1
- `walking`: 1

### Plane Of Motion

- `sagittal`: 140
- `transverse`: 18
- `frontal`: 8
- `multi_planar`: 2

### Exercise Utility

- `basic`: 85
- `isolation`: 45
- `auxiliary`: 35
- `preparatory`: 3

### Body Position

- `standing`: 89
- `seated`: 24
- `supine`: 24
- `prone`: 8
- `split_stance`: 7
- `hanging`: 6
- `kneeling`: 5
- `side_lying`: 3
- `supported`: 1
- `variable`: 1

### Training Goal

- `hypertrophy`: 130
- `accessory`: 95
- `strength`: 54
- `skill`: 18
- `conditioning`: 15
- `core_stability`: 12
- `endurance`: 8
- `power`: 5
- `mobility`: 3
- `recovery`: 2

## Prep Notes

- Keep `global_exercises_canonical.json` as the editable source of truth and regenerate every other artifact from it.
- Use `global_exercises_catalog_index.json` for analysis, audits, and future admin tooling instead of reading UI-facing code paths.
- Use `global_exercises_catalog_index.csv` when you want fast spreadsheet-style review or bulk cleanup planning.
- For runtime efficiency, the history/browser surfaces should eventually read a trimmed catalog payload and lazy-load long how-to/media fields only in detail contexts.
- Before expanding the total catalog aggressively, lock a stable slug/id strategy so future search, overrides, and migrations stay deterministic.

