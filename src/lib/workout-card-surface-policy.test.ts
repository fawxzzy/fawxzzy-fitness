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

test("history browser keeps detailed mode text-first while compact browsing can still show media", () => {
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

test("current session and edit day keep shared compact media rails without re-enabling dense chrome", () => {
  assert.deepEqual(resolveWorkoutCardSurfacePolicy("current-session", "compact"), {
    showMedia: true,
    showIdentityChips: false,
    showDetailedMetrics: false,
  });
  assert.deepEqual(resolveWorkoutCardSurfacePolicy("edit-day", "compact"), {
    showMedia: true,
    showIdentityChips: false,
    showDetailedMetrics: false,
  });
});

test("surface policy strips low-value chips from dense session and day cards", () => {
  const applied = applyWorkoutCardSurfacePolicy({
    surface: "current-session",
    density: "compact",
    chips: [{ label: "Cardio" }],
    detailedMetrics: [{ label: "Next", value: "1 effort planned" }],
  });

  assert.equal(applied.policy.showMedia, true);
  assert.deepEqual(applied.chips, []);
  assert.deepEqual(applied.detailedMetrics, []);
});
