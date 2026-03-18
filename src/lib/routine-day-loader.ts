import { formatExerciseGoal } from "@/lib/exercise-goal-format";
import { normalizeExerciseDisplayName } from "@/lib/exercise-display";
import { getExerciseNameMap } from "@/lib/exercises";
import { getRunnableDayState, normalizeRunnableDayExercises, type RunnableDayState } from "@/lib/runnable-day";
import { resolveCanonicalExerciseId } from "@/lib/exercise-id-aliases";
import type { RoutineDayExerciseRow, RoutineDayRow } from "@/types/db";
import type { SupabaseClient } from "@supabase/supabase-js";

type ExerciseDetailsRow = {
  id: string;
  exercise_id?: string | null;
  name: string | null;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  image_howto_path: string | null;
  image_icon_path: string | null;
  slug: string | null;
  how_to_short: string | null;
};

export type CanonicalDayExercise = RoutineDayExerciseRow & {
  exercise_id: string;
  displayName: string;
  goalLine: string | null;
  details: {
    id: string;
    primary_muscle: string | null;
    equipment: string | null;
    movement_pattern: string | null;
    image_howto_path: string | null;
    image_icon_path: string | null;
    slug: string | null;
    how_to_short: string | null;
  } | null;
};

export type CanonicalDaySummary = {
  day: RoutineDayRow;
  state: RunnableDayState;
  runnableExercises: CanonicalDayExercise[];
  invalidExercises: Array<{ id: string; exerciseId: string; reason: "sentinel" | "missing_canonical" }>;
};

export async function buildCanonicalDaySummaries(args: {
  supabase: SupabaseClient;
  routineDays: RoutineDayRow[];
  allDayExercises: RoutineDayExerciseRow[];
}): Promise<{
  summaries: CanonicalDaySummary[];
}> {
  const { supabase, routineDays, allDayExercises } = args;
  const exerciseNameMap = await getExerciseNameMap();
  const canonicalExerciseIds = Array.from(new Set(
    allDayExercises
      .map((exercise) => resolveCanonicalExerciseId(exercise.exercise_id))
      .filter((exerciseId): exerciseId is string => typeof exerciseId === "string" && exerciseId.trim().length > 0),
  ));

  const { data: exerciseDetailsRows } = canonicalExerciseIds.length === 0
    ? { data: [] as ExerciseDetailsRow[] }
    : await supabase
        .from("exercises")
        .select("id, exercise_id, name, primary_muscle, equipment, movement_pattern, image_howto_path, image_icon_path, slug, how_to_short")
        .in("id", canonicalExerciseIds);

  const exerciseDetailsById = new Map((exerciseDetailsRows ?? []).map((exercise) => [exercise.id, exercise]));
  const canonicalExerciseIdSet = new Set((exerciseDetailsRows ?? []).map((exercise) => exercise.id));

  const summaries = routineDays.map((day) => {
    const dayExercises = allDayExercises.filter((exercise) => exercise.routine_day_id === day.id);
    const { runnableExercises, invalidExercises } = normalizeRunnableDayExercises(dayExercises, canonicalExerciseIdSet);

    return {
      day,
      state: getRunnableDayState({ isRest: day.is_rest, runnableExerciseCount: runnableExercises.length }),
      invalidExercises,
      runnableExercises: runnableExercises.map((exercise) => {
        const details = exerciseDetailsById.get(exercise.exercise_id) ?? null;
        return {
          ...exercise,
          displayName: normalizeExerciseDisplayName({
            exerciseId: exercise.exercise_id,
            name: details?.name,
            fallbackName: exerciseNameMap.get(exercise.exercise_id) ?? null,
          }),
          goalLine: formatExerciseGoal(exercise),
          details: details
            ? {
                id: details.id,
                primary_muscle: details.primary_muscle,
                equipment: details.equipment,
                movement_pattern: details.movement_pattern,
                image_howto_path: details.image_howto_path,
                image_icon_path: details.image_icon_path,
                slug: details.slug,
                how_to_short: details.how_to_short,
              }
            : null,
        };
      }),
    };
  });

  return { summaries };
}
