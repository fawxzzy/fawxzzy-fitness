# Exercise Filter Gap Audit

Generated: 2026-05-03T23:58:40.847Z

Input: `supabase/data/global_exercises_catalog_index.json`

## Summary

- Exercises audited: 168
- Sensible combinations checked: 25
- Empty sensible combinations: 0
- Thin sensible combinations: 21
- Suspicious metadata checks with matches: 0

## Audit Table

| Filter combination | Count | Matching exercise names | Status |
| --- | ---: | --- | --- |
| Bodyweight + pattern_detail:squat | 1 | Bodyweight Squat | Thin |
| Bodyweight + pattern_detail:split_squat_lunge | 3 | Bodyweight Reverse Lunge, Bodyweight Step-Up, Bodyweight Walking Lunge | OK |
| Bodyweight + pattern_detail:horizontal_pull | 1 | Inverted Row | Thin |
| Bodyweight + pattern_detail:vertical_push | 1 | Pike Push-Up | Thin |
| Bodyweight + pattern_detail:plantar_flexion | 1 | Single-Leg Calf Raise | Thin |
| Cable + pattern_detail:trunk_rotation | 2 | Cable Woodchop, Half-Kneeling Cable Chop | Thin |
| Cable + pattern_detail:anti_rotation | 2 | Half-Kneeling Pallof Press, Pallof Press | Thin |
| Cable + pattern_detail:hip_abduction | 1 | Cable Hip Abduction | Thin |
| Cable + pattern_detail:hip_adduction | 1 | Cable Hip Adduction | Thin |
| Cable + pattern_detail:hinge | 1 | Cable Pull-Through | Thin |
| Machine + pattern_detail:vertical_pull | 2 | Assisted Pull-Up, Machine Pulldown | Thin |
| Sled + loading_profile:sled_loaded | 3 | Backward Sled Drag, Sled Drag, Sled Push | OK |
| Plate + plane_of_motion:multi_planar | 1 | Plate Halo | Thin |
| training_goal:mobility + training_goal:recovery | 2 | Stretch, Thoracic Open Book | Thin |
| training_goal:power | 5 | Air Bike Sprint, Box Jump, Burpee, Sled Push, Squat Jump | OK |
| spine_demand:chest_supported | 2 | Chest-Supported Dumbbell Row, Chest-Supported Row | Thin |
| Bodyweight + pattern_detail:full_body_conditioning | 1 | Burpee | Thin |
| Bodyweight + pattern_detail:locomotion_drill | 1 | Mountain Climber | Thin |
| Bodyweight + pattern_detail:plyometric_jump | 2 | Box Jump, Squat Jump | Thin |
| Dumbbell + spine_demand:chest_supported | 1 | Chest-Supported Dumbbell Row | Thin |
| Plate + pattern_detail:trunk_rotation | 1 | Plate Russian Twist | Thin |
| Sled + pattern_detail:sled_drag | 2 | Backward Sled Drag, Sled Drag | Thin |
| Smith Machine + hinge | 2 | Smith Machine Hip Thrust, Smith Machine Romanian Deadlift | Thin |
| Smith Machine + pattern_detail:horizontal_push | 2 | Smith Machine Bench Press, Smith Machine Incline Bench Press | Thin |
| training_goal:conditioning + training_goal:power | 5 | Air Bike Sprint, Box Jump, Burpee, Sled Push, Squat Jump | OK |
| Suspicious: Bodyweight + loading_profile:cardio_machine | 0 | - | OK |
| Suspicious: Sled without sled_loaded | 0 | - | OK |
| Suspicious: Cardio Machine without cardio_machine | 0 | - | OK |
| Suspicious: curl name without biceps primary_muscles | 0 | - | OK |
| Suspicious: shoulder press or overhead press includes chest | 0 | - | OK |
| Suspicious: calf raise without calves primary_muscles | 0 | - | OK |
| Suspicious: plank/hold not time-based unless intentionally reps | 0 | - | OK |
| Suspicious: mobility_drill not time or reps | 0 | - | OK |

