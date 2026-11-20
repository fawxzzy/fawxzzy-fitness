import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSwitchDayCardModel,
  formatSwitchDaySnapshotOverflow,
  SWITCH_DAY_REST_TITLE,
  SWITCH_DAY_SNAPSHOT_LIMIT,
  type SwitchDayCardFlags,
} from "./today-switch-day.ts";

const START = "2025-03-10"; // Monday
const idle: SwitchDayCardFlags = { isToday: false, isSelected: false, isCompleted: false, isInSession: false };
const names = (...list: string[]) => list.map((name) => ({ name }));

test("training day: title is the day name, meta is plain facts, snapshot is the first three exercises", () => {
  const model = buildSwitchDayCardModel(
    { dayIndex: 2, name: "Lower", isRest: false, exercises: names("Back Squat", "Walking Lunge", "Leg Press", "Calf Raise", "Hamstring Curl") },
    idle,
    START,
  );
  assert.equal(model.kind, "training");
  if (model.kind !== "training") return;
  assert.equal(model.title, "Lower");
  assert.deepEqual(model.meta, ["Day 2", "Tue", "5 exercises"]);
  assert.equal(SWITCH_DAY_SNAPSHOT_LIMIT, 3);
  assert.deepEqual(model.snapshotNames, ["Back Squat", "Walking Lunge", "Leg Press"]);
  assert.equal(model.snapshotOverflow, "and 2 more");
  assert.equal(model.tone, "neutral");
});

test("overflow copy never uses a plus sign (the Switch Day '+' report): 'and N more', null when nothing is hidden", () => {
  assert.equal(formatSwitchDaySnapshotOverflow(0), null);
  assert.equal(formatSwitchDaySnapshotOverflow(-1), null);
  assert.equal(formatSwitchDaySnapshotOverflow(1), "and 1 more");
  assert.equal(formatSwitchDaySnapshotOverflow(12), "and 12 more");
  for (let count = 0; count <= 20; count += 1) {
    const model = buildSwitchDayCardModel(
      { dayIndex: 3, name: "Day", isRest: false, exercises: names(...Array.from({ length: count }, (_, i) => `Exercise ${i}`)) },
      idle,
      START,
    );
    assert.doesNotMatch(JSON.stringify(model), /\+/);
  }
});

test("three or fewer exercises: every name shows and there is no overflow", () => {
  const model = buildSwitchDayCardModel({ dayIndex: 1, name: "Push", isRest: false, exercises: names("Bench Press", "Dip", "Fly") }, idle, START);
  assert.equal(model.kind, "training");
  if (model.kind !== "training") return;
  assert.deepEqual(model.snapshotNames, ["Bench Press", "Dip", "Fly"]);
  assert.equal(model.snapshotOverflow, null);
});

test("blank exercise names are skipped in the snapshot but the count still reflects the plan", () => {
  const model = buildSwitchDayCardModel({ dayIndex: 1, name: "Push", isRest: false, exercises: names("  ", "Dip", "") }, idle, START);
  assert.equal(model.kind, "training");
  if (model.kind !== "training") return;
  assert.deepEqual(model.snapshotNames, ["Dip"]);
  assert.equal(model.snapshotOverflow, null);
  assert.ok(model.meta.includes("3 exercises"));
});

test("empty training day: 'No exercises' in the meta line, no snapshot", () => {
  const model = buildSwitchDayCardModel({ dayIndex: 4, name: "Travel Reset", isRest: false, exercises: [] }, idle, START);
  assert.equal(model.kind, "training");
  if (model.kind !== "training") return;
  assert.deepEqual(model.meta, ["Day 4", "Thu", "No exercises"]);
  assert.deepEqual(model.snapshotNames, []);
  assert.equal(model.snapshotOverflow, null);
});

test("unnamed day: the title falls back to the position label", () => {
  const model = buildSwitchDayCardModel({ dayIndex: 1, name: "", isRest: false, exercises: names("Squat") }, idle, START);
  assert.equal(model.title, "Day 1");
});

test("rest day: title is always 'Rest day'; custom name, position, weekday ride in the inline meta", () => {
  const model = buildSwitchDayCardModel({ dayIndex: 3, name: "Recovery", isRest: true, exercises: [] }, idle, START);
  assert.equal(model.kind, "rest");
  assert.equal(model.title, SWITCH_DAY_REST_TITLE);
  assert.equal(SWITCH_DAY_REST_TITLE, "Rest day");
  assert.deepEqual(model.meta, ["Recovery", "Day 3", "Wed"]);
  assert.equal(model.tone, "attention");

  const unnamed = buildSwitchDayCardModel({ dayIndex: 4, name: "", isRest: true, exercises: [] }, idle, START);
  assert.deepEqual(unnamed.meta, ["Day 4", "Thu"]);
});

test("Today is an extra plain-text fact; selection changes tone only (current), never adds a tag word", () => {
  const today = buildSwitchDayCardModel({ dayIndex: 2, name: "Lower", isRest: false, exercises: names("Squat") }, { ...idle, isToday: true }, START);
  assert.deepEqual(today.meta, ["Day 2", "Tue", "Today", "1 exercise"]);

  const selected = buildSwitchDayCardModel({ dayIndex: 2, name: "Lower", isRest: false, exercises: names("Squat") }, { ...idle, isSelected: true }, START);
  assert.equal(selected.tone, "current");
  assert.doesNotMatch(selected.meta.join(" "), /selected/i);

  const restSelected = buildSwitchDayCardModel({ dayIndex: 3, name: "", isRest: true, exercises: [] }, { ...idle, isSelected: true, isToday: true }, START);
  assert.equal(restSelected.tone, "current");
  assert.deepEqual(restSelected.meta, ["Day 3", "Wed", "Today"]);
});

test("status: in progress beats done, and an in-progress day uses the logged tone", () => {
  const day = { dayIndex: 1, name: "Push", isRest: false, exercises: names("Bench") };
  const done = buildSwitchDayCardModel(day, { ...idle, isCompleted: true }, START);
  assert.deepEqual(done.meta.slice(-1), ["Done"]);
  const live = buildSwitchDayCardModel(day, { ...idle, isCompleted: true, isInSession: true, isSelected: true }, START);
  assert.deepEqual(live.meta.slice(-1), ["In progress"]);
  assert.equal(live.tone, "logged");
});

test("no start date: the weekday is omitted instead of guessed", () => {
  const model = buildSwitchDayCardModel({ dayIndex: 2, name: "Lower", isRest: false, exercises: [] }, idle, null);
  assert.deepEqual(model.meta, ["Day 2", "No exercises"]);
});
