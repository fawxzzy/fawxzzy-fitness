import assert from "node:assert/strict";
import test from "node:test";

import {
  WORKOUT_PLAN_NAME_MAX_LENGTH,
  hasWorkoutPlanNameConflict,
  hasWorkoutPlanTemplateNameConflict,
  normalizeWorkoutPlanNameCandidate,
  normalizeWorkoutPlanTemplateNameCandidate,
  resolveUniqueWorkoutPlanName,
  resolveUniqueWorkoutPlanTemplateName,
} from "@/lib/workout-plan-template-name";

test("normalizeWorkoutPlanNameCandidate trims, collapses whitespace, and caps length", () => {
  const normalized = normalizeWorkoutPlanNameCandidate("   Hunt    Alpha   Bravo   Charlie   ");

  assert.equal(normalized, "Hunt Alpha Brav");
  assert.equal(normalized.length, WORKOUT_PLAN_NAME_MAX_LENGTH);
});

test("workout plan name conflict matching is case-insensitive and normalized", () => {
  assert.equal(
    hasWorkoutPlanNameConflict({
      candidateName: "  hunt   ",
      workoutPlanNames: ["Hunt", "Forge"],
    }),
    true,
  );

  assert.equal(
    hasWorkoutPlanNameConflict({
      candidateName: "Shade",
      workoutPlanNames: ["Hunt", "Forge"],
    }),
    false,
  );
});

test("resolveUniqueWorkoutPlanName keeps the requested/source name when it is not taken", () => {
  assert.equal(
    resolveUniqueWorkoutPlanName({
      requestedName: "Forge",
      sourceName: "Hunt",
      existingNames: ["Hunt", "Shade"],
    }),
    "Forge",
  );
});

test("resolveUniqueWorkoutPlanName appends a numeric suffix when the base name is taken", () => {
  assert.equal(
    resolveUniqueWorkoutPlanName({
      requestedName: null,
      sourceName: "Hunt",
      existingNames: ["Hunt", "Hunt 2", "Hunt 3"],
    }),
    "Hunt 4",
  );
});

test("resolveUniqueWorkoutPlanName trims long names before suffixing", () => {
  assert.equal(
    resolveUniqueWorkoutPlanName({
      requestedName: "Super Long Workout Plan Name",
      sourceName: null,
      existingNames: ["Super Long Work", "Super Long Wo 2"],
    }),
    "Super Long Wo 3",
  );
});

test("template alias helpers remain behaviorally synced with workout plan helpers", () => {
  assert.equal(
    normalizeWorkoutPlanTemplateNameCandidate("  Hunt   Alpha  "),
    normalizeWorkoutPlanNameCandidate("  Hunt   Alpha  "),
  );

  assert.equal(
    hasWorkoutPlanTemplateNameConflict({
      candidateName: "hunt",
      templateNames: ["Hunt"],
    }),
    true,
  );

  assert.equal(
    resolveUniqueWorkoutPlanTemplateName({
      requestedName: null,
      sourceName: "Forge",
      existingNames: ["Forge", "Forge 2"],
    }),
    "Forge 3",
  );
});
