import type { SessionCopilotFeedbackSignal } from "@/lib/session-copilot-feedback";

type SessionRegressionExerciseWithCopilot = {
  id: string;
  copilotFeedbackSignal?: SessionCopilotFeedbackSignal | null;
  copilotFeedbackNote?: string | null;
  copilotFeedbackUpdatedAt?: string | null;
  copilotFeedbackEffort?: number | null;
};

type SessionRegressionScenarioFixture = {
  selectedExerciseId: string | null;
  feedback?: {
    exerciseId: string;
    signal: SessionCopilotFeedbackSignal;
    note: string | null;
    effort: number | null;
  };
};

export const mobileRegressionSessionScenarioFixturesById: Readonly<Record<string, SessionRegressionScenarioFixture>> = {
  "active-workout-session-expanded": {
    selectedExerciseId: "session-ex-2",
    feedback: {
      exerciseId: "session-ex-2",
      signal: "too_hard",
      note: null,
      effort: 9,
    },
  },
  "session-logger-combo-board": {
    selectedExerciseId: null,
  },
  "session-logger-strength-weight": {
    selectedExerciseId: "session-ex-1",
    feedback: {
      exerciseId: "session-ex-1",
      signal: "completed_as_planned",
      note: null,
      effort: 5,
    },
  },
  "session-logger-bodyweight-reps": {
    selectedExerciseId: "session-ex-4",
    feedback: {
      exerciseId: "session-ex-4",
      signal: "too_easy",
      note: null,
      effort: 3,
    },
  },
  "session-logger-cardio-time": {
    selectedExerciseId: "session-ex-5",
    feedback: {
      exerciseId: "session-ex-5",
      signal: "bad_day",
      note: null,
      effort: 7,
    },
  },
  "session-logger-cardio-time-distance": {
    selectedExerciseId: "session-ex-3",
    feedback: {
      exerciseId: "session-ex-3",
      signal: "form_breakdown",
      note: "Stride felt sloppy.",
      effort: 8,
    },
  },
  "session-logger-cardio-distance": {
    selectedExerciseId: "session-ex-6",
    feedback: {
      exerciseId: "session-ex-6",
      signal: "pain_flag",
      note: null,
      effort: 10,
    },
  },
  "session-logger-calories": {
    selectedExerciseId: "session-ex-7",
    feedback: {
      exerciseId: "session-ex-7",
      signal: "override_used",
      note: null,
      effort: 6,
    },
  },
};

export const mobileRegressionSelectedSessionExerciseByScenarioId: Readonly<Record<string, string | null>> = Object.fromEntries(
  Object.entries(mobileRegressionSessionScenarioFixturesById).map(([scenarioId, config]) => [scenarioId, config.selectedExerciseId]),
);

export function applySessionRegressionScenarioState<T extends SessionRegressionExerciseWithCopilot>(
  scenarioId: string,
  exercises: readonly T[],
  capturePerformedAt: string,
): T[] {
  const fixture = mobileRegressionSessionScenarioFixturesById[scenarioId];
  if (!fixture?.feedback) {
    return [...exercises];
  }

  return exercises.map((exercise) => (
    exercise.id === fixture.feedback?.exerciseId
      ? {
        ...exercise,
        copilotFeedbackSignal: fixture.feedback.signal,
        copilotFeedbackNote: fixture.feedback.note,
        copilotFeedbackUpdatedAt: capturePerformedAt,
        copilotFeedbackEffort: fixture.feedback.effort,
      }
      : {
        ...exercise,
        copilotFeedbackSignal: null,
        copilotFeedbackNote: null,
        copilotFeedbackUpdatedAt: null,
        copilotFeedbackEffort: null,
      }
  ));
}
