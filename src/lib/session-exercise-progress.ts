export type SessionExerciseProgressKind = "untouched" | "partial" | "partialSkipped" | "skipped" | "completed";

export type SessionExerciseProgressInput = {
  loggedSetCount: number;
  isSkipped: boolean;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  isPending?: boolean;
};

export type SessionExerciseProgressState = {
  kind: SessionExerciseProgressKind;
  isGoalCompleted: boolean;
  loggedSetCount: number;
  goalSetTarget: number | null;
  cardState: "default" | "completed";
  badgeText?: string;
  chips: Array<"skipped" | "partialSkipped">;
  skipActionLabel: "Skip" | "Unskip";
  allowQuickLog: boolean;
};

function resolveGoalSetTarget(input: SessionExerciseProgressInput): number | null {
  const min = input.targetSetsMin;
  const max = input.targetSetsMax;
  if (Number.isFinite(min) && (min as number) > 0) {
    return Math.floor(min as number);
  }
  if (Number.isFinite(max) && (max as number) > 0) {
    return Math.floor(max as number);
  }
  return null;
}

export function deriveSessionExerciseProgressState(input: SessionExerciseProgressInput): SessionExerciseProgressState {
  const loggedSetCount = Number.isFinite(input.loggedSetCount) ? Math.max(0, Math.floor(input.loggedSetCount)) : 0;
  const goalSetTarget = resolveGoalSetTarget(input);

  if (input.isSkipped && loggedSetCount > 0) {
    return {
      kind: "partialSkipped",
      isGoalCompleted: false,
      loggedSetCount,
      goalSetTarget,
      cardState: "default",
      badgeText: `${loggedSetCount} logged`,
      chips: ["partialSkipped"],
      skipActionLabel: "Unskip",
      allowQuickLog: false,
    };
  }

  if (input.isSkipped) {
    return {
      kind: "skipped",
      isGoalCompleted: false,
      loggedSetCount,
      goalSetTarget,
      cardState: "default",
      chips: ["skipped"],
      skipActionLabel: "Unskip",
      allowQuickLog: false,
    };
  }

  const isGoalCompleted = goalSetTarget !== null && loggedSetCount >= goalSetTarget;
  if (isGoalCompleted) {
    return {
      kind: "completed",
      isGoalCompleted: true,
      loggedSetCount,
      goalSetTarget,
      cardState: "completed",
      badgeText: `${loggedSetCount} logged`,
      chips: [],
      skipActionLabel: "Skip",
      allowQuickLog: true,
    };
  }

  if (loggedSetCount > 0) {
    return {
      kind: "partial",
      isGoalCompleted: false,
      loggedSetCount,
      goalSetTarget,
      cardState: "default",
      badgeText: `${loggedSetCount} logged`,
      chips: [],
      skipActionLabel: "Skip",
      allowQuickLog: true,
    };
  }

  return {
    kind: "untouched",
    isGoalCompleted: false,
    loggedSetCount,
    goalSetTarget,
    cardState: "default",
    chips: [],
    skipActionLabel: "Skip",
    allowQuickLog: true,
  };
}
