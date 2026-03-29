import type { SessionExerciseRow, SetRow } from "@/types/db";

type SessionExerciseWithExercise = SessionExerciseRow & {
  exercise?: {
    name?: string | null;
    slug?: string | null;
    image_path?: string | null;
    image_icon_path?: string | null;
    image_howto_path?: string | null;
    measurement_type?: "reps" | "time" | "distance" | "time_distance";
    default_unit?: string | null;
  } | null;
};

type LoaderSummary = {
  sessionId: string;
  sessionFound: boolean;
  sessionExercisesCount: number;
  sessionExerciseIdsCount: number;
  setsCount: number;
  fallbackPathUsed: boolean;
};

export async function loadHistoryDetailRows({
  supabase,
  sessionId,
  userId,
  sessionFound,
}: {
  supabase: any;
  sessionId: string;
  userId: string;
  sessionFound: boolean;
}) {
  const baseSessionExerciseSelect = "id, session_id, user_id, exercise_id, position, performed_index, notes, is_skipped, measurement_type, default_unit, exercise:exercises(id, name, slug, image_path, image_icon_path, image_howto_path, measurement_type, default_unit)";

  const strictSessionExerciseQuery = await supabase
    .from("session_exercises")
    .select(baseSessionExerciseSelect)
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("position", { ascending: true });

  let sessionExercises = (strictSessionExerciseQuery.data ?? []) as SessionExerciseWithExercise[];
  let fallbackPathUsed = false;

  if (sessionExercises.length === 0) {
    const relaxedSessionExerciseQuery = await supabase
      .from("session_exercises")
      .select(baseSessionExerciseSelect)
      .eq("session_id", sessionId)
      .order("position", { ascending: true });

    sessionExercises = (relaxedSessionExerciseQuery.data ?? []) as SessionExerciseWithExercise[];
    fallbackPathUsed = sessionExercises.length > 0;
  }

  const orderedSessionExercises = (() => {
    const performed = sessionExercises
      .filter((exercise) => typeof exercise.performed_index === "number")
      .sort((a, b) => (a.performed_index ?? 0) - (b.performed_index ?? 0));
    const untouched = sessionExercises.filter((exercise) => typeof exercise.performed_index !== "number");
    return [...performed, ...untouched];
  })();

  const sessionExerciseIds = orderedSessionExercises.map((row) => row.id);
  let sets = [] as SetRow[];

  if (sessionExerciseIds.length) {
    const strictSetsQuery = await supabase
      .from("sets")
      .select("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
      .in("session_exercise_id", sessionExerciseIds)
      .eq("user_id", userId)
      .order("set_index", { ascending: true });

    sets = (strictSetsQuery.data ?? []) as SetRow[];

    if (sets.length === 0) {
      const relaxedSetsQuery = await supabase
        .from("sets")
        .select("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
        .in("session_exercise_id", sessionExerciseIds)
        .order("set_index", { ascending: true });

      const relaxedSets = (relaxedSetsQuery.data ?? []) as SetRow[];
      if (relaxedSets.length > 0) {
        sets = relaxedSets;
        fallbackPathUsed = true;
      }
    }
  }

  const summary: LoaderSummary = {
    sessionId,
    sessionFound,
    sessionExercisesCount: orderedSessionExercises.length,
    sessionExerciseIdsCount: sessionExerciseIds.length,
    setsCount: sets.length,
    fallbackPathUsed,
  };

  return {
    orderedSessionExercises,
    sessionExerciseIds,
    sets,
    summary,
  };
}
