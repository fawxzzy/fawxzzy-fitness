import assert from "node:assert/strict";
import test from "node:test";

import { isKnownLegacyExerciseId, resolveCanonicalExerciseId } from "./exercise-id-aliases";

const KNOWN_LEGACY_ALIAS_ID = "66666666-6666-6666-6666-666666666666";
const KNOWN_LEGACY_ALIAS_CANONICAL_ID = "2466d550-004f-4b94-af04-26ae24f990b3";
const SECOND_LEGACY_ALIAS_ID = "de1f9f53-120f-4f4e-88b4-bd30f6ce1240";
const KNOWN_CATALOG_ID = "11111111-1111-1111-1111-111111111111";
const UNKNOWN_ID = "00000000-0000-0000-0000-000000000000";

test("resolveCanonicalExerciseId maps a known legacy alias to its canonical id", () => {
  assert.equal(resolveCanonicalExerciseId(KNOWN_LEGACY_ALIAS_ID), KNOWN_LEGACY_ALIAS_CANONICAL_ID);
});

test("resolveCanonicalExerciseId maps the second known legacy alias to the same canonical id", () => {
  assert.equal(resolveCanonicalExerciseId(SECOND_LEGACY_ALIAS_ID), KNOWN_LEGACY_ALIAS_CANONICAL_ID);
});

test("resolveCanonicalExerciseId returns a non-aliased id unchanged", () => {
  assert.equal(resolveCanonicalExerciseId(KNOWN_CATALOG_ID), KNOWN_CATALOG_ID);
});

test("resolveCanonicalExerciseId returns an unknown id unchanged", () => {
  assert.equal(resolveCanonicalExerciseId(UNKNOWN_ID), UNKNOWN_ID);
});

test("resolveCanonicalExerciseId trims surrounding whitespace before resolving an alias", () => {
  assert.equal(resolveCanonicalExerciseId(`  ${KNOWN_LEGACY_ALIAS_ID}\n`), KNOWN_LEGACY_ALIAS_CANONICAL_ID);
});

test("resolveCanonicalExerciseId trims surrounding whitespace on a non-aliased id", () => {
  assert.equal(resolveCanonicalExerciseId(`  ${KNOWN_CATALOG_ID}\t`), KNOWN_CATALOG_ID);
});

test("resolveCanonicalExerciseId returns an empty string unchanged", () => {
  assert.equal(resolveCanonicalExerciseId(""), "");
});

test("isKnownLegacyExerciseId is true for a known legacy alias id", () => {
  assert.equal(isKnownLegacyExerciseId(KNOWN_LEGACY_ALIAS_ID), true);
});

test("isKnownLegacyExerciseId is true for a known live catalog id", () => {
  assert.equal(isKnownLegacyExerciseId(KNOWN_CATALOG_ID), true);
});

test("isKnownLegacyExerciseId is false for an unknown id", () => {
  assert.equal(isKnownLegacyExerciseId(UNKNOWN_ID), false);
});

test("isKnownLegacyExerciseId is false for the canonical id a legacy alias resolves to, when that id is not itself in the catalog or alias table", () => {
  // KNOWN_LEGACY_ALIAS_CANONICAL_ID is only ever referenced as an alias *target*,
  // not as a key in LEGACY_EXERCISE_ID_ALIASES or as an EXERCISE_OPTIONS entry in
  // this test's fixture assumptions -- guard against the alias table's target ever
  // silently being treated as "known" purely because it's an alias value.
  assert.equal(isKnownLegacyExerciseId(KNOWN_LEGACY_ALIAS_CANONICAL_ID), false);
});

test("isKnownLegacyExerciseId trims surrounding whitespace before checking", () => {
  assert.equal(isKnownLegacyExerciseId(`  ${KNOWN_LEGACY_ALIAS_ID}  `), true);
});
