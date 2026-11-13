import assert from "node:assert/strict";
import test from "node:test";
import {
  CURATED_PLAN_CHANGED_MESSAGE,
  compileCuratedWorkoutGeneration,
  parseCuratedOnboardingPayload,
  toCuratedGenerationFailure,
} from "./api-contract.ts";
import { createCuratedParityFixture, deriveCuratedEngineData } from "./questionnaire.ts";
import type { CuratedOnboardingData } from "./types.ts";

function clearResponses() {
  return { ...createCuratedParityFixture("limitations"), warningSymptoms: ["none"], trainingDaysPerWeek: "4" };
}

function payload(overrides: Record<string, unknown> = {}, responses: Record<string, unknown> = clearResponses()) {
  return { intakeResponses: responses, ...overrides };
}

test("the engine input is rebuilt from intakeResponses and ignores forged derived fields", () => {
  const responses = clearResponses();
  const honest = deriveCuratedEngineData(responses);
  const forged = parseCuratedOnboardingPayload(payload({
    trainingGoal: "get-leaner",
    daysPerWeek: 7,
    sessionLengthMinutes: 5,
    equipment: ["full-gym"],
    exerciseDislikes: ["forged"],
    limitations: "forged",
  }, responses));

  assert.ok(forged);
  const { intakeResponses, ...derived } = forged;
  assert.deepEqual(derived, honest);
  assert.deepEqual(intakeResponses, responses);
});

test("unknown keys are dropped, hidden answers are removed and malformed payloads are rejected", () => {
  const parsed = parseCuratedOnboardingPayload(payload({}, {
    ...clearResponses(),
    isAdmin: true,
    __proto__: "x",
    under18: "no",
    guardianPermission: "yes",
  }));
  assert.ok(parsed);
  assert.equal("isAdmin" in parsed.intakeResponses, false);
  assert.equal("guardianPermission" in parsed.intakeResponses, false);

  assert.equal(parseCuratedOnboardingPayload(null), null);
  assert.equal(parseCuratedOnboardingPayload([]), null);
  assert.equal(parseCuratedOnboardingPayload({}), null);
  assert.equal(parseCuratedOnboardingPayload({ intakeResponses: [] }), null);
  assert.equal(parseCuratedOnboardingPayload(payload({}, { ...clearResponses(), name: 12 })), null);
  assert.equal(parseCuratedOnboardingPayload(payload({}, { ...clearResponses(), mainGoals: [1] })), null);
  assert.equal(parseCuratedOnboardingPayload(payload({}, { ...clearResponses(), name: "x".repeat(4001) })), null);
});

test("a complete clear intake compiles to a ready routine and is deterministic", () => {
  const first = compileCuratedWorkoutGeneration({ onboarding: payload(), signals: null });
  const second = compileCuratedWorkoutGeneration({ onboarding: structuredClone(payload()), signals: null });

  assert.equal(first.status, "ready");
  assert.deepEqual(first, second);
  if (first.status === "ready") {
    assert.equal(first.plan.daysPerWeek, 4);
    assert.equal(first.plan.progressionPlaybookId, "double_progression");
  }
});

test("reported warning symptoms compile to a blocked outcome with a stable code", () => {
  const outcome = compileCuratedWorkoutGeneration({
    onboarding: payload({}, { ...clearResponses(), warningSymptoms: ["dizziness"] }),
    signals: null,
  });

  assert.equal(outcome.status, "blocked");
  if (outcome.status === "blocked") {
    assert.deepEqual(toCuratedGenerationFailure(outcome), {
      code: "safety-clearance-required",
      error: outcome.message,
    });
    assert.match(outcome.message, /qualified professional/i);
  }
});

test("an unreadable or incomplete payload fails closed with a closed reason", () => {
  const unreadable = compileCuratedWorkoutGeneration({ onboarding: "nope", signals: null });
  assert.equal(unreadable.status, "failed");
  if (unreadable.status === "failed") assert.equal(unreadable.reason, "invalid-request");

  const incomplete = compileCuratedWorkoutGeneration({ onboarding: { intakeResponses: {} }, signals: null });
  assert.equal(incomplete.status, "failed");
  if (incomplete.status === "failed") assert.equal(incomplete.reason, "incomplete-intake");
});

test("a reviewed plan id that no longer matches the regenerated plan creates nothing and returns the new plan", () => {
  const reviewed = compileCuratedWorkoutGeneration({ onboarding: payload(), signals: null });
  assert.equal(reviewed.status, "ready");
  if (reviewed.status !== "ready") return;

  const unchanged = compileCuratedWorkoutGeneration({
    onboarding: payload(),
    signals: null,
    expectedPlanId: reviewed.plan.planId,
  });
  assert.equal(unchanged.status, "ready");

  const drifted = compileCuratedWorkoutGeneration({
    onboarding: payload(),
    signals: { completionRate: 0.2, missedWorkoutCount: 5, failedExerciseSlugs: [], fatiguedExerciseSlugs: [] },
    expectedPlanId: reviewed.plan.planId,
  });
  assert.equal(drifted.status, "plan-changed");
  if (drifted.status === "plan-changed") {
    assert.notEqual(drifted.plan.planId, reviewed.plan.planId);
    assert.equal(drifted.plan.daysPerWeek, 3);
    assert.deepEqual(toCuratedGenerationFailure(drifted), {
      code: "plan-changed",
      error: CURATED_PLAN_CHANGED_MESSAGE,
    });
  }
});

test("a draft payload stays inspectable: the same intake always yields the same engine input", () => {
  const first = parseCuratedOnboardingPayload(payload()) as CuratedOnboardingData;
  const second = parseCuratedOnboardingPayload(structuredClone(payload())) as CuratedOnboardingData;
  assert.deepEqual(first, second);
  assert.equal(first.daysPerWeek, 4);
  assert.equal(first.preferredStyle, "hybrid");
});
