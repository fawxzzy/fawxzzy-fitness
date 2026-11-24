// "Repeat workout" (History session detail): start a NEW session for the routine day a finished workout came from.
// Today's goals stay authoritative: the new session is built by the same start path Today uses
// (`startSessionForRoutineDay`), which reads the day's CURRENT exercises and goals. Nothing from the old session's
// logged numbers is copied, and the old session is never written to.
//
// Only a workout from the ACTIVE routine can be repeated: Today only shows a live workout of the active routine, so a
// session started from any other routine would be invisible there and Today would allow a second concurrent workout.
//
// This module is the pure part (messages, availability, day resolution, the plan). It is kept free of request-scoped
// imports (auth, Supabase) so it is directly unit-testable; the loader ports it needs are injected.

export const REPEAT_WORKOUT_NOT_FOUND_MESSAGE = "That workout could not be found.";
export const REPEAT_WORKOUT_NO_DAY_MESSAGE = "This workout was not started from a routine day, so there is nothing to repeat.";
export const REPEAT_WORKOUT_ROUTINE_INACTIVE_MESSAGE = "This workout belongs to a routine that isn't active. Switch to it in Routines to repeat it.";
export const REPEAT_WORKOUT_ROUTINE_GONE_MESSAGE = "The routine for this workout is gone. Start a workout from Today instead.";
export const REPEAT_WORKOUT_DAY_GONE_MESSAGE = "That day is no longer in the routine. Start a workout from Today instead.";
export const REPEAT_WORKOUT_IN_PROGRESS_MESSAGE = "You already have a workout in progress. Opening it instead.";
export const REPEAT_WORKOUT_OFFLINE_MESSAGE = "You are offline. Reconnect to repeat this workout.";
export const REPEAT_WORKOUT_FAILED_MESSAGE = "Could not start the workout. Try again.";

/** Thrown by a loader when its query reports an error, so a failed lookup is never read as "nothing found". */
export class RepeatWorkoutLoadError extends Error {
  constructor(message = "Repeat workout lookup failed.") {
    super(message);
    this.name = "RepeatWorkoutLoadError";
  }
}

export type RepeatWorkoutSource = {
  id: string;
  status: "in_progress" | "completed";
  routine_id: string | null;
  routine_day_index: number | null;
};

export type RepeatWorkoutAvailability =
  | { available: true }
  | { available: false; reason: string };

/**
 * Cheap check from the finished session row and the user's active routine id: used by the page to show or disable the
 * action, and by the planner for the same rule on the server.
 */
export function getRepeatWorkoutAvailability(
  session: Pick<RepeatWorkoutSource, "routine_id" | "routine_day_index"> | null | undefined,
  activeRoutineId: string | null | undefined,
): RepeatWorkoutAvailability {
  if (!session?.routine_id || typeof session.routine_day_index !== "number") {
    return { available: false, reason: REPEAT_WORKOUT_NO_DAY_MESSAGE };
  }
  if (!activeRoutineId || activeRoutineId !== session.routine_id) {
    return { available: false, reason: REPEAT_WORKOUT_ROUTINE_INACTIVE_MESSAGE };
  }
  return { available: true };
}

export type RepeatWorkoutDay = {
  id: string;
  day_index: number;
};

/** Every loader throws `RepeatWorkoutLoadError` when its query errors. */
export type RepeatWorkoutDeps = {
  loadSourceSession(sessionId: string): Promise<RepeatWorkoutSource | null>;
  /** The user's active routine id (profile), or null when none is selected. */
  loadActiveRoutineId(): Promise<string | null>;
  /** The newest in-progress session of this user (any routine), or null. */
  loadInProgressSessionId(): Promise<string | null>;
  routineExists(routineId: string): Promise<boolean>;
  /**
   * Day ids that the finished session's exercises were created from and that still exist in the routine, one entry per
   * linked exercise (so the same id can repeat). Survives a reorder of the routine's days.
   */
  loadLinkedDayIds(sessionId: string, routineId: string): Promise<string[]>;
  loadDayById(routineId: string, dayId: string): Promise<RepeatWorkoutDay | null>;
  loadDayAtIndex(routineId: string, dayIndex: number): Promise<RepeatWorkoutDay | null>;
};

export type RepeatWorkoutRefusalCode = "not_found" | "no_day" | "routine_inactive" | "routine_gone" | "day_gone" | "failed";

export type RepeatWorkoutPlan =
  | { kind: "open_existing"; sessionId: string; message: string }
  | { kind: "start"; routineId: string; dayId: string }
  | { kind: "refuse"; code: RepeatWorkoutRefusalCode; message: string };

const REFUSAL_MESSAGES: Record<RepeatWorkoutRefusalCode, string> = {
  not_found: REPEAT_WORKOUT_NOT_FOUND_MESSAGE,
  no_day: REPEAT_WORKOUT_NO_DAY_MESSAGE,
  routine_inactive: REPEAT_WORKOUT_ROUTINE_INACTIVE_MESSAGE,
  routine_gone: REPEAT_WORKOUT_ROUTINE_GONE_MESSAGE,
  day_gone: REPEAT_WORKOUT_DAY_GONE_MESSAGE,
  failed: REPEAT_WORKOUT_FAILED_MESSAGE,
};

function refuse(code: RepeatWorkoutRefusalCode): RepeatWorkoutPlan {
  return { kind: "refuse", code, message: REFUSAL_MESSAGES[code] };
}

/** The day id that most of the finished session's linked exercises came from (ties go to the first seen). */
export function pickMostLinkedDayId(dayIds: readonly string[]): string | null {
  const counts = new Map<string, number>();
  for (const id of dayIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Decides what "Repeat workout" does, without writing anything:
 * - a missing, unfinished or ad-hoc session, or one from a routine that is not the active routine -> a plain refusal
 *   (the same rule the page uses, so a hand-made request cannot create a workout Today would not show);
 * - a lookup that errors -> a failure, never "nothing found" (a failed in-progress lookup must not read as none);
 * - an in-progress workout already exists -> open it (never a second one);
 * - otherwise the day the finished session came from, found through its exercises first (survives reordering and
 *   renaming), and only when nothing links back by the day at the same position. A renamed or retitled day at that
 *   position is still the same slot, so the title is never used to refuse. A deleted routine or day is refused.
 */
export async function planRepeatWorkout(deps: RepeatWorkoutDeps, sessionId: string): Promise<RepeatWorkoutPlan> {
  try {
    return await planFromDeps(deps, sessionId);
  } catch (error) {
    if (error instanceof RepeatWorkoutLoadError) {
      return refuse("failed");
    }
    throw error;
  }
}

async function planFromDeps(deps: RepeatWorkoutDeps, sessionId: string): Promise<RepeatWorkoutPlan> {
  const source = await deps.loadSourceSession(sessionId);
  if (!source || source.status !== "completed") {
    return refuse("not_found");
  }

  if (!source.routine_id || typeof source.routine_day_index !== "number") {
    return refuse("no_day");
  }
  const routineId = source.routine_id;
  const dayIndex = source.routine_day_index;

  const activeRoutineId = await deps.loadActiveRoutineId();
  if (getRepeatWorkoutAvailability(source, activeRoutineId).available !== true) {
    return refuse("routine_inactive");
  }

  const inProgressId = await deps.loadInProgressSessionId();
  if (inProgressId) {
    return { kind: "open_existing", sessionId: inProgressId, message: REPEAT_WORKOUT_IN_PROGRESS_MESSAGE };
  }

  if (!(await deps.routineExists(routineId))) {
    return refuse("routine_gone");
  }

  const linkedDayId = pickMostLinkedDayId(await deps.loadLinkedDayIds(source.id, routineId));
  if (linkedDayId) {
    const linkedDay = await deps.loadDayById(routineId, linkedDayId);
    if (linkedDay) {
      return { kind: "start", routineId, dayId: linkedDay.id };
    }
  }

  const dayAtIndex = await deps.loadDayAtIndex(routineId, dayIndex);
  if (!dayAtIndex) {
    return refuse("day_gone");
  }
  return { kind: "start", routineId, dayId: dayAtIndex.id };
}
