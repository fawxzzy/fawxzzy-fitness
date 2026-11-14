import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("create workout plan route keeps the header in the server page floating slot", () => {
  const pageSource = readFileSync(new URL("./[id]/new-workout-plan/page.tsx", import.meta.url), "utf8");
  const clientSource = readFileSync(new URL("./CreateRoutineDayClient.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /RoutinesRouteHeaderCard/);
  assert.match(pageSource, /"Create Day"/);
  assert.match(pageSource, /"Choose Day"/);
  assert.doesNotMatch(clientSource, /createPortal/);
  assert.doesNotMatch(clientSource, /RoutinesRouteHeaderCard/);
});
