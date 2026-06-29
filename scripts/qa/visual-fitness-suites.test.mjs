import assert from "node:assert/strict";
import test from "node:test";

import { seamSuites } from "./visual-fitness-readiness.mjs";
import { getVisualFitnessSuite } from "./visual-fitness-suites.mjs";

const expectedSessionLoggerSeamSuites = [
  "session-seam",
  "session-seam-strength-weight",
  "session-seam-bodyweight-reps",
  "session-seam-cardio-time",
  "session-seam-cardio-distance",
  "session-seam-calories",
];

test("session logger seam suites stay registered in readiness", () => {
  for (const suiteName of expectedSessionLoggerSeamSuites) {
    assert.ok(
      seamSuites.includes(suiteName),
      `Expected readiness seam suites to include ${suiteName}.`,
    );
  }
});

test("session logger seam suites keep deterministic mobile-regression routes", () => {
  for (const suiteName of expectedSessionLoggerSeamSuites) {
    const suite = getVisualFitnessSuite(suiteName);
    assert.ok(suite, `Expected ${suiteName} to exist in visual fitness suites.`);
    assert.equal(suite?.proofLane, "seam");
    assert.equal(suite?.authRequired, false);
    assert.match(suite?.route ?? "", /^\/dev\/mobile-regression\?screen=session&fixture=logger-/);
    assert.match(suite?.stateLabel ?? "", /^seam-session-feedback-logger-/);
    assert.ok(
      suite?.setupRequirements?.includes("deterministic-dev-mobile-regression-fixture"),
      `Expected ${suiteName} to keep deterministic fixture setup requirements.`,
    );
  }
});
