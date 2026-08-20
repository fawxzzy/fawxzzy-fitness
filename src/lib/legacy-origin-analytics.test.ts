import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";
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

test("legacy origin analytics transport is explicitly credentialless", () => {
  const client = readFileSync(
    resolve(process.cwd(), "src/components/LegacyOriginAnalytics.tsx"),
    "utf8",
  );
  assert.match(client, /credentials:\s*["']omit["']/);
  assert.doesNotMatch(client, /sendBeacon/);
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
