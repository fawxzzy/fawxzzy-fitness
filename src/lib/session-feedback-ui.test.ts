import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  areSessionLoggerDraftStatesEqual,
  buildSessionCopilotActionLabel,
  buildSessionCopilotRecapTagLabel,
  buildSessionCopilotReceiptLabel,
  buildSessionEffortContextLabel,
  buildSessionEffortNotePlaceholder,
  buildSessionProgressionFeedbackSummaryLabel,
  buildSessionProgressionStateLabel,
  isSessionExerciseFeedbackComplete,
  type ComparableSessionLoggerDraftState,
} from "./session-feedback-ui.ts";

function createDraftState(overrides?: Partial<ComparableSessionLoggerDraftState>): ComparableSessionLoggerDraftState {
  return {
    goalLabel: "3 sets | 5 reps | 225 lbs",
    quickLogLabel: "Log: 5 reps | 225 lbs",
    quickLogPayload: {
      weight: 225,
      reps: 5,
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
      isWarmup: false,
      notes: null,
      weightUnit: "lbs",
    },
    isEditedFromCurrentTarget: false,
    didApplyLastTarget: false,
    copilotFeedbackSignal: null,
    copilotFeedbackNote: null,
    copilotFeedbackEffort: null,
    formState: {
      weight: "225",
      reps: "5",
      durationInput: "",
      distance: "",
      calories: "",
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
    "AUTO | SESSION | SET",
  );
  assert.equal(
    buildSessionProgressionStateLabel({
      progressionPlaybookId: "double_progression",
      progressionSessionSettingsEnabled: false,
      progressionSetSettingsEnabled: true,
    }),
    "AUTO | SET",
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
    "AUTO | SESSION | SET | Too Hard",
  );
});

test("buildSessionProgressionFeedbackSummaryLabel keeps manual summaries normalized", () => {
  assert.equal(
    buildSessionProgressionFeedbackSummaryLabel({
      progressionFormState: null,
      copilotFeedbackSignal: "completed_as_planned",
    }),
    "MANUAL | As Planned",
  );
});

test("buildSessionCopilotActionLabel keeps the explicit target-action contract stable", () => {
  assert.equal(
    buildSessionCopilotActionLabel({
      targetSource: "manual_target",
      isEditedFromCurrentTarget: false,
      didApplyLastTarget: false,
    }),
    "Planned Target",
  );

  assert.equal(
    buildSessionCopilotActionLabel({
      targetSource: "fallback_last_successful_set",
      isEditedFromCurrentTarget: false,
      didApplyLastTarget: false,
    }),
    "Repeat Last",
  );

  assert.equal(
    buildSessionCopilotActionLabel({
      targetSource: "manual_target",
      isEditedFromCurrentTarget: true,
      didApplyLastTarget: false,
    }),
    "Override",
  );

  assert.equal(
    buildSessionCopilotActionLabel({
      targetSource: "manual_target",
      isEditedFromCurrentTarget: false,
      didApplyLastTarget: true,
    }),
    "Last Setup",
  );
});

test("buildSessionCopilotRecapTagLabel keeps recap chips short and deterministic", () => {
  assert.equal(buildSessionCopilotRecapTagLabel("completed_as_planned"), "PLANNED");
  assert.equal(buildSessionCopilotRecapTagLabel("too_hard"), "HARD");
  assert.equal(buildSessionCopilotRecapTagLabel("form_breakdown"), "FORM");
});

test("buildSessionCopilotReceiptLabel keeps the recap receipt wording stable", () => {
  assert.equal(
    buildSessionCopilotReceiptLabel({
      signal: "too_hard",
      effortValue: 8,
    }),
    "Too Hard | Effort 8/10",
  );

  assert.equal(
    buildSessionCopilotReceiptLabel({
      signal: null,
      effortValue: 6,
    }),
    "Effort 6/10",
  );
});

test("buildSessionEffortContextLabel keeps the selected signal and effort wording stable", () => {
  assert.equal(
    buildSessionEffortContextLabel({
      signal: "too_hard",
      effortValue: 8,
    }),
    "Too Hard | Effort 8/10",
  );

  assert.equal(
    buildSessionEffortContextLabel({
      signal: null,
      effortValue: 6,
    }),
    "Effort 6/10",
  );

  assert.equal(
    buildSessionEffortContextLabel({
      signal: "completed_as_planned",
      effortValue: null,
    }),
    "As Planned",
  );
});

test("buildSessionEffortNotePlaceholder reflects the shared effort context contract", () => {
  assert.equal(
    buildSessionEffortNotePlaceholder({
      signal: "too_easy",
      effortValue: 4,
    }),
    "Optional context for too easy | effort 4/10",
  );

  assert.equal(
    buildSessionEffortNotePlaceholder({
      signal: null,
      effortValue: null,
    }),
    "Optional context for this exercise",
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

test("feedback finalization waits for both a text signal and effort score", () => {
  assert.equal(isSessionExerciseFeedbackComplete({ signal: "too_hard", effortValue: null }), false);
  assert.equal(isSessionExerciseFeedbackComplete({ signal: null, effortValue: 8 }), false);
  assert.equal(isSessionExerciseFeedbackComplete({ signal: "too_hard", effortValue: 8 }), true);
});

test("feedback prompt acknowledges partial saves without dismissing until complete", () => {
  const source = readFileSync(new URL("../components/session/SessionExerciseFeedbackPrompt.tsx", import.meta.url), "utf8");

  assert.match(source, /if \(result\.ok && canFinalize\)/);
  assert.match(source, /isSessionExerciseFeedbackComplete\(\{ signal, effortValue: effort \}\)/);
});
