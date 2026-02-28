import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { Glass } from "@/components/ui/Glass";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";
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

  return (
    <section className="space-y-4">
      <AppNav />

      <Glass variant="base" className="space-y-3 p-3" interactive={false}>
        <h1 className="text-lg font-semibold text-text">Routines</h1>

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
            <details className="group rounded-xl border border-border/70 bg-surface/65">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm text-text marker:content-none">
                <span className="truncate font-medium">{activeRoutine?.name ?? "Select routine"}</span>
                <span className="text-xs text-muted transition-transform group-open:rotate-180">⌄</span>
              </summary>

              <div className="space-y-1 border-t border-border/60 p-2">
                {routines.map((routine) => {
                  const isCurrent = activeRoutine?.id === routine.id;

                  return (
                    <form key={routine.id} action={setActiveRoutineAction}>
                      <input type="hidden" name="routineId" value={routine.id} />
                      <button
                        type="submit"
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${isCurrent ? "bg-accent/20 text-text" : "text-muted hover:bg-surface-2-soft hover:text-text"}`}
                      >
                        <span className="truncate">{routine.name}</span>
                        <span className={`ml-3 text-xs ${isCurrent ? "text-emerald-300" : "text-transparent"}`}>✓</span>
                      </button>
                    </form>
                  );
                })}

                <Link
                  href="/routines/new"
                  className="block rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2-soft hover:text-text"
                >
                  + Create New Routine
                </Link>
              </div>
            </details>

            {activeRoutine ? (
              <div className="space-y-3 rounded-xl border border-border/70 bg-surface/65 p-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-text">{activeRoutine.name}</h2>
                  <p className="text-xs text-muted">{activeRoutine.cycle_length_days}-day cycle</p>
                </div>

                <ul className="space-y-1 text-sm text-muted">
                  {activeRoutineDays.slice(0, 5).map((day) => (
                    <li key={day.id} className="truncate">
                      Day {day.day_index + 1}: {day.name?.trim() || (day.is_rest ? "Rest" : "Workout")}
                    </li>
                  ))}
                  {activeRoutineDays.length > 5 ? <li>+{activeRoutineDays.length - 5} more days</li> : null}
                  {activeRoutineDays.length === 0 ? <li>{activeRoutine.cycle_length_days} days</li> : null}
                </ul>

                <Link
                  href={`/routines/${activeRoutine.id}/edit`}
                  className={getAppButtonClassName({ variant: "primary", fullWidth: true })}
                >
                  Edit Routine
                </Link>
              </div>
            ) : null}
          </>
        )}
      </Glass>
    </section>
  );
}
