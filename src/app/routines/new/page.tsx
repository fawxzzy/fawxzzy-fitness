import { AppShell } from "@/components/ui/app/AppShell";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { RoutineBackButton } from "@/components/RoutineBackButton";
import { RoutineEditorPageHeader } from "@/components/routines/RoutineEditorShared";
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
    <AppShell topNavMode="none" className="h-[100dvh]">
      <ScrollScreenWithBottomActions
        floatingHeader={(
          <div className="px-1">
            <RoutineEditorPageHeader
              title="Routine Details"
              action={<RoutineBackButton href="/routines" />}
            />
          </div>
        )}
      >
        <NewRoutineDraftForm
          defaults={{
            name: "",
            cycleLengthDays: 7,
            startWeekday: startWeekdayDefault,
            timezone: routineTimezoneDefault,
            weightUnit: "lbs",
          }}
        />
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
