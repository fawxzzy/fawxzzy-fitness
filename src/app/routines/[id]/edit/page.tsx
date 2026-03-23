import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { DeleteRoutineButton } from "@/app/routines/[id]/edit/DeleteRoutineButton";
import { RoutineSaveButton } from "@/app/routines/[id]/edit/RoutineSaveButton";
import { RoutineBackButton } from "@/components/RoutineBackButton";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { AppShell } from "@/components/ui/app/AppShell";
import { AccentSubtitleText } from "@/components/ui/text-roles";
import { FIXED_CTA_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { RoutineEditorPageHeader, RoutineEditorStickyActions } from "@/components/routines/RoutineEditorShared";
import { RoutineEditorFormFields } from "@/components/routines/RoutineEditorForm";
import { resolveReturnHref } from "@/lib/navigation-return";
import { ROUTINE_START_WEEKDAYS, createRoutineDaySeedsFromStartDate, getRoutineStartDateForWeekday, getRoutineStartWeekdayFromDate } from "@/lib/routines";
import { getRoutineEditPath, revalidateRoutinesViews } from "@/lib/revalidation";
import { supabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { normalizeRoutineTimezone, toCanonicalRoutineTimezone } from "@/lib/timezones";
import type { RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    error?: string;
    success?: string;
    returnTo?: string;
  };
};

async function updateRoutineAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const startWeekday = String(formData.get("startWeekday") ?? "").trim().toLowerCase();
  const existingStartDate = String(formData.get("existingStartDate") ?? "").trim() || null;
  const cycleLengthDays = Number(formData.get("cycleLengthDays"));
  const weightUnit = String(formData.get("weightUnit") ?? "lbs").trim();
  const rawReturnTo = String(formData.get("returnTo") ?? "").trim();
  const returnTo = resolveReturnHref(rawReturnTo, "/routines");

  if (!routineId || !name || !timezone || !startWeekday) {
    throw new Error("Missing required fields");
  }

  if (!ROUTINE_START_WEEKDAYS.includes(startWeekday as (typeof ROUTINE_START_WEEKDAYS)[number])) {
    throw new Error("Please select a valid start weekday.");
  }

  const canonicalTimezone = toCanonicalRoutineTimezone(timezone);

  if (!canonicalTimezone) {
    throw new Error("Please select a supported timezone.");
  }

  if (weightUnit !== "lbs" && weightUnit !== "kg") {
    throw new Error("Weight unit must be lbs or kg.");
  }

  if (!Number.isInteger(cycleLengthDays) || cycleLengthDays < 1 || cycleLengthDays > 365) {
    throw new Error("Cycle length must be between 1 and 365.");
  }

  const startDate = getRoutineStartDateForWeekday({
    cycleLengthDays,
    startWeekday: startWeekday as (typeof ROUTINE_START_WEEKDAYS)[number],
    timeZone: canonicalTimezone,
    existingStartDate,
  });

  const { data: existingRoutine } = await supabase
    .from("routines")
    .select("cycle_length_days")
    .eq("id", routineId)
    .eq("user_id", user.id)
    .single();

  if (!existingRoutine) {
    throw new Error("Routine not found");
  }

  const { error: routineError } = await supabase
    .from("routines")
    .update({
      name,
      timezone: canonicalTimezone,
      start_date: startDate,
      cycle_length_days: cycleLengthDays,
      weight_unit: weightUnit,
      updated_at: new Date().toISOString(),
    })
    .eq("id", routineId)
    .eq("user_id", user.id);

  if (routineError) {
    throw new Error(routineError.message);
  }

  if (cycleLengthDays !== existingRoutine.cycle_length_days) {
    const { data: existingDays, error: daysError } = await supabase
      .from("routine_days")
      .select("id, day_index")
      .eq("routine_id", routineId)
      .eq("user_id", user.id)
      .order("day_index", { ascending: true });

    if (daysError) {
      throw new Error(daysError.message);
    }

    const existingDayIndexes = new Set((existingDays ?? []).map((day) => day.day_index));

    if (cycleLengthDays > existingRoutine.cycle_length_days) {
      const missingSeeds = createRoutineDaySeedsFromStartDate(cycleLengthDays, user.id, routineId, startDate).filter(
        (seed) => !existingDayIndexes.has(seed.day_index),
      );

      if (missingSeeds.length > 0) {
        const { error: insertError } = await supabase.from("routine_days").insert(missingSeeds);
        if (insertError) throw new Error(insertError.message);
      }
    }

    if (cycleLengthDays < existingRoutine.cycle_length_days) {
      const dayIdsToDelete = (existingDays ?? []).filter((day) => day.day_index > cycleLengthDays).map((day) => day.id);

      if (dayIdsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from("routine_days").delete().in("id", dayIdsToDelete).eq("user_id", user.id);
        if (deleteError) throw new Error(deleteError.message);
      }
    }
  }

  revalidateRoutinesViews();
  revalidatePath(getRoutineEditPath(routineId));
  redirect(returnTo);
}

export default async function EditRoutinePage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: routine } = await supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, start_date, timezone, updated_at, weight_unit")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!routine) notFound();

  const returnHref = resolveReturnHref(searchParams?.returnTo, "/routines");
  const routineTimezoneDefault = normalizeRoutineTimezone((routine as RoutineRow).timezone);
  const startWeekdayDefault = getRoutineStartWeekdayFromDate((routine as RoutineRow).start_date) ?? ROUTINE_START_WEEKDAYS[0];

  return (
    <AppShell topNavMode="none" className="h-[100dvh]">
      <ScrollScreenWithBottomActions className={FIXED_CTA_RESERVE_CLASS}>
        <form id="routine-update-form" action={updateRoutineAction} className="space-y-4 px-1 pb-4">
          <input type="hidden" name="routineId" value={routine.id} />
          <input type="hidden" name="existingStartDate" value={(routine as RoutineRow).start_date} />
          <NavigationReturnInput fallbackHref="/routines" value={returnHref} />

          <RoutineEditorPageHeader
            title="EDIT ROUTINE DETAILS"
            action={<RoutineBackButton href={returnHref} hasUnsavedChanges={false} />}
            actionClassName="-mt-1"
            className="space-y-5"
          >
            <RoutineEditorFormFields
              titleInput
              nameDefaultValue={(routine as RoutineRow).name}
              cycleLengthDefaultValue={(routine as RoutineRow).cycle_length_days}
              startWeekdayDefaultValue={startWeekdayDefault}
              timezoneDefaultValue={routineTimezoneDefault}
              weightUnitDefaultValue={(routine as RoutineRow).weight_unit ?? "lbs"}
            />
          </RoutineEditorPageHeader>

          {searchParams?.error ? <AccentSubtitleText className="rounded-[1rem] border border-red-300/40 bg-red-50/10 px-3 py-2 text-red-200">{searchParams.error}</AccentSubtitleText> : null}
          {searchParams?.success ? <AccentSubtitleText className="rounded-[1rem] border border-accent/40 bg-accent/10 px-3 py-2 text-accent">{searchParams.success}</AccentSubtitleText> : null}
        </form>

        <RoutineEditorStickyActions
          primary={<RoutineSaveButton formId="routine-update-form" originalCycleLength={(routine as RoutineRow).cycle_length_days} />}
          secondary={<DeleteRoutineButton routineId={routine.id} routineName={(routine as RoutineRow).name} />}
          cancelHref={returnHref}
        />
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
