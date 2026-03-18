import { formatExerciseGoal } from "@/lib/exercise-goal-format";
import { normalizeExerciseDisplayName } from "@/lib/exercise-display";
import { getExerciseNameMap } from "@/lib/exercises";
import { getRunnableDayState, normalizeRunnableDayExercises, type RunnableDayState } from "@/lib/runnable-day";
import { EXERCISE_OPTIONS } from "@/lib/exercise-options";
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
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | null;
  default_unit?: string | null;
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

export type LoadedCanonicalExerciseCatalog = {
  exerciseDetailsById: Map<string, ExerciseDetailsRow>;
  canonicalExerciseIdSet: Set<string>;
  canonicalExerciseIdByRawId: Map<string, string>;
};

const LEGACY_EXERCISE_NAME_BY_ID = new Map<string, string>(EXERCISE_OPTIONS.map((exercise) => [exercise.id, exercise.name]));

function normalizeExerciseName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildCanonicalExerciseIdByRawId(args: {
  rawExerciseIds: string[];
  exerciseDetailsRows: ExerciseDetailsRow[];
}): Map<string, string> {
  const canonicalExerciseIdByRawId = new Map<string, string>();
  const exerciseById = new Map(args.exerciseDetailsRows.map((exercise) => [exercise.id, exercise]));
  const exerciseIdAliasMap = new Map<string, string>();
  const exerciseByNormalizedName = new Map<string, ExerciseDetailsRow>();

  for (const exercise of args.exerciseDetailsRows) {
    if (typeof exercise.exercise_id === "string" && exercise.exercise_id.trim()) {
      exerciseIdAliasMap.set(exercise.exercise_id.trim(), exercise.id);
    }

    if (typeof exercise.name === "string" && exercise.name.trim()) {
      exerciseByNormalizedName.set(normalizeExerciseName(exercise.name), exercise);
    }
  }

  for (const rawExerciseId of args.rawExerciseIds) {
    const normalizedRawExerciseId = rawExerciseId.trim();
    if (!normalizedRawExerciseId) {
      continue;
    }

    const aliasedExerciseId = resolveCanonicalExerciseId(normalizedRawExerciseId);
    if (exerciseById.has(aliasedExerciseId)) {
      canonicalExerciseIdByRawId.set(normalizedRawExerciseId, aliasedExerciseId);
      continue;
    }

    const exerciseIdAliasMatch = exerciseIdAliasMap.get(normalizedRawExerciseId);
    if (exerciseIdAliasMatch && exerciseById.has(exerciseIdAliasMatch)) {
      canonicalExerciseIdByRawId.set(normalizedRawExerciseId, exerciseIdAliasMatch);
      continue;
    }

    const legacyExerciseName = LEGACY_EXERCISE_NAME_BY_ID.get(normalizedRawExerciseId);
    if (!legacyExerciseName) {
      continue;
    }

    const legacyNameMatch = exerciseByNormalizedName.get(normalizeExerciseName(legacyExerciseName));
    if (legacyNameMatch?.id) {
      canonicalExerciseIdByRawId.set(normalizedRawExerciseId, legacyNameMatch.id);
    }
  }

  return canonicalExerciseIdByRawId;
}

export async function loadCanonicalExerciseCatalog(args: {
  supabase: SupabaseClient;
  exercises: Array<Pick<RoutineDayExerciseRow, "exercise_id">>;
}): Promise<LoadedCanonicalExerciseCatalog> {
  const rawExerciseIds = Array.from(new Set(
    args.exercises
      .map((exercise) => (typeof exercise.exercise_id === "string" ? exercise.exercise_id.trim() : ""))
      .filter((exerciseId): exerciseId is string => exerciseId.length > 0),
  ));

  const candidateExerciseIds = Array.from(new Set(rawExerciseIds.map((exerciseId) => resolveCanonicalExerciseId(exerciseId)).filter((exerciseId) => exerciseId.length > 0)));
  const legacyExerciseNames = Array.from(new Set(rawExerciseIds.flatMap((exerciseId) => {
    const legacyName = LEGACY_EXERCISE_NAME_BY_ID.get(exerciseId);
    return legacyName ? [legacyName] : [];
  })));

  const [exerciseRowsByIdResult, exerciseRowsByNameResult] = await Promise.all([
    candidateExerciseIds.length === 0
      ? Promise.resolve({ data: [] as ExerciseDetailsRow[] })
      : args.supabase
          .from("exercises")
          .select("id, exercise_id, name, primary_muscle, equipment, movement_pattern, image_howto_path, image_icon_path, slug, how_to_short, measurement_type, default_unit")
          .in("id", candidateExerciseIds),
    legacyExerciseNames.length === 0
      ? Promise.resolve({ data: [] as ExerciseDetailsRow[] })
      : args.supabase
          .from("exercises")
          .select("id, exercise_id, name, primary_muscle, equipment, movement_pattern, image_howto_path, image_icon_path, slug, how_to_short, measurement_type, default_unit")
          .in("name", legacyExerciseNames),
  ]);

  const exerciseDetailsRows = Array.from(new Map(
    [...(exerciseRowsByIdResult.data ?? []), ...(exerciseRowsByNameResult.data ?? [])].map((exercise) => [exercise.id, exercise]),
  ).values());
  const canonicalExerciseIdByRawId = buildCanonicalExerciseIdByRawId({ rawExerciseIds, exerciseDetailsRows });
  const canonicalExerciseIdSet = new Set(exerciseDetailsRows.map((exercise) => exercise.id));

  return {
    exerciseDetailsById: new Map(exerciseDetailsRows.map((exercise) => [exercise.id, exercise])),
    canonicalExerciseIdSet,
    canonicalExerciseIdByRawId,
  };
}

export async function buildCanonicalDaySummaries(args: {
  supabase: SupabaseClient;
  routineDays: RoutineDayRow[];
  allDayExercises: RoutineDayExerciseRow[];
}): Promise<{
  summaries: CanonicalDaySummary[];
}> {
  const { supabase, routineDays, allDayExercises } = args;
  const exerciseNameMap = await getExerciseNameMap();
  const { exerciseDetailsById, canonicalExerciseIdSet, canonicalExerciseIdByRawId } = await loadCanonicalExerciseCatalog({
    supabase,
    exercises: allDayExercises,
  });

  const normalizedDayExercises = allDayExercises.map((exercise) => ({
    ...exercise,
    exercise_id: canonicalExerciseIdByRawId.get(exercise.exercise_id.trim()) ?? exercise.exercise_id,
  }));

  const summaries = routineDays.map((day) => {
    const dayExercises = normalizedDayExercises.filter((exercise) => exercise.routine_day_id === day.id);
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
