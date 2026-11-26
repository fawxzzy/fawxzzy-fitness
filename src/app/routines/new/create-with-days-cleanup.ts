/**
 * createRoutineAction inserts the routine row first, then its days, then marks rest days one by one. It can fail after
 * the row exists (days insert, a rest-day update, the profile unit update) and then returns ok:false WITH the new
 * routineId. Left alone that half-made routine stays, and a retry makes a second one and burns a Free routine slot.
 *
 * This removes the just-created routine (routine_days and their exercises go with it: `on delete cascade`) before the
 * failure is reported, so a retry starts clean. The failure is never returned with a routineId, so the form does not
 * open a routine that is gone.
 */

export const CREATE_ROUTINE_CLEANUP_FAILED_ERROR =
  "Could not finish setting up the routine. Check your routines before trying again.";

type CreateRoutineOutcome = {
  ok: boolean;
  error?: string;
  routineId?: string;
};

export async function createRoutineWithCleanup<T extends CreateRoutineOutcome>(deps: {
  create: () => Promise<T>;
  removeRoutine: (routineId: string) => Promise<{ ok: boolean }>;
}): Promise<T | { ok: false; error: string }> {
  const result = await deps.create();
  if (result.ok || !result.routineId) {
    return result;
  }

  let removed = false;
  try {
    removed = (await deps.removeRoutine(result.routineId)).ok;
  } catch {
    removed = false;
  }

  return {
    ok: false,
    error: removed ? result.error ?? "Could not save the routine." : CREATE_ROUTINE_CLEANUP_FAILED_ERROR,
  };
}
