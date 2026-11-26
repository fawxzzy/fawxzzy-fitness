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

test("weeks follow the user's timezone: a Sunday-night workout in Los Angeles belongs to that week, not Monday's (UTC)", () => {
  // 2026-11-23T05:00Z is Sun Nov 22, 9 pm in Los Angeles (week of Nov 16) but Mon Nov 23 in UTC (this week).
  const sessionStartedAts = ["2026-11-23T05:00:00Z", "2026-11-10T12:00:00Z"];
  const la = buildHistoryWeekStrip({ timezone: "America/Los_Angeles", currentWeekStart: "2026-11-23", sessionStartedAts, completedThisWeek: 0, weeklyTarget: 3 });
  // Los Angeles: weeks of Nov 16 and Nov 9, both in a row before the empty current week.
  assert.equal(la.streakWeeks, 2);
  assert.equal(la.label, "This week: 0 of 3 · streak 2 weeks");
  // UTC reads the same instants as this week and Nov 9, with a gap at Nov 16.
  const utc = buildHistoryWeekStrip({ timezone: "UTC", currentWeekStart: "2026-11-23", sessionStartedAts, completedThisWeek: 1, weeklyTarget: 3 });
  assert.equal(utc.streakWeeks, 1);
});
