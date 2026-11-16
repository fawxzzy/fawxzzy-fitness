import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("days library route (/routines/workout-plans) is a detail ScreenHeader titled Days with Back to /routines and no tab bar", () => {
  const pageSource = readFileSync(new URL("./workout-plans/page.tsx", import.meta.url), "utf8");
  const clientSource = readFileSync(new URL("./WorkoutPlansPageClient.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /floatingHeader=\{\(\s*<ScreenHeader\s+kind="detail"\s+title="Days"/);
  assert.match(pageSource, /back=\{<ScreenHeaderBackButton href="\/routines"/);
  assert.doesNotMatch(pageSource, /topChrome|AppNav|kind="tab"/);
  assert.doesNotMatch(pageSource, /RoutinesRouteHeaderCard|HeaderInfoRail/);
  assert.match(pageSource, /WorkoutPlansPageClient/);
  assert.doesNotMatch(clientSource, /RoutinesRouteHeaderCard/);
});
