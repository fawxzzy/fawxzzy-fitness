"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { revalidateRoutinesViews, getRoutineEditPath } from "@/lib/revalidation";
import { supabaseServer } from "@/lib/supabase/server";
import { resolveReplacementActiveRoutineId } from "@/lib/active-routine-fallback";
import { ROUTINE_START_WEEKDAYS, createRoutineDaySeedsFromStartDate, getRoutineStartDateForWeekday, getTodayDateInTimeZone } from "@/lib/routines";
import { toCanonicalRoutineTimezone } from "@/lib/timezones";

type CreateRoutineResult = ActionResult & { routineId?: string; firstDayId?: string };

function parseRoutineForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const cycleLengthDays = Number(formData.get("cycleLengthDays"));
  const timezone = String(formData.get("timezone") ?? "").trim();
  const startWeekday = String(formData.get("startWeekday") ?? "").trim().toLowerCase();
  const weightUnit = String(formData.get("weightUnit") ?? "lbs").trim();

  if (!name || !timezone || !startWeekday) {
    return { ok: false as const, error: "Routine name, timezone, and start weekday are required." };
  }
  if (!ROUTINE_START_WEEKDAYS.includes(startWeekday as (typeof ROUTINE_START_WEEKDAYS)[number])) {
    return { ok: false as const, error: "Please select a valid start weekday." };
  }
  const canonicalTimezone = toCanonicalRoutineTimezone(timezone);
  if (!canonicalTimezone) {
    return { ok: false as const, error: "Please select a supported timezone." };
  }
  if (!Number.isInteger(cycleLengthDays) || cycleLengthDays < 1 || cycleLengthDays > 365) {
    return { ok: false as const, error: "Cycle length must be between 1 and 365." };
  }
  if (weightUnit !== "lbs" && weightUnit !== "kg") {
    return { ok: false as const, error: "Weight unit must be lbs or kg." };
  }

  return {
    ok: true as const,
    payload: { name, cycleLengthDays, canonicalTimezone, startWeekday: startWeekday as (typeof ROUTINE_START_WEEKDAYS)[number], weightUnit },
  };
}

export async function createRoutineAction(formData: FormData): Promise<CreateRoutineResult> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const parsed = parseRoutineForm(formData);
  if (!parsed.ok) return parsed;

  const startDate = getRoutineStartDateForWeekday({
    cycleLengthDays: parsed.payload.cycleLengthDays,
    startWeekday: parsed.payload.startWeekday,
    timeZone: parsed.payload.canonicalTimezone,
    existingStartDate: getTodayDateInTimeZone(parsed.payload.canonicalTimezone),
  });

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .insert({
      user_id: user.id,
      name: parsed.payload.name,
      cycle_length_days: parsed.payload.cycleLengthDays,
      timezone: parsed.payload.canonicalTimezone,
      start_date: startDate,
      weight_unit: parsed.payload.weightUnit,
    })
    .select("id")
    .single();

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
    .update({ active_routine_id: routine.id })
    .eq("id", user.id);

  if (profileError) return { ok: false, error: profileError.message };

  revalidateRoutinesViews();
  revalidatePath(getRoutineEditPath(routine.id));

  return { ok: true, routineId: routine.id, firstDayId: insertedDays?.[0]?.id };
}

export async function autosaveRoutineAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const routineId = String(formData.get("routineId") ?? "");
  const existingStartDate = String(formData.get("existingStartDate") ?? "").trim() || null;
  const parsed = parseRoutineForm(formData);

  if (!routineId) return { ok: false, error: "Routine ID is required." };
  if (!parsed.ok) return parsed;

  const startDate = getRoutineStartDateForWeekday({
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

  const { error: routineError } = await supabase
    .from("routines")
    .update({
      name: parsed.payload.name,
      timezone: parsed.payload.canonicalTimezone,
      start_date: startDate,
      cycle_length_days: parsed.payload.cycleLengthDays,
      weight_unit: parsed.payload.weightUnit,
      updated_at: new Date().toISOString(),
    })
    .eq("id", routineId)
    .eq("user_id", user.id);

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
