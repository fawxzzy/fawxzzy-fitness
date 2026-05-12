import test from "node:test";
import assert from "node:assert/strict";

import {
  isFeatureEnabled,
  listFeatureFlagDiagnostics,
  parseFeatureFlagValue,
  resolveFeatureFlag,
  resolveFeatureFlagByName,
} from "./feature-flags.ts";

test("feature flag parsing accepts explicit true and false values", () => {
  assert.equal(parseFeatureFlagValue("1"), true);
  assert.equal(parseFeatureFlagValue("true"), true);
  assert.equal(parseFeatureFlagValue("on"), true);
  assert.equal(parseFeatureFlagValue("0"), false);
  assert.equal(parseFeatureFlagValue("false"), false);
  assert.equal(parseFeatureFlagValue("off"), false);
  assert.equal(parseFeatureFlagValue("maybe"), null);
  assert.equal(parseFeatureFlagValue(undefined), null);
});

test("feature flags resolve defaults when env is missing or invalid", () => {
  const missing = resolveFeatureFlag("progressionUpdatesSurface", {});
  const invalid = resolveFeatureFlag("progressionUpdatesSurface", {
    FITNESS_FLAG_PROGRESSION_UPDATES_SURFACE: "maybe",
  });

  assert.equal(missing.value, true);
  assert.equal(missing.source, "default");
  assert.equal(invalid.value, true);
  assert.equal(invalid.source, "default");
});

test("feature flags use env override values when present", () => {
  assert.equal(isFeatureEnabled("progressionUpdatesSurface", {
    FITNESS_FLAG_PROGRESSION_UPDATES_SURFACE: "off",
  }), false);
  assert.equal(isFeatureEnabled("shareableRecapArtifacts", {
    FITNESS_FLAG_SHAREABLE_RECAP_ARTIFACTS: "yes",
  }), true);
});

test("feature flag diagnostics expose value source without secrets", () => {
  const diagnostics = listFeatureFlagDiagnostics({
    FITNESS_FLAG_SHAREABLE_RECAP_ARTIFACTS: "1",
  });
  const recap = diagnostics.find((flag) => flag.name === "shareableRecapArtifacts");

  assert.ok(recap);
  assert.equal(recap.value, true);
  assert.equal(recap.source, "env");
  assert.equal(recap.rawValue, "1");
  assert.ok(recap.description.length > 0);
});

test("unknown feature flag names are safe", () => {
  assert.equal(resolveFeatureFlagByName("not_a_flag"), null);
});
