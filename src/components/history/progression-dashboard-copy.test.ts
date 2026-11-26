import assert from "node:assert/strict";
import test from "node:test";
import { buildProgressionHistoryDisplayModel } from "@/lib/progression-history-display";
import {
  buildLiftsThatWentUp,
  liftsUpThisMonthLabel,
  toPlainEventLabel,
  toProgressDetailCharts,
  toProgressDetailStats,
} from "./progression-dashboard-copy";

const BANNED = /Event mix|vector|method|Promotion applied|Deload applied|\bevents?\b/i;

test("Lifts that went up: one line per lift, before its first raise -> after its latest (wave 2 #11)", () => {
  const rows = [
    { eventTypeValue: "promotion_applied", exerciseName: "Squat", fromTargetLabel: "4 x 5 @ 230 lb", toTargetLabel: "4 x 5 @ 235 lb" },
    { eventTypeValue: "deload_applied", exerciseName: "Bench", fromTargetLabel: "3 x 5 @ 185 lb", toTargetLabel: "3 x 5 @ 165 lb" },
    { eventTypeValue: "promotion_applied", exerciseName: "Squat", fromTargetLabel: "4 x 5 @ 225 lb", toTargetLabel: "4 x 5 @ 230 lb" },
    { eventTypeValue: "promotion_applied", exerciseName: "Row", fromTargetLabel: "3 x 8 @ 95 lb", toTargetLabel: "3 x 8 @ 100 lb" },
  ] as const;
  assert.deepEqual(buildLiftsThatWentUp(rows), [
    { key: "name:Squat", exerciseName: "Squat", routineName: null, before: "4 x 5 @ 225 lb", after: "4 x 5 @ 235 lb", timesUp: 2 },
    { key: "name:Row", exerciseName: "Row", routineName: null, before: "3 x 8 @ 95 lb", after: "3 x 8 @ 100 lb", timesUp: 1 },
  ]);
  assert.equal(buildLiftsThatWentUp(rows, 1).length, 1);
});

type Row = Parameters<typeof buildLiftsThatWentUp>[0][number];
const up = (exerciseId: string, from: string, to: string, extra: Partial<Row> = {}): Row => ({
  eventTypeValue: "promotion_applied", exerciseName: "Squat", exerciseId, routineDayExerciseId: null, fromTargetLabel: from, toTargetLabel: to, ...extra,
});
const other = (eventTypeValue: Row["eventTypeValue"], exerciseId: string, extra: Partial<Row> = {}): Row => ({
  eventTypeValue, exerciseName: "Squat", exerciseId, routineDayExerciseId: null, fromTargetLabel: null, toTargetLabel: null, ...extra,
});

test("Lifts that went up: empty ledger shows nothing", () => {
  assert.deepEqual(buildLiftsThatWentUp([]), []);
});

test("Lifts that went up: a single raise shows before -> after", () => {
  assert.deepEqual(buildLiftsThatWentUp([up("sq", "225 lb", "230 lb")]), [
    { key: "exercise:sq", exerciseName: "Squat", routineName: null, before: "225 lb", after: "230 lb", timesUp: 1 },
  ]);
});

test("Lifts that went up: a newer Undone cancels the raise it undoes (rows newest first)", () => {
  assert.deepEqual(buildLiftsThatWentUp([other("promotion_reverted", "sq"), up("sq", "225 lb", "230 lb")]), []);
  // Two raises, the newer one undone: only the older raise stands.
  assert.deepEqual(buildLiftsThatWentUp([
    other("promotion_reverted", "sq"),
    up("sq", "230 lb", "235 lb"),
    up("sq", "225 lb", "230 lb"),
  ]), [{ key: "exercise:sq", exerciseName: "Squat", routineName: null, before: "225 lb", after: "230 lb", timesUp: 1 }]);
});

test("Lifts that went up: a newer lighter week or hand-set goal drops the lift; an older one ends the run", () => {
  assert.deepEqual(buildLiftsThatWentUp([other("deload_applied", "sq"), up("sq", "225 lb", "230 lb")]), []);
  assert.deepEqual(buildLiftsThatWentUp([other("manual_target_change", "sq"), up("sq", "225 lb", "230 lb")]), []);
  assert.deepEqual(buildLiftsThatWentUp([
    up("sq", "205 lb", "210 lb"),
    other("lock_in", "sq"),
    other("deload_applied", "sq"),
    up("sq", "220 lb", "225 lb"),
  ]), [{ key: "exercise:sq", exerciseName: "Squat", routineName: null, before: "205 lb", after: "210 lb", timesUp: 1 }]);
});

test("Lifts that went up: two different exercises with the same name stay separate, labelled by routine", () => {
  const lifts = buildLiftsThatWentUp([
    up("sq-a", "225 lb", "230 lb", { routineDayExerciseId: "slot-a", routineName: "Legs A" }),
    up("sq-b", "135 lb", "140 lb", { routineDayExerciseId: "slot-b", routineName: "Legs B" }),
    other("promotion_reverted", "sq-c", { routineDayExerciseId: "slot-c" }),
    up("sq-c", "95 lb", "100 lb", { routineDayExerciseId: "slot-c", routineName: "Legs C" }),
  ]);
  assert.deepEqual(lifts.map((lift) => [lift.key, lift.routineName, lift.before, lift.after]), [
    ["slot:slot-a", "Legs A", "225 lb", "230 lb"],
    ["slot:slot-b", "Legs B", "135 lb", "140 lb"],
  ]);
  // A unique name needs no routine label.
  assert.equal(buildLiftsThatWentUp([up("sq-a", "1", "2", { routineName: "Legs A" })])[0]?.routineName, null);
});

test("Details holds totals, lighter weeks, goals you changed and the charts, in plain words (#11/#12)", () => {
  const model = buildProgressionHistoryDisplayModel({ events: [] });
  const stats = toProgressDetailStats(model.dashboardCards).map((card) => card.label);
  assert.deepEqual(stats, ["Went up in total", "Lighter weeks", "Goals you changed", "Latest change"]);
  const charts = toProgressDetailCharts(model.chartSections);
  assert.deepEqual(charts.map((section) => section.title), ["Changes per month", "Kinds of change"]);
  for (const text of [...stats, ...charts.flatMap((section) => [section.title, section.description, section.emptyTitle])]) {
    assert.doesNotMatch(text, BANNED, text);
  }
  assert.equal(liftsUpThisMonthLabel(model.dashboardCards), null);
  assert.equal(liftsUpThisMonthLabel([{ id: "promotions-this-month", label: "x", value: "3" }]), "3 this month");
});

test("change kinds read as plain words", () => {
  assert.equal(toPlainEventLabel("promotion_applied"), "Went up");
  assert.equal(toPlainEventLabel("deload_applied"), "Lighter week");
  assert.equal(toPlainEventLabel("manual_target_change"), "You changed the goal");
  assert.equal(toPlainEventLabel("something_new", "Fallback"), "Fallback");
});
