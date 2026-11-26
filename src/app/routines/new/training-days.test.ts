import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWeeklyPreviewDays,
  describeTrainingWeekdays,
  getWeeklySlotWeekdays,
  normalizeTrainingWeekdays,
  parseTrainingWeekdays,
} from "./training-days.ts";
import { resolveRoutineSchedule } from "../../../lib/routine-schedule-resolution.ts";

test("slot 1 is the start date's weekday and the week follows from it", () => {
  // 2026-11-26 is a Thursday.
  assert.deepEqual(getWeeklySlotWeekdays("2026-11-26"), [
    "thursday", "friday", "saturday", "sunday", "monday", "tuesday", "wednesday",
  ]);
  assert.equal(getWeeklySlotWeekdays("not-a-date"), null);
});

test("Mon/Wed/Fri started on a Thursday: only the Mon, Wed and Fri slots train", () => {
  const previewDays = buildWeeklyPreviewDays("2026-11-26", ["monday", "wednesday", "friday"]);
  // Thu, Fri, Sat, Sun, Mon, Tue, Wed
  assert.deepEqual(previewDays?.map((day) => day.isRest), [true, false, true, true, false, true, false]);
});

test("the picked weekdays land on those weekdays in the real schedule resolver", () => {
  const startDate = "2026-11-26";
  const previewDays = buildWeeklyPreviewDays(startDate, ["monday", "wednesday", "friday"])!;
  // Walk two weeks of real dates and check each one resolves to a training slot exactly on Mon/Wed/Fri.
  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date(Date.parse(`${startDate}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
    const resolution = resolveRoutineSchedule({
      scheduleMode: "weekday_anchored",
      cycleLengthDays: 7,
      anchorDate: startDate,
      today: date,
    });
    assert.equal(resolution.status, "scheduled", `resolves a day for ${date}`);
    const dayNumber = resolution.status === "scheduled" ? resolution.cycleDayNumber : 0;
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
    const trains = !previewDays[dayNumber - 1]!.isRest;
    assert.equal(trains, ["Monday", "Wednesday", "Friday"].includes(weekday), `${date} (${weekday})`);
  }
});

test("weekday input is cleaned to unique known days in Mon..Sun order", () => {
  assert.deepEqual(normalizeTrainingWeekdays(["friday", "monday", "friday", "funday", 3]), ["monday", "friday"]);
  assert.deepEqual(parseTrainingWeekdays('["sunday","tuesday"]'), ["tuesday", "sunday"]);
  assert.deepEqual(parseTrainingWeekdays("nope"), []);
  assert.deepEqual(parseTrainingWeekdays(""), []);
});

test("the plain summary reads as days", () => {
  assert.equal(describeTrainingWeekdays(["friday", "monday", "wednesday"]), "Mon, Wed, Fri");
  assert.equal(describeTrainingWeekdays([]), "No days picked");
  assert.equal(
    describeTrainingWeekdays(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
    "Every day",
  );
});
