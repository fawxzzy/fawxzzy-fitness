import { canAddListedRoutineForTier } from "@/lib/pro-tier-limits";
import { isMissingRoutineArchivedAtColumnError, isRoutineArchived } from "@/lib/routine-archive";

/**
 * Archive / restore a routine (replaces delete, 2026-11-26). Nothing is deleted: the routine row, its days and
 * exercises, its sessions, sets and progression events all stay, so History keeps every workout.
 *
 * Archive rules:
 * - blocked while the routine has a workout in progress (finish or discard it first). The check runs again right after
 *   the archive write; if a workout started in between, the archive is undone (guarded on our own timestamp) and the
 *   result is `in-progress-session`;
 * - the routine is archived FIRST, then, if it was the active routine, the profile's active_routine_id is cleared
 *   (conditionally, only while it still points at this routine). If clearing fails the archive still succeeds: Today
 *   already treats an archived active routine as no active routine and asks the person to choose one;
 * - archiving an archived routine is a no-op success.
 * Restore rules:
 * - Free keeps at most 3 non-archived routines: restore is refused at the limit (`routine-limit`). The count runs
 *   again right after the restore write; if another routine became listed in between, the restore is undone;
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

  const inProgress = await hasInProgressSession(args);
  if (inProgress.error) {
    return { ok: false, reason: "session-lookup-failed", error: errorMessage(inProgress.error, "Failed to check sessions.") };
  }

  if (inProgress.found) {
    return { ok: false, reason: "in-progress-session", error: "Routine has a workout in progress." };
  }

  const archivedAt = args.nowIso ?? new Date().toISOString();
  const { error: updateError } = await args.supabase
    .from("routines")
    .update({ archived_at: archivedAt })
    .eq("id", args.routineId)
    .eq("user_id", args.userId)
    .is("archived_at", null);

  if (updateError) {
    return isMissingRoutineArchivedAtColumnError(updateError)
      ? { ok: false, reason: "archive-unsupported", error: errorMessage(updateError, "archived_at missing") }
      : { ok: false, reason: "routine-update-failed", error: errorMessage(updateError, "Failed to archive routine.") };
  }

  // A workout may have started between the check and the write. If so, undo our archive (only while it is still ours).
  // A failed recheck keeps the archive: the session itself stays loggable and History keeps it either way.
  const recheck = await hasInProgressSession(args);
  if (!recheck.error && recheck.found) {
    await args.supabase
      .from("routines")
      .update({ archived_at: null })
      .eq("id", args.routineId)
      .eq("user_id", args.userId)
      .eq("archived_at", archivedAt);
    return { ok: false, reason: "in-progress-session", error: "Routine has a workout in progress." };
  }

  const clearedActiveRoutine = await clearActiveRoutinePointer(args);
  return { ok: true, alreadyArchived: false, clearedActiveRoutine };
}

async function hasInProgressSession(args: { routineId: string; userId: string; supabase: RoutineArchiveClient }) {
  const { data, error } = await args.supabase
    .from("sessions")
    .select("id")
    .eq("user_id", args.userId)
    .eq("routine_id", args.routineId)
    .eq("status", "in_progress")
    .limit(1);
  return { found: (data ?? []).length > 0, error };
}

/**
 * Clears profiles.active_routine_id when it points at the archived routine, guarded on it still pointing there.
 * Best effort: any failure leaves the pointer, which Today already reads as "no active routine" for an archived one.
 */
async function clearActiveRoutinePointer(args: { routineId: string; userId: string; supabase: RoutineArchiveClient }) {
  try {
    const { data: profileRows, error: profileLookupError } = await args.supabase
      .from("profiles")
      .select("active_routine_id")
      .eq("id", args.userId)
      .limit(1);

    if (profileLookupError) return false;
    const activeRoutineId = (profileRows?.[0] as { active_routine_id?: string | null } | undefined)?.active_routine_id;
    if (activeRoutineId !== args.routineId) return false;

    const { error: profileUpdateError } = await args.supabase
      .from("profiles")
      .update({ active_routine_id: null })
      .eq("id", args.userId)
      .eq("active_routine_id", args.routineId);

    return !profileUpdateError;
  } catch {
    return false;
  }
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

  // Free: count again after the write. If another routine became listed in between, undo this restore (only while
  // it is still listed) and refuse. A failed recount keeps the restore; the next create is still limit-checked.
  if (args.accessState === "free") {
    const { data: afterRows, error: afterError } = await args.supabase
      .from("routines")
      .select("id, archived_at")
      .eq("user_id", args.userId);
    const otherListedCount = ((afterRows ?? []) as Array<{ id: string; archived_at?: string | null }>)
      .filter((routine) => routine.id !== args.routineId && !isRoutineArchived(routine)).length;
    if (!afterError && !canAddListedRoutineForTier({ listedRoutineCount: otherListedCount, accessState: "free" })) {
      await args.supabase
        .from("routines")
        .update({ archived_at: target.archived_at })
        .eq("id", args.routineId)
        .eq("user_id", args.userId)
        .is("archived_at", null);
      return { ok: false, reason: "routine-limit", error: "Free plan routine limit reached." };
    }
  }

  return { ok: true, alreadyListed: false };
}
