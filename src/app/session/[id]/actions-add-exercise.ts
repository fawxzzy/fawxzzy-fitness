"use server";

import { requireUser } from "@/lib/auth";
import { buildCustomExerciseInsertPayload } from "@/lib/custom-exercise-payload";
import { validateExerciseEquipment, validateExerciseName, validateMovementPattern } from "@/lib/exercises";
import { supabaseServer } from "@/lib/supabase/server";
import { isMissingProgressionPlaybookColumnError, omitProgressionPlaybookColumns } from "@/lib/progression-schema-compat";
import { resolveCanonicalExercise } from "@/lib/exercise-resolution";
import { defaultUnitForSessionExerciseMeasurementType, resolveSessionExerciseMeasurementType, warnOnSessionExerciseUnitMismatch } from "@/lib/session-exercise-measurement";
import type { ActionResult } from "@/lib/action-result";
import { guardLiveSessionMutation } from "@/lib/session-live-mutation";
import { insertSessionExerciseAtEnd } from "@/lib/ordered-position-insert";
import { SHOULD_DEBUG_CANONICAL_LINKING, createLiveSessionMutationRepository, hasSelectedProgressionPlaybook, isMissingExerciseTimerColumnError, parseExerciseTimerConfig, parseSessionExercisePayload } from "./actions-shared";

export async function quickAddExerciseAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await supabaseServer();

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
    return { ok: false, error: "Could not prepare this exercise for the session." };
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
    return { ok: false, error: "Could not add this exercise to the session." };
  }

  if (SHOULD_DEBUG_CANONICAL_LINKING) {
    console.log("[session-linking] inserted-session-exercise", {
      sessionExerciseId: insertedExercise.id,
      exerciseId: insertedExercise.exercise_id,
      exerciseName: resolvedExercise.name,
      exerciseSlug: resolvedExercise.slug,
    });
  }

  return { ok: true };
}

export async function addExerciseAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await supabaseServer();

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
  const timerConfig = parseExerciseTimerConfig(formData);
  if (!timerConfig.ok) {
    return { ok: false, error: timerConfig.error };
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
        secondaryMuscle: null,
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
    return { ok: false, error: "Could not prepare this exercise for the session." };
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
      ...timerConfig.values,
      measurement_type: measurementType,
      default_unit: defaultUnit,
    },
    select: "id, exercise_id",
  });

  if (error && isMissingExerciseTimerColumnError(error)) {
    if (timerConfig.values.exercise_timer_enabled) {
      return { ok: false, error: "Exercise timer schema is pending migration review." };
    }
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
        ...mappedGoalColumns,
        measurement_type: measurementType,
        default_unit: defaultUnit,
      },
      select: "id, exercise_id",
    });
    insertedExercise = fallback.data;
    error = fallback.error;
  }

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
        ...timerConfig.values,
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
    return { ok: false, error: "Could not add this exercise to the session." };
  }

  if (SHOULD_DEBUG_CANONICAL_LINKING) {
    console.log("[session-linking] inserted-session-exercise", {
      sessionExerciseId: insertedExercise.id,
      exerciseId: insertedExercise.exercise_id,
      exerciseName: resolvedExerciseName,
      exerciseSlug: resolvedExerciseSlug,
    });
  }

  return { ok: true };
}
