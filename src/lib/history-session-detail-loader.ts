import type { SessionExerciseRow, SetRow } from "@/types/db";

type SessionExerciseWithExercise = SessionExerciseRow;

export type ExerciseMetadata = {
  id: string;
  name: string | null;
  slug: string | null;
  image_path: string | null;
  image_icon_path: string | null;
  image_howto_path: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance" | null;
  default_unit: string | null;
};

type LoaderSummary = {
  sessionId: string;
  sessionFound: boolean;
  strictSessionExercisesCount: number;
  relaxedSessionExercisesCount: number;
  sessionExercisesCount: number;
  sessionExerciseIdsCount: number;
  strictSetsCount: number;
  relaxedSetsCount: number;
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
  const baseSessionExerciseSelect = "id, session_id, user_id, exercise_id, position, performed_index, notes, is_skipped, measurement_type, default_unit";

  const strictSessionExerciseQuery = await supabase
    .from("session_exercises")
    .select(baseSessionExerciseSelect)
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("position", { ascending: true });

  const strictSessionExercises = (strictSessionExerciseQuery.data ?? []) as SessionExerciseWithExercise[];
  let sessionExercises = strictSessionExercises;
  let relaxedSessionExercisesCount = 0;
  let fallbackPathUsed = false;

  if (sessionExercises.length === 0) {
    const relaxedSessionExerciseQuery = await supabase
      .from("session_exercises")
      .select(baseSessionExerciseSelect)
      .eq("session_id", sessionId)
      .order("position", { ascending: true });

    sessionExercises = (relaxedSessionExerciseQuery.data ?? []) as SessionExerciseWithExercise[];
    relaxedSessionExercisesCount = sessionExercises.length;
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
  const exerciseIds = Array.from(new Set(orderedSessionExercises.map((row) => row.exercise_id).filter(Boolean)));
  let exerciseMetadataById = new Map<string, ExerciseMetadata>();

  if (exerciseIds.length) {
    const exerciseQuery = await supabase
      .from("exercises")
      .select("id, name, slug, image_path, image_icon_path, image_howto_path, measurement_type, default_unit")
      .in("id", exerciseIds);
    const exerciseRows = (exerciseQuery.data ?? []) as ExerciseMetadata[];
    exerciseMetadataById = new Map(exerciseRows.map((row) => [row.id, row]));
  }

  let sets = [] as SetRow[];
  let strictSetsCount = 0;
  let relaxedSetsCount = 0;

  if (sessionExerciseIds.length) {
    const strictSetsQuery = await supabase
      .from("sets")
      .select("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
      .in("session_exercise_id", sessionExerciseIds)
      .eq("user_id", userId)
      .order("set_index", { ascending: true });

    sets = (strictSetsQuery.data ?? []) as SetRow[];
    strictSetsCount = sets.length;

    if (sets.length === 0) {
      const relaxedSetsQuery = await supabase
        .from("sets")
        .select("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
        .in("session_exercise_id", sessionExerciseIds)
        .order("set_index", { ascending: true });

      const relaxedSets = (relaxedSetsQuery.data ?? []) as SetRow[];
      relaxedSetsCount = relaxedSets.length;
      if (relaxedSets.length > 0) {
        sets = relaxedSets;
        fallbackPathUsed = true;
      }
    }
  }

  const summary: LoaderSummary = {
    sessionId,
    sessionFound,
    strictSessionExercisesCount: strictSessionExercises.length,
    relaxedSessionExercisesCount,
    sessionExercisesCount: orderedSessionExercises.length,
    sessionExerciseIdsCount: sessionExerciseIds.length,
    strictSetsCount,
    relaxedSetsCount,
    setsCount: sets.length,
    fallbackPathUsed,
  };

  return {
    orderedSessionExercises,
    exerciseMetadataById,
    sessionExerciseIds,
    sets,
    summary,
  };
}
