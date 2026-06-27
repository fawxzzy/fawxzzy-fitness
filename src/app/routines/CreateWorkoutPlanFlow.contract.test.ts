import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("create workout plan flow keeps blank and duplicate setup plus cycle-settings guidance", () => {
  const source = readFileSync(new URL("./CreateRoutineDayClient.tsx", import.meta.url), "utf8");

  assert.match(source, /Blank workout plan/);
  assert.match(source, /Duplicate workout plan/);
  assert.match(source, /Choose Workout Plan/);
  assert.match(source, /Manage cycle settings/);
  assert.match(source, /targetRoutineDayId/);
  assert.match(source, /router\.push\(isTargetMode/);
});
