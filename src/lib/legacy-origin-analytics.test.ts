import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFitnessLegacyOriginAnalyticsPayload,
  consumeFitnessLegacyOriginMarker,
} from "./legacy-origin-analytics";

test("legacy origin analytics uses a closed anonymous payload", () => {
  assert.deepEqual(buildFitnessLegacyOriginAnalyticsPayload(), {
    compatibility: "fitness_legacy_origin",
    event: "compatibility_visit",
    product: "fitness",
    route: "app",
  });
});

test("legacy origin marker is consumed once without disturbing other query state", () => {
  assert.deepEqual(
    consumeFitnessLegacyOriginMarker(
      "https://fitness.fawxzzy.com/history?tab=recent&compatibility=fitness_legacy_origin#top",
    ),
    { matched: true, replacement: "/history?tab=recent#top" },
  );
  assert.equal(
    consumeFitnessLegacyOriginMarker("https://fitness.fawxzzy.com/history?tab=recent").matched,
    false,
  );
});
