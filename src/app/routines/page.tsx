import Link from "next/link";
import { revalidatePath } from "next/cache";
import { AppNav } from "@/components/AppNav";
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

  const { error: clearError } = await supabase
    .from("routines")
    .update({ is_active: false })
    .eq("user_id", user.id);

  if (clearError) {
    throw new Error(clearError.message);
  }

  const { error: markError } = await supabase
    .from("routines")
    .update({ is_active: true })
    .eq("id", routineId)
    .eq("user_id", user.id);

  if (markError) {
    throw new Error(markError.message);
  }

  revalidatePath("/routines");
  revalidatePath("/today");
}

export default async function RoutinesPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const supabase = supabaseServer();

  const { data } = await supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, start_date, timezone, is_active, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const routines = (data ?? []) as RoutineRow[];

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Routines</h1>
        <p className="text-sm text-slate-600">Timezone: {profile.timezone}</p>
      </div>

      <Link href="/routines/new" className="block rounded-md bg-emerald-600 px-4 py-3 text-center text-white">
        Create Routine
      </Link>

      <ul className="space-y-2">
        {routines.map((routine) => {
          const isActive = profile.active_routine_id === routine.id;

          return (
            <li key={routine.id} className="space-y-2 rounded-md bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{routine.name}</p>
                  <p className="text-xs text-slate-600">
                    {routine.cycle_length_days} day cycle · starts {routine.start_date} · {routine.timezone}
                  </p>
                </div>
                <Link href={`/routines/${routine.id}/edit`} className="text-sm text-slate-700 underline">
                  Edit
                </Link>
              </div>
              <form action={setActiveRoutineAction}>
                <input type="hidden" name="routineId" value={routine.id} />
                <button
                  type="submit"
                  disabled={isActive}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
                >
                  {isActive ? "Active" : "Set Active"}
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      {routines.length === 0 ? (
        <p className="rounded-md bg-white p-3 text-sm text-slate-500 shadow-sm">No routines yet.</p>
      ) : null}
      <AppNav />
    </section>
  );
}
