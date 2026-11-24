import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("create routine route uses the shared editor shell while the chooser is the shared Sheet", () => {
  const pageSource = readFileSync(new URL("./new/page.tsx", import.meta.url), "utf8");
  const clientSource = readFileSync(new URL("./CreateRoutineClient.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /RoutineDetailsScreenShell/);
  assert.match(pageSource, /title="New routine"/);
  assert.match(pageSource, /NewRoutineDraftForm/);
  assert.match(pageSource, /RoutineHomeEditorClient/);
  // The chooser is the shared Sheet (design foundation): dialog role, focus trap, Escape and Close come from Sheet.tsx.
  assert.match(clientSource, /<Sheet open title="New routine" onClose=\{handleClose\}/);
  assert.doesNotMatch(clientSource, /createPortal/);
  assert.doesNotMatch(clientSource, /rgba\(7,17,27/);
  assert.doesNotMatch(clientSource, /TopRightBackButton/);
  assert.match(clientSource, /Build manually/);
  assert.match(clientSource, /curatedMenuOption\.label/);
  assert.match(clientSource, /loadCuratedOnboardingGateState/);
  assert.doesNotMatch(clientSource, /RoutinesRouteHeaderCard/);
  assert.doesNotMatch(clientSource, /BottomActionSplit/);
  assert.doesNotMatch(clientSource, /Continue Setup/);
  assert.doesNotMatch(clientSource, /Routine Setup/);
});
