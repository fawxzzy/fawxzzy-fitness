import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sources = [
  new URL("../../app/history/HistorySessionsClient.tsx", import.meta.url),
  new URL("../../app/history/page.tsx", import.meta.url),
  new URL("../../app/dev/mobile-regression/DevMobileRegressionRoute.tsx", import.meta.url),
  new URL("../../lib/feature-flags.ts", import.meta.url),
];

test("History does not render or gate an empty premium analytics preview", async () => {
  const combinedSource = (await Promise.all(sources.map((source) => readFile(source, "utf8")))).join("\n");
  const removedComponent = new URL("./PremiumCycleAnalyticsPreview.tsx", import.meta.url);

  assert.equal(existsSync(removedComponent), false);
  assert.doesNotMatch(combinedSource, /PremiumCycleAnalyticsPreview/);
  assert.doesNotMatch(combinedSource, /premiumCycleAnalyticsPreview/);
  assert.doesNotMatch(combinedSource, /Locked Pro preview/);
});
