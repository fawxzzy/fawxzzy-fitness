"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { revalidateRoutinesViews } from "@/lib/revalidation";
import { supabaseServer } from "@/lib/supabase/server";

export async function deleteRoutineAction(payload: { routineId: string }): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = payload.routineId?.trim();

  if (!routineId) {
    return { ok: false, error: "Missing routine ID." };
  }

  const { error } = await supabase
    .from("routines")
    .delete()
    .eq("id", routineId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message || "Failed to delete routine." };
  }

  revalidateRoutinesViews();
  revalidatePath(`/routines/${routineId}/edit`);

  return { ok: true };
}
