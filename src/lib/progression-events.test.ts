import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProgressionEventPayload,
  buildProgressionEventStepSnapshot,
  extractProgressionSourceSessionId,
  resolveProgressionEventMethod,
  resolveProgressionEventVector,
  serializeProgressionEventTarget,
  targetsDiffer,
} from "@/lib/progression-events";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";

function buildTarget(overrides: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "reps",
    setsMin: 3,
    setsMax: 3,
    repsTarget: null,
    repsMin: 8,
    repsMax: 12,
    weightMin: 100,
    weightMax: 100,
    weightUnit: "lbs",
    durationSeconds: null,
    distance: null,
    distanceUnit: null,
    calories: null,
    ...overrides,
  };
}

test("builds a promotion-applied payload with before and after targets", () => {
  const fromTarget = buildTarget();
  const toTarget = buildTarget({
    repsMin: 8,
    repsMax: 8,
    weightMin: 105,
    weightMax: 105,
  });

  const payload = buildProgressionEventPayload({
    userId: "user-1",
    routineId: "routine-1",
    routineDayExerciseId: "rde-1",
    exerciseId: "exercise-1",
    eventType: "promotion_applied",
    fromTarget,
    toTarget,
    reason: "Met the promotion target.",
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
    sourceSessionId: "session-1",
  });

  assert.ok(payload);
  assert.equal(payload?.event_type, "promotion_applied");
  assert.equal(payload?.from_target.weightMax, 100);
  assert.equal(payload?.to_target.weightMax, 105);
  assert.equal(payload?.method, "double_progression");
  assert.equal(payload?.vector, "coupled_load_reps");
  assert.equal(payload?.step.loadDelta, 5);
  assert.equal(payload?.source_session_id, "session-1");
});

test("builds a promotion-reverted payload and keeps a delta snapshot", () => {
  const fromTarget = buildTarget({
    repsMin: 5,
    repsMax: 5,
    weightMin: 105,
    weightMax: 105,
  });
  const toTarget = buildTarget();

  const payload = buildProgressionEventPayload({
    userId: "user-1",
    routineId: "routine-1",
    routineDayExerciseId: "rde-1",
    exerciseId: "exercise-1",
    eventType: "promotion_reverted",
    fromTarget,
    toTarget,
    reason: "Reverted the promotion.",
    playbookId: "double_progression",
    config: { version: 1, loadIncrement: 5 },
  });

  assert.ok(payload);
  assert.equal(payload?.event_type, "promotion_reverted");
  assert.equal(payload?.step.loadDelta, -5);
  assert.equal(payload?.step.repsMinDelta, 3);
  assert.equal(payload?.step.repsMaxDelta, 7);
});

test("manual target changes infer vector from the actual target delta", () => {
  const vector = resolveProgressionEventVector({
    playbookId: null,
    config: null,
    fromTarget: buildTarget({
      measurementType: "time_distance",
      repsMin: null,
      repsMax: null,
      weightMin: null,
      weightMax: null,
      weightUnit: null,
      durationSeconds: 1200,
      distance: 2,
      distanceUnit: "mi",
    }),
    toTarget: buildTarget({
      measurementType: "time_distance",
      repsMin: null,
      repsMax: null,
      weightMin: null,
      weightMax: null,
      weightUnit: null,
      durationSeconds: 1200,
      distance: 2.5,
      distanceUnit: "mi",
    }),
  });

  assert.equal(resolveProgressionEventMethod({ playbookId: null, config: null }), "manual");
  assert.equal(vector, "distance");
});

test("extracts canonical session ids from grouped history rows", () => {
  assert.equal(extractProgressionSourceSessionId({
    sourceSessionId: "session-exercise-2",
    historyRows: [
      { sessionId: "session-exercise-1", sessionRecordId: "session-1" },
      { sessionId: "session-exercise-2", sessionRecordId: "session-2" },
    ],
  }), "session-2");
});

test("target serialization and diff checks stay stable for manual edits", () => {
  const baseTarget = buildTarget();
  const sameTarget = buildTarget();
  const changedTarget = buildTarget({
    repsMin: 10,
    repsMax: 12,
  });

  assert.deepEqual(serializeProgressionEventTarget(baseTarget), {
    measurementType: "reps",
    setsMin: 3,
    setsMax: 3,
    repsTarget: null,
    repsMin: 8,
    repsMax: 12,
    weightMin: 100,
    weightMax: 100,
    weightUnit: "lbs",
    durationSeconds: null,
    distance: null,
    distanceUnit: null,
    calories: null,
  });
  assert.equal(targetsDiffer(baseTarget, sameTarget), false);
  assert.equal(targetsDiffer(baseTarget, changedTarget), true);
});

test("missing identifiers or reason safely skip event payload creation", () => {
  const payload = buildProgressionEventPayload({
    userId: "user-1",
    routineId: "",
    routineDayExerciseId: "rde-1",
    exerciseId: "exercise-1",
    eventType: "manual_target_change",
    fromTarget: buildTarget(),
    toTarget: buildTarget({ repsMin: 10 }),
    reason: "   ",
  });

  assert.equal(payload, null);
});

test("step snapshots serialize set and distance deltas when present", () => {
  const step = buildProgressionEventStepSnapshot({
    fromTarget: buildTarget({
      measurementType: "distance",
      setsMin: 1,
      setsMax: 1,
      repsMin: null,
      repsMax: null,
      weightMin: null,
      weightMax: null,
      weightUnit: null,
      distance: 1,
      distanceUnit: "mi",
    }),
    toTarget: buildTarget({
      measurementType: "distance",
      setsMin: 2,
      setsMax: 2,
      repsMin: null,
      repsMax: null,
      weightMin: null,
      weightMax: null,
      weightUnit: null,
      distance: 1.5,
      distanceUnit: "mi",
    }),
    vector: "distance",
  });

  assert.equal(step.vector, "distance");
  assert.equal(step.setsDelta, 1);
  assert.equal(step.distanceDelta, 0.5);
});
