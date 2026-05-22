import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Group by row exposes a clear affordance and uses the shared ordering helper", () => {
  const source = readFileSync(new URL("./ExerciseTagFilterControl.tsx", import.meta.url), "utf8");

  assert.match(source, /orderGroupByOptions/);
  assert.match(source, /showGroupByClearButton/);
  assert.match(source, /setSelectedGroupKey\(clearGroupBySelection\(\)\)/);
});
