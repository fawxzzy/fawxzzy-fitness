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
  assert.equal(completedState.lifecycle.generationStatus, "not-implemented");
  assert.equal(completedState.lifecycle.completedAt, "2026-01-04T00:00:00.000Z");
});

test("curatedOnboardingReducer resolves placeholder generation without implying a plan exists", () => {
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
    status: "not-implemented",
    message: "Generation is not implemented yet.",
  });

  assert.equal(resolvedState.lifecycle.intakeStatus, "completed");
  assert.equal(resolvedState.lifecycle.generationStatus, "not-implemented");
  assert.equal(resolvedState.lifecycle.planId, null);
  assert.equal(resolvedState.message, "Generation is not implemented yet.");
});
