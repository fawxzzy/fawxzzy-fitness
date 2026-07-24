import { deriveSessionExerciseProgressState } from "./session-exercise-progress";

export function deriveCompletedVisibilityOverride(args: {
  previousLoggedSetCount: number;
  nextLoggedSetCount: number;
  isSkipped: boolean;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  previousShowWhenCompleted: boolean;
  retainWhenFirstCompleted?: boolean;
}) {
  const wasGoalCompleted = deriveSessionExerciseProgressState({
    loggedSetCount: args.previousLoggedSetCount,
    isSkipped: args.isSkipped,
    targetSetsMin: args.targetSetsMin,
    targetSetsMax: args.targetSetsMax,
  }).isGoalCompleted;

  const isNowGoalCompleted = deriveSessionExerciseProgressState({
    loggedSetCount: args.nextLoggedSetCount,
    isSkipped: args.isSkipped,
    targetSetsMin: args.targetSetsMin,
    targetSetsMax: args.targetSetsMax,
  }).isGoalCompleted;

  if (!isNowGoalCompleted) {
    return args.previousShowWhenCompleted;
  }

  return wasGoalCompleted ? args.previousShowWhenCompleted : Boolean(args.retainWhenFirstCompleted);
}
