import assert from "node:assert/strict";
import test from "node:test";

import type { ProgressionEventRow } from "@/types/db";
import {
  applyProgressionHistoryFilters,
  parseProgressionHistoryFilters,
  serializeProgressionHistoryFilters,
} from "@/lib/progression-history-filters";

function buildEvent(overrides: Partial<ProgressionEventRow> = {}): ProgressionEventRow {
  return {
    id: "event-1",
    user_id: "user-1",
    routine_id: "routine-1",
    routine_day_exercise_id: "rde-1",
    exercise_id: "exercise-1",
    event_type: "promotion_applied",
    from_target: {},
    to_target: {},
    method: "double_progression",
    vector: "coupled_load_reps",
    step: null,
    reason: "Promotion applied.",
    source_session_id: "session-1",
    created_at: "2026-05-10T10:00:00.000Z",
    ...overrides,
  };
}

test("empty search params produce the default filter model", () => {
  assert.deepEqual(parseProgressionHistoryFilters(), {
    eventType: null,
    routineId: null,
    exerciseId: null,
    dateFrom: null,
    dateTo: null,
  });
});

test("valid filters are accepted while unknown event types and malformed dates are ignored", () => {
  assert.deepEqual(parseProgressionHistoryFilters({
    eventType: "promotion_applied",
    routineId: "routine-1",
    exerciseId: "exercise-1",
    dateFrom: "2026-05-01",
    dateTo: "2026-05-31",
  }), {
    eventType: "promotion_applied",
    routineId: "routine-1",
    exerciseId: "exercise-1",
    dateFrom: "2026-05-01",
    dateTo: "2026-05-31",
  });

  assert.deepEqual(parseProgressionHistoryFilters({
    eventType: "unknown",
    dateFrom: "2026-13-99",
    dateTo: "not-a-date",
  }), {
    eventType: null,
    routineId: null,
    exerciseId: null,
    dateFrom: null,
    dateTo: null,
  });
});

test("filter serialization stays stable and omits empty values", () => {
  const params = serializeProgressionHistoryFilters({
    eventType: "manual_target_change",
    routineId: "routine-2",
    exerciseId: null,
    dateFrom: "2026-05-01",
    dateTo: "2026-05-09",
  });

  assert.equal(params.toString(), "eventType=manual_target_change&routineId=routine-2&dateFrom=2026-05-01&dateTo=2026-05-09");
});

test("event, routine, exercise, and date filters narrow the durable event rows without mutation", () => {
  const events = [
    buildEvent({ id: "event-1", created_at: "2026-05-01T10:00:00.000Z" }),
    buildEvent({ id: "event-2", event_type: "manual_target_change", created_at: "2026-05-03T10:00:00.000Z" }),
    buildEvent({ id: "event-3", routine_id: "routine-2", exercise_id: "exercise-2", created_at: "2026-05-09T10:00:00.000Z" }),
  ];
  const before = JSON.stringify(events);

  assert.deepEqual(
    applyProgressionHistoryFilters(events, {
      eventType: "manual_target_change",
      routineId: null,
      exerciseId: null,
      dateFrom: null,
      dateTo: null,
    }).map((event) => event.id),
    ["event-2"],
  );

  assert.deepEqual(
    applyProgressionHistoryFilters(events, {
      eventType: null,
      routineId: "routine-2",
      exerciseId: "exercise-2",
      dateFrom: "2026-05-08",
      dateTo: "2026-05-10",
    }).map((event) => event.id),
    ["event-3"],
  );

  assert.equal(JSON.stringify(events), before);
});
