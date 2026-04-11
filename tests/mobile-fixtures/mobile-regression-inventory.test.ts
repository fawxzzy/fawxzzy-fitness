import assert from "node:assert/strict";
import test from "node:test";

import { mobileRegressionScenarios } from "../../src/lib/dev/mobileRegressionFixtures.ts";

test("fixture inventory covers all mobile screens from the pre-fix set", () => {
  const byRoute = new Map<string, number>();
  for (const scenario of mobileRegressionScenarios) {
    byRoute.set(scenario.route, (byRoute.get(scenario.route) ?? 0) + 1);
  }

  assert.equal(byRoute.get("today"), 4);
  assert.equal(byRoute.get("session"), 1);
  assert.equal(byRoute.get("routines"), 2);
  assert.equal(byRoute.get("viewDay"), 3);
  assert.equal(byRoute.get("editDay"), 7);
  assert.equal(byRoute.get("createRoutine"), 1);
  assert.equal(byRoute.get("editRoutine"), 1);
  assert.equal(byRoute.get("addExercise"), 1);
  assert.equal(byRoute.get("historySessions"), 1);
  assert.equal(byRoute.get("historyExercises"), 2);
  assert.equal(byRoute.get("historyDetail"), 1);
  assert.equal(byRoute.get("settings"), 1);
  assert.equal(byRoute.get("exerciseDetail"), 2);
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

test("hardening fixtures keep long Exercise Info scroll and day-card parity coverage in the matrix", () => {
  const longExerciseInfo = mobileRegressionScenarios.find((scenario) => scenario.id === "exercise-detail-long-scroll");
  assert.ok(longExerciseInfo);
  assert.equal(longExerciseInfo.route, "exerciseDetail");
  assert.equal(longExerciseInfo.captureScrollPosition, "bottom");

  const dayCardParity = mobileRegressionScenarios.find((scenario) => scenario.id === "edit-day-card-parity");
  assert.ok(dayCardParity);
  assert.equal(dayCardParity.route, "editDay");
  assert.deepEqual(dayCardParity.cardParityModes, ["view", "edit", "reorder"]);

  const historyExerciseDetail = mobileRegressionScenarios.find((scenario) => scenario.id === "history-exercises-detailed");
  assert.ok(historyExerciseDetail);
  assert.equal(historyExerciseDetail.route, "historyExercises");
  assert.deepEqual(historyExerciseDetail.detailedMode, { extraMetricCount: 3, analyticsSlotsReady: true });
});
