// Auto-advance in the workout logger (wave 2, SIMPLIFY #5, 2026-11-26).
//
// Logging the last planned set of an exercise closes its card and opens the next unfinished exercise, so a workout is
// Log set, Log set, Log set with no extra taps in between. Rules:
// - Only a Log set tap in the open logger that brings the count exactly to the planned set count moves on. A set
//   logged past the plan (a done card reopened for one more) stays put.
// - "Saved" means saved on the server or queued on this device; a failed save never moves on (SetLoggerCard only calls
//   onSetSaved after a success or a queued set).
// - The next exercise is the first one after the current card that is neither skipped nor already done, wrapping to
//   the top of the list. None left: the card just closes.
// - One open card at a time stays true: the current card closes as the next one opens.

export type AutoAdvanceRow = {
  id: string;
  isSkipped: boolean;
  isGoalCompleted: boolean;
};

/** True when this saved set is the one that reaches the planned set count. */
export function isLastPlannedSet(savedSetCount: number, goalSetTarget: number | null): boolean {
  return goalSetTarget !== null && goalSetTarget > 0 && savedSetCount === goalSetTarget;
}

/** The next exercise to open after `currentId`: first unfinished row after it, wrapping around. Null when none. */
export function findNextUnfinishedExerciseId(rows: readonly AutoAdvanceRow[], currentId: string): string | null {
  const currentIndex = rows.findIndex((row) => row.id === currentId);
  if (currentIndex === -1) {
    return null;
  }

  for (let offset = 1; offset < rows.length; offset += 1) {
    const row = rows[(currentIndex + offset) % rows.length];
    if (!row.isSkipped && !row.isGoalCompleted) {
      return row.id;
    }
  }

  return null;
}
