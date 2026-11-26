import { isRoutineArchived, selectWithRoutineArchiveCompat } from "@/lib/routine-archive";
import {
  pickStarterRaceWinner,
  resolveTodayNoRoutineState,
  STARTER_RACE_WINDOW_MS,
  type StarterActivationInput,
  type TodayNoRoutineState,
  type TodayRoutineChoice,
} from "@/lib/start-fast-guards";
import type { supabaseServer } from "@/lib/supabase/server";

/**
 * Reads behind the "Start fast" guards (start-fast-guards.ts). Every read fails closed: an error becomes `null`
 * ("unknown"), and the guards treat unknown as "do not offer plans" and "do not activate".
 */

type SupabaseClient = Awaited<ReturnType<typeof supabaseServer>>;

type RoutineListRow = { id: string; name: string | null; created_at: string | null; archived_at?: string | null };

async function readHasOpenWorkout(supabase: SupabaseClient, userId: string): Promise<boolean | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .limit(1);
  if (error || !data) return null;
  return data.length > 0;
}

type ActivePointerRead = { activeRoutineId: string | null; hasLiveActiveRoutine: boolean | null };

/** Fresh read of the active pointer, then whether it names a routine that exists and is not archived. */
async function readActivePointer(supabase: SupabaseClient, userId: string): Promise<ActivePointerRead> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("active_routine_id")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) return { activeRoutineId: null, hasLiveActiveRoutine: null };
  const activeRoutineId = (profile as { active_routine_id?: string | null } | null)?.active_routine_id ?? null;
  if (!activeRoutineId) return { activeRoutineId: null, hasLiveActiveRoutine: false };

  const { data: routine, error: routineError } = await selectWithRoutineArchiveCompat<{ id: string; archived_at?: string | null } | null>(
    (withArchive) => supabase
      .from("routines")
      .select(withArchive ? "id, archived_at" : "id")
      .eq("id", activeRoutineId)
      .eq("user_id", userId)
      .maybeSingle()
      .returns<{ id: string; archived_at?: string | null } | null>(),
  );
  if (routineError) return { activeRoutineId, hasLiveActiveRoutine: null };
  return { activeRoutineId, hasLiveActiveRoutine: Boolean(routine) && !isRoutineArchived(routine) };
}

/** Everything resolveStarterActivation needs for `routineId`, read fresh just before the decision. */
export async function readStarterActivationInput(supabase: SupabaseClient, userId: string, routineId: string): Promise<StarterActivationInput> {
  const [hasOpenWorkout, pointer] = await Promise.all([
    readHasOpenWorkout(supabase, userId),
    readActivePointer(supabase, userId),
  ]);
  return { routineId, activeRoutineId: pointer.activeRoutineId, hasLiveActiveRoutine: pointer.hasLiveActiveRoutine, hasOpenWorkout };
}

export async function readHasOpenWorkoutForUser(supabase: SupabaseClient, userId: string) {
  return await readHasOpenWorkout(supabase, userId);
}

/**
 * Clears profiles.active_routine_id only while it still names `routineId` (a conditional update), so a routine
 * removed after it was activated never leaves a dangling pointer, and a newer choice is never undone.
 */
export async function clearActiveRoutineIfMatches(supabase: SupabaseClient, userId: string, routineId: string): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ active_routine_id: null })
    .eq("id", userId)
    .eq("active_routine_id", routineId);
  return !error;
}

/**
 * Live (not archived) routines with this name made in the last minute. Two taps that both passed the replay check
 * each see the other's row here, and pickStarterRaceWinner names the same survivor for both.
 */
export async function findStarterRaceWinner(supabase: SupabaseClient, userId: string, routineName: string): Promise<string | null> {
  const since = new Date(Date.now() - STARTER_RACE_WINDOW_MS).toISOString();
  const { data, error } = await selectWithRoutineArchiveCompat<RoutineListRow[]>((withArchive) => supabase
    .from("routines")
    .select(withArchive ? "id, name, created_at, archived_at" : "id, name, created_at")
    .eq("user_id", userId)
    .eq("name", routineName)
    .gte("created_at", since)
    .returns<RoutineListRow[]>());
  if (error || !data) return null;
  return pickStarterRaceWinner(data.filter((row) => !isRoutineArchived(row)));
}

/** What Today shows with no active routine (see resolveTodayNoRoutineState). */
export async function loadTodayNoRoutineState(supabase: SupabaseClient, userId: string): Promise<TodayNoRoutineState> {
  const [routinesResult, completedResult] = await Promise.all([
    selectWithRoutineArchiveCompat<RoutineListRow[]>((withArchive) => supabase
      .from("routines")
      .select(withArchive ? "id, name, created_at, archived_at" : "id, name, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<RoutineListRow[]>()),
    supabase
      .from("sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "completed")
      .limit(1),
  ]);

  const routines = routinesResult.error || !routinesResult.data ? null : routinesResult.data;
  const liveRoutines: TodayRoutineChoice[] | null = routines
    ? routines.filter((row) => !isRoutineArchived(row)).map((row) => ({ id: row.id, name: row.name?.trim() || "Untitled routine" }))
    : null;
  return resolveTodayNoRoutineState({
    liveRoutines,
    archivedRoutineCount: routines ? routines.filter((row) => isRoutineArchived(row)).length : null,
    completedWorkoutCount: completedResult.error || !completedResult.data ? null : completedResult.data.length,
  });
}
