import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("workout plans route keeps the routines header in the server page floating slot", () => {
  const pageSource = readFileSync(new URL("./workout-plans/page.tsx", import.meta.url), "utf8");
  const clientSource = readFileSync(new URL("./WorkoutPlansPageClient.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /RoutinesRouteHeaderCard/);
  assert.match(pageSource, /title="Routines"/);
  assert.match(pageSource, /WorkoutPlansPageClient/);
  assert.doesNotMatch(clientSource, /RoutinesRouteHeaderCard/);
});
