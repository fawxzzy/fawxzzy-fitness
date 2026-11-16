import assert from "node:assert/strict";
import test from "node:test";

import { buildRoutineTrainingRestInfoRailItems } from "@/lib/header-info-rail";

// The routine editor and live-session rail builders were retired with the header redesign (lanes H1a and H1b).
test("buildRoutineTrainingRestInfoRailItems clamps counts to whole non-negative numbers", () => {
  const [training, rest] = buildRoutineTrainingRestInfoRailItems({ trainingDays: 3.7, restDays: -2 });

  assert.equal(training?.id, "training-days");
  assert.equal(training?.value, 3);
  assert.equal(rest?.id, "rest-days");
  assert.equal(rest?.value, 0);
  assert.deepEqual(buildRoutineTrainingRestInfoRailItems({ trainingDays: null, restDays: undefined }).map((item) => item.value), [0, 0]);
});
