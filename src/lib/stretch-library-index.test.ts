import test from "node:test";
import assert from "node:assert/strict";
import { getStretchHubMetaItems } from "@/lib/stretch-library";
import { STRETCH_LIBRARY_DETAILS, getStretchReferenceDetailById } from "@/lib/stretch-library-details";
import { STRETCH_LIBRARY_FILTERS, STRETCH_LIBRARY_SEARCH_INDEX, queryStretchLibrary } from "@/lib/stretch-library-index";
import { STRETCH_LIBRARY_SUMMARIES } from "@/lib/stretch-library-summaries";

test("stretch summaries stay aligned with the full stretch codex", () => {
  assert.equal(STRETCH_LIBRARY_SUMMARIES.length, STRETCH_LIBRARY_DETAILS.length);
  assert.equal(STRETCH_LIBRARY_SEARCH_INDEX.length, STRETCH_LIBRARY_SUMMARIES.length);
  assert.deepEqual(getStretchHubMetaItems(), ["Mobility", "Recovery", "Bodyweight"]);
});

test("stretch filters can target lateral hip coverage", () => {
  const hipsResults = queryStretchLibrary({ filterId: "hips" });
  assert.ok(hipsResults.some((stretch) => stretch.id === "standing-tfl-crossover-stretch"));
});

test("stretch search indexes the coaching and guidance copy", () => {
  const deskResults = queryStretchLibrary({ query: "desk posture reset" });
  assert.ok(deskResults.some((stretch) => stretch.id === "doorway-pec-stretch"));
});

test("stretch search matches tokenized multi-word queries", () => {
  const results = queryStretchLibrary({ filterId: "calves", query: "ankle mobility" });
  assert.ok(results.some((stretch) => stretch.id === "ankle-inversion-eversion-mobility"));
});

test("stretch hub still includes hamstring and hip flexor mobility inside the library", () => {
  const hamstringResults = queryStretchLibrary({ query: "hamstring stretch" });
  const hipFlexorResults = queryStretchLibrary({ query: "hip flexor stretch" });

  assert.ok(hamstringResults.some((stretch) => stretch.id === "sprinter-hamstring-stretch"));
  assert.ok(hipFlexorResults.some((stretch) => stretch.id === "half-kneeling-hip-flexor-stretch"));
});

test("stretch details can be resolved lazily by id", () => {
  const stretch = getStretchReferenceDetailById("wall-serratus-reach-stretch");
  assert.ok(stretch);
  assert.match(stretch?.coachingCue ?? "", /ribcage/i);
});

test("stretch filter ids stay stable for UI rails", () => {
  assert.deepEqual(
    STRETCH_LIBRARY_FILTERS.map((filter) => filter.id),
    ["all", "hips", "glutes", "hamstrings", "adductors", "quads", "calves", "chest", "shoulders", "upper-back", "neck", "forearms"],
  );
});
