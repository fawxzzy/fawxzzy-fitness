import "server-only";

import { getExerciseStatsForExercise, type ExerciseStatsRow } from "@/lib/exercise-stats";
import { supabaseServer } from "@/lib/supabase/server";

export type ExerciseInfoPayload = {
  exercise: {
    id: string;
    exercise_id: string;
    name: string;
    primary_muscle: string | null;
    equipment: string | null;
    movement_pattern: string | null;
    image_howto_path: string | null;
    how_to_short: string | null;
    image_icon_path: string | null;
    slug: string | null;
  };
  stats: ExerciseStatsRow | null;
};

export async function getExerciseInfoPayload(exerciseId: string, userId: string): Promise<ExerciseInfoPayload | null> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("exercises")
    .select("id, exercise_id, slug, name, how_to_short, primary_muscle, movement_pattern, equipment, image_icon_path, image_howto_path")
    .eq("id", exerciseId)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw new Error(`failed to load exercise info: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const canonicalExerciseId = data.exercise_id ?? data.id;
  if (!canonicalExerciseId) {
    return null;
  }

  let stats: ExerciseStatsRow | null = null;
  try {
    stats = await getExerciseStatsForExercise(userId, canonicalExerciseId);
  } catch (error) {
    console.error("[exercise-info] failed to load stats", {
      exerciseId,
      canonicalExerciseId,
      userId,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  return {
    exercise: {
      id: data.id,
      exercise_id: canonicalExerciseId,
      name: data.name,
      primary_muscle: data.primary_muscle,
      equipment: data.equipment,
      movement_pattern: data.movement_pattern,
      image_howto_path: data.image_howto_path,
      how_to_short: data.how_to_short,
      image_icon_path: data.image_icon_path,
      slug: data.slug,
    },
    stats,
  };
}
