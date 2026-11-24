// What the workout logger's chips do, in plain words (Zac 2026-11-24: "explain the chips").
//
// Verified in code on 2026-11-24 (keep this in step if the data rules change):
// - Warm-up saves the set with is_warmup = true. The set list shows it as "Warm-Up" without a set number, and
//   progression leaves it out (progression-playbooks.ts and progression-progress-percent.ts skip warm-up rows; so does
//   recovery-timing.ts). It still counts in the card's set count, the weekly set count and the exercise PR records
//   (exercise-stats.ts reads every set), so the caption only claims progression.
// - Failure saves the set with the note marker FAILURE_NOTE_SENTINEL and tags it "Failure" in the set list. Nothing
//   else reads that marker: it counts like any other set everywhere. Pressing it clears the reps field (SessionTimers),
//   and blank reps save as 0, so the caption asks for the reps reached.
// - Timer shows or hides the exercise timer on this card; it does not change the set. With Warm-up or Failure also
//   pressed the caption names only the mark (one line at 320px); the open timer is its own visible section.

export type LoggerChipState = {
  warmup: boolean;
  failure: boolean;
  timer: boolean;
  /** Whether the logger offers Warm-up or Failure at all (cardio-only cards may have only Timer). */
  hasMarkChips: boolean;
};

export const LOGGER_CHIP_CAPTIONS = {
  idle: "Tap a chip to mark the next set",
  warmup: "Warm-up: not counted for progression",
  failure: "Failure: a tag only. Enter reps reached",
  timerOnly: "Timer: shown on this card",
} as const;

/** The one-line caption under the chip row: describes only the pressed chip(s). Null when there is nothing to say. */
export function describeLoggerChips(state: LoggerChipState): string | null {
  const mark = state.warmup ? LOGGER_CHIP_CAPTIONS.warmup : state.failure ? LOGGER_CHIP_CAPTIONS.failure : null;
  if (mark) {
    return mark;
  }
  if (state.timer) {
    return LOGGER_CHIP_CAPTIONS.timerOnly;
  }
  return state.hasMarkChips ? LOGGER_CHIP_CAPTIONS.idle : null;
}

/** The Log set button names the kind of set it will save. */
export function resolveLoggerLogPrefix({ warmup, failure }: { warmup: boolean; failure: boolean }) {
  if (warmup) return "Log warm-up set";
  if (failure) return "Log failure set";
  return "Log";
}
