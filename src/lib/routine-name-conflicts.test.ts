import assert from "node:assert/strict";
import test from "node:test";

import { hasRoutineNameConflict } from "./routine-name-conflicts.ts";

test("hasRoutineNameConflict ignores empty candidates", () => {
  assert.equal(hasRoutineNameConflict({
    candidateName: "   ",
    routineNames: ["Push"],
  }), false);
});

test("hasRoutineNameConflict matches existing routine names case-insensitively", () => {
  assert.equal(hasRoutineNameConflict({
    candidateName: " push ",
    routineNames: ["Push"],
  }), true);
});

test("hasRoutineNameConflict checks future template names too", () => {
  assert.equal(hasRoutineNameConflict({
    candidateName: "Upper A",
    routineNames: ["Push"],
    templateNames: ["Upper A"],
  }), true);
});
