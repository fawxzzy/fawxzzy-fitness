import test from "node:test";
import assert from "node:assert/strict";

import { resolveReplacementActiveRoutineId } from "./active-routine-fallback.ts";

test("resolveReplacementActiveRoutineId returns the first remaining routine id when a replacement exists", () => {
  const replacementId = resolveReplacementActiveRoutineId([
    { id: "routine-b" },
    { id: "routine-c" },
  ]);

  assert.equal(replacementId, "routine-b");
});

test("resolveReplacementActiveRoutineId returns null when no routines remain", () => {
  const replacementId = resolveReplacementActiveRoutineId([]);

  assert.equal(replacementId, null);
});
