import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProgressionHistoryDisplayModel,
  buildProgressionHistoryDisplayRow,
} from "@/lib/progression-history-display";
import { applyProgressionHistoryFilters } from "@/lib/progression-history-filters";
import type { ProgressionEventRow } from "@/types/db";

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
    created_at: "2026-05-10T10:00:00.000Z",
    ...overrides,
  };
}

test("display model sorts newest first and uses stable id tie-breakers", () => {
  const model = buildProgressionHistoryDisplayModel({
    events: [
      buildEvent({ id: "event-a", created_at: "2026-05-10T10:00:00.000Z" }),
      buildEvent({ id: "event-b", created_at: "2026-05-10T10:00:00.000Z" }),
      buildEvent({ id: "event-c", created_at: "2026-05-11T10:00:00.000Z" }),
    ],
  });

  assert.deepEqual(model.rows.map((row) => row.id), ["event-c", "event-b", "event-a"]);
});

test("display rows fall back gracefully when routine or exercise names are missing", () => {
  const row = buildProgressionHistoryDisplayRow({
    event: buildEvent({
      routine_id: "routine-missing",
      exercise_id: "exercise-missing",
    }),
    routineNameById: new Map(),
    exerciseNameById: new Map(),
  });

  assert.equal(row.exerciseName, "Exercise");
  assert.equal(row.routineName, null);
  assert.equal(row.targetChangeSummary, "100 lbs x 12 -> 105 lbs x 8");
});

test("summary cards consume analytics helpers and resolve the top progressed exercise label", () => {
  const model = buildProgressionHistoryDisplayModel({
    events: [
      buildEvent({ id: "event-1", exercise_id: "exercise-1", event_type: "promotion_applied" }),
      buildEvent({ id: "event-2", exercise_id: "exercise-1", event_type: "promotion_applied" }),
      buildEvent({ id: "event-3", exercise_id: "exercise-2", event_type: "manual_target_change" }),
      buildEvent({ id: "event-4", exercise_id: "exercise-3", event_type: "promotion_reverted" }),
    ],
    exerciseNameById: new Map([
      ["exercise-1", "Back Squat"],
      ["exercise-2", "Push-Up"],
    ]),
  });

  assert.deepEqual(model.summaryCards.map((card) => `${card.label}:${card.value}`), [
    "Total events:4",
    "Promotions:2",
    "Deloads:0",
    "Manual changes:1",
    "Reverts:1",
    "Top progressed:Back Squat",
  ]);
  assert.equal(model.summaryCards[5]?.detail, "2 promotions");
  assert.deepEqual(model.dashboardCards.map((card) => card.label), [
    "Total events",
    "Promotions applied",
    "Top progressed",
    "Latest change",
    "Deloads applied",
    "Manual target changes",
    "Most active vector",
    "Most active method",
    "This month",
  ]);
  assert.equal(model.dashboardCards[2]?.value, "Back Squat");
  assert.equal(model.dashboardCards[3]?.value, "Exercise");
  assert.equal(model.dashboardCards[6]?.value, "Load + reps");
  assert.equal(model.dashboardCards[7]?.value, "Double Progression");
});

test("unknown target shapes do not throw and preserve a stable fallback summary", () => {
  const row = buildProgressionHistoryDisplayRow({
    event: buildEvent({
      from_target: { measurementType: "reps" },
      to_target: { measurementType: "distance", distance: 1.6, distanceUnit: "km" },
    }),
  });

  assert.equal(row.targetChangeSummary, "To 1.6 km");
});

test("display helpers do not mutate source event rows", () => {
  const events = [
    buildEvent(),
    buildEvent({ id: "event-2", event_type: "manual_target_change" }),
  ];
  const before = JSON.stringify(events);

  buildProgressionHistoryDisplayModel({ events });

  assert.equal(JSON.stringify(events), before);
});

test("dashboard cards handle empty and low-data states without inventing insights", () => {
  const model = buildProgressionHistoryDisplayModel({ events: [] });

  assert.equal(model.dashboardCards[0]?.value, "0");
  assert.equal(model.dashboardCards[0]?.detail, "No progression changes recorded yet");
  assert.equal(model.dashboardCards[2]?.value, "None yet");
  assert.equal(model.dashboardCards[3]?.value, "No changes yet");
  assert.equal(model.dashboardCards[6]?.value, "No vector data");
  assert.equal(model.dashboardCards[7]?.value, "No method data");
});

test("latest change dashboard card prefers the newest event and handles missing labels", () => {
  const model = buildProgressionHistoryDisplayModel({
    events: [
      buildEvent({ id: "event-old", exercise_id: "exercise-1", created_at: "2026-05-10T10:00:00.000Z" }),
      buildEvent({ id: "event-new", exercise_id: "exercise-missing", event_type: "deload_applied", created_at: "2026-05-11T10:00:00.000Z" }),
    ],
    exerciseNameById: new Map([["exercise-1", "Back Squat"]]),
  });

  const latestCard = model.dashboardCards.find((card) => card.id === "latest-change");
  assert.equal(latestCard?.value, "Exercise");
  assert.equal(latestCard?.detail, "Deload applied");
  assert.equal(latestCard?.tone, "danger");
});

test("filtered display models keep dashboard cards aligned with the filtered visible rows", () => {
  const events = [
    buildEvent({ id: "promotion-1", event_type: "promotion_applied", exercise_id: "exercise-1" }),
    buildEvent({ id: "manual-1", event_type: "manual_target_change", exercise_id: "exercise-2", created_at: "2026-05-11T10:00:00.000Z" }),
  ];
  const filteredEvents = applyProgressionHistoryFilters(events, {
    eventType: "manual_target_change",
    routineId: null,
    exerciseId: null,
    dateFrom: null,
    dateTo: null,
  });

  const model = buildProgressionHistoryDisplayModel({
    events: filteredEvents,
    totalEventCount: events.length,
    filters: {
      eventType: "manual_target_change",
      routineId: null,
      exerciseId: null,
      dateFrom: null,
      dateTo: null,
    },
    filterOptions: {
      eventTypes: [{ value: "manual_target_change", label: "Manual target change" }],
      routines: [],
      exercises: [],
    },
  });

  assert.equal(model.filteredEventCount, 1);
  assert.equal(model.totalEventCount, 2);
  assert.equal(model.hasActiveFilters, true);
  assert.deepEqual(model.rows.map((row) => row.id), ["manual-1"]);
  assert.equal(model.dashboardCards[0]?.value, "1");
  assert.equal(model.dashboardCards[3]?.detail, "Manual target change");
  assert.deepEqual(model.activeFilterLabels, ["Type: Manual target change"]);
});
