import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_WRITABLE_SCENARIO_IDS,
  FULL_ROUTINE_QA_PREFIX,
  FULL_ROUTINE_SCENARIO_IDS,
  PROGRESSION_QA_PREFIX,
  getWritableProgressionScenarioDefinition,
  getWritableProgressionScenarioDefinitions,
} from "./fitness-progression-scenario-definitions.mjs";

test("writable progression scenario definitions cover the public scenario ids", () => {
  const definitions = getWritableProgressionScenarioDefinitions();
  const ids = definitions.map((scenario) => scenario.id);

  assert.deepEqual(ids, ALL_WRITABLE_SCENARIO_IDS);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(definitions.every((scenario) => scenario.title.length > 0));
  assert.ok(definitions.every((scenario) => scenario.expected.length > 0));
});

test("writable progression scenarios create real routine target and history shapes", () => {
  const exactTarget = getWritableProgressionScenarioDefinition("strength_promote_exact_target");
  const aboveTarget = getWritableProgressionScenarioDefinition("strength_promote_above_target");
  const cardioTime = getWritableProgressionScenarioDefinition("cardio_time_promote");
  const linkedAllReady = getWritableProgressionScenarioDefinition("linked_same_target_all_ready");
  const linkedPartialSelection = getWritableProgressionScenarioDefinition("linked_same_target_partial_selection");
  const linkedStatusOnly = getWritableProgressionScenarioDefinition("linked_status_only");
  const fullStrength = getWritableProgressionScenarioDefinition("full_strength_cycle_mixed");
  const fullLinked = getWritableProgressionScenarioDefinition("full_linked_targets_cycle");
  const fullHistory = getWritableProgressionScenarioDefinition("full_history_context_cycle");
  const stretchHidden = getWritableProgressionScenarioDefinition("stretch_hidden");
  const uiStress = getWritableProgressionScenarioDefinition("ui_stress_full_inputs");

  assert.equal(exactTarget?.days[0]?.exercises[0]?.targetWeight, 225);
  assert.equal(exactTarget?.days[0]?.exercises[0]?.sessions[0]?.sets.length, 3);
  assert.equal(aboveTarget?.days[0]?.exercises[0]?.sessions[0]?.sets[0]?.weight, 30);
  assert.equal(cardioTime?.days[0]?.exercises[0]?.measurementType, "time");
  assert.equal(cardioTime?.days[0]?.exercises[0]?.sessions[0]?.sets[0]?.durationSeconds, 540);
  assert.equal(linkedAllReady?.days.length, 3);
  assert.equal(new Set(linkedAllReady?.days.flatMap((day) => day.exercises.map((row) => row.sharedExerciseKey))).size, 1);
  assert.equal(linkedPartialSelection?.days.length, 3);
  assert.equal(linkedStatusOnly?.days[0]?.exercises[0]?.sessions[0]?.sets.length, 3);
  assert.equal(fullStrength?.prefix, FULL_ROUTINE_QA_PREFIX);
  assert.equal(fullStrength?.days.length, 3);
  assert.equal(fullLinked?.days.length, 3);
  assert.equal(fullHistory?.contextRoutines?.length, 1);
  assert.equal(stretchHidden?.days[0]?.exercises[0]?.name, "Stretch");
  assert.equal(stretchHidden?.days[0]?.exercises[0]?.measurementType, "none");
  assert.equal(uiStress?.days[0]?.exercises.length, 10);
  assert.equal(uiStress?.days[0]?.exercises.some((exercise) => exercise.measurementType === "time_distance"), true);
  assert.equal(uiStress?.days[0]?.exercises.some((exercise) => exercise.playbookConfig?.setFlow === "ascending_ramp"), true);
  assert.equal(uiStress?.days[0]?.exercises.some((exercise) => exercise.playbookConfig?.setFlow === "descending_backoff"), true);
  assert.equal(uiStress?.days[0]?.exercises.some((exercise) => exercise.playbookConfig?.setFlow === "top_set_backoff"), true);
  assert.equal(uiStress?.days[0]?.exercises.some((exercise) => exercise.sessions.some((session) => session.status === "in_progress")), true);
});

test("writable progression scenarios use QA-only naming contracts", () => {
  assert.equal(PROGRESSION_QA_PREFIX, "[QA-PROGRESSION]");
  assert.equal(FULL_ROUTINE_QA_PREFIX, "[QA-FULL-ROUTINE]");
  assert.equal(FULL_ROUTINE_SCENARIO_IDS.length, 8);
  for (const scenario of getWritableProgressionScenarioDefinitions()) {
    assert.match(scenario.id, /^[a-z0-9_]+$/);
    assert.ok(scenario.days.length > 0);
  }
});
