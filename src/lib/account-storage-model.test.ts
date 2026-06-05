import assert from "node:assert/strict";
import test from "node:test";

import { buildAccountStorageSnapshot } from "./account-storage-model";

const baseCounts = {
  sessions: 35,
  completedSessions: 33,
  visibleCompletedSessions: 31,
  hiddenQaCompletedSessions: 2,
  visibleSessionExercises: 108,
  sessionExercises: 122,
  visibleSets: 455,
  sets: 488,
  routines: 4,
  routineDays: 18,
  routineExercises: 71,
  exercises: 40,
  progressionEvents: 16,
} as const;

const allTimeRange = {
  dateFrom: null,
  dateTo: null,
  label: "All time",
} as const;

test("account storage snapshot uses history metrics for history scope", () => {
  const snapshot = buildAccountStorageSnapshot({
    scope: "history",
    counts: baseCounts,
    dateRange: allTimeRange,
  });

  assert.deepEqual(snapshot.metrics, [
    { label: "History Sessions", value: "31" },
    { label: "Stored Sessions", value: "35" },
    { label: "Completed Sessions", value: "33" },
    { label: "Hidden QA", value: "2" },
    { label: "In Progress", value: "2" },
    { label: "History Exercises", value: "108" },
    { label: "Stored Exercise Rows", value: "122" },
    { label: "History Sets", value: "455" },
    { label: "Stored Sets", value: "488" },
    { label: "Stored Progression Events", value: "16" },
  ]);
  assert.deepEqual(snapshot.sections.map((section) => section.title), ["History"]);
  assert.equal(snapshot.historyRangeLabel, "All time");
  assert.equal(snapshot.totalRecordCount, 661);
});

test("account storage snapshot switches to routine metrics for routine scope", () => {
  const snapshot = buildAccountStorageSnapshot({
    scope: "routines",
    counts: baseCounts,
    dateRange: allTimeRange,
  });

  assert.deepEqual(snapshot.metrics, [
    { label: "Routines", value: "4" },
    { label: "Routine Days", value: "18" },
    { label: "Routine Exercises", value: "71" },
  ]);
  assert.deepEqual(snapshot.sections.map((section) => section.title), ["Routines"]);
  assert.equal(snapshot.historyRangeLabel, "All time");
  assert.equal(snapshot.totalRecordCount, 93);
});

test("account storage snapshot combines history and routine metrics for all scope", () => {
  const snapshot = buildAccountStorageSnapshot({
    scope: "all",
    counts: baseCounts,
    dateRange: allTimeRange,
  });

  assert.deepEqual(snapshot.metrics, [
    { label: "History Sessions", value: "31" },
    { label: "Stored Sessions", value: "35" },
    { label: "Completed Sessions", value: "33" },
    { label: "Hidden QA", value: "2" },
    { label: "In Progress", value: "2" },
    { label: "History Exercises", value: "108" },
    { label: "Stored Exercise Rows", value: "122" },
    { label: "History Sets", value: "455" },
    { label: "Stored Sets", value: "488" },
    { label: "Stored Progression Events", value: "16" },
    { label: "Routines", value: "4" },
    { label: "Routine Days", value: "18" },
    { label: "Routine Exercises", value: "71" },
  ]);
  assert.deepEqual(snapshot.sections.map((section) => section.title), ["History", "Routines"]);
  assert.equal(snapshot.historyRangeLabel, "All time");
  assert.equal(snapshot.totalRecordCount, 754);
});
