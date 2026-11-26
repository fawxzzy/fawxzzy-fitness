"use server";

import { revalidatePath } from "next/cache";
import { setActiveRoutineAction } from "@/app/routines/actions";
import { requireUser } from "@/lib/auth";
import { isRedirectError } from "@/lib/next-navigation-errors";
import { isRoutineArchived, selectWithRoutineArchiveCompat } from "@/lib/routine-archive";
import { readHasOpenWorkoutForUser } from "@/lib/start-fast-state.server";
import { supabaseServer } from "@/lib/supabase/server";

export type ChooseTodayRoutineResult = { ok: true } | { ok: false; error: string };

// A "use server" module may only export async functions, so the copy stays module-private.
const CHOOSE_FAILED_MESSAGE = "Could not switch to that routine. Try again.";
const CHOOSE_WORKOUT_OPEN_MESSAGE = "Finish or discard your open workout first.";
const CHOOSE_UNAVAILABLE_MESSAGE = "That routine is no longer available. Open Routines to pick another.";

/**
 * Today with routines but none active ("Pick a routine for Today"): one tap makes that routine the active one.
 * Refuses while a workout is open (the active pointer never moves under an open workout) and for an archived or
 * missing routine; the tier check and the write itself stay in setActiveRoutineAction.
 */
export async function chooseTodayRoutineAction(routineId: string): Promise<ChooseTodayRoutineResult> {
  if (typeof routineId !== "string" || routineId.trim().length === 0) {
    return { ok: false, error: CHOOSE_FAILED_MESSAGE };
  }

  try {
    const user = await requireUser();
    const supabase = await supabaseServer();

    const hasOpenWorkout = await readHasOpenWorkoutForUser(supabase, user.id);
    if (hasOpenWorkout === null) return { ok: false, error: CHOOSE_FAILED_MESSAGE };
    if (hasOpenWorkout) return { ok: false, error: CHOOSE_WORKOUT_OPEN_MESSAGE };

    const { data: routine, error } = await selectWithRoutineArchiveCompat<{ id: string; archived_at?: string | null } | null>(
      (withArchive) => supabase
        .from("routines")
        .select(withArchive ? "id, archived_at" : "id")
        .eq("id", routineId)
        .eq("user_id", user.id)
        .maybeSingle()
        .returns<{ id: string; archived_at?: string | null } | null>(),
    );
    if (error) return { ok: false, error: CHOOSE_FAILED_MESSAGE };
    if (!routine || isRoutineArchived(routine)) return { ok: false, error: CHOOSE_UNAVAILABLE_MESSAGE };

    const formData = new FormData();
    formData.set("routineId", routineId);
    const result = await setActiveRoutineAction(formData);
    if (!result.ok) {
      // setActiveRoutineAction's own copy is member-facing (e.g. the Free routine limit).
      return { ok: false, error: result.error || CHOOSE_FAILED_MESSAGE };
    }

    revalidatePath("/today");
    return { ok: true };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("[today] choose routine failed", error instanceof Error ? `${error.name}: ${error.message}` : typeof error);
    return { ok: false, error: CHOOSE_FAILED_MESSAGE };
  }
}
