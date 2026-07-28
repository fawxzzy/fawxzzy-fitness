import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCEPTED_VISUAL_CATALOG_COUNTS,
  VISUAL_CAPTURE_ENVIRONMENT,
  VISUAL_FITNESS_STATE_REGISTRY,
  buildVisualCatalogCountDelta,
  buildVisualCatalogCoverage,
  computeVisualStateRegistryDigest,
  expandVisualCapturePlans,
  getVisualFitnessState,
  validateVisualStateRegistry,
} from "./visual-fitness-state-registry.mjs";

test("registry freezes the accepted semantic-state and raw-capture denominators", () => {
  const validation = validateVisualStateRegistry();
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.valid, true);
  assert.equal(validation.stateCount, ACCEPTED_VISUAL_CATALOG_COUNTS.semanticStates);
  assert.equal(validation.captureCount, ACCEPTED_VISUAL_CATALOG_COUNTS.rawCaptures);

  const coverage = buildVisualCatalogCoverage();
  assert.equal(coverage.semanticStates, 111);
  assert.equal(coverage.rawCaptures, 313);
  assert.equal(coverage.missingStates.length, 0);
  assert.equal(buildVisualCatalogCountDelta(coverage).reconciled, true);
});

test("registry owns the exact accepted family split", () => {
  const families = VISUAL_FITNESS_STATE_REGISTRY.reduce((counts, state) => {
    counts[state.family] = (counts[state.family] ?? 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(families, {
    "Exercise cards": 29,
    "Session / logging": 14,
    "Session summaries": 8,
    "Settings / detail": 9,
    "Public, legal, and install": 9,
    "Auth, loading, restore, and handoff": 11,
    "Curated onboarding": 31,
  });
});

test("every state declares route, auth, fixture, viewport, assertion, and output contracts", () => {
  for (const state of VISUAL_FITNESS_STATE_REGISTRY) {
    assert.match(state.id, /^[a-z-]+:[a-z0-9-]+$/);
    assert.ok(state.family);
    assert.ok(state.requestedRoute.startsWith("/"));
    assert.ok(["exact", "one-of", "pattern"].includes(state.expectedResolvedRoute.kind));
    assert.ok(state.authState);
    assert.ok(state.fixtureOwner);
    assert.ok(state.viewports.length > 0);
    assert.ok(state.captureModes.length > 0);
    assert.ok(state.assertions.length > 0);
    assert.match(state.expectedOutput, /\.png$/);
    assert.equal(state.sensitiveOutputPolicy, "sanitized-metadata-only");
  }
});

test("capture expansion is unique and preserves onboarding bottom captures", () => {
  const plans = expandVisualCapturePlans();
  assert.equal(new Set(plans.map((plan) => plan.captureId)).size, 313);
  assert.equal(new Set(plans.map((plan) => plan.outputFilename)).size, 313);
  assert.equal(plans.filter((plan) => plan.captureMode === "mobile-bottom").length, 31);
  assert.equal(plans.filter((plan) => plan.state.id.startsWith("signed-in:")).length, 180);
  assert.equal(plans.filter((plan) => plan.state.id.startsWith("public:")).length, 18);
  assert.equal(plans.filter((plan) => plan.state.id.startsWith("auth:")).length, 22);
  assert.equal(plans.filter((plan) => plan.state.id.startsWith("onboarding:")).length, 93);
});

test("smoke tier spans signed-in, public, auth, and onboarding families", () => {
  const plans = expandVisualCapturePlans(VISUAL_FITNESS_STATE_REGISTRY, { tier: "smoke" });
  assert.deepEqual(
    new Set(plans.map((plan) => plan.state.id.split(":")[0])),
    new Set(["signed-in", "public", "auth", "onboarding"]),
  );
});

test("curated fixtures are deterministic and scoped to the synthetic user", () => {
  const empty = getVisualFitnessState("onboarding:empty-intro");
  const handoff = getVisualFitnessState("onboarding:generation-handoff");
  assert.equal(
    empty?.setup?.key,
    "fawxzzy:curated-onboarding:v1:mobile-regression-curated-onboarding:state",
  );
  assert.deepEqual(empty?.setup?.value?.draft?.data?.intakeResponses, {});
  assert.equal(handoff?.setup?.value?.draft?.stepId, "generation-handoff");
  assert.equal(handoff?.setup?.value?.lifecycle?.intakeStatus, "completed");
  assert.equal(handoff?.setup?.value?.lifecycle?.generationStatus, "queued");
});

test("registry models intentional fixture selection and manual public auth routes", () => {
  assert.deepEqual(getVisualFitnessState("signed-in:session-logger-cardio-time")?.expectedResolvedRoute, {
    kind: "exact",
    value: "/dev/mobile-regression?scenario=session-logger-cardio-time&exerciseId=session-ex-5",
  });
  assert.deepEqual(getVisualFitnessState("signed-in:today-default")?.expectedResolvedRoute, {
    kind: "exact",
    value: "/dev/mobile-regression?scenario=today-default",
  });
  assert.deepEqual(getVisualFitnessState("signed-in:history-sessions-detailed")?.expectedResolvedRoute, {
    kind: "pattern",
    value: "^/dev/mobile-regression\\?scenario=history-sessions-detailed(?:&__fresh=[a-z0-9][a-z0-9._-]{0,63})?$",
  });
  assert.deepEqual(getVisualFitnessState("public:root")?.expectedResolvedRoute, {
    kind: "one-of",
    values: ["/entry", "/login?manual=1"],
  });
  assert.equal(getVisualFitnessState("public:login")?.requestedRoute, "/login?manual=1");
  assert.equal(getVisualFitnessState("onboarding:conditional-tracking-tool")?.assertions[0]?.value, "What do you use to track?");
  assert.equal(getVisualFitnessState("onboarding:conditional-full-safety")?.assertions[0]?.value, "What were you told to avoid?");
});

test("registry digest is stable and changes with semantic content", () => {
  const digest = computeVisualStateRegistryDigest();
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(digest, computeVisualStateRegistryDigest());
  assert.notEqual(
    digest,
    computeVisualStateRegistryDigest([
      ...VISUAL_FITNESS_STATE_REGISTRY.slice(0, -1),
      { ...VISUAL_FITNESS_STATE_REGISTRY.at(-1), notes: "changed" },
    ]),
  );
});

test("environment contract pins visual nondeterminism controls", () => {
  assert.deepEqual(VISUAL_CAPTURE_ENVIRONMENT, {
    browser: "chromium-or-edge",
    colorScheme: "dark",
    deviceScaleFactor: 1,
    locale: "en-US",
    reducedMotion: "reduce",
    timezoneId: "America/New_York",
    animations: "disabled-by-capture-style",
    fontPolicy: "repository-and-browser-pinned-fonts-only",
    baselinePlatform: "windows",
  });
});

test("validator rejects duplicate IDs, missing fixtures, and duplicate outputs", () => {
  const state = VISUAL_FITNESS_STATE_REGISTRY[0];
  const duplicate = { ...state };
  const missingFixture = { ...VISUAL_FITNESS_STATE_REGISTRY[1], fixtureOwner: "" };
  const validation = validateVisualStateRegistry([state, duplicate, missingFixture]);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes(`Duplicate state id: ${state.id}`)));
  assert.ok(validation.errors.some((error) => error.includes("fixtureOwner")));
  assert.ok(validation.errors.some((error) => error.includes("Duplicate output filename")));
});

test("count delta fails closed when coverage silently shrinks", () => {
  const coverage = buildVisualCatalogCoverage(VISUAL_FITNESS_STATE_REGISTRY.slice(1));
  const delta = buildVisualCatalogCountDelta(coverage);
  assert.equal(delta.reconciled, false);
  assert.ok(delta.delta.semanticStates < 0);
  assert.ok(delta.delta.rawCaptures < 0);
  assert.deepEqual(delta.explanations, []);
});
