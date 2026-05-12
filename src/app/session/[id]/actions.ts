"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getExerciseIdsForSession } from "@/lib/exercise-stats";
import { buildCustomExerciseInsertPayload } from "@/lib/custom-exercise-payload";
import { validateExerciseEquipment, validateExerciseName, validateMovementPattern } from "@/lib/exercises";
import { supabaseServer } from "@/lib/supabase/server";
import { getRoutineEditPath, revalidateHistoryViews, revalidateRoutinesViews, revalidateSessionViews } from "@/lib/revalidation";
import { mapExerciseGoalPayloadToSessionColumns, parseExerciseGoalPayload } from "@/lib/exercise-goal-payload";
import { parseProgressionPlaybookPayload } from "@/lib/progression-playbooks";
import { getSchemaMismatchMessage, isMissingProgressionPlaybookColumnError, omitProgressionPlaybookColumns } from "@/lib/progression-schema-compat";
import { resolveCanonicalExercise } from "@/lib/exercise-resolution";
import { defaultUnitForSessionExerciseMeasurementType, resolveSessionExerciseMeasurementType, warnOnSessionExerciseUnitMismatch } from "@/lib/session-exercise-measurement";
import type { ActionResult } from "@/lib/action-result";
import type { SetRow } from "@/types/db";
import { guardLiveSessionMutation } from "@/lib/session-live-mutation";
import { insertSessionExerciseAtEnd } from "@/lib/ordered-position-insert";
import { processSessionFollowUpJobs } from "@/lib/session-follow-up-jobs";

const SHOULD_DEBUG_CANONICAL_LINKING = process.env.NODE_ENV === "development";

function createLiveSessionMutationRepository(supabase: ReturnType<typeof supabaseServer>) {
  return {
    async readSession(sessionId: string) {
      const { data } = await supabase
        .from("sessions")
        .select("id, user_id, status")
        .eq("id", sessionId)
        .maybeSingle();

      return data
        ? {
            id: data.id,
            userId: data.user_id,
            status: data.status,
          }
        : null;
    },
    async readSessionExercise(sessionExerciseId: string) {
      const { data } = await supabase
        .from("session_exercises")
        .select("id, session_id, user_id")
        .eq("id", sessionExerciseId)
        .maybeSingle();

      return data
        ? {
            id: data.id,
            sessionId: data.session_id,
            userId: data.user_id,
          }
        : null;
    },
  };
}

async function ensurePerformedIndex(payload: {
  sessionId: string;
  sessionExerciseId: string;
  userId: string;
  supabase: ReturnType<typeof supabaseServer>;
}): Promise<void> {
  const { sessionId, sessionExerciseId, userId, supabase } = payload;

  const { data: exerciseRow, error: sessionExerciseError } = await supabase
    .from("session_exercises")
    .select("id, performed_index")
    .eq("id", sessionExerciseId)
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionExerciseError || !exerciseRow || exerciseRow.performed_index !== null) {
    return;
  }

  const { data: latestPerformedExercise } = await supabase
    .from("session_exercises")
    .select("performed_index")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .not("performed_index", "is", null)
    .order("performed_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPerformedIndex = typeof latestPerformedExercise?.performed_index === "number"
    ? latestPerformedExercise.performed_index + 1
    : 0;

  await supabase
    .from("session_exercises")
    .update({ performed_index: nextPerformedIndex })
    .eq("id", sessionExerciseId)
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .is("performed_index", null);
}

function hasSelectedProgressionPlaybook(payload: Record<string, unknown>) {
  return typeof payload.progression_playbook_id === "string" && payload.progression_playbook_id.length > 0;
}

function parseSessionExercisePayload(formData: FormData) {
  const parsed = parseExerciseGoalPayload(formData, { requireSets: true });
  if (!parsed.ok) {
    return parsed;
  }

  const progression = parseProgressionPlaybookPayload(formData);
  if (!progression.ok) {
    return progression;
  }

  return {
    ok: true as const,
    payload: {
      ...mapExerciseGoalPayloadToSessionColumns(parsed.payload),
      progression_playbook_id: progression.playbookId,
      progression_playbook_config: progression.config,
    },
  };
}

export async function addSetAction(payload: {
  sessionId: string;
  sessionExerciseId: string;
  weight: number;
  reps: number;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: "mi" | "km" | "m" | null;
  calories: number | null;
  isWarmup: boolean;
  rpe: number | null;
  notes: string | null;
  weightUnit: "lbs" | "kg";
  clientLogId?: string;
}) : Promise<ActionResult<{ set: SetRow }>> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { sessionId, sessionExerciseId, weight, reps, durationSeconds, distance, distanceUnit, calories, isWarmup, rpe, notes, weightUnit, clientLogId } = payload;

  if (!sessionId || !sessionExerciseId) {
    return { ok: false, error: "Missing session info" };
  }

  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight < 0 || reps < 0) {
    return { ok: false, error: "Weight and reps must be 0 or greater" };
  }

  if (weightUnit !== "lbs" && weightUnit !== "kg") {
    return { ok: false, error: "Weight unit must be lbs or kg" };
  }

  if (durationSeconds !== null && (!Number.isInteger(durationSeconds) || durationSeconds < 0)) {
    return { ok: false, error: "Time must be an integer in seconds" };
  }

  if (distance !== null && (!Number.isFinite(distance) || distance < 0)) {
    return { ok: false, error: "Distance must be 0 or greater" };
  }

  if (distanceUnit !== null && distanceUnit !== "mi" && distanceUnit !== "km" && distanceUnit !== "m") {
    return { ok: false, error: "Distance unit must be mi, km, or m" };
  }

  if (calories !== null && (!Number.isFinite(calories) || calories < 0)) {
    return { ok: false, error: "Calories must be 0 or greater" };
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
    sessionExerciseId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  if (clientLogId) {
    const { data: existingByClientLogId, error: existingByClientLogIdError } = await supabase
      .from("sets")
      .select("id, client_log_id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
      .eq("session_exercise_id", sessionExerciseId)
      .eq("user_id", user.id)
      .eq("client_log_id", clientLogId)
      .limit(1)
      .maybeSingle();

    if (!existingByClientLogIdError && existingByClientLogId) {
      await ensurePerformedIndex({
        sessionId,
        sessionExerciseId,
        userId: user.id,
        supabase,
      });
      revalidateSessionViews(sessionId);
      return { ok: true, data: { set: existingByClientLogId as SetRow } };
    }
  }

  // Append semantics are based on MAX(set_index) + 1 instead of count-based indexing.
  // A unique DB constraint plus retry-on-conflict prevents duplicate indexes when offline
  // actions reconnect and flush concurrently for the same session exercise.
  const MAX_SET_INDEX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_SET_INDEX_RETRIES; attempt += 1) {
    const { data: latestSet, error: latestSetError } = await supabase
      .from("sets")
      .select("set_index")
      .eq("session_exercise_id", sessionExerciseId)
      .eq("user_id", user.id)
      .order("set_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestSetError) {
      return { ok: false, error: latestSetError.message };
    }

    const nextSetIndex = latestSet ? latestSet.set_index + 1 : 0;

    const insertPayload = {
      session_exercise_id: sessionExerciseId,
      user_id: user.id,
      set_index: nextSetIndex,
      weight,
      reps,
      duration_seconds: durationSeconds,
      distance,
      distance_unit: distanceUnit,
      calories,
      is_warmup: isWarmup,
      rpe,
      notes,
      weight_unit: weightUnit,
    } as Record<string, unknown>;

    if (clientLogId) {
      insertPayload.client_log_id = clientLogId;
    }

    const { data: insertedSet, error } = await supabase
      .from("sets")
      .insert(insertPayload)
      .select("id, client_log_id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
      .single();

    if (!error && insertedSet) {
      if (SHOULD_DEBUG_CANONICAL_LINKING) {
        console.log("[session-linking] inserted-set", {
          setId: insertedSet.id,
          sessionExerciseId,
          reps: insertedSet.reps,
          weight: insertedSet.weight,
        });
      }
      await ensurePerformedIndex({
        sessionId,
        sessionExerciseId,
        userId: user.id,
        supabase,
      });
      revalidateSessionViews(sessionId);
      return { ok: true, data: { set: insertedSet as SetRow } };
    }

    if (error?.code !== "23505") {
      return { ok: false, error: error?.message ?? "Could not log set" };
    }
  }

  return { ok: false, error: "Could not log set after retrying index allocation" };
}

export async function syncQueuedSetLogsAction(payload: {
  items: Array<{
    id: string;
    clientLogId: string;
    sessionId: string;
    sessionExerciseId: string;
    payload: {
      weight: number;
      reps: number;
      durationSeconds: number | null;
      distance: number | null;
      distanceUnit: "mi" | "km" | "m" | null;
      calories: number | null;
      isWarmup: boolean;
      rpe: number | null;
      notes: string | null;
      weightUnit: "lbs" | "kg";
    };
  }>;
}) : Promise<ActionResult<{ results: Array<{ queueItemId: string; ok: boolean; serverSetId?: string; error?: string }> }>> {
  const results = await Promise.all(
    payload.items.map(async (item) => {
      const insertResult = await addSetAction({
        sessionId: item.sessionId,
        sessionExerciseId: item.sessionExerciseId,
        weight: item.payload.weight,
        reps: item.payload.reps,
        durationSeconds: item.payload.durationSeconds,
        distance: item.payload.distance,
        distanceUnit: item.payload.distanceUnit,
        calories: item.payload.calories,
        isWarmup: item.payload.isWarmup,
        rpe: item.payload.rpe,
        notes: item.payload.notes,
        weightUnit: item.payload.weightUnit,
        clientLogId: item.clientLogId,
      });

      return {
        queueItemId: item.id,
        ok: insertResult.ok,
        serverSetId: insertResult.ok ? insertResult.data?.set.id : undefined,
        error: insertResult.ok ? undefined : insertResult.error,
      };
    }),
  );

  return { ok: true, data: { results } };
}

export async function deleteSetAction(payload: {
  sessionId: string;
  sessionExerciseId: string;
  setId: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = payload.sessionId.trim();
  const sessionExerciseId = payload.sessionExerciseId.trim();
  const setId = payload.setId.trim();

  if (!sessionId || !sessionExerciseId || !setId) {
    return { ok: false, error: "Missing set details" };
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
    sessionExerciseId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  const { error } = await supabase
    .from("sets")
    .delete()
    .eq("id", setId)
    .eq("session_exercise_id", sessionExerciseId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateSessionViews(sessionId);
  return { ok: true };
}

export async function toggleSkipAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "");
  const sessionExerciseId = String(formData.get("sessionExerciseId") ?? "");
  const nextSkipped = formData.get("nextSkipped") === "true";

  if (!sessionId || !sessionExerciseId) {
    return { ok: false, error: "Missing skip info" };
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
    sessionExerciseId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  const { error } = await supabase
    .from("session_exercises")
    .update({ is_skipped: nextSkipped })
    .eq("id", sessionExerciseId)
    .eq("user_id", user.id)
    .eq("session_id", sessionId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateSessionViews(sessionId);
  return { ok: true };
}


export async function quickAddExerciseAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const exerciseIdentifier = String(formData.get("exerciseId") ?? "").trim();
  const setCountValue = String(formData.get("setCount") ?? "").trim();

  if (!sessionId || !exerciseIdentifier) {
    return { ok: false, error: "Missing exercise info" };
  }

  if (setCountValue) {
    const parsedSetCount = Number.parseInt(setCountValue, 10);
    if (!Number.isInteger(parsedSetCount) || parsedSetCount < 1 || parsedSetCount > 50) {
      return { ok: false, error: "Set count must be between 1 and 50" };
    }
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  const resolvedExercise = await resolveCanonicalExercise({
    exerciseIdOrSlugOrName: exerciseIdentifier,
  });

  if (!resolvedExercise) {
    return { ok: false, error: "Exercise must map to a canonical exercise before logging." };
  }

  const canonicalExerciseId = resolvedExercise.id;
  if (!canonicalExerciseId) {
    throw new Error("Session exercise invariant failed: missing canonical exercise id.");
  }

  const measurementType = resolveSessionExerciseMeasurementType(resolvedExercise.measurementType);
  const defaultUnit = defaultUnitForSessionExerciseMeasurementType(measurementType);
  warnOnSessionExerciseUnitMismatch({ measurementType, defaultUnit, context: "addExerciseBySearchAction" });

  const { data: insertedExercise, error } = await insertSessionExerciseAtEnd<{ id: string; exercise_id: string }>({
    supabase,
    sessionId,
    userId: user.id,
    values: {
      session_id: sessionId,
      user_id: user.id,
      exercise_id: canonicalExerciseId,
      routine_day_exercise_id: null,
      is_skipped: false,
      measurement_type: measurementType,
      default_unit: defaultUnit,
    },
    select: "id, exercise_id",
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!insertedExercise?.exercise_id) {
    throw new Error("Session exercise invariant failed: persisted row missing exercise_id.");
  }

  if (SHOULD_DEBUG_CANONICAL_LINKING) {
    console.log("[session-linking] inserted-session-exercise", {
      sessionExerciseId: insertedExercise.id,
      exerciseId: insertedExercise.exercise_id,
      exerciseName: resolvedExercise.name,
      exerciseSlug: resolvedExercise.slug,
    });
  }

  revalidateSessionViews(sessionId);
  return { ok: true };
}

export async function addExerciseAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "");
  const selectedExerciseId = String(formData.get("exerciseId") ?? "").trim();
  const exerciseIdentifier = selectedExerciseId;
  const routineDayExerciseIdValue = String(formData.get("routineDayExerciseId") ?? "").trim();
  const routineDayExerciseId = routineDayExerciseIdValue || null;
  const isCustomExercise = String(formData.get("customExerciseMode") ?? "").trim() === "custom";

  if (!sessionId || (!exerciseIdentifier && !isCustomExercise)) {
    return { ok: false, error: "Missing exercise info" };
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  const parsedPayload = parseSessionExercisePayload(formData);
  if (!parsedPayload.ok) {
    return { ok: false, error: parsedPayload.error };
  }

  let canonicalExerciseId = selectedExerciseId;
  let resolvedExerciseMeasurementType: "reps" | "time" | "distance" | "time_distance" | "none" | null = null;
  let resolvedExerciseName: string | null = null;
  let resolvedExerciseSlug: string | null = null;

  if (isCustomExercise) {
    const rawName = String(formData.get("customExerciseName") ?? "");
    const rawEquipment = String(formData.get("customExerciseEquipment") ?? "");
    const primaryMuscle = String(formData.get("customExercisePrimaryMuscle") ?? "").trim() || null;
    const rawMovementPattern = String(formData.get("customExerciseMovementPattern") ?? "");

    let name: string;
    let equipment: string | null;
    let movementPattern: string | null;

    try {
      name = validateExerciseName(rawName);
      equipment = validateExerciseEquipment(rawEquipment);
      movementPattern = validateMovementPattern(rawMovementPattern);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not create custom exercise" };
    }

    const { data: duplicateExercise } = await supabase
      .from("exercises")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_global", false)
      .ilike("name", name)
      .maybeSingle();

    if (duplicateExercise) {
      return { ok: false, error: "You already have a custom exercise with this name." };
    }

    const customMeasurementType = parsedPayload.payload.measurement_type === "none"
      ? "reps"
      : parsedPayload.payload.measurement_type;

    const { data: createdExercise, error: customExerciseError } = await supabase
      .from("exercises")
      .insert(buildCustomExerciseInsertPayload({
        userId: user.id,
        name,
        primaryMuscle,
        equipment,
        movementPattern,
        measurementType: customMeasurementType,
        defaultUnit: parsedPayload.payload.default_unit,
      }))
      .select("id")
      .single();

    if (customExerciseError || !createdExercise) {
      return { ok: false, error: customExerciseError?.message ?? "Could not create custom exercise" };
    }

    canonicalExerciseId = createdExercise.id;
    resolvedExerciseMeasurementType = customMeasurementType;
    resolvedExerciseName = name;
  } else {
    const resolvedExercise = await resolveCanonicalExercise({
      exerciseIdOrSlugOrName: exerciseIdentifier,
    });

    if (!resolvedExercise) {
      return { ok: false, error: "Exercise must map to a canonical exercise before logging." };
    }

    canonicalExerciseId = resolvedExercise.id;
    resolvedExerciseMeasurementType = resolvedExercise.measurementType;
    resolvedExerciseName = resolvedExercise.name;
    resolvedExerciseSlug = resolvedExercise.slug;
  }

  if (!canonicalExerciseId) {
    throw new Error("Session exercise invariant failed: missing canonical exercise id.");
  }

  if (routineDayExerciseId) {
    const { data: session } = await supabase
      .from("sessions")
      .select("id, routine_id, routine_day_index")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!session?.routine_id || session.routine_day_index === null) {
      return { ok: false, error: "Invalid planned exercise link" };
    }

    const { data: routineDay } = await supabase
      .from("routine_days")
      .select("id")
      .eq("routine_id", session.routine_id)
      .eq("day_index", session.routine_day_index)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!routineDay) {
      return { ok: false, error: "Invalid planned exercise link" };
    }

    const { data: linkedExercise } = await supabase
      .from("routine_day_exercises")
      .select("id")
      .eq("id", routineDayExerciseId)
      .eq("routine_day_id", routineDay.id)
      .eq("user_id", user.id)
      .eq("exercise_id", canonicalExerciseId)
      .maybeSingle();

    if (!linkedExercise) {
      return { ok: false, error: "Invalid planned exercise link" };
    }
  }

  const mappedGoalColumns = parsedPayload.payload;
  const measurementType = resolveSessionExerciseMeasurementType(mappedGoalColumns.measurement_type ?? resolvedExerciseMeasurementType);
  const defaultUnit = defaultUnitForSessionExerciseMeasurementType(measurementType);
  warnOnSessionExerciseUnitMismatch({ measurementType, defaultUnit, context: "addExerciseAction" });

  let { data: insertedExercise, error } = await insertSessionExerciseAtEnd<{ id: string; exercise_id: string }>({
    supabase,
    sessionId,
    userId: user.id,
    values: {
      session_id: sessionId,
      user_id: user.id,
      exercise_id: canonicalExerciseId,
      routine_day_exercise_id: routineDayExerciseId,
      is_skipped: false,
      ...mappedGoalColumns,
      measurement_type: measurementType,
      default_unit: defaultUnit,
    },
    select: "id, exercise_id",
  });

  if (error && isMissingProgressionPlaybookColumnError(error) && !hasSelectedProgressionPlaybook(parsedPayload.payload)) {
    const fallback = await insertSessionExerciseAtEnd<{ id: string; exercise_id: string }>({
      supabase,
      sessionId,
      userId: user.id,
      values: {
        session_id: sessionId,
        user_id: user.id,
        exercise_id: canonicalExerciseId,
        routine_day_exercise_id: routineDayExerciseId,
        is_skipped: false,
        ...omitProgressionPlaybookColumns(mappedGoalColumns),
        measurement_type: measurementType,
        default_unit: defaultUnit,
      },
      select: "id, exercise_id",
    });
    insertedExercise = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!insertedExercise?.exercise_id) {
    throw new Error("Session exercise invariant failed: persisted row missing exercise_id.");
  }

  if (SHOULD_DEBUG_CANONICAL_LINKING) {
    console.log("[session-linking] inserted-session-exercise", {
      sessionExerciseId: insertedExercise.id,
      exerciseId: insertedExercise.exercise_id,
      exerciseName: resolvedExerciseName,
      exerciseSlug: resolvedExerciseSlug,
    });
  }

  revalidateSessionViews(sessionId);
  return { ok: true };
}

export async function removeExerciseAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "");
  const sessionExerciseId = String(formData.get("sessionExerciseId") ?? "");

  if (!sessionId || !sessionExerciseId) {
    return { ok: false, error: "Missing remove info" };
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
    sessionExerciseId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  const { error } = await supabase
    .from("session_exercises")
    .delete()
    .eq("id", sessionExerciseId)
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateSessionViews(sessionId);
  return { ok: true };
}


export async function discardSessionAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "").trim();

  if (!sessionId) {
    return { ok: false, error: "Missing session info" };
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  const { data: sessionExerciseRows, error: sessionExerciseReadError } = await supabase
    .from("session_exercises")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (sessionExerciseReadError) {
    return { ok: false, error: sessionExerciseReadError.message };
  }

  const sessionExerciseIds = (sessionExerciseRows ?? []).map((row) => row.id);

  if (sessionExerciseIds.length > 0) {
    const { error: setDeleteError } = await supabase
      .from("sets")
      .delete()
      .eq("user_id", user.id)
      .in("session_exercise_id", sessionExerciseIds);

    if (setDeleteError) {
      return { ok: false, error: setDeleteError.message };
    }

    const { error: sessionExerciseDeleteError } = await supabase
      .from("session_exercises")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", user.id);

    if (sessionExerciseDeleteError) {
      return { ok: false, error: sessionExerciseDeleteError.message };
    }
  }

  const { error: sessionDeleteError } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (sessionDeleteError) {
    return { ok: false, error: sessionDeleteError.message };
  }

  revalidatePath("/today");
  revalidateSessionViews(sessionId);
  return { ok: true };
}

export async function updateSessionExerciseProgressionAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const sessionExerciseId = String(formData.get("sessionExerciseId") ?? "").trim();
  const exerciseRowId = String(formData.get("exerciseRowId") ?? "").trim();

  if (!sessionId || !sessionExerciseId || !exerciseRowId) {
    return { ok: false, error: "Missing progression info" };
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
    sessionExerciseId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  const progression = parseProgressionPlaybookPayload(formData);
  if (!progression.ok) {
    return { ok: false, error: progression.error };
  }

  const payload = {
    progression_playbook_id: progression.playbookId,
    progression_playbook_config: progression.config,
  };

  const { data: sessionExerciseRow, error: sessionExerciseReadError } = await supabase
    .from("session_exercises")
    .select("routine_day_exercise_id")
    .eq("id", sessionExerciseId)
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessionExerciseReadError || !sessionExerciseRow || sessionExerciseRow.routine_day_exercise_id !== exerciseRowId) {
    return { ok: false, error: sessionExerciseReadError?.message ?? "Routine progression row not found" };
  }

  let { error } = await supabase
    .from("routine_day_exercises")
    .update(payload)
    .eq("id", exerciseRowId)
    .eq("user_id", user.id);

  if (error && isMissingProgressionPlaybookColumnError(error) && !hasSelectedProgressionPlaybook(payload)) {
    const fallback = await supabase
      .from("routine_day_exercises")
      .update(omitProgressionPlaybookColumns(payload))
      .eq("id", exerciseRowId)
      .eq("user_id", user.id);
    error = fallback.error;
  }

  if (error && isMissingProgressionPlaybookColumnError(error) && hasSelectedProgressionPlaybook(payload)) {
    return {
      ok: false,
      error: getSchemaMismatchMessage(error, {
        operation: "update session exercise progression",
        progressionMigration: "045",
      }) ?? "Progression schema is missing. Apply migration 045.",
    };
  }

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data: routineDayExerciseRow } = await supabase
    .from("routine_day_exercises")
    .select("routine_day_id")
    .eq("id", exerciseRowId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: routineDayRow } = routineDayExerciseRow?.routine_day_id
    ? await supabase
        .from("routine_days")
        .select("routine_id")
        .eq("id", routineDayExerciseRow.routine_day_id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  revalidateSessionViews(sessionId);
  revalidateRoutinesViews();
  if (routineDayRow?.routine_id) {
    revalidatePath(getRoutineEditPath(routineDayRow.routine_id));
  }

  return { ok: true };
}

export async function saveSessionAction(formData: FormData): Promise<ActionResult<{ sessionId: string }>> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "");
  const durationValue = String(formData.get("durationSeconds") ?? "").trim();
  const durationSeconds = durationValue ? Number(durationValue) : null;

  if (!sessionId) {
    return { ok: false, error: "Missing session info" };
  }

  if (durationSeconds !== null && (!Number.isInteger(durationSeconds) || durationSeconds < 0)) {
    return { ok: false, error: "Session time must be an integer in seconds" };
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  const { error } = await supabase
    .from("sessions")
    .update({ duration_seconds: durationSeconds, status: "completed" })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  const affectedExerciseIds = await getExerciseIdsForSession(user.id, sessionId);

  try {
    const followUp = await processSessionFollowUpJobs({
      sessionId,
      userId: user.id,
      durationSeconds,
      affectedExerciseIds,
    });

    if (followUp.hadFailures) {
      console.error("[session-follow-up] derived work failed after raw session save", {
        sessionId,
        userId: user.id,
        results: followUp.results,
      });
    }
  } catch (error) {
    console.error("[session-follow-up] unable to process derived work", {
      sessionId,
      userId: user.id,
      error: error instanceof Error ? error.message : "Unknown follow-up error",
    });
  }

  revalidatePath("/today");
  revalidateHistoryViews();
  return { ok: true, data: { sessionId } };
}
