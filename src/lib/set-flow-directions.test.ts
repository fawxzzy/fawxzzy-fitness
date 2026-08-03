import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_SET_FLOW_DIRECTION_CONFIG,
  areSetFlowDirectionsStraight,
  cycleSetFlowDirection,
  getSetFlowDirectionConfigForLegacySetFlow,
  hasSetFlowDirectionStepValue,
  inferLegacySetFlowFromDirections,
  isSetFlowDirection,
  normalizeSetFlowDirectionConfig,
  normalizeSetFlowDirectionForStepValue,
  shouldShowEffortShiftLabel,
  type SetFlowDirectionConfig,
} from "./set-flow-directions";

test("ascending_ramp ramps time/distance/weight up while reps intentionally moves down", () => {
  const config = getSetFlowDirectionConfigForLegacySetFlow("ascending_ramp");
  assert.deepEqual(config, { time: "up", distance: "up", reps: "down", weight: "up" });
});

test("descending_backoff mirrors ascending_ramp: time/distance/weight down, reps up", () => {
  const config = getSetFlowDirectionConfigForLegacySetFlow("descending_backoff");
  assert.deepEqual(config, { time: "down", distance: "down", reps: "up", weight: "down" });
});

test("straight_sets, an unknown id, and undefined all resolve to the all-straight default", () => {
  assert.deepEqual(getSetFlowDirectionConfigForLegacySetFlow("straight_sets"), DEFAULT_SET_FLOW_DIRECTION_CONFIG);
  assert.deepEqual(getSetFlowDirectionConfigForLegacySetFlow("some_unrecognized_id"), DEFAULT_SET_FLOW_DIRECTION_CONFIG);
  assert.deepEqual(getSetFlowDirectionConfigForLegacySetFlow(undefined), DEFAULT_SET_FLOW_DIRECTION_CONFIG);
  assert.deepEqual(getSetFlowDirectionConfigForLegacySetFlow(null), DEFAULT_SET_FLOW_DIRECTION_CONFIG);
});

test("getSetFlowDirectionConfigForLegacySetFlow returns a fresh object each call (callers may mutate safely)", () => {
  const first = getSetFlowDirectionConfigForLegacySetFlow("straight_sets");
  const second = getSetFlowDirectionConfigForLegacySetFlow("straight_sets");
  assert.notEqual(first, second);
  assert.deepEqual(first, second);
});

test("inferLegacySetFlowFromDirections is the exact inverse of getSetFlowDirectionConfigForLegacySetFlow for all three presets", () => {
  for (const setFlow of ["ascending_ramp", "descending_backoff", "straight_sets"] as const) {
    const config = getSetFlowDirectionConfigForLegacySetFlow(setFlow);
    assert.equal(inferLegacySetFlowFromDirections(config), setFlow, `round-trip failed for ${setFlow}`);
  }
});

test("inferLegacySetFlowFromDirections requires the full exact pattern, not just the weight/reps pair", () => {
  // Same weight/reps relationship as ascending_ramp, but time/distance don't match --
  // must NOT be classified as ascending_ramp just because weight+reps line up.
  const partial: SetFlowDirectionConfig = { time: "straight", distance: "straight", reps: "down", weight: "up" };
  assert.equal(inferLegacySetFlowFromDirections(partial), "straight_sets");
});

test("areSetFlowDirectionsStraight is true only when every field is straight", () => {
  assert.equal(areSetFlowDirectionsStraight(DEFAULT_SET_FLOW_DIRECTION_CONFIG), true);
  assert.equal(areSetFlowDirectionsStraight(getSetFlowDirectionConfigForLegacySetFlow("ascending_ramp")), false);
  assert.equal(
    areSetFlowDirectionsStraight({ time: "straight", distance: "straight", reps: "straight", weight: "up" }),
    false,
  );
});

test("isSetFlowDirection accepts only the three valid direction values", () => {
  assert.equal(isSetFlowDirection("up"), true);
  assert.equal(isSetFlowDirection("down"), true);
  assert.equal(isSetFlowDirection("straight"), true);
  assert.equal(isSetFlowDirection("sideways"), false);
  assert.equal(isSetFlowDirection(undefined), false);
  assert.equal(isSetFlowDirection(null), false);
  assert.equal(isSetFlowDirection(1), false);
});

test("normalizeSetFlowDirectionConfig keeps valid per-field values and falls back per-field for invalid ones", () => {
  const result = normalizeSetFlowDirectionConfig({
    time: "up",
    distance: "not-a-direction",
    reps: undefined,
    weight: "down",
  });

  assert.deepEqual(result, { time: "up", distance: "straight", reps: "straight", weight: "down" });
});

test("normalizeSetFlowDirectionConfig falls back to a caller-supplied config, not just the global default", () => {
  const fallback = getSetFlowDirectionConfigForLegacySetFlow("descending_backoff");
  const result = normalizeSetFlowDirectionConfig({ time: "up" }, fallback);

  assert.deepEqual(result, { time: "up", distance: "down", reps: "up", weight: "down" });
});

test("normalizeSetFlowDirectionConfig treats a non-object input as fully empty", () => {
  assert.deepEqual(normalizeSetFlowDirectionConfig(null), DEFAULT_SET_FLOW_DIRECTION_CONFIG);
  assert.deepEqual(normalizeSetFlowDirectionConfig("up"), DEFAULT_SET_FLOW_DIRECTION_CONFIG);
  assert.deepEqual(normalizeSetFlowDirectionConfig(undefined), DEFAULT_SET_FLOW_DIRECTION_CONFIG);
});

test("hasSetFlowDirectionStepValue rejects empty, whitespace-only, and the '-' placeholder", () => {
  assert.equal(hasSetFlowDirectionStepValue("5"), true);
  assert.equal(hasSetFlowDirectionStepValue("  5  "), true);
  assert.equal(hasSetFlowDirectionStepValue(""), false);
  assert.equal(hasSetFlowDirectionStepValue("   "), false);
  assert.equal(hasSetFlowDirectionStepValue("-"), false);
  assert.equal(hasSetFlowDirectionStepValue(null), false);
  assert.equal(hasSetFlowDirectionStepValue(undefined), false);
});

test("cycleSetFlowDirection cycles through all three states when there is no step value", () => {
  assert.equal(cycleSetFlowDirection({ current: "straight", hasStepValue: false }), "up");
  assert.equal(cycleSetFlowDirection({ current: "up", hasStepValue: false }), "down");
  assert.equal(cycleSetFlowDirection({ current: "down", hasStepValue: false }), "straight");
});

test("cycleSetFlowDirection intentionally cannot return to straight once a step value exists", () => {
  // A real step value implies a real direction is meaningful -- "straight" would
  // be a contradictory state, so the cycle only toggles between up/down.
  assert.equal(cycleSetFlowDirection({ current: "straight", hasStepValue: true }), "up");
  assert.equal(cycleSetFlowDirection({ current: "up", hasStepValue: true }), "down");
  assert.equal(cycleSetFlowDirection({ current: "down", hasStepValue: true }), "up");
});

test("normalizeSetFlowDirectionForStepValue forces straight once the step value is cleared", () => {
  assert.equal(normalizeSetFlowDirectionForStepValue({ current: "up", nextValue: "" }), "straight");
  assert.equal(normalizeSetFlowDirectionForStepValue({ current: "down", nextValue: "-" }), "straight");
  assert.equal(normalizeSetFlowDirectionForStepValue({ current: "up", nextValue: null }), "straight");
});

test("normalizeSetFlowDirectionForStepValue preserves an existing non-straight direction when a step value remains", () => {
  assert.equal(normalizeSetFlowDirectionForStepValue({ current: "down", nextValue: "5" }), "down");
});

test("normalizeSetFlowDirectionForStepValue defaults a newly-introduced step value to up", () => {
  assert.equal(normalizeSetFlowDirectionForStepValue({ current: "straight", nextValue: "5" }), "up");
});

test("shouldShowEffortShiftLabel is true for up/down and false for straight", () => {
  assert.equal(shouldShowEffortShiftLabel("up"), true);
  assert.equal(shouldShowEffortShiftLabel("down"), true);
  assert.equal(shouldShowEffortShiftLabel("straight"), false);
});
