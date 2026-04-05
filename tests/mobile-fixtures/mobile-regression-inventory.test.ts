import assert from "node:assert/strict";
import test from "node:test";

import { mobileRegressionScenarios } from "../../src/lib/dev/mobileRegressionFixtures.ts";

test("fixture inventory covers all mobile screens from the pre-fix set", () => {
  const byRoute = new Map<string, number>();
  for (const scenario of mobileRegressionScenarios) {
    byRoute.set(scenario.route, (byRoute.get(scenario.route) ?? 0) + 1);
  }

  assert.equal(byRoute.get("today"), 2);
  assert.equal(byRoute.get("session"), 1);
  assert.equal(byRoute.get("routines"), 2);
  assert.equal(byRoute.get("viewDay"), 1);
  assert.equal(byRoute.get("editDay"), 5);
  assert.equal(byRoute.get("createRoutine"), 1);
  assert.equal(byRoute.get("editRoutine"), 1);
  assert.equal(byRoute.get("addExercise"), 1);
});

test("major mobile routes declare floatingHeader usage", () => {
  const byRoute = new Map<string, boolean[]>();
  for (const scenario of mobileRegressionScenarios) {
    const existing = byRoute.get(scenario.route) ?? [];
    existing.push(scenario.usesFloatingHeader);
    byRoute.set(scenario.route, existing);
  }

  for (const [route, usesFloatingHeaderValues] of byRoute.entries()) {
    assert.equal(
      usesFloatingHeaderValues.every(Boolean),
      true,
      `${route}: one or more scenarios do not use floatingHeader`,
    );
  }
});
