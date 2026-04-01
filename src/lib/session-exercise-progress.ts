export type ExerciseExecutionState =
  | "not_started"
  | "in_progress"
  | "completed"
  | "skipped"
  | "partial"
  | "partial_with_remaining_skipped";

export type SessionExerciseProgressKind = "untouched" | "partial" | "partialSkipped" | "skipped" | "completed";
export type SessionExercisePresentationSurface = "active" | "summary";
export type SessionExerciseProgressChip = "skipped" | "endedEarly" | "loggedProgress";
export type ReadOnlyExercisePresentationState = ExerciseExecutionState;

export type SessionExerciseProgressInput = {
  loggedSetCount: number;
  isSkipped: boolean;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  isPending?: boolean;
};

export type SessionExerciseProgressState = {
  kind: SessionExerciseProgressKind;
  executionState: ExerciseExecutionState;
  isGoalCompleted: boolean;
  loggedSetCount: number;
  goalSetTarget: number | null;
  cardState: "default" | "completed";
  badgeText?: string;
  chips: SessionExerciseProgressChip[];
  progressLabel?: string;
  skipActionLabel: "Skip" | "Unskip";
  allowQuickLog: boolean;
};

export type ReadOnlyExercisePresentation = {
  state: ReadOnlyExercisePresentationState;
  cardState: "default" | "completed";
  badgeText?: string;
  chips: SessionExerciseProgressChip[];
  progressLabel?: string;
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

function deriveExecutionState(input: { loggedSetCount: number; isSkipped: boolean; isGoalCompleted: boolean }): ExerciseExecutionState {
  if (input.isSkipped && input.loggedSetCount === 0) return "skipped";
  if (input.isSkipped && input.loggedSetCount > 0) return input.isGoalCompleted ? "partial_with_remaining_skipped" : "partial";
  if (input.loggedSetCount === 0) return "not_started";
  return input.isGoalCompleted ? "completed" : "in_progress";
}

function formatLoggedProgress(loggedSetCount: number, goalSetTarget: number | null) {
  if (goalSetTarget !== null) {
    return `${loggedSetCount} of ${goalSetTarget} logged`;
  }
  return `${loggedSetCount} logged`;
}

function derivePresentationFromExecutionState({
  executionState,
  surface,
  loggedSetCount,
  goalSetTarget,
}: {
  executionState: ExerciseExecutionState;
  surface: SessionExercisePresentationSurface;
  loggedSetCount: number;
  goalSetTarget: number | null;
}): Omit<SessionExerciseProgressState, "executionState" | "isGoalCompleted" | "loggedSetCount" | "goalSetTarget"> {
  switch (executionState) {
    case "not_started":
      return {
        kind: "untouched",
        cardState: "default",
        chips: [],
        skipActionLabel: "Skip",
        allowQuickLog: true,
      };
    case "in_progress":
      return {
        kind: "partial",
        cardState: "default",
        badgeText: formatLoggedProgress(loggedSetCount, goalSetTarget),
        chips: [],
        progressLabel: formatLoggedProgress(loggedSetCount, goalSetTarget),
        skipActionLabel: "Skip",
        allowQuickLog: true,
      };
    case "completed":
      return {
        kind: "completed",
        cardState: "completed",
        badgeText: "Completed",
        chips: [],
        skipActionLabel: "Skip",
        allowQuickLog: true,
      };
    case "skipped":
      return {
        kind: "skipped",
        cardState: "default",
        badgeText: surface === "summary" ? "Skipped" : undefined,
        chips: surface === "summary" ? [] : ["skipped"],
        skipActionLabel: "Unskip",
        allowQuickLog: false,
      };
    case "partial":
      return {
        kind: "partialSkipped",
        cardState: "default",
        badgeText: "Partial",
        chips: ["loggedProgress", "endedEarly"],
        progressLabel: formatLoggedProgress(loggedSetCount, goalSetTarget),
        skipActionLabel: "Unskip",
        allowQuickLog: false,
      };
    case "partial_with_remaining_skipped":
      return {
        kind: "partialSkipped",
        cardState: "default",
        badgeText: "Partial",
        chips: ["loggedProgress", "endedEarly"],
        progressLabel: formatLoggedProgress(loggedSetCount, goalSetTarget),
        skipActionLabel: "Unskip",
        allowQuickLog: false,
      };
  }
}

export function deriveSessionExerciseProgressState(input: SessionExerciseProgressInput & { surface?: SessionExercisePresentationSurface }): SessionExerciseProgressState {
  const loggedSetCount = Number.isFinite(input.loggedSetCount) ? Math.max(0, Math.floor(input.loggedSetCount)) : 0;
  const goalSetTarget = resolveGoalSetTarget(input);
  const isGoalCompleted = goalSetTarget !== null && loggedSetCount >= goalSetTarget;
  const executionState = deriveExecutionState({ loggedSetCount, isSkipped: input.isSkipped, isGoalCompleted });
  const surface = input.surface ?? "active";

  return {
    executionState,
    isGoalCompleted,
    loggedSetCount,
    goalSetTarget,
    ...derivePresentationFromExecutionState({
      executionState,
      surface,
      loggedSetCount,
      goalSetTarget,
    }),
  };
}

export function deriveReadOnlyExercisePresentation(input: SessionExerciseProgressInput): ReadOnlyExercisePresentation {
  const state = deriveSessionExerciseProgressState({ ...input, surface: "summary" });

  return {
    state: state.executionState,
    cardState: state.cardState,
    badgeText: state.badgeText,
    chips: state.chips,
    progressLabel: state.progressLabel,
  };
}
