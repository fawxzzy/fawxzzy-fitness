import test from "node:test";
import assert from "node:assert/strict";
import {
  getDefaultSetFlowForTrainingGoal,
  getSetFlowDescription,
  getSetFlowInfoTerm,
  isSetFlowSupportedForMeasurementType,
  listFutureSetFlowDefinitions,
  listSupportedSetFlowDefinitions,
  normalizeSetFlowId,
} from "@/lib/set-flow";

test("set flow defaults are stable for each training goal", () => {
  assert.equal(getDefaultSetFlowForTrainingGoal("build_muscle"), "straight_sets");
  assert.equal(getDefaultSetFlowForTrainingGoal("build_strength"), "straight_sets");
  assert.equal(getDefaultSetFlowForTrainingGoal("maintain"), "straight_sets");
  assert.equal(getDefaultSetFlowForTrainingGoal("conditioning"), "straight_sets");
  assert.equal(getDefaultSetFlowForTrainingGoal("technique_rehab"), "straight_sets");
});

test("set flow labels and descriptions are exposed for supported and future values", () => {
  const supported = listSupportedSetFlowDefinitions();
  const future = listFutureSetFlowDefinitions();

  assert.deepEqual(supported.map((flow) => flow.id), [
    "straight_sets",
    "ascending_ramp",
    "descending_backoff",
  ]);
  assert.deepEqual(future.map((flow) => flow.id), ["pyramid", "drop_set", "cluster"]);

  for (const flow of supported) {
    assert.ok(flow.label.trim(), `${flow.id} is missing a label`);
    assert.equal(getSetFlowDescription(flow.id), flow.shortExplanation);
  }
});

test("set flow support falls back safely for unsupported measurement types", () => {
  assert.equal(isSetFlowSupportedForMeasurementType("straight_sets", "reps"), true);
  assert.equal(isSetFlowSupportedForMeasurementType("straight_sets", "time"), true);
  assert.equal(isSetFlowSupportedForMeasurementType("ascending_ramp", "distance"), false);
  assert.equal(isSetFlowSupportedForMeasurementType("straight_sets", "none"), false);
});

test("set flow info terms include meaning affects and example copy", () => {
  for (const flow of listSupportedSetFlowDefinitions()) {
    const term = getSetFlowInfoTerm(flow.id);
    assert.ok(term.meaning.trim(), `${flow.id} is missing meaning copy`);
    assert.ok(term.affects.trim(), `${flow.id} is missing affects copy`);
    assert.ok(term.example.trim(), `${flow.id} is missing example copy`);
  }
});

test("set flow normalization accepts only supported set flow ids", () => {
  assert.equal(normalizeSetFlowId("straight_sets"), "straight_sets");
  assert.equal(normalizeSetFlowId("top_set_backoff"), "straight_sets");
  assert.equal(normalizeSetFlowId("drop_set"), null);
  assert.equal(normalizeSetFlowId("unknown"), null);
});
