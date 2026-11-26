/**
 * Routine archive (2026-11-26): a routine is archived instead of deleted, so the workouts logged with it stay in
 * History. An archived routine has `routines.archived_at` set; restoring clears it.
 *
 * Schema compatibility: the `archived_at` column is added by migration 20261126000000_routine_archive_v1 (master:
 * supabase/master-fitness/20261126000000_routine_archive_fitness_v1.sql). Until it is applied, every read that asks
 * for the column fails with a missing-column error; `selectWithRoutineArchiveCompat` retries without it and reports
 * `archiveSupported: false`, so the app keeps working exactly as before (every routine counts as not archived and
 * the Archive action is not offered). Same idea as `progression-schema-compat.ts`.
 */

type SupabaseLikeError = {
  message?: string | null;
  code?: string | null;
};

export const ROUTINE_ARCHIVED_AT_COLUMN = "archived_at" as const;

/** Plain copy shown by the archive flows. One place so the screens and the server actions say the same thing. */
export const ROUTINE_ARCHIVE_COPY = {
  confirmTitle: "Archive routine?",
  confirmLabel: "Archive",
  restoreLabel: "Restore",
  archivedToast: "Routine archived. Its workouts stay in History.",
  restoredToast: "Routine restored.",
  unavailable: "Archiving isn't available right now. Try again later.",
  inProgressBlocked: "This routine has a workout in progress. Finish or discard it, then archive the routine.",
  archivedLocked: "This routine is archived. Restore it from the Archived list on Routines first.",
  restoreLimit:
    "The Free plan keeps up to 3 routines in your list. Archive one first, or upgrade to Pro to keep more.",
  archiveFailed: "Could not archive the routine. Try again.",
  restoreFailed: "Could not restore the routine. Try again.",
} as const;

/**
 * What archiving does, in the words the confirm shows. Mirrors archiveRoutineMutation: the routine leaves the list,
 * nothing is deleted, its workouts stay in History, and it can be restored. Archiving the active routine clears the
 * active routine, so Today asks you to choose one.
 */
export function describeRoutineArchiveConsequence(routine: { isActive?: boolean }): string {
  const base = "It leaves your routines list. Your workouts from it stay in History, and you can restore it any time from Archived.";
  return routine.isActive
    ? `${base} It's your active routine, so Today will ask you to choose another.`
    : base;
}

/**
 * True when a read or write failed only because `routines.archived_at` does not exist yet (migration not applied).
 * Covers PostgREST select/filter errors (`column routines.archived_at does not exist`, SQLSTATE 42703) and
 * schema-cache write errors (`Could not find the 'archived_at' column of 'routines' in the schema cache`, PGRST204).
 */
export function isMissingRoutineArchivedAtColumnError(error: SupabaseLikeError | null | undefined): boolean {
  const message = (error?.message ?? "").toLowerCase();
  if (!message.includes(ROUTINE_ARCHIVED_AT_COLUMN)) {
    return false;
  }

  return (
    message.includes("does not exist")
    || message.includes("schema cache")
    || error?.code === "42703"
    || error?.code === "PGRST204"
  );
}

export type RoutineArchiveFields = {
  archived_at?: string | null;
};

export function isRoutineArchived(routine: RoutineArchiveFields | null | undefined): boolean {
  const value = routine?.archived_at;
  return typeof value === "string" && value.trim().length > 0;
}

export function excludeArchivedRoutines<T extends RoutineArchiveFields>(routines: readonly T[]): T[] {
  return routines.filter((routine) => !isRoutineArchived(routine));
}

export function partitionRoutinesByArchiveState<T extends RoutineArchiveFields>(routines: readonly T[]) {
  const active: T[] = [];
  const archived: T[] = [];
  for (const routine of routines) {
    (isRoutineArchived(routine) ? archived : active).push(routine);
  }

  return { active, archived };
}

/** Archived list order: most recently archived first, then name, then id (deterministic). */
export function sortArchivedRoutines<T extends RoutineArchiveFields & { id: string; name?: string | null }>(routines: readonly T[]): T[] {
  return routines.slice().sort((left, right) => {
    const leftAt = left.archived_at ?? "";
    const rightAt = right.archived_at ?? "";
    if (leftAt !== rightAt) {
      return leftAt < rightAt ? 1 : -1;
    }

    const nameCompare = (left.name ?? "").localeCompare(right.name ?? "");
    return nameCompare !== 0 ? nameCompare : left.id.localeCompare(right.id);
  });
}

/**
 * "Archived Nov 26" in the person's time zone, formatted on the server so the client renders the same text.
 * Falls back to UTC for an invalid zone and to plain "Archived" for an unreadable timestamp.
 */
export function formatRoutineArchivedLabel(archivedAt: string | null | undefined, timeZone?: string | null): string {
  if (!archivedAt) return "Archived";
  const date = new Date(archivedAt);
  if (Number.isNaN(date.getTime())) return "Archived";
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  try {
    return `Archived ${new Intl.DateTimeFormat("en-US", { ...options, timeZone: timeZone || "UTC" }).format(date)}`;
  } catch {
    return `Archived ${new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(date)}`;
  }
}

type CompatResult<TData> = {
  data: TData | null;
  error: SupabaseLikeError | null;
  count?: number | null;
};

/**
 * Runs a routines read that wants `archived_at`. `run(true)` must build a FRESH query that includes the column (in
 * the select list or as a filter); `run(false)` the same query without it. When the column is missing the legacy
 * query runs and `archiveSupported` is false; any other error is returned as is.
 */
export async function selectWithRoutineArchiveCompat<TData>(
  run: (withArchive: boolean) => PromiseLike<CompatResult<TData>>,
): Promise<CompatResult<TData> & { archiveSupported: boolean }> {
  const first = await run(true);
  if (first.error && isMissingRoutineArchivedAtColumnError(first.error)) {
    const fallback = await run(false);
    return { data: fallback.data, error: fallback.error, count: fallback.count, archiveSupported: false };
  }

  return { data: first.data, error: first.error, count: first.count, archiveSupported: true };
}
