"use server";

import { createRoutineAction } from "@/app/routines/actions";
import {
  buildCuratedRoutineSchedule,
  generateAdaptiveCuratedWorkoutPlan,
  deriveCuratedExerciseTarget,
  type CuratedHistorySignals,
  type CuratedWorkoutPlan,
} from "@/features/curated-onboarding/engine";
import type { CuratedOnboardingData } from "@/features/curated-onboarding/types";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";
import {
  appendProgressionPlaybookFormData,
  buildProgressionPlaybookConfigFromFormState,
  createProgressionPlaybookFormState,
} from "@/lib/progression-playbook-form-state";
import { getTodayDateInTimeZone } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import { normalizeRoutineTimezone } from "@/lib/timezones";
import { activateProfileRoutineId } from "@/app/curated-onboarding/activate-profile-routine";

export type CreateCuratedRoutineDraftResult =
  | { ok: true; routineId: string; routineName: string }
  | { ok: false; error: string };

function toCatalogSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function loadCuratedHistorySignals(args: {
  userId: string;
  activeRoutineId?: string | null;
  supabase: ReturnType<typeof supabaseServer>;
}): Promise<CuratedHistorySignals> {
  const feedbackResult = await args.supabase
    .from("session_exercises")
    .select("copilot_feedback_signal, exercise:exercises(name)")
    .eq("user_id", args.userId)
    .not("copilot_feedback_signal", "is", null)
    .order("copilot_feedback_updated_at", { ascending: false })
    .limit(40);
  const failedExerciseSlugs = new Set<string>();
  const fatiguedExerciseSlugs = new Set<string>();
  for (const row of (feedbackResult.data ?? []) as Array<{
    copilot_feedback_signal?: string | null;
    exercise?: { name?: string | null } | Array<{ name?: string | null }> | null;
  }>) {
    const exercise = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise;
    const slug = exercise?.name ? toCatalogSlug(exercise.name) : "";
    if (!slug) continue;
    if (["too_hard", "form_breakdown", "pain_flag"].includes(row.copilot_feedback_signal ?? "")) {
      failedExerciseSlugs.add(slug);
    }
    if (["too_hard", "bad_day"].includes(row.copilot_feedback_signal ?? "")) {
      fatiguedExerciseSlugs.add(slug);
    }
  }

  if (!args.activeRoutineId) {
    return {
      completionRate: null,
      missedWorkoutCount: 0,
      failedExerciseSlugs: [...failedExerciseSlugs],
      fatiguedExerciseSlugs: [...fatiguedExerciseSlugs],
    };
  }

  const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
  const [routineResult, trainingDaysResult, completedSessionsResult] = await Promise.all([
    args.supabase.from("routines").select("created_at").eq("id", args.activeRoutineId).eq("user_id", args.userId).maybeSingle(),
    args.supabase.from("routine_days").select("id", { count: "exact", head: true }).eq("routine_id", args.activeRoutineId).eq("user_id", args.userId).eq("is_rest", false),
    args.supabase.from("sessions").select("id", { count: "exact", head: true }).eq("routine_id", args.activeRoutineId).eq("user_id", args.userId).eq("status", "completed").gte("performed_at", since),
  ]);
  const createdAtMs = routineResult.data?.created_at ? Date.parse(routineResult.data.created_at) : Number.NaN;
  const elapsedWeeks = Number.isFinite(createdAtMs)
    ? Math.min(4, Math.max(1, Math.ceil((Date.now() - createdAtMs) / (7 * 24 * 60 * 60 * 1000))))
    : 4;
  const expectedWorkouts = Math.max(0, trainingDaysResult.count ?? 0) * elapsedWeeks;
  const completedWorkouts = Math.max(0, completedSessionsResult.count ?? 0);

  return {
    completionRate: expectedWorkouts > 0 ? Math.min(1, completedWorkouts / expectedWorkouts) : null,
    missedWorkoutCount: Math.max(0, expectedWorkouts - completedWorkouts),
    failedExerciseSlugs: [...failedExerciseSlugs],
    fatiguedExerciseSlugs: [...fatiguedExerciseSlugs],
  };
}

export async function generateCuratedWorkoutPlanAction(
  onboarding: CuratedOnboardingData,
): Promise<{ ok: true; plan: CuratedWorkoutPlan } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    const profile = await ensureProfile(user.id);
    const supabase = supabaseServer();
    const signals = await loadCuratedHistorySignals({ userId: user.id, activeRoutineId: profile.active_routine_id, supabase });
    return { ok: true, plan: generateAdaptiveCuratedWorkoutPlan(onboarding, signals) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The curated plan could not be generated." };
  }
}

export async function createCuratedRoutineDraftAction(
  onboarding: CuratedOnboardingData,
): Promise<CreateCuratedRoutineDraftResult> {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const supabase = supabaseServer();
  const signals = await loadCuratedHistorySignals({ userId: user.id, activeRoutineId: profile.active_routine_id, supabase });
  const plan = generateAdaptiveCuratedWorkoutPlan(onboarding, signals);
  const timezone = normalizeRoutineTimezone(profile.timezone);
  const progressionState = createProgressionPlaybookFormState({ playbookId: plan.progressionPlaybookId });
  const progressionConfig = buildProgressionPlaybookConfigFromFormState(progressionState);
  const schedule = buildCuratedRoutineSchedule(plan);
  const formData = new FormData();
  let routineId: string | null = null;

  async function rollbackCreatedRoutine() {
    if (!routineId) return;
    await supabase.from("routines").delete().eq("id", routineId).eq("user_id", user.id);
  }

  formData.set("name", plan.name.slice(0, 15));
  formData.set("cycleLengthDays", String(schedule.length));
  formData.set("scheduleMode", "weekday_anchored");
  formData.set("startDate", getTodayDateInTimeZone(timezone));
  formData.set("startWeekday", "monday");
  formData.set("timezone", timezone);
  formData.set("weightUnit", profile.preferred_weight_unit ?? "lbs");
  formData.set("distanceUnit", profile.preferred_distance_unit ?? "mi");
  formData.set("previewDays", JSON.stringify(schedule.map((day) => ({ isRest: day.planDay === null }))));
  appendProgressionPlaybookFormData(formData, progressionState);

  const createResult = await createRoutineAction(formData);
  if (!createResult.ok) {
    return { ok: false, error: createResult.error };
  }
  if (!createResult.routineId) {
    return { ok: false, error: "Could not create the curated routine draft." };
  }

  routineId = createResult.routineId;
  const exerciseNames = [...new Set(plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.name)))];
  const { data: exerciseRows, error: exerciseError } = await supabase
    .from("exercises")
    .select("id, name, measurement_type, default_unit")
    .eq("is_global", true)
    .in("name", exerciseNames);

  if (exerciseError) {
    await rollbackCreatedRoutine();
    return { ok: false, error: exerciseError.message };
  }

  const exerciseByName = new Map((exerciseRows ?? []).map((exercise) => [exercise.name, exercise]));
  const missingExerciseNames = exerciseNames.filter((name) => !exerciseByName.has(name));
  if (missingExerciseNames.length > 0) {
    await rollbackCreatedRoutine();
    return { ok: false, error: `Curated exercise catalog is missing: ${missingExerciseNames.join(", ")}.` };
  }

  const createdDayByIndex = new Map((createResult.createdDays ?? []).map((day) => [day.dayIndex, day]));
  for (const scheduleDay of schedule) {
    const day = scheduleDay.planDay;
    if (!day) {
      continue;
    }

    const createdDay = createdDayByIndex.get(scheduleDay.dayIndex);
    if (!createdDay) {
      await rollbackCreatedRoutine();
      return { ok: false, error: "Curated routine day creation was incomplete." };
    }

    const { error: dayUpdateError } = await supabase
      .from("routine_days")
      .update({ name: day.name, is_rest: false })
      .eq("id", createdDay.id)
      .eq("routine_id", routineId)
      .eq("user_id", user.id);
    if (dayUpdateError) {
      await rollbackCreatedRoutine();
      return { ok: false, error: dayUpdateError.message };
    }

    const exercisePayload = day.exercises.map((exercise, position) => {
      const catalogExercise = exerciseByName.get(exercise.name)!;
      const target = deriveCuratedExerciseTarget(exercise);
      const usesReps = target.measurementType === "reps";
      return {
        user_id: user.id,
        routine_day_id: createdDay.id,
        exercise_id: catalogExercise.id,
        position,
        target_sets: exercise.targetSets,
        target_reps: target.targetRepsMin,
        target_reps_min: target.targetRepsMin,
        target_reps_max: target.targetRepsMax,
        target_duration_seconds: target.targetDurationSeconds,
        measurement_type: target.measurementType,
        default_unit: catalogExercise.default_unit ?? (usesReps ? "reps" : null),
        progression_playbook_id: exercise.progressionPlaybookId,
        progression_playbook_config: progressionConfig,
      };
    });

    let { error: insertError } = await supabase.from("routine_day_exercises").insert(exercisePayload);
    if (insertError && insertError.message?.toLowerCase().includes("progression_playbook")) {
      const fallback = await supabase.from("routine_day_exercises").insert(
        exercisePayload.map(({ progression_playbook_id: _playbookId, progression_playbook_config: _config, ...exercise }) => exercise),
      );
      insertError = fallback.error;
    }
    if (insertError) {
      await rollbackCreatedRoutine();
      return { ok: false, error: insertError.message };
    }
  }

  const activeRoutineResult = await activateProfileRoutineId({
    executeProfileActivation: async ({ userId, routineId }) =>
      await supabase
        .from("profiles")
        .update({ active_routine_id: routineId })
        .eq("id", userId)
        .select("id")
        .single(),
    userId: user.id,
    routineId,
  });
  if (!activeRoutineResult.ok) {
    await rollbackCreatedRoutine();
    return { ok: false, error: activeRoutineResult.error };
  }

  return { ok: true, routineId, routineName: plan.name.slice(0, 15) };
}
