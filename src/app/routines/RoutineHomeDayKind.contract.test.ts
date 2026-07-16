import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("routine home cycles day status and excludes optional days from missed-plan state", () => {
  const pageSource = readFileSync(new URL("./[id]/page.tsx", import.meta.url), "utf8");
  const clientSource = readFileSync(new URL("./RoutineHomeClient.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /loadRoutineDaysWithWorkoutPlanCompat/);
  assert.match(pageSource, /&& !day\.is_optional/);
  assert.match(clientSource, /getNextRoutineDayKind/);
  assert.match(clientSource, /formData\.set\("isOptional", "on"\)/);
  assert.match(clientSource, /RoutineDayKindCycleAction/);
  assert.match(clientSource, /isOptional: displayIsOptional/);
});
