import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("create day route (/routines/[id]/new-workout-plan) keeps a detail ScreenHeader in the floating slot", () => {
  const pageSource = readFileSync(new URL("./[id]/new-workout-plan/page.tsx", import.meta.url), "utf8");
  // The frame lives in CreateDayScreen so the route and its /dev/detail-screens fixture render the same header.
  const frameSource = readFileSync(new URL("./[id]/new-workout-plan/CreateDayScreen.tsx", import.meta.url), "utf8");
  const clientSource = readFileSync(new URL("./CreateRoutineDayClient.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /<CreateDayScreen\b/);
  assert.match(frameSource, /floatingHeader=\{\(\s*<ScreenHeader\s+kind="detail"/);
  assert.match(frameSource, /"Create day"/);
  assert.match(frameSource, /"Copy a day"/);
  assert.match(frameSource, /back=\{<ScreenHeaderBackButton href=\{backHref\} \/>\}/);
  for (const source of [pageSource, frameSource]) {
    assert.doesNotMatch(source, /RoutinesRouteHeaderCard|topChrome|kind="tab"/);
  }
  assert.doesNotMatch(clientSource, /createPortal/);
  assert.doesNotMatch(clientSource, /RoutinesRouteHeaderCard/);
});
