import "server-only";

import { getExerciseHowToImageSrc } from "@/lib/exerciseImages";
import { getExerciseStatsForExercise, type ExerciseStatsRow } from "@/lib/exercise-stats";
import { supabaseServer } from "@/lib/supabase/server";

export type ExerciseInfoExercise = {
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

export type ExerciseInfoPayload = {
  exercise: ExerciseInfoExercise;
  stats: ExerciseStatsRow | null;
};

function isNoRowsError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST116") return true;
  return typeof error.message === "string" && /no rows|0 rows/i.test(error.message);
}

export async function getExerciseInfoBase(exerciseId: string, userId: string): Promise<ExerciseInfoExercise | null> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("exercises")
    .select("id, exercise_id, slug, name, how_to_short, primary_muscle, movement_pattern, equipment, image_icon_path, image_howto_path")
    .eq("id", exerciseId)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .maybeSingle();

  if (error) {
    if (isNoRowsError(error)) {
      return null;
    }

    throw new Error(`failed to load exercise info base: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const canonicalExerciseId = data.exercise_id ?? data.id;
  if (!canonicalExerciseId) {
    return null;
  }

  return {
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
  };
}

export async function getExerciseInfoStats(userId: string, canonicalExerciseId: string): Promise<ExerciseStatsRow | null> {
  try {
    return await getExerciseStatsForExercise(userId, canonicalExerciseId);
  } catch (error) {
    console.error("[exercise-info] non-fatal stats failure", {
      step: "payload:stats",
      userId,
      canonicalExerciseId,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

export function resolveExerciseInfoImages(exercise: ExerciseInfoExercise): ExerciseInfoExercise {
  const resolvedHowToPath = getExerciseHowToImageSrc(exercise);
  return {
    ...exercise,
    image_howto_path: resolvedHowToPath,
  };
}

export async function getExerciseInfoPayload(exerciseId: string, userId: string): Promise<ExerciseInfoPayload | null> {
  const exercise = await getExerciseInfoBase(exerciseId, userId);
  if (!exercise) {
    return null;
  }

  const stats = await getExerciseInfoStats(userId, exercise.exercise_id);
  const exerciseWithImages = resolveExerciseInfoImages(exercise);

  return {
    exercise: exerciseWithImages,
    stats,
  };
}
