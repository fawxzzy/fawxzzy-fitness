import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveDuplicatedRoutineDayName,
  resolveRoutineDayCreationOverrides,
  shouldApplyRoutineDayCreationOverrides,
} from "./routine-day-creation.ts";

test("resolveDuplicatedRoutineDayName remaps default names to the destination cycle slot", () => {
  assert.equal(resolveDuplicatedRoutineDayName({
    sourceDayName: "1",
    sourceDayIndex: 1,
    sourceRoutineStartDate: "2026-06-15",
    destinationDayIndex: 4,
  }), "4");
});

test("resolveDuplicatedRoutineDayName preserves custom names", () => {
  assert.equal(resolveDuplicatedRoutineDayName({
    sourceDayName: "Upper Power",
    sourceDayIndex: 1,
    sourceRoutineStartDate: "2026-06-15",
    destinationDayIndex: 4,
  }), "Upper Power");
});

test("resolveRoutineDayCreationOverrides keeps duplicate rest state when only the name changes", () => {
  assert.deepEqual(resolveRoutineDayCreationOverrides({
    creationMode: "duplicate",
    requestedName: "Copied Push",
    blankModeIsRest: false,
    createdDay: {
      day_index: 3,
      is_rest: true,
      name: "3",
    },
  }), {
    shouldUpdate: true,
    nextName: "Copied Push",
    nextIsRest: true,
  });
});

test("resolveRoutineDayCreationOverrides can turn a blank creation into a rest plan", () => {
  assert.deepEqual(resolveRoutineDayCreationOverrides({
    creationMode: "blank",
    requestedName: "",
    blankModeIsRest: true,
    createdDay: {
      day_index: 5,
      is_rest: false,
      name: "5",
    },
  }), {
    shouldUpdate: true,
    nextName: "5",
    nextIsRest: true,
  });
});

test("resolveRoutineDayCreationOverrides skips writes when no blank or duplicate overrides were requested", () => {
  assert.deepEqual(resolveRoutineDayCreationOverrides({
    creationMode: "blank",
    requestedName: "",
    blankModeIsRest: false,
    createdDay: {
      day_index: 2,
      is_rest: false,
      name: "2",
    },
  }), {
    shouldUpdate: false,
    nextName: "2",
    nextIsRest: false,
  });
});

test("shouldApplyRoutineDayCreationOverrides only flags explicit blank or duplicate overrides", () => {
  assert.equal(shouldApplyRoutineDayCreationOverrides({
    creationMode: "blank",
    requestedName: "",
    blankModeIsRest: false,
  }), false);
  assert.equal(shouldApplyRoutineDayCreationOverrides({
    creationMode: "blank",
    requestedName: "",
    blankModeIsRest: true,
  }), true);
  assert.equal(shouldApplyRoutineDayCreationOverrides({
    creationMode: "duplicate",
    requestedName: "Copied Pull",
    blankModeIsRest: false,
  }), true);
});

test("resolveDuplicatedRoutineDayName keeps the position-matching rule that decides what the duplicate action persists", () => {
  // A stored "7" at position 6 is NOT remapped on the server: only a name equal to its own position or weekday is.
  assert.equal(resolveDuplicatedRoutineDayName({
    sourceDayName: "7",
    sourceDayIndex: 6,
    sourceRoutineStartDate: "2026-06-15",
    destinationDayIndex: 4,
  }), "7");
  for (const sourceDayName of ["3", "Tue", "Day 9"]) {
    assert.equal(resolveDuplicatedRoutineDayName({
      sourceDayName,
      sourceDayIndex: 6,
      sourceRoutineStartDate: "2026-06-15",
      destinationDayIndex: 4,
    }), sourceDayName);
  }
  // Own-position placeholders still remap.
  assert.equal(resolveDuplicatedRoutineDayName({
    sourceDayName: "Day 6",
    sourceDayIndex: 6,
    sourceRoutineStartDate: "2026-06-15",
    destinationDayIndex: 4,
  }), "4");
});
