import assert from "node:assert/strict";
import test from "node:test";
import { formatRoutineDayDisplayName, getRoutineDayEditableName } from "./routines.ts";

test("getRoutineDayEditableName strips a stored weekday prefix from custom names", () => {
  assert.equal(
    getRoutineDayEditableName({
      name: "Tue · Forge",
      dayIndex: 2,
      startDate: "2026-04-27",
    }),
    "Forge",
  );
});

test("formatRoutineDayDisplayName does not duplicate weekday when the stored name is already formatted", () => {
  assert.equal(
    formatRoutineDayDisplayName({
      name: "Tue · Forge",
      dayIndex: 2,
      startDate: "2026-04-27",
    }),
    "Tue · Forge",
  );
});
