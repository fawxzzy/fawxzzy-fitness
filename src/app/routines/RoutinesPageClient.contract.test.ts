import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("RoutinesPageClient keeps /routines as the browse list screen", () => {
  const source = readFileSync(new URL("./RoutinesPageClient.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /RoutineHomeClient/);
  assert.doesNotMatch(source, /activeRoutineId/);
  assert.doesNotMatch(source, /RoutinesRouteHeaderCard/);
  assert.doesNotMatch(source, /createPortal/);
  assert.match(source, /New Routine/);
});
