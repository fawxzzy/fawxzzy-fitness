import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("create workout plan flow keeps blank and duplicate setup plus cycle-settings guidance", () => {
  const source = readFileSync(new URL("./CreateRoutineDayClient.tsx", import.meta.url), "utf8");

  assert.match(source, /Blank day/);
  assert.match(source, /Duplicate day/);
  assert.match(source, /Choose Day/);
  assert.match(source, /Manage cycle settings/);
  assert.match(source, /targetRoutineDayId/);
  assert.match(source, /router\.push\(isTargetMode/);
});
