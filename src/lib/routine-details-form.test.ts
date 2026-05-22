import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRoutineDetailsSnapshot,
  normalizeRoutineDetailsDraft,
  validateRoutineDetailsDraft,
  type RoutineDetailsDraft,
} from "@/lib/routine-details-form";

function buildDraft(overrides: Partial<RoutineDetailsDraft> = {}): RoutineDetailsDraft {
  return {
    name: "Routine",
    cycleLengthDays: 7,
    scheduleMode: "weekday_anchored",
    startDate: "2026-05-06",
    startWeekday: "wednesday",
    timezone: "America/New_York",
    weightUnit: "lbs",
    distanceUnit: "mi",
    ...overrides,
  };
}

test("new routine validation keeps the current routine name length cap", () => {
  assert.deepEqual(
    validateRoutineDetailsDraft(buildDraft({ name: "Fitness QA Baseline" })),
    { valid: false, error: "Routine name must be 15 characters or fewer." },
  );
});

test("edit routine validation can preserve legacy long names while saving other fields", () => {
  assert.deepEqual(
    validateRoutineDetailsDraft(buildDraft({ name: "Fitness QA Baseline" }), { allowLegacyLongName: true }),
    { valid: true, error: null },
  );
});

test("legacy routine drafts default safely to weekday anchored schedule mode", () => {
  const defaults = buildDraft();

  assert.equal(
    normalizeRoutineDetailsDraft({
      name: "Legacy",
      cycleLengthDays: 5,
      startDate: "2026-05-11",
    }, defaults).scheduleMode,
    "weekday_anchored",
  );
});

test("routine snapshots include schedule mode so mode switches register as dirty", () => {
  const weekdaySnapshot = buildRoutineDetailsSnapshot(buildDraft({ scheduleMode: "weekday_anchored" }));
  const rollingSnapshot = buildRoutineDetailsSnapshot(buildDraft({ scheduleMode: "rolling_n_day" }));

  assert.notEqual(weekdaySnapshot, rollingSnapshot);
});
