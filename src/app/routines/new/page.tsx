import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";
import { createRoutineDaySeeds, getTodayDateInTimeZone } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import { ROUTINE_TIMEZONE_OPTIONS, isRoutineTimezone } from "@/lib/timezones";

export const dynamic = "force-dynamic";

async function createRoutineAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();

  const name = String(formData.get("name") ?? "").trim();
  const cycleLengthDays = Number(formData.get("cycleLengthDays"));
  const timezone = String(formData.get("timezone") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();

  if (!name || !timezone || !startDate) {
    throw new Error("Name, timezone, and start date are required.");
  }

  if (!isRoutineTimezone(timezone)) {
    throw new Error("Please select a supported timezone.");
  }

  if (!Number.isInteger(cycleLengthDays) || cycleLengthDays < 1 || cycleLengthDays > 365) {
    throw new Error("Cycle length must be between 1 and 365.");
  }

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .insert({
      user_id: user.id,
      name,
      cycle_length_days: cycleLengthDays,
      timezone,
      start_date: startDate,
    })
    .select("id")
    .single();

  if (routineError || !routine) {
    throw new Error(routineError?.message ?? "Could not create routine");
  }

  const { error: daysError } = await supabase
    .from("routine_days")
    .insert(createRoutineDaySeeds(cycleLengthDays, user.id, routine.id));

  if (daysError) {
    throw new Error(daysError.message);
  }

  redirect("/routines");
}

export default async function NewRoutinePage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const startDateDefault = getTodayDateInTimeZone(profile.timezone);
  const routineTimezoneDefault = isRoutineTimezone(profile.timezone) ? profile.timezone : "America/Toronto";

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">New Routine</h1>
      <form action={createRoutineAction} className="space-y-3 rounded-md bg-white p-4 shadow-sm">
        <label className="block text-sm">
          Name
          <input
            name="name"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            placeholder="Push/Pull/Legs"
          />
        </label>

        <label className="block text-sm">
          Cycle length (days)
          <input
            type="number"
            name="cycleLengthDays"
            min={1}
            max={365}
            defaultValue={7}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          Timezone
          <select
            name="timezone"
            required
            defaultValue={routineTimezoneDefault}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {ROUTINE_TIMEZONE_OPTIONS.map((timeZoneOption) => (
              <option key={timeZoneOption} value={timeZoneOption}>
                {timeZoneOption}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Start date
          <input
            type="date"
            name="startDate"
            required
            defaultValue={startDateDefault}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-white">
          Save Routine
        </button>
      </form>
    </section>
  );
}
