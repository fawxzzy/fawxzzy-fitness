import assert from "node:assert/strict";
import test from "node:test";

import {
  estimateOneRepMax,
  resolveCapabilityAnchor,
  type TargetSnapshot,
} from "@/lib/capability-anchors";

const RECENT_LOGS: TargetSnapshot[] = [
  { weight: 185, weightUnit: "lbs", reps: 5 },
  { weight: 175, weightUnit: "lbs", reps: 8 },
];

test("recent logs are preferred over routine target and user input", () => {
  const anchor = resolveCapabilityAnchor({
    recentLogs: RECENT_LOGS,
    routineTarget: { weight: 165, weightUnit: "lbs", reps: 8 },
    userAnchor: {
      last: { weight: 155, weightUnit: "lbs", reps: 10 },
    },
  });

  assert.equal(anchor.source, "history");
  assert.deepEqual(anchor.last, RECENT_LOGS[0]);
  assert.deepEqual(anchor.pr, RECENT_LOGS[1]);
});

test("routine target anchor works when history is unavailable", () => {
  const anchor = resolveCapabilityAnchor({
    routineTarget: { weight: 135, weightUnit: "lbs", reps: 8 },
  });

  assert.equal(anchor.source, "routine_target");
  assert.equal(anchor.best?.weight, 135);
});

test("user anchor works when history and routine target are unavailable", () => {
  const anchor = resolveCapabilityAnchor({
    userAnchor: {
      best: { weight: 205, weightUnit: "lbs", reps: 3 },
    },
  });

  assert.equal(anchor.source, "user_input");
  assert.equal(anchor.pr?.weight, 205);
});

test("manual fallback returns when no anchor inputs exist", () => {
  const anchor = resolveCapabilityAnchor({});

  assert.equal(anchor.source, "manual_fallback");
  assert.equal(anchor.best, undefined);
});

test("e1RM calculation stays stable", () => {
  assert.equal(estimateOneRepMax({ weight: 200, reps: 5 }), 233.3333);
});
