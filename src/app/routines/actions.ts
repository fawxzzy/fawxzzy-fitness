"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { revalidateRoutinesViews, getRoutineEditPath } from "@/lib/revalidation";
import { supabaseServer } from "@/lib/supabase/server";
import { resolveReplacementActiveRoutineId } from "@/lib/active-routine-fallback";
import { ROUTINE_SCHEDULE_MODE_VALUES, type RoutineDetailsScheduleMode } from "@/lib/routine-details-form";
import { ROUTINE_START_WEEKDAYS, createRoutineDaySeedsFromStartDate, getRoutineStartDateForWeekday } from "@/lib/routines";
import { toCanonicalRoutineTimezone } from "@/lib/timezones";
import { parseProgressionPlaybookPayload } from "@/lib/progression-playbooks";
import {
  getSchemaMismatchMessage,
  isMissingProgressionPlaybookColumnError,
  isMissingRoutineDefaultProgressionColumnError,
  omitRoutineDefaultProgressionColumns,
} from "@/lib/progression-schema-compat";

type CreateRoutineResult = ActionResult & { routineId?: string; firstDayId?: string };

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

function selectedRoutineDefaultProgressionPlaybook(payload: { defaultProgressionPlaybookId: unknown }) {
  return typeof payload.defaultProgressionPlaybookId === "string" && payload.defaultProgressionPlaybookId.length > 0;
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

export async function createRoutineAction(formData: FormData): Promise<CreateRoutineResult> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const parsed = parseRoutineForm(formData);
  if (!parsed.ok) return parsed;

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

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      active_routine_id: routine.id,
      preferred_distance_unit: parsed.payload.distanceUnit,
    })
    .eq("id", user.id);

  if (profileError && !isMissingProfilePreferenceColumnError(profileError)) return { ok: false, error: profileError.message };

  revalidateRoutinesViews();
  revalidatePath(getRoutineEditPath(routine.id));

  return { ok: true, routineId: routine.id, firstDayId: insertedDays?.[0]?.id };
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

  const startDate = parsed.payload.startDate || getRoutineStartDateForWeekday({
    cycleLengthDays: parsed.payload.cycleLengthDays,
    startWeekday: parsed.payload.startWeekday,
    timeZone: parsed.payload.canonicalTimezone,
    existingStartDate,
  });

  const { data: existingRoutine, error: existingRoutineError } = await supabase
    .from("routines")
    .select("cycle_length_days")
    .eq("id", routineId)
    .eq("user_id", user.id)
    .single();

  if (existingRoutineError || !existingRoutine) return { ok: false, error: existingRoutineError?.message ?? "Routine not found" };

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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active_routine_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: profileError.message || "Failed to resolve active routine." };
  }

  const deletingActiveRoutine = profile?.active_routine_id === routineId;

  const { error } = await supabase
    .from("routines")
    .delete()
    .eq("id", routineId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message || "Failed to delete routine." };
  }

  if (deletingActiveRoutine) {
    const { data: remainingRoutines, error: remainingRoutinesError } = await supabase
      .from("routines")
      .select("id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(1);

    if (remainingRoutinesError) {
      return { ok: false, error: remainingRoutinesError.message || "Failed to resolve replacement routine." };
    }

    const replacementRoutineId = resolveReplacementActiveRoutineId(remainingRoutines ?? []);
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ active_routine_id: replacementRoutineId })
      .eq("id", user.id);

    if (profileUpdateError) {
      return { ok: false, error: profileUpdateError.message || "Failed to update active routine." };
    }
  }

  revalidateRoutinesViews();
  revalidatePath(`/routines/${routineId}/edit`);

  return { ok: true };
}
