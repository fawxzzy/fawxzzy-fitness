export type ExerciseStatsOption = {
  exerciseId: string;
  statsExerciseId?: string;
  lastWeight: number | null;
  lastReps: number | null;
  lastUnit: string | null;
  lastPerformedAt: string | null;
  lastProgressionPlaybookId: string | null;
  lastProgressionPlaybookConfig: Record<string, unknown> | null;
  lastConfiguredAt: string | null;
  lastConfiguredTargetSets: number | null;
  lastConfiguredTargetRepsMin: number | null;
  lastConfiguredTargetRepsMax: number | null;
  lastConfiguredTargetWeight: number | null;
  lastConfiguredTargetWeightUnit: "lbs" | "kg" | null;
  lastConfiguredTargetDurationSeconds: number | null;
  lastConfiguredTargetDistance: number | null;
  lastConfiguredTargetDistanceUnit: string | null;
  lastConfiguredTargetCalories: number | null;
  lastConfiguredMeasurementType: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  lastConfiguredDefaultUnit: string | null;
  prWeight: number | null;
  prReps: number | null;
  prEst1rm: number | null;
  actualPrWeight: number | null;
  actualPrReps: number | null;
  actualPrAt: string | null;
};

type ExerciseWithCanonicalId = {
  id: string;
  exercise_id?: string | null;
};

export function resolveCanonicalExerciseId(exercise: ExerciseWithCanonicalId): string {
  return exercise.exercise_id ?? exercise.id;
}

type ExerciseStatsMapRow = {
  exercise_id: string;
  last_weight: number | null;
  last_reps: number | null;
  last_unit: string | null;
  last_performed_at: string | null;
  last_progression_playbook_id?: string | null;
  last_progression_playbook_config?: Record<string, unknown> | null;
  last_configured_at?: string | null;
  last_configured_target_sets?: number | null;
  last_configured_target_reps_min?: number | null;
  last_configured_target_reps_max?: number | null;
  last_configured_target_weight?: number | null;
  last_configured_target_weight_unit?: "lbs" | "kg" | null;
  last_configured_target_duration_seconds?: number | null;
  last_configured_target_distance?: number | null;
  last_configured_target_distance_unit?: string | null;
  last_configured_target_calories?: number | null;
  last_configured_measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  last_configured_default_unit?: string | null;
  pr_weight: number | null;
  pr_reps: number | null;
  pr_est_1rm: number | null;
  actual_pr_weight: number | null;
  actual_pr_reps: number | null;
  actual_pr_at: string | null;
};

export function mapExerciseStatsForPicker(
  exercises: ExerciseWithCanonicalId[],
  exerciseStatsByExerciseId: Map<string, ExerciseStatsMapRow>,
): ExerciseStatsOption[] {
  return exercises.map((exercise) => {
    const canonicalExerciseId = resolveCanonicalExerciseId(exercise);
    const stats = exerciseStatsByExerciseId.get(canonicalExerciseId);

    return {
      exerciseId: canonicalExerciseId,
      statsExerciseId: stats?.exercise_id ?? undefined,
      lastWeight: stats?.last_weight ?? null,
      lastReps: stats?.last_reps ?? null,
      lastUnit: stats?.last_unit ?? null,
      lastPerformedAt: stats?.last_performed_at ?? null,
      lastProgressionPlaybookId: stats?.last_progression_playbook_id ?? null,
      lastProgressionPlaybookConfig: stats?.last_progression_playbook_config ?? null,
      lastConfiguredAt: stats?.last_configured_at ?? null,
      lastConfiguredTargetSets: stats?.last_configured_target_sets ?? null,
      lastConfiguredTargetRepsMin: stats?.last_configured_target_reps_min ?? null,
      lastConfiguredTargetRepsMax: stats?.last_configured_target_reps_max ?? null,
      lastConfiguredTargetWeight: stats?.last_configured_target_weight ?? null,
      lastConfiguredTargetWeightUnit: stats?.last_configured_target_weight_unit ?? null,
      lastConfiguredTargetDurationSeconds: stats?.last_configured_target_duration_seconds ?? null,
      lastConfiguredTargetDistance: stats?.last_configured_target_distance ?? null,
      lastConfiguredTargetDistanceUnit: stats?.last_configured_target_distance_unit ?? null,
      lastConfiguredTargetCalories: stats?.last_configured_target_calories ?? null,
      lastConfiguredMeasurementType: stats?.last_configured_measurement_type ?? null,
      lastConfiguredDefaultUnit: stats?.last_configured_default_unit ?? null,
      prWeight: stats?.pr_weight ?? null,
      prReps: stats?.pr_reps ?? null,
      prEst1rm: stats?.pr_est_1rm ?? null,
      actualPrWeight: stats?.actual_pr_weight ?? null,
      actualPrReps: stats?.actual_pr_reps ?? null,
      actualPrAt: stats?.actual_pr_at ?? null,
    };
  });
}
