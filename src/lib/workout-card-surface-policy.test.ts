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
    mediaRailWidth: 64,
  });
  assert.deepEqual(detailed, {
    showMedia: false,
    showIdentityChips: false,
    showDetailedMetrics: true,
    mediaRailWidth: 64,
  });
});

test("history browser keeps the shared media rail in both densities", () => {
  assert.deepEqual(resolveWorkoutCardSurfacePolicy("history-browser", "compact"), {
    showMedia: true,
    showIdentityChips: true,
    showDetailedMetrics: false,
    mediaRailWidth: 80,
  });
  assert.deepEqual(resolveWorkoutCardSurfacePolicy("history-browser", "detailed"), {
    showMedia: true,
    showIdentityChips: true,
    showDetailedMetrics: true,
    mediaRailWidth: 80,
  });
});

test("history detail rows keep media active for logged-set cards", () => {
  assert.deepEqual(resolveWorkoutCardSurfacePolicy("history-detail", "compact"), {
    showMedia: true,
    showIdentityChips: false,
    showDetailedMetrics: false,
    mediaRailWidth: 82,
  });
});

test("current session and edit day keep shared compact media rails without re-enabling dense chrome", () => {
  assert.deepEqual(resolveWorkoutCardSurfacePolicy("current-session", "compact"), {
    showMedia: true,
    showIdentityChips: false,
    showDetailedMetrics: false,
    mediaRailWidth: 84,
  });
  assert.deepEqual(resolveWorkoutCardSurfacePolicy("edit-day", "compact"), {
    showMedia: true,
    showIdentityChips: false,
    showDetailedMetrics: false,
    mediaRailWidth: 64,
  });
  assert.deepEqual(resolveWorkoutCardSurfacePolicy("reorder", "compact"), {
    showMedia: true,
    showIdentityChips: false,
    showDetailedMetrics: false,
    mediaRailWidth: 64,
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
