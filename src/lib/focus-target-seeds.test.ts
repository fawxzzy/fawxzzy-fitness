import assert from "node:assert/strict";
import test from "node:test";

import { resolveCapabilityAnchor } from "@/lib/capability-anchors";
import { buildFocusTargetSeed } from "@/lib/focus-target-seeds";

test("no history returns a manual fallback seed", () => {
  const result = buildFocusTargetSeed({
    focus: "strength",
    anchor: resolveCapabilityAnchor({}),
  });

  assert.equal(result.status, "manual_fallback");
  assert.equal(result.target, null);
});

test("strength focus uses routine target anchor when available", () => {
  const result = buildFocusTargetSeed({
    focus: "strength",
    anchor: resolveCapabilityAnchor({
      routineTarget: { weight: 135, weightUnit: "lbs", reps: 8 },
    }),
  });

  assert.equal(result.status, "generated");
  assert.equal(result.target?.weight, 139.05);
  assert.equal(result.target?.reps, 6);
});

test("PR anchor can seed hypertrophy focus", () => {
  const result = buildFocusTargetSeed({
    focus: "hypertrophy",
    anchor: resolveCapabilityAnchor({
      userAnchor: {
        pr: { weight: 225, weightUnit: "lbs", reps: 3 },
      },
    }),
  });

  assert.equal(result.status, "generated");
  assert.equal(result.target?.weight, 207);
  assert.equal(result.target?.reps, 5);
});

test("recent history remains the preferred seed source", () => {
  const recentLogs = [
    { weight: 185, weightUnit: "lbs" as const, reps: 5 },
    { weight: 175, weightUnit: "lbs" as const, reps: 8 },
  ];
  const result = buildFocusTargetSeed({
    focus: "technique",
    anchor: resolveCapabilityAnchor({
      recentLogs,
      routineTarget: { weight: 135, weightUnit: "lbs", reps: 8 },
    }),
  });

  assert.equal(result.source, "history");
  assert.equal(result.target?.weight, 140);
  assert.deepEqual(recentLogs, [
    { weight: 185, weightUnit: "lbs", reps: 5 },
    { weight: 175, weightUnit: "lbs", reps: 8 },
  ]);
});

test("speed focus does not claim measured speed without speed data", () => {
  const result = buildFocusTargetSeed({
    focus: "speed_power",
    anchor: resolveCapabilityAnchor({
      recentLogs: [{ weight: 200, weightUnit: "lbs", reps: 3 }],
    }),
  });

  assert.match(result.summary, /does not claim measured velocity/i);
});
