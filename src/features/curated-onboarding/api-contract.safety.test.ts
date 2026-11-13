import assert from "node:assert/strict";
import test from "node:test";
import { compileCuratedWorkoutGeneration, toCuratedGenerationFailure } from "./api-contract.ts";
import { createCuratedParityFixture } from "./questionnaire.ts";

function clearResponses(): Record<string, unknown> {
  return { ...createCuratedParityFixture("limitations"), warningSymptoms: ["none"], trainingDaysPerWeek: "4" };
}

function without(responses: Record<string, unknown>, key: string) {
  const copy = { ...responses };
  delete copy[key];
  return copy;
}

test("the server fails closed when a safety answer is missing, empty or wrong-typed, whatever the browser claims", () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["warningSymptoms omitted", without(clearResponses(), "warningSymptoms")],
    ["warningSymptoms empty", { ...clearResponses(), warningSymptoms: [] }],
    ["warningSymptoms is a string", { ...clearResponses(), warningSymptoms: "chest-pain" }],
    ["warningSymptoms is a boolean", { ...clearResponses(), warningSymptoms: true }],
    ["acknowledgment false", { ...clearResponses(), safetyAcknowledgment: false }],
    ["acknowledgment omitted", without(clearResponses(), "safetyAcknowledgment")],
    ["under18 omitted", without(clearResponses(), "under18")],
  ];

  for (const [label, responses] of cases) {
    // A forged client payload that claims every derived field is complete must not matter.
    const outcome = compileCuratedWorkoutGeneration({
      onboarding: { intakeResponses: responses, trainingGoal: "get-stronger", daysPerWeek: 4, equipment: ["full-gym"] },
      signals: null,
    });
    assert.equal(outcome.status, "failed", label);
    if (outcome.status === "failed") assert.equal(outcome.reason, "incomplete-intake", label);
  }
});

test("a member under 18 without a guardian yes is blocked with its own stable code", () => {
  const blocked = compileCuratedWorkoutGeneration({
    onboarding: { intakeResponses: { ...clearResponses(), under18: "yes", guardianPermission: "no" } },
    signals: null,
  });
  assert.equal(blocked.status, "blocked");
  if (blocked.status === "blocked") {
    assert.equal(blocked.reason, "guardian-permission-required");
    assert.equal(toCuratedGenerationFailure(blocked).code, "guardian-permission-required");
  }

  const permitted = compileCuratedWorkoutGeneration({
    onboarding: { intakeResponses: { ...clearResponses(), under18: "yes", guardianPermission: "yes" } },
    signals: null,
  });
  assert.equal(permitted.status, "ready");
});

test("symptoms still block after every other required answer is present", () => {
  const outcome = compileCuratedWorkoutGeneration({
    onboarding: { intakeResponses: { ...clearResponses(), warningSymptoms: ["none", "dizziness"] } },
    signals: null,
  });
  assert.equal(outcome.status, "blocked");
  if (outcome.status === "blocked") assert.equal(outcome.reason, "safety-clearance-required");
});
