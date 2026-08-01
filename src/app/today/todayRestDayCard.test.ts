import assert from "node:assert/strict";
import test from "node:test";

import { shouldRenderTodayRestDayCard } from "./todayRestDayCard.ts";

test("shouldRenderTodayRestDayCard renders the deliberate card for an empty rest day", () => {
  assert.equal(shouldRenderTodayRestDayCard({ exerciseCount: 0, isRestDay: true }), true);
});

test("shouldRenderTodayRestDayCard does not render for a non-rest empty day (generic empty state stays generic)", () => {
  assert.equal(shouldRenderTodayRestDayCard({ exerciseCount: 0, isRestDay: false }), false);
  assert.equal(shouldRenderTodayRestDayCard({ exerciseCount: 0 }), false);
});

test("shouldRenderTodayRestDayCard never renders when exercises are present, even if isRestDay is (incorrectly) true", () => {
  assert.equal(shouldRenderTodayRestDayCard({ exerciseCount: 1, isRestDay: true }), false);
});

test("shouldRenderTodayRestDayCard is a pure function returning the same result for identical input (idempotent across re-renders/reloads)", () => {
  const input = { exerciseCount: 0, isRestDay: true };
  assert.equal(shouldRenderTodayRestDayCard(input), shouldRenderTodayRestDayCard({ ...input }));
});
