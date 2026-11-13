"use server";

import { isRedirectError } from "next/dist/client/components/redirect";
import { createRoutineAction } from "@/app/routines/actions";
import {
  CURATED_CREATE_FAILED_MESSAGE,
  CURATED_CREATE_PARTIAL_MESSAGE,
  CURATED_DISABLED_MESSAGE,
  CURATED_UNAVAILABLE_MESSAGE,
  compileCuratedWorkoutGeneration,
  toCuratedGenerationFailure,
  type CuratedGenerationFailureCode,
} from "@/features/curated-onboarding/api-contract";
import {
  buildCuratedRoutineSchedule,
  deriveCuratedExerciseTarget,
  type CuratedHistorySignals,
  type CuratedRoutineScheduleDay,
  type CuratedWorkoutPlan,
} from "@/features/curated-onboarding/engine";
import type { CuratedOnboardingData } from "@/features/curated-onboarding/types";
import { requireUser } from "@/lib/auth";
import { isCuratedOnboardingEnabled } from "@/lib/feature-flags";
import { ROUTINE_LIMIT_PRO_REQUIRED_MESSAGE } from "@/lib/pro-tier-limits";
import { ensureProfile } from "@/lib/profile";
import {
  appendProgressionPlaybookFormData,
  buildProgressionPlaybookConfigFromFormState,
  createProgressionPlaybookFormState,
} from "@/lib/progression-playbook-form-state";
import { getTodayDateInTimeZone } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import { isValidIanaTimeZone, normalizeRoutineTimezone } from "@/lib/timezones";
import { activateProfileRoutineId } from "@/app/curated-onboarding/activate-profile-routine";
import {
  CURATED_REPLAY_WINDOW_MS,
  doesRoutineMatchCuratedPlan,
  type ExistingCuratedRoutineDay,
  type ExistingCuratedRoutineExercise,
} from "@/app/curated-onboarding/replay";

export type CuratedGenerationActionFailure = {
  ok: false;
  error: string;
  code: CuratedGenerationFailureCode;
};

export type GenerateCuratedWorkoutPlanResult =
  | { ok: true; plan: CuratedWorkoutPlan }
  | CuratedGenerationActionFailure;

export type CreateCuratedRoutineDraftResult =
  | { ok: true; routineId: string; routineName: string }
  | { ok: false; error: string; code?: CuratedGenerationFailureCode; plan?: CuratedWorkoutPlan };

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
  const painOrFormExerciseSlugs = new Set<string>();
  for (const row of (feedbackResult.data ?? []) as Array<{
    copilot_feedback_signal?: string | null;
    exercise?: { name?: string | null } | Array<{ name?: string | null }> | null;
  }>) {
    const exercise = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise;
    const slug = exercise?.name ? toCatalogSlug(exercise.name) : "";
    if (!slug) continue;
    // Pain and form breakdown are never kept in a routine; "too hard" may stay with a visible reason.
    if (["form_breakdown", "pain_flag"].includes(row.copilot_feedback_signal ?? "")) {
      painOrFormExerciseSlugs.add(slug);
    }
    if (row.copilot_feedback_signal === "too_hard") {
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
      painOrFormExerciseSlugs: [...painOrFormExerciseSlugs],
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
    painOrFormExerciseSlugs: [...painOrFormExerciseSlugs],
  };
}

type SupabaseClient = ReturnType<typeof supabaseServer>;

function logCuratedFailure(stage: string, error: unknown) {
  // Server log only. Raw exception and database text never reaches the member.
  console.error(`[curated-onboarding] ${stage}`, error instanceof Error ? `${error.name}: ${error.message}` : typeof error);
}

async function deleteCuratedRoutine(supabase: SupabaseClient, userId: string, routineId: string) {
  const { error } = await supabase.from("routines").delete().eq("id", routineId).eq("user_id", userId);
  if (error) {
    logCuratedFailure(`rollback of routine ${routineId} failed`, new Error(error.message));
    return false;
  }
  return true;
}

async function findReplayableCuratedRoutineId(args: {
  supabase: SupabaseClient;
  userId: string;
  routineName: string;
  schedule: CuratedRoutineScheduleDay[];
}) {
  const since = new Date(Date.now() - CURATED_REPLAY_WINDOW_MS).toISOString();
  const { data: candidates, error } = await args.supabase
    .from("routines")
    .select("id")
    .eq("user_id", args.userId)
    .eq("name", args.routineName)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(3);
  if (error || !candidates || candidates.length === 0) {
    return null;
  }

  for (const candidate of candidates as Array<{ id: string }>) {
    const { data: dayRows, error: dayError } = await args.supabase
      .from("routine_days")
      .select("id, day_index, name, is_rest")
      .eq("routine_id", candidate.id)
      .eq("user_id", args.userId);
    if (dayError || !dayRows) continue;
    const days = dayRows as ExistingCuratedRoutineDay[];
    const { data: exerciseRows, error: exerciseError } = days.length > 0
      ? await args.supabase
        .from("routine_day_exercises")
        .select("routine_day_id, position, exercise:exercises(name)")
        .in("routine_day_id", days.map((day) => day.id))
        .eq("user_id", args.userId)
      : { data: [], error: null };
    if (exerciseError || !exerciseRows) continue;

    const exercises: ExistingCuratedRoutineExercise[] = (exerciseRows as Array<{
      routine_day_id: string;
      position: number;
      exercise?: { name?: string | null } | Array<{ name?: string | null }> | null;
    }>).map((row) => {
      const exercise = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise;
      return { routine_day_id: row.routine_day_id, position: row.position, exercise_name: exercise?.name ?? null };
    });

    if (doesRoutineMatchCuratedPlan({ schedule: args.schedule, days, exercises })) {
      return candidate.id;
    }
  }

  return null;
}

export async function generateCuratedWorkoutPlanAction(
  onboarding: CuratedOnboardingData,
): Promise<GenerateCuratedWorkoutPlanResult> {
  // "Off" is enforced here, not only on the page: a direct action call must not generate while the flag is off.
  if (!isCuratedOnboardingEnabled()) {
    return { ok: false, code: "feature-disabled", error: CURATED_DISABLED_MESSAGE };
  }

  try {
    const user = await requireUser();
    const profile = await ensureProfile(user.id);
    const supabase = supabaseServer();
    const signals = await loadCuratedHistorySignals({ userId: user.id, activeRoutineId: profile.active_routine_id, supabase });
    const outcome = compileCuratedWorkoutGeneration({ onboarding, signals });
    if (outcome.status === "ready") {
      return { ok: true, plan: outcome.plan };
    }
    return { ok: false, ...toCuratedGenerationFailure(outcome) };
  } catch (error) {
    // requireUser signals an unauthenticated request by throwing a redirect; that must reach Next, not the member.
    if (isRedirectError(error)) {
      throw error;
    }
    logCuratedFailure("generation failed", error);
    return { ok: false, code: "unavailable", error: CURATED_UNAVAILABLE_MESSAGE };
  }
}

export async function createCuratedRoutineDraftAction(
  onboarding: CuratedOnboardingData,
  deviceTimeZone?: string | null,
  expectedPlanId?: string | null,
): Promise<CreateCuratedRoutineDraftResult> {
  if (!isCuratedOnboardingEnabled()) {
    return { ok: false, code: "feature-disabled", error: CURATED_DISABLED_MESSAGE };
  }

  const created: { userId: string | null; routineId: string | null; supabase: SupabaseClient | null } = {
    userId: null,
    routineId: null,
    supabase: null,
  };

  try {
    return await createCuratedRoutineDraft({ onboarding, deviceTimeZone, expectedPlanId, created });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    logCuratedFailure("create failed", error);
    const cleanedUp = created.routineId && created.userId && created.supabase
      ? await deleteCuratedRoutine(created.supabase, created.userId, created.routineId)
      : true;
    return { ok: false, error: cleanedUp ? CURATED_CREATE_FAILED_MESSAGE : CURATED_CREATE_PARTIAL_MESSAGE };
  }
}

async function createCuratedRoutineDraft(args: {
  onboarding: CuratedOnboardingData;
  deviceTimeZone?: string | null;
  expectedPlanId?: string | null;
  created: { userId: string | null; routineId: string | null; supabase: SupabaseClient | null };
}): Promise<CreateCuratedRoutineDraftResult> {
  const { created } = args;
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const supabase = supabaseServer();
  created.userId = user.id;
  created.supabase = supabase;
  const signals = await loadCuratedHistorySignals({ userId: user.id, activeRoutineId: profile.active_routine_id, supabase });
  const outcome = compileCuratedWorkoutGeneration({
    onboarding: args.onboarding,
    signals,
    expectedPlanId: args.expectedPlanId,
  });
  if (outcome.status !== "ready") {
    return {
      ok: false,
      ...toCuratedGenerationFailure(outcome),
      ...(outcome.status === "plan-changed" ? { plan: outcome.plan } : {}),
    };
  }
  const plan = outcome.plan;
  const routineName = plan.name.slice(0, 15);
  const schedule = buildCuratedRoutineSchedule(plan);

  async function activateRoutine(routineId: string) {
    return await activateProfileRoutineId({
      executeProfileActivation: async ({ userId, routineId: nextRoutineId }) =>
        await supabase
          .from("profiles")
          .update({ active_routine_id: nextRoutineId })
          .eq("id", userId)
          .select("id")
          .single(),
      userId: user.id,
      routineId,
    });
  }

  async function abort(message: string): Promise<CreateCuratedRoutineDraftResult> {
    if (created.routineId) {
      const cleanedUp = await deleteCuratedRoutine(supabase, user.id, created.routineId);
      if (!cleanedUp) {
        return { ok: false, error: CURATED_CREATE_PARTIAL_MESSAGE };
      }
    }
    return { ok: false, error: message };
  }

  // A retry after a lost response (or a double tap) adopts the identical routine the first attempt created.
  const replayableRoutineId = await findReplayableCuratedRoutineId({
    supabase,
    userId: user.id,
    routineName,
    schedule,
  });
  if (replayableRoutineId) {
    const replayActivation = await activateRoutine(replayableRoutineId);
    if (!replayActivation.ok) {
      logCuratedFailure("replay activation failed", new Error(replayActivation.error));
      return { ok: false, error: CURATED_CREATE_FAILED_MESSAGE };
    }
    return { ok: true, routineId: replayableRoutineId, routineName };
  }

  // The client's device zone is the user's real zone; profile.timezone was historically the server zone (UTC),
  // so it is only the fallback when the client did not send one.
  const timezone = normalizeRoutineTimezone(isValidIanaTimeZone(args.deviceTimeZone) ? args.deviceTimeZone : profile.timezone);
  const progressionState = createProgressionPlaybookFormState({ playbookId: plan.progressionPlaybookId });
  const progressionConfig = buildProgressionPlaybookConfigFromFormState(progressionState);
  const formData = new FormData();

  formData.set("name", routineName);
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
  // createRoutineAction reports the routine id even when a later step fails, so the exact row can be removed.
  if (createResult.routineId) {
    created.routineId = createResult.routineId;
  }
  if (!createResult.ok) {
    logCuratedFailure("createRoutineAction failed", new Error(createResult.error));
    return await abort(
      createResult.error === ROUTINE_LIMIT_PRO_REQUIRED_MESSAGE ? createResult.error : CURATED_CREATE_FAILED_MESSAGE,
    );
  }
  if (!createResult.routineId) {
    return { ok: false, error: CURATED_CREATE_FAILED_MESSAGE };
  }

  const routineId = createResult.routineId;
  const exerciseNames = [...new Set(plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.name)))];
  const { data: exerciseRows, error: exerciseError } = await supabase
    .from("exercises")
    .select("id, name, measurement_type, default_unit")
    .eq("is_global", true)
    .in("name", exerciseNames);

  if (exerciseError) {
    logCuratedFailure("exercise lookup failed", new Error(exerciseError.message));
    return await abort(CURATED_CREATE_FAILED_MESSAGE);
  }

  const exerciseByName = new Map((exerciseRows ?? []).map((exercise) => [exercise.name, exercise]));
  const missingExerciseNames = exerciseNames.filter((name) => !exerciseByName.has(name));
  if (missingExerciseNames.length > 0) {
    logCuratedFailure("exercise catalog is missing curated exercises", new Error(missingExerciseNames.join(", ")));
    return await abort(CURATED_CREATE_FAILED_MESSAGE);
  }

  const createdDayByIndex = new Map((createResult.createdDays ?? []).map((day) => [day.dayIndex, day]));
  for (const scheduleDay of schedule) {
    const day = scheduleDay.planDay;
    if (!day) {
      continue;
    }

    const createdDay = createdDayByIndex.get(scheduleDay.dayIndex);
    if (!createdDay) {
      return await abort(CURATED_CREATE_FAILED_MESSAGE);
    }

    const { error: dayUpdateError } = await supabase
      .from("routine_days")
      .update({ name: day.name, is_rest: false })
      .eq("id", createdDay.id)
      .eq("routine_id", routineId)
      .eq("user_id", user.id);
    if (dayUpdateError) {
      logCuratedFailure("day update failed", new Error(dayUpdateError.message));
      return await abort(CURATED_CREATE_FAILED_MESSAGE);
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
      logCuratedFailure("exercise insert failed", new Error(insertError.message));
      return await abort(CURATED_CREATE_FAILED_MESSAGE);
    }
  }

  const activeRoutineResult = await activateRoutine(routineId);
  if (!activeRoutineResult.ok) {
    logCuratedFailure("activation failed", new Error(activeRoutineResult.error));
    return await abort(CURATED_CREATE_FAILED_MESSAGE);
  }

  return { ok: true, routineId, routineName };
}
