import Link from "next/link";
import { revalidatePath } from "next/cache";
import { AppNav } from "@/components/AppNav";
import { Glass } from "@/components/ui/Glass";
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
      <div>
        <h1 className="text-2xl font-semibold">Routines</h1>
        <p className="text-sm text-slate-600">Timezone: {profile.timezone}</p>
      </div>

      <Link href="/routines/new" className="block rounded-md bg-accent px-4 py-3 text-center text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">
        Create Routine
      </Link>

      <ul className="space-y-2">
        {routines.map((routine) => {
          const isActive = profile.active_routine_id === routine.id;

          return (
            <Glass key={routine.id} variant="base" className="space-y-2 p-3" interactive={false}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{routine.name}</p>
                  <p className="text-xs text-slate-600">{routine.cycle_length_days} day cycle · {routine.weight_unit}</p>
                </div>
                <div className="flex gap-3 text-sm">
                  <Link href={`/routines/${routine.id}/edit`} className="text-slate-700 underline">
                    Edit
                  </Link>
                  <form action={deleteRoutineAction}>
                    <input type="hidden" name="routineId" value={routine.id} />
                    <button
                      type="submit"
                      className="appearance-none border-0 bg-transparent p-0 text-red-600 underline transition-colors hover:text-red-700 focus:outline-none focus-visible:text-red-700"
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
                  className={`w-full rounded-md px-3 py-2 text-sm ${
                    isActive ? "border border-accent bg-accent/10 font-semibold text-accent" : "border border-slate-300 text-slate-700"
                  }`}
                >
                  {isActive ? "Active" : "Set Active"}
                </button>
              </form>
            </Glass>
          );
        })}
      </ul>

      {routines.length === 0 ? (
        <Glass variant="base" className="p-3 text-sm text-slate-500" interactive={false}>No routines yet.</Glass>
      ) : null}
      <AppNav />
    </section>
  );
}
