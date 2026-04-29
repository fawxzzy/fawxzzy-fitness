import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { requireUser } from "@/lib/auth";
import { normalizeExerciseDisplayName } from "@/lib/exercise-display";
import { EXERCISE_OPTIONS } from "@/lib/exercise-options";
import { normalizeExerciseCurationTags, type ExerciseCurationTags } from "@/lib/exercise-curation";
import { supabaseServerAnon } from "@/lib/supabase/server-anon";
import { supabaseServer } from "@/lib/supabase/server";
import type { ExerciseRow } from "@/types/db";
import { logDebugSummary } from "@/lib/observability";
import globalExercisesCanonical from "../../supabase/data/global_exercises_canonical.json";

const FALLBACK_CREATED_AT = "1970-01-01T00:00:00.000Z";
let hasLoggedMissingExerciseId = false;

const VALID_MOVEMENT_PATTERNS = ["push", "pull", "hinge", "squat", "carry", "rotation"] as const;
const VALID_EQUIPMENT = ["barbell", "dumbbell", "cable", "machine", "bodyweight", "cardio machine", "plate", "sled", "smith machine"] as const;
const EXERCISE_LIST_SELECT =
  "id, name, user_id, is_global, primary_muscle, equipment, movement_pattern, measurement_type, default_unit, calories_estimation_method, image_icon_path, image_howto_path, slug, how_to_short, curation_tags, created_at";
const EXERCISE_LIST_SELECT_LEGACY =
  "id, name, user_id, is_global, primary_muscle, equipment, movement_pattern, measurement_type, default_unit, calories_estimation_method, created_at";
const EXERCISE_OPTIONAL_METADATA_COLUMNS = [
  "image_path",
  "image_icon_path",
  "image_howto_path",
  "slug",
  "how_to_short",
  "curation_tags",
] as const;

const SENTINEL_EXERCISE_ID = "66666666-6666-6666-6666-666666666666";
const LEGACY_PLACEHOLDER_IDS = new Set<string>([SENTINEL_EXERCISE_ID, ...EXERCISE_OPTIONS.map((exercise) => exercise.id)]);
const canonicalCurationTagsByName = new Map<string, ExerciseCurationTags>(
  (globalExercisesCanonical as Array<{ name?: string; curation_tags?: unknown }>)
    .flatMap((exercise) => {
      const normalizedName = typeof exercise.name === "string" ? normalizeExerciseName(exercise.name).toLowerCase() : "";
      const curationTags = normalizeExerciseCurationTags(exercise.curation_tags);
      if (!normalizedName || !curationTags) {
        return [];
      }

      return [[normalizedName, curationTags] as const];
    }),
);

function isLegacyPlaceholderExercise(exercise: ExerciseRow) {
  const id = typeof exercise.id === "string" ? exercise.id.trim() : "";
  const normalizedName = typeof exercise.name === "string" ? exercise.name.trim().toLowerCase() : "";

  if (LEGACY_PLACEHOLDER_IDS.has(id)) return true;
  if (!normalizedName) return true;
  return normalizedName === "placeholder" || normalizedName === "placeholder exercise" || normalizedName === "unknown exercise";
}

function logExerciseLoaderEvent(event: string, details?: Record<string, unknown>) {
  logDebugSummary("exercises", event, details);
}

type ExerciseQueryError = {
  code?: string;
  message?: string;
} | null | undefined;

type ExerciseQueryResult<T> = {
  data: T;
  error: ExerciseQueryError;
};

type ExerciseQueryRawResult = {
  data: unknown;
  error: ExerciseQueryError;
};

type ExerciseQueryFn = (columns: string) => PromiseLike<ExerciseQueryRawResult>;

function isMissingExerciseMetadataColumnError(error: ExerciseQueryError) {
  const message = error?.message?.toLowerCase() ?? "";
  if (!message.includes("exercises")) {
    return false;
  }

  return EXERCISE_OPTIONAL_METADATA_COLUMNS.some((column) => {
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

function hydrateExerciseRow(row: Partial<ExerciseRow>): ExerciseRow {
  return {
    id: row.id ?? "",
    name: row.name ?? "",
    user_id: row.user_id ?? null,
    is_global: row.is_global ?? false,
    primary_muscle: row.primary_muscle ?? null,
    equipment: row.equipment ?? null,
    movement_pattern: row.movement_pattern ?? null,
    measurement_type: row.measurement_type ?? "reps",
    default_unit: row.default_unit ?? null,
    calories_estimation_method: row.calories_estimation_method ?? null,
    image_path: row.image_path ?? null,
    image_icon_path: row.image_icon_path ?? null,
    image_howto_path: row.image_howto_path ?? null,
    slug: row.slug ?? null,
    how_to_short: row.how_to_short ?? null,
    curation_tags: row.curation_tags ?? null,
    created_at: row.created_at ?? FALLBACK_CREATED_AT,
  };
}

async function runExerciseQuery(
  query: ExerciseQueryFn,
  columns: string,
): Promise<ExerciseQueryRawResult> {
  return await Promise.resolve(query(columns));
}

async function readExercisesWithMetadataFallback<T>(args: {
  query: ExerciseQueryFn;
}): Promise<ExerciseQueryResult<T>> {
  const primaryResult = await runExerciseQuery(args.query, EXERCISE_LIST_SELECT);
  if (!primaryResult.error) {
    return {
      data: (primaryResult.data ?? []) as T,
      error: null,
    };
  }

  if (!isMissingExerciseMetadataColumnError(primaryResult.error)) {
    return {
      data: [] as T,
      error: primaryResult.error,
    };
  }

  const fallbackResult = await runExerciseQuery(args.query, EXERCISE_LIST_SELECT_LEGACY);
  return {
    data: (fallbackResult.data ?? []) as T,
    error: fallbackResult.error,
  };
}

function fallbackGlobalExercises(): ExerciseRow[] {
  return EXERCISE_OPTIONS.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    user_id: null,
    is_global: true,
    primary_muscle: exercise.primary_muscle,
    equipment: exercise.equipment,
    movement_pattern: exercise.movement_pattern,
    measurement_type: "reps",
    default_unit: "reps",
    calories_estimation_method: null,
    image_path: null,
    image_icon_path: null,
    image_howto_path: null,
    slug: null,
    how_to_short: exercise.how_to_short,
    curation_tags: null,
    created_at: FALLBACK_CREATED_AT,
  }));
}

function normalizeExerciseName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function enrichExerciseMetadata(exercise: ExerciseRow): ExerciseRow {
  const normalizedName = normalizeExerciseName(exercise.name).toLowerCase();
  const canonicalCurationTags = canonicalCurationTagsByName.get(normalizedName) ?? null;
  const normalizedCurationTags = normalizeExerciseCurationTags(exercise.curation_tags) ?? canonicalCurationTags;

  return {
    ...exercise,
    curation_tags: normalizedCurationTags,
  };
}

export function validateExerciseName(name: string) {
  const normalized = normalizeExerciseName(name);

  if (normalized.length < 2 || normalized.length > 80) {
    throw new Error("Exercise name must be 2-80 characters.");
  }

  return normalized;
}

export function validateExerciseEquipment(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if ((VALID_EQUIPMENT as readonly string[]).includes(normalized)) {
    return normalized;
  }

  throw new Error(`Equipment must be one of: ${VALID_EQUIPMENT.join(", ")}.`);
}

export function validateMovementPattern(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if ((VALID_MOVEMENT_PATTERNS as readonly string[]).includes(normalized)) {
    return normalized;
  }

  throw new Error(`Movement pattern must be one of: ${VALID_MOVEMENT_PATTERNS.join(", ")}.`);
}

function mergeAndNormalizeExercises(args: {
  globalExercises: ExerciseRow[];
  customExercises: ExerciseRow[];
}) {
  const { globalExercises, customExercises } = args;
  const mergedExercises = [...customExercises, ...globalExercises];
  let suppressedLegacyPlaceholderCount = 0;
  const validExercises = mergedExercises.flatMap((exercise) => {
    const id = typeof exercise.id === "string" ? exercise.id.trim() : "";

    if (!id.length) {
      if (!hasLoggedMissingExerciseId) {
        hasLoggedMissingExerciseId = true;
        console.error("[exercises] Dropped exercise rows with missing/invalid id.");
      }
      return [];
    }

    const normalizedExercise = { ...exercise, id };

    if (isLegacyPlaceholderExercise(normalizedExercise)) {
      suppressedLegacyPlaceholderCount += 1;
      return [];
    }

    return [normalizedExercise];
  });
  logDebugSummary("exercises", "filtered exercise list", {
    mergedCount: mergedExercises.length,
    validCount: validExercises.length,
    suppressedLegacyPlaceholderCount,
  });

  const dedupedExercises = new Map<string, ExerciseRow>();

  for (const exercise of validExercises) {
    if (!dedupedExercises.has(exercise.id)) {
      dedupedExercises.set(exercise.id, exercise);
    }
  }

  return Array.from(dedupedExercises.values())
    .map((exercise) => enrichExerciseMetadata({
      ...exercise,
      name: normalizeExerciseDisplayName({ exerciseId: exercise.id, name: exercise.name }),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function listExercisesForUser(userId: string, client?: SupabaseClient) {
  const globalExercises = await listGlobalExercisesCached();
  const customExercises = await listUserExercises(userId, client);
  return mergeAndNormalizeExercises({ globalExercises, customExercises });
}

export async function listExercises() {
  const user = await requireUser();
  return listExercisesForUser(user.id);
}

async function listUserExercises(userId: string, client?: SupabaseClient): Promise<ExerciseRow[]> {
  const supabase = client ?? supabaseServer();
  const { data: customData, error: customError } = await readExercisesWithMetadataFallback<Partial<ExerciseRow>[]>({
    query: (columns) => supabase
      .from("exercises")
      .select(columns)
      .eq("user_id", userId)
      .order("name", { ascending: true }),
  });

  if (customError) {
    if (customError.code === "42P01") {
      return [];
    }

    throw new Error(customError.message);
  }

  return customData.map(hydrateExerciseRow);
}

const listGlobalExercisesCached = unstable_cache(
  async (): Promise<ExerciseRow[]> => {
    const supabase = supabaseServerAnon();
    const { data, error } = await readExercisesWithMetadataFallback<Partial<ExerciseRow>[]>({
      query: (columns) => supabase
        .from("exercises")
        .select(columns)
        .is("user_id", null)
        .eq("is_global", true)
        .order("name", { ascending: true }),
    });

    if (error) {
      logExerciseLoaderEvent("global-db-query-failed", {
        code: error.code,
        message: error.message,
      });

      if (error.code === "42P01") {
        const fallbackRows = fallbackGlobalExercises();
        logExerciseLoaderEvent("global-fallback-baseline", {
          reason: "undefined_table",
          rows: fallbackRows.length,
        });

        return fallbackRows;
      }

      console.error("[exercises] Failed to load global exercises from database.", {
        code: error.code,
        message: error.message,
      });

      return [];
    }

    const rows = data.map(hydrateExerciseRow);

    return rows;
  },
  ["global-exercise-list-v3"],
);

export async function getExerciseNameMap() {
  const exercises = await listExercises();
  return new Map(exercises.map((exercise) => [exercise.id, normalizeExerciseDisplayName({ exerciseId: exercise.id, name: exercise.name })]));
}
