export type ExerciseStatsOption = {
  exerciseId: string;
  statsExerciseId?: string;
  lastWeight: number | null;
  lastReps: number | null;
  lastUnit: string | null;
  lastPerformedAt: string | null;
  prWeight: number | null;
  prReps: number | null;
  prEst1rm: number | null;
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
  pr_weight: number | null;
  pr_reps: number | null;
  pr_est_1rm: number | null;
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
      prWeight: stats?.pr_weight ?? null,
      prReps: stats?.pr_reps ?? null,
      prEst1rm: stats?.pr_est_1rm ?? null,
    };
  });
}
