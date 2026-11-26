/**
 * Wave 2 "Start fast" guards (PR #324 review): pure decisions, so every branch is unit-tested without a database.
 *
 * 1. What Today shows when there is no active routine. Starter plans are for a true first run only (no live
 *    routines, no archived routines, no finished workouts). Someone with routines but none active picks one of
 *    THEIR routines; someone whose routines are all archived may start a plan but also sees "Restore a routine";
 *    anything unknown (a count failed) falls back to the old "Choose a routine" card, never to plans.
 * 2. Whether a starter plan may become the active routine. Only when nothing live is active and no workout is
 *    open; otherwise the plan is added to the list without touching the active pointer.
 * 3. Two taps racing past the replay check (two tabs): the earliest routine wins, the later one removes itself.
 */

export type TodayRoutineChoice = { id: string; name: string };

export type TodayNoRoutineInput = {
  /** null when a count could not be read. */
  liveRoutines: readonly TodayRoutineChoice[] | null;
  archivedRoutineCount: number | null;
  completedWorkoutCount: number | null;
};

export type TodayNoRoutineState =
  /** True first run: the three starter plans. */
  | { kind: "starters" }
  /** Every routine is archived: starter plans plus "Restore a routine". */
  | { kind: "starters-with-restore" }
  /** Routines exist but none is active: pick one of them (first few listed, the rest on Routines). */
  | { kind: "pick-routine"; routines: TodayRoutineChoice[]; moreCount: number }
  /** Unknown, or workouts logged but no routines left: the old "Choose a routine" card with a Routines link. */
  | { kind: "choose" };

export const TODAY_PICK_ROUTINE_LIMIT = 3;

export function resolveTodayNoRoutineState(input: TodayNoRoutineInput): TodayNoRoutineState {
  const { liveRoutines, archivedRoutineCount, completedWorkoutCount } = input;
  if (liveRoutines === null || archivedRoutineCount === null || completedWorkoutCount === null) {
    return { kind: "choose" };
  }
  if (liveRoutines.length > 0) {
    return {
      kind: "pick-routine",
      routines: liveRoutines.slice(0, TODAY_PICK_ROUTINE_LIMIT).map(({ id, name }) => ({ id, name })),
      moreCount: Math.max(0, liveRoutines.length - TODAY_PICK_ROUTINE_LIMIT),
    };
  }
  if (archivedRoutineCount > 0) {
    return { kind: "starters-with-restore" };
  }
  if (completedWorkoutCount > 0) {
    return { kind: "choose" };
  }
  return { kind: "starters" };
}

export type StarterActivationInput = {
  /** The routine the plan made (or adopted). */
  routineId: string;
  /** profiles.active_routine_id read fresh; undefined/null when none. */
  activeRoutineId?: string | null;
  /** True when the active pointer names a routine that exists and is not archived; null if unknown. */
  hasLiveActiveRoutine: boolean | null;
  /** True when any workout is in progress; null if unknown. */
  hasOpenWorkout: boolean | null;
};

export type StarterAddOnlyReason = "has-active-routine" | "open-workout" | "unknown";

export type StarterActivationDecision =
  /** Nothing live is active and no workout is open: make it the active routine. */
  | { kind: "activate" }
  /** It already is the active routine (a replay, or the other tab of a race got there first): no write. */
  | { kind: "already-active" }
  /** Add it to the list only; the active pointer is left alone. */
  | { kind: "add-only"; reason: StarterAddOnlyReason };

/** Never replace an active routine silently and never move the active pointer while a workout is open. */
export function resolveStarterActivation(input: StarterActivationInput): StarterActivationDecision {
  if (input.activeRoutineId && input.activeRoutineId === input.routineId && input.hasLiveActiveRoutine) {
    return { kind: "already-active" };
  }
  if (input.hasOpenWorkout === null || input.hasLiveActiveRoutine === null) {
    return { kind: "add-only", reason: "unknown" };
  }
  if (input.hasOpenWorkout) {
    return { kind: "add-only", reason: "open-workout" };
  }
  if (input.hasLiveActiveRoutine) {
    return { kind: "add-only", reason: "has-active-routine" };
  }
  return { kind: "activate" };
}

export const STARTER_ADDED_NOT_ACTIVE_MESSAGE = "Added. Switch to it from Routines.";
export const STARTER_ADDED_WORKOUT_OPEN_MESSAGE = "Added. Finish your open workout, then switch to it from Routines.";

export function describeStarterAddOnly(reason: StarterAddOnlyReason) {
  return reason === "open-workout" ? STARTER_ADDED_WORKOUT_OPEN_MESSAGE : STARTER_ADDED_NOT_ACTIVE_MESSAGE;
}

/** Same name and user, created this close together, counts as the same tap (two tabs or a lost response). */
export const STARTER_RACE_WINDOW_MS = 60 * 1000;

/**
 * The surviving routine when several identical starter routines were created at once: the earliest `created_at`,
 * then the smallest id. Every racer computes the same winner, so exactly one routine stays.
 */
export function pickStarterRaceWinner(candidates: ReadonlyArray<{ id: string; created_at: string | null }>): string | null {
  let winner: { id: string; time: number } | null = null;
  for (const candidate of candidates) {
    const parsed = candidate.created_at ? Date.parse(candidate.created_at) : Number.NaN;
    const time = Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
    if (!winner || time < winner.time || (time === winner.time && candidate.id < winner.id)) {
      winner = { id: candidate.id, time };
    }
  }
  return winner?.id ?? null;
}
