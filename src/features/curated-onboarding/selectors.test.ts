import assert from "node:assert/strict";
import test from "node:test";

import { EMPTY_CURATED_ONBOARDING_DATA } from "./constants.ts";
import { canAccessCuratedStep } from "./selectors.ts";

test("curated step access opens only pages whose prerequisites are complete", () => {
  assert.equal(canAccessCuratedStep("intro", EMPTY_CURATED_ONBOARDING_DATA), true);
  assert.equal(canAccessCuratedStep("goals", EMPTY_CURATED_ONBOARDING_DATA), true);
  assert.equal(canAccessCuratedStep("experience", EMPTY_CURATED_ONBOARDING_DATA), false);

  assert.equal(
    canAccessCuratedStep("experience", {
      ...EMPTY_CURATED_ONBOARDING_DATA,
      trainingGoal: "build-muscle",
    }),
    true,
  );
});

test("curated step access permits completed intake edits but never jumps directly to generation", () => {
  const completedIntake = {
    ...EMPTY_CURATED_ONBOARDING_DATA,
    trainingGoal: "get-stronger" as const,
    experience: "intermediate" as const,
    equipment: ["full-gym" as const],
    daysPerWeek: 4,
    sessionLengthMinutes: 60,
    preferredStyle: "upper-lower" as const,
    cardioPreference: "balanced" as const,
  };

  assert.equal(canAccessCuratedStep("review", completedIntake), true);
  assert.equal(canAccessCuratedStep("generation-handoff", completedIntake), false);
});
