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
    { exerciseName: "Squat", before: "4 x 5 @ 225 lb", after: "4 x 5 @ 235 lb", timesUp: 2 },
    { exerciseName: "Row", before: "3 x 8 @ 95 lb", after: "3 x 8 @ 100 lb", timesUp: 1 },
  ]);
  assert.equal(buildLiftsThatWentUp(rows, 1).length, 1);
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
