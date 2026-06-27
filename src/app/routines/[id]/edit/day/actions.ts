"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { validateExerciseEquipment, validateExerciseName, validateMovementPattern } from "@/lib/exercises";
import { buildCustomExerciseInsertPayload } from "@/lib/custom-exercise-payload";
import { supabaseServer } from "@/lib/supabase/server";
import { getRoutineEditPath, getRoutineHomePath, getTodayPath, revalidateRoutinesViews } from "@/lib/revalidation";
import { mapExerciseGoalPayloadToRoutineDayColumns, parseExerciseGoalPayload } from "@/lib/exercise-goal-payload";
import { insertRoutineDayExerciseAtEnd } from "@/lib/ordered-position-insert";
import { parseProgressionPlaybookPayload } from "@/lib/progression-playbooks";
import { buildProgressionReviewTargetPlan } from "@/lib/progression-review-loader";
import { buildProgressionPlaybookConfigFromFormState, createProgressionPlaybookFormState } from "@/lib/progression-playbook-form-state";
import { getSchemaMismatchMessage, isMissingProgressionPlaybookColumnError, isMissingRoutineDefaultProgressionColumnError, omitProgressionPlaybookColumns } from "@/lib/progression-schema-compat";
import { isSetFlowDirection, type SetFlowDirection } from "@/lib/set-flow-directions";
import {
  ensureWorkoutPlanForRoutineDay,
  loadRoutineDayExercisesWithWorkoutPlanCompat,
  loadRoutineDayWithWorkoutPlanCompat,
  loadRoutineDaysWithWorkoutPlanCompat,
  loadWorkoutPlanNames,
  omitRoutineDayExerciseWorkoutPlanColumn,
  saveRoutineDayAsNewWorkoutPlan,
  WORKOUT_PLAN_TEMPLATE_EXERCISE_SELECT,
  isMissingRoutineDayExerciseTemplateColumnError,
} from "@/lib/workout-plan-templates";
import { hasWorkoutPlanNameConflict, normalizeWorkoutPlanNameCandidate } from "@/lib/workout-plan-template-name";
import {
  buildProgressionEventPayload,
  recordProgressionEvent,
  targetsDiffer,
} from "@/lib/progression-events";
import type { RoutineDayExerciseRow } from "@/types/db";

function revalidateRoutineEditPaths(routineId: string, dayId: string) {
  revalidatePath(getRoutineHomePath(routineId));
  revalidatePath(getRoutineEditPath(routineId));
  revalidatePath(getTodayPath());
  revalidatePath(`/routines/${routineId}/days/${dayId}`);
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

const ROUTINE_DAY_EXERCISE_PROGRESS_EVENT_SELECT = "id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config, workout_plan_template_exercise_id";
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

function shouldSyncLinkedWorkoutPlan(formData: FormData) {
  return String(formData.get("workoutPlanTemplateSyncMode") ?? "").trim() === "sync";
}

type WorkoutPlanDecisionMode = "update_existing" | "save_new";
type TemplateAwareRoutineDay = NonNullable<Awaited<ReturnType<typeof loadRoutineDayWithWorkoutPlanCompat>>["data"]>;

function parseWorkoutPlanDecisionMode(value: FormDataEntryValue | null): WorkoutPlanDecisionMode | null {
  const normalized = String(value ?? "").trim();
  return normalized === "update_existing" || normalized === "save_new"
    ? normalized
    : null;
}

async function loadRoutineDayWorkoutPlanSyncContext(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  routineId: string;
  routineDayId: string;
}) {
  const routineDayResult = await loadRoutineDayWithWorkoutPlanCompat({
    supabase: args.supabase,
    routineDayId: args.routineDayId,
    routineId: args.routineId,
    userId: args.userId,
  });

  if (routineDayResult.error || !routineDayResult.data) {
    return {
      routineDay: null as TemplateAwareRoutineDay | null,
      linkedRoutineDayIds: [] as string[],
      linkedRoutineDayCount: 0,
      shouldSyncTemplate: false,
      error: routineDayResult.error ?? new Error("Workout plan not found."),
    };
  }

  if (!routineDayResult.data.workout_plan_template_id) {
    return {
      routineDay: routineDayResult.data,
      linkedRoutineDayIds: [routineDayResult.data.id],
      linkedRoutineDayCount: 1,
      shouldSyncTemplate: false,
      error: null,
    };
  }

  const linkedRoutineDaysResult = await loadRoutineDaysWithWorkoutPlanCompat({
    supabase: args.supabase,
    userId: args.userId,
  });
  if (linkedRoutineDaysResult.error) {
    return {
      routineDay: null as TemplateAwareRoutineDay | null,
      linkedRoutineDayIds: [] as string[],
      linkedRoutineDayCount: 0,
      shouldSyncTemplate: false,
      error: linkedRoutineDaysResult.error,
    };
  }

  const linkedRoutineDayIds = linkedRoutineDaysResult.data
    .filter((day) => day.workout_plan_template_id === routineDayResult.data?.workout_plan_template_id)
    .map((day) => day.id);
  const resolvedLinkedRoutineDayIds = linkedRoutineDayIds.length > 0 ? linkedRoutineDayIds : [routineDayResult.data.id];
  const linkedRoutineDayCount = resolvedLinkedRoutineDayIds.length;

  return {
    routineDay: routineDayResult.data,
    linkedRoutineDayIds: resolvedLinkedRoutineDayIds,
    linkedRoutineDayCount,
    shouldSyncTemplate: linkedRoutineDayCount <= 1,
    error: null,
  };
}

async function insertRoutineDayExerciseWithCompat(args: {
  supabase: ReturnType<typeof supabaseServer>;
  routineDayId: string;
  userId: string;
  values: Record<string, unknown>;
  selectedProgression: boolean;
}) {
  let payload = args.values;
  let { error } = await insertRoutineDayExerciseAtEnd({
    supabase: args.supabase,
    routineDayId: args.routineDayId,
    userId: args.userId,
    values: payload,
  });

  if (error && isMissingRoutineDayExerciseTemplateColumnError(error)) {
    payload = omitRoutineDayExerciseWorkoutPlanColumn(payload);
    const fallback = await insertRoutineDayExerciseAtEnd({
      supabase: args.supabase,
      routineDayId: args.routineDayId,
      userId: args.userId,
      values: payload,
    });
    error = fallback.error;
  }

  if (error && isMissingProgressionPlaybookColumnError(error) && !args.selectedProgression) {
    payload = omitProgressionPlaybookColumns(payload);
    const fallback = await insertRoutineDayExerciseAtEnd({
      supabase: args.supabase,
      routineDayId: args.routineDayId,
      userId: args.userId,
      values: payload,
    });
    error = fallback.error;
  }

  return { error };
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
    return { ok: false, error: "Missing workout plan info" };
  }

  const templateSyncContext = await loadRoutineDayWorkoutPlanSyncContext({
    supabase,
    userId: user.id,
    routineId,
    routineDayId,
  });
  if (templateSyncContext.error || !templateSyncContext.routineDay) {
    return { ok: false, error: templateSyncContext.error?.message ?? "Workout plan not found" };
  }

  const existingDay = templateSyncContext.routineDay;
  const safeName = name.slice(0, 15) || String(existingDay.day_index);
  const shouldSyncTemplate = shouldSyncLinkedWorkoutPlan(formData) || templateSyncContext.shouldSyncTemplate;

  const dayUpdateQuery = shouldSyncTemplate && existingDay.workout_plan_template_id
    ? supabase
        .from("routine_days")
        .update({ name: safeName, is_rest: isRest })
        .eq("workout_plan_template_id", existingDay.workout_plan_template_id)
        .eq("user_id", user.id)
    : supabase
        .from("routine_days")
        .update({ name: safeName, is_rest: isRest })
        .eq("id", routineDayId)
        .eq("user_id", user.id)
        .eq("routine_id", routineId);

  const { error } = await dayUpdateQuery;

  if (error) {
    return { ok: false, error: error.message };
  }

  if (shouldSyncTemplate && existingDay.workout_plan_template_id) {
    const templateUpdateResult = await supabase
      .from("workout_plan_templates")
      .update({
        name: safeName,
        is_rest: isRest,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingDay.workout_plan_template_id)
      .eq("user_id", user.id);

    if (templateUpdateResult.error) {
      return { ok: false, error: templateUpdateResult.error.message };
    }
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
  revalidatePath(getRoutineHomePath(routineId));
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
        secondaryMuscle: null,
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

  const templateSyncContext = await loadRoutineDayWorkoutPlanSyncContext({
    supabase,
    userId: user.id,
    routineId,
    routineDayId,
  });
  if (templateSyncContext.error || !templateSyncContext.routineDay) {
    if (createdCustomExerciseId) {
      await supabase
        .from("exercises")
        .delete()
        .eq("id", createdCustomExerciseId)
        .eq("user_id", user.id)
        .eq("is_global", false);
    }
    return { ok: false, error: templateSyncContext.error?.message ?? "Workout plan not found" };
  }

  const shouldSyncTemplate = shouldSyncLinkedWorkoutPlan(formData) || templateSyncContext.shouldSyncTemplate;

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
  const selectedProgression = selectedProgressionPlaybook(parsedPayload.payload);
  let error = null;

  if (shouldSyncTemplate && templateSyncContext.routineDay.workout_plan_template_id) {
    const templateInsertPayload = {
      user_id: user.id,
      workout_plan_template_id: templateSyncContext.routineDay.workout_plan_template_id,
      exercise_id: exerciseId,
      ...parsedPayload.payload,
    };
    const templateInsertResult = await supabase
      .from("workout_plan_template_exercises")
      .insert(templateInsertPayload)
      .select(WORKOUT_PLAN_TEMPLATE_EXERCISE_SELECT)
      .single();

    if (templateInsertResult.error) {
      error = templateInsertResult.error;
    } else {
      for (const linkedRoutineDayId of templateSyncContext.linkedRoutineDayIds) {
        const linkedInsertPayload = {
          user_id: user.id,
          routine_day_id: linkedRoutineDayId,
          exercise_id: exerciseId,
          ...parsedPayload.payload,
          workout_plan_template_exercise_id: templateInsertResult.data.id,
        };
        const insertResult = await insertRoutineDayExerciseWithCompat({
          supabase,
          routineDayId: linkedRoutineDayId,
          userId: user.id,
          values: linkedInsertPayload,
          selectedProgression,
        });
        if (insertResult.error) {
          error = insertResult.error;
          break;
        }
      }
    }
  } else {
    const insertResult = await insertRoutineDayExerciseWithCompat({
      supabase,
      routineDayId,
      userId: user.id,
      values: insertPayload,
      selectedProgression,
    });
    error = insertResult.error;
  }

  if (error && isMissingProgressionPlaybookColumnError(error) && selectedProgression) {
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
  revalidatePath(getRoutineHomePath(routineId));
  return { ok: true };
}

export async function resolveWorkoutPlanEditDecisionAction(
  formData: FormData,
): Promise<ActionResult & {
  workoutPlanId?: string;
  workoutPlanName?: string;
  templateId?: string;
  templateName?: string;
  syncMode?: "sync";
}> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const routineId = String(formData.get("routineId") ?? "").trim();
  const routineDayId = String(formData.get("routineDayId") ?? "").trim();
  const decisionMode = parseWorkoutPlanDecisionMode(formData.get("decisionMode"));
  const requestedTemplateName = normalizeWorkoutPlanNameCandidate(formData.get("templateName")?.toString() ?? "");

  if (!routineId || !routineDayId || !decisionMode) {
    return { ok: false, error: "Missing workout plan decision info." };
  }

  const { data: routineDay, error: routineDayError } = await loadRoutineDayWithWorkoutPlanCompat({
    supabase,
    routineDayId,
    routineId,
    userId: user.id,
  });
  if (routineDayError || !routineDay) {
    return { ok: false, error: routineDayError?.message ?? "Workout plan not found." };
  }

  const dayExercisesResult = await loadRoutineDayExercisesWithWorkoutPlanCompat({
    supabase,
    userId: user.id,
    routineDayIds: [routineDayId],
  });
  if (dayExercisesResult.error) {
    return { ok: false, error: dayExercisesResult.error.message };
  }

  const orderedDayExercises = dayExercisesResult.data
    .filter((exercise) => exercise.routine_day_id === routineDayId)
    .sort((left, right) => left.position - right.position);

  if (decisionMode === "save_new") {
    if (!requestedTemplateName) {
      return { ok: false, error: "Workout plan name is required." };
    }

    const existingTemplateNames = await loadWorkoutPlanNames({
      supabase,
      userId: user.id,
    });
    if (hasWorkoutPlanNameConflict({
      candidateName: requestedTemplateName,
      workoutPlanNames: existingTemplateNames,
    })) {
      return { ok: false, error: "Workout plan name already exists." };
    }

    const saveResult = await saveRoutineDayAsNewWorkoutPlan({
      supabase,
      userId: user.id,
      routineDay,
      dayExercises: orderedDayExercises,
      requestedName: requestedTemplateName,
    });
    if (saveResult.error || !saveResult.templateId) {
      return { ok: false, error: saveResult.error?.message ?? "Could not save new workout plan." };
    }

    revalidateRoutineEditPaths(routineId, routineDayId);
    revalidateRoutinesViews();
    return {
      ok: true,
      workoutPlanId: saveResult.templateId,
      workoutPlanName: saveResult.templateName ?? requestedTemplateName,
      templateId: saveResult.templateId,
      templateName: saveResult.templateName ?? requestedTemplateName,
      syncMode: "sync",
    };
  }

  const ensureResult = await ensureWorkoutPlanForRoutineDay({
    supabase,
    userId: user.id,
    routineDay,
    dayExercises: orderedDayExercises,
    markEditChoiceRequired: false,
  });
  if (ensureResult.error || !ensureResult.templateId) {
    return { ok: false, error: ensureResult.error?.message ?? "Could not prepare workout plan." };
  }

  revalidateRoutineEditPaths(routineId, routineDayId);
  revalidateRoutinesViews();
  return {
    ok: true,
    workoutPlanId: ensureResult.templateId,
    workoutPlanName: ensureResult.templateName ?? (requestedTemplateName || undefined),
    templateId: ensureResult.templateId,
    templateName: ensureResult.templateName ?? (requestedTemplateName || undefined),
    syncMode: "sync",
  };
}

export async function loadWorkoutPlanEditDecisionStateAction(
  formData: FormData,
): Promise<ActionResult & {
  workoutPlanId?: string | null;
  requiresWorkoutPlanEditDecision?: boolean;
  templateId?: string | null;
  requiresTemplateEditDecision?: boolean;
  syncMode?: "sync";
}> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const routineId = String(formData.get("routineId") ?? "").trim();
  const routineDayId = String(formData.get("routineDayId") ?? "").trim();

  if (!routineId || !routineDayId) {
    return { ok: false, error: "Missing workout plan decision info." };
  }

  const templateSyncContext = await loadRoutineDayWorkoutPlanSyncContext({
    supabase,
    userId: user.id,
    routineId,
    routineDayId,
  });

  if (templateSyncContext.error || !templateSyncContext.routineDay) {
    return { ok: false, error: templateSyncContext.error?.message ?? "Workout plan not found." };
  }

  const templateId = templateSyncContext.routineDay.workout_plan_template_id ?? null;
  const requiresTemplateEditDecision = Boolean(templateId)
    && templateSyncContext.linkedRoutineDayCount > 1;

  return {
    ok: true,
    workoutPlanId: templateId,
    requiresWorkoutPlanEditDecision: requiresTemplateEditDecision,
    templateId,
    requiresTemplateEditDecision,
    syncMode: templateSyncContext.shouldSyncTemplate ? "sync" : undefined,
  };
}

export const resolveWorkoutPlanTemplateEditDecisionAction = resolveWorkoutPlanEditDecisionAction;

export const loadWorkoutPlanTemplateEditDecisionStateAction = loadWorkoutPlanEditDecisionStateAction;

export async function updateRoutineDayExerciseAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const exerciseRowId = String(formData.get("exerciseRowId") ?? "");
  const explicitTemplateSync = shouldSyncLinkedWorkoutPlan(formData);

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

  {
    const templateSyncContext = await loadRoutineDayWorkoutPlanSyncContext({
      supabase,
      userId: user.id,
      routineId,
      routineDayId,
    });
    if (templateSyncContext.error || !templateSyncContext.routineDay) {
      return { ok: false, error: templateSyncContext.error?.message ?? "Workout plan not found." };
    }

    const shouldSyncTemplate = explicitTemplateSync || templateSyncContext.shouldSyncTemplate;
    const routineDay = templateSyncContext.routineDay;
    if (shouldSyncTemplate && routineDay.workout_plan_template_id && existingExercise.workout_plan_template_exercise_id) {
      const templateExercisePayload = {
        ...parsedPayload.payload,
        updated_at: new Date().toISOString(),
      };
      const templateExerciseUpdate = await supabase
        .from("workout_plan_template_exercises")
        .update(templateExercisePayload)
        .eq("id", existingExercise.workout_plan_template_exercise_id)
        .eq("workout_plan_template_id", routineDay.workout_plan_template_id)
        .eq("user_id", user.id);

      if (templateExerciseUpdate.error) {
        return { ok: false, error: templateExerciseUpdate.error.message };
      }

      const linkedExerciseUpdate = await supabase
        .from("routine_day_exercises")
        .update(parsedPayload.payload)
        .eq("workout_plan_template_exercise_id", existingExercise.workout_plan_template_exercise_id)
        .eq("user_id", user.id);

      if (linkedExerciseUpdate.error) {
        return { ok: false, error: linkedExerciseUpdate.error.message };
      }
    }
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
  revalidatePath(getRoutineHomePath(routineId));
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

  const templateSyncContext = await loadRoutineDayWorkoutPlanSyncContext({
    supabase,
    userId: user.id,
    routineId,
    routineDayId,
  });
  if (templateSyncContext.error || !templateSyncContext.routineDay) {
    return { ok: false, error: templateSyncContext.error?.message ?? "Workout plan not found." };
  }

  let error = null;
  if (shouldSyncLinkedWorkoutPlan(formData) || templateSyncContext.shouldSyncTemplate) {
    const dayExercisesResult = await loadRoutineDayExercisesWithWorkoutPlanCompat({
      supabase,
      userId: user.id,
      routineDayIds: [routineDayId],
    });
    if (dayExercisesResult.error) {
      return { ok: false, error: dayExercisesResult.error.message };
    }

    const exerciseById = new Map(dayExercisesResult.data.map((exercise) => [exercise.id, exercise]));
    for (const [index, exerciseRowId] of orderedExerciseRowIds.entries()) {
      const exerciseRow = exerciseById.get(exerciseRowId);
      const nextPosition = index;
      if (!exerciseRow?.workout_plan_template_exercise_id) {
        continue;
      }

      const templateExerciseResult = await supabase
        .from("workout_plan_template_exercises")
        .update({ position: nextPosition, updated_at: new Date().toISOString() })
        .eq("id", exerciseRow.workout_plan_template_exercise_id)
        .eq("user_id", user.id);

      if (templateExerciseResult.error) {
        error = templateExerciseResult.error;
        break;
      }

      const linkedExerciseResult = await supabase
        .from("routine_day_exercises")
        .update({ position: nextPosition })
        .eq("workout_plan_template_exercise_id", exerciseRow.workout_plan_template_exercise_id)
        .eq("user_id", user.id);

      if (linkedExerciseResult.error) {
        error = linkedExerciseResult.error;
        break;
      }
    }
  } else {
    const reorderResult = await supabase.rpc("reorder_routine_day_exercises", {
      target_routine_day_id: routineDayId,
      target_user_id: user.id,
      ordered_exercise_row_ids: orderedExerciseRowIds,
    });
    error = reorderResult.error;
  }

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

  const templateSyncContext = await loadRoutineDayWorkoutPlanSyncContext({
    supabase,
    userId: user.id,
    routineId,
    routineDayId,
  });
  if (templateSyncContext.error || !templateSyncContext.routineDay) {
    return { ok: false, error: templateSyncContext.error?.message ?? "Workout plan not found." };
  }

  const { data: existingExercise, error: existingExerciseError } = await supabase
    .from("routine_day_exercises")
    .select("id, workout_plan_template_exercise_id")
    .eq("id", exerciseRowId)
    .eq("routine_day_id", routineDayId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingExerciseError || !existingExercise) {
    return { ok: false, error: existingExerciseError?.message ?? "Routine exercise not found" };
  }

  const shouldSyncTemplate = shouldSyncLinkedWorkoutPlan(formData) || templateSyncContext.shouldSyncTemplate;
  let error = null;
  if (shouldSyncTemplate && existingExercise.workout_plan_template_exercise_id) {
    const linkedDeleteResult = await supabase
      .from("routine_day_exercises")
      .delete()
      .eq("workout_plan_template_exercise_id", existingExercise.workout_plan_template_exercise_id)
      .eq("user_id", user.id);

    if (linkedDeleteResult.error) {
      error = linkedDeleteResult.error;
    } else {
      const templateDeleteResult = await supabase
        .from("workout_plan_template_exercises")
        .delete()
        .eq("id", existingExercise.workout_plan_template_exercise_id)
        .eq("user_id", user.id);
      error = templateDeleteResult.error;
    }
  } else {
    const deleteResult = await supabase
      .from("routine_day_exercises")
      .delete()
      .eq("id", exerciseRowId)
      .eq("user_id", user.id);
    error = deleteResult.error;
  }

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateRoutineEditPaths(routineId, routineDayId);
  revalidateRoutinesViews();
  return { ok: true };
}
