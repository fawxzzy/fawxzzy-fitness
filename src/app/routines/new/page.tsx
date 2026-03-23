import { redirect } from "next/navigation";
import { RoutineBackButton } from "@/components/RoutineBackButton";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { AppButton } from "@/components/ui/AppButton";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { AppShell } from "@/components/ui/app/AppShell";
import { FIXED_CTA_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { RoutineEditorPageHeader } from "@/components/routines/RoutineEditorShared";
import { RoutineEditorFormFields } from "@/components/routines/RoutineEditorForm";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";
import { ROUTINE_START_WEEKDAYS, createRoutineDaySeedsFromStartDate, getRoutineStartDateForWeekday, getTodayDateInTimeZone, getRoutineStartWeekdayFromDate } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import { normalizeRoutineTimezone, toCanonicalRoutineTimezone } from "@/lib/timezones";

export const dynamic = "force-dynamic";

async function createRoutineAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const name = String(formData.get("name") ?? "").trim();
  const cycleLengthDays = Number(formData.get("cycleLengthDays"));
  const timezone = String(formData.get("timezone") ?? "").trim();
  const startWeekday = String(formData.get("startWeekday") ?? "").trim().toLowerCase();
  const weightUnit = String(formData.get("weightUnit") ?? "lbs").trim();

  if (!name || !timezone || !startWeekday) {
    throw new Error("Routine name, timezone, and start weekday are required.");
  }

  if (!ROUTINE_START_WEEKDAYS.includes(startWeekday as (typeof ROUTINE_START_WEEKDAYS)[number])) {
    throw new Error("Please select a valid start weekday.");
  }

  const canonicalTimezone = toCanonicalRoutineTimezone(timezone);

  if (!canonicalTimezone) {
    throw new Error("Please select a supported timezone.");
  }

  if (!Number.isInteger(cycleLengthDays) || cycleLengthDays < 1 || cycleLengthDays > 365) {
    throw new Error("Cycle length must be between 1 and 365.");
  }

  if (weightUnit !== "lbs" && weightUnit !== "kg") {
    throw new Error("Weight unit must be lbs or kg.");
  }

  const startDate = getRoutineStartDateForWeekday({
    cycleLengthDays,
    startWeekday: startWeekday as (typeof ROUTINE_START_WEEKDAYS)[number],
    timeZone: canonicalTimezone,
    existingStartDate: getTodayDateInTimeZone(canonicalTimezone),
  });

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .insert({
      user_id: user.id,
      name,
      cycle_length_days: cycleLengthDays,
      timezone: canonicalTimezone,
      start_date: startDate,
      weight_unit: weightUnit,
    })
    .select("id")
    .single();

  if (routineError || !routine) {
    throw new Error(routineError?.message ?? "Could not create routine");
  }

  const { error: daysError } = await supabase
    .from("routine_days")
    .insert(createRoutineDaySeedsFromStartDate(cycleLengthDays, user.id, routine.id, startDate));

  if (daysError) {
    throw new Error(daysError.message);
  }

  redirect(`/routines/${routine.id}/edit?success=${encodeURIComponent("Routine created")}`);
}

export default async function NewRoutinePage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const todayInProfileTimezone = getTodayDateInTimeZone(profile.timezone);
  const routineTimezoneDefault = normalizeRoutineTimezone(profile.timezone);
  const startWeekdayDefault = getRoutineStartWeekdayFromDate(todayInProfileTimezone) ?? "monday";

  return (
    <AppShell topNavMode="none" className="h-[100dvh]">
      <ScrollScreenWithBottomActions className={FIXED_CTA_RESERVE_CLASS}>
        <form id="new-routine-form" action={createRoutineAction} className="space-y-4 px-1 pb-4">
          <NavigationReturnInput fallbackHref="/routines" value="/routines" />

          <RoutineEditorPageHeader
            title="NEW ROUTINE DETAILS"
            action={<RoutineBackButton href="/routines" />}
            actionClassName="-mt-1"
            className="space-y-5"
          >
            <RoutineEditorFormFields
              titleInput
              cycleLengthDefaultValue={7}
              startWeekdayDefaultValue={startWeekdayDefault}
              timezoneDefaultValue={routineTimezoneDefault}
              weightUnitDefaultValue="lbs"
            />
          </RoutineEditorPageHeader>
        </form>

        <PublishBottomActions>
          <BottomActionSingle>
            <AppButton type="submit" form="new-routine-form" variant="primary" fullWidth>
              Save Routine
            </AppButton>
          </BottomActionSingle>
        </PublishBottomActions>
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
