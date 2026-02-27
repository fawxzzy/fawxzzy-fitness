import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { AppButton, DestructiveButton } from "@/components/ui/AppButton";
import { Glass } from "@/components/ui/Glass";
import { listShellClasses } from "@/components/ui/listShellClasses";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
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
        <div className="w-full">
          <Link
            href="/routines/new"
            className={getAppButtonClassName({ variant: "primary", fullWidth: true })}
          >
            Create Routine
          </Link>
        </div>

        <ul className={`${listShellClasses.viewport} ${listShellClasses.list}`}>
          {routines.map((routine) => {
            const isActive = profile.active_routine_id === routine.id;

            return (
              <li key={routine.id} className={listShellClasses.card}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-text underline decoration-border underline-offset-2">{routine.name}</p>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <Link
                      href={`/routines/${routine.id}/edit`}
                      className={getAppButtonClassName({ variant: "secondary", size: "sm", className: listShellClasses.pillAction })}
                    >
                      Edit
                    </Link>
                    <form action={deleteRoutineAction}>
                      <input type="hidden" name="routineId" value={routine.id} />
                      <DestructiveButton type="submit" size="sm" className={listShellClasses.pillAction}>
                        Delete
                      </DestructiveButton>
                    </form>
                  </div>
                </div>
                <form action={setActiveRoutineAction}>
                  <input type="hidden" name="routineId" value={routine.id} />
                  <AppButton
                    type="submit"
                    disabled={isActive}
                    variant={isActive ? "primary" : "secondary"}
                    size="sm"
                    className="mt-3 w-full"
                  >
                    {isActive ? "Active" : "Set Active"}
                  </AppButton>
                </form>
              </li>
            );
          })}
        </ul>
      </Glass>
    </section>
  );
}
