import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("routine home keeps the route header in the server page floating slot", () => {
  const pageSource = readFileSync(new URL("./[id]/page.tsx", import.meta.url), "utf8");
  const clientSource = readFileSync(new URL("./RoutineHomeClient.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /floatingHeader=\{\(\s*<ScreenHeader\s+kind="detail"/);
  assert.doesNotMatch(pageSource, /RoutinesRouteHeaderCard|HeaderInfoRail|TopRightBackButton/);
  assert.doesNotMatch(clientSource, /createPortal/);
  assert.doesNotMatch(clientSource, /RoutinesRouteHeaderCard/);
});
