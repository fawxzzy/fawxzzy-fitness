import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("days library route (/routines/workout-plans) is a detail ScreenHeader titled Days with Back to /routines and no tab bar", () => {
  const pageSource = readFileSync(new URL("./workout-plans/page.tsx", import.meta.url), "utf8");
  // The frame lives in DaysLibraryScreen so the route and its /dev/detail-screens fixture render the same header.
  const frameSource = readFileSync(new URL("./workout-plans/DaysLibraryScreen.tsx", import.meta.url), "utf8");
  const clientSource = readFileSync(new URL("./WorkoutPlansPageClient.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /<DaysLibraryScreen>/);
  assert.match(frameSource, /floatingHeader=\{\(\s*<ScreenHeader\s+kind="detail"\s+title="Days"/);
  assert.match(frameSource, /back=\{<ScreenHeaderBackButton href="\/routines"/);
  for (const source of [pageSource, frameSource]) {
    assert.doesNotMatch(source, /topChrome|AppNav|kind="tab"/);
    assert.doesNotMatch(source, /RoutinesRouteHeaderCard|HeaderInfoRail/);
  }
  assert.match(pageSource, /WorkoutPlansPageClient/);
  assert.doesNotMatch(clientSource, /RoutinesRouteHeaderCard/);
});
