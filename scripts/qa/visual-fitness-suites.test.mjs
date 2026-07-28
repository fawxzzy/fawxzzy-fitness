import assert from "node:assert/strict";
import test from "node:test";

import { seamSuites } from "./visual-fitness-readiness.mjs";
import {
  getVisualFitnessSuite,
  listRegistryVisualFitnessSuites,
} from "./visual-fitness-suites.mjs";

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

test("history detail feedback-note seam stays on the deterministic note-proof fixture", () => {
  const suite = getVisualFitnessSuite("history-detail-feedback-note-seam");
  assert.ok(suite, "Expected history-detail-feedback-note-seam to exist in visual fitness suites.");
  assert.equal(suite?.proofLane, "seam");
  assert.equal(suite?.authRequired, false);
  assert.equal(suite?.route, "/dev/mobile-regression?scenario=history-detail-feedback-note");
  assert.equal(suite?.interaction?.type, "history-detail-note-contract");
  assert.ok(
    (suite?.interaction?.expectedText ?? []).includes("Stride felt sloppy once the incline ramped up."),
    "Expected the seam suite to assert the saved feedback note text.",
  );
});

test("history seam asserts the deterministic notes highlight contract", () => {
  const suite = getVisualFitnessSuite("history-seam");
  assert.ok(suite, "Expected history-seam to exist in visual fitness suites.");
  assert.equal(suite?.proofLane, "seam");
  assert.equal(suite?.authRequired, false);
  assert.equal(suite?.route, "/dev/mobile-regression?scenario=history-sessions-detailed");
  assert.equal(suite?.interaction?.type, "history-sessions-notes-contract");
  assert.ok(
    (suite?.interaction?.expectedText ?? []).includes("Notes"),
    "Expected the history seam to assert the Notes highlight option.",
  );
  assert.ok(
    (suite?.interaction?.expectedText ?? []).includes("No Set Data"),
    "Expected the history seam to assert neighboring highlight options for the same filter lane.",
  );
  assert.ok(
    (suite?.interaction?.expectedVisibleHrefSubstrings ?? []).includes("/dev/mobile-regression?scenario=history-detail-feedback-note"),
    "Expected the history seam to assert the note-bearing session card stays visible after filtering.",
  );
  assert.ok(
    (suite?.interaction?.expectedHiddenHrefSubstrings ?? []).includes("/dev/mobile-regression?scenario=history-detail-progression-expanded"),
    "Expected the history seam to assert non-note session cards disappear after filtering.",
  );
});

test("history drill-in seam asserts the deterministic list-to-detail handoff", () => {
  const suite = getVisualFitnessSuite("history-drill-in-seam");
  assert.ok(suite, "Expected history-drill-in-seam to exist in visual fitness suites.");
  assert.equal(suite?.proofLane, "seam");
  assert.equal(suite?.authRequired, false);
  assert.equal(suite?.route, "/dev/mobile-regression?scenario=history-sessions-detailed");
  assert.equal(suite?.interaction?.type, "history-sessions-drill-in-contract");
  assert.equal(suite?.interaction?.targetHref, "/dev/mobile-regression?scenario=history-detail-feedback-note");
  assert.ok(
    (suite?.interaction?.expectedText ?? []).includes("Stride felt sloppy once the incline ramped up."),
    "Expected the drill-in seam to assert the saved feedback note text on the landing detail screen.",
  );
});

test("protected history overview asserts the QA notes highlight contract", () => {
  const suite = getVisualFitnessSuite("history");
  assert.ok(suite, "Expected history to exist in visual fitness suites.");
  assert.equal(suite?.proofLane, "protected");
  assert.equal(suite?.authRequired, true);
  assert.equal(suite?.route, "/history");
  assert.equal(suite?.interaction?.type, "history-sessions-notes-contract");
  assert.ok(
    (suite?.interaction?.expectedText ?? []).includes("Notes"),
    "Expected protected history to assert the Notes highlight option.",
  );
  assert.ok(
    (suite?.interaction?.expectedVisibleHrefSubstrings ?? []).some((value) => value.includes("?returnTab=sessions")),
    "Expected protected history to assert at least one visible note-bearing session card after filtering.",
  );
});

test("protected history drill-in asserts the QA list-to-detail note path", () => {
  const suite = getVisualFitnessSuite("history-drill-in");
  assert.ok(suite, "Expected history-drill-in to exist in visual fitness suites.");
  assert.equal(suite?.proofLane, "protected");
  assert.equal(suite?.authRequired, true);
  assert.equal(suite?.route, "/history");
  assert.equal(suite?.interaction?.type, "history-sessions-drill-in-contract");
  assert.equal(suite?.interaction?.openExerciseName, "Walking Lunge");
  assert.ok(
    String(suite?.interaction?.targetHref ?? "").includes("?returnTab=sessions"),
    "Expected protected history drill-in to target a real session detail route.",
  );
  assert.ok(
    (suite?.interaction?.expectedText ?? []).includes("Stride felt sloppy once the incline ramped up."),
    "Expected protected history drill-in to assert the QA fallback note text after landing.",
  );
});

test("protected history detail asserts the QA copilot-note fallback", () => {
  const suite = getVisualFitnessSuite("history-detail");
  assert.ok(suite, "Expected history-detail to exist in visual fitness suites.");
  assert.equal(suite?.proofLane, "protected");
  assert.equal(suite?.authRequired, true);
  assert.equal(suite?.interaction?.type, "history-detail-note-contract");
  assert.equal(suite?.interaction?.openExerciseName, "Walking Lunge");
  assert.ok(
    (suite?.interaction?.expectedText ?? []).includes("Stride felt sloppy once the incline ramped up."),
    "Expected protected history detail to assert the QA fallback note text.",
  );
});

test("registry suite adapter expands the exact full and smoke denominators", () => {
  const full = listRegistryVisualFitnessSuites();
  const smoke = listRegistryVisualFitnessSuites({ tier: "smoke" });
  assert.equal(full.length, 313);
  assert.ok(smoke.length >= 4);
  assert.ok(smoke.length < full.length);
  assert.equal(new Set(full.map((suite) => suite.registry.captureId)).size, 313);
  assert.equal(new Set(full.map((suite) => suite.expectedOutputFilename)).size, 313);
});

test("registry suite adapter preserves requested and expected resolved routes separately", () => {
  const root = listRegistryVisualFitnessSuites({ stateId: "public:root" });
  assert.equal(root.length, 2);
  assert.equal(root[0]?.route, "/");
  assert.deepEqual(root[0]?.registry?.expectedResolvedRoute, {
    kind: "one-of",
    values: ["/", "/entry", "/login?manual=1"],
  });
  assert.equal(root[0]?.registry?.authState, "anonymous");
});

test("onboarding registry suites keep deterministic local-storage setup and bottom capture", () => {
  const suites = listRegistryVisualFitnessSuites({ stateId: "onboarding:empty-intro" });
  assert.equal(suites.length, 3);
  assert.deepEqual(
    suites.map((suite) => suite.registry.captureMode),
    ["viewport", "mobile-bottom", "viewport"],
  );
  assert.equal(suites[0]?.registry?.setup?.kind, "local-storage");
  assert.equal(suites[0]?.authRequired, false);
});
