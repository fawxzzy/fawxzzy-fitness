import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { RoutineSwitcherBar } from "@/components/RoutineSwitcherBar";
import { Glass } from "@/components/ui/Glass";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";
import { getRoutineDayComputation } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import { revalidateRoutinesViews } from "@/lib/revalidation";
import type { RoutineDayRow, RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

async function setActiveRoutineAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const routineId = String(formData.get("routineId") ?? "");

  if (!routineId) {
    throw new Error("Missing routine ID");
  }

  const { error: routineCheckError } = await supabase
    .from("routines")
    .select("id")
    .eq("id", routineId)
    .eq("user_id", user.id)
    .single();

  if (routineCheckError) {
    throw new Error(routineCheckError.message);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ active_routine_id: routineId })
    .eq("id", user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidateRoutinesViews();
}

export default async function RoutinesPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const supabase = supabaseServer();

  const { data } = await supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, start_date, timezone, updated_at, weight_unit")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const routines = (data ?? []) as RoutineRow[];
  const activeRoutine = routines.find((routine) => routine.id === profile.active_routine_id) ?? routines[0] ?? null;

  let activeRoutineDays: RoutineDayRow[] = [];

  if (activeRoutine) {
    const { data: routineDays } = await supabase
      .from("routine_days")
      .select("id, user_id, routine_id, day_index, name, is_rest, notes")
      .eq("routine_id", activeRoutine.id)
      .eq("user_id", user.id)
      .order("day_index", { ascending: true });

    activeRoutineDays = (routineDays ?? []) as RoutineDayRow[];
  }

  const sortedActiveRoutineDays = activeRoutineDays
    .map((day, index) => ({ day, index }))
    .sort((a, b) => {
      const left = Number.isFinite(a.day.day_index) ? a.day.day_index : null;
      const right = Number.isFinite(b.day.day_index) ? b.day.day_index : null;

      if (left !== null && right !== null) {
        return left - right;
      }

      if (left !== null) {
        return -1;
      }

      if (right !== null) {
        return 1;
      }

      return a.index - b.index;
    })
    .map(({ day }) => day);

  const totalDays = sortedActiveRoutineDays.length;
  const restDays = sortedActiveRoutineDays.filter((day) => day.is_rest).length;
  const trainingDays = Math.max(totalDays - restDays, 0);
  const cycleLength = activeRoutine?.cycle_length_days ?? totalDays;
  const todayRoutineDayComputation = activeRoutine?.start_date && cycleLength > 0
    ? getRoutineDayComputation({
        cycleLengthDays: cycleLength,
        startDate: activeRoutine.start_date,
        profileTimeZone: activeRoutine.timezone || profile.timezone,
      })
    : null;
  const todayRoutineDayIndex = todayRoutineDayComputation?.dayIndex ?? null;
  const todayRowIndex = todayRoutineDayIndex === null
    ? -1
    : sortedActiveRoutineDays.findIndex((day, index) => {
        const dayNumber = Number.isFinite(day.day_index) ? day.day_index : index + 1;
        return dayNumber === todayRoutineDayIndex;
      });

  if (process.env.NODE_ENV !== "production" && sortedActiveRoutineDays.length > 0 && sortedActiveRoutineDays[0]?.day_index !== 1) {
    console.warn("[routines] Active routine days are missing Day 1 in overview preview", {
      routineId: activeRoutine?.id,
      dayIndexes: sortedActiveRoutineDays.map((day) => day.day_index),
    });
  }

  return (
    <section className="space-y-4">
      <AppNav />

      <Glass variant="base" className="space-y-3 p-3" interactive={false}>
        {routines.length === 0 ? (
          <div className="space-y-4 rounded-xl border border-border/70 bg-surface/65 p-4">
            <p className="text-sm text-muted">No routines yet.</p>
            <Link
              href="/routines/new"
              className={getAppButtonClassName({ variant: "primary", fullWidth: true })}
            >
              Create your first routine
            </Link>
          </div>
        ) : (
          <>
            <RoutineSwitcherBar
              activeRoutineId={activeRoutine?.id ?? null}
              activeRoutineName={activeRoutine?.name ?? "Select routine"}
              routines={routines.map((routine) => ({ id: routine.id, name: routine.name }))}
              setActiveRoutineAction={setActiveRoutineAction}
            />

            {activeRoutine ? (
              <div className="space-y-3 rounded-xl border border-border/25 bg-surface/70 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-text">{activeRoutine.name}</h2>
                    <p className="text-xs text-muted/90">
                      {cycleLength}-day cycle · {trainingDays} training · {restDays} rest
                    </p>
                  </div>
                  <Link
                    href={`/routines/${activeRoutine.id}/edit`}
                    aria-label={`Edit ${activeRoutine.name} routine`}
                    className={getAppButtonClassName({ variant: "secondary", size: "sm", className: "min-h-11 px-3" })}
                  >
                    Edit
                  </Link>
                </div>

                <ul className="divide-y divide-border/15 text-sm text-muted">
                  {sortedActiveRoutineDays.map((day, index) => {
                    const dayNumber = Number.isFinite(day.day_index) ? day.day_index : index + 1;
                    const dayLabel = day.name?.trim() || (day.is_rest ? "Rest" : "Training");
                    const isToday = index === todayRowIndex;

                    return (
                      <li key={day.id} className={`grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-2 ${isToday ? "rounded-md bg-accent/10 px-2" : ""}`}>
                        <span className="min-w-0 text-xs font-medium uppercase tracking-wide text-muted/95">
                          Day {dayNumber}
                        </span>
                        <div className="flex min-w-0 items-center justify-end gap-2 text-right">
                          <span className={`min-w-0 text-sm leading-5 ${day.is_rest ? "text-muted/75" : "text-text/90"}`}>
                            {day.is_rest ? "• Rest" : dayLabel}
                          </span>
                          {isToday ? <span className="rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">Today</span> : null}
                        </div>
                      </li>
                    );
                  })}
                  {sortedActiveRoutineDays.length === 0 ? (
                    <li className="py-2 text-sm text-muted">No days configured yet</li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </Glass>
    </section>
  );
}
