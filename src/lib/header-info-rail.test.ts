import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRoutineBrowseInfoRailItems,
  buildRoutineTrainingRestInfoRailItems,
} from "@/lib/header-info-rail";

test("routine training/rest rail items keep stable routine-level ordering", () => {
  assert.deepEqual(buildRoutineTrainingRestInfoRailItems({
    trainingDays: 5,
    restDays: 2,
  }), [
    {
      id: "training-days",
      label: "training",
      value: 5,
      tone: "accent",
      title: "Training days in this routine cycle",
    },
    {
      id: "rest-days",
      label: "rest",
      value: 2,
      tone: "muted",
      title: "Rest days in this routine cycle",
    },
  ]);
});

test("routine training/rest rail items do not depend on taxonomy totals", () => {
  const items = buildRoutineTrainingRestInfoRailItems({
    trainingDays: 5,
    restDays: 2,
  });

  assert.equal(items.map((item) => `${item.value} ${item.label}`).join(" | "), "5 training | 2 rest");
});

test("browse rail items render the active routine first when present", () => {
  assert.deepEqual(buildRoutineBrowseInfoRailItems({
    activeRoutineName: "Pull Day",
    routineCount: 3,
  }), [
    {
      id: "active-routine",
      label: "Active",
      value: "Pull Day",
      tone: "accent",
      title: "Current active routine",
      valuePosition: "after",
    },
    {
      id: "routine-count",
      label: "routines total",
      value: 3,
      tone: "default",
      title: "Total available routines",
    },
  ]);
});

test("browse rail items still render routine totals when no active routine is selected", () => {
  assert.deepEqual(buildRoutineBrowseInfoRailItems({
    activeRoutineName: null,
    routineCount: 1,
  }), [
    {
      id: "routine-count",
      label: "routine total",
      value: 1,
      tone: "default",
      title: "Total available routines",
    },
  ]);
});
