import "server-only";

import { resolveCanonicalExerciseId } from "@/lib/exercise-id-aliases";
import {
  FITNESS_LEGACY_SNAPSHOT_VERSION,
  getFitnessLegacySnapshotSignoffCounts,
  type FitnessLegacyRoutineDayExerciseSnapshot,
  type FitnessLegacySessionExerciseSnapshot,
  type FitnessLegacySnapshot,
} from "@/lib/migration/fitness-legacy-contract";

export type { FitnessLegacySnapshot } from "@/lib/migration/fitness-legacy-contract";

type SupabaseLikeClient = any;
type JsonRecord = Record<string, unknown>;

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

type ImportableRoutineDayExercise = FitnessLegacyRoutineDayExerciseSnapshot & {
  importedExerciseId: string;
};

type ImportableSessionExercise = FitnessLegacySessionExerciseSnapshot & {
  importedExerciseId: string;
  importedRoutineDayExerciseId: string | null;
};

type ExistingExerciseLookupRow = {
  id: string | null;
  name: string | null;
  user_id: string | null;
  is_global?: boolean | null;
};

function normalizeName(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isGlobalExerciseRow(row: ExistingExerciseLookupRow | JsonRecord | null | undefined) {
  if (!row) {
    return false;
  }

  return row.user_id === null || asBoolean(row.is_global);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asBoolean(value: unknown) {
  return value === true;
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

async function deleteExistingUserRowsByIds(args: {
  admin: SupabaseLikeClient;
  table: string;
  userId: string;
  ids: string[];
}) {
  if (args.ids.length === 0) {
    return;
  }

  const { error } = await args.admin
    .from(args.table)
    .delete()
    .eq("user_id", args.userId)
    .in("id", args.ids);

  if (error) {
    throw new Error(`${args.table}: ${error.message}`);
  }
}

function normalizeOrderedGroupPositions<T>(args: {
  rows: T[];
  getGroupId: (row: T) => string;
  getPosition: (row: T) => number;
  withPosition: (row: T, position: number) => T;
}) {
  const nextPositionByGroup = new Map<string, number>();

  return args.rows.map((row) => {
    const groupId = args.getGroupId(row);
    const nextPosition = nextPositionByGroup.get(groupId) ?? 0;
    nextPositionByGroup.set(groupId, nextPosition + 1);

    return args.getPosition(row) === nextPosition
      ? row
      : args.withPosition(row, nextPosition);
  });
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

    const { data: existingGlobalRows, error: existingGlobalError } = await args.admin
      .from("exercises")
      .select("id, name, user_id, is_global")
      .or("user_id.is.null,is_global.eq.true");

    if (existingGlobalError) {
      throw new Error(`global exercises lookup: ${existingGlobalError.message}`);
    }

    const existingById = new Map<string, ExistingExerciseLookupRow>();
    const existingGlobalByNormalizedName = new Map<string, ExistingExerciseLookupRow>();

    for (const row of (existingByIdRows ?? []) as ExistingExerciseLookupRow[]) {
      const id = asString(row.id);
      const normalizedName = normalizeName(asString(row.name));

      if (id) {
        existingById.set(id, row);
      }
    }

    for (const row of (existingGlobalRows ?? []) as ExistingExerciseLookupRow[]) {
      const normalizedName = normalizeName(asString(row.name));
      if (isGlobalExerciseRow(row) && normalizedName) {
        existingGlobalByNormalizedName.set(normalizedName, row);
      }
    }

    for (const exercise of globalExercises) {
      const canonicalId = resolveCanonicalExerciseId(exercise.legacy_exercise_id);
      const normalizedName = exercise.normalized_name || normalizeName(exercise.name);
      const existingByCanonicalId = existingById.get(canonicalId);
      const existingByLegacyId = existingById.get(exercise.legacy_exercise_id);
      const existingByName = existingGlobalByNormalizedName.get(normalizedName);
      const existingMatch =
        (existingByCanonicalId && isGlobalExerciseRow(existingByCanonicalId)
          ? existingByCanonicalId
          : null)
        ?? (existingByLegacyId && isGlobalExerciseRow(existingByLegacyId)
          ? existingByLegacyId
          : null)
        ?? existingByName;

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
  const normalizedRoutineDayExercises = normalizeOrderedGroupPositions({
    rows: args.snapshot.routine_day_exercises,
    getGroupId: (exercise) => exercise.legacy_routine_day_id,
    getPosition: (exercise) => exercise.position,
    withPosition: (exercise, position) => ({
      ...exercise,
      position,
    }),
  });
  const normalizedSessionExercises = normalizeOrderedGroupPositions({
    rows: args.snapshot.session_exercises,
    getGroupId: (exercise) => exercise.legacy_session_id,
    getPosition: (exercise) => exercise.position,
    withPosition: (exercise, position) => ({
      ...exercise,
      position,
    }),
  });
  const importableRoutineIds = new Set(args.snapshot.routines.map((routine) => routine.legacy_routine_id));
  const importableRoutineDays = args.snapshot.routine_days.filter((day) =>
    importableRoutineIds.has(day.legacy_routine_id),
  );
  const importableRoutineDayIds = new Set(
    importableRoutineDays.map((day) => day.legacy_routine_day_id),
  );
  const importableRoutineDayExercises: ImportableRoutineDayExercise[] = normalizedRoutineDayExercises.flatMap((exercise) => {
    const importedExerciseId = legacyToTargetExerciseId.get(exercise.legacy_exercise_id);
    if (!importableRoutineDayIds.has(exercise.legacy_routine_day_id) || !importedExerciseId) {
      return [];
    }

    return [{
      ...exercise,
      importedExerciseId,
    }];
  });
  const importableRoutineDayExerciseIds = new Set(
    importableRoutineDayExercises.map((exercise) => exercise.legacy_routine_day_exercise_id),
  );
  const importableSessions = args.snapshot.sessions.map((session) => ({
    ...session,
    legacy_routine_id: session.legacy_routine_id && importableRoutineIds.has(session.legacy_routine_id)
      ? session.legacy_routine_id
      : null,
  }));
  const importableSessionIds = new Set(
    importableSessions.map((session) => session.legacy_session_id),
  );
  const importableSessionExercises: ImportableSessionExercise[] = normalizedSessionExercises.flatMap((exercise) => {
    const importedExerciseId = legacyToTargetExerciseId.get(exercise.legacy_exercise_id);
    if (!importableSessionIds.has(exercise.legacy_session_id) || !importedExerciseId) {
      return [];
    }

    return [{
      ...exercise,
      importedExerciseId,
      importedRoutineDayExerciseId:
        exercise.legacy_routine_day_exercise_id
        && importableRoutineDayExerciseIds.has(exercise.legacy_routine_day_exercise_id)
          ? exercise.legacy_routine_day_exercise_id
          : null,
    }];
  });
  const importableSessionExerciseIds = new Set(
    importableSessionExercises.map((exercise) => exercise.legacy_session_exercise_id),
  );
  const importableSets = args.snapshot.sets.filter((set) =>
    importableSessionExerciseIds.has(set.legacy_session_exercise_id),
  );
  const importedCounts = getFitnessLegacySnapshotSignoffCounts({
    ...args.snapshot,
    routine_days: importableRoutineDays,
    routine_day_exercises: importableRoutineDayExercises,
    sessions: importableSessions,
    session_exercises: importableSessionExercises,
    sets: importableSets,
  });

  if (args.allowMerge) {
    await deleteExistingUserRowsByIds({
      admin: args.admin,
      table: "sets",
      userId: args.newUserId,
      ids: args.snapshot.sets.map((set) => set.legacy_set_id),
    });
    await deleteExistingUserRowsByIds({
      admin: args.admin,
      table: "session_exercises",
      userId: args.newUserId,
      ids: normalizedSessionExercises.map((exercise) => exercise.legacy_session_exercise_id),
    });
    await deleteExistingUserRowsByIds({
      admin: args.admin,
      table: "routine_day_exercises",
      userId: args.newUserId,
      ids: normalizedRoutineDayExercises.map((exercise) => exercise.legacy_routine_day_exercise_id),
    });
  }

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

  if (importableRoutineDays.length > 0) {
    const { error } = await args.admin
      .from("routine_days")
      .upsert(
        importableRoutineDays.map((day) => ({
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

  if (importableRoutineDayExercises.length > 0) {
    const { error } = await args.admin
      .from("routine_day_exercises")
      .upsert(
        importableRoutineDayExercises.map((exercise) => ({
            id: exercise.legacy_routine_day_exercise_id,
            user_id: args.newUserId,
            routine_day_id: exercise.legacy_routine_day_id,
            exercise_id: exercise.importedExerciseId,
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
          })),
        { onConflict: "id" },
      );

    if (error) {
      throw new Error(`routine_day_exercises: ${error.message}`);
    }
  }

  if (importableSessions.length > 0) {
    const { error } = await args.admin
      .from("sessions")
      .upsert(
        importableSessions.map((session) => ({
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

  if (importableSessionExercises.length > 0) {
    const { error } = await args.admin
      .from("session_exercises")
      .upsert(
        importableSessionExercises.map((exercise) => ({
            id: exercise.legacy_session_exercise_id,
            session_id: exercise.legacy_session_id,
            user_id: args.newUserId,
            exercise_id: exercise.importedExerciseId,
            routine_day_exercise_id: exercise.importedRoutineDayExerciseId,
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
          })),
        { onConflict: "id" },
      );

    if (error) {
      throw new Error(`session_exercises: ${error.message}`);
    }
  }

  if (importableSets.length > 0) {
    const { error } = await args.admin
      .from("sets")
      .upsert(
        importableSets.map((set) => ({
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
    importedCounts,
    resolvedGlobalExercises: exerciseResolution.resolvedGlobalExercises,
    createdGlobalExercises: exerciseResolution.createdGlobalExercises,
    importedUserOwnedExercises: exerciseResolution.importedUserOwnedExercises,
    affectedExerciseIds: Array.from(
      new Set(
        importableSessionExercises
          .map((exercise) => exercise.importedExerciseId)
          .filter((exerciseId): exerciseId is string => Boolean(exerciseId)),
      ),
    ),
  };
}
