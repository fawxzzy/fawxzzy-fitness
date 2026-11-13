import assert from "node:assert/strict";
import test from "node:test";

import { buildProgressionSummaryActivityBuckets } from "./progression-summary-activity.ts";
import type { ProgressionEventRow } from "../types/db.ts";

const EASTERN = "America/New_York";

function buildEvent(overrides: Partial<ProgressionEventRow> = {}): ProgressionEventRow {
  return {
    id: "event-1",
    user_id: "user-1",
    routine_id: "routine-1",
    routine_day_exercise_id: "rde-1",
    exercise_id: "exercise-1",
    event_type: "promotion_applied",
    from_target: {
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
    },
    to_target: {
      measurementType: "reps",
      setsMin: 3,
      setsMax: 3,
      repsTarget: null,
      repsMin: 8,
      repsMax: 8,
      weightMin: 105,
      weightMax: 105,
      weightUnit: "lbs",
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
    },
    method: "double_progression",
    vector: "coupled_load_reps",
    step: {
      vector: "coupled_load_reps",
      loadDelta: 5,
      repsTargetDelta: null,
      repsMinDelta: 0,
      repsMaxDelta: -4,
      setsDelta: 0,
      durationSecondsDelta: null,
      distanceDelta: null,
      caloriesDelta: null,
    },
    reason: "Promotion applied.",
    source_session_id: "session-1",
    // Nov 12 23:30 EST (UTC-5): the next day in UTC.
    created_at: "2026-11-13T04:30:00.000Z",
    ...overrides,
  };
}

test("progression activity buckets an evening Eastern event on its local day when given the History zone", () => {
  const eastern = buildProgressionSummaryActivityBuckets({
    events: [buildEvent()],
    granularity: "day",
    limit: 7,
    timeZone: EASTERN,
  });
  assert.deepEqual(eastern.map((bucket) => bucket.id), ["2026-11-12"]);
  assert.equal(eastern[0]?.label, "Nov 12");

  // Without a zone the analytics default (UTC) still applies, so the zone is what moves the bucket.
  const utcDefault = buildProgressionSummaryActivityBuckets({
    events: [buildEvent()],
    granularity: "day",
    limit: 7,
  });
  assert.deepEqual(utcDefault.map((bucket) => bucket.id), ["2026-11-13"]);
});

test("progression activity week buckets follow the zone across a Sunday-night event", () => {
  // Sun Nov 15 22:00 EST is Mon Nov 16 03:00Z: a different ISO week in UTC than in Eastern.
  const event = buildEvent({ created_at: "2026-11-16T03:00:00.000Z" });

  const eastern = buildProgressionSummaryActivityBuckets({ events: [event], granularity: "week", limit: 6, timeZone: EASTERN });
  const utc = buildProgressionSummaryActivityBuckets({ events: [event], granularity: "week", limit: 6, timeZone: "UTC" });

  assert.deepEqual(eastern.map((bucket) => bucket.id), ["2026-11-09"]);
  assert.deepEqual(utc.map((bucket) => bucket.id), ["2026-11-16"]);
});
