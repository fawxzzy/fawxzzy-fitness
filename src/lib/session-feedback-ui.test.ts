import assert from "node:assert/strict";
import test from "node:test";

import {
  areSessionLoggerDraftStatesEqual,
  buildSessionProgressionFeedbackSummaryLabel,
  buildSessionProgressionStateLabel,
  type ComparableSessionLoggerDraftState,
} from "./session-feedback-ui.ts";

function createDraftState(overrides?: Partial<ComparableSessionLoggerDraftState>): ComparableSessionLoggerDraftState {
  return {
    goalLabel: "3 sets • 5 reps • 225 lbs",
    quickLogLabel: "Log: 5 reps • 225 lbs",
    quickLogPayload: {
      weight: 225,
      reps: 5,
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
      isWarmup: false,
      rpe: null,
      notes: null,
      weightUnit: "lbs",
    },
    isEditedFromCurrentTarget: false,
    didApplyLastTarget: false,
    copilotFeedbackSignal: null,
    copilotFeedbackNote: null,
    formState: {
      weight: "225",
      reps: "5",
      durationInput: "",
      distance: "",
      calories: "",
      rpe: "",
      weightUnit: "lbs",
      distanceUnit: "mi",
      isWarmup: false,
      isFailure: false,
    },
    ...overrides,
  };
}

test("buildSessionProgressionStateLabel keeps manual and auto/session/set wording stable", () => {
  assert.equal(buildSessionProgressionStateLabel(null), "MANUAL");
  assert.equal(
    buildSessionProgressionStateLabel({
      progressionPlaybookId: "double_progression",
      progressionSessionSettingsEnabled: true,
      progressionSetSettingsEnabled: true,
    }),
    "AUTO • SESSION • SET",
  );
  assert.equal(
    buildSessionProgressionStateLabel({
      progressionPlaybookId: "double_progression",
      progressionSessionSettingsEnabled: false,
      progressionSetSettingsEnabled: true,
    }),
    "AUTO • SET",
  );
});

test("buildSessionProgressionFeedbackSummaryLabel appends the selected effort feedback label", () => {
  assert.equal(
    buildSessionProgressionFeedbackSummaryLabel({
      progressionFormState: {
        progressionPlaybookId: "double_progression",
        progressionSessionSettingsEnabled: true,
        progressionSetSettingsEnabled: true,
      },
      copilotFeedbackSignal: "too_hard",
    }),
    "AUTO • SESSION • SET • Too Hard",
  );
});

test("areSessionLoggerDraftStatesEqual returns true for identical draft snapshots", () => {
  const left = createDraftState({
    copilotFeedbackSignal: "too_easy",
    copilotFeedbackNote: "Good day",
  });
  const right = createDraftState({
    copilotFeedbackSignal: "too_easy",
    copilotFeedbackNote: "Good day",
  });

  assert.equal(areSessionLoggerDraftStatesEqual(left, right), true);
});

test("areSessionLoggerDraftStatesEqual detects feedback and form drift", () => {
  const base = createDraftState();

  assert.equal(
    areSessionLoggerDraftStatesEqual(
      createDraftState({ copilotFeedbackNote: "Need a tweak" }),
      base,
    ),
    false,
  );

  assert.equal(
    areSessionLoggerDraftStatesEqual(
      createDraftState({
        formState: {
          ...base.formState,
          reps: "6",
        },
      }),
      base,
    ),
    false,
  );
});
