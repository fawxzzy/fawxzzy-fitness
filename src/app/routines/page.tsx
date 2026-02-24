import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { Glass } from "@/components/ui/Glass";
import { listShellClasses } from "@/components/ui/listShellClasses";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";
import { supabaseServer } from "@/lib/supabase/server";
import { revalidateHistoryViews, revalidateRoutinesViews } from "@/lib/revalidation";
import type { RoutineRow } from "@/types/db";

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

async function moveRoutineAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const routineId = String(formData.get("routineId") ?? "");
  const direction = String(formData.get("direction") ?? "");

  if (!routineId || (direction !== "up" && direction !== "down")) {
    throw new Error("Missing reorder info");
  }

  const { data: orderedRoutines, error: routinesError } = await supabase
    .from("routines")
    .select("id, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (routinesError) {
    throw new Error(routinesError.message);
  }

  const index = (orderedRoutines ?? []).findIndex((routine) => routine.id === routineId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= (orderedRoutines ?? []).length) {
    return;
  }

  const targetRoutine = orderedRoutines?.[targetIndex];
  if (!targetRoutine) {
    return;
  }

  const timestampBase = Date.now();
  const topTimestamp = new Date(timestampBase + 2000).toISOString();
  const bottomTimestamp = new Date(timestampBase + 1000).toISOString();

  const firstId = direction === "up" ? routineId : targetRoutine.id;
  const secondId = direction === "up" ? targetRoutine.id : routineId;

  const { error: firstUpdateError } = await supabase
    .from("routines")
    .update({ updated_at: topTimestamp })
    .eq("id", firstId)
    .eq("user_id", user.id);

  if (firstUpdateError) {
    throw new Error(firstUpdateError.message);
  }

  const { error: secondUpdateError } = await supabase
    .from("routines")
    .update({ updated_at: bottomTimestamp })
    .eq("id", secondId)
    .eq("user_id", user.id);

  if (secondUpdateError) {
    throw new Error(secondUpdateError.message);
  }

  revalidateRoutinesViews();
}

async function deleteRoutineAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const routineId = String(formData.get("routineId") ?? "");

  if (!routineId) {
    throw new Error("Missing routine ID");
  }

  const { data: profile, error: profileLoadError } = await supabase
    .from("profiles")
    .select("active_routine_id")
    .eq("id", user.id)
    .single();

  if (profileLoadError) {
    throw new Error(profileLoadError.message);
  }

  if (profile.active_routine_id === routineId) {
    const { error: clearActiveError } = await supabase
      .from("profiles")
      .update({ active_routine_id: null })
      .eq("id", user.id);

    if (clearActiveError) {
      throw new Error(clearActiveError.message);
    }
  }

  const { error: detachSessionError } = await supabase
    .from("sessions")
    .update({ routine_id: null })
    .eq("routine_id", routineId)
    .eq("user_id", user.id);

  if (detachSessionError) {
    throw new Error(detachSessionError.message);
  }

  const { error: deleteError } = await supabase
    .from("routines")
    .delete()
    .eq("id", routineId)
    .eq("user_id", user.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidateRoutinesViews();
  revalidateHistoryViews();
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

  return (
    <section className="space-y-4">
      <AppNav />

      <Glass variant="base" className="space-y-2 p-2" interactive={false}>
        <div className="flex justify-end">
          <Link
            href="/routines/new"
            className="inline-flex items-center justify-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          >
            Create Routine
          </Link>
        </div>

        <ul className={`${listShellClasses.viewport} ${listShellClasses.list}`}>
          {routines.map((routine, index) => {
            const isActive = profile.active_routine_id === routine.id;

            return (
              <li key={routine.id} className={listShellClasses.card}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900">{routine.name}</p>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <form action={moveRoutineAction}>
                      <input type="hidden" name="routineId" value={routine.id} />
                      <button
                        type="submit"
                        name="direction"
                        value="up"
                        disabled={index === 0}
                        className={`${listShellClasses.pillAction} border border-slate-300 bg-white/80 text-slate-700 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40`}
                        aria-label={`Move ${routine.name} up`}
                        title="Move up"
                      >
                        ↑
                      </button>
                    </form>
                    <form action={moveRoutineAction}>
                      <input type="hidden" name="routineId" value={routine.id} />
                      <button
                        type="submit"
                        name="direction"
                        value="down"
                        disabled={index === routines.length - 1}
                        className={`${listShellClasses.pillAction} border border-slate-300 bg-white/80 text-slate-700 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40`}
                        aria-label={`Move ${routine.name} down`}
                        title="Move down"
                      >
                        ↓
                      </button>
                    </form>
                    <Link
                      href={`/routines/${routine.id}/edit`}
                      className={`${listShellClasses.pillAction} border border-accent/40 bg-accent/10 text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur transition-all hover:bg-accent/20`}
                    >
                      Edit
                    </Link>
                    <form action={deleteRoutineAction}>
                      <input type="hidden" name="routineId" value={routine.id} />
                      <button
                        type="submit"
                        className={`${listShellClasses.pillAction} border border-red-600/70 bg-red-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur transition-all hover:bg-red-700`}
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
                <form action={setActiveRoutineAction}>
                  <input type="hidden" name="routineId" value={routine.id} />
                  <button
                    type="submit"
                    disabled={isActive}
                    className={`mt-3 w-full rounded-md px-3 py-2 text-sm ${
                      isActive ? "border border-accent bg-accent/10 font-semibold text-accent" : "border border-slate-400 bg-white text-slate-700"
                    }`}
                  >
                    {isActive ? "Active" : "Set Active"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </Glass>
    </section>
  );
}
