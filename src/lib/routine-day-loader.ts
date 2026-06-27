import { formatExerciseGoal } from "@/lib/exercise-goal-format";
import { normalizeExerciseDisplayName } from "@/lib/exercise-display";
import { getExerciseNameMap } from "@/lib/exercises";
import { getRunnableDayState, normalizeRunnableDayExercises, type RunnableDayInvalidReason, type RunnableDayState } from "@/lib/runnable-day";
import { EXERCISE_OPTIONS } from "@/lib/exercise-options";
import { resolveCanonicalExerciseId } from "@/lib/exercise-id-aliases";
import { applyEffortScheduleToRoutineDayExercise } from "@/lib/progression-effective-target";
import type { ExerciseRow, RoutineDayExerciseRow, RoutineDayRow } from "@/types/db";
import type { SupabaseClient } from "@supabase/supabase-js";

const EXERCISE_DETAILS_SELECT =
  "id, exercise_id, name, primary_muscle, equipment, movement_pattern, image_icon_path, image_howto_path, slug, how_to_short, measurement_type, default_unit, kind, type, tags, categories";
const EXERCISE_DETAILS_PREVIEW_SELECT =
  "id, exercise_id, name, primary_muscle, equipment, movement_pattern, slug";
const EXERCISE_DETAILS_SELECT_LEGACY =
  "id, name, primary_muscle, equipment, movement_pattern, measurement_type, default_unit";
const EXERCISE_DETAILS_OPTIONAL_COLUMNS = [
  "exercise_id",
  "image_path",
  "image_icon_path",
  "image_howto_path",
  "slug",
  "how_to_short",
  "kind",
  "type",
  "tags",
  "categories",
] as const;

type ExerciseDetailsRow = {
  id: string;
  exercise_id?: string | null;
  name: string | null;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  image_path?: string | null;
  image_howto_path: string | null;
  image_icon_path: string | null;
  slug: string | null;
  how_to_short: string | null;
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  default_unit?: string | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
};

type ExerciseDetailsQueryError = {
  message?: string;
} | null | undefined;

type ExerciseDetailsQueryResult<T> = {
  data: T | null;
  error: ExerciseDetailsQueryError;
};

type ExerciseDetailsQueryRawResult = {
  data: unknown;
  error: ExerciseDetailsQueryError;
};

type ExerciseDetailsQueryFn = (columns: string) => PromiseLike<ExerciseDetailsQueryRawResult>;

function isMissingExerciseDetailsColumnError(error: ExerciseDetailsQueryError) {
  const message = error?.message?.toLowerCase() ?? "";
  if (!message.includes("exercises")) {
    return false;
  }

  return EXERCISE_DETAILS_OPTIONAL_COLUMNS.some((column) => {
    const normalizedColumn = column.toLowerCase();
    return (
      message.includes(normalizedColumn)
      && (
        message.includes("schema cache")
        || (message.includes("column") && message.includes("does not exist"))
      )
    );
  });
}

function hydrateExerciseDetailsRow(row: Partial<ExerciseDetailsRow> & Pick<ExerciseRow, "id">): ExerciseDetailsRow {
  return {
    id: row.id,
    exercise_id: row.exercise_id ?? null,
    name: row.name ?? null,
    primary_muscle: row.primary_muscle ?? null,
    equipment: row.equipment ?? null,
    movement_pattern: row.movement_pattern ?? null,
    image_path: row.image_path ?? null,
    image_howto_path: row.image_howto_path ?? null,
    image_icon_path: row.image_icon_path ?? null,
    slug: row.slug ?? null,
    how_to_short: row.how_to_short ?? null,
    measurement_type: row.measurement_type ?? null,
    default_unit: row.default_unit ?? null,
    kind: row.kind ?? null,
    type: row.type ?? null,
    tags: row.tags ?? null,
    categories: row.categories ?? null,
  };
}

async function runExerciseDetailsQuery(
  query: ExerciseDetailsQueryFn,
  columns: string,
): Promise<ExerciseDetailsQueryRawResult> {
  return await Promise.resolve(query(columns));
}

async function readExerciseDetailsWithMetadataFallback<T>(args: {
  query: ExerciseDetailsQueryFn;
  mode?: "full" | "preview";
}): Promise<ExerciseDetailsRow[]> {
  const primaryColumns = args.mode === "preview" ? EXERCISE_DETAILS_PREVIEW_SELECT : EXERCISE_DETAILS_SELECT;
  const primaryResult = await runExerciseDetailsQuery(args.query, primaryColumns);
  if (!primaryResult.error) {
    return ((primaryResult.data ?? []) as Array<Partial<ExerciseDetailsRow> & Pick<ExerciseDetailsRow, "id">>).map(hydrateExerciseDetailsRow);
  }

  if (!isMissingExerciseDetailsColumnError(primaryResult.error)) {
    return [];
  }

  const fallbackResult = await runExerciseDetailsQuery(args.query, EXERCISE_DETAILS_SELECT_LEGACY);
  if (fallbackResult.error) {
    return [];
  }

  return ((fallbackResult.data ?? []) as Array<Partial<ExerciseDetailsRow> & Pick<ExerciseDetailsRow, "id">>).map(hydrateExerciseDetailsRow);
}

export type CanonicalDayExercise = RoutineDayExerciseRow & {
  exercise_id: string;
  displayName: string;
  goalLine: string | null;
  details: {
    id: string;
    primary_muscle: string | null;
    equipment: string | null;
    movement_pattern: string | null;
    image_path: string | null;
    image_howto_path: string | null;
    image_icon_path: string | null;
    slug: string | null;
    how_to_short: string | null;
    measurement_type: ExerciseDetailsRow["measurement_type"];
    default_unit: ExerciseDetailsRow["default_unit"];
    kind: ExerciseDetailsRow["kind"];
    type: ExerciseDetailsRow["type"];
    tags: ExerciseDetailsRow["tags"];
    categories: ExerciseDetailsRow["categories"];
  } | null;
};

export type CanonicalDaySummary = {
  day: RoutineDayRow;
  state: RunnableDayState;
  runnableExercises: CanonicalDayExercise[];
  invalidExercises: Array<{ id: string; exerciseId: string; reason: RunnableDayInvalidReason }>;
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
  metadataMode?: "full" | "preview";
}): Promise<LoadedCanonicalExerciseCatalog> {
  const rawExerciseIds = Array.from(new Set(
    args.exercises
      .map((exercise) => (typeof exercise.exercise_id === "string" ? exercise.exercise_id.trim() : ""))
      .filter((exerciseId): exerciseId is string => exerciseId.length > 0),
  ));

  const candidateExerciseIds = Array.from(new Set(rawExerciseIds.map((exerciseId) => resolveCanonicalExerciseId(exerciseId)).filter((exerciseId) => exerciseId.length > 0)));
  const exerciseDetailsById = new Map<string, ExerciseDetailsRow>();
  const mergeExerciseRows = (rows: ExerciseDetailsRow[]) => {
    for (const exercise of rows) {
      exerciseDetailsById.set(exercise.id, exercise);
    }
  };

  const exerciseRowsByIdResult = candidateExerciseIds.length === 0
    ? []
    : await readExerciseDetailsWithMetadataFallback({
        mode: args.metadataMode,
        query: (columns) => args.supabase
          .from("exercises")
          .select(columns)
          .in("id", candidateExerciseIds),
      });
  mergeExerciseRows(exerciseRowsByIdResult);

  let canonicalExerciseIdByRawId = buildCanonicalExerciseIdByRawId({
    rawExerciseIds,
    exerciseDetailsRows: Array.from(exerciseDetailsById.values()),
  });
  let unresolvedRawExerciseIds = rawExerciseIds.filter((exerciseId) => !canonicalExerciseIdByRawId.has(exerciseId));

  if (unresolvedRawExerciseIds.length > 0) {
    const exerciseRowsByAliasResult = await readExerciseDetailsWithMetadataFallback({
      mode: args.metadataMode,
      query: (columns) => args.supabase
        .from("exercises")
        .select(columns)
        .in("exercise_id", unresolvedRawExerciseIds),
    });
    mergeExerciseRows(exerciseRowsByAliasResult);

    canonicalExerciseIdByRawId = buildCanonicalExerciseIdByRawId({
      rawExerciseIds,
      exerciseDetailsRows: Array.from(exerciseDetailsById.values()),
    });
    unresolvedRawExerciseIds = rawExerciseIds.filter((exerciseId) => !canonicalExerciseIdByRawId.has(exerciseId));
  }

  if (unresolvedRawExerciseIds.length > 0) {
    const legacyExerciseNames = Array.from(new Set(unresolvedRawExerciseIds.flatMap((exerciseId) => {
      const legacyName = LEGACY_EXERCISE_NAME_BY_ID.get(exerciseId);
      return legacyName ? [legacyName] : [];
    })));

    if (legacyExerciseNames.length > 0) {
      const exerciseRowsByNameResult = await readExerciseDetailsWithMetadataFallback({
        mode: args.metadataMode,
        query: (columns) => args.supabase
          .from("exercises")
          .select(columns)
          .in("name", legacyExerciseNames),
      });
      mergeExerciseRows(exerciseRowsByNameResult);

      canonicalExerciseIdByRawId = buildCanonicalExerciseIdByRawId({
        rawExerciseIds,
        exerciseDetailsRows: Array.from(exerciseDetailsById.values()),
      });
    }
  }

  const exerciseDetailsRows = Array.from(exerciseDetailsById.values());
  const canonicalExerciseIdSet = new Set(exerciseDetailsById.keys());

  return {
    exerciseDetailsById,
    canonicalExerciseIdSet,
    canonicalExerciseIdByRawId,
  };
}

export async function buildCanonicalDaySummaries(args: {
  supabase: SupabaseClient;
  routineDays: RoutineDayRow[];
  allDayExercises: RoutineDayExerciseRow[];
  metadataMode?: "full" | "preview";
}): Promise<{
  summaries: CanonicalDaySummary[];
}> {
  const { supabase, routineDays, allDayExercises } = args;
  const { exerciseDetailsById, canonicalExerciseIdSet, canonicalExerciseIdByRawId } = await loadCanonicalExerciseCatalog({
    supabase,
    exercises: allDayExercises,
    metadataMode: args.metadataMode,
  });

  const normalizedDayExercises: RoutineDayExerciseRow[] = allDayExercises.map((exercise) => ({
    ...exercise,
    exercise_id: canonicalExerciseIdByRawId.get(exercise.exercise_id.trim()) ?? exercise.exercise_id,
  }));
  const normalizedDayExercisesByDayId = new Map<string, RoutineDayExerciseRow[]>();
  for (const exercise of normalizedDayExercises) {
    const current = normalizedDayExercisesByDayId.get(exercise.routine_day_id) ?? [];
    current.push(exercise);
    normalizedDayExercisesByDayId.set(exercise.routine_day_id, current);
  }
  const needsExerciseNameMap = args.metadataMode !== "preview"
    || normalizedDayExercises.some((exercise) => {
      const normalizedExerciseId = typeof exercise.exercise_id === "string" ? exercise.exercise_id.trim() : "";
      return normalizedExerciseId.length > 0 && !exerciseDetailsById.has(normalizedExerciseId);
    });
  const exerciseNameMap = needsExerciseNameMap
    ? await getExerciseNameMap()
    : new Map<string, string>();

  const summaries: CanonicalDaySummary[] = routineDays.map((day) => {
    const dayExercises = normalizedDayExercisesByDayId.get(day.id) ?? [];
    const { runnableExercises, invalidExercises } = normalizeRunnableDayExercises(dayExercises, canonicalExerciseIdSet, {
      logSource: "buildCanonicalDaySummaries",
      getExerciseName: (exercise) => {
        const details = exerciseDetailsById.get(exercise.exercise_id)
          ?? (typeof exercise.exercise_id === "string" ? exerciseDetailsById.get(resolveCanonicalExerciseId(exercise.exercise_id)) : null)
          ?? null;

        return details?.name ?? exerciseNameMap.get(exercise.exercise_id) ?? null;
      },
    });

    return {
      day,
      state: getRunnableDayState({
        isRest: day.is_rest,
        runnableExerciseCount: runnableExercises.length,
        invalidExerciseCount: invalidExercises.length,
      }),
      invalidExercises,
      runnableExercises: runnableExercises.map((exercise) => {
        const effectiveExercise = applyEffortScheduleToRoutineDayExercise({
          exercise,
          routineDayIndex: day.day_index,
        });
        const details = exerciseDetailsById.get(exercise.exercise_id) ?? null;
        return {
          ...effectiveExercise,
          displayName: normalizeExerciseDisplayName({
            exerciseId: exercise.exercise_id,
            name: details?.name,
            fallbackName: exerciseNameMap.get(exercise.exercise_id) ?? null,
          }),
          goalLine: formatExerciseGoal(effectiveExercise),
          details: details
            ? {
                id: details.id,
                primary_muscle: details.primary_muscle,
                equipment: details.equipment,
                movement_pattern: details.movement_pattern,
                image_path: details.image_path ?? null,
                image_howto_path: details.image_howto_path,
                image_icon_path: details.image_icon_path,
                slug: details.slug,
                how_to_short: details.how_to_short,
                measurement_type: details.measurement_type ?? null,
                default_unit: details.default_unit ?? null,
                kind: details.kind ?? null,
                type: details.type ?? null,
                tags: details.tags ?? null,
                categories: details.categories ?? null,
              }
            : null,
        };
      }),
    };
  });

  return { summaries };
}
