import test from "node:test";
import assert from "node:assert/strict";
import { deriveProgressionProgressPercent } from "@/lib/progression-progress-percent";
import type { ProgressionHistorySetRow, ProgressionTargetPlan } from "@/lib/progression-playbooks";

function buildTarget(overrides: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "reps",
    setsMin: 3,
    setsMax: 3,
    repsTarget: 6,
    repsMin: 4,
    repsMax: 6,
    weightMin: 225,
    weightMax: 225,
    weightUnit: "lbs",
    durationSeconds: null,
    distance: null,
    distanceUnit: null,
    calories: null,
    ...overrides,
  };
}

function buildRows(reps: number[], weight = 225): ProgressionHistorySetRow[] {
  return reps.map((rep, index) => ({
    sessionId: "session-exercise-1",
    performedAt: "2026-05-07T12:00:00.000Z",
    setIndex: index + 1,
    weight,
    reps: rep,
    weightUnit: "lbs",
    durationSeconds: null,
    distance: null,
    distanceUnit: null,
    calories: null,
    isWarmup: false,
  }));
}

test("returns no-history progress for empty history", () => {
  const progress = deriveProgressionProgressPercent({
    plan: buildTarget(),
    historyRows: [],
  });

  assert.equal(progress.percent, 0);
  assert.equal(progress.state, "no_history");
});

test("returns ready progress for ready updates", () => {
  const progress = deriveProgressionProgressPercent({
    plan: buildTarget(),
    historyRows: [],
    isReady: true,
  });

  assert.equal(progress.percent, 100);
  assert.equal(progress.state, "ready");
  assert.equal(progress.label, "Ready");
});

test("derives strength set qualification percent", () => {
  const progress = deriveProgressionProgressPercent({
    plan: buildTarget(),
    historyRows: buildRows([8, 7, 4]),
  });

  assert.equal(progress.percent, 67);
  assert.equal(progress.state, "partial");
  assert.equal(progress.label, "2/3 sets");
});

test("requires target load for load-based strength progress", () => {
  const progress = deriveProgressionProgressPercent({
    plan: buildTarget({ weightMin: 230, weightMax: 230 }),
    historyRows: buildRows([8, 8, 8], 225),
  });

  assert.equal(progress.percent, 0);
  assert.equal(progress.label, "0/3 sets");
});

test("caps strength progress at 100", () => {
  const progress = deriveProgressionProgressPercent({
    plan: buildTarget(),
    historyRows: buildRows([8, 8, 8, 8]),
  });

  assert.equal(progress.percent, 100);
  assert.equal(progress.state, "ready");
});

test("derives cardio duration percent", () => {
  const progress = deriveProgressionProgressPercent({
    plan: buildTarget({
      measurementType: "time",
      repsTarget: null,
      repsMin: null,
      repsMax: null,
      weightMin: null,
      weightMax: null,
      durationSeconds: 240,
    }),
    historyRows: [{
      sessionId: "cardio-1",
      performedAt: "2026-05-07T12:00:00.000Z",
      setIndex: 1,
      weight: null,
      reps: null,
      weightUnit: null,
      durationSeconds: 120,
      distance: null,
      distanceUnit: null,
      calories: null,
      isWarmup: false,
    }],
  });

  assert.equal(progress.percent, 50);
  assert.equal(progress.label, "2:00 / 4:00");
});

test("derives distance percent", () => {
  const progress = deriveProgressionProgressPercent({
    plan: buildTarget({
      measurementType: "distance",
      repsTarget: null,
      repsMin: null,
      repsMax: null,
      weightMin: null,
      weightMax: null,
      distance: 2,
      distanceUnit: "mi",
    }),
    historyRows: [{
      sessionId: "distance-1",
      performedAt: "2026-05-07T12:00:00.000Z",
      setIndex: 1,
      weight: null,
      reps: null,
      weightUnit: null,
      durationSeconds: null,
      distance: 1,
      distanceUnit: "mi",
      calories: null,
      isWarmup: false,
    }],
  });

  assert.equal(progress.percent, 50);
});

test("does not render fill for manual measurementless targets", () => {
  const progress = deriveProgressionProgressPercent({
    plan: buildTarget({ measurementType: "none" }),
    historyRows: [],
  });

  assert.equal(progress.percent, 0);
  assert.equal(progress.state, "manual_hidden");
});
