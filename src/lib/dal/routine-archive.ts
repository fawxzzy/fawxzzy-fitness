import { canAddListedRoutineForTier } from "@/lib/pro-tier-limits";
import { isMissingRoutineArchivedAtColumnError, isRoutineArchived } from "@/lib/routine-archive";

/**
 * Archive / restore a routine (replaces delete, 2026-11-26). Nothing is deleted: the routine row, its days and
 * exercises, its sessions, sets and progression events all stay, so History keeps every workout.
 *
 * Archive rules:
 * - blocked while the routine has a workout in progress (finish or discard it first);
 * - if it is the active routine, the profile's active_routine_id is cleared FIRST (conditionally, only while it still
 *   points at this routine), so there is never an active pointer to an archived routine; Today then asks the person
 *   to choose a routine;
 * - archiving an archived routine is a no-op success.
 * Restore rules:
 * - Free keeps at most 3 non-archived routines: restore is refused at the limit (`routine-limit`);
 * - restore bumps updated_at so the restored routine sorts first and is accessible on the Free plan;
 * - it does not make the routine active.
 * Both return `archive-unsupported` when the archived_at column does not exist yet (migration not applied).
 */

type ArchiveError = { message?: string | null; code?: string | null };
type QueryResult<T> = { data: T | null; error: ArchiveError | null };

type FilterChain<T> = PromiseLike<QueryResult<T>> & {
  eq(column: string, value: string): FilterChain<T>;
  is(column: string, value: null): FilterChain<T>;
  limit(count: number): FilterChain<T>;
};

type TableQuery = {
  select(columns: string): FilterChain<Array<Record<string, unknown>>>;
  update(values: Record<string, unknown>): FilterChain<unknown>;
};

export type RoutineArchiveClient = {
  from(table: "routines" | "sessions" | "profiles"): TableQuery;
};

export type ArchiveRoutineFailureReason =
  | "archive-unsupported"
  | "routine-lookup-failed"
  | "routine-not-found"
  | "session-lookup-failed"
  | "in-progress-session"
  | "profile-update-failed"
  | "routine-update-failed";

export type ArchiveRoutineMutationResult =
  | { ok: true; alreadyArchived: boolean; clearedActiveRoutine: boolean }
  | { ok: false; reason: ArchiveRoutineFailureReason; error: string };

export type RestoreRoutineFailureReason =
  | "archive-unsupported"
  | "routine-lookup-failed"
  | "routine-not-found"
  | "routine-limit"
  | "routine-update-failed";

export type RestoreRoutineMutationResult =
  | { ok: true; alreadyListed: boolean }
  | { ok: false; reason: RestoreRoutineFailureReason; error: string };

function errorMessage(error: ArchiveError | null | undefined, fallback: string) {
  return error?.message?.trim() || fallback;
}

export async function archiveRoutineMutation(args: {
  routineId: string;
  userId: string;
  supabase: RoutineArchiveClient;
  nowIso?: string;
}): Promise<ArchiveRoutineMutationResult> {
  const { data: routineRows, error: routineError } = await args.supabase
    .from("routines")
    .select("id, archived_at")
    .eq("id", args.routineId)
    .eq("user_id", args.userId)
    .limit(1);

  if (routineError) {
    return isMissingRoutineArchivedAtColumnError(routineError)
      ? { ok: false, reason: "archive-unsupported", error: errorMessage(routineError, "archived_at missing") }
      : { ok: false, reason: "routine-lookup-failed", error: errorMessage(routineError, "Failed to load routine.") };
  }

  const routine = routineRows?.[0] as { id: string; archived_at?: string | null } | undefined;
  if (!routine) {
    return { ok: false, reason: "routine-not-found", error: "Routine not found." };
  }

  if (isRoutineArchived(routine)) {
    return { ok: true, alreadyArchived: true, clearedActiveRoutine: false };
  }

  const { data: inProgressRows, error: sessionError } = await args.supabase
    .from("sessions")
    .select("id")
    .eq("user_id", args.userId)
    .eq("routine_id", args.routineId)
    .eq("status", "in_progress")
    .limit(1);

  if (sessionError) {
    return { ok: false, reason: "session-lookup-failed", error: errorMessage(sessionError, "Failed to check sessions.") };
  }

  if ((inProgressRows ?? []).length > 0) {
    return { ok: false, reason: "in-progress-session", error: "Routine has a workout in progress." };
  }

  const { data: profileRows, error: profileLookupError } = await args.supabase
    .from("profiles")
    .select("active_routine_id")
    .eq("id", args.userId)
    .limit(1);

  if (profileLookupError) {
    return { ok: false, reason: "profile-update-failed", error: errorMessage(profileLookupError, "Failed to load profile.") };
  }

  const isActiveRoutine = (profileRows?.[0] as { active_routine_id?: string | null } | undefined)?.active_routine_id === args.routineId;
  if (isActiveRoutine) {
    const { error: profileUpdateError } = await args.supabase
      .from("profiles")
      .update({ active_routine_id: null })
      .eq("id", args.userId)
      .eq("active_routine_id", args.routineId);

    if (profileUpdateError) {
      return { ok: false, reason: "profile-update-failed", error: errorMessage(profileUpdateError, "Failed to clear active routine.") };
    }
  }

  const { error: updateError } = await args.supabase
    .from("routines")
    .update({ archived_at: args.nowIso ?? new Date().toISOString() })
    .eq("id", args.routineId)
    .eq("user_id", args.userId)
    .is("archived_at", null);

  if (updateError) {
    return isMissingRoutineArchivedAtColumnError(updateError)
      ? { ok: false, reason: "archive-unsupported", error: errorMessage(updateError, "archived_at missing") }
      : { ok: false, reason: "routine-update-failed", error: errorMessage(updateError, "Failed to archive routine.") };
  }

  return { ok: true, alreadyArchived: false, clearedActiveRoutine: isActiveRoutine };
}

export async function restoreRoutineMutation(args: {
  routineId: string;
  userId: string;
  supabase: RoutineArchiveClient;
  accessState: "free" | "pro";
  nowIso?: string;
}): Promise<RestoreRoutineMutationResult> {
  const { data: routineRows, error: routineError } = await args.supabase
    .from("routines")
    .select("id, archived_at")
    .eq("user_id", args.userId);

  if (routineError) {
    return isMissingRoutineArchivedAtColumnError(routineError)
      ? { ok: false, reason: "archive-unsupported", error: errorMessage(routineError, "archived_at missing") }
      : { ok: false, reason: "routine-lookup-failed", error: errorMessage(routineError, "Failed to load routines.") };
  }

  const routines = (routineRows ?? []) as Array<{ id: string; archived_at?: string | null }>;
  const target = routines.find((routine) => routine.id === args.routineId);
  if (!target) {
    return { ok: false, reason: "routine-not-found", error: "Routine not found." };
  }

  if (!isRoutineArchived(target)) {
    return { ok: true, alreadyListed: true };
  }

  const listedRoutineCount = routines.filter((routine) => !isRoutineArchived(routine)).length;
  if (!canAddListedRoutineForTier({ listedRoutineCount, accessState: args.accessState })) {
    return { ok: false, reason: "routine-limit", error: "Free plan routine limit reached." };
  }

  const nowIso = args.nowIso ?? new Date().toISOString();
  const { error: updateError } = await args.supabase
    .from("routines")
    .update({ archived_at: null, updated_at: nowIso })
    .eq("id", args.routineId)
    .eq("user_id", args.userId);

  if (updateError) {
    return { ok: false, reason: "routine-update-failed", error: errorMessage(updateError, "Failed to restore routine.") };
  }

  return { ok: true, alreadyListed: false };
}
