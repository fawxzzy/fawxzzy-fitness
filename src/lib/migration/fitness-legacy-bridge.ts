import "server-only";

import { createClient } from "@supabase/supabase-js";
import { EXERCISE_OPTIONS } from "@/lib/exercise-options";
import { LEGACY_SUPABASE_ANON_KEY, LEGACY_SUPABASE_URL } from "@/lib/env";
import { resolveCanonicalExerciseId } from "@/lib/exercise-id-aliases";
import {
  FITNESS_LEGACY_CANONICAL_TABLES,
  FITNESS_LEGACY_EXCLUDED_TABLES,
  FITNESS_LEGACY_SNAPSHOT_VERSION,
  getFitnessLegacySnapshotSignoffCounts,
  type FitnessDefaultUnit,
  type FitnessDistanceUnit,
  type FitnessLegacyExerciseSnapshot,
  type FitnessLegacyProfileSnapshot,
  type FitnessLegacyRoutineDayExerciseSnapshot,
  type FitnessLegacySessionExerciseSnapshot,
  type FitnessLegacySnapshot,
  type FitnessMeasurementType,
  type FitnessWeightUnit,
} from "@/lib/migration/fitness-legacy-contract";

type SupabaseLikeClient = any;
type JsonRecord = Record<string, unknown>;

export type FitnessLegacyExportAuth =
  | {
      legacyEmail: string;
      legacyPassword: string;
      legacyAccessToken?: undefined;
    }
  | {
      legacyEmail?: undefined;
      legacyPassword?: undefined;
      legacyAccessToken: string;
    };

type LegacyUserRecord = {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  app_metadata?: JsonRecord | null;
  user_metadata?: JsonRecord | null;
};

type ImportIdSets = {
  userExerciseIds: Set<string>;
  routineIds: Set<string>;
  routineDayIds: Set<string>;
  routineDayExerciseIds: Set<string>;
  sessionIds: Set<string>;
  sessionExerciseIds: Set<string>;
  setIds: Set<string>;
};

export type FitnessLegacyImportSummary = {
  legacyUserId: string;
  newUserId: string;
  importedCounts: ReturnType<typeof getFitnessLegacySnapshotSignoffCounts>;
  resolvedGlobalExercises: number;
  createdGlobalExercises: number;
  importedUserOwnedExercises: number;
  affectedExerciseIds: string[];
};

export type FitnessLegacyImportConflictSummary = {
  exercises: string[];
  routines: string[];
  routine_days: string[];
  routine_day_exercises: string[];
  sessions: string[];
  session_exercises: string[];
  sets: string[];
};

type ImportExerciseResolution = {
  legacyToTargetExerciseId: Map<string, string>;
  resolvedGlobalExercises: number;
  createdGlobalExercises: number;
  importedUserOwnedExercises: number;
};

const LEGACY_EXERCISE_OPTION_BY_ID = new Map<string, (typeof EXERCISE_OPTIONS)[number]>(
  EXERCISE_OPTIONS.map((exercise) => [exercise.id, exercise]),
);

function normalizeName(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown) {
  return value === true;
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const values = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);

  return values.length > 0 ? values : null;
}

function asWeightUnit(value: unknown): FitnessWeightUnit | null {
  return value === "lbs" || value === "kg" ? value : null;
}

function asDistanceUnit(value: unknown): FitnessDistanceUnit | null {
  return value === "mi" || value === "km" || value === "m" ? value : null;
}

function asDefaultUnit(value: unknown): FitnessDefaultUnit | null {
  return value === "reps"
    || value === "seconds"
    || value === "minutes"
    || value === "meters"
    || value === "miles"
    || value === "mi"
    || value === "km"
    || value === "m"
    ? value
    : null;
}

function asMeasurementType(value: unknown): FitnessMeasurementType | null {
  return value === "reps"
    || value === "time"
    || value === "distance"
    || value === "time_distance"
    ? value
    : null;
}

function ensureLegacyBridgeConfigured() {
  return {
    url: LEGACY_SUPABASE_URL(),
    anonKey: LEGACY_SUPABASE_ANON_KEY(),
  };
}

function createLegacyClient(accessToken?: string) {
  const { url, anonKey } = ensureLegacyBridgeConfigured();

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : {},
  });
}

function toSyntheticLegacyExerciseSnapshot(
  exerciseId: string,
): FitnessLegacyExerciseSnapshot | null {
  const fallbackExercise = LEGACY_EXERCISE_OPTION_BY_ID.get(exerciseId);
  if (!fallbackExercise) {
    return null;
  }

  return {
    legacy_exercise_id: exerciseId,
    legacy_owner_user_id: null,
    owner_scope: "global",
    normalized_name: normalizeName(fallbackExercise.name),
    name: fallbackExercise.name,
    is_global: true,
    primary_muscle: fallbackExercise.primary_muscle ?? null,
    primary_muscles: null,
    secondary_muscles: null,
    equipment: fallbackExercise.equipment ?? null,
    movement_pattern: fallbackExercise.movement_pattern ?? null,
    measurement_type: "reps",
    default_unit: "reps",
    calories_estimation_method: null,
    how_to_short: fallbackExercise.how_to_short ?? null,
    image_howto_path: null,
    image_muscles_path: null,
    created_at: null,
  };
}

function mapProfileSnapshot(row: JsonRecord | null): FitnessLegacyProfileSnapshot | null {
  if (!row) {
    return null;
  }

  const legacyProfileId = asString(row.id);
  if (!legacyProfileId) {
    return null;
  }

  return {
    legacy_profile_id: legacyProfileId,
    timezone: asString(row.timezone) ?? "America/Toronto",
    active_routine_legacy_id: asString(row.active_routine_id),
    preferred_weight_unit: asWeightUnit(row.preferred_weight_unit),
    preferred_distance_unit:
      row.preferred_distance_unit === "mi" || row.preferred_distance_unit === "km"
        ? row.preferred_distance_unit
        : null,
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

function mapExerciseSnapshot(row: JsonRecord): FitnessLegacyExerciseSnapshot | null {
  const legacyExerciseId = asString(row.id);
  const name = asString(row.name);

  if (!legacyExerciseId || !name) {
    return null;
  }

  const isGlobal = row.user_id === null || asBoolean(row.is_global);

  return {
    legacy_exercise_id: legacyExerciseId,
    legacy_owner_user_id: asString(row.user_id),
    owner_scope: isGlobal ? "global" : "user",
    normalized_name: normalizeName(name),
    name,
    is_global: isGlobal,
    primary_muscle: asString(row.primary_muscle),
    primary_muscles: asStringArray(row.primary_muscles),
    secondary_muscles: asStringArray(row.secondary_muscles),
    equipment: asString(row.equipment),
    movement_pattern: asString(row.movement_pattern),
    measurement_type: asMeasurementType(row.measurement_type),
    default_unit: asDefaultUnit(row.default_unit),
    calories_estimation_method: asString(row.calories_estimation_method),
    how_to_short: asString(row.how_to_short),
    image_howto_path: asString(row.image_howto_path),
    image_muscles_path: asString(row.image_muscles_path),
    created_at: asString(row.created_at),
  };
}

function mapRoutineSnapshot(row: JsonRecord) {
  const legacyRoutineId = asString(row.id);
  const name = asString(row.name);
  const cycleLengthDays = asNumber(row.cycle_length_days);
  const startDate = asString(row.start_date);

  if (!legacyRoutineId || !name || !cycleLengthDays || !startDate) {
    return null;
  }

  return {
    legacy_routine_id: legacyRoutineId,
    name,
    cycle_length_days: cycleLengthDays,
    start_date: startDate,
    timezone: asString(row.timezone) ?? "America/Toronto",
    progression_mode: asString(row.progression_mode),
    temperament: asString(row.temperament),
    weight_unit: asWeightUnit(row.weight_unit),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
  };
}

function mapRoutineDaySnapshot(row: JsonRecord) {
  const legacyRoutineDayId = asString(row.id);
  const legacyRoutineId = asString(row.routine_id);
  const dayIndex = asNumber(row.day_index);

  if (!legacyRoutineDayId || !legacyRoutineId || dayIndex === null) {
    return null;
  }

  return {
    legacy_routine_day_id: legacyRoutineDayId,
    legacy_routine_id: legacyRoutineId,
    day_index: dayIndex,
    name: asString(row.name),
    is_rest: asBoolean(row.is_rest),
    notes: asString(row.notes),
    created_at: asString(row.created_at),
  };
}

function mapRoutineDayExerciseSnapshot(
  row: JsonRecord,
): FitnessLegacyRoutineDayExerciseSnapshot | null {
  const legacyRoutineDayExerciseId = asString(row.id);
  const legacyRoutineDayId = asString(row.routine_day_id);
  const legacyExerciseId = asString(row.exercise_id);
  const position = asNumber(row.position);

  if (
    !legacyRoutineDayExerciseId
    || !legacyRoutineDayId
    || !legacyExerciseId
    || position === null
  ) {
    return null;
  }

  return {
    legacy_routine_day_exercise_id: legacyRoutineDayExerciseId,
    legacy_routine_day_id: legacyRoutineDayId,
    legacy_exercise_id: legacyExerciseId,
    position,
    target_sets: asNumber(row.target_sets),
    target_reps: asNumber(row.target_reps),
    target_reps_min: asNumber(row.target_reps_min ?? row.rep_range_min),
    target_reps_max: asNumber(row.target_reps_max ?? row.rep_range_max),
    target_weight: asNumber(row.target_weight),
    target_weight_unit: asWeightUnit(row.target_weight_unit),
    target_duration_seconds: asNumber(row.target_duration_seconds),
    target_distance: asNumber(row.target_distance),
    target_distance_unit: asDistanceUnit(row.target_distance_unit),
    target_calories: asNumber(row.target_calories),
    measurement_type: asMeasurementType(row.measurement_type),
    default_unit: asDefaultUnit(row.default_unit),
    notes: asString(row.notes),
    created_at: asString(row.created_at),
  };
}

function mapSessionSnapshot(row: JsonRecord) {
  const legacySessionId = asString(row.id);
  const performedAt = asString(row.performed_at);
  const status: "in_progress" | "completed" =
    row.status === "in_progress" ? "in_progress" : "completed";

  if (!legacySessionId || !performedAt) {
    return null;
  }

  return {
    legacy_session_id: legacySessionId,
    legacy_routine_id: asString(row.routine_id),
    performed_at: performedAt,
    routine_day_index: asNumber(row.routine_day_index),
    name: asString(row.name),
    routine_day_name: asString(row.routine_day_name),
    day_name_override: asString(row.day_name_override),
    duration_seconds: asNumber(row.duration_seconds),
    status,
    notes: asString(row.notes),
  };
}

function mapSessionExerciseSnapshot(
  row: JsonRecord,
): FitnessLegacySessionExerciseSnapshot | null {
  const legacySessionExerciseId = asString(row.id);
  const legacySessionId = asString(row.session_id);
  const legacyExerciseId = asString(row.exercise_id);
  const position = asNumber(row.position);

  if (!legacySessionExerciseId || !legacySessionId || !legacyExerciseId || position === null) {
    return null;
  }

  return {
    legacy_session_exercise_id: legacySessionExerciseId,
    legacy_session_id: legacySessionId,
    legacy_exercise_id: legacyExerciseId,
    legacy_routine_day_exercise_id: asString(row.routine_day_exercise_id),
    position,
    performed_index: asNumber(row.performed_index),
    is_skipped: asBoolean(row.is_skipped),
    notes: asString(row.notes),
    measurement_type: asMeasurementType(row.measurement_type),
    default_unit: asDefaultUnit(row.default_unit),
    target_reps: asNumber(row.target_reps),
    target_reps_min: asNumber(row.target_reps_min),
    target_reps_max: asNumber(row.target_reps_max),
    target_sets_min: asNumber(row.target_sets_min),
    target_sets_max: asNumber(row.target_sets_max),
    target_weight: asNumber(row.target_weight),
    target_weight_min: asNumber(row.target_weight_min),
    target_weight_max: asNumber(row.target_weight_max),
    target_weight_unit: asWeightUnit(row.target_weight_unit),
    target_duration_seconds: asNumber(row.target_duration_seconds),
    target_time_seconds_min: asNumber(row.target_time_seconds_min),
    target_time_seconds_max: asNumber(row.target_time_seconds_max),
    target_distance: asNumber(row.target_distance),
    target_distance_min: asNumber(row.target_distance_min),
    target_distance_max: asNumber(row.target_distance_max),
    target_distance_unit: asDistanceUnit(row.target_distance_unit),
    target_calories: asNumber(row.target_calories),
    target_calories_min: asNumber(row.target_calories_min),
    target_calories_max: asNumber(row.target_calories_max),
  };
}

function mapSetSnapshot(row: JsonRecord) {
  const legacySetId = asString(row.id);
  const legacySessionExerciseId = asString(row.session_exercise_id);
  const setIndex = asNumber(row.set_index);
  const weight = asNumber(row.weight);
  const reps = asNumber(row.reps);

  if (!legacySetId || !legacySessionExerciseId || setIndex === null || weight === null || reps === null) {
    return null;
  }

  return {
    legacy_set_id: legacySetId,
    legacy_session_exercise_id: legacySessionExerciseId,
    client_log_id: asString(row.client_log_id),
    set_index: setIndex,
    weight,
    weight_unit: asWeightUnit(row.weight_unit),
    reps,
    duration_seconds: asNumber(row.duration_seconds),
    distance: asNumber(row.distance),
    distance_unit: asDistanceUnit(row.distance_unit),
    calories: asNumber(row.calories),
    rpe: asNumber(row.rpe),
    is_warmup: asBoolean(row.is_warmup),
    notes: asString(row.notes),
  };
}

async function loadLegacySession(auth: FitnessLegacyExportAuth) {
  if ("legacyAccessToken" in auth && auth.legacyAccessToken) {
    const client = createLegacyClient(auth.legacyAccessToken);
    const { data, error } = await client.auth.getUser(auth.legacyAccessToken);
    if (error || !data.user) {
      throw new Error(error?.message ?? "Unable to validate the legacy access token.");
    }

    return {
      client,
      user: data.user as LegacyUserRecord,
    };
  }

  const credentialAuth = auth as Extract<
    FitnessLegacyExportAuth,
    { legacyEmail: string; legacyPassword: string }
  >;
  const client = createLegacyClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: credentialAuth.legacyEmail,
    password: credentialAuth.legacyPassword,
  });

  if (error || !data.session || !data.user) {
    throw new Error(error?.message ?? "Unable to sign in to the legacy project.");
  }

  return {
    client: createLegacyClient(data.session.access_token),
    user: data.user as LegacyUserRecord,
  };
}

async function readTableRows(
  client: SupabaseLikeClient,
  table: string,
  column: string,
  value: string,
) {
  const { data, error } = await client
    .from(table)
    .select("*")
    .eq(column, value);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return (data ?? []) as JsonRecord[];
}

export async function exportFitnessLegacySnapshot(
  auth: FitnessLegacyExportAuth,
): Promise<FitnessLegacySnapshot> {
  const { client, user } = await loadLegacySession(auth);

  const [
    profileRow,
    routinesRows,
    routineDayRows,
    routineDayExerciseRows,
    sessionRows,
    sessionExerciseRows,
    setRows,
  ] = await Promise.all([
    client.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    readTableRows(client, "routines", "user_id", user.id),
    readTableRows(client, "routine_days", "user_id", user.id),
    readTableRows(client, "routine_day_exercises", "user_id", user.id),
    readTableRows(client, "sessions", "user_id", user.id),
    readTableRows(client, "session_exercises", "user_id", user.id),
    readTableRows(client, "sets", "user_id", user.id),
  ]);

  if (profileRow.error) {
    throw new Error(`profiles: ${profileRow.error.message}`);
  }

  const referencedExerciseIds = Array.from(
    new Set(
      [...routineDayExerciseRows, ...sessionExerciseRows]
        .map((row) => asString(row.exercise_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const exercisesById = new Map<string, FitnessLegacyExerciseSnapshot>();

  if (referencedExerciseIds.length > 0) {
    const { data, error } = await client
      .from("exercises")
      .select("*")
      .in("id", referencedExerciseIds);

    if (error) {
      throw new Error(`exercises: ${error.message}`);
    }

    for (const row of (data ?? []) as JsonRecord[]) {
      const snapshot = mapExerciseSnapshot(row);
      if (snapshot) {
        exercisesById.set(snapshot.legacy_exercise_id, snapshot);
      }
    }
  }

  for (const exerciseId of referencedExerciseIds) {
    if (exercisesById.has(exerciseId)) {
      continue;
    }

    const syntheticExercise = toSyntheticLegacyExerciseSnapshot(exerciseId);
    if (!syntheticExercise) {
      throw new Error(
        `Legacy export could not resolve exercise ${exerciseId}. Fix or map that row before importing.`,
      );
    }

    exercisesById.set(exerciseId, syntheticExercise);
  }

  const snapshot: FitnessLegacySnapshot = {
    metadata: {
      snapshot_version: FITNESS_LEGACY_SNAPSHOT_VERSION,
      source_app: "fawxzzy-fitness",
      source_backend: "legacy-supabase",
      exported_at: new Date().toISOString(),
      canonical_tables: FITNESS_LEGACY_CANONICAL_TABLES,
      excluded_tables: FITNESS_LEGACY_EXCLUDED_TABLES,
    },
    identity: {
      legacy_user_id: user.id,
      email: user.email ?? null,
      phone: user.phone ?? null,
      created_at: user.created_at ?? null,
      last_sign_in_at: user.last_sign_in_at ?? null,
      raw_app_meta_data: asRecord(user.app_metadata),
      raw_user_meta_data: asRecord(user.user_metadata),
    },
    profile: mapProfileSnapshot((profileRow.data as JsonRecord | null) ?? null),
    exercises: Array.from(exercisesById.values()).sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
    routines: routinesRows
      .map(mapRoutineSnapshot)
      .filter(
        (
          value,
        ): value is NonNullable<ReturnType<typeof mapRoutineSnapshot>> => Boolean(value),
      ),
    routine_days: routineDayRows
      .map(mapRoutineDaySnapshot)
      .filter(
        (
          value,
        ): value is NonNullable<ReturnType<typeof mapRoutineDaySnapshot>> => Boolean(value),
      ),
    routine_day_exercises: routineDayExerciseRows
      .map(mapRoutineDayExerciseSnapshot)
      .filter(
        (value): value is FitnessLegacyRoutineDayExerciseSnapshot => Boolean(value),
      ),
    sessions: sessionRows
      .map(mapSessionSnapshot)
      .filter(
        (
          value,
        ): value is NonNullable<ReturnType<typeof mapSessionSnapshot>> => Boolean(value),
      ),
    session_exercises: sessionExerciseRows
      .map(mapSessionExerciseSnapshot)
      .filter((value): value is FitnessLegacySessionExerciseSnapshot => Boolean(value)),
    sets: setRows
      .map(mapSetSnapshot)
      .filter((value): value is NonNullable<ReturnType<typeof mapSetSnapshot>> => Boolean(value)),
  };

  snapshot.routines.sort(
    (left, right) => left.created_at?.localeCompare(right.created_at ?? "") ?? 0,
  );
  snapshot.routine_days.sort(
    (left, right) =>
      left.legacy_routine_id.localeCompare(right.legacy_routine_id)
      || left.day_index - right.day_index,
  );
  snapshot.routine_day_exercises.sort(
    (left, right) =>
      left.legacy_routine_day_id.localeCompare(right.legacy_routine_day_id)
      || left.position - right.position,
  );
  snapshot.sessions.sort((left, right) => left.performed_at.localeCompare(right.performed_at));
  snapshot.session_exercises.sort(
    (left, right) =>
      left.legacy_session_id.localeCompare(right.legacy_session_id)
      || left.position - right.position,
  );
  snapshot.sets.sort(
    (left, right) =>
      left.legacy_session_exercise_id.localeCompare(right.legacy_session_exercise_id)
      || left.set_index - right.set_index,
  );

  return snapshot;
}

export function isFitnessLegacySnapshot(value: unknown): value is FitnessLegacySnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<FitnessLegacySnapshot>;
  return snapshot.metadata?.snapshot_version === FITNESS_LEGACY_SNAPSHOT_VERSION;
}

export function getSnapshotImportIdSets(snapshot: FitnessLegacySnapshot): ImportIdSets {
  return {
    userExerciseIds: new Set(
      snapshot.exercises
        .filter((exercise) => exercise.owner_scope === "user")
        .map((exercise) => exercise.legacy_exercise_id),
    ),
    routineIds: new Set(snapshot.routines.map((routine) => routine.legacy_routine_id)),
    routineDayIds: new Set(snapshot.routine_days.map((day) => day.legacy_routine_day_id)),
    routineDayExerciseIds: new Set(
      snapshot.routine_day_exercises.map((exercise) => exercise.legacy_routine_day_exercise_id),
    ),
    sessionIds: new Set(snapshot.sessions.map((session) => session.legacy_session_id)),
    sessionExerciseIds: new Set(
      snapshot.session_exercises.map((exercise) => exercise.legacy_session_exercise_id),
    ),
    setIds: new Set(snapshot.sets.map((set) => set.legacy_set_id)),
  };
}

function collectExtraIds(existingIds: string[], allowedIds: Set<string>) {
  return existingIds.filter((id) => !allowedIds.has(id));
}

async function readExistingUserScopedIds(
  admin: SupabaseLikeClient,
  table: string,
  userId: string,
) {
  const { data, error } = await admin.from(table).select("id").eq("user_id", userId);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return (data ?? [])
    .map((row: unknown) => asString((row as JsonRecord).id))
    .filter((id: string | null): id is string => Boolean(id));
}

export async function getFitnessLegacyImportConflicts(args: {
  admin: SupabaseLikeClient;
  newUserId: string;
  snapshot: FitnessLegacySnapshot;
}): Promise<FitnessLegacyImportConflictSummary> {
  const snapshotIds = getSnapshotImportIdSets(args.snapshot);
  const [
    exercises,
    routines,
    routineDays,
    routineDayExercises,
    sessions,
    sessionExercises,
    sets,
  ] = await Promise.all([
    readExistingUserScopedIds(args.admin, "exercises", args.newUserId),
    readExistingUserScopedIds(args.admin, "routines", args.newUserId),
    readExistingUserScopedIds(args.admin, "routine_days", args.newUserId),
    readExistingUserScopedIds(args.admin, "routine_day_exercises", args.newUserId),
    readExistingUserScopedIds(args.admin, "sessions", args.newUserId),
    readExistingUserScopedIds(args.admin, "session_exercises", args.newUserId),
    readExistingUserScopedIds(args.admin, "sets", args.newUserId),
  ]);

  return {
    exercises: collectExtraIds(exercises, snapshotIds.userExerciseIds),
    routines: collectExtraIds(routines, snapshotIds.routineIds),
    routine_days: collectExtraIds(routineDays, snapshotIds.routineDayIds),
    routine_day_exercises: collectExtraIds(
      routineDayExercises,
      snapshotIds.routineDayExerciseIds,
    ),
    sessions: collectExtraIds(sessions, snapshotIds.sessionIds),
    session_exercises: collectExtraIds(
      sessionExercises,
      snapshotIds.sessionExerciseIds,
    ),
    sets: collectExtraIds(sets, snapshotIds.setIds),
  };
}

export function hasImportConflicts(conflicts: FitnessLegacyImportConflictSummary) {
  return Object.values(conflicts).some((rows) => rows.length > 0);
}

async function resolveExerciseImports(args: {
  admin: SupabaseLikeClient;
  newUserId: string;
  snapshot: FitnessLegacySnapshot;
}): Promise<ImportExerciseResolution> {
  const legacyToTargetExerciseId = new Map<string, string>();
  const userOwnedExercises = args.snapshot.exercises.filter(
    (exercise) => exercise.owner_scope === "user",
  );
  const globalExercises = args.snapshot.exercises.filter(
    (exercise) => exercise.owner_scope === "global",
  );

  if (userOwnedExercises.length > 0) {
    const rows = userOwnedExercises.map((exercise) => ({
      id: exercise.legacy_exercise_id,
      name: exercise.name,
      user_id: args.newUserId,
      is_global: false,
      primary_muscle: exercise.primary_muscle,
      primary_muscles: exercise.primary_muscles,
      secondary_muscles: exercise.secondary_muscles,
      equipment: exercise.equipment,
      movement_pattern: exercise.movement_pattern,
      measurement_type: exercise.measurement_type ?? "reps",
      default_unit: exercise.default_unit,
      calories_estimation_method: exercise.calories_estimation_method,
      how_to_short: exercise.how_to_short,
      image_howto_path: exercise.image_howto_path,
      image_muscles_path: exercise.image_muscles_path,
      created_at: exercise.created_at ?? new Date().toISOString(),
    }));

    const { error } = await args.admin
      .from("exercises")
      .upsert(rows, { onConflict: "id" });
    if (error) {
      throw new Error(`exercises: ${error.message}`);
    }

    for (const exercise of userOwnedExercises) {
      legacyToTargetExerciseId.set(
        exercise.legacy_exercise_id,
        exercise.legacy_exercise_id,
      );
    }
  }

  let resolvedGlobalExercises = 0;
  let createdGlobalExercises = 0;

  if (globalExercises.length > 0) {
    const candidateIds = Array.from(
      new Set(
        globalExercises.flatMap((exercise) => {
          const canonicalId = resolveCanonicalExerciseId(exercise.legacy_exercise_id);
          return canonicalId === exercise.legacy_exercise_id
            ? [exercise.legacy_exercise_id]
            : [exercise.legacy_exercise_id, canonicalId];
        }),
      ),
    );

    const { data: existingByIdRows, error: existingByIdError } = await args.admin
      .from("exercises")
      .select("id, name, user_id, is_global")
      .in("id", candidateIds);

    if (existingByIdError) {
      throw new Error(`exercises lookup: ${existingByIdError.message}`);
    }

    const existingById = new Map<string, JsonRecord>();
    const existingGlobalByNormalizedName = new Map<string, JsonRecord>();

    for (const row of (existingByIdRows ?? []) as JsonRecord[]) {
      const id = asString(row.id);
      const normalizedName = normalizeName(asString(row.name));
      const isGlobal = row.user_id === null || asBoolean(row.is_global);

      if (id) {
        existingById.set(id, row);
      }

      if (isGlobal && normalizedName) {
        existingGlobalByNormalizedName.set(normalizedName, row);
      }
    }

    for (const exercise of globalExercises) {
      const canonicalId = resolveCanonicalExerciseId(exercise.legacy_exercise_id);
      const normalizedName = exercise.normalized_name || normalizeName(exercise.name);
      const existingMatch =
        existingById.get(canonicalId)
        ?? existingById.get(exercise.legacy_exercise_id)
        ?? existingGlobalByNormalizedName.get(normalizedName);

      if (existingMatch) {
        const existingId = asString(existingMatch.id);
        if (!existingId) {
          throw new Error(`Existing global exercise for ${exercise.name} is missing an id.`);
        }

        legacyToTargetExerciseId.set(exercise.legacy_exercise_id, existingId);
        resolvedGlobalExercises += 1;
        continue;
      }

      const insertId =
        exercise.legacy_exercise_id === canonicalId
          ? exercise.legacy_exercise_id
          : canonicalId;

      const { error } = await args.admin
        .from("exercises")
        .upsert(
          {
            id: insertId,
            name: exercise.name,
            user_id: null,
            is_global: true,
            primary_muscle: exercise.primary_muscle,
            primary_muscles: exercise.primary_muscles,
            secondary_muscles: exercise.secondary_muscles,
            equipment: exercise.equipment,
            movement_pattern: exercise.movement_pattern,
            measurement_type: exercise.measurement_type ?? "reps",
            default_unit: exercise.default_unit,
            calories_estimation_method: exercise.calories_estimation_method,
            how_to_short: exercise.how_to_short,
            image_howto_path: exercise.image_howto_path,
            image_muscles_path: exercise.image_muscles_path,
            created_at: exercise.created_at ?? new Date().toISOString(),
          },
          { onConflict: "id" },
        );

      if (error) {
        throw new Error(`exercises: ${error.message}`);
      }

      legacyToTargetExerciseId.set(exercise.legacy_exercise_id, insertId);
      createdGlobalExercises += 1;
    }
  }

  return {
    legacyToTargetExerciseId,
    resolvedGlobalExercises,
    createdGlobalExercises,
    importedUserOwnedExercises: userOwnedExercises.length,
  };
}

export async function importFitnessLegacySnapshot(args: {
  admin: SupabaseLikeClient;
  newUserId: string;
  snapshot: FitnessLegacySnapshot;
  allowMerge?: boolean;
}): Promise<FitnessLegacyImportSummary> {
  if (!args.allowMerge) {
    const conflicts = await getFitnessLegacyImportConflicts({
      admin: args.admin,
      newUserId: args.newUserId,
      snapshot: args.snapshot,
    });

    if (hasImportConflicts(conflicts)) {
      throw new Error(
        "Current account already has user-owned data outside this snapshot. Import into a blank account or rerun with merge enabled.",
      );
    }
  }

  const exerciseResolution = await resolveExerciseImports(args);
  const legacyToTargetExerciseId = exerciseResolution.legacyToTargetExerciseId;
  const profile = args.snapshot.profile;
  const fallbackWeightUnit = profile?.preferred_weight_unit ?? "lbs";

  if (args.snapshot.routines.length > 0) {
    const { error } = await args.admin
      .from("routines")
      .upsert(
        args.snapshot.routines.map((routine) => ({
          id: routine.legacy_routine_id,
          user_id: args.newUserId,
          name: routine.name,
          cycle_length_days: routine.cycle_length_days,
          start_date: routine.start_date,
          timezone: routine.timezone,
          progression_mode: routine.progression_mode ?? "progressive_overload",
          temperament: routine.temperament ?? "moderate",
          weight_unit: routine.weight_unit ?? fallbackWeightUnit,
          created_at: routine.created_at ?? new Date().toISOString(),
          updated_at: routine.updated_at ?? new Date().toISOString(),
        })),
        { onConflict: "id" },
      );

    if (error) {
      throw new Error(`routines: ${error.message}`);
    }
  }

  if (args.snapshot.routine_days.length > 0) {
    const { error } = await args.admin
      .from("routine_days")
      .upsert(
        args.snapshot.routine_days.map((day) => ({
          id: day.legacy_routine_day_id,
          user_id: args.newUserId,
          routine_id: day.legacy_routine_id,
          day_index: day.day_index,
          name: day.name,
          is_rest: day.is_rest,
          notes: day.notes,
          created_at: day.created_at ?? new Date().toISOString(),
        })),
        { onConflict: "id" },
      );

    if (error) {
      throw new Error(`routine_days: ${error.message}`);
    }
  }

  if (args.snapshot.routine_day_exercises.length > 0) {
    const { error } = await args.admin
      .from("routine_day_exercises")
      .upsert(
        args.snapshot.routine_day_exercises.map((exercise) => {
          const exerciseId = legacyToTargetExerciseId.get(exercise.legacy_exercise_id);
          if (!exerciseId) {
            throw new Error(
              `Missing imported exercise mapping for routine-day exercise ${exercise.legacy_routine_day_exercise_id}.`,
            );
          }

          return {
            id: exercise.legacy_routine_day_exercise_id,
            user_id: args.newUserId,
            routine_day_id: exercise.legacy_routine_day_id,
            exercise_id: exerciseId,
            position: exercise.position,
            target_sets: exercise.target_sets,
            target_reps: exercise.target_reps,
            target_reps_min: exercise.target_reps_min,
            target_reps_max: exercise.target_reps_max,
            target_weight: exercise.target_weight,
            target_weight_unit: exercise.target_weight_unit,
            target_duration_seconds: exercise.target_duration_seconds,
            target_distance: exercise.target_distance,
            target_distance_unit: exercise.target_distance_unit,
            target_calories: exercise.target_calories,
            measurement_type: exercise.measurement_type ?? "reps",
            default_unit: exercise.default_unit,
            notes: exercise.notes,
            created_at: exercise.created_at ?? new Date().toISOString(),
          };
        }),
        { onConflict: "id" },
      );

    if (error) {
      throw new Error(`routine_day_exercises: ${error.message}`);
    }
  }

  if (args.snapshot.sessions.length > 0) {
    const { error } = await args.admin
      .from("sessions")
      .upsert(
        args.snapshot.sessions.map((session) => ({
          id: session.legacy_session_id,
          user_id: args.newUserId,
          routine_id: session.legacy_routine_id,
          performed_at: session.performed_at,
          routine_day_index: session.routine_day_index,
          name: session.name,
          routine_day_name: session.routine_day_name,
          day_name_override: session.day_name_override,
          duration_seconds: session.duration_seconds,
          status: session.status,
          notes: session.notes,
        })),
        { onConflict: "id" },
      );

    if (error) {
      throw new Error(`sessions: ${error.message}`);
    }
  }

  if (args.snapshot.session_exercises.length > 0) {
    const { error } = await args.admin
      .from("session_exercises")
      .upsert(
        args.snapshot.session_exercises.map((exercise) => {
          const exerciseId = legacyToTargetExerciseId.get(exercise.legacy_exercise_id);
          if (!exerciseId) {
            throw new Error(
              `Missing imported exercise mapping for session exercise ${exercise.legacy_session_exercise_id}.`,
            );
          }

          return {
            id: exercise.legacy_session_exercise_id,
            session_id: exercise.legacy_session_id,
            user_id: args.newUserId,
            exercise_id: exerciseId,
            routine_day_exercise_id: exercise.legacy_routine_day_exercise_id,
            position: exercise.position,
            performed_index: exercise.performed_index,
            is_skipped: exercise.is_skipped,
            notes: exercise.notes,
            measurement_type: exercise.measurement_type ?? "reps",
            default_unit: exercise.default_unit,
            target_reps: exercise.target_reps,
            target_reps_min: exercise.target_reps_min,
            target_reps_max: exercise.target_reps_max,
            target_sets_min: exercise.target_sets_min,
            target_sets_max: exercise.target_sets_max,
            target_weight: exercise.target_weight,
            target_weight_min: exercise.target_weight_min,
            target_weight_max: exercise.target_weight_max,
            target_weight_unit: exercise.target_weight_unit,
            target_duration_seconds: exercise.target_duration_seconds,
            target_time_seconds_min: exercise.target_time_seconds_min,
            target_time_seconds_max: exercise.target_time_seconds_max,
            target_distance: exercise.target_distance,
            target_distance_min: exercise.target_distance_min,
            target_distance_max: exercise.target_distance_max,
            target_distance_unit: exercise.target_distance_unit,
            target_calories: exercise.target_calories,
            target_calories_min: exercise.target_calories_min,
            target_calories_max: exercise.target_calories_max,
          };
        }),
        { onConflict: "id" },
      );

    if (error) {
      throw new Error(`session_exercises: ${error.message}`);
    }
  }

  if (args.snapshot.sets.length > 0) {
    const { error } = await args.admin
      .from("sets")
      .upsert(
        args.snapshot.sets.map((set) => ({
          id: set.legacy_set_id,
          client_log_id: set.client_log_id,
          session_exercise_id: set.legacy_session_exercise_id,
          user_id: args.newUserId,
          set_index: set.set_index,
          weight: set.weight,
          weight_unit: set.weight_unit,
          reps: set.reps,
          duration_seconds: set.duration_seconds,
          distance: set.distance,
          distance_unit: set.distance_unit,
          calories: set.calories,
          rpe: set.rpe,
          is_warmup: set.is_warmup,
          notes: set.notes,
        })),
        { onConflict: "id" },
      );

    if (error) {
      throw new Error(`sets: ${error.message}`);
    }
  }

  const activeRoutineId =
    profile?.active_routine_legacy_id
    && args.snapshot.routines.some(
      (routine) => routine.legacy_routine_id === profile.active_routine_legacy_id,
    )
      ? profile.active_routine_legacy_id
      : null;

  const { error: profileError } = await args.admin
    .from("profiles")
    .upsert(
      {
        id: args.newUserId,
        timezone: profile?.timezone ?? "America/Toronto",
        active_routine_id: activeRoutineId,
        preferred_weight_unit: profile?.preferred_weight_unit ?? fallbackWeightUnit,
        preferred_distance_unit: profile?.preferred_distance_unit ?? "mi",
      },
      { onConflict: "id" },
    );

  if (profileError) {
    throw new Error(`profiles: ${profileError.message}`);
  }

  return {
    legacyUserId: args.snapshot.identity.legacy_user_id,
    newUserId: args.newUserId,
    importedCounts: getFitnessLegacySnapshotSignoffCounts(args.snapshot),
    resolvedGlobalExercises: exerciseResolution.resolvedGlobalExercises,
    createdGlobalExercises: exerciseResolution.createdGlobalExercises,
    importedUserOwnedExercises: exerciseResolution.importedUserOwnedExercises,
    affectedExerciseIds: Array.from(
      new Set(
        args.snapshot.session_exercises
          .map((exercise) =>
            legacyToTargetExerciseId.get(exercise.legacy_exercise_id) ?? null,
          )
          .filter((exerciseId): exerciseId is string => Boolean(exerciseId)),
      ),
    ),
  };
}
