"use server";

import { revalidatePath } from "next/cache";
import { createRoutineAction, setActiveRoutineAction } from "@/app/routines/actions";
import { requireUser } from "@/lib/auth";
import { isRedirectError } from "@/lib/next-navigation-errors";
import { ROUTINE_LIMIT_PRO_REQUIRED_MESSAGE } from "@/lib/pro-tier-limits";
import { ensureProfile } from "@/lib/profile";
import {
  appendProgressionPlaybookFormData,
  createProgressionPlaybookFormStateForTrainingGoal,
} from "@/lib/progression-playbook-form-state";
import { isRoutineArchived, selectWithRoutineArchiveCompat } from "@/lib/routine-archive";
import { getRoutineStartWeekdayFromDate, getTodayDateInTimeZone } from "@/lib/routines";
import {
  doesRoutineMatchStarterTemplate,
  getStarterTemplate,
  getStarterTemplateExerciseNames,
  getStarterTemplatePreviewDays,
  type StarterTemplate,
  type StoredStarterDay,
  type StoredStarterExercise,
} from "@/lib/starter-templates";
import { supabaseServer } from "@/lib/supabase/server";
import { isValidIanaTimeZone, normalizeRoutineTimezone } from "@/lib/timezones";

export type CreateStarterRoutineResult =
  | { ok: true; routineId: string; routineName: string }
  | { ok: false; error: string };

// A "use server" module may only export async functions, so these stay module-private.
const STARTER_CREATE_FAILED_MESSAGE ="Could not set up that plan. Try again.";
const STARTER_CREATE_PARTIAL_MESSAGE = "That plan was only partly set up. Open Routines to check it, then try again.";

/** A retry inside this window (lost response, a second tap past the button guard) adopts the routine already made. */
const STARTER_REPLAY_WINDOW_MS = 15 * 60 * 1000;

type SupabaseClient = Awaited<ReturnType<typeof supabaseServer>>;

function logStarterFailure(stage: string, error: unknown) {
  // Server log only: database text never reaches the member.
  console.error(`[starter-plan] ${stage}`, error instanceof Error ? `${error.name}: ${error.message}` : typeof error);
}

async function deleteRoutine(supabase: SupabaseClient, userId: string, routineId: string) {
  // routine_days and routine_day_exercises go with the routine (on delete cascade).
  const { error } = await supabase.from("routines").delete().eq("id", routineId).eq("user_id", userId);
  if (error) {
    logStarterFailure(`rollback of routine ${routineId} failed`, new Error(error.message));
    return false;
  }
  return true;
}

async function findReplayableStarterRoutineId(supabase: SupabaseClient, userId: string, template: StarterTemplate) {
  const since = new Date(Date.now() - STARTER_REPLAY_WINDOW_MS).toISOString();
  const { data: candidates, error } = await selectWithRoutineArchiveCompat<Array<{ id: string; archived_at?: string | null }>>((withArchive) => supabase
    .from("routines")
    .select(withArchive ? "id, archived_at" : "id")
    .eq("user_id", userId)
    .eq("name", template.name)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(3)
    .returns<Array<{ id: string; archived_at?: string | null }>>());
  if (error || !candidates) return null;

  for (const candidate of candidates) {
    if (isRoutineArchived(candidate)) continue;
    const { data: dayRows, error: dayError } = await supabase
      .from("routine_days")
      .select("id, day_index, name, is_rest")
      .eq("routine_id", candidate.id)
      .eq("user_id", userId);
    if (dayError || !dayRows) continue;
    const days = dayRows as StoredStarterDay[];
    const { data: exerciseRows, error: exerciseError } = days.length > 0
      ? await supabase
        .from("routine_day_exercises")
        .select("routine_day_id, position, exercise:exercises(name)")
        .in("routine_day_id", days.map((day) => day.id))
        .eq("user_id", userId)
      : { data: [], error: null };
    if (exerciseError || !exerciseRows) continue;
    const exercises: StoredStarterExercise[] = (exerciseRows as Array<{
      routine_day_id: string;
      position: number;
      exercise?: { name?: string | null } | Array<{ name?: string | null }> | null;
    }>).map((row) => {
      const exercise = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise;
      return { routine_day_id: row.routine_day_id, position: row.position, exercise_name: exercise?.name ?? null };
    });
    if (doesRoutineMatchStarterTemplate({ template, days, exercises })) {
      return candidate.id;
    }
  }
  return null;
}

async function activate(routineId: string) {
  const formData = new FormData();
  formData.set("routineId", routineId);
  return await setActiveRoutineAction(formData);
}

/**
 * One tap on a starter plan (Today first run, or "Start from a plan" in New routine): creates the routine with its
 * days and catalog exercises, then makes it the active routine. createRoutineAction never sets the active routine,
 * so activation is an explicit second step. Any failure after the routine row exists deletes it again, so a failed
 * tap leaves nothing behind. The Free routine limit is enforced by createRoutineAction (archived routines do not
 * count) and comes back as ROUTINE_LIMIT_PRO_REQUIRED_MESSAGE for the client's in-flow notice.
 */
export async function createStarterRoutineAction(templateId: string, deviceTimeZone?: string | null): Promise<CreateStarterRoutineResult> {
  const template = getStarterTemplate(templateId);
  if (!template) {
    return { ok: false, error: STARTER_CREATE_FAILED_MESSAGE };
  }

  const created: { userId: string | null; routineId: string | null; supabase: SupabaseClient | null } = { userId: null, routineId: null, supabase: null };

  try {
    const user = await requireUser();
    const profile = await ensureProfile(user.id);
    const supabase = await supabaseServer();
    created.userId = user.id;
    created.supabase = supabase;

    const abort = async (message: string): Promise<CreateStarterRoutineResult> => {
      if (created.routineId && !(await deleteRoutine(supabase, user.id, created.routineId))) {
        return { ok: false, error: STARTER_CREATE_PARTIAL_MESSAGE };
      }
      return { ok: false, error: message };
    };

    const replayId = await findReplayableStarterRoutineId(supabase, user.id, template);
    if (replayId) {
      const replayActivation = await activate(replayId);
      if (!replayActivation.ok) {
        logStarterFailure("replay activation failed", new Error(replayActivation.error));
        return { ok: false, error: STARTER_CREATE_FAILED_MESSAGE };
      }
      revalidatePath("/today");
      return { ok: true, routineId: replayId, routineName: template.name };
    }

    // Catalog lookup happens before any write, so a missing exercise never leaves a half-made routine.
    const exerciseNames = getStarterTemplateExerciseNames(template);
    const { data: exerciseRows, error: exerciseError } = await supabase
      .from("exercises")
      .select("id, name, default_unit")
      .eq("is_global", true)
      .in("name", exerciseNames);
    if (exerciseError) {
      logStarterFailure("exercise lookup failed", new Error(exerciseError.message));
      return { ok: false, error: STARTER_CREATE_FAILED_MESSAGE };
    }
    const exerciseByName = new Map((exerciseRows ?? []).map((row) => [row.name as string, row as { id: string; name: string; default_unit: string | null }]));
    const missing = exerciseNames.filter((name) => !exerciseByName.has(name));
    if (missing.length > 0) {
      logStarterFailure("catalog is missing starter exercises", new Error(missing.join(", ")));
      return { ok: false, error: STARTER_CREATE_FAILED_MESSAGE };
    }

    // The device zone is the person's real zone; profile.timezone is only the fallback (it was historically UTC).
    const timezone = normalizeRoutineTimezone(isValidIanaTimeZone(deviceTimeZone) ? deviceTimeZone : profile.timezone);
    const formData = new FormData();
    formData.set("name", template.name);
    formData.set("cycleLengthDays", String(template.week.length));
    formData.set("scheduleMode", "weekday_anchored");
    // Day 1 is today in the person's zone, so Today opens on Day 1 with Start. The weekday matches the start date,
    // as in the New routine form (create-with-days-action.ts); createRoutineAction uses the date when both are set.
    const startDate = getTodayDateInTimeZone(timezone);
    formData.set("startDate", startDate);
    formData.set("startWeekday", getRoutineStartWeekdayFromDate(startDate) ?? "monday");
    formData.set("timezone", timezone);
    formData.set("weightUnit", profile.preferred_weight_unit ?? "lbs");
    formData.set("distanceUnit", profile.preferred_distance_unit ?? "mi");
    formData.set("previewDays", JSON.stringify(getStarterTemplatePreviewDays(template)));
    appendProgressionPlaybookFormData(formData, createProgressionPlaybookFormStateForTrainingGoal("build_muscle"));

    const createResult = await createRoutineAction(formData);
    if (createResult.routineId) {
      created.routineId = createResult.routineId;
    }
    if (!createResult.ok) {
      logStarterFailure("createRoutineAction failed", new Error(createResult.error));
      return await abort(createResult.error === ROUTINE_LIMIT_PRO_REQUIRED_MESSAGE ? createResult.error : STARTER_CREATE_FAILED_MESSAGE);
    }
    if (!createResult.routineId) {
      return { ok: false, error: STARTER_CREATE_FAILED_MESSAGE };
    }
    const routineId = createResult.routineId;
    const createdDayByIndex = new Map((createResult.createdDays ?? []).map((day) => [day.dayIndex, day]));

    for (const [offset, planDay] of template.week.entries()) {
      if (!planDay) continue;
      const createdDay = createdDayByIndex.get(offset + 1);
      if (!createdDay) {
        return await abort(STARTER_CREATE_FAILED_MESSAGE);
      }

      const { error: dayUpdateError } = await supabase
        .from("routine_days")
        .update({ name: planDay.name, is_rest: false })
        .eq("id", createdDay.id)
        .eq("routine_id", routineId)
        .eq("user_id", user.id);
      if (dayUpdateError) {
        logStarterFailure("day update failed", new Error(dayUpdateError.message));
        return await abort(STARTER_CREATE_FAILED_MESSAGE);
      }

      // Sets and reps only: no weight (the first workout sets it) and no time, distance or calorie targets.
      const { error: insertError } = await supabase.from("routine_day_exercises").insert(planDay.exercises.map((exercise, position) => ({
        user_id: user.id,
        routine_day_id: createdDay.id,
        exercise_id: exerciseByName.get(exercise.name)!.id,
        position,
        target_sets: exercise.sets,
        target_reps: exercise.repsMin,
        target_reps_min: exercise.repsMin,
        target_reps_max: exercise.repsMax,
        measurement_type: "reps",
        default_unit: exerciseByName.get(exercise.name)!.default_unit ?? "reps",
      })));
      if (insertError) {
        logStarterFailure("exercise insert failed", new Error(insertError.message));
        return await abort(STARTER_CREATE_FAILED_MESSAGE);
      }
    }

    const activation = await activate(routineId);
    if (!activation.ok) {
      logStarterFailure("activation failed", new Error(activation.error));
      return await abort(STARTER_CREATE_FAILED_MESSAGE);
    }

    revalidatePath("/today");
    return { ok: true, routineId, routineName: template.name };
  } catch (error) {
    // requireUser signals a signed-out request by throwing a redirect; that must reach Next.
    if (isRedirectError(error)) throw error;
    logStarterFailure("create failed", error);
    const cleanedUp = created.routineId && created.userId && created.supabase
      ? await deleteRoutine(created.supabase, created.userId, created.routineId)
      : true;
    return { ok: false, error: cleanedUp ? STARTER_CREATE_FAILED_MESSAGE : STARTER_CREATE_PARTIAL_MESSAGE };
  }
}
