import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCurrentSessionHeaderInfoRailItems,
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
