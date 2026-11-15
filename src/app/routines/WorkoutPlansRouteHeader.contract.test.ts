import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("days library route (/routines/workout-plans) keeps a tab ScreenHeader titled Days in the floating slot", () => {
  const pageSource = readFileSync(new URL("./workout-plans/page.tsx", import.meta.url), "utf8");
  const clientSource = readFileSync(new URL("./WorkoutPlansPageClient.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /floatingHeader=\{<ScreenHeader kind="tab" title="Days" \/>\}/);
  assert.doesNotMatch(pageSource, /RoutinesRouteHeaderCard|HeaderInfoRail/);
  assert.match(pageSource, /WorkoutPlansPageClient/);
  assert.doesNotMatch(clientSource, /RoutinesRouteHeaderCard/);
});
