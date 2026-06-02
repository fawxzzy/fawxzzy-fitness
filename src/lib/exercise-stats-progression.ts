export type LatestCompletedExerciseProgressionRow = {
  exercise_id: string;
  performed_at: string | null;
  progression_playbook_id: string | null;
  progression_playbook_config: Record<string, unknown> | null;
};

export type LatestConfiguredExerciseSetupRow = {
  exercise_id: string;
  created_at: string | null;
  target_sets: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_weight: number | null;
  target_weight_unit: "lbs" | "kg" | null;
  target_duration_seconds: number | null;
  target_distance: number | null;
  target_distance_unit: string | null;
  target_calories: number | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  default_unit: string | null;
  progression_playbook_id: string | null;
  progression_playbook_config: Record<string, unknown> | null;
};

export type ExerciseStatsWithLatestProgression = {
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
  pr_achieved_at: string | null;
  actual_pr_weight: number | null;
  actual_pr_reps: number | null;
  actual_pr_at: string | null;
};

export function mergeExerciseStatsWithLatestProgression(
  statsRows: ExerciseStatsWithLatestProgression[],
  latestProgressionRows: LatestCompletedExerciseProgressionRow[],
  latestConfiguredSetupRows: LatestConfiguredExerciseSetupRow[] = [],
): ExerciseStatsWithLatestProgression[] {
  const latestProgressionByExerciseId = new Map<string, LatestCompletedExerciseProgressionRow>();
  for (const row of latestProgressionRows) {
    const current = latestProgressionByExerciseId.get(row.exercise_id);
    if (!current || (row.performed_at ?? "") > (current.performed_at ?? "")) {
      latestProgressionByExerciseId.set(row.exercise_id, row);
    }
  }

  const latestConfiguredSetupByExerciseId = new Map<string, LatestConfiguredExerciseSetupRow>();
  for (const row of latestConfiguredSetupRows) {
    const current = latestConfiguredSetupByExerciseId.get(row.exercise_id);
    if (!current || (row.created_at ?? "") > (current.created_at ?? "")) {
      latestConfiguredSetupByExerciseId.set(row.exercise_id, row);
    }
  }

  const mergedByExerciseId = new Map<string, ExerciseStatsWithLatestProgression>();
  for (const row of statsRows) {
    const configuredSetup = latestConfiguredSetupByExerciseId.get(row.exercise_id);
    const progression = latestProgressionByExerciseId.get(row.exercise_id) ?? (
      configuredSetup
        ? {
            exercise_id: configuredSetup.exercise_id,
            performed_at: configuredSetup.created_at,
            progression_playbook_id: configuredSetup.progression_playbook_id,
            progression_playbook_config: configuredSetup.progression_playbook_config,
          }
        : undefined
    );
    mergedByExerciseId.set(row.exercise_id, {
      ...row,
      last_progression_playbook_id: progression?.progression_playbook_id ?? null,
      last_progression_playbook_config: progression?.progression_playbook_config ?? null,
      last_configured_at: configuredSetup?.created_at ?? null,
      last_configured_target_sets: configuredSetup?.target_sets ?? null,
      last_configured_target_reps_min: configuredSetup?.target_reps_min ?? null,
      last_configured_target_reps_max: configuredSetup?.target_reps_max ?? null,
      last_configured_target_weight: configuredSetup?.target_weight ?? null,
      last_configured_target_weight_unit: configuredSetup?.target_weight_unit ?? null,
      last_configured_target_duration_seconds: configuredSetup?.target_duration_seconds ?? null,
      last_configured_target_distance: configuredSetup?.target_distance ?? null,
      last_configured_target_distance_unit: configuredSetup?.target_distance_unit ?? null,
      last_configured_target_calories: configuredSetup?.target_calories ?? null,
      last_configured_measurement_type: configuredSetup?.measurement_type ?? null,
      last_configured_default_unit: configuredSetup?.default_unit ?? null,
    });
  }

  for (const progression of latestProgressionByExerciseId.values()) {
    const configuredSetup = latestConfiguredSetupByExerciseId.get(progression.exercise_id);
    if (mergedByExerciseId.has(progression.exercise_id)) {
      continue;
    }

    mergedByExerciseId.set(progression.exercise_id, {
      exercise_id: progression.exercise_id,
      last_weight: null,
      last_reps: null,
      last_unit: null,
      last_performed_at: progression.performed_at,
      last_progression_playbook_id: progression.progression_playbook_id,
      last_progression_playbook_config: progression.progression_playbook_config,
      last_configured_at: configuredSetup?.created_at ?? null,
      last_configured_target_sets: configuredSetup?.target_sets ?? null,
      last_configured_target_reps_min: configuredSetup?.target_reps_min ?? null,
      last_configured_target_reps_max: configuredSetup?.target_reps_max ?? null,
      last_configured_target_weight: configuredSetup?.target_weight ?? null,
      last_configured_target_weight_unit: configuredSetup?.target_weight_unit ?? null,
      last_configured_target_duration_seconds: configuredSetup?.target_duration_seconds ?? null,
      last_configured_target_distance: configuredSetup?.target_distance ?? null,
      last_configured_target_distance_unit: configuredSetup?.target_distance_unit ?? null,
      last_configured_target_calories: configuredSetup?.target_calories ?? null,
      last_configured_measurement_type: configuredSetup?.measurement_type ?? null,
      last_configured_default_unit: configuredSetup?.default_unit ?? null,
      pr_weight: null,
      pr_reps: null,
      pr_est_1rm: null,
      pr_achieved_at: null,
      actual_pr_weight: null,
      actual_pr_reps: null,
      actual_pr_at: null,
    });
  }

  for (const configuredSetup of latestConfiguredSetupByExerciseId.values()) {
    if (mergedByExerciseId.has(configuredSetup.exercise_id)) {
      continue;
    }

    mergedByExerciseId.set(configuredSetup.exercise_id, {
      exercise_id: configuredSetup.exercise_id,
      last_weight: null,
      last_reps: null,
      last_unit: null,
      last_performed_at: configuredSetup.created_at,
      last_progression_playbook_id: configuredSetup.progression_playbook_id,
      last_progression_playbook_config: configuredSetup.progression_playbook_config,
      last_configured_at: configuredSetup.created_at,
      last_configured_target_sets: configuredSetup.target_sets,
      last_configured_target_reps_min: configuredSetup.target_reps_min,
      last_configured_target_reps_max: configuredSetup.target_reps_max,
      last_configured_target_weight: configuredSetup.target_weight,
      last_configured_target_weight_unit: configuredSetup.target_weight_unit,
      last_configured_target_duration_seconds: configuredSetup.target_duration_seconds,
      last_configured_target_distance: configuredSetup.target_distance,
      last_configured_target_distance_unit: configuredSetup.target_distance_unit,
      last_configured_target_calories: configuredSetup.target_calories,
      last_configured_measurement_type: configuredSetup.measurement_type,
      last_configured_default_unit: configuredSetup.default_unit,
      pr_weight: null,
      pr_reps: null,
      pr_est_1rm: null,
      pr_achieved_at: null,
      actual_pr_weight: null,
      actual_pr_reps: null,
      actual_pr_at: null,
    });
  }

  return [...mergedByExerciseId.values()];
}
