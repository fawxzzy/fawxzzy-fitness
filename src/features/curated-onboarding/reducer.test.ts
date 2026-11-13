import test from "node:test";
import assert from "node:assert/strict";

import { createCuratedOnboardingDraft, createCuratedOnboardingState } from "./fixtures.ts";
import { curatedOnboardingReducer } from "./reducer.ts";

test("curatedOnboardingReducer advances through the ordered onboarding steps", () => {
  const initialState = createCuratedOnboardingState({
    draft: createCuratedOnboardingDraft({
      stepId: "goals",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
  });

  const nextState = curatedOnboardingReducer(initialState, {
    type: "go-next",
    at: "2026-01-02T00:00:00.000Z",
  });

  assert.equal(nextState.draft.stepId, "experience");
  assert.equal(nextState.draft.updatedAt, "2026-01-02T00:00:00.000Z");
});

test("curatedOnboardingReducer moves backwards without falling past intro", () => {
  const initialState = createCuratedOnboardingState({
    draft: createCuratedOnboardingDraft({
      stepId: "intro",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
  });

  const previousState = curatedOnboardingReducer(initialState, {
    type: "go-back",
    at: "2026-01-02T00:00:00.000Z",
  });

  assert.equal(previousState.draft.stepId, "intro");
});

test("curatedOnboardingReducer patches onboarding data without losing the rest of the draft", () => {
  const initialState = createCuratedOnboardingState();

  const nextState = curatedOnboardingReducer(initialState, {
    type: "patch-data",
    at: "2026-01-03T00:00:00.000Z",
    patch: {
      trainingGoal: "build-muscle",
      equipment: ["dumbbells", "bodyweight"],
    },
  });

  assert.equal(nextState.draft.data.trainingGoal, "build-muscle");
  assert.deepEqual(nextState.draft.data.equipment, ["dumbbells", "bodyweight"]);
  assert.deepEqual(nextState.draft.data.exerciseLikes, []);
});

test("curatedOnboardingReducer marks intake completion separately from generation status", () => {
  const initialState = createCuratedOnboardingState({
    draft: createCuratedOnboardingDraft({
      stepId: "review",
    }),
  });

  const completedState = curatedOnboardingReducer(initialState, {
    type: "complete-intake",
    at: "2026-01-04T00:00:00.000Z",
  });

  assert.equal(completedState.draft.stepId, "generation-handoff");
  assert.equal(completedState.lifecycle.intakeStatus, "completed");
  assert.equal(completedState.lifecycle.generationStatus, "queued");
  assert.equal(completedState.lifecycle.completedAt, "2026-01-04T00:00:00.000Z");
});

test("curatedOnboardingReducer resolves deterministic generation with a plan id", () => {
  const initialState = createCuratedOnboardingState({
    lifecycle: {
      intakeStatus: "completed",
      generationStatus: "queued",
      planId: null,
      completedAt: null,
    },
  });

  const resolvedState = curatedOnboardingReducer(initialState, {
    type: "generation-resolved",
    status: "ready",
    planId: "curated-12345678",
  });

  assert.equal(resolvedState.lifecycle.intakeStatus, "completed");
  assert.equal(resolvedState.lifecycle.generationStatus, "ready");
  assert.equal(resolvedState.lifecycle.planId, "curated-12345678");
  assert.equal(resolvedState.message, null);
});

test("curatedOnboardingReducer reopens a failed or blocked intake on the review page without losing answers", () => {
  const failedState = createCuratedOnboardingState({
    draft: createCuratedOnboardingDraft({
      stepId: "generation-handoff",
      data: {
        intakeResponses: { name: "Member", trainingDaysPerWeek: "4" },
        equipment: ["bodyweight"],
        exerciseLikes: [],
        exerciseDislikes: [],
        targetAreas: [],
      },
    }),
    lifecycle: {
      intakeStatus: "completed",
      generationStatus: "failed",
      planId: "curated-12345678",
      completedAt: "2026-01-04T00:00:00.000Z",
    },
    message: "Previous failure",
  });

  const reopened = curatedOnboardingReducer(failedState, { type: "reopen-intake", at: "2026-01-05T00:00:00.000Z" });

  assert.equal(reopened.draft.stepId, "review");
  assert.equal(reopened.draft.updatedAt, "2026-01-05T00:00:00.000Z");
  assert.deepEqual(reopened.draft.data, failedState.draft.data);
  assert.deepEqual(reopened.lifecycle, {
    intakeStatus: "draft",
    generationStatus: "idle",
    planId: null,
    completedAt: null,
  });
  assert.equal(reopened.message, null);

  // Submitting again queues a fresh generation instead of reusing the failed one.
  const resubmitted = curatedOnboardingReducer(reopened, { type: "complete-intake", at: "2026-01-06T00:00:00.000Z" });
  assert.equal(resubmitted.lifecycle.generationStatus, "queued");
  assert.equal(resubmitted.draft.stepId, "generation-handoff");
});

test("curatedOnboardingReducer retries generation in place", () => {
  const failedState = createCuratedOnboardingState({
    draft: createCuratedOnboardingDraft({ stepId: "generation-handoff" }),
    lifecycle: { intakeStatus: "completed", generationStatus: "failed", planId: null, completedAt: "2026-01-04T00:00:00.000Z" },
  });

  const retried = curatedOnboardingReducer(failedState, { type: "generation-requested" });
  assert.equal(retried.lifecycle.generationStatus, "queued");
  assert.equal(retried.lifecycle.intakeStatus, "completed");
  assert.equal(retried.draft.stepId, "generation-handoff");
});
