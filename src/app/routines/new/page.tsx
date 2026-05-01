import { RoutineDetailsScreenShell } from "@/components/routines/RoutineEditorShared";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";
import { normalizeRoutineTimezone } from "@/lib/timezones";
import { NewRoutineDraftForm } from "@/app/routines/new/NewRoutineDraftForm";

export const dynamic = "force-dynamic";

export default async function NewRoutinePage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const routineTimezoneDefault = normalizeRoutineTimezone(profile.timezone);

  return (
    <RoutineDetailsScreenShell
      backHref="/routines"
      title="New Routine"
      align="center"
    >
      <NewRoutineDraftForm
        defaults={{
          name: "",
          cycleLengthDays: 7,
          startWeekday: "monday",
          timezone: routineTimezoneDefault,
          weightUnit: profile.preferred_weight_unit ?? "lbs",
          distanceUnit: profile.preferred_distance_unit ?? "mi",
        }}
      />
    </RoutineDetailsScreenShell>
  );
}
