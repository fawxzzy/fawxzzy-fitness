import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("create day route (/routines/[id]/new-workout-plan) keeps a detail ScreenHeader in the floating slot", () => {
  const pageSource = readFileSync(new URL("./[id]/new-workout-plan/page.tsx", import.meta.url), "utf8");
  const clientSource = readFileSync(new URL("./CreateRoutineDayClient.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /floatingHeader=\{\(\s*<ScreenHeader\s+kind="detail"/);
  assert.match(pageSource, /"Create day"/);
  assert.match(pageSource, /"Copy a day"/);
  assert.doesNotMatch(pageSource, /RoutinesRouteHeaderCard|topChrome/);
  assert.doesNotMatch(clientSource, /createPortal/);
  assert.doesNotMatch(clientSource, /RoutinesRouteHeaderCard/);
});
