import assert from "node:assert/strict";
import test from "node:test";

import { buildExerciseDisclosureContract } from "./exercise-disclosure.ts";

test("session disclosure contract keeps the shared toggle/panel ids stable", () => {
  const contract = buildExerciseDisclosureContract({
    itemId: "exercise-1",
    scope: "session-exercise",
  });

  assert.deepEqual(contract, {
    panelId: "session-exercise-panel-exercise-1",
    buttonTestId: "session-exercise-toggle-exercise-1",
    panelTestId: "session-exercise-panel-exercise-1",
  });
});

test("day-detail disclosure contract matches the edit-day shared scope", () => {
  const contract = buildExerciseDisclosureContract({
    itemId: "exercise-42",
    scope: "day-detail",
  });

  assert.deepEqual(contract, {
    panelId: "day-detail-panel-exercise-42",
    buttonTestId: "day-detail-toggle-exercise-42",
    panelTestId: "day-detail-panel-exercise-42",
  });
});
