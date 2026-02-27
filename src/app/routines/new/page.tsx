import { redirect } from "next/navigation";
import { RoutineBackButton } from "@/components/RoutineBackButton";
import { AppButton } from "@/components/ui/AppButton";
import { controlClassName, dateControlClassName } from "@/components/ui/formClasses";
import { RoutineLocalDefaults } from "@/components/RoutineLocalDefaults";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";
import { createRoutineDaySeedsFromStartDate, getTodayDateInTimeZone } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import { ROUTINE_TIMEZONE_OPTIONS, getRoutineTimezoneLabel, normalizeRoutineTimezone, toCanonicalRoutineTimezone } from "@/lib/timezones";

export const dynamic = "force-dynamic";

async function createRoutineAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const name = String(formData.get("name") ?? "").trim();
  const cycleLengthDays = Number(formData.get("cycleLengthDays"));
  const timezone = String(formData.get("timezone") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const weightUnit = String(formData.get("weightUnit") ?? "lbs").trim();

  if (!name || !timezone || !startDate) {
    throw new Error("Name, timezone, and start date are required.");
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
  const startDateDefault = getTodayDateInTimeZone(profile.timezone);
  const routineTimezoneDefault = normalizeRoutineTimezone(profile.timezone);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Routine</h1>
        <RoutineBackButton href="/routines" />
      </div>
      <form action={createRoutineAction} className="space-y-3 rounded-xl border border-border/70 bg-[rgb(var(--bg)/0.5)] p-4">
        <RoutineLocalDefaults timezoneOptions={ROUTINE_TIMEZONE_OPTIONS} />
        <label className="block text-sm">
          Name
          <input
            name="name"
            required
            className={controlClassName}
            placeholder="Push/Pull/Legs"
          />
        </label>

        <label className="block text-sm">
          Cycle length (days)
          <p className="mt-1 text-xs text-muted">Includes all days in your repeating cycle, including rest days.</p>
          <input
            type="number"
            name="cycleLengthDays"
            min={1}
            max={365}
            defaultValue={7}
            required
            className={controlClassName}
          />
        </label>

        <label className="block text-sm">
          Units
          <select name="weightUnit" defaultValue="lbs" className={controlClassName}>
            <option value="lbs">lbs</option>
            <option value="kg">kg</option>
          </select>
        </label>

        <label className="block text-sm">
          Timezone
          <select
            name="timezone"
            required
            defaultValue={routineTimezoneDefault}
            className={controlClassName}
          >
            {ROUTINE_TIMEZONE_OPTIONS.map((timeZoneOption) => (
              <option key={timeZoneOption} value={timeZoneOption}>
                {getRoutineTimezoneLabel(timeZoneOption)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Start date
          <p className="mt-1 text-xs text-muted">This anchors Day 1 of the cycle on your selected date.</p>
          <input
            type="date"
            name="startDate"
            required
            defaultValue={startDateDefault}
            className={dateControlClassName}
          />
        </label>

        <AppButton type="submit" variant="primary" fullWidth>
          Save Routine
        </AppButton>
      </form>
    </section>
  );
}
