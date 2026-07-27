"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { loadProAccessSnapshot } from "@/lib/billing/pro-access";
import type { ActionResult } from "@/lib/action-result";
import { getRoutineEditPath, getRoutineHomePath, revalidateRoutinesViews } from "@/lib/revalidation";
import { supabaseServer } from "@/lib/supabase/server";
import { deleteRoutineMutation, type RoutineDeleteClient } from "@/lib/dal/routine-delete";
import { recomputeExerciseStatsForExercises } from "@/lib/exercise-stats";
import { appendProgressionPlaybookFormData, createProgressionPlaybookFormState } from "@/lib/progression-playbook-form-state";
import { ROUTINE_SCHEDULE_MODE_VALUES, type RoutineDetailsScheduleMode } from "@/lib/routine-details-form";
import { ROUTINE_START_WEEKDAYS, createRoutineDaySeedsFromStartDate, getRoutineStartDateForWeekday, getRoutineStartWeekdayFromDate } from "@/lib/routines";
import {
  resolveDuplicatedRoutineDayName,
  resolveRoutineDayCreationOverrides,
  shouldApplyRoutineDayCreationOverrides,
} from "@/lib/routine-day-creation";
import { resolveUniqueRoutineCopyName } from "@/lib/routine-copy-name";
import { toCanonicalRoutineTimezone } from "@/lib/timezones";
import { parseProgressionPlaybookPayload } from "@/lib/progression-playbooks";
import {
  BASE_ROUTINE_LIMIT,
  BASE_SAVED_WORKOUT_PLAN_LIMIT,
  ROUTINE_LIMIT_PRO_REQUIRED_MESSAGE,
  WORKOUT_PLAN_LIMIT_PRO_REQUIRED_MESSAGE,
  selectAccessibleRoutineIdsForTier,
  selectAccessibleWorkoutPlanTemplateIdsForTier,
} from "@/lib/pro-tier-limits";
import {
  getSchemaMismatchMessage,
  isMissingProgressionPlaybookColumnError,
  isMissingRoutineDefaultProgressionColumnError,
  omitProgressionPlaybookColumns,
  omitRoutineDefaultProgressionColumns,
} from "@/lib/progression-schema-compat";
import { rollbackAppendedRoutineDay, rollbackDuplicatedRoutine } from "@/lib/routine-copy-rollback";
import {
  cloneWorkoutPlanIntoRoutineDay,
  ensureWorkoutPlanForRoutineDay,
  isMissingWorkoutPlanTableError,
  loadRoutineDayExercisesWithWorkoutPlanCompat,
  loadRoutineDayWithWorkoutPlanCompat,
  loadRoutineDaysWithWorkoutPlanCompat,
  omitRoutineDayTemplateColumns,
  ROUTINE_DAY_TEMPLATE_SELECT,
  updateLinkedWorkoutPlanChoiceRequirement,
} from "@/lib/workout-plan-templates";
import { loadWorkoutPlanSourceList, type WorkoutPlanSourceListItem } from "@/lib/workout-plan-source-list";
import type { WorkoutPlanRow } from "@/types/db";

type CreateRoutineResult = ActionResult & {
  routineId?: string;
  firstDayId?: string;
  createdDays?: Array<{ id: string; dayIndex: number }>;
};
type AppendRoutineDayResult = ActionResult & { routineDayId?: string };
type DuplicateRoutineDayResult = ActionResult & { routineDayId?: string };
type ReorderRoutineDaysResult = ActionResult;
type CreateRoutineDayResult = ActionResult & { routineDayId?: string };
type PopulateRoutineDayResult = ActionResult & { routineDayId?: string };
type LoadWorkoutPlanSourcesResult = ActionResult & { sources?: WorkoutPlanSourceListItem[] };

const ROUTINE_COPY_SELECT_LEGACY = "id, user_id, name, cycle_length_days, schedule_mode, start_date, timezone, weight_unit";
const ROUTINE_COPY_SELECT_WITH_DEFAULT_PROGRESSION = `${ROUTINE_COPY_SELECT_LEGACY}, default_progression_playbook_id, default_progression_playbook_config`;
const ROUTINE_DAY_COPY_SELECT = "id, day_index, name, is_rest, is_optional, notes, duplicate_source_routine_day_id, workout_plan_template_id, workout_plan_template_edit_choice_required";
const ROUTINE_DAY_COPY_SELECT_LEGACY = "id, day_index, name, is_rest, is_optional, notes";
const ROUTINE_DAY_DETAIL_SELECT = ROUTINE_DAY_TEMPLATE_SELECT;
const ROUTINE_DAY_DETAIL_SELECT_LEGACY = "id, user_id, routine_id, day_index, name, is_rest, is_optional, notes";
const ROUTINE_DAY_EXERCISE_COPY_SELECT_LEGACY = "exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes";
const ROUTINE_DAY_EXERCISE_COPY_SELECT_WITH_PROGRESSION = `${ROUTINE_DAY_EXERCISE_COPY_SELECT_LEGACY}, progression_playbook_id, progression_playbook_config, workout_plan_template_exercise_id`;
const ROUTINE_DAY_EXERCISE_ROUTINE_COPY_SELECT_LEGACY = `routine_day_id, ${ROUTINE_DAY_EXERCISE_COPY_SELECT_LEGACY}`;
const ROUTINE_DAY_EXERCISE_ROUTINE_COPY_SELECT_WITH_PROGRESSION = `routine_day_id, ${ROUTINE_DAY_EXERCISE_COPY_SELECT_WITH_PROGRESSION}`;

async function reindexRoutineDaysDirect(args: {
  supabase: ReturnType<typeof supabaseServer>;
  routineId: string;
  userId: string;
  orderedRoutineDayIds: string[];
}) {
  for (let index = 0; index < args.orderedRoutineDayIds.length; index += 1) {
    const routineDayId = args.orderedRoutineDayIds[index];
    const temporaryIndex = -1 * (index + 1);
    const { error } = await args.supabase
      .from("routine_days")
      .update({ day_index: temporaryIndex })
      .eq("id", routineDayId)
      .eq("routine_id", args.routineId)
      .eq("user_id", args.userId);

    if (error) {
      return error;
    }
  }

  for (let index = 0; index < args.orderedRoutineDayIds.length; index += 1) {
    const routineDayId = args.orderedRoutineDayIds[index];
    const nextDayIndex = index + 1;
    const { error } = await args.supabase
      .from("routine_days")
      .update({ day_index: nextDayIndex })
      .eq("id", routineDayId)
      .eq("routine_id", args.routineId)
      .eq("user_id", args.userId);

    if (error) {
      return error;
    }
  }

  return null;
}

function isMissingRoutineDayDuplicateSourceColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    message.includes("duplicate_source_routine_day_id")
    && message.includes("routine_days")
    && (message.includes("schema cache") || message.includes("does not exist"))
  );
}

function omitRoutineDayDuplicateSourceColumn<T extends Record<string, unknown>>(payload: T) {
  const { duplicate_source_routine_day_id: _duplicateSourceRoutineDayId, ...rest } = payload;
  return rest;
}

async function loadRoutineDayWithDuplicateSourceCompat(args: {
  supabase: ReturnType<typeof supabaseServer>;
  routineDayId: string;
  userId: string;
  routineId?: string;
}) {
  return loadRoutineDayWithWorkoutPlanCompat(args);
}

async function loadWorkoutPlanTemplateSourceContext(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  routineId?: string;
  workoutPlanTemplateId?: string | null;
  sourceRoutineDayId?: string | null;
}) {
  if (args.workoutPlanTemplateId) {
    const { data: templateData, error: templateError } = await args.supabase
      .from("workout_plan_templates")
      .select("id, user_id, name, is_rest, source_routine_day_id, created_at, updated_at")
      .eq("id", args.workoutPlanTemplateId)
      .eq("user_id", args.userId)
      .maybeSingle();

    if (templateError || !templateData) {
      return {
        template: null as WorkoutPlanRow | null,
        sourceDay: null as Awaited<ReturnType<typeof loadRoutineDayWithDuplicateSourceCompat>>["data"],
        sourceDayExercises: [] as Awaited<ReturnType<typeof loadRoutineDayExercisesWithWorkoutPlanCompat>>["data"],
        sourceRoutineStartDate: null as string | null,
        templateSupported: !isMissingWorkoutPlanTableError(templateError),
        error: templateError ?? new Error("Source workout plan not found."),
      };
    }

    const template = templateData as WorkoutPlanRow;
    const preferredSourceDayId = args.sourceRoutineDayId?.trim() || template.source_routine_day_id?.trim() || "";
    let sourceDay = null as Awaited<ReturnType<typeof loadRoutineDayWithDuplicateSourceCompat>>["data"];

    if (preferredSourceDayId) {
      const sourceDayResult = await loadRoutineDayWithDuplicateSourceCompat({
        supabase: args.supabase,
        routineDayId: preferredSourceDayId,
        userId: args.userId,
      });
      sourceDay = sourceDayResult.data;
    }

    if (!sourceDay) {
      const linkedDaysResult = await loadRoutineDaysWithWorkoutPlanCompat({
        supabase: args.supabase,
        userId: args.userId,
      });
      if (linkedDaysResult.error) {
        return {
          template: null as WorkoutPlanRow | null,
          sourceDay: null as Awaited<ReturnType<typeof loadRoutineDayWithDuplicateSourceCompat>>["data"],
          sourceDayExercises: [] as Awaited<ReturnType<typeof loadRoutineDayExercisesWithWorkoutPlanCompat>>["data"],
          sourceRoutineStartDate: null,
          templateSupported: true,
          error: linkedDaysResult.error,
        };
      }

      const linkedSourceDay = linkedDaysResult.data
        .filter((day) => day.workout_plan_template_id === template.id)
        .sort((left, right) => {
          const leftIsCurrentRoutine = args.routineId ? left.routine_id === args.routineId : false;
          const rightIsCurrentRoutine = args.routineId ? right.routine_id === args.routineId : false;
          if (leftIsCurrentRoutine !== rightIsCurrentRoutine) {
            return leftIsCurrentRoutine ? -1 : 1;
          }
          return left.day_index - right.day_index;
        })[0] ?? null;
      sourceDay = linkedSourceDay ?? null;
    }

    let sourceRoutineStartDate: string | null = null;
    if (sourceDay?.routine_id) {
      const { data: sourceRoutine } = await args.supabase
        .from("routines")
        .select("id, start_date")
        .eq("id", sourceDay.routine_id)
        .eq("user_id", args.userId)
        .maybeSingle();
      sourceRoutineStartDate = sourceRoutine?.start_date ?? null;
    }

    return {
      template,
      sourceDay,
      sourceDayExercises: [] as Awaited<ReturnType<typeof loadRoutineDayExercisesWithWorkoutPlanCompat>>["data"],
      sourceRoutineStartDate,
      templateSupported: true,
      error: null,
    };
  }

  if (!args.sourceRoutineDayId) {
    return {
      template: null as WorkoutPlanRow | null,
      sourceDay: null as Awaited<ReturnType<typeof loadRoutineDayWithDuplicateSourceCompat>>["data"],
      sourceDayExercises: [] as Awaited<ReturnType<typeof loadRoutineDayExercisesWithWorkoutPlanCompat>>["data"],
      sourceRoutineStartDate: null as string | null,
      templateSupported: false,
      error: new Error("Missing workout plan info."),
    };
  }

  const sourceDayResult = await loadRoutineDayWithDuplicateSourceCompat({
    supabase: args.supabase,
    routineDayId: args.sourceRoutineDayId,
    userId: args.userId,
  });
  if (sourceDayResult.error || !sourceDayResult.data) {
    return {
      template: null as WorkoutPlanRow | null,
      sourceDay: null as Awaited<ReturnType<typeof loadRoutineDayWithDuplicateSourceCompat>>["data"],
      sourceDayExercises: [] as Awaited<ReturnType<typeof loadRoutineDayExercisesWithWorkoutPlanCompat>>["data"],
      sourceRoutineStartDate: null as string | null,
      templateSupported: false,
      error: sourceDayResult.error ?? new Error("Source workout plan not found."),
    };
  }

  const sourceDayExercisesResult = await loadRoutineDayExercisesWithWorkoutPlanCompat({
    supabase: args.supabase,
    userId: args.userId,
    routineDayIds: [args.sourceRoutineDayId],
  });
  if (sourceDayExercisesResult.error) {
    return {
      template: null as WorkoutPlanRow | null,
      sourceDay: null as Awaited<ReturnType<typeof loadRoutineDayWithDuplicateSourceCompat>>["data"],
      sourceDayExercises: [] as Awaited<ReturnType<typeof loadRoutineDayExercisesWithWorkoutPlanCompat>>["data"],
      sourceRoutineStartDate: null as string | null,
      templateSupported: false,
      error: sourceDayExercisesResult.error,
    };
  }

  const sourceDayExercises = sourceDayExercisesResult.data
    .filter((exercise) => exercise.routine_day_id === args.sourceRoutineDayId)
    .sort((left, right) => left.position - right.position);
  const capacityError = sourceDayResult.data.workout_plan_template_id
    ? null
    : await getSavedWorkoutPlanCapacityError({
        supabase: args.supabase,
        userId: args.userId,
      });
  const ensuredTemplateResult = await ensureWorkoutPlanForRoutineDay({
    supabase: args.supabase,
    userId: args.userId,
    routineDay: sourceDayResult.data,
    dayExercises: sourceDayExercises,
    markEditChoiceRequired: true,
    capacityError,
  });
  if (ensuredTemplateResult.error || !ensuredTemplateResult.templateId) {
    if (isMissingWorkoutPlanTableError(ensuredTemplateResult.error)) {
      const { data: sourceRoutine } = await args.supabase
        .from("routines")
        .select("id, start_date")
        .eq("id", sourceDayResult.data.routine_id)
        .eq("user_id", args.userId)
        .maybeSingle();

      return {
        template: null as WorkoutPlanRow | null,
        sourceDay: sourceDayResult.data,
        sourceDayExercises,
        sourceRoutineStartDate: sourceRoutine?.start_date ?? null,
        templateSupported: false,
        error: null,
      };
    }

    return {
      template: null as WorkoutPlanRow | null,
      sourceDay: null as Awaited<ReturnType<typeof loadRoutineDayWithDuplicateSourceCompat>>["data"],
      sourceDayExercises: [] as Awaited<ReturnType<typeof loadRoutineDayExercisesWithWorkoutPlanCompat>>["data"],
      sourceRoutineStartDate: null as string | null,
      templateSupported: true,
      error: ensuredTemplateResult.error ?? new Error("Could not prepare workout plan."),
    };
  }

  const { data: sourceRoutine } = await args.supabase
    .from("routines")
    .select("id, start_date")
    .eq("id", sourceDayResult.data.routine_id)
    .eq("user_id", args.userId)
    .maybeSingle();

  return {
    template: {
      id: ensuredTemplateResult.templateId,
      user_id: args.userId,
      name: ensuredTemplateResult.templateName ?? sourceDayResult.data.name ?? `Day ${sourceDayResult.data.day_index}`,
      is_rest: sourceDayResult.data.is_rest,
      source_routine_day_id: sourceDayResult.data.id,
      created_at: null,
      updated_at: null,
    } satisfies WorkoutPlanRow,
    sourceDay: sourceDayResult.data,
    sourceDayExercises,
    sourceRoutineStartDate: sourceRoutine?.start_date ?? null,
    templateSupported: true,
    error: null,
  };
}

async function cloneLegacyRoutineDayExercisesIntoDestination(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  targetRoutineDayId: string;
  sourceExercises: Awaited<ReturnType<typeof loadRoutineDayExercisesWithWorkoutPlanCompat>>["data"];
}) {
  if (args.sourceExercises.length === 0) {
    return { error: null };
  }

  const insertPayload = args.sourceExercises.map((exercise) => ({
    user_id: args.userId,
    routine_day_id: args.targetRoutineDayId,
    exercise_id: exercise.exercise_id,
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
    measurement_type: exercise.measurement_type,
    default_unit: exercise.default_unit,
    notes: exercise.notes,
    progression_playbook_id: exercise.progression_playbook_id ?? null,
    progression_playbook_config: exercise.progression_playbook_config ?? null,
  }));

  let insertResult = await args.supabase
    .from("routine_day_exercises")
    .insert(insertPayload);

  if (insertResult.error && isMissingProgressionPlaybookColumnError(insertResult.error)) {
    insertResult = await args.supabase
      .from("routine_day_exercises")
      .insert(insertPayload.map((payload) => omitProgressionPlaybookColumns(payload)));
  }

  return { error: insertResult.error };
}

export async function setActiveRoutineAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const routineId = String(formData.get("routineId") ?? "").trim();

  if (!routineId) {
    return { ok: false, error: "Missing routine ID." };
  }

  const { error: routineCheckError } = await supabase
    .from("routines")
    .select("id")
    .eq("id", routineId)
    .eq("user_id", user.id)
    .single();

  if (routineCheckError) {
    return { ok: false, error: routineCheckError.message };
  }

  const accessResult = await enforceRoutineAccessForCurrentTier({
    supabase,
    userId: user.id,
    routineId,
  });
  if (!accessResult.ok) return accessResult;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ active_routine_id: routineId })
    .eq("id", user.id);

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  revalidateRoutinesViews();
  revalidatePath(getRoutineHomePath(routineId));

  return { ok: true };
}

export async function loadRoutineWorkoutPlanSourcesAction(formData: FormData): Promise<LoadWorkoutPlanSourcesResult> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const routineId = String(formData.get("routineId") ?? "").trim();

  if (!routineId) {
    return { ok: false, error: "Missing routine ID." };
  }

  const accessResult = await enforceRoutineAccessForCurrentTier({
    supabase,
    userId: user.id,
    routineId,
  });
  if (!accessResult.ok) return accessResult;

  const sources = await loadWorkoutPlanSourceList({
    supabase,
    userId: user.id,
    routineId,
  });

  return { ok: true, sources };
}

export async function appendRoutineDayAction(formData: FormData): Promise<AppendRoutineDayResult> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const routineId = String(formData.get("routineId") ?? "").trim();

  if (!routineId) {
    return { ok: false, error: "Missing routine ID." };
  }

  const accessResult = await enforceRoutineAccessForCurrentTier({
    supabase,
    userId: user.id,
    routineId,
  });
  if (!accessResult.ok) return accessResult;

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, schedule_mode, start_date, timezone, weight_unit, default_progression_playbook_id, default_progression_playbook_config")
    .eq("id", routineId)
    .eq("user_id", user.id)
    .single();

  if (routineError || !routine) {
    return { ok: false, error: routineError?.message ?? "Routine not found." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("preferred_distance_unit")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, error: profileError?.message ?? "Profile not found." };
  }

  const { data: highestDay, error: highestDayError } = await supabase
    .from("routine_days")
    .select("id, day_index")
    .eq("routine_id", routineId)
    .eq("user_id", user.id)
    .order("day_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (highestDayError) {
    return { ok: false, error: highestDayError.message };
  }

  const nextCycleLength = Math.max(routine.cycle_length_days ?? 0, highestDay?.day_index ?? 0) + 1;
  const nextStartWeekday = getRoutineStartWeekdayFromDate(routine.start_date) ?? ROUTINE_START_WEEKDAYS[0];
  const nextProgressionState = createProgressionPlaybookFormState({
    playbookId: routine.default_progression_playbook_id ?? null,
    config: routine.default_progression_playbook_config ?? null,
  });
  const updateFormData = new FormData();
  updateFormData.set("routineId", routineId);
  updateFormData.set("existingStartDate", routine.start_date ?? "");
  updateFormData.set("name", routine.name);
  updateFormData.set("cycleLengthDays", String(nextCycleLength));
  updateFormData.set("scheduleMode", routine.schedule_mode === "rolling_n_day" ? "rolling_n_day" : "weekday_anchored");
  updateFormData.set("startDate", routine.start_date ?? "");
  updateFormData.set("startWeekday", nextStartWeekday);
  updateFormData.set("timezone", routine.timezone);
  updateFormData.set("weightUnit", routine.weight_unit ?? "lbs");
  updateFormData.set("distanceUnit", profile.preferred_distance_unit ?? "mi");
  appendProgressionPlaybookFormData(updateFormData, nextProgressionState);

  const updateResult = await updateRoutineAction(updateFormData);
  if (!updateResult.ok) {
    return updateResult;
  }

  const { data: appendedDay, error: appendedDayError } = await supabase
    .from("routine_days")
    .select("id, day_index")
    .eq("routine_id", routineId)
    .eq("user_id", user.id)
    .eq("day_index", nextCycleLength)
    .maybeSingle();

  if (appendedDayError || !appendedDay) {
    return { ok: false, error: appendedDayError?.message ?? "New workout plan was not created." };
  }

  return { ok: true, routineDayId: appendedDay.id };
}

export async function deleteRoutineDayAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const routineId = String(formData.get("routineId") ?? "").trim();
  const routineDayId = String(formData.get("routineDayId") ?? "").trim();

  if (!routineId || !routineDayId) {
    return { ok: false, error: "Missing workout plan info." };
  }

  const accessResult = await enforceRoutineAccessForCurrentTier({
    supabase,
    userId: user.id,
    routineId,
  });
  if (!accessResult.ok) return accessResult;

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select("id, cycle_length_days")
    .eq("id", routineId)
    .eq("user_id", user.id)
    .single();

  if (routineError || !routine) {
    return { ok: false, error: routineError?.message ?? "Routine not found." };
  }

  const { data: routineDays, error: routineDaysError } = await supabase
    .from("routine_days")
    .select("id, day_index")
    .eq("routine_id", routineId)
    .eq("user_id", user.id)
    .order("day_index", { ascending: true });

  if (routineDaysError) {
    return { ok: false, error: routineDaysError.message };
  }

  const existingDays = routineDays ?? [];
  if (!existingDays.some((day) => day.id === routineDayId)) {
    return { ok: false, error: "Workout plan not found." };
  }

  if (existingDays.length <= 1) {
    return { ok: false, error: "A routine must keep at least one workout plan." };
  }

  const { error: deleteError } = await supabase
    .from("routine_days")
    .delete()
    .eq("id", routineDayId)
    .eq("routine_id", routineId)
    .eq("user_id", user.id);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  const remainingDayIds = existingDays
    .filter((day) => day.id !== routineDayId)
    .sort((left, right) => left.day_index - right.day_index)
    .map((day) => day.id);

  const reorderError = await reindexRoutineDaysDirect({
    supabase,
    routineId,
    userId: user.id,
    orderedRoutineDayIds: remainingDayIds,
  });

  if (reorderError) {
    return { ok: false, error: reorderError.message };
  }

  const { error: routineUpdateError } = await supabase
    .from("routines")
    .update({
      cycle_length_days: remainingDayIds.length,
      updated_at: new Date().toISOString(),
    })
    .eq("id", routineId)
    .eq("user_id", user.id);

  if (routineUpdateError) {
    return { ok: false, error: routineUpdateError.message };
  }

  revalidateRoutinesViews();
  revalidatePath(getRoutineHomePath(routineId));
  revalidatePath(getRoutineEditPath(routineId));
  return { ok: true };
}

export async function duplicateRoutineDayAction(formData: FormData): Promise<DuplicateRoutineDayResult> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const routineId = String(formData.get("routineId") ?? "").trim();
  const sourceRoutineDayId = String(formData.get("sourceRoutineDayId") ?? "").trim();
  const workoutPlanTemplateId = String(formData.get("workoutPlanTemplateId") ?? "").trim();

  if (!routineId || (!sourceRoutineDayId && !workoutPlanTemplateId)) {
    return { ok: false, error: "Missing workout plan info." };
  }

  const accessResult = await enforceRoutineAccessForCurrentTier({
    supabase,
    userId: user.id,
    routineId,
  });
  if (!accessResult.ok) return accessResult;

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select("id, user_id, start_date, cycle_length_days")
    .eq("id", routineId)
    .eq("user_id", user.id)
    .single();

  if (routineError || !routine) {
    return { ok: false, error: routineError?.message ?? "Routine not found." };
  }

  const sourceContext = await loadWorkoutPlanTemplateSourceContext({
    supabase,
    userId: user.id,
    routineId,
    workoutPlanTemplateId,
    sourceRoutineDayId,
  });
  if (sourceContext.error || (!sourceContext.template && sourceContext.templateSupported)) {
    return { ok: false, error: sourceContext.error?.message ?? "Source workout plan not found." };
  }
  const sourceDay = sourceContext.sourceDay;

  const appendFormData = new FormData();
  appendFormData.set("routineId", routineId);
  const appendResult = await appendRoutineDayAction(appendFormData);
  if (!appendResult.ok || !appendResult.routineDayId) {
    return { ok: false, error: appendResult.ok ? "Could not create destination workout plan." : appendResult.error ?? "Could not create destination workout plan." };
  }

  const { data: destinationDay, error: destinationDayError } = await supabase
    .from("routine_days")
    .select("id, day_index")
    .eq("id", appendResult.routineDayId)
    .eq("routine_id", routineId)
    .eq("user_id", user.id)
    .single();

  if (destinationDayError || !destinationDay) {
    await rollbackAppendedRoutineDay({
      client: supabase,
      userId: user.id,
      routineId,
      routineDayId: appendResult.routineDayId,
      previousCycleLength: routine.cycle_length_days,
    });
    return { ok: false, error: destinationDayError?.message ?? "Destination workout plan not found." };
  }

  const duplicatedName = resolveDuplicatedRoutineDayName({
    sourceDayName: sourceDay?.name ?? sourceContext.template?.name,
    sourceDayIndex: sourceDay?.day_index ?? destinationDay.day_index,
    sourceRoutineStartDate: sourceContext.sourceRoutineStartDate ?? routine.start_date,
    destinationDayIndex: destinationDay.day_index,
  });

  if (!sourceContext.templateSupported || !sourceContext.template) {
    let { error: destinationUpdateError } = await supabase
      .from("routine_days")
      .update({
        name: duplicatedName,
        is_rest: Boolean(sourceDay?.is_rest),
        is_optional: Boolean(sourceDay?.is_optional) && !Boolean(sourceDay?.is_rest),
        notes: sourceDay?.notes ?? null,
        duplicate_source_routine_day_id: sourceDay?.duplicate_source_routine_day_id ?? sourceDay?.id ?? null,
      })
      .eq("id", destinationDay.id)
      .eq("routine_id", routineId)
      .eq("user_id", user.id);

    if (destinationUpdateError && isMissingRoutineDayDuplicateSourceColumnError(destinationUpdateError)) {
      const fallback = await supabase
        .from("routine_days")
        .update(omitRoutineDayDuplicateSourceColumn({
          name: duplicatedName,
          is_rest: Boolean(sourceDay?.is_rest),
          is_optional: Boolean(sourceDay?.is_optional) && !Boolean(sourceDay?.is_rest),
          notes: sourceDay?.notes ?? null,
          duplicate_source_routine_day_id: sourceDay?.duplicate_source_routine_day_id ?? sourceDay?.id ?? null,
        }))
        .eq("id", destinationDay.id)
        .eq("routine_id", routineId)
        .eq("user_id", user.id);
      destinationUpdateError = fallback.error;
    }

    if (destinationUpdateError) {
      await rollbackAppendedRoutineDay({
        client: supabase,
        userId: user.id,
        routineId,
        routineDayId: destinationDay.id,
        previousCycleLength: destinationDay.day_index - 1,
      });
      return { ok: false, error: destinationUpdateError.message };
    }

    const legacyCloneResult = await cloneLegacyRoutineDayExercisesIntoDestination({
      supabase,
      userId: user.id,
      targetRoutineDayId: destinationDay.id,
      sourceExercises: sourceContext.sourceDayExercises,
    });

    if (legacyCloneResult.error) {
      await rollbackAppendedRoutineDay({
        client: supabase,
        userId: user.id,
        routineId,
        routineDayId: destinationDay.id,
        previousCycleLength: destinationDay.day_index - 1,
      });
      return { ok: false, error: legacyCloneResult.error.message };
    }

    revalidateRoutinesViews();
    revalidatePath(getRoutineHomePath(routineId));
    revalidatePath(getRoutineEditPath(routineId));
    return { ok: true, routineDayId: destinationDay.id };
  }

  let { error: destinationUpdateError } = await supabase
    .from("routine_days")
    .update({
      name: duplicatedName,
      is_rest: sourceContext.template.is_rest,
      is_optional: Boolean(sourceDay?.is_optional) && !sourceContext.template.is_rest,
      notes: sourceDay?.notes ?? null,
      duplicate_source_routine_day_id: sourceDay?.duplicate_source_routine_day_id ?? sourceDay?.id ?? sourceContext.template.source_routine_day_id ?? null,
      workout_plan_template_id: sourceContext.template.id,
      workout_plan_template_edit_choice_required: true,
    })
    .eq("id", destinationDay.id)
    .eq("routine_id", routineId)
    .eq("user_id", user.id);

  if (
    destinationUpdateError
    && (
      isMissingRoutineDayDuplicateSourceColumnError(destinationUpdateError)
      || destinationUpdateError.message?.toLowerCase().includes("workout_plan_template_")
    )
  ) {
    const fallback = await supabase
      .from("routine_days")
        .update(omitRoutineDayTemplateColumns(omitRoutineDayDuplicateSourceColumn({
          name: duplicatedName,
          is_rest: sourceContext.template.is_rest,
          is_optional: Boolean(sourceDay?.is_optional) && !sourceContext.template.is_rest,
          notes: sourceDay?.notes ?? null,
          duplicate_source_routine_day_id: sourceDay?.duplicate_source_routine_day_id ?? sourceDay?.id ?? sourceContext.template.source_routine_day_id ?? null,
          workout_plan_template_id: sourceContext.template.id,
          workout_plan_template_edit_choice_required: true,
        })))
      .eq("id", destinationDay.id)
      .eq("routine_id", routineId)
      .eq("user_id", user.id);
    destinationUpdateError = fallback.error;
  }

  if (destinationUpdateError) {
    await rollbackAppendedRoutineDay({
      client: supabase,
      userId: user.id,
      routineId,
      routineDayId: destinationDay.id,
      previousCycleLength: destinationDay.day_index - 1,
    });
    return { ok: false, error: destinationUpdateError.message };
  }

  const editChoiceResult = await updateLinkedWorkoutPlanChoiceRequirement({
    supabase,
    userId: user.id,
    templateId: sourceContext.template.id,
    editChoiceRequired: true,
    fallbackRoutineDayIds: [destinationDay.id],
  });

  if (editChoiceResult.error) {
    await rollbackAppendedRoutineDay({
      client: supabase,
      userId: user.id,
      routineId,
      routineDayId: destinationDay.id,
      previousCycleLength: destinationDay.day_index - 1,
    });
    return { ok: false, error: editChoiceResult.error.message };
  }

  const templateCloneResult = await cloneWorkoutPlanIntoRoutineDay({
    supabase,
    userId: user.id,
    templateId: sourceContext.template.id,
    targetRoutineDayId: destinationDay.id,
  });

  if (templateCloneResult.error) {
    await rollbackAppendedRoutineDay({
      client: supabase,
      userId: user.id,
      routineId,
      routineDayId: destinationDay.id,
      previousCycleLength: destinationDay.day_index - 1,
    });
    return { ok: false, error: templateCloneResult.error.message };
  }

  revalidateRoutinesViews();
  revalidatePath(getRoutineHomePath(routineId));
  revalidatePath(getRoutineEditPath(routineId));
  return { ok: true, routineDayId: destinationDay.id };
}

export async function populateRoutineDayFromSourceAction(formData: FormData): Promise<PopulateRoutineDayResult> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const routineId = String(formData.get("routineId") ?? "").trim();
  const targetRoutineDayId = String(formData.get("targetRoutineDayId") ?? "").trim();
  const sourceRoutineDayId = String(formData.get("sourceRoutineDayId") ?? "").trim();
  const workoutPlanTemplateId = String(formData.get("workoutPlanTemplateId") ?? "").trim();

  if (!routineId || !targetRoutineDayId || (!sourceRoutineDayId && !workoutPlanTemplateId)) {
    return { ok: false, error: "Missing workout plan info." };
  }

  const accessResult = await enforceRoutineAccessForCurrentTier({
    supabase,
    userId: user.id,
    routineId,
  });
  if (!accessResult.ok) return accessResult;

  const { data: targetDay, error: targetDayError } = await loadRoutineDayWithDuplicateSourceCompat({
    supabase,
    routineDayId: targetRoutineDayId,
    routineId,
    userId: user.id,
  });

  if (targetDayError || !targetDay) {
    return { ok: false, error: targetDayError?.message ?? "Target workout plan not found." };
  }

  const { data: existingTargetExercises, error: existingTargetExercisesError } = await supabase
    .from("routine_day_exercises")
    .select("id")
    .eq("routine_day_id", targetRoutineDayId)
    .eq("user_id", user.id)
    .limit(1);

  if (existingTargetExercisesError) {
    return { ok: false, error: existingTargetExercisesError.message };
  }

  if ((existingTargetExercises ?? []).length > 0) {
    return { ok: false, error: "This workout plan already has exercises." };
  }

  const sourceContext = await loadWorkoutPlanTemplateSourceContext({
    supabase,
    userId: user.id,
    routineId,
    workoutPlanTemplateId,
    sourceRoutineDayId,
  });
  if (sourceContext.error || (!sourceContext.template && sourceContext.templateSupported)) {
    return { ok: false, error: sourceContext.error?.message ?? "Source workout plan not found." };
  }
  const sourceDay = sourceContext.sourceDay;

  const duplicatedName = resolveDuplicatedRoutineDayName({
    sourceDayName: sourceDay?.name ?? sourceContext.template?.name,
    sourceDayIndex: sourceDay?.day_index ?? targetDay.day_index,
    sourceRoutineStartDate: sourceContext.sourceRoutineStartDate,
    destinationDayIndex: targetDay.day_index,
  });

  if (!sourceContext.templateSupported || !sourceContext.template) {
    let { error: destinationUpdateError } = await supabase
      .from("routine_days")
      .update({
        name: duplicatedName,
        is_rest: Boolean(sourceDay?.is_rest),
        is_optional: Boolean(sourceDay?.is_optional) && !Boolean(sourceDay?.is_rest),
        notes: sourceDay?.notes ?? null,
        duplicate_source_routine_day_id: sourceDay?.duplicate_source_routine_day_id ?? sourceDay?.id ?? null,
      })
      .eq("id", targetDay.id)
      .eq("routine_id", routineId)
      .eq("user_id", user.id);

    if (destinationUpdateError && isMissingRoutineDayDuplicateSourceColumnError(destinationUpdateError)) {
      const fallback = await supabase
        .from("routine_days")
        .update(omitRoutineDayDuplicateSourceColumn({
          name: duplicatedName,
          is_rest: Boolean(sourceDay?.is_rest),
          is_optional: Boolean(sourceDay?.is_optional) && !Boolean(sourceDay?.is_rest),
          notes: sourceDay?.notes ?? null,
          duplicate_source_routine_day_id: sourceDay?.duplicate_source_routine_day_id ?? sourceDay?.id ?? null,
        }))
        .eq("id", targetDay.id)
        .eq("routine_id", routineId)
        .eq("user_id", user.id);
      destinationUpdateError = fallback.error;
    }

    if (destinationUpdateError) {
      return { ok: false, error: destinationUpdateError.message };
    }

    const legacyCloneResult = await cloneLegacyRoutineDayExercisesIntoDestination({
      supabase,
      userId: user.id,
      targetRoutineDayId: targetDay.id,
      sourceExercises: sourceContext.sourceDayExercises,
    });

    if (legacyCloneResult.error) {
      await supabase
        .from("routine_day_exercises")
        .delete()
        .eq("routine_day_id", targetDay.id)
        .eq("user_id", user.id);
      return { ok: false, error: legacyCloneResult.error.message };
    }

    revalidateRoutinesViews();
    revalidatePath(getRoutineHomePath(routineId));
    revalidatePath(getRoutineEditPath(routineId));
    return { ok: true, routineDayId: targetDay.id };
  }

  let { error: destinationUpdateError } = await supabase
    .from("routine_days")
    .update({
      name: duplicatedName,
      is_rest: sourceContext.template.is_rest,
      is_optional: Boolean(sourceDay?.is_optional) && !sourceContext.template.is_rest,
      notes: sourceDay?.notes ?? null,
      duplicate_source_routine_day_id: sourceDay?.duplicate_source_routine_day_id ?? sourceDay?.id ?? sourceContext.template.source_routine_day_id ?? null,
      workout_plan_template_id: sourceContext.template.id,
      workout_plan_template_edit_choice_required: true,
    })
    .eq("id", targetDay.id)
    .eq("routine_id", routineId)
    .eq("user_id", user.id);

  if (
    destinationUpdateError
    && (
      isMissingRoutineDayDuplicateSourceColumnError(destinationUpdateError)
      || destinationUpdateError.message?.toLowerCase().includes("workout_plan_template_")
    )
  ) {
    const fallback = await supabase
      .from("routine_days")
        .update(omitRoutineDayTemplateColumns(omitRoutineDayDuplicateSourceColumn({
          name: duplicatedName,
          is_rest: sourceContext.template.is_rest,
          is_optional: Boolean(sourceDay?.is_optional) && !sourceContext.template.is_rest,
          notes: sourceDay?.notes ?? null,
          duplicate_source_routine_day_id: sourceDay?.duplicate_source_routine_day_id ?? sourceDay?.id ?? sourceContext.template.source_routine_day_id ?? null,
          workout_plan_template_id: sourceContext.template.id,
          workout_plan_template_edit_choice_required: true,
        })))
      .eq("id", targetDay.id)
      .eq("routine_id", routineId)
      .eq("user_id", user.id);
    destinationUpdateError = fallback.error;
  }

  if (destinationUpdateError) {
    return { ok: false, error: destinationUpdateError.message };
  }

  const editChoiceResult = await updateLinkedWorkoutPlanChoiceRequirement({
    supabase,
    userId: user.id,
    templateId: sourceContext.template.id,
    editChoiceRequired: true,
    fallbackRoutineDayIds: [targetDay.id],
  });

  if (editChoiceResult.error) {
    let restoreResult = await supabase
      .from("routine_days")
      .update({
        name: targetDay.name,
        is_rest: targetDay.is_rest,
        is_optional: Boolean(targetDay.is_optional),
        notes: targetDay.notes,
        duplicate_source_routine_day_id: targetDay.duplicate_source_routine_day_id ?? null,
        workout_plan_template_id: targetDay.workout_plan_template_id ?? null,
        workout_plan_template_edit_choice_required: targetDay.workout_plan_template_edit_choice_required ?? false,
      })
      .eq("id", targetDay.id)
      .eq("routine_id", routineId)
      .eq("user_id", user.id);
    if (restoreResult.error) {
      restoreResult = await supabase
        .from("routine_days")
        .update(omitRoutineDayTemplateColumns(omitRoutineDayDuplicateSourceColumn({
          name: targetDay.name,
          is_rest: targetDay.is_rest,
          is_optional: Boolean(targetDay.is_optional),
          notes: targetDay.notes,
          duplicate_source_routine_day_id: targetDay.duplicate_source_routine_day_id ?? null,
          workout_plan_template_id: targetDay.workout_plan_template_id ?? null,
          workout_plan_template_edit_choice_required: targetDay.workout_plan_template_edit_choice_required ?? false,
        })))
        .eq("id", targetDay.id)
        .eq("routine_id", routineId)
        .eq("user_id", user.id);
    }
    return { ok: false, error: editChoiceResult.error.message };
  }

  const templateCloneResult = await cloneWorkoutPlanIntoRoutineDay({
    supabase,
    userId: user.id,
    templateId: sourceContext.template.id,
    targetRoutineDayId: targetDay.id,
  });

  if (templateCloneResult.error) {
    await supabase
      .from("routine_day_exercises")
      .delete()
      .eq("routine_day_id", targetDay.id)
      .eq("user_id", user.id);
    let restoreResult = await supabase
      .from("routine_days")
      .update({
        name: targetDay.name,
        is_rest: targetDay.is_rest,
        is_optional: Boolean(targetDay.is_optional),
        notes: targetDay.notes,
        duplicate_source_routine_day_id: targetDay.duplicate_source_routine_day_id ?? null,
        workout_plan_template_id: targetDay.workout_plan_template_id ?? null,
        workout_plan_template_edit_choice_required: targetDay.workout_plan_template_edit_choice_required ?? false,
      })
      .eq("id", targetDay.id)
      .eq("routine_id", routineId)
      .eq("user_id", user.id);
    if (restoreResult.error) {
      restoreResult = await supabase
        .from("routine_days")
        .update(omitRoutineDayTemplateColumns(omitRoutineDayDuplicateSourceColumn({
          name: targetDay.name,
          is_rest: targetDay.is_rest,
          is_optional: Boolean(targetDay.is_optional),
          notes: targetDay.notes,
          duplicate_source_routine_day_id: targetDay.duplicate_source_routine_day_id ?? null,
          workout_plan_template_id: targetDay.workout_plan_template_id ?? null,
          workout_plan_template_edit_choice_required: targetDay.workout_plan_template_edit_choice_required ?? false,
        })))
        .eq("id", targetDay.id)
        .eq("routine_id", routineId)
        .eq("user_id", user.id);
    }
    return { ok: false, error: templateCloneResult.error.message };
  }

  revalidateRoutinesViews();
  revalidatePath(getRoutineHomePath(routineId));
  revalidatePath(getRoutineEditPath(routineId));
  return { ok: true, routineDayId: targetDay.id };
}

async function loadOwnedRoutineForCopy(args: {
  supabase: ReturnType<typeof supabaseServer>;
  routineId: string;
  userId: string;
}) {
  const { data: routineWithDefaults, error: routineWithDefaultsError } = await args.supabase
    .from("routines")
    .select(ROUTINE_COPY_SELECT_WITH_DEFAULT_PROGRESSION)
    .eq("id", args.routineId)
    .eq("user_id", args.userId)
    .single();

  if (!routineWithDefaultsError) {
    return { data: routineWithDefaults, error: null };
  }

  if (!isMissingRoutineDefaultProgressionColumnError(routineWithDefaultsError)) {
    return { data: null, error: routineWithDefaultsError };
  }

  const fallback = await args.supabase
    .from("routines")
    .select(ROUTINE_COPY_SELECT_LEGACY)
    .eq("id", args.routineId)
    .eq("user_id", args.userId)
    .single();

  return { data: fallback.data, error: fallback.error };
}

export async function duplicateRoutineAction(formData: FormData): Promise<CreateRoutineResult> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const sourceRoutineId = String(formData.get("sourceRoutineId") ?? "").trim();
  const requestedName = String(formData.get("name") ?? "").trim().slice(0, 15);

  if (!sourceRoutineId) {
    return { ok: false, error: "Missing routine info." };
  }

  const { data: sourceRoutine, error: sourceRoutineError } = await loadOwnedRoutineForCopy({
    supabase,
    routineId: sourceRoutineId,
    userId: user.id,
  });

  if (sourceRoutineError || !sourceRoutine) {
    return { ok: false, error: sourceRoutineError?.message ?? "Source routine not found." };
  }

  const routineCapacity = await enforceRoutineCapacityForCreate({
    supabase,
    userId: user.id,
  });
  if (!routineCapacity.ok) return routineCapacity;

  const { data: existingRoutines, error: existingRoutinesError } = await supabase
    .from("routines")
    .select("name")
    .eq("user_id", user.id);

  if (existingRoutinesError) {
    return { ok: false, error: existingRoutinesError.message };
  }

  const routineName = resolveUniqueRoutineCopyName({
    sourceName: sourceRoutine.name,
    requestedName,
    existingNames: (existingRoutines ?? []).map((routine) => routine.name),
  });

  const routinePayload = {
    user_id: user.id,
    name: routineName,
    cycle_length_days: sourceRoutine.cycle_length_days,
    schedule_mode: sourceRoutine.schedule_mode ?? "weekday_anchored",
    timezone: sourceRoutine.timezone,
    start_date: sourceRoutine.start_date,
    weight_unit: sourceRoutine.weight_unit ?? "lbs",
    default_progression_playbook_id: "default_progression_playbook_id" in sourceRoutine
      ? sourceRoutine.default_progression_playbook_id ?? null
      : null,
    default_progression_playbook_config: "default_progression_playbook_config" in sourceRoutine
      ? sourceRoutine.default_progression_playbook_config ?? null
      : null,
  };

  let { data: duplicatedRoutine, error: duplicatedRoutineError } = await supabase
    .from("routines")
    .insert(routinePayload)
    .select("id")
    .single();

  if (
    duplicatedRoutineError
    && isMissingRoutineDefaultProgressionColumnError(duplicatedRoutineError)
    && !selectedRoutineDefaultProgressionPlaybook(routinePayload)
  ) {
    const fallback = await supabase
      .from("routines")
      .insert(omitRoutineDefaultProgressionColumns(routinePayload))
      .select("id")
      .single();
    duplicatedRoutine = fallback.data;
    duplicatedRoutineError = fallback.error;
  }

  if (
    duplicatedRoutineError
    && isMissingRoutineDefaultProgressionColumnError(duplicatedRoutineError)
    && selectedRoutineDefaultProgressionPlaybook(routinePayload)
  ) {
    return {
      ok: false,
      error: getSchemaMismatchMessage(duplicatedRoutineError, {
        operation: "duplicate routine progression default",
        progressionMigration: "046",
      }) ?? "Progression schema is missing. Apply migration 046.",
    };
  }

  if (duplicatedRoutineError || !duplicatedRoutine) {
    return { ok: false, error: duplicatedRoutineError?.message ?? "Could not duplicate routine." };
  }

  const sourceDaysResult = await loadRoutineDaysWithWorkoutPlanCompat({
    supabase,
    userId: user.id,
    routineId: sourceRoutineId,
  });

  if (sourceDaysResult.error) {
    await rollbackDuplicatedRoutine({
      client: supabase,
      userId: user.id,
      routineId: duplicatedRoutine.id,
    });
    return { ok: false, error: sourceDaysResult.error.message };
  }

  const sourceDays = (sourceDaysResult.data as Array<{
    id: string;
    day_index: number;
    name?: string | null;
    is_rest?: boolean | null;
    notes?: string | null;
    duplicate_source_routine_day_id?: string | null;
    workout_plan_template_id?: string | null;
    workout_plan_template_edit_choice_required?: boolean | null;
  }>);

  const copiedDayRows = sourceDays.map((day) => ({
    user_id: user.id,
    routine_id: duplicatedRoutine.id,
    day_index: day.day_index,
    name: day.name,
    is_rest: day.is_rest,
    notes: day.notes,
    duplicate_source_routine_day_id: day.duplicate_source_routine_day_id ?? day.id,
    workout_plan_template_id: day.workout_plan_template_id ?? null,
    workout_plan_template_edit_choice_required: day.workout_plan_template_edit_choice_required ?? false,
  }));

  let { data: copiedDays, error: copiedDaysError } = copiedDayRows.length > 0
    ? await supabase
        .from("routine_days")
        .insert(copiedDayRows)
        .select("id, day_index")
        .order("day_index", { ascending: true })
    : { data: [] as Array<{ id: string; day_index: number }>, error: null };

  if (
    copiedDaysError
    && (
      isMissingRoutineDayDuplicateSourceColumnError(copiedDaysError)
      || copiedDaysError.message?.toLowerCase().includes("workout_plan_template_")
    )
  ) {
    const fallback = copiedDayRows.length > 0
      ? await supabase
          .from("routine_days")
          .insert(copiedDayRows.map((day) => omitRoutineDayTemplateColumns(omitRoutineDayDuplicateSourceColumn(day))))
          .select("id, day_index")
          .order("day_index", { ascending: true })
      : { data: [] as Array<{ id: string; day_index: number }>, error: null };
    copiedDays = fallback.data;
    copiedDaysError = fallback.error;
  }

  if (copiedDaysError) {
    await rollbackDuplicatedRoutine({
      client: supabase,
      userId: user.id,
      routineId: duplicatedRoutine.id,
    });
    return { ok: false, error: copiedDaysError.message };
  }

  const destinationDayIdBySourceDayId = new Map<string, string>();
  for (const sourceDay of sourceDays) {
    const copiedDay = copiedDays?.find((candidate) => candidate.day_index === sourceDay.day_index);
    if (copiedDay) {
      destinationDayIdBySourceDayId.set(sourceDay.id, copiedDay.id);
    }
  }

  const sourceDayIds = sourceDays.map((day) => day.id);
  const { data: sourceExercisesWithProgression, error: sourceExercisesWithProgressionError } = sourceDayIds.length > 0
    ? await supabase
        .from("routine_day_exercises")
        .select(ROUTINE_DAY_EXERCISE_ROUTINE_COPY_SELECT_WITH_PROGRESSION)
        .in("routine_day_id", sourceDayIds)
        .eq("user_id", user.id)
        .order("position", { ascending: true })
    : { data: [], error: null };
  const sourceExercisesLegacyFallback = sourceExercisesWithProgressionError && isMissingProgressionPlaybookColumnError(sourceExercisesWithProgressionError)
    ? await supabase
        .from("routine_day_exercises")
        .select(ROUTINE_DAY_EXERCISE_ROUTINE_COPY_SELECT_LEGACY)
        .in("routine_day_id", sourceDayIds)
        .eq("user_id", user.id)
        .order("position", { ascending: true })
    : null;
  const sourceExercisesLegacy = sourceExercisesLegacyFallback?.data ?? null;
  const sourceExercisesLegacyError = sourceExercisesLegacyFallback?.error ?? null;

  if (sourceExercisesWithProgressionError && !isMissingProgressionPlaybookColumnError(sourceExercisesWithProgressionError)) {
    await rollbackDuplicatedRoutine({
      client: supabase,
      userId: user.id,
      routineId: duplicatedRoutine.id,
      copiedDayIds: copiedDays?.map((day) => day.id) ?? [],
    });
    return { ok: false, error: sourceExercisesWithProgressionError.message };
  }

  if (sourceExercisesLegacyError) {
    await rollbackDuplicatedRoutine({
      client: supabase,
      userId: user.id,
      routineId: duplicatedRoutine.id,
      copiedDayIds: copiedDays?.map((day) => day.id) ?? [],
    });
    return { ok: false, error: sourceExercisesLegacyError.message };
  }

  const sourceExercises = sourceExercisesWithProgression ?? sourceExercisesLegacy ?? [];
  if (sourceExercises.length > 0) {
    const copiedExercises = sourceExercises.flatMap((exercise) => {
      const destinationDayId = destinationDayIdBySourceDayId.get(exercise.routine_day_id);
      if (!destinationDayId) {
        return [];
      }

      return [{
        ...exercise,
        user_id: user.id,
        routine_day_id: destinationDayId,
      }];
    });

    let { error: copyExercisesError } = await supabase
      .from("routine_day_exercises")
      .insert(copiedExercises);

    if (copyExercisesError && isMissingProgressionPlaybookColumnError(copyExercisesError)) {
      const fallback = await supabase
        .from("routine_day_exercises")
        .insert(copiedExercises.map((exercise) => omitProgressionPlaybookColumns(exercise)));
      copyExercisesError = fallback.error;
    }

    if (copyExercisesError) {
      await rollbackDuplicatedRoutine({
        client: supabase,
        userId: user.id,
        routineId: duplicatedRoutine.id,
        copiedDayIds: copiedDays?.map((day) => day.id) ?? [],
      });
      return { ok: false, error: copyExercisesError.message };
    }
  }

  revalidateRoutinesViews();
  revalidatePath(getRoutineHomePath(duplicatedRoutine.id));
  revalidatePath(getRoutineEditPath(duplicatedRoutine.id));
  return { ok: true, routineId: duplicatedRoutine.id, firstDayId: copiedDays?.[0]?.id };
}

export async function reorderRoutineDaysAction(formData: FormData): Promise<ReorderRoutineDaysResult> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const routineId = String(formData.get("routineId") ?? "").trim();
  const orderedRoutineDayIds = String(formData.get("orderedRoutineDayIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!routineId || orderedRoutineDayIds.length === 0) {
    return { ok: false, error: "Missing reorder info." };
  }

  const accessResult = await enforceRoutineAccessForCurrentTier({
    supabase,
    userId: user.id,
    routineId,
  });
  if (!accessResult.ok) return accessResult;

  const { data: existingDays, error: existingDaysError } = await supabase
    .from("routine_days")
    .select("id")
    .eq("routine_id", routineId)
    .eq("user_id", user.id)
    .order("day_index", { ascending: true });

  if (existingDaysError) {
    return { ok: false, error: existingDaysError.message };
  }

  const existingDayIds = (existingDays ?? []).map((day) => day.id);
  if (
    existingDayIds.length !== orderedRoutineDayIds.length
    || existingDayIds.some((dayId) => !orderedRoutineDayIds.includes(dayId))
  ) {
    return { ok: false, error: "Invalid reorder payload." };
  }

  const { error } = await supabase.rpc("reorder_routine_days", {
    target_routine_id: routineId,
    target_user_id: user.id,
    ordered_routine_day_ids: orderedRoutineDayIds,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateRoutinesViews();
  revalidatePath(getRoutineHomePath(routineId));
  revalidatePath(getRoutineEditPath(routineId));
  return { ok: true };
}

export async function createRoutineDayAction(formData: FormData): Promise<CreateRoutineDayResult> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const routineId = String(formData.get("routineId") ?? "").trim();
  const creationMode = String(formData.get("creationMode") ?? "blank").trim();
  const sourceRoutineDayId = String(formData.get("sourceRoutineDayId") ?? "").trim();
  const workoutPlanTemplateId = String(formData.get("workoutPlanTemplateId") ?? "").trim();
  const requestedName = String(formData.get("name") ?? "").trim();
  const blankModeIsRest = formData.get("isRest") === "on";

  if (!routineId) {
    return { ok: false, error: "Missing routine ID." };
  }

  const accessResult = await enforceRoutineAccessForCurrentTier({
    supabase,
    userId: user.id,
    routineId,
  });
  if (!accessResult.ok) return accessResult;

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select("id, cycle_length_days")
    .eq("id", routineId)
    .eq("user_id", user.id)
    .single();

  if (routineError || !routine) {
    return { ok: false, error: routineError?.message ?? "Routine not found." };
  }

  if (creationMode !== "blank" && creationMode !== "duplicate") {
    return { ok: false, error: "Invalid workout plan creation mode." };
  }

  const actionFormData = new FormData();
  actionFormData.set("routineId", routineId);
  if (creationMode === "duplicate") {
    actionFormData.set("sourceRoutineDayId", sourceRoutineDayId);
    if (workoutPlanTemplateId) {
      actionFormData.set("workoutPlanTemplateId", workoutPlanTemplateId);
    }
  }

  const routineDayResult = creationMode === "duplicate"
    ? await duplicateRoutineDayAction(actionFormData)
    : await appendRoutineDayAction(actionFormData);

  if (!routineDayResult.ok || !routineDayResult.routineDayId) {
    return {
      ok: false,
      error: routineDayResult.ok ? "Could not create workout plan." : routineDayResult.error ?? "Could not create workout plan.",
    };
  }

  if (!shouldApplyRoutineDayCreationOverrides({
    creationMode: creationMode as "blank" | "duplicate",
    requestedName,
    blankModeIsRest,
  })) {
    return { ok: true, routineDayId: routineDayResult.routineDayId };
  }

  const { data: createdDay, error: createdDayError } = await supabase
    .from("routine_days")
    .select("id, day_index, is_rest, name")
    .eq("id", routineDayResult.routineDayId)
    .eq("routine_id", routineId)
    .eq("user_id", user.id)
    .single();

  if (createdDayError || !createdDay) {
    await rollbackAppendedRoutineDay({
      client: supabase,
      userId: user.id,
      routineId,
      routineDayId: routineDayResult.routineDayId,
      previousCycleLength: routine.cycle_length_days,
    });
    return { ok: false, error: createdDayError?.message ?? "Created workout plan not found." };
  }

  const resolvedOverrides = resolveRoutineDayCreationOverrides({
    creationMode: creationMode as "blank" | "duplicate",
    requestedName,
    blankModeIsRest,
    createdDay,
  });

  const { error: updateError } = await supabase
    .from("routine_days")
    .update({
      name: resolvedOverrides.nextName,
      is_rest: resolvedOverrides.nextIsRest,
    })
    .eq("id", createdDay.id)
    .eq("routine_id", routineId)
    .eq("user_id", user.id);

  if (updateError) {
    await rollbackAppendedRoutineDay({
      client: supabase,
      userId: user.id,
      routineId,
      routineDayId: createdDay.id,
      previousCycleLength: routine.cycle_length_days,
    });
    return { ok: false, error: updateError.message };
  }

  revalidateRoutinesViews();
  revalidatePath(getRoutineHomePath(routineId));
  revalidatePath(getRoutineEditPath(routineId));
  return { ok: true, routineDayId: createdDay.id };
}

function isMissingProfilePreferenceColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  const referencesPreferenceColumn =
    message.includes("preferred_weight_unit") || message.includes("preferred_distance_unit");
  const referencesProfilesTable = message.includes("profiles");
  const schemaCacheMissingColumn = message.includes("schema cache");
  const postgresMissingColumn =
    message.includes("column") && message.includes("does not exist") && referencesProfilesTable;

  return (
    referencesPreferenceColumn &&
    referencesProfilesTable &&
    (schemaCacheMissingColumn || postgresMissingColumn)
  );
}

function parseRoutinePreviewDays(formData: FormData) {
  const raw = String(formData.get("previewDays") ?? "").trim();
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry, index) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const candidate = entry as { isRest?: unknown };
        return {
          dayIndex: index + 1,
          isRest: candidate.isRest === true,
        };
      })
      .filter((entry): entry is { dayIndex: number; isRest: boolean } => entry !== null);
  } catch {
    return [];
  }
}

function parseRoutineForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const cycleLengthDays = Number(formData.get("cycleLengthDays"));
  const timezone = String(formData.get("timezone") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const startWeekday = String(formData.get("startWeekday") ?? "").trim().toLowerCase();
  const scheduleMode = String(formData.get("scheduleMode") ?? "weekday_anchored").trim();
  const weightUnit = String(formData.get("weightUnit") ?? "lbs").trim();
  const distanceUnit = String(formData.get("distanceUnit") ?? "mi").trim();

  if (!name || !timezone || (!startDate && !startWeekday)) {
    return { ok: false as const, error: "Routine name, timezone, and cycle start date are required." };
  }
  if (!startDate && !ROUTINE_START_WEEKDAYS.includes(startWeekday as (typeof ROUTINE_START_WEEKDAYS)[number])) {
    return { ok: false as const, error: "Please select a valid start weekday." };
  }
  const canonicalTimezone = toCanonicalRoutineTimezone(timezone);
  if (!canonicalTimezone) {
    return { ok: false as const, error: "Please select a supported timezone." };
  }
  if (!Number.isInteger(cycleLengthDays) || cycleLengthDays < 1 || cycleLengthDays > 365) {
    return { ok: false as const, error: "Cycle length must be between 1 and 365." };
  }
  if (!ROUTINE_SCHEDULE_MODE_VALUES.includes(scheduleMode as RoutineDetailsScheduleMode)) {
    return { ok: false as const, error: "Please select a valid schedule mode." };
  }
  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return { ok: false as const, error: "Please select a valid cycle start date." };
  }
  if (weightUnit !== "lbs" && weightUnit !== "kg") {
    return { ok: false as const, error: "Weight unit must be lbs or kg." };
  }
  if (distanceUnit !== "mi" && distanceUnit !== "km") {
    return { ok: false as const, error: "Distance unit must be mi or km." };
  }

  const progression = parseProgressionPlaybookPayload(formData);
  if (!progression.ok) {
    return progression;
  }

  return {
    ok: true as const,
    payload: {
      name,
      cycleLengthDays,
      scheduleMode: scheduleMode as RoutineDetailsScheduleMode,
      canonicalTimezone,
      startDate,
      startWeekday: startWeekday as (typeof ROUTINE_START_WEEKDAYS)[number],
      weightUnit,
      distanceUnit,
      defaultProgressionPlaybookId: progression.playbookId,
      defaultProgressionPlaybookConfig: progression.config,
    },
  };
}

function selectedRoutineDefaultProgressionPlaybook(payload: {
  defaultProgressionPlaybookId?: unknown;
  default_progression_playbook_id?: unknown;
}) {
  const selectedPlaybookId =
    payload.defaultProgressionPlaybookId ?? payload.default_progression_playbook_id;

  return typeof selectedPlaybookId === "string" && selectedPlaybookId.length > 0;
}

function routineDefaultProgressionChanged(args: {
  existingPlaybookId?: string | null;
  existingConfig?: Record<string, unknown> | null;
  nextPlaybookId?: string | null;
  nextConfig?: Record<string, unknown> | null;
}) {
  return (
    (args.existingPlaybookId ?? null) !== (args.nextPlaybookId ?? null)
    || JSON.stringify(args.existingConfig ?? null) !== JSON.stringify(args.nextConfig ?? null)
  );
}

function normalizeStretchValue(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isStretchExerciseMetadata(exercise: {
  name?: string | null;
  slug?: string | null;
  primary_muscle?: string | null;
} | null | undefined) {
  if (!exercise) return false;
  const normalizedSlug = normalizeStretchValue(exercise.slug);
  if (normalizedSlug === "stretch") return true;
  const normalizedName = normalizeStretchValue(exercise.name);
  if (normalizedName === "stretch") return true;
  return normalizeStretchValue(exercise.primary_muscle) === "recovery" && normalizedName.includes("stretch");
}

async function enforceRoutineCapacityForCreate(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
}): Promise<ActionResult> {
  const proAccess = await loadProAccessSnapshot(args.userId);
  if (proAccess.accessState === "pro") {
    return { ok: true };
  }

  const { count, error } = await args.supabase
    .from("routines")
    .select("id", { count: "exact", head: true })
    .eq("user_id", args.userId);

  if (error) {
    return { ok: false, error: "Could not verify routine capacity." };
  }

  if ((count ?? 0) >= BASE_ROUTINE_LIMIT) {
    return { ok: false, error: ROUTINE_LIMIT_PRO_REQUIRED_MESSAGE };
  }

  return { ok: true };
}

async function enforceRoutineAccessForCurrentTier(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  routineId: string;
}): Promise<ActionResult> {
  const proAccess = await loadProAccessSnapshot(args.userId);
  if (proAccess.accessState === "pro") {
    return { ok: true };
  }

  const [{ data: profile }, { data: routines, error }] = await Promise.all([
    args.supabase
      .from("profiles")
      .select("active_routine_id")
      .eq("id", args.userId)
      .maybeSingle(),
    args.supabase
      .from("routines")
      .select("id, name, updated_at, created_at")
      .eq("user_id", args.userId)
      .order("updated_at", { ascending: false }),
  ]);

  if (error) {
    return { ok: false, error: "Could not verify routine access." };
  }

  const accessibleRoutineIds = selectAccessibleRoutineIdsForTier({
    routines: routines ?? [],
    accessState: proAccess.accessState,
    activeRoutineId: profile?.active_routine_id ?? null,
  });

  if (!accessibleRoutineIds.has(args.routineId)) {
    return { ok: false, error: ROUTINE_LIMIT_PRO_REQUIRED_MESSAGE };
  }

  return { ok: true };
}

async function enforceWorkoutPlanTemplateAccessForCurrentTier(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
  templateId: string;
}): Promise<ActionResult> {
  const proAccess = await loadProAccessSnapshot(args.userId);
  if (proAccess.accessState === "pro") {
    return { ok: true };
  }

  const { data: templates, error } = await args.supabase
    .from("workout_plan_templates")
    .select("id, name, updated_at, created_at")
    .eq("user_id", args.userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return { ok: false, error: "Could not verify workout plan access." };
  }

  const accessibleTemplateIds = selectAccessibleWorkoutPlanTemplateIdsForTier({
    templates: templates ?? [],
    accessState: proAccess.accessState,
  });

  if (!accessibleTemplateIds.has(args.templateId)) {
    return { ok: false, error: WORKOUT_PLAN_LIMIT_PRO_REQUIRED_MESSAGE };
  }

  return { ok: true };
}

async function getSavedWorkoutPlanCapacityError(args: {
  supabase: ReturnType<typeof supabaseServer>;
  userId: string;
}) {
  const proAccess = await loadProAccessSnapshot(args.userId);
  if (proAccess.accessState === "pro") {
    return null;
  }

  const { count, error } = await args.supabase
    .from("workout_plan_templates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", args.userId);

  if (error) {
    if (isMissingWorkoutPlanTableError(error)) {
      return null;
    }

    return new Error("Could not verify workout plan capacity.");
  }

  if ((count ?? 0) >= BASE_SAVED_WORKOUT_PLAN_LIMIT) {
    return new Error(WORKOUT_PLAN_LIMIT_PRO_REQUIRED_MESSAGE);
  }

  return null;
}

export async function createRoutineAction(formData: FormData): Promise<CreateRoutineResult> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const parsed = parseRoutineForm(formData);
  if (!parsed.ok) return parsed;
  const previewDays = parseRoutinePreviewDays(formData);

  const routineCapacity = await enforceRoutineCapacityForCreate({
    supabase,
    userId: user.id,
  });
  if (!routineCapacity.ok) return routineCapacity;

  const startDate = parsed.payload.startDate || getRoutineStartDateForWeekday({
    cycleLengthDays: parsed.payload.cycleLengthDays,
    startWeekday: parsed.payload.startWeekday,
    timeZone: parsed.payload.canonicalTimezone,
  });

  const routinePayload = {
    user_id: user.id,
    name: parsed.payload.name,
    cycle_length_days: parsed.payload.cycleLengthDays,
    schedule_mode: parsed.payload.scheduleMode,
    timezone: parsed.payload.canonicalTimezone,
    start_date: startDate,
    weight_unit: parsed.payload.weightUnit,
    default_progression_playbook_id: parsed.payload.defaultProgressionPlaybookId,
    default_progression_playbook_config: parsed.payload.defaultProgressionPlaybookConfig,
  };

  let { data: routine, error: routineError } = await supabase
    .from("routines")
    .insert(routinePayload)
    .select("id")
    .single();

  if (
    routineError
    && isMissingRoutineDefaultProgressionColumnError(routineError)
    && !selectedRoutineDefaultProgressionPlaybook(parsed.payload)
  ) {
    const fallback = await supabase
      .from("routines")
      .insert(omitRoutineDefaultProgressionColumns(routinePayload))
      .select("id")
      .single();
    routine = fallback.data;
    routineError = fallback.error;
  }

  if (
    routineError
    && isMissingRoutineDefaultProgressionColumnError(routineError)
    && selectedRoutineDefaultProgressionPlaybook(parsed.payload)
  ) {
    return {
      ok: false,
      error: getSchemaMismatchMessage(routineError, {
        operation: "create routine progression default",
        progressionMigration: "046",
      }) ?? "Progression schema is missing. Apply migration 046.",
    };
  }

  if (routineError || !routine) return { ok: false, error: routineError?.message ?? "Could not create routine" };

  const seeds = createRoutineDaySeedsFromStartDate(parsed.payload.cycleLengthDays, user.id, routine.id, startDate);
  const { data: insertedDays, error: daysError } = await supabase
    .from("routine_days")
    .insert(seeds)
    .select("id, day_index")
    .order("day_index", { ascending: true });

  if (daysError) return { ok: false, error: daysError.message };

  if (previewDays.length > 0 && insertedDays && insertedDays.length > 0) {
    for (const day of insertedDays) {
      const previewDay = previewDays.find((candidate) => candidate.dayIndex === day.day_index);
      if (!previewDay) {
        continue;
      }

      const { error: previewUpdateError } = await supabase
        .from("routine_days")
        .update({
          is_rest: previewDay.isRest,
          name: previewDay.isRest ? "Rest Day" : String(day.day_index),
        })
        .eq("id", day.id)
        .eq("routine_id", routine.id)
        .eq("user_id", user.id);

      if (previewUpdateError) {
        return { ok: false, error: previewUpdateError.message };
      }
    }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      preferred_distance_unit: parsed.payload.distanceUnit,
    })
    .eq("id", user.id);

  if (profileError && !isMissingProfilePreferenceColumnError(profileError)) return { ok: false, error: profileError.message };

  revalidateRoutinesViews();
  revalidatePath(getRoutineHomePath(routine.id));
  revalidatePath(getRoutineEditPath(routine.id));

  return {
    ok: true,
    routineId: routine.id,
    firstDayId: insertedDays?.[0]?.id,
    createdDays: insertedDays?.map((day) => ({ id: day.id, dayIndex: day.day_index })) ?? [],
  };
}

export async function updateRoutineAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const routineId = String(formData.get("routineId") ?? "");
  const existingStartDate = String(formData.get("existingStartDate") ?? "").trim() || null;
  const parsed = parseRoutineForm(formData);
  const shouldApplyRoutineDefaultToExercises = String(formData.get("applyRoutineDefaultToExercises") ?? "") === "1";

  if (!routineId) return { ok: false, error: "Routine ID is required." };
  if (!parsed.ok) return parsed;

  const accessResult = await enforceRoutineAccessForCurrentTier({
    supabase,
    userId: user.id,
    routineId,
  });
  if (!accessResult.ok) return accessResult;

  const startDate = parsed.payload.startDate || getRoutineStartDateForWeekday({
    cycleLengthDays: parsed.payload.cycleLengthDays,
    startWeekday: parsed.payload.startWeekday,
    timeZone: parsed.payload.canonicalTimezone,
    existingStartDate,
  });

  const { data: existingRoutine, error: existingRoutineError } = await supabase
    .from("routines")
    .select("cycle_length_days, default_progression_playbook_id, default_progression_playbook_config")
    .eq("id", routineId)
    .eq("user_id", user.id)
    .single();

  if (existingRoutineError || !existingRoutine) return { ok: false, error: existingRoutineError?.message ?? "Routine not found" };

  const defaultProgressionChanged = routineDefaultProgressionChanged({
    existingPlaybookId: existingRoutine.default_progression_playbook_id ?? null,
    existingConfig: existingRoutine.default_progression_playbook_config ?? null,
    nextPlaybookId: parsed.payload.defaultProgressionPlaybookId,
    nextConfig: parsed.payload.defaultProgressionPlaybookConfig,
  });

  const routinePayload = {
    name: parsed.payload.name,
    timezone: parsed.payload.canonicalTimezone,
    start_date: startDate,
    cycle_length_days: parsed.payload.cycleLengthDays,
    schedule_mode: parsed.payload.scheduleMode,
    weight_unit: parsed.payload.weightUnit,
    default_progression_playbook_id: parsed.payload.defaultProgressionPlaybookId,
    default_progression_playbook_config: parsed.payload.defaultProgressionPlaybookConfig,
    updated_at: new Date().toISOString(),
  };

  let { error: routineError } = await supabase
    .from("routines")
    .update(routinePayload)
    .eq("id", routineId)
    .eq("user_id", user.id);

  if (
    routineError
    && isMissingRoutineDefaultProgressionColumnError(routineError)
    && !selectedRoutineDefaultProgressionPlaybook(parsed.payload)
  ) {
    const fallback = await supabase
      .from("routines")
      .update(omitRoutineDefaultProgressionColumns(routinePayload))
      .eq("id", routineId)
      .eq("user_id", user.id);
    routineError = fallback.error;
  }

  if (
    routineError
    && isMissingRoutineDefaultProgressionColumnError(routineError)
    && selectedRoutineDefaultProgressionPlaybook(parsed.payload)
  ) {
    return {
      ok: false,
      error: getSchemaMismatchMessage(routineError, {
        operation: "update routine progression default",
        progressionMigration: "046",
      }) ?? "Progression schema is missing. Apply migration 046.",
    };
  }

  if (routineError) return { ok: false, error: routineError.message };

  if (parsed.payload.cycleLengthDays !== existingRoutine.cycle_length_days) {
    const { data: existingDays, error: daysError } = await supabase
      .from("routine_days")
      .select("id, day_index")
      .eq("routine_id", routineId)
      .eq("user_id", user.id)
      .order("day_index", { ascending: true });

    if (daysError) return { ok: false, error: daysError.message };

    const existingDayIndexes = new Set((existingDays ?? []).map((day) => day.day_index));

    if (parsed.payload.cycleLengthDays > existingRoutine.cycle_length_days) {
      const missingSeeds = createRoutineDaySeedsFromStartDate(parsed.payload.cycleLengthDays, user.id, routineId, startDate)
        .filter((seed) => !existingDayIndexes.has(seed.day_index));
      if (missingSeeds.length > 0) {
        const { error: insertError } = await supabase.from("routine_days").insert(missingSeeds);
        if (insertError) return { ok: false, error: insertError.message };
      }
    }

    if (parsed.payload.cycleLengthDays < existingRoutine.cycle_length_days) {
      const dayIdsToDelete = (existingDays ?? []).filter((day) => day.day_index > parsed.payload.cycleLengthDays).map((day) => day.id);
      if (dayIdsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from("routine_days").delete().in("id", dayIdsToDelete).eq("user_id", user.id);
        if (deleteError) return { ok: false, error: deleteError.message };
      }
    }
  }

  if (shouldApplyRoutineDefaultToExercises) {
    const { data: routineDays, error: routineDaysError } = await supabase
      .from("routine_days")
      .select("id")
      .eq("routine_id", routineId)
      .eq("user_id", user.id);

    if (routineDaysError) return { ok: false, error: routineDaysError.message };

    const routineDayIds = (routineDays ?? []).map((day) => day.id).filter(Boolean);
    if (routineDayIds.length > 0) {
      const { data: exerciseRows, error: exerciseRowsError } = await supabase
        .from("routine_day_exercises")
        .select("id, exercises(name, slug, primary_muscle)")
        .eq("user_id", user.id)
        .in("routine_day_id", routineDayIds);

      if (exerciseRowsError) return { ok: false, error: exerciseRowsError.message };

      const exerciseRowIds = ((exerciseRows ?? []) as Array<{
        id: string;
        exercises?: {
          name?: string | null;
          slug?: string | null;
          primary_muscle?: string | null;
        } | Array<{
          name?: string | null;
          slug?: string | null;
          primary_muscle?: string | null;
        }> | null;
      }>)
        .filter((row) => {
          const exercise = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
          return !isStretchExerciseMetadata(exercise);
        })
        .map((row) => row.id)
        .filter(Boolean);

      if (exerciseRowIds.length > 0) {
        const { error: applyDefaultError } = await supabase
          .from("routine_day_exercises")
          .update({
            progression_playbook_id: parsed.payload.defaultProgressionPlaybookId,
            progression_playbook_config: parsed.payload.defaultProgressionPlaybookConfig,
          })
          .eq("user_id", user.id)
          .in("id", exerciseRowIds);

        if (applyDefaultError && isMissingProgressionPlaybookColumnError(applyDefaultError)) {
          return {
            ok: false,
            error: getSchemaMismatchMessage(applyDefaultError, {
              operation: "apply routine progression default",
              progressionMigration: "045",
            }) ?? "Progression schema is missing. Apply migration 045.",
          };
        }

        if (applyDefaultError) return { ok: false, error: applyDefaultError.message };
      }
    }
  }

  const { error: profilePreferenceError } = await supabase
    .from("profiles")
    .update({ preferred_distance_unit: parsed.payload.distanceUnit })
    .eq("id", user.id);

  if (profilePreferenceError && !isMissingProfilePreferenceColumnError(profilePreferenceError)) {
    return { ok: false, error: profilePreferenceError.message };
  }

  revalidateRoutinesViews();
  revalidatePath(getRoutineHomePath(routineId));
  revalidatePath(getRoutineEditPath(routineId));
  return { ok: true };
}

export async function deleteRoutineAction(payload: { routineId: string }): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = payload.routineId?.trim();

  if (!routineId) {
    return { ok: false, error: "Missing routine ID." };
  }

  const accessResult = await enforceRoutineAccessForCurrentTier({
    supabase,
    userId: user.id,
    routineId,
  });
  if (!accessResult.ok) return accessResult;

  const { data: affectedExerciseRows, error: affectedExerciseError } = await supabase
    .from("session_exercises")
    .select("exercise_id, session:sessions!inner(routine_id, status, user_id)")
    .eq("user_id", user.id)
    .eq("session.user_id", user.id)
    .eq("session.routine_id", routineId)
    .eq("session.status", "completed");

  if (affectedExerciseError) {
    return { ok: false, error: affectedExerciseError.message || "Failed to resolve routine exercise history." };
  }

  const affectedExerciseIds = Array.from(new Set(
    (affectedExerciseRows ?? []).map((row) => row.exercise_id).filter((value): value is string => Boolean(value)),
  ));

  const result = await deleteRoutineMutation({
    routineId,
    supabase: supabase as unknown as RoutineDeleteClient,
    userId: user.id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  if (affectedExerciseIds.length > 0) {
    await recomputeExerciseStatsForExercises(user.id, affectedExerciseIds, supabase);
  }

  revalidateRoutinesViews();
  revalidatePath(getRoutineHomePath(routineId));
  revalidatePath(`/routines/${routineId}/edit`);

  return { ok: true };
}

export async function deleteWorkoutPlanSourceAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const requestedTemplateId = String(formData.get("workoutPlanTemplateId") ?? "").trim();
  const requestedSourceRoutineDayId = String(formData.get("sourceRoutineDayId") ?? "").trim();

  if (!requestedTemplateId && !requestedSourceRoutineDayId) {
    return { ok: false, error: "Missing workout plan source info." };
  }

  const allRoutineDaysResult = await loadRoutineDaysWithWorkoutPlanCompat({
    supabase,
    userId: user.id,
  });
  if (allRoutineDaysResult.error) {
    return { ok: false, error: allRoutineDaysResult.error.message };
  }

  let resolvedTemplateId = requestedTemplateId || null;
  let linkedRoutineDays = [] as typeof allRoutineDaysResult.data;

  if (!resolvedTemplateId && requestedSourceRoutineDayId) {
    const sourceDayResult = await loadRoutineDayWithWorkoutPlanCompat({
      supabase,
      routineDayId: requestedSourceRoutineDayId,
      userId: user.id,
    });
    if (sourceDayResult.error || !sourceDayResult.data) {
      return { ok: false, error: sourceDayResult.error?.message ?? "Workout plan source not found." };
    }

    const sourceDay = sourceDayResult.data;
    if (sourceDay.workout_plan_template_id) {
      resolvedTemplateId = sourceDay.workout_plan_template_id;
    } else {
      const canonicalSourceDayId = sourceDay.duplicate_source_routine_day_id ?? sourceDay.id;
      linkedRoutineDays = allRoutineDaysResult.data.filter((day) => (
        day.id === canonicalSourceDayId
        || day.duplicate_source_routine_day_id === canonicalSourceDayId
      ));
    }
  }

  if (resolvedTemplateId) {
    const templateAccess = await enforceWorkoutPlanTemplateAccessForCurrentTier({
      supabase,
      userId: user.id,
      templateId: resolvedTemplateId,
    });
    if (!templateAccess.ok) {
      return templateAccess;
    }

    linkedRoutineDays = allRoutineDaysResult.data.filter((day) => day.workout_plan_template_id === resolvedTemplateId);
  }

  if (linkedRoutineDays.length > 0) {
    const linkedRoutineDayIds = linkedRoutineDays.map((day) => day.id);
    const affectedRoutineIds = Array.from(new Set(
      linkedRoutineDays
        .map((day) => day.routine_id)
        .filter((value): value is string => Boolean(value)),
    ));

    for (const routineId of affectedRoutineIds) {
      const routineAccess = await enforceRoutineAccessForCurrentTier({
        supabase,
        userId: user.id,
        routineId,
      });
      if (!routineAccess.ok) {
        return routineAccess;
      }
    }

    const { error: deleteRoutineDaysError } = await supabase
      .from("routine_days")
      .delete()
      .in("id", linkedRoutineDayIds)
      .eq("user_id", user.id);

    if (deleteRoutineDaysError) {
      return { ok: false, error: deleteRoutineDaysError.message };
    }

    for (const routineId of affectedRoutineIds) {
      const { data: remainingDays, error: remainingDaysError } = await supabase
        .from("routine_days")
        .select("id, day_index")
        .eq("routine_id", routineId)
        .eq("user_id", user.id)
        .order("day_index", { ascending: true });

      if (remainingDaysError) {
        return { ok: false, error: remainingDaysError.message };
      }

      const remainingDayIds = (remainingDays ?? []).map((day) => day.id);
      const reorderError = await reindexRoutineDaysDirect({
        supabase,
        routineId,
        userId: user.id,
        orderedRoutineDayIds: remainingDayIds,
      });
      if (reorderError) {
        return { ok: false, error: reorderError.message };
      }

      const { error: updateRoutineError } = await supabase
        .from("routines")
        .update({
          cycle_length_days: remainingDayIds.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", routineId)
        .eq("user_id", user.id);

      if (updateRoutineError) {
        return { ok: false, error: updateRoutineError.message };
      }

      revalidatePath(getRoutineHomePath(routineId));
      revalidatePath(getRoutineEditPath(routineId));
    }
  }

  if (resolvedTemplateId) {
    const { error: deleteTemplateExercisesError } = await supabase
      .from("workout_plan_template_exercises")
      .delete()
      .eq("workout_plan_template_id", resolvedTemplateId)
      .eq("user_id", user.id);
    if (deleteTemplateExercisesError) {
      return { ok: false, error: deleteTemplateExercisesError.message };
    }

    const { error: deleteTemplateError } = await supabase
      .from("workout_plan_templates")
      .delete()
      .eq("id", resolvedTemplateId)
      .eq("user_id", user.id);
    if (deleteTemplateError) {
      return { ok: false, error: deleteTemplateError.message };
    }
  }

  revalidateRoutinesViews();
  revalidatePath("/routines");
  revalidatePath("/routines/workout-plans");
  return { ok: true };
}
