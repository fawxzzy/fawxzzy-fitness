import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("create routine route uses the shared editor shell while the chooser remains a modal overlay", () => {
  const pageSource = readFileSync(new URL("./new/page.tsx", import.meta.url), "utf8");
  const clientSource = readFileSync(new URL("./CreateRoutineClient.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /RoutineDetailsScreenShell/);
  assert.match(pageSource, /title="New Routine"/);
  assert.match(pageSource, /NewRoutineDraftForm/);
  assert.match(pageSource, /RoutineHomeEditorClient/);
  assert.match(clientSource, /createPortal/);
  assert.match(clientSource, /role="dialog"/);
  assert.match(clientSource, /TopRightBackButton/);
  assert.match(clientSource, /Build manually/);
  assert.match(clientSource, /curatedMenuOption\.label/);
  assert.match(clientSource, /loadCuratedOnboardingGateState/);
  assert.doesNotMatch(clientSource, /RoutinesRouteHeaderCard/);
  assert.doesNotMatch(clientSource, /BottomActionSplit/);
  assert.doesNotMatch(clientSource, /Continue Setup/);
  assert.doesNotMatch(clientSource, /Routine Setup/);
});
