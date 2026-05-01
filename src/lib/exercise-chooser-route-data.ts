import { listExercises } from "@/lib/exercises";
import { mapExerciseStatsForPicker } from "@/lib/exercise-picker-stats";
import { getExerciseStatsForExercises } from "@/lib/exercise-stats";

export async function loadExerciseChooserRouteData(userId: string) {
  const exercises = await listExercises();
  const exerciseStatsByExerciseId = await getExerciseStatsForExercises(
    userId,
    exercises.map((exercise) => exercise.id),
  );

  return {
    exercises,
    exerciseStats: mapExerciseStatsForPicker(exercises, exerciseStatsByExerciseId),
  };
}
