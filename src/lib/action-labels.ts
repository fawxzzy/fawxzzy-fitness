export const NORMALIZED_ACTION_LABELS = {
  add: "Add",
  begin: "Begin",
  compact: "Compact",
  days: "Days",
  detailed: "Detailed",
  edit: "Edit",
  exercises: "Exercises",
  finish: "Finish",
  hide: "Hide",
  new: "New",
  routines: "Routines",
  sessions: "Sessions",
  view: "Inspect",
} as const;

/** The day-type toggle names the thing it switches (pressed = this is a rest day); it never shows a state as a verb. */
export const REST_DAY_TOGGLE_LABEL = "Rest day";

/**
 * Confirm-dialog verbs. ConfirmDestructiveModal shows `confirmLabel` on the confirm button as passed, so callers use
 * these instead of a generic "Confirm"/"Delete" that does not say what is being deleted.
 */
export const CONFIRM_ACTION_LABELS = {
  /** Routines are archived, never deleted (2026-11-26); the button names the action. */
  archiveRoutine: "Archive",
  deleteDay: "Delete day",
  deleteExercise: "Delete exercise",
  deleteSet: "Delete set",
  deleteTheme: "Delete theme",
  discardWorkout: "Discard workout",
  discardChanges: "Discard changes",
  finishWorkout: "Finish workout",
  signOut: "Sign out",
} as const;
