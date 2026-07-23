import assert from "node:assert/strict";
import test from "node:test";

import { CURATED_FORM_STEP_ORDER } from "./constants.ts";
import { createCuratedOnboardingState } from "./fixtures.ts";
import {
  CURATED_INTAKE_SECTIONS,
  CURATED_QUESTION_IDS,
  createCuratedParityFixture,
  deriveCuratedEngineData,
  getCuratedQuestion,
  getMissingRequiredQuestionIds,
  isCuratedQuestionVisible,
  removeHiddenCuratedResponses,
} from "./questionnaire.ts";
import { curatedOnboardingReducer } from "./reducer.ts";
import { canAdvanceCuratedStep, getCuratedReviewSections } from "./selectors.ts";
import type { CuratedIntakeResponse } from "./types.ts";

const EXPECTED_SECTION_TITLES = [
  "Your Details",
  "Main Goal",
  "Body + Training Background",
  "Schedule + Lifestyle",
  "Equipment Access",
  "Complications / Injuries / Things To Plan Around",
  "Exercise Preferences",
  "Nutrition Basics",
  "Accountability + Delivery",
];

test("curated questionnaire preserves the canonical nine-section, 60-question contract", () => {
  assert.equal(CURATED_INTAKE_SECTIONS.length, 9);
  assert.equal(CURATED_QUESTION_IDS.length, 60);
  assert.equal(new Set(CURATED_QUESTION_IDS).size, 60);
  assert.deepEqual(CURATED_INTAKE_SECTIONS.map((section) => section.title), EXPECTED_SECTION_TITLES);
  assert.deepEqual(CURATED_INTAKE_SECTIONS.map((section) => section.questions.length), [6, 5, 9, 6, 4, 11, 5, 6, 8]);
  assert.deepEqual(CURATED_FORM_STEP_ORDER, [
    ...CURATED_INTAKE_SECTIONS.map((section) => section.stepId),
    "review",
  ]);
});

test("standard and limitations fixtures satisfy every required page and derive engine inputs", () => {
  const standard = createCuratedParityFixture("standard");
  const limitations = createCuratedParityFixture("limitations");

  for (const section of CURATED_INTAKE_SECTIONS) {
    assert.deepEqual(getMissingRequiredQuestionIds(section.stepId, standard), []);
    assert.deepEqual(getMissingRequiredQuestionIds(section.stepId, limitations), []);
  }

  assert.deepEqual(deriveCuratedEngineData(standard), {
    trainingGoal: "build-muscle",
    experience: "beginner",
    daysPerWeek: 1,
    sessionLengthMinutes: 30,
    equipment: ["full-gym", "dumbbells"],
    preferredStyle: "full-body",
    cardioPreference: "balanced",
    limitations: "",
    exerciseLikes: ["What exercises do you enjoy? response"],
    exerciseDislikes: [],
    targetAreas: ["chest"],
  });
  assert.equal(deriveCuratedEngineData(limitations).daysPerWeek, 4);
  assert.equal(deriveCuratedEngineData(limitations).sessionLengthMinutes, 60);
  assert.equal(deriveCuratedEngineData(limitations).preferredStyle, "hybrid");
  assert.equal(deriveCuratedEngineData(limitations).cardioPreference, "focus");
  assert.match(deriveCuratedEngineData(limitations).limitations ?? "", /Avoid painful overhead range/);
});

test("selecting Other remains incomplete until its companion response is supplied", () => {
  const responses = createCuratedParityFixture("standard");
  responses.mainGoals = ["other"];

  assert.deepEqual(getMissingRequiredQuestionIds("goals", responses), ["mainGoals"]);
  responses.mainGoalsOther = "Improve climbing endurance";
  assert.deepEqual(getMissingRequiredQuestionIds("goals", responses), []);
});

test("dependent questions appear only for the responses that make them relevant", () => {
  const cases: Array<[string, string, CuratedIntakeResponse, CuratedIntakeResponse]> = [
    ["guardianPermission", "under18", "no", "yes"],
    ["trackingTool", "tracksWorkouts", "no", "sometimes"],
    ["heaviestDumbbells", "availableEquipment", ["bodyweight"], ["dumbbells"]],
    ["painDetails", "hasPainOrLimitations", "no", "yes"],
    ["restrictedMovements", "professionalRestrictions", "no", "yes"],
    ["medicationConsiderations", "medications", "no", "yes"],
  ];

  for (const [questionId, parentId, hiddenValue, visibleValue] of cases) {
    const question = getCuratedQuestion(questionId);
    assert.ok(question);
    assert.equal(isCuratedQuestionVisible(question, { [parentId]: hiddenValue }), false, questionId);
    assert.equal(isCuratedQuestionVisible(question, { [parentId]: visibleValue }), true, questionId);
  }
});

test("changing a parent response clears stale hidden dependent answers", () => {
  const responses = removeHiddenCuratedResponses({
    ...createCuratedParityFixture("limitations"),
    under18: "no",
    guardianPermission: "yes",
    tracksWorkouts: "no",
    trackingTool: "Spreadsheet",
    hasPainOrLimitations: "no",
    painDetails: "Old limitation",
  });

  assert.equal("guardianPermission" in responses, false);
  assert.equal("trackingTool" in responses, false);
  assert.equal("painDetails" in responses, false);
  assert.deepEqual(getMissingRequiredQuestionIds("intro", responses), []);
});

test("required acknowledgments remain incomplete without blocking page navigation", () => {
  const responses = createCuratedParityFixture("standard");
  responses.safetyAcknowledgment = false;
  responses.accuracyAcknowledgment = false;
  responses.fitnessGuidanceAcknowledgment = false;

  assert.deepEqual(getMissingRequiredQuestionIds("constraints", responses), ["safetyAcknowledgment"]);
  assert.deepEqual(
    getMissingRequiredQuestionIds("delivery", responses),
    ["accuracyAcknowledgment", "fitnessGuidanceAcknowledgment"],
  );

  const data = {
    ...createCuratedOnboardingState().draft.data,
    ...deriveCuratedEngineData(responses),
    intakeResponses: responses,
  };
  assert.equal(canAdvanceCuratedStep("constraints", data), true);
  assert.equal(canAdvanceCuratedStep("delivery", data), true);
  assert.equal(canAdvanceCuratedStep("review", data), false);

  responses.safetyAcknowledgment = true;
  responses.accuracyAcknowledgment = true;
  responses.fitnessGuidanceAcknowledgment = true;
  assert.deepEqual(getMissingRequiredQuestionIds("constraints", responses), []);
  assert.deepEqual(getMissingRequiredQuestionIds("delivery", responses), []);
});

test("review sections expose exact missing required answers while pages remain accessible", () => {
  const responses = createCuratedParityFixture("standard");
  responses.primaryGoal = "";
  responses.accuracyAcknowledgment = false;

  const data = {
    ...createCuratedOnboardingState().draft.data,
    ...deriveCuratedEngineData(responses),
    intakeResponses: responses,
  };
  const review = getCuratedReviewSections(data);
  const goals = review.find((section) => section.stepId === "goals");
  const delivery = review.find((section) => section.stepId === "delivery");

  assert.equal(canAdvanceCuratedStep("goals", data), true);
  assert.equal(canAdvanceCuratedStep("delivery", data), true);
  assert.equal(canAdvanceCuratedStep("review", data), false);
  assert.equal(goals?.complete, false);
  assert.equal(
    goals?.answers.find((answer) => answer.id === "primaryGoal")?.incomplete,
    true,
  );
  assert.equal(delivery?.complete, false);
  assert.equal(
    delivery?.answers.find((answer) => answer.id === "accuracyAcknowledgment")?.incomplete,
    true,
  );
});

test("a complete intake derives supported Other schedule and equipment responses", () => {
  const responses = createCuratedParityFixture("standard");
  responses.trainingDaysPerWeek = "other";
  responses.trainingDaysPerWeekOther = "3";
  responses.workoutLength = "other";
  responses.workoutLengthOther = "45";
  responses.trainingLocations = ["other"];
  responses.trainingLocationsOther = "Home";
  responses.availableEquipment = ["other"];
  responses.availableEquipmentOther = "TRX suspension trainer and resistance bands";

  for (const section of CURATED_INTAKE_SECTIONS) {
    assert.deepEqual(getMissingRequiredQuestionIds(section.stepId, responses), []);
  }

  const derived = deriveCuratedEngineData(responses);
  assert.equal(derived.daysPerWeek, 3);
  assert.equal(derived.sessionLengthMinutes, 45);
  assert.deepEqual(derived.equipment, ["bands", "bodyweight"]);

  const data = {
    ...createCuratedOnboardingState().draft.data,
    ...derived,
    intakeResponses: responses,
  };
  assert.equal(canAdvanceCuratedStep("review", data), true);
});

test("Other schedule responses fail closed without retaining prior derived values", () => {
  const fallback = {
    daysPerWeek: 5,
    sessionLengthMinutes: 60,
  };
  const absent = deriveCuratedEngineData({}, fallback);
  assert.equal(absent.daysPerWeek, 5);
  assert.equal(absent.sessionLengthMinutes, 60);

  const responses = createCuratedParityFixture("standard");
  responses.trainingDaysPerWeek = "other";
  responses.trainingDaysPerWeekOther = "3 days";
  responses.workoutLength = "other";
  responses.workoutLengthOther = "45 minutes";

  const derived = deriveCuratedEngineData(responses, fallback);
  assert.equal(derived.daysPerWeek, null);
  assert.equal(derived.sessionLengthMinutes, null);

  const data = {
    ...createCuratedOnboardingState().draft.data,
    ...derived,
    intakeResponses: responses,
  };
  assert.equal(canAdvanceCuratedStep("review", data), false);
});

test("both simulated intake paths advance page by page and omit irrelevant review answers", () => {
  for (const variant of ["standard", "limitations"] as const) {
    const fixture = createCuratedParityFixture(variant);
    let state = createCuratedOnboardingState();

    for (const section of CURATED_INTAKE_SECTIONS) {
      const responses = {
        ...state.draft.data.intakeResponses,
        ...Object.fromEntries(
          Object.entries(fixture).filter(([questionId]) =>
            section.questions.some((question) => questionId === question.id || questionId === `${question.id}Other`),
          ),
        ),
      };
      state = curatedOnboardingReducer(state, {
        type: "patch-data",
        patch: {
          ...deriveCuratedEngineData(responses, state.draft.data),
          intakeResponses: responses,
        },
        at: `2026-07-16T00:00:0${CURATED_INTAKE_SECTIONS.indexOf(section)}.000Z`,
      });
      assert.equal(canAdvanceCuratedStep(section.stepId, state.draft.data), true);
      state = curatedOnboardingReducer(state, {
        type: "go-next",
        at: `2026-07-16T00:01:0${CURATED_INTAKE_SECTIONS.indexOf(section)}.000Z`,
      });
    }

    assert.equal(state.draft.stepId, "review");
    assert.equal(canAdvanceCuratedStep("review", state.draft.data), true);
    const review = getCuratedReviewSections(state.draft.data);
    assert.equal(review.length, 9);
    const reviewedAnswerIds = review.flatMap((section) => section.answers).map((answer) => answer.id);
    const hiddenAnswerIds = variant === "standard"
      ? ["guardianPermission"]
      : ["guardianPermission", "medicationConsiderations"];
    assert.equal(reviewedAnswerIds.length, 60 - hiddenAnswerIds.length);
    for (const hiddenAnswerId of hiddenAnswerIds) {
      assert.equal(reviewedAnswerIds.includes(hiddenAnswerId), false);
    }
    assert.equal(review.every((section) => section.complete), true);
  }
});
