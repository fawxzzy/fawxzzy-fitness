import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("create routine route reuses the routines surface and opens the chooser as a modal overlay", () => {
  const pageSource = readFileSync(new URL("./new/page.tsx", import.meta.url), "utf8");
  const clientSource = readFileSync(new URL("./CreateRoutineClient.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /RoutinesRouteHeaderCard/);
  assert.match(pageSource, /title="Routines"/);
  assert.match(pageSource, /RoutinesPageClient/);
  assert.match(clientSource, /createPortal/);
  assert.match(clientSource, /role="dialog"/);
  assert.match(clientSource, /TopRightBackButton/);
  assert.doesNotMatch(clientSource, /RoutinesRouteHeaderCard/);
  assert.doesNotMatch(clientSource, /BottomActionSplit/);
  assert.doesNotMatch(clientSource, /Continue Setup/);
  assert.doesNotMatch(clientSource, /Routine Setup/);
});
