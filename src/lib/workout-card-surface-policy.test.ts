import assert from "node:assert/strict";
import test from "node:test";

import { applyWorkoutCardSurfacePolicy, resolveWorkoutCardSurfacePolicy } from "./workout-card-surface-policy.ts";

test("today cards stay text-first while detailed mode keeps the richer metric row", () => {
  const compact = resolveWorkoutCardSurfacePolicy("today", "compact");
  const detailed = resolveWorkoutCardSurfacePolicy("today", "detailed");

  assert.deepEqual(compact, {
    showMedia: false,
    showIdentityChips: false,
    showDetailedMetrics: false,
  });
  assert.deepEqual(detailed, {
    showMedia: false,
    showIdentityChips: false,
    showDetailedMetrics: true,
  });
});

test("history browser is the only major card surface that keeps compact media", () => {
  assert.deepEqual(resolveWorkoutCardSurfacePolicy("history-browser", "compact"), {
    showMedia: true,
    showIdentityChips: true,
    showDetailedMetrics: false,
  });
  assert.deepEqual(resolveWorkoutCardSurfacePolicy("history-browser", "detailed"), {
    showMedia: false,
    showIdentityChips: true,
    showDetailedMetrics: true,
  });
});

test("surface policy strips low-value chips from dense session and day cards", () => {
  const applied = applyWorkoutCardSurfacePolicy({
    surface: "current-session",
    density: "compact",
    chips: [{ label: "Cardio" }],
    detailedMetrics: [{ label: "Next", value: "1 effort planned" }],
  });

  assert.equal(applied.policy.showMedia, false);
  assert.deepEqual(applied.chips, []);
  assert.deepEqual(applied.detailedMetrics, []);
});
