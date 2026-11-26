import assert from "node:assert/strict";
import test from "node:test";
import { buildHistoryWeekStrip } from "./historyWeekStrip";

const base = { timezone: "UTC", currentWeekStart: "2026-11-23" };

test("week strip reads 'This week: X of Y · streak N weeks'", () => {
  const strip = buildHistoryWeekStrip({
    ...base,
    sessionStartedAts: ["2026-11-24T10:00:00Z", "2026-11-25T10:00:00Z", "2026-11-18T10:00:00Z", "2026-11-10T10:00:00Z"],
    completedThisWeek: 2,
    weeklyTarget: 3,
  });
  assert.equal(strip.streakWeeks, 3);
  assert.equal(strip.label, "This week: 2 of 3 · streak 3 weeks");
});

test("an empty week in progress does not break the streak; a gap does", () => {
  const strip = buildHistoryWeekStrip({
    ...base,
    sessionStartedAts: ["2026-11-18T10:00:00Z", "2026-11-04T10:00:00Z"],
    completedThisWeek: 0,
    weeklyTarget: 3,
  });
  assert.equal(strip.streakWeeks, 1);
  assert.equal(strip.label, "This week: 0 of 3 · streak 1 week");
});

test("no plan and no streak: just the count", () => {
  const strip = buildHistoryWeekStrip({ ...base, sessionStartedAts: ["2026-10-01T10:00:00Z"], completedThisWeek: 0, weeklyTarget: 0 });
  assert.equal(strip.label, "This week: 0 workouts");
});
