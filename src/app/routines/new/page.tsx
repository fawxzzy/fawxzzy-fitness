import { RoutineDetailsScreenShell } from "@/components/routines/RoutineEditorShared";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";
import { getRoutineStartWeekdayFromDate, getTodayDateInTimeZone } from "@/lib/routines";
import { normalizeRoutineTimezone } from "@/lib/timezones";
import { NewRoutineDraftForm } from "@/app/routines/new/NewRoutineDraftForm";

export const dynamic = "force-dynamic";

export default async function NewRoutinePage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const todayInProfileTimezone = getTodayDateInTimeZone(profile.timezone);
  const routineTimezoneDefault = normalizeRoutineTimezone(profile.timezone);
  const startWeekdayDefault = getRoutineStartWeekdayFromDate(todayInProfileTimezone) ?? "monday";

  return (
    <RoutineDetailsScreenShell backHref="/routines">
      <NewRoutineDraftForm
        defaults={{
          name: "",
          cycleLengthDays: 7,
          startWeekday: startWeekdayDefault,
          timezone: routineTimezoneDefault,
          weightUnit: "lbs",
        }}
      />
    </RoutineDetailsScreenShell>
  );
}
