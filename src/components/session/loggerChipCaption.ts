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
//
// Wave 2 (2026-11-26, SIMPLIFY #4): the open logger carries only Warm-up and Failure. The exercise timer moved into the
// card's More menu, and the idle "Tap a chip..." caption is gone: nothing shows until a chip is pressed.

export type LoggerChipState = {
  warmup: boolean;
  failure: boolean;
};

export const LOGGER_CHIP_CAPTIONS = {
  warmup: "Warm-up: not counted for progression",
  failure: "Failure: a tag only. Enter reps reached",
} as const;

/** The one-line caption under the chip row: describes only the pressed chip. Null when no chip is pressed. */
export function describeLoggerChips(state: LoggerChipState): string | null {
  if (state.warmup) return LOGGER_CHIP_CAPTIONS.warmup;
  if (state.failure) return LOGGER_CHIP_CAPTIONS.failure;
  return null;
}

/** The Log set button names the kind of set it will save. */
export function resolveLoggerLogPrefix({ warmup, failure }: { warmup: boolean; failure: boolean }) {
  if (warmup) return "Log warm-up set";
  if (failure) return "Log failure set";
  return "Log";
}
