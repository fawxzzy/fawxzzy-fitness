import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { fitnessIntegrationContract } from "./fitness-integration-contract.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const atlasRoot = process.env.ATLAS_ROOT
  ? path.resolve(process.env.ATLAS_ROOT)
  : findAtlasRoot(repoRoot);
const metricsPackPath = path.join(
  repoRoot,
  "truth-pack",
  "fitness",
  "event-contract",
  "atlas-fitness-wave-2-metrics-pack.v1.json",
);
const metricsSchemaPath = path.join(
  repoRoot,
  "truth-pack",
  "fitness",
  "event-contract",
  "schemas",
  "atlas-fitness-wave-2-metrics-pack.schema.v1.json",
);
const eventContractsWorkflowPath = path.join(
  repoRoot,
  ".github",
  "workflows",
  "event-contracts.yml",
);

type MetricsPack = {
  pack_id: string;
  pack_version: string;
  status: string;
  lane: string;
  owner_repo_id: string;
  doctrine_repo_ids: string[];
  consumer_repo_ids: string[];
  frozen_fields: string[];
  evidence_refs: string[];
  shared_nouns: Array<{
    noun: string;
    owner_repo_id: string;
    definition: string;
    source_fields: string[];
    evidence_refs: string[];
  }>;
  correlation_keys: Array<{
    key: string;
    kind: string;
    definition: string;
    source_fields: string[];
    required_for: string[];
    evidence_refs: string[];
  }>;
  denominators: Array<{
    denominator_id: string;
    grain: string;
    definition: string;
    correlation_keys: string[];
    evidence_refs: string[];
  }>;
  funnel_definitions: Array<{
    funnel_id: string;
    label: string;
    entity_grain: string;
    stages: Array<{
      stage_id: string;
      event_kind: "signal" | "snapshot" | "receipt";
      event_type: string;
      status: string;
      correlation_keys: string[];
      denominator_id: string;
      evidence_refs: string[];
    }>;
  }>;
  kpis: Array<{
    kpi_id: string;
    label: string;
    unit: string;
    default_window: string;
    numerator_definition: string;
    denominator_id: string;
    correlation_keys: string[];
    funnel_id: string;
    evidence_refs: string[];
  }>;
  dashboard_acceptance_checks: Array<{
    check_id: string;
    description: string;
    funnel_ids: string[];
    kpi_ids: string[];
    criteria: string[];
  }>;
};

type MetricsSchema = {
  required: string[];
};

function findAtlasRoot(startDir: string): string | null {
  let current = startDir;

  while (true) {
    if (fs.existsSync(path.join(current, "stack.yaml"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function loadJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function assertRefExists(ref: string) {
  const localResolved = path.resolve(repoRoot, ref);
  if (fs.existsSync(localResolved)) {
    return;
  }

  const atlasRootRelativePrefixes = [
    "docs/",
    "ops/",
    "packages/",
    "data/",
    "runtime/",
    "repos/",
    "stack.yaml",
    "README-STACK.md",
    "AGENTS.md",
  ];
  const isAtlasRootRef = atlasRootRelativePrefixes.some((prefix) => ref === prefix || ref.startsWith(prefix));

  assert.equal(
    isAtlasRootRef,
    true,
    `Missing repo-local evidence ref: ${ref}`,
  );

  if (!atlasRoot) {
    return;
  }

  assert.equal(
    fs.existsSync(path.join(atlasRoot, ref)),
    true,
    `Missing ATLAS evidence ref: ${ref}`,
  );
}

function hasContractEvent(kind: "signal" | "snapshot" | "receipt", eventType: string): boolean {
  if (kind === "signal") {
    return fitnessIntegrationContract.signals.some((entry) => entry.type === eventType);
  }

  if (kind === "snapshot") {
    return fitnessIntegrationContract.stateSnapshots.some((entry) => entry.type === eventType);
  }

  return fitnessIntegrationContract.receipts.some((entry) => entry.type === eventType);
}

test("metrics pack satisfies the declared schema contract shell", () => {
  const metricsPack = loadJson<MetricsPack>(metricsPackPath);
  const schema = loadJson<MetricsSchema>(metricsSchemaPath);

  for (const key of schema.required) {
    assert.ok(key in metricsPack, `Metrics pack missing required key '${key}'`);
  }

  assert.equal(metricsPack.pack_id, "atlas-fitness-wave-2-metrics-pack");
  assert.equal(metricsPack.pack_version, "atlas.fitness.wave-2-metrics-pack.v1");
  assert.equal(metricsPack.owner_repo_id, "fitness");
  assert.equal(metricsPack.lane, "wave_2_metrics");
  assert.ok(metricsPack.doctrine_repo_ids.includes("atlas"));
  assert.ok(metricsPack.consumer_repo_ids.includes("playbook"));
  assert.deepEqual(
    metricsPack.frozen_fields,
    [
      "shared_nouns",
      "kpis",
      "funnel_definitions",
      "denominators",
      "correlation_keys",
      "dashboard_acceptance_checks",
    ],
  );
});

test("findAtlasRoot returns null when no ATLAS root is present", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "fitness-no-atlas-root-"));
  const nestedDir = path.join(tempRoot, "repo", "nested");
  fs.mkdirSync(nestedDir, { recursive: true });

  assert.equal(findAtlasRoot(nestedDir), null);
});

test("metrics pack remains internally coherent and evidence-backed", () => {
  const metricsPack = loadJson<MetricsPack>(metricsPackPath);
  const declaredCorrelationKeys = new Set(metricsPack.correlation_keys.map((entry) => entry.key));
  const declaredDenominators = new Set(metricsPack.denominators.map((entry) => entry.denominator_id));
  const declaredFunnels = new Set(metricsPack.funnel_definitions.map((entry) => entry.funnel_id));
  const declaredKpis = new Set(metricsPack.kpis.map((entry) => entry.kpi_id));

  for (const ref of metricsPack.evidence_refs) {
    assertRefExists(ref);
  }

  for (const noun of metricsPack.shared_nouns) {
    assert.ok(noun.definition.length > 0, `Shared noun '${noun.noun}' must declare a definition`);
    assert.ok(noun.source_fields.length > 0, `Shared noun '${noun.noun}' must declare source fields`);
    for (const ref of noun.evidence_refs) {
      assertRefExists(ref);
    }
  }

  for (const correlationKey of metricsPack.correlation_keys) {
    assert.ok(
      correlationKey.kind === "stable" || correlationKey.kind === "derived",
      `Correlation key '${correlationKey.key}' must declare a supported kind`,
    );
    assert.ok(correlationKey.required_for.length > 0, `Correlation key '${correlationKey.key}' must be used by at least one surface`);
    for (const ref of correlationKey.evidence_refs) {
      assertRefExists(ref);
    }
  }

  for (const denominator of metricsPack.denominators) {
    assert.ok(denominator.definition.length > 0, `Denominator '${denominator.denominator_id}' must declare a definition`);
    for (const key of denominator.correlation_keys) {
      assert.ok(declaredCorrelationKeys.has(key), `Denominator '${denominator.denominator_id}' references unknown correlation key '${key}'`);
    }
    for (const ref of denominator.evidence_refs) {
      assertRefExists(ref);
    }
  }

  for (const funnel of metricsPack.funnel_definitions) {
    assert.ok(funnel.stages.length >= 2, `Funnel '${funnel.funnel_id}' must contain at least two stages`);
    for (const stage of funnel.stages) {
      assert.ok(
        hasContractEvent(stage.event_kind, stage.event_type),
        `Funnel stage '${stage.stage_id}' references unknown ${stage.event_kind} '${stage.event_type}'`,
      );
      assert.ok(
        declaredDenominators.has(stage.denominator_id),
        `Funnel stage '${stage.stage_id}' references unknown denominator '${stage.denominator_id}'`,
      );
      for (const key of stage.correlation_keys) {
        assert.ok(declaredCorrelationKeys.has(key), `Funnel stage '${stage.stage_id}' references unknown correlation key '${key}'`);
      }
      for (const ref of stage.evidence_refs) {
        assertRefExists(ref);
      }
    }
  }

  for (const kpi of metricsPack.kpis) {
    assert.ok(kpi.numerator_definition.length > 0, `KPI '${kpi.kpi_id}' must declare a numerator definition`);
    assert.ok(declaredDenominators.has(kpi.denominator_id), `KPI '${kpi.kpi_id}' references unknown denominator '${kpi.denominator_id}'`);
    assert.ok(declaredFunnels.has(kpi.funnel_id), `KPI '${kpi.kpi_id}' references unknown funnel '${kpi.funnel_id}'`);
    for (const key of kpi.correlation_keys) {
      assert.ok(declaredCorrelationKeys.has(key), `KPI '${kpi.kpi_id}' references unknown correlation key '${key}'`);
    }
    for (const ref of kpi.evidence_refs) {
      assertRefExists(ref);
    }
  }

  for (const check of metricsPack.dashboard_acceptance_checks) {
    assert.ok(check.criteria.length > 0, `Acceptance check '${check.check_id}' must declare criteria`);
    for (const funnelId of check.funnel_ids) {
      assert.ok(declaredFunnels.has(funnelId), `Acceptance check '${check.check_id}' references unknown funnel '${funnelId}'`);
    }
    for (const kpiId of check.kpi_ids) {
      assert.ok(declaredKpis.has(kpiId), `Acceptance check '${check.check_id}' references unknown KPI '${kpiId}'`);
    }
  }
});

test("event-contract workflow stays observable and wired to the repo-owned contract lane", () => {
  const workflow = fs.readFileSync(eventContractsWorkflowPath, "utf8");

  assert.ok(workflow.includes("name: fitness-event-contracts"));
  assert.ok(workflow.includes("name: Event Contract Check"));
  assert.ok(workflow.includes("name: Shadow Warehouse Check"));
  assert.ok(workflow.includes("name: Event Contract Lane Summary"));
  assert.ok(workflow.includes("run: npm run test:fitness-event-contracts"));
  assert.ok(workflow.includes("run: npm run test:fitness-shadow-warehouse"));
  assert.ok(workflow.includes('"package.json"'));
  assert.ok(workflow.includes('"src/lib/ecosystem/**"'));
  assert.ok(workflow.includes("workflow_dispatch:"));
});
