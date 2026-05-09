import test from "node:test";
import assert from "node:assert/strict";
import { validateRoutineDetailsDraft, type RoutineDetailsDraft } from "@/lib/routine-details-form";

function buildDraft(overrides: Partial<RoutineDetailsDraft> = {}): RoutineDetailsDraft {
  return {
    name: "Routine",
    cycleLengthDays: 7,
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
