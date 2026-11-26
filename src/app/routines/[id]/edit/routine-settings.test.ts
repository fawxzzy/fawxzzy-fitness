import assert from "node:assert/strict";
import test from "node:test";
import { buildRoutineSettingsFormData, describeRoutineSchedule } from "./routine-settings.ts";
import { createProgressionPlaybookFormState } from "../../../../lib/progression-playbook-form-state.ts";
import { resolveRoutineSchedule } from "../../../../lib/routine-schedule-resolution.ts";

// 2026-04-07 is a Tuesday.
const TUESDAY = "2026-04-07";

function anchored(cycleLengthDays: number, startDate = TUESDAY) {
  return { scheduleMode: "weekday_anchored" as const, cycleLengthDays, startDate };
}

test("5-day weekday_anchored routine repeats weekly on the five weekdays from its start (not every 5 days)", () => {
  assert.equal(describeRoutineSchedule(anchored(5)), "Weekly on Tue, Wed, Thu, Fri, Sat");
  // The line matches the resolver: one week later is day 1 again, and Sun/Mon are unscheduled.
  assert.equal(resolveRoutineSchedule({ ...anchored(5), anchorDate: TUESDAY, today: "2026-04-14" }).status, "scheduled");
  const sunday = resolveRoutineSchedule({ ...anchored(5), anchorDate: TUESDAY, today: "2026-04-12" });
  assert.equal(sunday.status, "unscheduled");
});

test("5-day routine with rest slots names only the training weekdays", () => {
  // Slots: 1 Tue, 2 Wed (rest), 3 Thu, 4 Fri (rest), 5 Sat.
  assert.equal(describeRoutineSchedule(anchored(5), [2, 4]), "Weekly on Tue, Thu, Sat");
});

test("7-day weekday_anchored routine: Mon-first weekday list, every day, or all rest", () => {
  // Started on a Thursday (2026-11-26): slots 1 Thu .. 7 Wed; rest on Thu, Sat, Sun, Tue leaves Mon, Wed, Fri.
  assert.equal(describeRoutineSchedule(anchored(7, "2026-11-26"), [1, 3, 4, 6]), "Weekly on Mon, Wed, Fri");
  assert.equal(describeRoutineSchedule(anchored(7)), "Weekly, every day");
  assert.equal(describeRoutineSchedule(anchored(7), [1, 2, 3, 4, 5, 6, 7]), "Weekly, all rest days");
});

test("10-day weekday_anchored routine repeats every two weeks with 4 days off", () => {
  assert.equal(describeRoutineSchedule(anchored(10)), "Every 2 weeks: 10-day plan, 4 days off, from Tue, Apr 7");
  assert.equal(resolveRoutineSchedule({ ...anchored(10), anchorDate: TUESDAY, today: "2026-04-21" }).status, "scheduled");
  assert.equal(resolveRoutineSchedule({ ...anchored(10), anchorDate: TUESDAY, today: "2026-04-18" }).status, "unscheduled");
  assert.equal(describeRoutineSchedule(anchored(14)), "Every 2 weeks, from Tue, Apr 7");
  assert.equal(describeRoutineSchedule(anchored(13)), "Every 2 weeks: 13-day plan, 1 day off, from Tue, Apr 7");
});

test("long weekday_anchored cycles repeat every 31 days (cycle capped at 31)", () => {
  assert.equal(describeRoutineSchedule(anchored(20)), "Every 31 days: 20-day plan, 11 days off, from Tue, Apr 7");
  assert.equal(describeRoutineSchedule(anchored(40)), "Every 31 days, from Tue, Apr 7");
});

test("a true every-N-days (rolling) routine says it repeats every N days", () => {
  const rolling = { scheduleMode: "rolling_n_day" as const, cycleLengthDays: 5, startDate: TUESDAY };
  assert.equal(describeRoutineSchedule(rolling), "Repeats every 5 days, from Tue, Apr 7");
  assert.equal(resolveRoutineSchedule({ ...rolling, anchorDate: TUESDAY, today: "2026-04-12" }).status, "scheduled");
  assert.equal(describeRoutineSchedule({ ...rolling, cycleLengthDays: 1 }), "Every day, from Tue, Apr 7");
});

const baseDraft = {
  name: " Push ",
  cycleLengthDays: 7,
  scheduleMode: "weekday_anchored" as const,
  startDate: TUESDAY,
  startWeekday: "tuesday",
  timezone: "UTC",
  weightUnit: "lbs",
  distanceUnit: "mi",
};

function payload(applyToAllExercisesConfirmed: boolean, playbookId: "double_progression" | null) {
  return buildRoutineSettingsFormData({
    routineId: "r-1",
    existingStartDate: TUESDAY,
    draft: baseDraft,
    timezone: "UTC",
    progressionDraft: createProgressionPlaybookFormState({ playbookId }),
    returnHref: "/routines/r-1",
    applyToAllExercisesConfirmed,
  });
}

test("the Auto-progress switch alone never asks the server to overwrite exercises", () => {
  for (const playbookId of ["double_progression", null] as const) {
    const formData = payload(false, playbookId);
    assert.equal(formData.get("applyRoutineDefaultToExercises"), null, `switch ${playbookId ?? "off"} must not cascade`);
  }
  assert.equal(payload(false, null).get("name"), "Push");
});

test("only the confirmed 'Apply to all exercises' choice sends applyRoutineDefaultToExercises=1", () => {
  assert.equal(payload(true, "double_progression").get("applyRoutineDefaultToExercises"), "1");
});
