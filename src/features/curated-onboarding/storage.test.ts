import test from "node:test";
import assert from "node:assert/strict";

import { createCuratedOnboardingDraft, createCuratedOnboardingState } from "./fixtures.ts";
import {
  loadCuratedOnboardingGateState,
  loadCuratedOnboardingState,
  saveCuratedOnboardingState,
} from "./storage.ts";

function createMemoryStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

test("curated onboarding storage loads a valid saved lifecycle state", () => {
  const storage = createMemoryStorage();
  const state = createCuratedOnboardingState({
    draft: {
      version: 2,
      draftId: "draft-5",
      stepId: "schedule",
      updatedAt: "2026-01-04T00:00:00.000Z",
      data: {
        trainingGoal: "general-fitness",
        experience: "beginner",
        daysPerWeek: 4,
        sessionLengthMinutes: 45,
        equipment: ["bodyweight"],
        preferredStyle: "full-body",
        cardioPreference: "balanced",
        exerciseLikes: [],
        exerciseDislikes: [],
        targetAreas: [],
      },
    },
  });

  assert.equal(saveCuratedOnboardingState("user-1", state, storage), true);
  assert.deepEqual(loadCuratedOnboardingState("user-1", storage), state);
});

test("curated onboarding storage falls back cleanly when the saved state is malformed", () => {
  const storage = createMemoryStorage({
    "fawxzzy:curated-onboarding:v1:user-2:state": "{not-json",
  });

  assert.equal(loadCuratedOnboardingState("user-2", storage), null);
});

test("curated onboarding gate state migrates a legacy v1 draft and completion flag", () => {
  const storage = createMemoryStorage({
    "fawxzzy:curated-onboarding:v1:user-3:draft": JSON.stringify({
      version: 1,
      draftId: "draft-legacy",
      stepId: "preferences",
      updatedAt: "2026-01-05T00:00:00.000Z",
      data: {
        trainingGoal: "build-muscle",
        experience: "intermediate",
        daysPerWeek: 4,
        sessionLengthMinutes: 60,
        equipment: ["dumbbells", "bodyweight"],
        preferredStyle: "upper-lower",
        cardioPreference: "minimal",
        exerciseLikes: ["rows"],
        exerciseDislikes: [],
        targetAreas: ["back"],
      },
    }),
    "fawxzzy:curated-onboarding:v1:user-3:completed": JSON.stringify({
      version: 1,
      at: "2026-01-06T00:00:00.000Z",
    }),
  });

  const gateState = loadCuratedOnboardingGateState("user-3", storage);

  assert.equal(gateState.hasCompletedCuratedIntake, true);
  assert.equal(gateState.intakeStatus, "completed");
  assert.equal(gateState.generationStatus, "not-implemented");
  assert.equal(gateState.savedCuratedDraftId, null);
});

test("curated onboarding gate state does not resume drafts after intake is already completed", () => {
  const storage = createMemoryStorage();

  saveCuratedOnboardingState(
    "user-4",
    createCuratedOnboardingState({
      draft: createCuratedOnboardingDraft({
        draftId: "draft-6",
        stepId: "generation-handoff",
      }),
      lifecycle: {
        intakeStatus: "completed",
        generationStatus: "not-implemented",
        planId: null,
        completedAt: "2026-01-05T00:00:00.000Z",
      },
    }),
    storage,
  );

  const gateState = loadCuratedOnboardingGateState("user-4", storage);

  assert.equal(gateState.hasCompletedCuratedIntake, true);
  assert.equal(gateState.savedCuratedDraftId, null);
});
