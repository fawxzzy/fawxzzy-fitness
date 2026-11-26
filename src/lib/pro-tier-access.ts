import "server-only";

import { loadProAccessSnapshot } from "@/lib/billing/pro-access";
import {
  selectAccessibleRoutineIdsForTier,
  selectAccessibleWorkoutPlanTemplateIdsForTier,
} from "@/lib/pro-tier-limits";
import { selectWithRoutineArchiveCompat } from "@/lib/routine-archive";
import type { supabaseServer } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof supabaseServer>>;

export async function loadAccessibleRoutineIdsForCurrentTier(args: {
  supabase: SupabaseServerClient;
  userId: string;
}) {
  const proAccess = await loadProAccessSnapshot(args.userId);

  // Archived routines are never accessible (their screens 404 until restored); see routine-archive.ts for the
  // pre-migration fallback.
  const [{ data: profile }, { data: routines, error }] = await Promise.all([
    args.supabase
      .from("profiles")
      .select("active_routine_id")
      .eq("id", args.userId)
      .maybeSingle(),
    selectWithRoutineArchiveCompat<Array<{ id: string; name: string; updated_at: string; created_at: string; archived_at?: string | null }>>(
      (withArchive) => withArchive
        ? args.supabase
          .from("routines")
          .select("id, name, updated_at, created_at, archived_at")
          .eq("user_id", args.userId)
          .order("updated_at", { ascending: false })
        : args.supabase
          .from("routines")
          .select("id, name, updated_at, created_at")
          .eq("user_id", args.userId)
          .order("updated_at", { ascending: false }),
    ),
  ]);

  if (error) {
    return {
      routineIds: new Set<string>(),
      accessState: proAccess.accessState,
      error,
    };
  }

  return {
    routineIds: selectAccessibleRoutineIdsForTier({
      routines: routines ?? [],
      accessState: proAccess.accessState,
      activeRoutineId: profile?.active_routine_id ?? null,
    }),
    accessState: proAccess.accessState,
    error: null,
  };
}

export async function loadAccessibleWorkoutPlanTemplateIdsForCurrentTier(args: {
  supabase: SupabaseServerClient;
  userId: string;
}) {
  const proAccess = await loadProAccessSnapshot(args.userId);

  const { data: templates, error } = await args.supabase
    .from("workout_plan_templates")
    .select("id, name, updated_at, created_at")
    .eq("user_id", args.userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      templateIds: new Set<string>(),
      accessState: proAccess.accessState,
      error,
    };
  }

  return {
    templateIds: selectAccessibleWorkoutPlanTemplateIdsForTier({
      templates: templates ?? [],
      accessState: proAccess.accessState,
    }),
    accessState: proAccess.accessState,
    error: null,
  };
}

