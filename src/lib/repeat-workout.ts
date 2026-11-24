// "Repeat workout" (History session detail): start a NEW session for the routine day a finished workout came from.
// Today's goals stay authoritative: the new session is built by the same start path Today uses
// (`startSessionForRoutineDay`), which reads the day's CURRENT exercises and goals. Nothing from the old session's
// logged numbers is copied, and the old session is never written to.
//
// This module is the pure part (messages, availability, day resolution, the plan). It is kept free of request-scoped
// imports (auth, Supabase) so it is directly unit-testable; the loader ports it needs are injected.

export const REPEAT_WORKOUT_NOT_FOUND_MESSAGE = "That workout could not be found.";
export const REPEAT_WORKOUT_NO_DAY_MESSAGE = "This workout was not started from a routine day, so there is nothing to repeat.";
export const REPEAT_WORKOUT_ROUTINE_GONE_MESSAGE = "The routine for this workout is gone. Start a workout from Today instead.";
export const REPEAT_WORKOUT_DAY_GONE_MESSAGE = "That day is no longer in the routine. Start a workout from Today instead.";
export const REPEAT_WORKOUT_DAY_CHANGED_MESSAGE = "That day was changed since this workout. Start it from Today instead.";
export const REPEAT_WORKOUT_IN_PROGRESS_MESSAGE = "You already have a workout in progress. Opening it instead.";
export const REPEAT_WORKOUT_OFFLINE_MESSAGE = "You are offline. Reconnect to repeat this workout.";
export const REPEAT_WORKOUT_FAILED_MESSAGE = "Could not start the workout. Try again.";

export type RepeatWorkoutSource = {
  id: string;
  status: "in_progress" | "completed";
  routine_id: string | null;
  routine_day_index: number | null;
  routine_day_name: string | null;
};

export type RepeatWorkoutAvailability =
  | { available: true }
  | { available: false; reason: string };

/** Cheap check from the finished session row alone: used by the page to show or disable the action. */
export function getRepeatWorkoutAvailability(
  session: Pick<RepeatWorkoutSource, "routine_id" | "routine_day_index"> | null | undefined,
): RepeatWorkoutAvailability {
  if (!session?.routine_id || typeof session.routine_day_index !== "number") {
    return { available: false, reason: REPEAT_WORKOUT_NO_DAY_MESSAGE };
  }
  return { available: true };
}

export type RepeatWorkoutDay = {
  id: string;
  name: string | null;
  day_index: number;
  start_date: string | null;
};

export type RepeatWorkoutDeps = {
  loadSourceSession(sessionId: string): Promise<RepeatWorkoutSource | null>;
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
  /** Display name a day would get as a custom title (empty when it only has a placeholder or weekday name). */
  readCustomDayName(day: RepeatWorkoutDay): string;
};

export type RepeatWorkoutRefusalCode = "not_found" | "no_day" | "routine_gone" | "day_gone" | "day_changed";

export type RepeatWorkoutPlan =
  | { kind: "open_existing"; sessionId: string; message: string }
  | { kind: "start"; routineId: string; dayId: string }
  | { kind: "refuse"; code: RepeatWorkoutRefusalCode; message: string };

const REFUSAL_MESSAGES: Record<RepeatWorkoutRefusalCode, string> = {
  not_found: REPEAT_WORKOUT_NOT_FOUND_MESSAGE,
  no_day: REPEAT_WORKOUT_NO_DAY_MESSAGE,
  routine_gone: REPEAT_WORKOUT_ROUTINE_GONE_MESSAGE,
  day_gone: REPEAT_WORKOUT_DAY_GONE_MESSAGE,
  day_changed: REPEAT_WORKOUT_DAY_CHANGED_MESSAGE,
};

function refuse(code: RepeatWorkoutRefusalCode): RepeatWorkoutPlan {
  return { kind: "refuse", code, message: REFUSAL_MESSAGES[code] };
}

/** Session day names are stored as "Mon | Push" (weekday, then the custom title) or just "Mon". Returns the title part. */
export function readCustomTitleFromSessionDayName(routineDayName: string | null | undefined): string | null {
  const name = routineDayName?.trim();
  if (!name) return null;
  const separatorIndex = name.indexOf(" | ");
  if (separatorIndex < 0) return null;
  return name.slice(separatorIndex + 3).trim();
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
 * - an in-progress workout already exists -> open it (never a second one);
 * - otherwise the day the finished session came from, found through its exercises first (survives reordering), then by
 *   position, but a position match whose title no longer matches is refused rather than guessed;
 * - a missing session, ad-hoc session, deleted routine or deleted day -> a plain refusal.
 */
export async function planRepeatWorkout(deps: RepeatWorkoutDeps, sessionId: string): Promise<RepeatWorkoutPlan> {
  const source = await deps.loadSourceSession(sessionId);
  if (!source || source.status !== "completed") {
    return refuse("not_found");
  }

  const availability = getRepeatWorkoutAvailability(source);
  if (!availability.available || !source.routine_id || typeof source.routine_day_index !== "number") {
    return refuse("no_day");
  }

  const inProgressId = await deps.loadInProgressSessionId();
  if (inProgressId) {
    return { kind: "open_existing", sessionId: inProgressId, message: REPEAT_WORKOUT_IN_PROGRESS_MESSAGE };
  }

  const routineId = source.routine_id;
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

  const dayAtIndex = await deps.loadDayAtIndex(routineId, source.routine_day_index);
  if (!dayAtIndex) {
    return refuse("day_gone");
  }

  const originalTitle = readCustomTitleFromSessionDayName(source.routine_day_name);
  if (originalTitle) {
    const currentTitle = deps.readCustomDayName(dayAtIndex).trim();
    if (currentTitle.toLowerCase() !== originalTitle.toLowerCase()) {
      return refuse("day_changed");
    }
  }

  return { kind: "start", routineId, dayId: dayAtIndex.id };
}
