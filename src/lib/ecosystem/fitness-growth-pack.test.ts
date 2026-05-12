import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadFitnessFunnelDashboardPack, loadFitnessWave2MetricsPack } from "./fitness-funnel-dashboard.ts";
import { loadFitnessGrowthPack } from "./fitness-growth-shadow.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const growthSchemaPath = path.join(
  repoRoot,
  "truth-pack",
  "fitness",
  "event-contract",
  "schemas",
  "atlas-fitness-growth-pack.schema.v1.json",
);

type GrowthSchema = {
  required: string[];
};

function loadJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function assertRefExists(ref: string) {
  const resolved = path.resolve(repoRoot, ref);
  assert.equal(fs.existsSync(resolved), true, `Missing evidence ref: ${ref}`);
}

test("growth pack stays pinned to the frozen metrics and dashboard pack surfaces", () => {
  const growthPack = loadFitnessGrowthPack();
  const metricsPack = loadFitnessWave2MetricsPack();
  const dashboardPack = loadFitnessFunnelDashboardPack();
  const schema = loadJson<GrowthSchema>(growthSchemaPath);

  for (const key of schema.required) {
    assert.ok(key in growthPack, `Growth pack missing required key '${key}'`);
  }

  assert.equal(growthPack.pack_id, "atlas-fitness-growth-pack");
  assert.equal(growthPack.pack_version, "atlas.fitness.growth-pack.v1");
  assert.equal(growthPack.owner_repo_id, "fitness");
  assert.equal(growthPack.lane, "wave_2_growth");
  assert.deepEqual(growthPack.consumer_of_pack_versions, [metricsPack.pack_version, dashboardPack.pack_version]);
  assert.deepEqual(growthPack.frozen_fields, [
    "eligibility_rules",
    "suppression_rules",
    "placement_contract",
    "attribution_fields",
    "deep_link_fields",
    "cohort_flag_behavior",
    "acceptance_checks",
  ]);
});

test("growth pack remains internally coherent and evidence-backed", () => {
  const growthPack = loadFitnessGrowthPack();
  const metricsPack = loadFitnessWave2MetricsPack();
  const dashboardPack = loadFitnessFunnelDashboardPack();
  const metricsCheckIds = new Set(metricsPack.dashboard_acceptance_checks.map((check) => check.check_id));
  const dashboardCheckIds = new Set(dashboardPack.acceptance_checks.map((check) => check.check_id));

  for (const ref of growthPack.evidence_refs) {
    assertRefExists(ref);
  }

  assert.equal(growthPack.placement_contract.mode, "shadow_only");
  assert.equal(growthPack.placement_contract.trigger.funnel_id, "recovery_guardrail_funnel");
  assert.equal(growthPack.placement_contract.trigger.stage_id, "recovery_warning");
  assert.deepEqual(growthPack.placement_contract.success_kpi_ids, [
    "recovery_guardrail_application_rate",
    "recovery_warning_rate",
  ]);

  assert.equal(growthPack.eligibility_rules.length, 2);
  assert.equal(growthPack.suppression_rules.length, 3);
  assert.equal(
    growthPack.cohort_flag_behavior.arms.reduce((total, arm) => total + arm.allocation_percent, 0),
    100,
    "Cohort allocation must sum to 100",
  );

  for (const check of growthPack.acceptance_checks) {
    assert.ok(check.criteria.length > 0, `Acceptance check '${check.check_id}' must declare criteria`);
    for (const metricsCheckId of check.metrics_pack_check_ids) {
      assert.ok(metricsCheckIds.has(metricsCheckId), `Acceptance check '${check.check_id}' references unknown metrics check '${metricsCheckId}'`);
    }
    for (const dashboardCheckId of check.dashboard_pack_check_ids) {
      assert.ok(
        dashboardCheckIds.has(dashboardCheckId),
        `Acceptance check '${check.check_id}' references unknown dashboard check '${dashboardCheckId}'`,
      );
    }
  }

  const attributionFields = new Set(growthPack.attribution_fields.filter((field) => field.required).map((field) => field.field));
  assert.ok(attributionFields.has("memberId"));
  assert.ok(attributionFields.has("sourceOutboundId"));
  assert.ok(attributionFields.has("weekStartDate"));
  assert.ok(attributionFields.has("cohortId"));
  assert.ok(attributionFields.has("experimentArm"));
});
