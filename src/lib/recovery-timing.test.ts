import assert from "node:assert/strict";
import test from "node:test";
import { buildRecoveryTimingInsight } from "./recovery-timing.ts";

test("recovery timing uses median observed between-set intervals", () => {
  const insight = buildRecoveryTimingInsight([
    { logged_at: "2026-07-13T01:00:00Z" },
    { logged_at: "2026-07-13T01:01:30Z" },
    { logged_at: "2026-07-13T01:03:10Z" },
    { logged_at: "2026-07-13T01:08:10Z" },
  ]);
  assert.equal(insight?.observedIntervalSeconds, 100);
  assert.equal(insight?.sampleCount, 3);
  assert.equal(insight?.label, "Observed rest 1:40");
});

test("recovery timing hides low-data and implausible intervals", () => {
  assert.equal(buildRecoveryTimingInsight([{ logged_at: "2026-07-13T01:00:00Z" }, { logged_at: "2026-07-13T01:00:05Z" }]), null);
  assert.equal(buildRecoveryTimingInsight([{ logged_at: "2026-07-13T01:00:00Z" }, { logged_at: "2026-07-13T02:00:00Z" }]), null);
});
