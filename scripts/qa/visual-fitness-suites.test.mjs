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

test("session logger seam suites assert the session feedback fixture contract", () => {
  for (const suiteName of expectedSessionLoggerSeamSuites) {
    const suite = getVisualFitnessSuite(suiteName);
    assert.ok(suite?.interaction, `Expected ${suiteName} to include a session feedback interaction contract.`);
    assert.equal(suite?.interaction?.type, "session-feedback-fixture-contract");
    assert.match(suite?.interaction?.expectedLogButtonText ?? "", /^Log:/);
    assert.match(suite?.interaction?.expectedSummaryText ?? "", /\| Effort \d+\/10$/);
    assert.ok(
      (suite?.interaction?.expectedText ?? []).includes("Effort Feedback"),
      `Expected ${suiteName} to assert the Effort Feedback heading.`,
    );
    assert.ok(
      (suite?.interaction?.expectedText ?? []).includes("Effort Rating"),
      `Expected ${suiteName} to assert the Effort Rating heading.`,
    );
  }
});
