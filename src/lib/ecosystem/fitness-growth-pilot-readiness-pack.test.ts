import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadFitnessFunnelDashboardPack, loadFitnessWave2MetricsPack } from "./fitness-funnel-dashboard.ts";
import { loadFitnessGrowthPilotReadinessPack } from "./fitness-growth-pilot-readiness.ts";
import { loadFitnessGrowthPack } from "./fitness-growth-shadow.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const pilotSchemaPath = path.join(
  repoRoot,
  "truth-pack",
  "fitness",
  "event-contract",
  "schemas",
  "atlas-fitness-growth-pilot-readiness-pack.schema.v1.json",
);

type PilotSchema = {
  required: string[];
};

function loadJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function assertRefExists(ref: string) {
  const resolved = path.resolve(repoRoot, ref);
  assert.equal(fs.existsSync(resolved), true, `Missing evidence ref: ${ref}`);
}

test("pilot-readiness pack stays pinned to the growth, metrics, and dashboard packs", () => {
  const pilotPack = loadFitnessGrowthPilotReadinessPack();
  const growthPack = loadFitnessGrowthPack();
  const metricsPack = loadFitnessWave2MetricsPack();
  const dashboardPack = loadFitnessFunnelDashboardPack();
  const schema = loadJson<PilotSchema>(pilotSchemaPath);

  for (const key of schema.required) {
    assert.ok(key in pilotPack, `Pilot-readiness pack missing required key '${key}'`);
  }

  assert.equal(pilotPack.pack_id, "atlas-fitness-growth-pilot-readiness-pack");
  assert.equal(pilotPack.pack_version, "atlas.fitness.growth-pilot-readiness-pack.v1");
  assert.equal(pilotPack.owner_repo_id, "fitness");
  assert.equal(pilotPack.lane, "wave_2_growth_pilot_gate");
  assert.deepEqual(pilotPack.consumer_of_pack_versions, [
    growthPack.pack_version,
    metricsPack.pack_version,
    dashboardPack.pack_version,
  ]);
  assert.deepEqual(pilotPack.frozen_fields, [
    "evaluation_scope",
    "metric_bindings",
    "thresholds",
    "pilot_rollout_policy",
    "stay_shadow_conditions",
    "rollback_conditions",
    "acceptance_checks",
  ]);
});

test("pilot-readiness pack remains coherent, evidence-backed, and narrowly scoped", () => {
  const pilotPack = loadFitnessGrowthPilotReadinessPack();
  const growthPack = loadFitnessGrowthPack();
  const dashboardPack = loadFitnessFunnelDashboardPack();
  const growthCheckIds = new Set(growthPack.acceptance_checks.map((check) => check.check_id));
  const dashboardCheckIds = new Set(dashboardPack.acceptance_checks.map((check) => check.check_id));
  const metricIds = new Set(pilotPack.metric_bindings.map((binding) => binding.metric_id));

  for (const ref of pilotPack.evidence_refs) {
    assertRefExists(ref);
  }

  assert.equal(pilotPack.evaluation_scope.placement_id, growthPack.placement_contract.placement_id);
  assert.equal(pilotPack.evaluation_scope.surface_id, growthPack.placement_contract.surface_id);
  assert.equal(pilotPack.pilot_rollout_policy.max_live_apps, 1);
  assert.equal(pilotPack.pilot_rollout_policy.max_live_surfaces, 1);
  assert.equal(pilotPack.pilot_rollout_policy.max_live_placements, 1);
  assert.ok(pilotPack.pilot_rollout_policy.sticky_rollout_percentage <= 10);

  for (const binding of pilotPack.metric_bindings) {
    assert.ok(binding.source_ref.length > 0, `Metric binding '${binding.metric_id}' must declare a source_ref`);
    assert.ok(binding.observability_rule.length > 0, `Metric binding '${binding.metric_id}' must declare an observability rule`);
  }

  for (const threshold of pilotPack.thresholds) {
    assert.ok(metricIds.has(threshold.metric_id), `Threshold '${threshold.threshold_id}' references unknown metric '${threshold.metric_id}'`);
  }

  for (const check of pilotPack.acceptance_checks) {
    assert.ok(check.criteria.length > 0, `Acceptance check '${check.check_id}' must declare criteria`);
    for (const growthCheckId of check.growth_pack_check_ids) {
      assert.ok(growthCheckIds.has(growthCheckId), `Acceptance check '${check.check_id}' references unknown growth check '${growthCheckId}'`);
    }
    for (const dashboardCheckId of check.dashboard_pack_check_ids) {
      assert.ok(dashboardCheckIds.has(dashboardCheckId), `Acceptance check '${check.check_id}' references unknown dashboard check '${dashboardCheckId}'`);
    }
  }
});
