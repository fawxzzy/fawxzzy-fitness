import Link from "next/link";
import { revalidatePath } from "next/cache";
import { AppNav } from "@/components/AppNav";
import { Glass } from "@/components/ui/Glass";
import { listShellClasses } from "@/components/ui/listShellClasses";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";
import { supabaseServer } from "@/lib/supabase/server";
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

  revalidatePath("/routines");
  revalidatePath("/today");
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

  revalidatePath("/routines");
  revalidatePath("/today");
  revalidatePath("/history");
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

      <Glass variant="base" className="p-2" interactive={false}>
        <Link
          href="/routines/new"
          className="inline-flex w-full items-center justify-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
        >
          Create Routine
        </Link>
      </Glass>

      <Glass variant="base" className="p-2" interactive={false}>
        <ul className={`${listShellClasses.viewport} ${listShellClasses.list}`}>
          {routines.map((routine) => {
            const isActive = profile.active_routine_id === routine.id;

            return (
              <li key={routine.id} className={listShellClasses.card}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-base font-semibold text-slate-900">{routine.name}</p>
                    <p className="text-xs text-slate-600">{routine.cycle_length_days} day cycle · {routine.weight_unit}</p>
                  </div>
                  <div className="flex gap-2 text-sm">
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
                        className={`${listShellClasses.pillAction} border border-red-200/80 bg-red-100/65 text-red-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur transition-all hover:bg-red-100/85`}
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
