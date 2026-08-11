import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCurrentSessionHeaderInfoRailItems,
  buildRoutineWorkoutPlanEditorInfoRailItems,
} from "@/lib/header-info-rail";

test("buildCurrentSessionHeaderInfoRailItems reflects a completed session", () => {
  const [status] = buildCurrentSessionHeaderInfoRailItems({
    isCompleted: true,
    sessionExerciseCount: 4,
  });

  assert.deepEqual(status, {
    id: "live-session",
    label: "Session",
    value: "Completed",
    tone: "success",
    title: "Workout session is complete",
    valuePosition: "after",
  });
});

test("buildRoutineWorkoutPlanEditorInfoRailItems includes totals summary with auto progression count", () => {
  const items = buildRoutineWorkoutPlanEditorInfoRailItems({
    trainingDays: 3,
    restDays: 1,
    days: [
      {
        dayIndex: 1,
        isRest: false,
        isToday: true,
        isCompleted: false,
        isInSession: false,
        autoProgressionExerciseCount: 2,
        splitSummary: { total: 5 },
      },
      {
        dayIndex: 2,
        isRest: false,
        isToday: false,
        isCompleted: true,
        isInSession: false,
        autoProgressionExerciseCount: 1,
        splitSummary: { total: 3 },
      },
      {
        dayIndex: 3,
        isRest: false,
        isToday: false,
        isCompleted: false,
        isInSession: false,
        autoProgressionExerciseCount: 0,
        splitSummary: { total: 2 },
      },
      {
        dayIndex: 4,
        isRest: true,
        isToday: false,
        isCompleted: false,
        isInSession: false,
        autoProgressionExerciseCount: 0,
        splitSummary: { total: 0 },
      },
    ],
    maxItems: 8,
  });

  const totalsItem = items.find((item) => item.id === "totals");
  assert.ok(totalsItem);
  assert.equal(totalsItem?.value, "3 workout plans • 10 exercises • 3 auto");
});
