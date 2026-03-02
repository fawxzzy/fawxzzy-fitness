import "server-only";

import { EXERCISE_OPTIONS } from "@/lib/exercise-options";
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

export async function getExerciseInfoPayload(userId: string, exerciseId: string): Promise<ExerciseInfoPayload | null> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("exercises")
    .select("id, exercise_id, slug, name, how_to_short, primary_muscle, movement_pattern, equipment, image_icon_path, image_howto_path")
    .eq("id", exerciseId)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .maybeSingle();

  if (error) {
    throw new Error(`failed to load exercise info: ${error.message}`);
  }

  const fallbackExercise = EXERCISE_OPTIONS.find((exercise) => exercise.id === exerciseId);
  if (!data && !fallbackExercise) {
    return null;
  }

  const canonicalExerciseId = data?.exercise_id ?? data?.id ?? fallbackExercise?.id;
  if (!canonicalExerciseId) {
    return null;
  }

  const stats = await getExerciseStatsForExercise(userId, canonicalExerciseId);

  if (data) {
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

  return {
    exercise: {
      id: fallbackExercise!.id,
      exercise_id: fallbackExercise!.id,
      name: fallbackExercise!.name,
      primary_muscle: fallbackExercise!.primary_muscle,
      equipment: fallbackExercise!.equipment,
      movement_pattern: fallbackExercise!.movement_pattern,
      image_howto_path: null,
      how_to_short: fallbackExercise!.how_to_short,
      image_icon_path: null,
      slug: null,
    },
    stats,
  };
}
