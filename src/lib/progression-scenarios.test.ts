import test from "node:test";
import assert from "node:assert/strict";
import {
  WRITABLE_PROGRESSION_SCENARIO_SUMMARIES,
  buildProgressionScenarioFixtures,
  getProgressionScenarioFixture,
} from "@/lib/progression-scenarios";

const REQUIRED_IDS = [
  "no-candidate",
  "double-progression-promote",
  "hold-review",
  "deload-after-stall",
  "time-cardio-promote",
  "distance-cardio-promote",
  "time-distance-cardio-promote",
  "active-session-hides-review",
  "stretch-no-candidate",
  "cycle-occurrence-3-day",
  "training-goal-customized",
  "set-flow-defaults-by-goal",
  "set-flow-planned-targets",
  "required-first-logger-inputs",
];

test("progression scenario fixtures include every LLEL state", () => {
  const ids = buildProgressionScenarioFixtures().map((scenario) => scenario.id);

  for (const id of REQUIRED_IDS) {
    assert.ok(ids.includes(id), `missing ${id}`);
  }
});

test("candidate scenarios expose expected candidate types", () => {
  assert.equal(getProgressionScenarioFixture("no-candidate")?.candidate?.type, "none");
  assert.equal(getProgressionScenarioFixture("double-progression-promote")?.candidate?.type, "promote");
  assert.equal(getProgressionScenarioFixture("hold-review")?.candidate?.type, "review");
  assert.equal(getProgressionScenarioFixture("deload-after-stall")?.candidate?.type, "deload");
  assert.equal(getProgressionScenarioFixture("time-cardio-promote")?.candidate?.type, "promote");
  assert.equal(getProgressionScenarioFixture("distance-cardio-promote")?.candidate?.type, "promote");
  assert.equal(getProgressionScenarioFixture("time-distance-cardio-promote")?.candidate?.type, "promote");
  assert.equal(getProgressionScenarioFixture("stretch-no-candidate")?.candidate?.type, "none");
});

test("scenario fixtures are simulated and require no reset", () => {
  for (const scenario of buildProgressionScenarioFixtures()) {
    assert.match(scenario.reset, /No reset required/i);
    assert.doesNotMatch(scenario.reset, /delete|truncate|drop/i);
  }
});

test("3-day cycle fixture shows Day 1 rotating across weekdays", () => {
  const scenario = getProgressionScenarioFixture("cycle-occurrence-3-day");

  assert.ok(scenario);
  assert.ok(scenario.engineSummary.some((line) => line.includes("2026-05-11: Day 1 (Mon)")));
  assert.ok(scenario.engineSummary.some((line) => line.includes("2026-05-14: Day 1 (Thu)")));
  assert.ok(scenario.engineSummary.some((line) => line.includes("2026-05-17: Day 1 (Sun)")));
});

test("training goal customized scenario preserves selected goal", () => {
  const scenario = getProgressionScenarioFixture("training-goal-customized");

  assert.ok(scenario);
  assert.ok(scenario.engineSummary.includes("isTrainingGoalCustomized = true"));
  assert.ok(scenario.expectedUi.some((line) => /remains Build Strength/i.test(line)));
});

test("logger input fixture keeps required fields first", () => {
  const scenario = getProgressionScenarioFixture("required-first-logger-inputs");

  assert.ok(scenario);
  assert.ok(scenario.engineSummary.some((line) => line.startsWith("strength: order=reps, weight")));
  assert.ok(scenario.engineSummary.some((line) => line.startsWith("time: order=time")));
  assert.ok(scenario.engineSummary.some((line) => line.startsWith("distance: order=distance")));
});

test("set flow target fixture exposes all supported planned target examples", () => {
  const scenario = getProgressionScenarioFixture("set-flow-planned-targets");

  assert.ok(scenario);
  assert.ok(scenario.engineSummary.some((line) => line === "straight_sets:"));
  assert.ok(scenario.engineSummary.some((line) => line === "ascending_ramp:"));
  assert.ok(scenario.engineSummary.some((line) => line === "descending_backoff:"));
  assert.ok(scenario.engineSummary.some((line) => line.includes("Set 1 - Top set")));
});

test("writable progression scenario summaries expose the QA seed lane", () => {
  const ids = WRITABLE_PROGRESSION_SCENARIO_SUMMARIES.map((scenario) => scenario.id);

  assert.ok(ids.includes("strength_promote_exact_target"));
  assert.ok(ids.includes("strength_promote_above_target"));
  assert.ok(ids.includes("cardio_time_promote"));
  assert.ok(ids.includes("stretch_hidden"));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(WRITABLE_PROGRESSION_SCENARIO_SUMMARIES.every((scenario) => scenario.expected.length > 0));
});
