"use server";

import { createRoutineAction } from "@/app/routines/actions";
import { createRoutineWithCleanup } from "@/app/routines/new/create-with-days-cleanup";
import { requireUser } from "@/lib/auth";
import { revalidateRoutinesViews } from "@/lib/revalidation";
import { supabaseServer } from "@/lib/supabase/server";
import { appendProgressionPlaybookFormData, createProgressionPlaybookFormState } from "@/lib/progression-playbook-form-state";
import { getRoutineStartWeekdayFromDate, getTodayDateInTimeZone } from "@/lib/routines";
import { normalizeRoutineTimezone } from "@/lib/timezones";
import { WEEKLY_CYCLE_LENGTH_DAYS, buildWeeklyPreviewDays, parseTrainingWeekdays } from "@/app/routines/new/training-days";

/**
 * New routine from "Which days do you train?" (SIMPLIFY #7). A weekly routine is the existing `weekday_anchored` shape with
 * a 7-day cycle; unpicked weekdays become rest days. "Repeat every N days" (More options) keeps the existing
 * `rolling_n_day` shape with N training days. Creation, the Free routine cap (archived routines excluded) and day seeding
 * stay in createRoutineAction: this only turns the plain answers into the fields it already reads.
 */
export async function createRoutineWithDaysAction(formData: FormData) {
  const scheduleMode = String(formData.get("scheduleMode") ?? "weekday_anchored").trim() === "rolling_n_day"
    ? "rolling_n_day"
    : "weekday_anchored";
  const timezone = normalizeRoutineTimezone(String(formData.get("timezone") ?? "").trim() || "UTC");
  const startDate = String(formData.get("startDate") ?? "").trim() || getTodayDateInTimeZone(timezone);
  const startWeekday = getRoutineStartWeekdayFromDate(startDate);
  if (!startWeekday) {
    return { ok: false as const, error: "Pick a start date." };
  }

  const routineFormData = new FormData();
  routineFormData.set("name", String(formData.get("name") ?? "").trim().slice(0, 15));
  routineFormData.set("scheduleMode", scheduleMode);
  routineFormData.set("startDate", startDate);
  routineFormData.set("startWeekday", startWeekday);
  routineFormData.set("timezone", timezone);
  routineFormData.set("weightUnit", String(formData.get("weightUnit") ?? "lbs") === "kg" ? "kg" : "lbs");
  routineFormData.set("distanceUnit", String(formData.get("distanceUnit") ?? "mi") === "km" ? "km" : "mi");

  if (scheduleMode === "weekday_anchored") {
    const trainingWeekdays = parseTrainingWeekdays(String(formData.get("trainingWeekdays") ?? ""));
    if (trainingWeekdays.length === 0) {
      return { ok: false as const, error: "Pick at least one day you train." };
    }
    const previewDays = buildWeeklyPreviewDays(startDate, trainingWeekdays);
    if (!previewDays) {
      return { ok: false as const, error: "Pick a start date." };
    }
    routineFormData.set("cycleLengthDays", String(WEEKLY_CYCLE_LENGTH_DAYS));
    routineFormData.set("previewDays", JSON.stringify(previewDays));
  } else {
    const cycleLengthDays = Number.parseInt(String(formData.get("cycleLengthDays") ?? ""), 10);
    if (!Number.isFinite(cycleLengthDays) || cycleLengthDays < 1 || cycleLengthDays > 365) {
      return { ok: false as const, error: "Repeat every 1 to 365 days." };
    }
    routineFormData.set("cycleLengthDays", String(cycleLengthDays));
    routineFormData.set(
      "previewDays",
      JSON.stringify(Array.from({ length: Math.min(31, cycleLengthDays) }, () => ({ isRest: false }))),
    );
  }

  // Auto-progress is on by default for a new routine (unchanged from the previous create form).
  appendProgressionPlaybookFormData(routineFormData, createProgressionPlaybookFormState({ playbookId: "double_progression" }));
  // createRoutineAction can fail after the routine row exists (days insert, a rest-day update). Remove that half-made
  // routine before reporting the failure so a retry does not leave two routines or burn the Free routine slot.
  return createRoutineWithCleanup({
    create: () => createRoutineAction(routineFormData),
    removeRoutine: async (routineId) => {
      const user = await requireUser();
      const supabase = await supabaseServer();
      await supabase.from("routine_days").delete().eq("routine_id", routineId).eq("user_id", user.id);
      const { error } = await supabase.from("routines").delete().eq("id", routineId).eq("user_id", user.id);
      if (!error) revalidateRoutinesViews();
      return { ok: !error };
    },
  });
}
