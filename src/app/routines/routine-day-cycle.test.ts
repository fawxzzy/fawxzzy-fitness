import assert from "node:assert/strict";
import test from "node:test";
import { getWeekBasedExtraDayNotice } from "./routine-day-cycle";

test("week-based routine with a full week explains what an 8th day does", () => {
  const notice = getWeekBasedExtraDayNotice({ scheduleMode: "weekday_anchored", dayCount: 7 });
  assert.ok(notice);
  assert.equal(notice.title, "Day 8 makes the cycle 8 days long");
  assert.match(notice.body, /different weekday/);
  assert.match(notice.body, /14 days/);
});

test("a missing schedule mode counts as week-based", () => {
  assert.ok(getWeekBasedExtraDayNotice({ scheduleMode: null, dayCount: 9 }));
});

test("no notice for day-based routines, short weeks, or a day that completes whole weeks", () => {
  assert.equal(getWeekBasedExtraDayNotice({ scheduleMode: "rolling_n_day", dayCount: 7 }), null);
  assert.equal(getWeekBasedExtraDayNotice({ scheduleMode: "weekday_anchored", dayCount: 5 }), null);
  assert.equal(getWeekBasedExtraDayNotice({ scheduleMode: "weekday_anchored", dayCount: 13 }), null);
});
