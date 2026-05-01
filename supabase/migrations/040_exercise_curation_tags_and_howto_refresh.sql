-- 040_exercise_curation_tags_and_howto_refresh.sql
-- Generated from supabase/data/global_exercises_canonical.json via scripts/refresh-exercise-catalog.mjs.

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS curation_tags jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace hard before you roll, reach only as far as you can keep ribs and pelvis stacked, then pull back without letting the low back sag.',
  curation_tags = '{"pattern_detail":["trunk_bracing"],"plane_of_motion":["sagittal"],"exercise_utility":["auxiliary"],"body_position":["kneeling"],"training_goal":["core_stability","accessory"],"difficulty":["advanced"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["trunk_bracing"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Ab Wheel Rollout'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Sit tall with the hips square, press the knees outward from the hip joint, and return without bouncing off the stack.',
  curation_tags = '{"pattern_detail":["hip_abduction"],"plane_of_motion":["frontal"],"exercise_utility":["isolation"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["hip_abduction"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Abductor Machine'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Sit upright with the pelvis still, squeeze the legs inward through the pads, and return under control.',
  curation_tags = '{"pattern_detail":["hip_adduction"],"plane_of_motion":["frontal"],"exercise_utility":["isolation"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["hip_adduction"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Adductor Machine'));

UPDATE public.exercises SET
  equipment = 'Cardio Machine',
  measurement_type = 'time_distance',
  default_unit = 'm',
  calories_estimation_method = 'machine_reported',
  how_to_short = 'Drive the handles and pedals aggressively with a rigid trunk, hold the target effort for the interval, and ease down under control when the work ends.',
  curation_tags = '{"pattern_detail":["cycling"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["conditioning","power"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["cardio_machine"],"joint_emphasis":["cyclical_conditioning"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Air Bike Sprint'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep the upper arm quiet, curl the load toward shoulder height, and lower without letting the torso sway or the shoulders roll forward.',
  curation_tags = '{"pattern_detail":["elbow_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["alternating"],"loading_profile":["free_weight"],"joint_emphasis":["elbow_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Alternating Dumbbell Curl'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, press the load overhead on a controlled path, and finish with the ribs stacked over the hips instead of leaning back.',
  curation_tags = '{"pattern_detail":["vertical_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["vertical_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Arnold Press'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace, drive through the heels, extend the hips until the ribs stay stacked, and lower without arching the low back.',
  curation_tags = '{"pattern_detail":["hip_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["auxiliary"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["hip_dominant"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Back Extension'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, descend by sitting between the hips while keeping pressure through the whole foot, and drive up through mid-foot.',
  curation_tags = '{"pattern_detail":["squat"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["knee_dominant"],"spine_demand":["high_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Back Squat'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders back and down, lower the load to the chest or handles with stacked wrists, and press to full elbow extension under control.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Barbell Bench Press'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep the upper arm quiet, curl the load toward shoulder height, and lower without letting the torso sway or the shoulders roll forward.',
  curation_tags = '{"pattern_detail":["elbow_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["elbow_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Barbell Curl'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the torso, pull the load toward the lower ribs or hip, squeeze the upper back, and return without letting the shoulders dump forward.',
  curation_tags = '{"pattern_detail":["horizontal_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["horizontal_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Barbell Row'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Stay tall through the trunk, lower until the lead leg takes the load and the back knee approaches the floor, then drive through the front foot.',
  curation_tags = '{"pattern_detail":["split_squat_lunge"],"plane_of_motion":["sagittal"],"exercise_utility":["auxiliary"],"body_position":["split_stance"],"training_goal":["strength","hypertrophy"],"difficulty":["advanced"],"setup_cost":["quick_setup"],"stability_requirement":["balance_demanding"],"unilateral_profile":["unilateral"],"loading_profile":["free_weight"],"joint_emphasis":["knee_dominant"],"spine_demand":["moderate_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Bulgarian Split Squat'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace first, curl the ribcage toward the pelvis through the abs, and return without yanking through the neck or hips.',
  curation_tags = '{"pattern_detail":["trunk_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["trunk_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Cable Crunch'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep the upper arm quiet, curl the load toward shoulder height, and lower without letting the torso sway or the shoulders roll forward.',
  curation_tags = '{"pattern_detail":["elbow_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["elbow_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Cable Curl'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep a soft elbow bend, open through the chest until the shoulders stay packed, then bring the handles or bells back together with control.',
  curation_tags = '{"pattern_detail":["chest_fly"],"plane_of_motion":["transverse"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["shoulder_horizontal_adduction"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Cable Fly'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace, drive through the heels, extend the hips until the ribs stay stacked, and lower without arching the low back.',
  curation_tags = '{"pattern_detail":["hip_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["auxiliary"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["hip_dominant"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Cable Kickback'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Raise the load out to shoulder height with a soft elbow, keep the shoulders down, and lower without swinging.',
  curation_tags = '{"pattern_detail":["shoulder_abduction"],"plane_of_motion":["frontal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["shoulder_abduction"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Cable Lateral Raise'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders down, sweep the arms out and back in line with the rear delts, and return without shrugging or jutting the ribs forward.',
  curation_tags = '{"pattern_detail":["shoulder_horizontal_abduction"],"plane_of_motion":["transverse"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["shoulder_horizontal_abduction"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Cable Rear Delt Fly'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Move through a full ankle stretch, rise onto the ball of the foot, pause at the top, and lower under control.',
  curation_tags = '{"pattern_detail":["plantar_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["plantar_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Calf Raise (Seated)'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Move through a full ankle stretch, rise onto the ball of the foot, pause at the top, and lower under control.',
  curation_tags = '{"pattern_detail":["plantar_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["plantar_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Calf Raise (Standing)'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the torso, pull the load toward the lower ribs or hip, squeeze the upper back, and return without letting the shoulders dump forward.',
  curation_tags = '{"pattern_detail":["horizontal_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["prone"],"training_goal":["strength","hypertrophy"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["horizontal_pull"],"spine_demand":["chest_supported"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Chest-Supported Row'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Start from a full hang or reach, pull the elbows toward the ribs until the bar comes to you, and lower to full extension under control.',
  curation_tags = '{"pattern_detail":["vertical_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["hanging"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["hanging"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["vertical_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":["supinated_grip","hanging"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Chin-Up'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders back and down, lower the load to the chest or handles with stacked wrists, and press to full elbow extension under control.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":["close_grip"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Close-Grip Bench Press'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders down first, pull the bar toward the upper chest by driving the elbows to your sides, and return to full reach without shrugging.',
  curation_tags = '{"pattern_detail":["vertical_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["vertical_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":["close_grip","shoulder_depression"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Close-Grip Lat Pulldown'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace from head to heels, lower under control through your available range, and press back up without losing shoulder or trunk position.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":["close_grip"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Close-Grip Push-Up'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep the upper arm quiet, curl the load toward shoulder height, and lower without letting the torso sway or the shoulders roll forward.',
  curation_tags = '{"pattern_detail":["elbow_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["elbow_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Concentration Curl'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep the upper arm quiet, curl the load toward shoulder height, and lower without letting the torso sway or the shoulders roll forward.',
  curation_tags = '{"pattern_detail":["elbow_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["elbow_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Cross-Body Hammer Curl'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, keep the ribs stacked over the pelvis, and hold the position without letting the low back arch or the torso rotate.',
  curation_tags = '{"pattern_detail":["trunk_bracing"],"plane_of_motion":["sagittal"],"exercise_utility":["auxiliary"],"body_position":["supine"],"training_goal":["core_stability","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["trunk_bracing"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Dead Bug'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace hard, keep the load close as you hinge and drive through the floor, and lock out the hips without overextending the low back.',
  curation_tags = '{"pattern_detail":["hinge"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["hip_dominant"],"spine_demand":["high_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Deadlift'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders back and down, lower the load to the chest or handles with stacked wrists, and press to full elbow extension under control.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Decline Barbell Bench Press'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders back and down, lower the load to the chest or handles with stacked wrists, and press to full elbow extension under control.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Decline Dumbbell Bench Press'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace from head to heels, lower under control through your available range, and press back up without losing shoulder or trunk position.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Deficit Push-Up'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Support your body with the shoulders packed, lower until the upper arm reaches your controlled depth, and press back to lockout without swinging.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Dips (Chest)'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Support your body with the shoulders packed, lower until the upper arm reaches your controlled depth, and press back to lockout without swinging.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Dips (Triceps)'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Move through a full ankle stretch, rise onto the ball of the foot, pause at the top, and lower under control.',
  curation_tags = '{"pattern_detail":["plantar_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["plantar_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Donkey Calf Raise'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders back and down, lower the load to the chest or handles with stacked wrists, and press to full elbow extension under control.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Dumbbell Bench Press'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep the upper arm quiet, curl the load toward shoulder height, and lower without letting the torso sway or the shoulders roll forward.',
  curation_tags = '{"pattern_detail":["elbow_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["elbow_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Dumbbell Curl'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep a soft elbow bend, open through the chest until the shoulders stay packed, then bring the handles or bells back together with control.',
  curation_tags = '{"pattern_detail":["chest_fly"],"plane_of_motion":["transverse"],"exercise_utility":["isolation"],"body_position":["supine"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["shoulder_horizontal_adduction"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Dumbbell Fly'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Pin the upper arm in place, extend the elbow to full lockout, and return with control instead of letting the weight yank you back.',
  curation_tags = '{"pattern_detail":["elbow_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["elbow_extension"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Dumbbell Overhead Triceps Extension'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the torso, pull the load toward the lower ribs or hip, squeeze the upper back, and return without letting the shoulders dump forward.',
  curation_tags = '{"pattern_detail":["horizontal_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["horizontal_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Dumbbell Row'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep the upper arm quiet, curl the load toward shoulder height, and lower without letting the torso sway or the shoulders roll forward.',
  curation_tags = '{"pattern_detail":["elbow_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["elbow_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('EZ-Bar Curl'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Pull the rope toward eye level with elbows high, finish by rotating the hands back, and return without letting the ribs flare.',
  curation_tags = '{"pattern_detail":["horizontal_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["horizontal_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Face Pull'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Lift the load in front to shoulder height without leaning back, pause briefly, and lower under control.',
  curation_tags = '{"pattern_detail":["shoulder_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["shoulder_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Front Raise'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, descend by sitting between the hips while keeping pressure through the whole foot, and drive up through mid-foot.',
  curation_tags = '{"pattern_detail":["squat"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["knee_dominant"],"spine_demand":["high_spinal_load"],"grip_constraint":["front_rack"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Front Squat'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace, drive through the heels, extend the hips until the ribs stay stacked, and lower without arching the low back.',
  curation_tags = '{"pattern_detail":["hip_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["auxiliary"],"body_position":["supine"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["hip_dominant"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Glute Bridge'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, descend by sitting between the hips while keeping pressure through the whole foot, and drive up through mid-foot.',
  curation_tags = '{"pattern_detail":["squat"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["knee_dominant"],"spine_demand":["moderate_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Goblet Squat'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, descend by sitting between the hips while keeping pressure through the whole foot, and drive up through mid-foot.',
  curation_tags = '{"pattern_detail":["squat"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["seated"],"training_goal":["strength","hypertrophy"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["knee_dominant"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Hack Squat'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep the upper arm quiet, curl the load toward shoulder height, and lower without letting the torso sway or the shoulders roll forward.',
  curation_tags = '{"pattern_detail":["elbow_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["elbow_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Hammer Curl'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Posteriorly tilt the pelvis, raise the legs without swinging, and lower only as far as you can keep the trunk braced.',
  curation_tags = '{"pattern_detail":["leg_raise"],"plane_of_motion":["sagittal"],"exercise_utility":["auxiliary"],"body_position":["hanging"],"training_goal":["hypertrophy","accessory"],"difficulty":["advanced"],"setup_cost":["quick_setup"],"stability_requirement":["hanging"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["general_strength"],"spine_demand":["low_spinal_load"],"grip_constraint":["hanging"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Hanging Leg Raise'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, descend by sitting between the hips while keeping pressure through the whole foot, and drive up through mid-foot.',
  curation_tags = '{"pattern_detail":["squat"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["knee_dominant"],"spine_demand":["high_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('High-Bar Back Squat'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep a soft elbow bend, open through the chest until the shoulders stay packed, then bring the handles or bells back together with control.',
  curation_tags = '{"pattern_detail":["chest_fly"],"plane_of_motion":["transverse"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["shoulder_horizontal_adduction"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('High-to-Low Cable Fly'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace, drive through the heels, extend the hips until the ribs stay stacked, and lower without arching the low back.',
  curation_tags = '{"pattern_detail":["hip_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["auxiliary"],"body_position":["supine"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["hip_dominant"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Hip Thrust'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'time',
  default_unit = 's',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, keep the ribs stacked over the pelvis, and hold the position without letting the low back arch or the torso rotate.',
  curation_tags = '{"pattern_detail":["trunk_bracing"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["conditioning","endurance"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cardio_machine"],"joint_emphasis":["trunk_bracing"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Hollow Body Hold'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders back and down, lower the load to the chest or handles with stacked wrists, and press to full elbow extension under control.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Incline Barbell Bench Press'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders back and down, lower the load to the chest or handles with stacked wrists, and press to full elbow extension under control.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Incline Dumbbell Bench Press'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep the upper arm quiet, curl the load toward shoulder height, and lower without letting the torso sway or the shoulders roll forward.',
  curation_tags = '{"pattern_detail":["elbow_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["elbow_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Incline Dumbbell Curl'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep a soft elbow bend, open through the chest until the shoulders stay packed, then bring the handles or bells back together with control.',
  curation_tags = '{"pattern_detail":["chest_fly"],"plane_of_motion":["transverse"],"exercise_utility":["isolation"],"body_position":["supine"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["shoulder_horizontal_adduction"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Incline Dumbbell Fly'));

UPDATE public.exercises SET
  equipment = 'Cardio Machine',
  measurement_type = 'time_distance',
  default_unit = 'm',
  calories_estimation_method = 'machine_reported',
  how_to_short = 'Set the pace and incline, keep your posture tall, and walk with a smooth controlled stride instead of hanging on the rails.',
  curation_tags = '{"pattern_detail":["walking"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["conditioning","endurance"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["cardio_machine"],"joint_emphasis":["cyclical_conditioning"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Incline Walk'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'time',
  default_unit = 's',
  calories_estimation_method = NULL,
  how_to_short = 'Stay tall, jump only high enough to clear the rope, and turn it from the wrists while keeping a steady rhythm.',
  curation_tags = '{"pattern_detail":["rope_skip"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["conditioning","endurance"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cardio_machine"],"joint_emphasis":["cyclical_conditioning"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Jump Rope'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders down first, pull the bar toward the upper chest by driving the elbows to your sides, and return to full reach without shrugging.',
  curation_tags = '{"pattern_detail":["vertical_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["vertical_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":["shoulder_depression"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Lat Pulldown'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Raise the load out to shoulder height with a soft elbow, keep the shoulders down, and lower without swinging.',
  curation_tags = '{"pattern_detail":["shoulder_abduction"],"plane_of_motion":["frontal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["shoulder_abduction"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Lateral Raise'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Raise the load out to shoulder height with a soft elbow, keep the shoulders down, and lower without swinging.',
  curation_tags = '{"pattern_detail":["shoulder_abduction"],"plane_of_motion":["frontal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["shoulder_abduction"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Leaning Cable Lateral Raise'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the pad just above the ankles, extend the knees through full range without kicking, and lower under control.',
  curation_tags = '{"pattern_detail":["knee_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["knee_dominant"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Leg Extension'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, press the load overhead on a controlled path, and finish with the ribs stacked over the hips instead of leaning back.',
  curation_tags = '{"pattern_detail":["vertical_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["vertical_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Leg Press'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, descend by sitting between the hips while keeping pressure through the whole foot, and drive up through mid-foot.',
  curation_tags = '{"pattern_detail":["squat"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["knee_dominant"],"spine_demand":["high_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Low-Bar Back Squat'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep a soft elbow bend, open through the chest until the shoulders stay packed, then bring the handles or bells back together with control.',
  curation_tags = '{"pattern_detail":["chest_fly"],"plane_of_motion":["transverse"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["shoulder_horizontal_adduction"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Low-to-High Cable Fly'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the hips firmly into the pad, curl the heels toward you without lifting the pelvis, and lower slowly through the full range.',
  curation_tags = '{"pattern_detail":["knee_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["hip_dominant"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Lying Leg Curl'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Posteriorly tilt the pelvis, raise the legs without swinging, and lower only as far as you can keep the trunk braced.',
  curation_tags = '{"pattern_detail":["leg_raise"],"plane_of_motion":["sagittal"],"exercise_utility":["auxiliary"],"body_position":["supine"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["general_strength"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Lying Leg Raise'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep the upper arm quiet, curl the load toward shoulder height, and lower without letting the torso sway or the shoulders roll forward.',
  curation_tags = '{"pattern_detail":["elbow_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["elbow_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Machine Biceps Curl'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace first, curl the ribcage toward the pelvis through the abs, and return without yanking through the neck or hips.',
  curation_tags = '{"pattern_detail":["trunk_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["trunk_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Machine Crunch'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the torso, pull the load toward the lower ribs or hip, squeeze the upper back, and return without letting the shoulders dump forward.',
  curation_tags = '{"pattern_detail":["horizontal_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["seated"],"training_goal":["strength","hypertrophy"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["horizontal_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Machine Row'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, press the load overhead on a controlled path, and finish with the ribs stacked over the hips instead of leaning back.',
  curation_tags = '{"pattern_detail":["vertical_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["vertical_press"],"spine_demand":["low_spinal_load"],"grip_constraint":["overhead_lockout"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Machine Shoulder Press'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Start from a full hang or reach, pull the elbows toward the ribs until the bar comes to you, and lower to full extension under control.',
  curation_tags = '{"pattern_detail":["vertical_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["hanging"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["hanging"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["vertical_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":["neutral_grip","hanging"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Neutral-Grip Pull-Up'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the hips firmly into the pad, curl the heels toward you without lifting the pelvis, and lower slowly through the full range.',
  curation_tags = '{"pattern_detail":["knee_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["advanced"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["hip_dominant"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Nordic Curl'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, press the load overhead on a controlled path, and finish with the ribs stacked over the hips instead of leaning back.',
  curation_tags = '{"pattern_detail":["vertical_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["vertical_press"],"spine_demand":["high_spinal_load"],"grip_constraint":["overhead_lockout"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Overhead Press'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Pin the upper arm in place, extend the elbow to full lockout, and return with control instead of letting the weight yank you back.',
  curation_tags = '{"pattern_detail":["elbow_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["elbow_extension"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Overhead Triceps Extension'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace through the trunk, press the handle straight out without letting the torso twist, and return under control.',
  curation_tags = '{"pattern_detail":["anti_rotation"],"plane_of_motion":["transverse"],"exercise_utility":["auxiliary"],"body_position":["standing"],"training_goal":["core_stability","accessory"],"difficulty":["intermediate"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["trunk_bracing"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Pallof Press'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace hard, descend to your target depth, pause without losing position, and drive up through the whole foot.',
  curation_tags = '{"pattern_detail":["squat"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","skill"],"difficulty":["advanced"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["knee_dominant"],"spine_demand":["high_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Paused Back Squat'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders back and down, lower the load to the chest or handles with stacked wrists, and press to full elbow extension under control.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["strength","skill"],"difficulty":["advanced"],"setup_cost":["high_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Paused Barbell Bench Press'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace, keep the bar close as you hinge and pull, pause at the intended position without losing tension, and finish the rep under control.',
  curation_tags = '{"pattern_detail":["hinge"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","skill"],"difficulty":["advanced"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["hip_dominant"],"spine_demand":["high_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Paused Deadlift'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace hard, descend to your target depth, pause without losing position, and drive up through the whole foot.',
  curation_tags = '{"pattern_detail":["squat"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","skill"],"difficulty":["advanced"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["knee_dominant"],"spine_demand":["high_spinal_load"],"grip_constraint":["front_rack"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Paused Front Squat'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep a soft elbow bend, open through the chest until the shoulders stay packed, then bring the handles or bells back together with control.',
  curation_tags = '{"pattern_detail":["chest_fly"],"plane_of_motion":["transverse"],"exercise_utility":["isolation"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["shoulder_horizontal_adduction"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Pec Deck'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the torso, pull the load toward the lower ribs or hip, squeeze the upper back, and return without letting the shoulders dump forward.',
  curation_tags = '{"pattern_detail":["horizontal_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["advanced"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["horizontal_pull"],"spine_demand":["high_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Pendlay Row'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'time',
  default_unit = 's',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, keep the ribs stacked over the pelvis, and hold the position without letting the low back arch or the torso rotate.',
  curation_tags = '{"pattern_detail":["trunk_bracing"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["conditioning","endurance"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cardio_machine"],"joint_emphasis":["trunk_bracing"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Plank'));

UPDATE public.exercises SET
  equipment = 'Plate',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Lift the load in front to shoulder height without leaning back, pause briefly, and lower under control.',
  curation_tags = '{"pattern_detail":["shoulder_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["shoulder_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Plate Front Raise'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Keep the upper arm quiet, curl the load toward shoulder height, and lower without letting the torso sway or the shoulders roll forward.',
  curation_tags = '{"pattern_detail":["elbow_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["elbow_flexion"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Preacher Curl'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Start from a full hang or reach, pull the elbows toward the ribs until the bar comes to you, and lower to full extension under control.',
  curation_tags = '{"pattern_detail":["vertical_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["hanging"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["hanging"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["vertical_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":["hanging"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Pull-Up'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Dip straight down, drive through the legs to transfer force into the load, and finish overhead with the trunk braced and elbows locked.',
  curation_tags = '{"pattern_detail":["vertical_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["advanced"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["vertical_press"],"spine_demand":["high_spinal_load"],"grip_constraint":["overhead_lockout"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Push Press'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace from head to heels, lower under control through your available range, and press back up without losing shoulder or trunk position.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Push-Up'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace hard, pull the bar from the pins with it kept close to the body, and lock out the hips without leaning back.',
  curation_tags = '{"pattern_detail":["hinge"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["advanced"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["hip_dominant"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Rack Pull'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders down, sweep the arms out and back in line with the rear delts, and return without shrugging or jutting the ribs forward.',
  curation_tags = '{"pattern_detail":["shoulder_horizontal_abduction"],"plane_of_motion":["transverse"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["shoulder_horizontal_abduction"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Rear Delt Fly'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace, drive through the heels, extend the hips until the ribs stay stacked, and lower without arching the low back.',
  curation_tags = '{"pattern_detail":["hip_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["auxiliary"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["hip_dominant"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Reverse Hyperextension'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Stay tall through the trunk, lower until the lead leg takes the load and the back knee approaches the floor, then drive through the front foot.',
  curation_tags = '{"pattern_detail":["split_squat_lunge"],"plane_of_motion":["sagittal"],"exercise_utility":["auxiliary"],"body_position":["split_stance"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["single_leg"],"unilateral_profile":["unilateral"],"loading_profile":["free_weight"],"joint_emphasis":["knee_dominant"],"spine_demand":["moderate_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Reverse Lunge'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders down, sweep the arms out and back in line with the rear delts, and return without shrugging or jutting the ribs forward.',
  curation_tags = '{"pattern_detail":["shoulder_horizontal_abduction"],"plane_of_motion":["transverse"],"exercise_utility":["isolation"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["shoulder_horizontal_abduction"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Reverse Pec Deck'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Pin the upper arm in place, extend the elbow to full lockout, and return with control instead of letting the weight yank you back.',
  curation_tags = '{"pattern_detail":["elbow_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["elbow_extension"],"spine_demand":["low_spinal_load"],"grip_constraint":["supinated_grip"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Reverse-Grip Pushdown'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Unlock the knees, hinge the hips back with the load close to the body, and extend through the hips to stand tall.',
  curation_tags = '{"pattern_detail":["hinge"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["hip_dominant"],"spine_demand":["high_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Romanian Deadlift'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Pin the upper arm in place, extend the elbow to full lockout, and return with control instead of letting the weight yank you back.',
  curation_tags = '{"pattern_detail":["elbow_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["elbow_extension"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Rope Pushdown'));

UPDATE public.exercises SET
  equipment = 'Cardio Machine',
  measurement_type = 'time_distance',
  default_unit = 'm',
  calories_estimation_method = 'machine_reported',
  how_to_short = 'Drive through the legs first, finish the pull with hips and arms in sequence, and recover smoothly back to the catch.',
  curation_tags = '{"pattern_detail":["rowing"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["seated"],"training_goal":["conditioning","endurance"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["cardio_machine"],"joint_emphasis":["cyclical_conditioning"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Rowing Machine'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Rotate the ribcage as a unit from side to side, keep the hips quiet, and control the range instead of throwing the load with the arms.',
  curation_tags = '{"pattern_detail":["trunk_rotation"],"plane_of_motion":["transverse"],"exercise_utility":["auxiliary"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["trunk_rotation"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Russian Twist'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, press the load overhead on a controlled path, and finish with the ribs stacked over the hips instead of leaning back.',
  curation_tags = '{"pattern_detail":["vertical_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["seated"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["vertical_press"],"spine_demand":["high_spinal_load"],"grip_constraint":["overhead_lockout"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Seated Barbell Overhead Press'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the torso, pull the load toward the lower ribs or hip, squeeze the upper back, and return without letting the shoulders dump forward.',
  curation_tags = '{"pattern_detail":["horizontal_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["seated"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["moderate_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["horizontal_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Seated Cable Row'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, press the load overhead on a controlled path, and finish with the ribs stacked over the hips instead of leaning back.',
  curation_tags = '{"pattern_detail":["vertical_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["vertical_press"],"spine_demand":["low_spinal_load"],"grip_constraint":["overhead_lockout"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Seated Dumbbell Shoulder Press'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the hips firmly into the pad, curl the heels toward you without lifting the pelvis, and lower slowly through the full range.',
  curation_tags = '{"pattern_detail":["knee_flexion"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["hip_dominant"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Seated Leg Curl'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'time',
  default_unit = 's',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, keep the ribs stacked over the pelvis, and hold the position without letting the low back arch or the torso rotate.',
  curation_tags = '{"pattern_detail":["trunk_bracing"],"plane_of_motion":["frontal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["conditioning","endurance"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cardio_machine"],"joint_emphasis":["trunk_bracing"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Side Plank'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the torso, pull the load toward the lower ribs or hip, squeeze the upper back, and return without letting the shoulders dump forward.',
  curation_tags = '{"pattern_detail":["horizontal_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["moderate_setup"],"stability_requirement":["single_arm"],"unilateral_profile":["unilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["horizontal_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Single-Arm Cable Row'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders back and down, lower the load to the chest or handles with stacked wrists, and press to full elbow extension under control.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["single_arm"],"unilateral_profile":["unilateral"],"loading_profile":["free_weight"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Single-Arm Dumbbell Bench Press'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the torso, pull the load toward the lower ribs or hip, squeeze the upper back, and return without letting the shoulders dump forward.',
  curation_tags = '{"pattern_detail":["horizontal_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["single_arm"],"unilateral_profile":["unilateral"],"loading_profile":["free_weight"],"joint_emphasis":["horizontal_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Single-Arm Dumbbell Row'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders down first, pull the bar toward the upper chest by driving the elbows to your sides, and return to full reach without shrugging.',
  curation_tags = '{"pattern_detail":["vertical_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["moderate_setup"],"stability_requirement":["single_arm"],"unilateral_profile":["unilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["vertical_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":["shoulder_depression"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Single-Arm Lat Pulldown'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace, drive through the heels, extend the hips until the ribs stay stacked, and lower without arching the low back.',
  curation_tags = '{"pattern_detail":["hip_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["auxiliary"],"body_position":["supine"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["unilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["hip_dominant"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Single-Leg Hip Thrust'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, press the load overhead on a controlled path, and finish with the ribs stacked over the hips instead of leaning back.',
  curation_tags = '{"pattern_detail":["vertical_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["unilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["vertical_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Single-Leg Press'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Unlock the knees, hinge the hips back with the load close to the body, and extend through the hips to stand tall.',
  curation_tags = '{"pattern_detail":["hinge"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["advanced"],"setup_cost":["high_setup"],"stability_requirement":["balance_demanding"],"unilateral_profile":["unilateral"],"loading_profile":["free_weight"],"joint_emphasis":["hip_dominant"],"spine_demand":["high_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Single-Leg Romanian Deadlift'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Pin the upper arm in place, extend the elbow to full lockout, and return with control instead of letting the weight yank you back.',
  curation_tags = '{"pattern_detail":["elbow_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["supine"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["elbow_extension"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Skullcrusher'));

UPDATE public.exercises SET
  equipment = 'Sled',
  measurement_type = 'distance',
  default_unit = 'm',
  calories_estimation_method = NULL,
  how_to_short = 'Lean into the handles with a rigid trunk, drive the sled with short powerful steps, and keep the feet pushing straight through the floor.',
  curation_tags = '{"pattern_detail":["sled_drive"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["conditioning","power"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cardio_machine"],"joint_emphasis":["cyclical_conditioning"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Sled Push'));

UPDATE public.exercises SET
  equipment = 'Smith Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders back and down, lower the load to the chest or handles with stacked wrists, and press to full elbow extension under control.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["strength","hypertrophy"],"difficulty":["beginner"],"setup_cost":["high_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Smith Machine Bench Press'));

UPDATE public.exercises SET
  equipment = 'Smith Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, press the load overhead on a controlled path, and finish with the ribs stacked over the hips instead of leaning back.',
  curation_tags = '{"pattern_detail":["vertical_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["high_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["vertical_press"],"spine_demand":["low_spinal_load"],"grip_constraint":["overhead_lockout"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Smith Machine Shoulder Press'));

UPDATE public.exercises SET
  equipment = 'Smith Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, descend by sitting between the hips while keeping pressure through the whole foot, and drive up through mid-foot.',
  curation_tags = '{"pattern_detail":["squat"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["beginner"],"setup_cost":["high_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["knee_dominant"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Smith Machine Squat'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace hard, keep the load close as you hinge and drive through the floor, and lock out the hips without overextending the low back.',
  curation_tags = '{"pattern_detail":["hinge"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["advanced"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["hip_dominant"],"spine_demand":["high_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Snatch-Grip Deadlift'));

UPDATE public.exercises SET
  equipment = 'Cardio Machine',
  measurement_type = 'time',
  default_unit = 's',
  calories_estimation_method = 'machine_reported',
  how_to_short = 'Stand tall, step through each stride with full foot contact, and keep the pace steady without pulling on the rails.',
  curation_tags = '{"pattern_detail":["step_cardio"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["conditioning","endurance"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["cardio_machine"],"joint_emphasis":["cyclical_conditioning"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Stair Climber'));

UPDATE public.exercises SET
  equipment = 'Cardio Machine',
  measurement_type = 'time_distance',
  default_unit = 'm',
  calories_estimation_method = 'machine_reported',
  how_to_short = 'Set the resistance, pedal at a steady cadence with a quiet upper body, and keep pressure balanced through the full pedal stroke.',
  curation_tags = '{"pattern_detail":["cycling"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["seated"],"training_goal":["conditioning","endurance"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["cardio_machine"],"joint_emphasis":["cyclical_conditioning"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Stationary Bike'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Stay tall through the trunk, lower until the lead leg takes the load and the back knee approaches the floor, then drive through the front foot.',
  curation_tags = '{"pattern_detail":["split_squat_lunge"],"plane_of_motion":["sagittal"],"exercise_utility":["auxiliary"],"body_position":["split_stance"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["balance_demanding"],"unilateral_profile":["unilateral"],"loading_profile":["free_weight"],"joint_emphasis":["knee_dominant"],"spine_demand":["moderate_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Step-Up'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Unlock the knees, hinge the hips back with the load close to the body, and extend through the hips to stand tall.',
  curation_tags = '{"pattern_detail":["hinge"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["hip_dominant"],"spine_demand":["high_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Stiff-Leg Deadlift'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Start from a full hang or reach, pull the elbows toward the ribs until the bar comes to you, and lower to full extension under control.',
  curation_tags = '{"pattern_detail":["vertical_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["vertical_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":["shoulder_depression"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Straight-Arm Pulldown'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'time',
  default_unit = 's',
  calories_estimation_method = NULL,
  how_to_short = 'Move through the intended stretch or mobility drill under control, breathe steadily, and stop short of any position that forces pain or joint compensation.',
  curation_tags = '{"pattern_detail":["mobility_drill"],"plane_of_motion":["multi_planar"],"exercise_utility":["preparatory"],"body_position":["variable"],"training_goal":["mobility","recovery"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cardio_machine"],"joint_emphasis":["general_strength"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Stretch'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the torso, pull the load toward the lower ribs or hip, squeeze the upper back, and return without letting the shoulders dump forward.',
  curation_tags = '{"pattern_detail":["horizontal_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["seated"],"training_goal":["strength","hypertrophy"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["horizontal_pull"],"spine_demand":["moderate_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('T-Bar Row'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace hard, control the descent at the prescribed cadence, stay balanced through the foot, and stand without rushing out of the bottom.',
  curation_tags = '{"pattern_detail":["squat"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","skill"],"difficulty":["advanced"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["knee_dominant"],"spine_demand":["high_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Tempo Back Squat'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders back and down, lower the load to the chest or handles with stacked wrists, and press to full elbow extension under control.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["supine"],"training_goal":["strength","skill"],"difficulty":["advanced"],"setup_cost":["high_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Tempo Barbell Bench Press'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace hard, keep the bar close through the pull, and control each phase of the lift at the prescribed cadence.',
  curation_tags = '{"pattern_detail":["hinge"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","skill"],"difficulty":["advanced"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["hip_dominant"],"spine_demand":["high_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Tempo Deadlift'));

UPDATE public.exercises SET
  equipment = 'Cardio Machine',
  measurement_type = 'time_distance',
  default_unit = 'm',
  calories_estimation_method = 'machine_reported',
  how_to_short = 'Set the pace and incline, stay tall through the torso, and keep each stride smooth from foot strike through push-off.',
  curation_tags = '{"pattern_detail":["running"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["conditioning","endurance"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["cardio_machine"],"joint_emphasis":["cyclical_conditioning"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Treadmill Run'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Pin the upper arm in place, extend the elbow to full lockout, and return with control instead of letting the weight yank you back.',
  curation_tags = '{"pattern_detail":["elbow_extension"],"plane_of_motion":["sagittal"],"exercise_utility":["isolation"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["elbow_extension"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Triceps Pushdown'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the torso, pull the load toward the lower ribs or hip, squeeze the upper back, and return without letting the shoulders dump forward.',
  curation_tags = '{"pattern_detail":["horizontal_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["horizontal_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Upright Row'));

UPDATE public.exercises SET
  equipment = 'Dumbbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Stay tall through the trunk, lower until the lead leg takes the load and the back knee approaches the floor, then drive through the front foot.',
  curation_tags = '{"pattern_detail":["split_squat_lunge"],"plane_of_motion":["sagittal"],"exercise_utility":["auxiliary"],"body_position":["split_stance"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["quick_setup"],"stability_requirement":["balance_demanding"],"unilateral_profile":["unilateral"],"loading_profile":["free_weight"],"joint_emphasis":["knee_dominant"],"spine_demand":["moderate_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Walking Lunge'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'time',
  default_unit = 's',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the trunk, keep the ribs stacked over the pelvis, and hold the position without letting the low back arch or the torso rotate.',
  curation_tags = '{"pattern_detail":["trunk_bracing"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["conditioning","endurance"],"difficulty":["advanced"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cardio_machine"],"joint_emphasis":["trunk_bracing"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Weighted Plank'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Start from a full hang or reach, pull the elbows toward the ribs until the bar comes to you, and lower to full extension under control.',
  curation_tags = '{"pattern_detail":["vertical_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["hanging"],"training_goal":["strength","skill"],"difficulty":["advanced"],"setup_cost":["high_setup"],"stability_requirement":["hanging"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["vertical_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":["hanging"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Weighted Pull-Up'));

UPDATE public.exercises SET
  equipment = 'Bodyweight',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace from head to heels, lower under control through your available range, and press back up without losing shoulder or trunk position.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","skill"],"difficulty":["advanced"],"setup_cost":["quick_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["bodyweight"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Weighted Push-Up'));

UPDATE public.exercises SET
  equipment = 'Cable',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders down first, pull the bar toward the upper chest by driving the elbows to your sides, and return to full reach without shrugging.',
  curation_tags = '{"pattern_detail":["vertical_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["hypertrophy","accessory"],"difficulty":["intermediate"],"setup_cost":["moderate_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["cable_loaded"],"joint_emphasis":["vertical_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":["wide_grip","shoulder_depression"]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Wide-Grip Lat Pulldown'));

UPDATE public.exercises SET
  equipment = 'Barbell',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Brace the torso, pull the load toward the lower ribs or hip, squeeze the upper back, and return without letting the shoulders dump forward.',
  curation_tags = '{"pattern_detail":["horizontal_pull"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["standing"],"training_goal":["strength","hypertrophy"],"difficulty":["intermediate"],"setup_cost":["high_setup"],"stability_requirement":["freestanding"],"unilateral_profile":["bilateral"],"loading_profile":["free_weight"],"joint_emphasis":["horizontal_pull"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Yates Row'));

UPDATE public.exercises SET
  equipment = 'Machine',
  measurement_type = 'reps',
  default_unit = 'reps',
  calories_estimation_method = NULL,
  how_to_short = 'Set the shoulders back and down, lower the load to the chest or handles with stacked wrists, and press to full elbow extension under control.',
  curation_tags = '{"pattern_detail":["horizontal_push"],"plane_of_motion":["sagittal"],"exercise_utility":["basic"],"body_position":["seated"],"training_goal":["hypertrophy","accessory"],"difficulty":["beginner"],"setup_cost":["quick_setup"],"stability_requirement":["supported"],"unilateral_profile":["bilateral"],"loading_profile":["machine_loaded"],"joint_emphasis":["horizontal_press"],"spine_demand":["low_spinal_load"],"grip_constraint":[]}'::jsonb
WHERE is_global = TRUE
  AND lower(btrim(name)) = lower(btrim('Chest Press'));

-- Verification:
-- SELECT name, jsonb_object_keys(curation_tags) FROM public.exercises WHERE is_global = TRUE LIMIT 20;
-- SELECT count(*) FROM public.exercises WHERE is_global = TRUE AND (how_to_short IS NULL OR btrim(how_to_short) = '');
