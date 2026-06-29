import type { SessionCopilotFeedbackSignal } from "@/lib/session-copilot-feedback";

type SessionRegressionExerciseWithCopilot = {
  id: string;
  copilotFeedbackSignal?: SessionCopilotFeedbackSignal | null;
  copilotFeedbackNote?: string | null;
  copilotFeedbackUpdatedAt?: string | null;
};

export const mobileRegressionSelectedSessionExerciseByScenarioId: Readonly<Record<string, string | null>> = {
  "active-workout-session-expanded": "session-ex-2",
  "session-logger-combo-board": null,
  "session-logger-strength-weight": "session-ex-1",
  "session-logger-bodyweight-reps": "session-ex-4",
  "session-logger-cardio-time": "session-ex-5",
  "session-logger-cardio-time-distance": "session-ex-3",
  "session-logger-cardio-distance": "session-ex-6",
  "session-logger-calories": "session-ex-7",
};

export function applySessionRegressionScenarioState<T extends SessionRegressionExerciseWithCopilot>(
  scenarioId: string,
  exercises: readonly T[],
  capturePerformedAt: string,
): T[] {
  if (scenarioId !== "active-workout-session-expanded") {
    return [...exercises];
  }

  return exercises.map((exercise) => (
    exercise.id === "session-ex-2"
      ? {
        ...exercise,
        copilotFeedbackSignal: "too_hard" as const,
        copilotFeedbackNote: null,
        copilotFeedbackUpdatedAt: capturePerformedAt,
      }
      : {
        ...exercise,
        copilotFeedbackSignal: null,
        copilotFeedbackNote: null,
        copilotFeedbackUpdatedAt: null,
      }
  ));
}
