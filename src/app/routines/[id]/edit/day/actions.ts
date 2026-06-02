"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { validateExerciseEquipment, validateExerciseName, validateMovementPattern } from "@/lib/exercises";
import { buildCustomExerciseInsertPayload } from "@/lib/custom-exercise-payload";
import { supabaseServer } from "@/lib/supabase/server";
import { getRoutineEditPath, getTodayPath, revalidateRoutinesViews } from "@/lib/revalidation";
import { mapExerciseGoalPayloadToRoutineDayColumns, parseExerciseGoalPayload } from "@/lib/exercise-goal-payload";
import { insertRoutineDayExerciseAtEnd } from "@/lib/ordered-position-insert";
import { parseProgressionPlaybookPayload } from "@/lib/progression-playbooks";
import { buildProgressionReviewTargetPlan } from "@/lib/progression-review-loader";
import { buildProgressionPlaybookConfigFromFormState, createProgressionPlaybookFormState } from "@/lib/progression-playbook-form-state";
import { getSchemaMismatchMessage, isMissingProgressionPlaybookColumnError, isMissingRoutineDefaultProgressionColumnError, omitProgressionPlaybookColumns } from "@/lib/progression-schema-compat";
import { isSetFlowDirection, type SetFlowDirection } from "@/lib/set-flow-directions";
import {
  buildProgressionEventPayload,
  recordProgressionEvent,
  targetsDiffer,
} from "@/lib/progression-events";
import type { RoutineDayExerciseRow } from "@/types/db";

function revalidateRoutineEditPaths(routineId: string, dayId: string) {
  revalidatePath(getRoutineEditPath(routineId));
  revalidatePath(getTodayPath());
}


function parseRoutineExercisePayload(formData: FormData) {
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
      ...mapExerciseGoalPayloadToRoutineDayColumns(parsed.payload),
      progression_playbook_id: progression.playbookId,
      progression_playbook_config: progression.config,
    },
  };
}

function selectedProgressionPlaybook(payload: Record<string, unknown>) {
  return typeof payload.progression_playbook_id === "string" && payload.progression_playbook_id.length > 0;
}

const ROUTINE_DAY_EXERCISE_PROGRESS_EVENT_SELECT = "id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config";
const ROUTINE_DAY_EXERCISE_PROGRESSION_CONFIG_SELECT = "id, progression_playbook_id, progression_playbook_config";

function buildConfigWithUpdatedDayAdjustment(args: {
  playbookId: string | null | undefined;
  config: Record<string, unknown> | null | undefined;
  dayIndex: number;
  cycleLengthDays: number;
  direction: SetFlowDirection;
}) {
  if (!args.playbookId || args.dayIndex < 1) {
    return null;
  }

  const state = createProgressionPlaybookFormState({
    playbookId: args.playbookId,
    config: args.config ?? null,
  });

  if (!state.progressionPlaybookId) {
    return null;
  }

  const totalDays = Math.max(
    1,
    args.dayIndex,
    args.cycleLengthDays,
    state.progressionEffortWaveDirections.length,
  );
  const nextDirections = Array.from(
    { length: totalDays },
    (_, index) => state.progressionEffortWaveDirections[index] ?? "straight",
  );
  nextDirections[args.dayIndex - 1] = args.direction;

  return buildProgressionPlaybookConfigFromFormState({
    ...state,
    progressionEffortWaveDirections: nextDirections,
  });
}

export async function updateRoutineDaySettingsAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const isRest = formData.get("isRest") === "on";
  const dayAdjustmentRaw = String(formData.get("dayAdjustmentDirection") ?? "").trim();
  const dayAdjustmentDirection = isSetFlowDirection(dayAdjustmentRaw) ? dayAdjustmentRaw : null;
  if (!routineId || !routineDayId) {
    return { ok: false, error: "Missing day info" };
  }

  const { data: existingDay, error: existingDayError } = await supabase
    .from("routine_days")
    .select("name, day_index")
    .eq("id", routineDayId)
    .eq("user_id", user.id)
    .eq("routine_id", routineId)
    .single();

  if (existingDayError || !existingDay) {
    return { ok: false, error: existingDayError?.message ?? "Routine day not found" };
  }

  const safeName = name.slice(0, 15) || String(existingDay.day_index);

  const { error } = await supabase
    .from("routine_days")
    .update({ name: safeName, is_rest: isRest })
    .eq("id", routineDayId)
    .eq("user_id", user.id)
    .eq("routine_id", routineId);

  if (error) {
    return { ok: false, error: error.message };
  }

  if (dayAdjustmentDirection) {
    const { data: routineWithProgression, error: routineWithProgressionError } = await supabase
      .from("routines")
      .select("id, cycle_length_days, default_progression_playbook_id, default_progression_playbook_config")
      .eq("id", routineId)
      .eq("user_id", user.id)
      .single();

    if (routineWithProgressionError && isMissingRoutineDefaultProgressionColumnError(routineWithProgressionError)) {
      return {
        ok: false,
        error: getSchemaMismatchMessage(routineWithProgressionError, {
          operation: "update routine day adjustment",
          progressionMigration: "046",
        }) ?? "Progression schema is missing. Apply migration 046.",
      };
    }

    if (routineWithProgressionError || !routineWithProgression) {
      return { ok: false, error: routineWithProgressionError?.message ?? "Routine not found" };
    }

    const routineConfig = buildConfigWithUpdatedDayAdjustment({
      playbookId: routineWithProgression.default_progression_playbook_id,
      config: routineWithProgression.default_progression_playbook_config,
      dayIndex: existingDay.day_index,
      cycleLengthDays: routineWithProgression.cycle_length_days ?? existingDay.day_index,
      direction: dayAdjustmentDirection,
    });

    if (routineConfig) {
      const { error: routineUpdateError } = await supabase
        .from("routines")
        .update({ default_progression_playbook_config: routineConfig })
        .eq("id", routineId)
        .eq("user_id", user.id);

      if (routineUpdateError) {
        return { ok: false, error: routineUpdateError.message };
      }
    }

    const { data: dayExerciseRows, error: dayExerciseRowsError } = await supabase
      .from("routine_day_exercises")
      .select(ROUTINE_DAY_EXERCISE_PROGRESSION_CONFIG_SELECT)
      .eq("routine_day_id", routineDayId)
      .eq("user_id", user.id);

    if (dayExerciseRowsError && isMissingProgressionPlaybookColumnError(dayExerciseRowsError)) {
      return {
        ok: false,
        error: getSchemaMismatchMessage(dayExerciseRowsError, {
          operation: "update routine day exercise day adjustment",
          progressionMigration: "045",
        }) ?? "Progression schema is missing. Apply migration 045.",
      };
    }

    if (dayExerciseRowsError) {
      return { ok: false, error: dayExerciseRowsError.message };
    }

    for (const row of dayExerciseRows ?? []) {
      const nextConfig = buildConfigWithUpdatedDayAdjustment({
        playbookId: row.progression_playbook_id,
        config: row.progression_playbook_config,
        dayIndex: existingDay.day_index,
        cycleLengthDays: routineWithProgression.cycle_length_days ?? existingDay.day_index,
        direction: dayAdjustmentDirection,
      });

      if (!nextConfig) {
        continue;
      }

      const { error: exerciseUpdateError } = await supabase
        .from("routine_day_exercises")
        .update({ progression_playbook_config: nextConfig })
        .eq("id", row.id)
        .eq("routine_day_id", routineDayId)
        .eq("user_id", user.id);

      if (exerciseUpdateError) {
        return { ok: false, error: exerciseUpdateError.message };
      }
    }
  }

  revalidateRoutinesViews();
  return { ok: true };
}

export async function addRoutineDayExerciseAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const selectedExerciseId = String(formData.get("exerciseId") ?? "").trim();
  const isCustomExercise = String(formData.get("customExerciseMode") ?? "").trim() === "custom";

  if (!routineId || !routineDayId || (!selectedExerciseId && !isCustomExercise)) {
    return { ok: false, error: "Missing exercise info" };
  }

  const parsedPayload = parseRoutineExercisePayload(formData);
  if (!parsedPayload.ok) {
    return { ok: false, error: parsedPayload.error };
  }

  let exerciseId = selectedExerciseId;
  let createdCustomExerciseId: string | null = null;

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

    const { data: createdExercise, error: customExerciseError } = await supabase
      .from("exercises")
      .insert(buildCustomExerciseInsertPayload({
        userId: user.id,
        name,
        primaryMuscle,
        equipment,
        movementPattern,
        measurementType: parsedPayload.payload.measurement_type,
        defaultUnit: parsedPayload.payload.default_unit,
      }))
      .select("id")
      .single();

    if (customExerciseError || !createdExercise) {
      return { ok: false, error: customExerciseError?.message ?? "Could not create custom exercise" };
    }

    exerciseId = createdExercise.id;
    createdCustomExerciseId = createdExercise.id;
  }

  // Manual QA checklist:
  // - Create strength routine -> add reps + weight -> measurement_type = 'reps'
  // - Create cardio routine -> add time only -> measurement_type = 'time'
  // - Add time + distance -> measurement_type = 'time_distance'
  // - Create Open workout (Sets only) -> measurement_type defaults to 'reps'
  // - Ensure distance unit defaults to 'mi'
  const insertPayload = {
    user_id: user.id,
    routine_day_id: routineDayId,
    exercise_id: exerciseId,
    ...parsedPayload.payload,
  };
  let { error } = await insertRoutineDayExerciseAtEnd({
    supabase,
    routineDayId,
    userId: user.id,
    values: insertPayload,
  });

  if (error && isMissingProgressionPlaybookColumnError(error) && !selectedProgressionPlaybook(parsedPayload.payload)) {
    const fallback = await insertRoutineDayExerciseAtEnd({
      supabase,
      routineDayId,
      userId: user.id,
      values: omitProgressionPlaybookColumns(insertPayload),
    });
    error = fallback.error;
  }

  if (error && isMissingProgressionPlaybookColumnError(error) && selectedProgressionPlaybook(parsedPayload.payload)) {
    return {
      ok: false,
      error: getSchemaMismatchMessage(error, {
        operation: "add routine day exercise progression",
        progressionMigration: "045",
      }) ?? "Progression schema is missing. Apply migration 045.",
    };
  }

  if (error) {
    if (createdCustomExerciseId) {
      await supabase
        .from("exercises")
        .delete()
        .eq("id", createdCustomExerciseId)
        .eq("user_id", user.id)
        .eq("is_global", false);
    }
    return { ok: false, error: error.message };
  }

  revalidateRoutinesViews();
  return { ok: true };
}

export async function updateRoutineDayExerciseAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const exerciseRowId = String(formData.get("exerciseRowId") ?? "");

  if (!routineId || !routineDayId || !exerciseRowId) {
    return { ok: false, error: "Missing exercise info" };
  }

  const parsedPayload = parseRoutineExercisePayload(formData);
  if (!parsedPayload.ok) {
    return { ok: false, error: parsedPayload.error };
  }

  const { data: existingExerciseRow, error: existingExerciseError } = await supabase
    .from("routine_day_exercises")
    .select(ROUTINE_DAY_EXERCISE_PROGRESS_EVENT_SELECT)
    .eq("id", exerciseRowId)
    .eq("routine_day_id", routineDayId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingExerciseError || !existingExerciseRow) {
    return { ok: false, error: existingExerciseError?.message ?? "Routine exercise not found" };
  }

  const existingExercise = existingExerciseRow as RoutineDayExerciseRow;
  const previousTarget = buildProgressionReviewTargetPlan(existingExercise);
  const updatedExercise = {
    ...existingExercise,
    ...parsedPayload.payload,
  } as RoutineDayExerciseRow;
  const nextTarget = buildProgressionReviewTargetPlan(updatedExercise);

  let { error } = await supabase
    .from("routine_day_exercises")
    .update(parsedPayload.payload)
    .eq("id", exerciseRowId)
    .eq("routine_day_id", routineDayId)
    .eq("user_id", user.id);

  if (error && isMissingProgressionPlaybookColumnError(error) && !selectedProgressionPlaybook(parsedPayload.payload)) {
    const fallback = await supabase
      .from("routine_day_exercises")
      .update(omitProgressionPlaybookColumns(parsedPayload.payload))
      .eq("id", exerciseRowId)
      .eq("routine_day_id", routineDayId)
      .eq("user_id", user.id);
    error = fallback.error;
  }

  if (error && isMissingProgressionPlaybookColumnError(error) && selectedProgressionPlaybook(parsedPayload.payload)) {
    return {
      ok: false,
      error: getSchemaMismatchMessage(error, {
        operation: "update routine day exercise progression",
        progressionMigration: "045",
      }) ?? "Progression schema is missing. Apply migration 045.",
    };
  }

  if (error) {
    return { ok: false, error: error.message };
  }

  if (targetsDiffer(previousTarget, nextTarget)) {
    await recordProgressionEvent({
      supabase,
      payload: buildProgressionEventPayload({
        userId: user.id,
        routineId,
        routineDayExerciseId: existingExercise.id,
        exerciseId: existingExercise.exercise_id,
        eventType: "manual_target_change",
        fromTarget: previousTarget,
        toTarget: nextTarget,
        reason: "Updated routine exercise target manually.",
        playbookId: updatedExercise.progression_playbook_id,
        config: updatedExercise.progression_playbook_config,
        sourceSessionId: null,
      }),
      context: "routineDay.updateRoutineDayExerciseAction",
    });
  }

  revalidateRoutinesViews();
  return { ok: true };
}


export async function reorderRoutineDayExercisesAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const orderedExerciseRowIds = String(formData.get("orderedExerciseRowIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!routineId || !routineDayId || orderedExerciseRowIds.length === 0) {
    return { ok: false, error: "Missing reorder info" };
  }

  const { data: existingRows, error: existingRowsError } = await supabase
    .from("routine_day_exercises")
    .select("id")
    .eq("routine_day_id", routineDayId)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (existingRowsError) {
    return { ok: false, error: existingRowsError.message };
  }

  const existingIds = (existingRows ?? []).map((row) => row.id);
  if (existingIds.length !== orderedExerciseRowIds.length || existingIds.some((id) => !orderedExerciseRowIds.includes(id))) {
    return { ok: false, error: "Invalid reorder payload" };
  }

  const { error } = await supabase.rpc("reorder_routine_day_exercises", {
    target_routine_day_id: routineDayId,
    target_user_id: user.id,
    ordered_exercise_row_ids: orderedExerciseRowIds,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateRoutineEditPaths(routineId, routineDayId);
  revalidateRoutinesViews();
  return { ok: true };
}

export async function deleteRoutineDayExerciseAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const exerciseRowId = String(formData.get("exerciseRowId") ?? "");

  if (!routineId || !routineDayId || !exerciseRowId) {
    return { ok: false, error: "Missing delete info" };
  }

  const { error } = await supabase
    .from("routine_day_exercises")
    .delete()
    .eq("id", exerciseRowId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateRoutineEditPaths(routineId, routineDayId);
  revalidateRoutinesViews();
  return { ok: true };
}
