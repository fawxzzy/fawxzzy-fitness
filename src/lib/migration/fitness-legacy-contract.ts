export const FITNESS_LEGACY_SNAPSHOT_VERSION = "fitness-legacy-v1" as const;

export const FITNESS_LEGACY_CANONICAL_TABLES = [
  "profiles",
  "exercises",
  "routines",
  "routine_days",
  "routine_day_exercises",
  "sessions",
  "session_exercises",
  "sets",
] as const;

export const FITNESS_LEGACY_EXCLUDED_TABLES = [
  "exercise_stats",
  "session_follow_up_jobs",
] as const;

export const FITNESS_LEGACY_SIGNOFF_METRICS = [
  "profiles",
  "user_owned_exercises",
  "routines",
  "routine_days",
  "routine_day_exercises",
  "sessions",
  "session_exercises",
  "sets",
] as const;

export const FITNESS_LEGACY_SIGNOFF_NOTES = [
  "Treat exercise_stats and session_follow_up_jobs as derived or operational state, not hard signoff blockers.",
  "Compare global exercises by normalized_name when needed. Do not require raw UUID parity across projects.",
] as const;

export type FitnessLegacyCanonicalTable =
  (typeof FITNESS_LEGACY_CANONICAL_TABLES)[number];

export type FitnessLegacyExcludedTable =
  (typeof FITNESS_LEGACY_EXCLUDED_TABLES)[number];

export type FitnessLegacySignoffMetric =
  (typeof FITNESS_LEGACY_SIGNOFF_METRICS)[number];

export type FitnessWeightUnit = "lbs" | "kg";
export type FitnessDistanceUnit = "mi" | "km" | "m";
export type FitnessDefaultUnit =
  | "reps"
  | "seconds"
  | "minutes"
  | "meters"
  | "miles"
  | FitnessDistanceUnit;
export type FitnessMeasurementType =
  | "reps"
  | "time"
  | "distance"
  | "time_distance";

export type FitnessLegacyUserIdentity = {
  legacy_user_id: string;
  email: string | null;
  phone: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  raw_app_meta_data: Record<string, unknown> | null;
  raw_user_meta_data: Record<string, unknown> | null;
};

export type FitnessLegacyProfileSnapshot = {
  legacy_profile_id: string;
  timezone: string;
  active_routine_legacy_id: string | null;
  preferred_weight_unit: FitnessWeightUnit | null;
  preferred_distance_unit: Exclude<FitnessDistanceUnit, "m"> | null;
  created_at: string | null;
  updated_at: string | null;
};

export type FitnessLegacyExerciseSnapshot = {
  legacy_exercise_id: string;
  legacy_owner_user_id: string | null;
  owner_scope: "global" | "user";
  normalized_name: string;
  name: string;
  is_global: boolean;
  primary_muscle: string | null;
  primary_muscles: string[] | null;
  secondary_muscles: string[] | null;
  equipment: string | null;
  movement_pattern: string | null;
  measurement_type: FitnessMeasurementType | null;
  default_unit: FitnessDefaultUnit | null;
  calories_estimation_method: string | null;
  how_to_short: string | null;
  image_howto_path: string | null;
  image_muscles_path: string | null;
  created_at: string | null;
};

export type FitnessLegacyRoutineSnapshot = {
  legacy_routine_id: string;
  name: string;
  cycle_length_days: number;
  start_date: string;
  timezone: string;
  progression_mode: string | null;
  temperament: string | null;
  weight_unit: FitnessWeightUnit | null;
  created_at: string | null;
  updated_at: string | null;
};

export type FitnessLegacyRoutineDaySnapshot = {
  legacy_routine_day_id: string;
  legacy_routine_id: string;
  day_index: number;
  name: string | null;
  is_rest: boolean;
  notes: string | null;
  created_at: string | null;
};

export type FitnessLegacyRoutineDayExerciseSnapshot = {
  legacy_routine_day_exercise_id: string;
  legacy_routine_day_id: string;
  legacy_exercise_id: string;
  position: number;
  target_sets: number | null;
  target_reps: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_weight: number | null;
  target_weight_unit: FitnessWeightUnit | null;
  target_duration_seconds: number | null;
  target_distance: number | null;
  target_distance_unit: FitnessDistanceUnit | null;
  target_calories: number | null;
  measurement_type: FitnessMeasurementType | null;
  default_unit: FitnessDefaultUnit | null;
  notes: string | null;
  created_at: string | null;
};

export type FitnessLegacySessionSnapshot = {
  legacy_session_id: string;
  legacy_routine_id: string | null;
  performed_at: string;
  routine_day_index: number | null;
  name: string | null;
  routine_day_name: string | null;
  day_name_override: string | null;
  duration_seconds: number | null;
  status: "in_progress" | "completed";
  notes: string | null;
};

export type FitnessLegacySessionExerciseSnapshot = {
  legacy_session_exercise_id: string;
  legacy_session_id: string;
  legacy_exercise_id: string;
  legacy_routine_day_exercise_id: string | null;
  position: number;
  performed_index: number | null;
  is_skipped: boolean;
  notes: string | null;
  measurement_type: FitnessMeasurementType | null;
  default_unit: FitnessDefaultUnit | null;
  target_reps: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_sets_min: number | null;
  target_sets_max: number | null;
  target_weight: number | null;
  target_weight_min: number | null;
  target_weight_max: number | null;
  target_weight_unit: FitnessWeightUnit | null;
  target_duration_seconds: number | null;
  target_time_seconds_min: number | null;
  target_time_seconds_max: number | null;
  target_distance: number | null;
  target_distance_min: number | null;
  target_distance_max: number | null;
  target_distance_unit: FitnessDistanceUnit | null;
  target_calories: number | null;
  target_calories_min: number | null;
  target_calories_max: number | null;
};

export type FitnessLegacySetSnapshot = {
  legacy_set_id: string;
  legacy_session_exercise_id: string;
  client_log_id: string | null;
  set_index: number;
  weight: number;
  weight_unit: FitnessWeightUnit | null;
  reps: number;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: FitnessDistanceUnit | null;
  calories: number | null;
  rpe: number | null;
  is_warmup: boolean;
  notes: string | null;
};

export type FitnessLegacySnapshotMetadata = {
  snapshot_version: typeof FITNESS_LEGACY_SNAPSHOT_VERSION;
  source_app: "fawxzzy-fitness";
  source_backend: "legacy-supabase";
  exported_at: string;
  canonical_tables: readonly FitnessLegacyCanonicalTable[];
  excluded_tables: readonly FitnessLegacyExcludedTable[];
};

export type FitnessLegacySnapshot = {
  metadata: FitnessLegacySnapshotMetadata;
  identity: FitnessLegacyUserIdentity;
  profile: FitnessLegacyProfileSnapshot | null;
  exercises: FitnessLegacyExerciseSnapshot[];
  routines: FitnessLegacyRoutineSnapshot[];
  routine_days: FitnessLegacyRoutineDaySnapshot[];
  routine_day_exercises: FitnessLegacyRoutineDayExerciseSnapshot[];
  sessions: FitnessLegacySessionSnapshot[];
  session_exercises: FitnessLegacySessionExerciseSnapshot[];
  sets: FitnessLegacySetSnapshot[];
};

export type FitnessLegacySignoffCountMap = Record<
  FitnessLegacySignoffMetric,
  number
>;

export function isFitnessLegacyCanonicalTable(
  value: string,
): value is FitnessLegacyCanonicalTable {
  return (FITNESS_LEGACY_CANONICAL_TABLES as readonly string[]).includes(value);
}

export function isFitnessLegacyExcludedTable(
  value: string,
): value is FitnessLegacyExcludedTable {
  return (FITNESS_LEGACY_EXCLUDED_TABLES as readonly string[]).includes(value);
}

export function getFitnessLegacySnapshotSignoffCounts(
  snapshot: FitnessLegacySnapshot,
): FitnessLegacySignoffCountMap {
  return {
    profiles: snapshot.profile ? 1 : 0,
    user_owned_exercises: snapshot.exercises.filter(
      (exercise) => exercise.owner_scope === "user",
    ).length,
    routines: snapshot.routines.length,
    routine_days: snapshot.routine_days.length,
    routine_day_exercises: snapshot.routine_day_exercises.length,
    sessions: snapshot.sessions.length,
    session_exercises: snapshot.session_exercises.length,
    sets: snapshot.sets.length,
  };
}
