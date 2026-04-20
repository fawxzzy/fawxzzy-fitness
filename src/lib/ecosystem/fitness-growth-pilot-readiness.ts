import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFitnessDashboardReport,
  loadFitnessFunnelDashboardPack,
  loadFitnessWave2MetricsPack,
  readAcceptedShadowWarehouseReceipts,
} from "./fitness-funnel-dashboard.ts";
import { buildFitnessGrowthShadowReport, loadFitnessGrowthPack } from "./fitness-growth-shadow.ts";

type WarehouseReceipt = ReturnType<typeof readAcceptedShadowWarehouseReceipts>[number];

type PilotMetricBinding = {
  metric_id: string;
  label: string;
  source_kind: string;
  source_ref: string;
  event_types?: string[];
  correlation_keys?: string[];
  unit: "count" | "ratio";
  observability_rule: string;
};

type PilotThreshold = {
  threshold_id: string;
  metric_id: string;
  description: string;
  comparator: ">=" | "<=";
  threshold_value: number;
  blocking_mode: "stay_shadow" | "rollback";
};

type PilotReadinessPack = {
  pack_id: string;
  pack_version: string;
  status: string;
  lane: string;
  owner_repo_id: string;
  consumer_of_pack_versions: string[];
  frozen_fields: string[];
  evidence_refs: string[];
  evaluation_scope: {
    placement_id: string;
    surface_id: string;
    surface_family: string;
    pilot_app_id: string;
    source_growth_pack_version: string;
    source_metrics_pack_version: string;
    source_dashboard_pack_version: string;
    retained_activation_window_days: number;
    decision_target: string;
  };
  metric_bindings: PilotMetricBinding[];
  thresholds: PilotThreshold[];
  pilot_rollout_policy: {
    pilot_cohort_id: string;
    max_live_apps: number;
    max_live_surfaces: number;
    max_live_placements: number;
    max_live_cohort_members: number;
    sticky_rollout_percentage: number;
    sticky_assignment_unit: string;
    sticky_hash_strategy: string;
    widen_only_if: string[];
  };
  stay_shadow_conditions: string[];
  rollback_conditions: string[];
  acceptance_checks: Array<{
    check_id: string;
    growth_pack_check_ids: string[];
    dashboard_pack_check_ids: string[];
    criteria: string[];
  }>;
};

export type FitnessGrowthPilotMetricObservation = {
  metric_id: string;
  label: string;
  observable: boolean;
  unit: "count" | "ratio";
  numerator: number | null;
  denominator: number | null;
  value: number | null;
  details: string[];
};

export type FitnessGrowthPilotThresholdCheck = {
  threshold_id: string;
  metric_id: string;
  comparator: ">=" | "<=";
  threshold_value: number;
  observed_value: number | null;
  observable: boolean;
  passed: boolean;
  blocking_mode: "stay_shadow" | "rollback";
  details: string[];
};

export type FitnessGrowthPilotReadinessReport = {
  pack_id: string;
  pack_version: string;
  decision: "allow_narrow_sticky_pilot" | "stay_shadow";
  warehouse_receipt_count: number;
  consumer_of_pack_versions: string[];
  evaluation_scope: PilotReadinessPack["evaluation_scope"];
  pilot_rollout_policy: PilotReadinessPack["pilot_rollout_policy"] & {
    proposed_live_cohort_members: number;
  };
  baseline: {
    growth_summary: {
      candidate_count: number;
      eligible_count: number;
      suppressed_count: number;
      control_count: number;
      placed_count: number;
      attributed_conversion_count: number;
    };
    dashboard_recovery_guardrail_application_rate: {
      numerator: number;
      denominator: number;
      value: number | null;
    };
  };
  metrics: FitnessGrowthPilotMetricObservation[];
  threshold_checks: FitnessGrowthPilotThresholdCheck[];
  acceptance_checks: Array<{
    check_id: string;
    passed: boolean;
    details: string[];
  }>;
  stay_shadow_reasons: string[];
  rollback_alerts: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const eventContractRoot = path.join(repoRoot, "truth-pack", "fitness", "event-contract");
const pilotPackPath = path.join(eventContractRoot, "atlas-fitness-growth-pilot-readiness-pack.v1.json");

function loadJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function loadFitnessGrowthPilotReadinessPack(): PilotReadinessPack {
  return loadJson<PilotReadinessPack>(pilotPackPath);
}

function readPayloadString(receipt: WarehouseReceipt, key: string): string | null {
  const value = receipt.event.payload[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readCorrelationValue(receipt: WarehouseReceipt, key: string): string | null {
  if (key === "member_id") {
    return receipt.event.correlation.member_id ?? readPayloadString(receipt, "memberId");
  }

  if (key === "source_outbound_id") {
    return receipt.event.correlation.source_outbound_id ?? readPayloadString(receipt, "sourceOutboundId");
  }

  if (key === "outbound_id") {
    return receipt.event.correlation.outbound_id ?? null;
  }

  if (key === "week_start_date") {
    return receipt.event.correlation.week_start_date ?? readPayloadString(receipt, "weekStartDate");
  }

  return null;
}

function serializeEventKey(receipt: WarehouseReceipt, correlationKeys: readonly string[]): string | null {
  const parts = correlationKeys.map((key) => readCorrelationValue(receipt, key));
  if (parts.some((part) => part === null || part === "")) {
    return null;
  }

  return parts.join("::");
}

function collectEventCounts(
  receipts: readonly WarehouseReceipt[],
  eventTypes: readonly string[],
  correlationKeys: readonly string[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const receipt of receipts) {
    if (!eventTypes.includes(receipt.event.event_type)) {
      continue;
    }

    const key = serializeEventKey(receipt, correlationKeys);
    if (!key) {
      continue;
    }

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function collectDistinctEventKeys(
  receipts: readonly WarehouseReceipt[],
  eventTypes: readonly string[],
  correlationKeys: readonly string[],
): Set<string> {
  return new Set(collectEventCounts(receipts, eventTypes, correlationKeys).keys());
}

function collectEventTimesByKey(
  receipts: readonly WarehouseReceipt[],
  eventTypes: readonly string[],
  correlationKeys: readonly string[],
): Map<string, string[]> {
  const index = new Map<string, string[]>();

  for (const receipt of receipts) {
    if (!eventTypes.includes(receipt.event.event_type)) {
      continue;
    }

    const key = serializeEventKey(receipt, correlationKeys);
    if (!key) {
      continue;
    }

    const bucket = index.get(key) ?? [];
    bucket.push(receipt.event.occurred_at);
    bucket.sort((left, right) => left.localeCompare(right));
    index.set(key, bucket);
  }

  return index;
}

function ratioObservation(input: {
  metric_id: string;
  label: string;
  numerator: number;
  denominator: number;
  details: string[];
  observableWhen: boolean;
}): FitnessGrowthPilotMetricObservation {
  return {
    metric_id: input.metric_id,
    label: input.label,
    observable: input.observableWhen,
    unit: "ratio",
    numerator: input.numerator,
    denominator: input.denominator,
    value: input.observableWhen && input.denominator > 0
      ? Number((input.numerator / input.denominator).toFixed(4))
      : null,
    details: input.details,
  };
}

function countObservation(input: {
  metric_id: string;
  label: string;
  value: number;
  details: string[];
}): FitnessGrowthPilotMetricObservation {
  return {
    metric_id: input.metric_id,
    label: input.label,
    observable: true,
    unit: "count",
    numerator: input.value,
    denominator: null,
    value: input.value,
    details: input.details,
  };
}

function compareThreshold(observedValue: number | null, comparator: ">=" | "<=", thresholdValue: number): boolean {
  if (observedValue === null) {
    return false;
  }

  return comparator === ">=" ? observedValue >= thresholdValue : observedValue <= thresholdValue;
}

function asTime(value: string): number {
  return new Date(value).getTime();
}

export function buildFitnessGrowthPilotReadinessReport(options: {
  receiptRoot: string;
  pilotPack?: PilotReadinessPack;
}): FitnessGrowthPilotReadinessReport {
  const pilotPack = options.pilotPack ?? loadFitnessGrowthPilotReadinessPack();
  const growthPack = loadFitnessGrowthPack();
  const metricsPack = loadFitnessWave2MetricsPack();
  const dashboardPack = loadFitnessFunnelDashboardPack();
  const growthReport = buildFitnessGrowthShadowReport({
    receiptRoot: options.receiptRoot,
    growthPack,
  });
  const dashboardReport = buildFitnessDashboardReport({
    receiptRoot: options.receiptRoot,
    metricsPack,
    dashboardPack,
  });
  const receipts = readAcceptedShadowWarehouseReceipts(options.receiptRoot);

  const requiredAttributionFields = new Set(
    growthPack.attribution_fields.filter((field) => field.required).map((field) => field.field),
  );
  const placedCandidates = growthReport.candidates.filter((candidate) => candidate.placement_status === "shadow_placed");
  const placedWithCompleteAttribution = placedCandidates.filter((candidate) =>
    [...requiredAttributionFields].every((field) => {
      const value = candidate.attribution[field];
      return typeof value === "string" && value.length > 0;
    }),
  ).length;

  const lineageKeys = ["source_outbound_id"];
  const impressionCounts = collectEventCounts(receipts, ["pilot_shadow_impression_logged"], lineageKeys);
  const impressionKeys = new Set(impressionCounts.keys());
  const clickKeys = collectDistinctEventKeys(receipts, ["pilot_shadow_click_logged"], lineageKeys);
  const activationTimes = collectEventTimesByKey(receipts, ["recovery_guardrail_applied"], lineageKeys);
  const activationKeys = new Set([...activationTimes.keys()].filter((key) => clickKeys.has(key)));
  const retentionTimes = collectEventTimesByKey(receipts, ["pilot_activation_retained"], lineageKeys);
  const dismissalKeys = collectDistinctEventKeys(receipts, ["pilot_placement_dismissed", "pilot_support_complaint_opened"], lineageKeys);
  const duplicateImpressionCount = [...impressionCounts.values()].reduce((total, count) => total + Math.max(0, count - 1), 0);

  const retainedActivationCount = [...activationKeys].filter((key) => {
    const activationIso = activationTimes.get(key)?.[0];
    const retained = retentionTimes.get(key) ?? [];
    if (!activationIso) {
      return false;
    }

    const activationTime = asTime(activationIso);
    const maxRetentionTime = activationTime + (pilotPack.evaluation_scope.retained_activation_window_days * 24 * 60 * 60 * 1000);
    return retained.some((occurredAt) => {
      const retentionTime = asTime(occurredAt);
      return retentionTime > activationTime && retentionTime <= maxRetentionTime;
    });
  }).length;

  const shadowPlacedWithSuppression = growthReport.candidates.filter(
    (candidate) => candidate.placement_status === "shadow_placed" && candidate.suppression_rule_ids.length > 0,
  ).length;
  const totalShadowImpressions = [...impressionCounts.values()].reduce((total, count) => total + count, 0);

  const metrics: FitnessGrowthPilotMetricObservation[] = [
    countObservation({
      metric_id: "eligible_population_count",
      label: "Eligible population / sample floor",
      value: growthReport.summary.eligible_count,
      details: [`eligible_count=${growthReport.summary.eligible_count}`],
    }),
    ratioObservation({
      metric_id: "attribution_completeness_rate",
      label: "Attribution completeness floor",
      numerator: placedWithCompleteAttribution,
      denominator: placedCandidates.length,
      observableWhen: placedCandidates.length > 0,
      details: [
        `shadow_placed_with_complete_attribution=${placedWithCompleteAttribution}`,
        `shadow_placed_count=${placedCandidates.length}`,
      ],
    }),
    ratioObservation({
      metric_id: "shadow_click_through_rate",
      label: "Minimum shadow CTR",
      numerator: clickKeys.size,
      denominator: impressionKeys.size,
      observableWhen: impressionKeys.size > 0,
      details: [
        `distinct_shadow_clicks=${clickKeys.size}`,
        `distinct_shadow_impressions=${impressionKeys.size}`,
      ],
    }),
    ratioObservation({
      metric_id: "attributed_destination_activation_rate",
      label: "Minimum attributed destination activation",
      numerator: activationKeys.size,
      denominator: clickKeys.size,
      observableWhen: clickKeys.size > 0,
      details: [
        `distinct_activations=${activationKeys.size}`,
        `distinct_shadow_clicks=${clickKeys.size}`,
      ],
    }),
    ratioObservation({
      metric_id: "retained_activation_rate",
      label: "Minimum retained activation window",
      numerator: retainedActivationCount,
      denominator: activationKeys.size,
      observableWhen: activationKeys.size > 0,
      details: [
        `retained_activations=${retainedActivationCount}`,
        `attributed_activations=${activationKeys.size}`,
        `retained_activation_window_days=${pilotPack.evaluation_scope.retained_activation_window_days}`,
      ],
    }),
    ratioObservation({
      metric_id: "suppression_miss_rate",
      label: "Maximum suppression miss rate",
      numerator: shadowPlacedWithSuppression,
      denominator: growthReport.summary.eligible_count,
      observableWhen: growthReport.summary.eligible_count > 0,
      details: [
        `shadow_placed_with_suppression=${shadowPlacedWithSuppression}`,
        `eligible_count=${growthReport.summary.eligible_count}`,
      ],
    }),
    ratioObservation({
      metric_id: "duplicate_exposure_rate",
      label: "Maximum duplicate exposure rate",
      numerator: duplicateImpressionCount,
      denominator: totalShadowImpressions,
      observableWhen: impressionCounts.size > 0,
      details: [
        `duplicate_shadow_impressions=${duplicateImpressionCount}`,
        `total_shadow_impressions=${totalShadowImpressions}`,
      ],
    }),
    ratioObservation({
      metric_id: "dismissal_complaint_rate",
      label: "Maximum dismissal / complaint rate",
      numerator: dismissalKeys.size,
      denominator: impressionKeys.size,
      observableWhen: impressionKeys.size > 0,
      details: [
        `dismissal_or_complaint_lineages=${dismissalKeys.size}`,
        `distinct_shadow_impressions=${impressionKeys.size}`,
      ],
    }),
  ];

  const metricsById = new Map(metrics.map((metric) => [metric.metric_id, metric]));
  const threshold_checks = pilotPack.thresholds.map<FitnessGrowthPilotThresholdCheck>((threshold) => {
    const metric = metricsById.get(threshold.metric_id);
    const observedValue = metric?.value ?? null;
    const observable = metric?.observable ?? false;
    const passed = observable && compareThreshold(observedValue, threshold.comparator, threshold.threshold_value);

    return {
      threshold_id: threshold.threshold_id,
      metric_id: threshold.metric_id,
      comparator: threshold.comparator,
      threshold_value: threshold.threshold_value,
      observed_value: observedValue,
      observable,
      passed,
      blocking_mode: threshold.blocking_mode,
      details: [
        threshold.description,
        ...(metric?.details ?? ["No metric observation found."]),
      ],
    };
  });

  const growthChecksPassed = growthReport.acceptance_checks.every((check) => check.passed);
  const dashboardChecksPassed = dashboardReport.acceptance_checks.every((check) => check.passed);
  const expectedVersions = [growthPack.pack_version, metricsPack.pack_version, dashboardPack.pack_version];

  const acceptance_checks = pilotPack.acceptance_checks.map((check) => {
    const details: string[] = [];
    let passed = true;

    if (check.check_id === "pilot-pack-stays-pinned-to-owner-growth-and-dashboard-truth") {
      passed = expectedVersions.every((version) => pilotPack.consumer_of_pack_versions.includes(version))
        && pilotPack.evaluation_scope.placement_id === growthPack.placement_contract.placement_id
        && pilotPack.evaluation_scope.surface_id === growthPack.placement_contract.surface_id
        && growthChecksPassed
        && dashboardChecksPassed;
      details.push(`consumer_of_pack_versions=${pilotPack.consumer_of_pack_versions.join(",")}`);
      details.push(`expected_versions=${expectedVersions.join(",")}`);
      details.push(`growth_checks_passed=${growthChecksPassed}`);
      details.push(`dashboard_checks_passed=${dashboardChecksPassed}`);
    } else if (check.check_id === "pilot-rollout-stays-one-app-one-surface-one-cohort") {
      passed = pilotPack.pilot_rollout_policy.max_live_apps === 1
        && pilotPack.pilot_rollout_policy.max_live_surfaces === 1
        && pilotPack.pilot_rollout_policy.max_live_placements === 1
        && pilotPack.pilot_rollout_policy.sticky_rollout_percentage <= 10;
      details.push(`max_live_apps=${pilotPack.pilot_rollout_policy.max_live_apps}`);
      details.push(`max_live_surfaces=${pilotPack.pilot_rollout_policy.max_live_surfaces}`);
      details.push(`max_live_placements=${pilotPack.pilot_rollout_policy.max_live_placements}`);
      details.push(`sticky_rollout_percentage=${pilotPack.pilot_rollout_policy.sticky_rollout_percentage}`);
    } else if (check.check_id === "pilot-gate-requires-observable-click-activation-retention-feedback") {
      const requiredMetricIds = [
        "shadow_click_through_rate",
        "attributed_destination_activation_rate",
        "retained_activation_rate",
        "dismissal_complaint_rate",
      ];
      passed = requiredMetricIds.every((metricId) => metricsById.get(metricId)?.observable === true);
      details.push(
        ...requiredMetricIds.map((metricId) => `${metricId}.observable=${metricsById.get(metricId)?.observable === true}`),
      );
    } else {
      passed = false;
      details.push("No executable relation registered for this check.");
    }

    return {
      check_id: check.check_id,
      passed,
      details,
    };
  });

  const stay_shadow_reasons = threshold_checks
    .filter((check) => check.blocking_mode === "stay_shadow" && (!check.observable || !check.passed))
    .map((check) =>
      !check.observable
        ? `${check.threshold_id}: metric is not observable in owner truth`
        : `${check.threshold_id}: observed ${check.observed_value} did not satisfy ${check.comparator} ${check.threshold_value}`,
    );
  stay_shadow_reasons.push(
    ...acceptance_checks
      .filter((check) => !check.passed)
      .map((check) => `${check.check_id}: acceptance check failed`),
  );

  const rollback_alerts = threshold_checks
    .filter((check) => check.blocking_mode === "rollback" && check.observable && !check.passed)
    .map((check) => `${check.threshold_id}: observed ${check.observed_value} violated ${check.comparator} ${check.threshold_value}`);

  const proposedLiveCohortMembers = Math.min(
    pilotPack.pilot_rollout_policy.max_live_cohort_members,
    Math.floor((growthReport.summary.eligible_count * pilotPack.pilot_rollout_policy.sticky_rollout_percentage) / 100),
  );

  return {
    pack_id: pilotPack.pack_id,
    pack_version: pilotPack.pack_version,
    decision: stay_shadow_reasons.length === 0 && rollback_alerts.length === 0 ? "allow_narrow_sticky_pilot" : "stay_shadow",
    warehouse_receipt_count: receipts.length,
    consumer_of_pack_versions: pilotPack.consumer_of_pack_versions,
    evaluation_scope: pilotPack.evaluation_scope,
    pilot_rollout_policy: {
      ...pilotPack.pilot_rollout_policy,
      proposed_live_cohort_members: proposedLiveCohortMembers,
    },
    baseline: {
      growth_summary: growthReport.summary,
      dashboard_recovery_guardrail_application_rate: growthReport.baseline_dashboard.recovery_guardrail_application_rate,
    },
    metrics,
    threshold_checks,
    acceptance_checks,
    stay_shadow_reasons,
    rollback_alerts,
  };
}
