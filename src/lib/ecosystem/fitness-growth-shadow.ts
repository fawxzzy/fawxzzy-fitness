import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFitnessDashboardReport,
  loadFitnessFunnelDashboardPack,
  loadFitnessWave2MetricsPack,
  readAcceptedShadowWarehouseReceipts,
} from "./fitness-funnel-dashboard.ts";

type WarehouseEventKind = "signal" | "snapshot" | "receipt";
type WarehouseReceipt = ReturnType<typeof readAcceptedShadowWarehouseReceipts>[number];

type GrowthPackField = {
  field: string;
  required: boolean;
  source?: string;
  value?: string;
};

type GrowthPack = {
  pack_id: string;
  pack_version: string;
  status: string;
  lane: string;
  owner_repo_id: string;
  consumer_of_pack_versions: string[];
  frozen_fields: string[];
  evidence_refs: string[];
  placement_contract: {
    placement_id: string;
    label: string;
    mode: "shadow_only";
    surface_id: string;
    surface_family: string;
    trigger: {
      funnel_id: string;
      stage_id: string;
      event_kind: WarehouseEventKind;
      event_type: string;
      entity_grain: string;
    };
    hypothesis: string;
    success_kpi_ids: string[];
    measurement_window: string;
  };
  eligibility_rules: Array<{
    rule_id: string;
    description: string;
    correlation_keys: string[];
    event_refs: string[];
    criteria: string[];
  }>;
  suppression_rules: Array<{
    rule_id: string;
    description: string;
    correlation_keys: string[];
    event_refs: string[];
    window: string;
  }>;
  attribution_fields: GrowthPackField[];
  deep_link_fields: GrowthPackField[];
  cohort_flag_behavior: {
    flag_key: string;
    assignment_unit: string;
    hash_strategy: string;
    shadow_only: boolean;
    arms: Array<{
      arm_id: string;
      allocation_percent: number;
      placement_enabled: boolean;
    }>;
  };
  acceptance_checks: Array<{
    check_id: string;
    metrics_pack_check_ids: string[];
    dashboard_pack_check_ids: string[];
    criteria: string[];
  }>;
};

type CandidateStatus = "ineligible" | "suppressed" | "shadow_control" | "shadow_placed";

type PlacementCandidate = {
  placement_id: string;
  member_id: string;
  source_outbound_id: string;
  week_start_date: string;
  observed_day: string;
  trigger_occurred_at: string;
  experiment_arm: string;
  cohort_id: string;
  cohort_bucket: number;
  eligible_rule_ids_met: string[];
  ineligibility_reasons: string[];
  suppression_rule_ids: string[];
  placement_status: CandidateStatus;
  attribution: Record<string, string>;
  deep_link: {
    pathname: string;
    params: Record<string, string>;
  };
  converted_on_primary_receipt: boolean;
};

export type FitnessGrowthShadowReport = {
  pack_id: string;
  pack_version: string;
  consumer_of_pack_versions: string[];
  warehouse_receipt_count: number;
  placement_contract: {
    placement_id: string;
    label: string;
    surface_id: string;
    mode: "shadow_only";
    success_kpi_ids: string[];
  };
  baseline_dashboard: {
    pack_id: string;
    pack_version: string;
    recovery_warning_stage_count: number;
    recovery_guardrail_application_rate: {
      numerator: number;
      denominator: number;
      value: number | null;
    };
  };
  summary: {
    candidate_count: number;
    eligible_count: number;
    suppressed_count: number;
    control_count: number;
    placed_count: number;
    attributed_conversion_count: number;
  };
  candidates: PlacementCandidate[];
  acceptance_checks: Array<{
    check_id: string;
    passed: boolean;
    details: string[];
  }>;
};

type TimedReceiptIndex = Map<string, WarehouseReceipt[]>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const eventContractRoot = path.join(repoRoot, "truth-pack", "fitness", "event-contract");
const growthPackPath = path.join(eventContractRoot, "atlas-fitness-growth-pack.v1.json");

function loadJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function loadFitnessGrowthPack(): GrowthPack {
  return loadJson<GrowthPack>(growthPackPath);
}

function toIsoDate(value: string): string {
  return value.slice(0, 10);
}

function startOfIsoWeek(value: string): string {
  const date = new Date(value);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

function asTime(value: string): number {
  return new Date(value).getTime();
}

function readPayloadString(receipt: WarehouseReceipt, key: string): string | null {
  const value = receipt.event.payload[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readPayloadNumber(receipt: WarehouseReceipt, key: string): number | null {
  const value = receipt.event.payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readCorrelation(receipt: WarehouseReceipt, key: string): string | null {
  const value = receipt.event.correlation[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function buildMemberWeekKey(memberId: string, weekStartDate: string): string {
  return `${memberId}::${weekStartDate}`;
}

function indexByKey(
  receipts: readonly WarehouseReceipt[],
  resolver: (receipt: WarehouseReceipt) => string | null,
): TimedReceiptIndex {
  const index: TimedReceiptIndex = new Map();

  for (const receipt of receipts) {
    const key = resolver(receipt);
    if (!key) {
      continue;
    }

    const bucket = index.get(key) ?? [];
    bucket.push(receipt);
    bucket.sort((left, right) => left.event.occurred_at.localeCompare(right.event.occurred_at));
    index.set(key, bucket);
  }

  return index;
}

function latestAtOrBefore(receipts: readonly WarehouseReceipt[] | undefined, cutoffIso: string): WarehouseReceipt | null {
  if (!receipts || receipts.length === 0) {
    return null;
  }

  const cutoff = asTime(cutoffIso);
  let latest: WarehouseReceipt | null = null;
  for (const receipt of receipts) {
    if (asTime(receipt.event.occurred_at) > cutoff) {
      break;
    }
    latest = receipt;
  }

  return latest;
}

function hasEventWithinWindow(
  receipts: readonly WarehouseReceipt[] | undefined,
  options: {
    candidateIso: string;
    maxAgeHours?: number;
    maxAgeDays?: number;
    sameWeek?: string;
  },
): boolean {
  if (!receipts || receipts.length === 0) {
    return false;
  }

  const candidateTime = asTime(options.candidateIso);
  const lowerBound =
    options.maxAgeHours !== undefined
      ? candidateTime - (options.maxAgeHours * 60 * 60 * 1000)
      : options.maxAgeDays !== undefined
        ? candidateTime - (options.maxAgeDays * 24 * 60 * 60 * 1000)
        : Number.NEGATIVE_INFINITY;

  return receipts.some((receipt) => {
    const receiptTime = asTime(receipt.event.occurred_at);
    if (receiptTime > candidateTime || receiptTime < lowerBound) {
      return false;
    }

    if (!options.sameWeek) {
      return true;
    }

    return readCorrelation(receipt, "week_start_date") === options.sameWeek
      || readPayloadString(receipt, "weekStartDate") === options.sameWeek;
  });
}

function hasEventAfter(receipts: readonly WarehouseReceipt[] | undefined, candidateIso: string, maxAgeDays: number): boolean {
  if (!receipts || receipts.length === 0) {
    return false;
  }

  const candidateTime = asTime(candidateIso);
  const upperBound = candidateTime + (maxAgeDays * 24 * 60 * 60 * 1000);
  return receipts.some((receipt) => {
    const receiptTime = asTime(receipt.event.occurred_at);
    return receiptTime > candidateTime && receiptTime <= upperBound;
  });
}

function stableBucket(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash + (input.charCodeAt(index) * (index + 1))) % 100;
  }
  return hash;
}

function assignArm(
  pack: GrowthPack,
  memberId: string,
  weekStartDate: string,
): {
  arm_id: string;
  placement_enabled: boolean;
  cohort_id: string;
  bucket: number;
} {
  const assignmentKey = `${memberId}::${weekStartDate}`;
  const bucket = stableBucket(assignmentKey);
  let cursor = 0;

  for (const arm of pack.cohort_flag_behavior.arms) {
    cursor += arm.allocation_percent;
    if (bucket < cursor) {
      return {
        arm_id: arm.arm_id,
        placement_enabled: arm.placement_enabled,
        cohort_id: `${pack.cohort_flag_behavior.flag_key}:${arm.arm_id}:${bucket}`,
        bucket,
      };
    }
  }

  const lastArm = pack.cohort_flag_behavior.arms.at(-1);
  if (!lastArm) {
    throw new Error("Growth pack must declare at least one cohort arm");
  }

  return {
    arm_id: lastArm.arm_id,
    placement_enabled: lastArm.placement_enabled,
    cohort_id: `${pack.cohort_flag_behavior.flag_key}:${lastArm.arm_id}:${bucket}`,
    bucket,
  };
}

function buildAttribution(
  pack: GrowthPack,
  candidate: {
    member_id: string;
    outbound_id: string;
    week_start_date: string;
    cohort_id: string;
    experiment_arm: string;
  },
): Record<string, string> {
  const output: Record<string, string> = {};

  for (const field of pack.attribution_fields) {
    if (field.source === "placement_contract.placement_id") {
      output[field.field] = pack.placement_contract.placement_id;
    } else if (field.source === "pack_version") {
      output[field.field] = pack.pack_version;
    } else if (field.source === "candidate.member_id") {
      output[field.field] = candidate.member_id;
    } else if (field.source === "candidate.outbound_id") {
      output[field.field] = candidate.outbound_id;
    } else if (field.source === "candidate.week_start_date") {
      output[field.field] = candidate.week_start_date;
    } else if (field.source === "candidate.cohort_id") {
      output[field.field] = candidate.cohort_id;
    } else if (field.source === "candidate.experiment_arm") {
      output[field.field] = candidate.experiment_arm;
    } else if (field.source === "placement_contract.measurement_window") {
      output[field.field] = pack.placement_contract.measurement_window;
    } else if (field.value) {
      output[field.field] = field.value;
    }
  }

  return output;
}

function buildDeepLink(
  pack: GrowthPack,
  candidate: {
    member_id: string;
    outbound_id: string;
    cohort_id: string;
  },
): { pathname: string; params: Record<string, string> } {
  let pathname = "/today";
  const params: Record<string, string> = {};

  for (const field of pack.deep_link_fields) {
    if (field.field === "pathname" && field.value) {
      pathname = field.value;
      continue;
    }

    if (field.source === "candidate.member_id") {
      params[field.field] = candidate.member_id;
    } else if (field.source === "candidate.outbound_id") {
      params[field.field] = candidate.outbound_id;
    } else if (field.source === "placement_contract.placement_id") {
      params[field.field] = pack.placement_contract.placement_id;
    } else if (field.source === "candidate.cohort_id") {
      params[field.field] = candidate.cohort_id;
    } else if (field.value) {
      params[field.field] = field.value;
    }
  }

  return { pathname, params };
}

export function buildFitnessGrowthShadowReport(options: {
  receiptRoot: string;
  growthPack?: GrowthPack;
}): FitnessGrowthShadowReport {
  const growthPack = options.growthPack ?? loadFitnessGrowthPack();
  const metricsPack = loadFitnessWave2MetricsPack();
  const dashboardPack = loadFitnessFunnelDashboardPack();
  const dashboardReport = buildFitnessDashboardReport({
    receiptRoot: options.receiptRoot,
    metricsPack,
    dashboardPack,
  });
  const receipts = readAcceptedShadowWarehouseReceipts(options.receiptRoot);

  const weeklyProgressSnapshots = indexByKey(
    receipts.filter((receipt) => receipt.event.event_kind === "snapshot" && receipt.event.event_type === "weekly_progress_state"),
    (receipt) => {
      const memberId = readCorrelation(receipt, "member_id") ?? readPayloadString(receipt, "memberId");
      const weekStartDate = readCorrelation(receipt, "week_start_date") ?? readPayloadString(receipt, "weekStartDate");
      return memberId && weekStartDate ? buildMemberWeekKey(memberId, weekStartDate) : null;
    },
  );

  const weeklyGoalHits = indexByKey(
    receipts.filter((receipt) => receipt.event.event_kind === "signal" && receipt.event.event_type === "weekly_goal_hit"),
    (receipt) => {
      const memberId = readCorrelation(receipt, "member_id") ?? readPayloadString(receipt, "memberId");
      const weekStartDate = readCorrelation(receipt, "week_start_date") ?? readPayloadString(receipt, "weekStartDate");
      return memberId && weekStartDate ? buildMemberWeekKey(memberId, weekStartDate) : null;
    },
  );

  const recoveryGuardrailReceipts = indexByKey(
    receipts.filter((receipt) => receipt.event.event_kind === "receipt" && receipt.event.event_type === "recovery_guardrail_applied"),
    (receipt) => readCorrelation(receipt, "member_id") ?? readPayloadString(receipt, "memberId"),
  );

  const scheduleAdjustments = indexByKey(
    receipts.filter((receipt) => receipt.event.event_kind === "receipt" && receipt.event.event_type === "schedule_adjustment_applied"),
    (receipt) => readCorrelation(receipt, "member_id") ?? readPayloadString(receipt, "memberId"),
  );

  const recoveryReceiptsByOutbound = indexByKey(
    receipts.filter((receipt) => receipt.event.event_kind === "receipt" && receipt.event.event_type === "recovery_guardrail_applied"),
    (receipt) => readCorrelation(receipt, "source_outbound_id") ?? readPayloadString(receipt, "sourceOutboundId"),
  );

  const candidates = receipts
    .filter(
      (receipt) =>
        receipt.event.event_kind === growthPack.placement_contract.trigger.event_kind
        && receipt.event.event_type === growthPack.placement_contract.trigger.event_type,
    )
    .sort((left, right) => left.event.occurred_at.localeCompare(right.event.occurred_at))
    .map<PlacementCandidate>((receipt) => {
      const memberId = readCorrelation(receipt, "member_id") ?? readPayloadString(receipt, "memberId") ?? "";
      const outboundId = readCorrelation(receipt, "outbound_id") ?? "";
      const observedDay = toIsoDate(readPayloadString(receipt, "observedAt") ?? receipt.event.occurred_at);
      const weekStartDate = startOfIsoWeek(observedDay);
      const weeklyProgress = latestAtOrBefore(
        weeklyProgressSnapshots.get(buildMemberWeekKey(memberId, weekStartDate)),
        receipt.event.occurred_at,
      );
      const warningLevel = readPayloadString(receipt, "warningLevel");

      const eligibleRuleIdsMet: string[] = [];
      const ineligibilityReasons: string[] = [];

      if (memberId.length > 0 && outboundId.length > 0 && (warningLevel === "warning" || warningLevel === "critical")) {
        eligibleRuleIdsMet.push("actionable_recovery_warning");
      } else {
        ineligibilityReasons.push("actionable_recovery_warning");
      }

      const plannedWorkoutCount = weeklyProgress ? readPayloadNumber(weeklyProgress, "plannedWorkoutCount") ?? 0 : 0;
      const completedWorkoutCount = weeklyProgress ? readPayloadNumber(weeklyProgress, "completedWorkoutCount") ?? 0 : 0;
      if (weeklyProgress && plannedWorkoutCount > 0 && completedWorkoutCount < plannedWorkoutCount) {
        eligibleRuleIdsMet.push("open_weekly_progress_window");
      } else {
        ineligibilityReasons.push("open_weekly_progress_window");
      }

      const suppressionRuleIds: string[] = [];
      if (hasEventWithinWindow(recoveryGuardrailReceipts.get(memberId), {
        candidateIso: receipt.event.occurred_at,
        maxAgeHours: 72,
      })) {
        suppressionRuleIds.push("skip_if_recent_recovery_guardrail_exists");
      }

      if (hasEventWithinWindow(weeklyGoalHits.get(buildMemberWeekKey(memberId, weekStartDate)), {
        candidateIso: receipt.event.occurred_at,
        sameWeek: weekStartDate,
      })) {
        suppressionRuleIds.push("skip_if_weekly_goal_already_hit");
      }

      if (hasEventWithinWindow(scheduleAdjustments.get(memberId), {
        candidateIso: receipt.event.occurred_at,
        maxAgeDays: 7,
      })) {
        suppressionRuleIds.push("skip_if_recent_schedule_adjustment_exists");
      }

      const cohort = assignArm(growthPack, memberId, weekStartDate);
      const eligible = ineligibilityReasons.length === 0;
      const placementStatus: CandidateStatus = !eligible
        ? "ineligible"
        : suppressionRuleIds.length > 0
          ? "suppressed"
          : cohort.placement_enabled
            ? "shadow_placed"
            : "shadow_control";

      const convertedOnPrimaryReceipt = hasEventAfter(
        recoveryReceiptsByOutbound.get(outboundId),
        receipt.event.occurred_at,
        7,
      );

      const attribution = buildAttribution(growthPack, {
        member_id: memberId,
        outbound_id: outboundId,
        week_start_date: weekStartDate,
        cohort_id: cohort.cohort_id,
        experiment_arm: cohort.arm_id,
      });

      return {
        placement_id: growthPack.placement_contract.placement_id,
        member_id: memberId,
        source_outbound_id: outboundId,
        week_start_date: weekStartDate,
        observed_day: observedDay,
        trigger_occurred_at: receipt.event.occurred_at,
        experiment_arm: cohort.arm_id,
        cohort_id: cohort.cohort_id,
        cohort_bucket: cohort.bucket,
        eligible_rule_ids_met: eligibleRuleIdsMet,
        ineligibility_reasons: ineligibilityReasons,
        suppression_rule_ids: suppressionRuleIds,
        placement_status: placementStatus,
        attribution,
        deep_link: buildDeepLink(growthPack, {
          member_id: memberId,
          outbound_id: outboundId,
          cohort_id: cohort.cohort_id,
        }),
        converted_on_primary_receipt: placementStatus === "shadow_placed" && convertedOnPrimaryReceipt,
      };
    });

  const summary = {
    candidate_count: candidates.length,
    eligible_count: candidates.filter((candidate) => candidate.ineligibility_reasons.length === 0).length,
    suppressed_count: candidates.filter((candidate) => candidate.placement_status === "suppressed").length,
    control_count: candidates.filter((candidate) => candidate.placement_status === "shadow_control").length,
    placed_count: candidates.filter((candidate) => candidate.placement_status === "shadow_placed").length,
    attributed_conversion_count: candidates.filter((candidate) => candidate.converted_on_primary_receipt).length,
  };

  const recoveryWarningStageCount =
    dashboardReport.funnels.find((funnel) => funnel.funnel_id === "recovery_guardrail_funnel")
      ?.stage_counts.find((stage) => stage.stage_id === "recovery_warning")
      ?.count ?? 0;
  const recoveryGuardrailRate = dashboardReport.kpis.find((kpi) => kpi.kpi_id === "recovery_guardrail_application_rate");
  const requiredAttributionFields = growthPack.attribution_fields.filter((field) => field.required).map((field) => field.field);

  const acceptance_checks = growthPack.acceptance_checks.map((check) => {
    const details: string[] = [];
    let passed = true;

    if (check.check_id === "growth-pack-stays-pinned-to-frozen-wave-2-packs") {
      const expectedVersions = [metricsPack.pack_version, dashboardPack.pack_version];
      passed = expectedVersions.every((version) => growthPack.consumer_of_pack_versions.includes(version));
      details.push(`consumer_of_pack_versions=${growthPack.consumer_of_pack_versions.join(",")}`);
      details.push(`expected_versions=${expectedVersions.join(",")}`);
    } else if (check.check_id === "shadow-placement-stays-inside-recovery-warning-stage") {
      const scopedCandidates = summary.placed_count + summary.suppressed_count + summary.control_count;
      passed = scopedCandidates <= recoveryWarningStageCount;
      details.push(`scoped_candidates=${scopedCandidates}`);
      details.push(`recovery_warning_stage_count=${recoveryWarningStageCount}`);
    } else if (check.check_id === "suppression-rules-fire-before-shadow-placement") {
      const bypassed = candidates.filter(
        (candidate) => candidate.placement_status === "shadow_placed" && candidate.suppression_rule_ids.length > 0,
      );
      passed = bypassed.length === 0 && growthPack.placement_contract.mode === "shadow_only";
      details.push(`shadow_placed_with_suppression=${bypassed.length}`);
      details.push(`placement_mode=${growthPack.placement_contract.mode}`);
    } else if (check.check_id === "attribution-fields-cover-frozen-joins") {
      const missing = candidates
        .filter((candidate) => candidate.placement_status === "shadow_placed")
        .flatMap((candidate) =>
          requiredAttributionFields
            .filter((field) => !candidate.attribution[field] || candidate.attribution[field].length === 0)
            .map((field) => `${candidate.member_id}:${field}`),
        );
      passed = missing.length === 0 && summary.attributed_conversion_count <= (recoveryGuardrailRate?.denominator ?? 0);
      details.push(`missing_required_attribution_fields=${missing.length}`);
      details.push(`attributed_conversion_count=${summary.attributed_conversion_count}`);
      details.push(`dashboard_recovery_guardrail_denominator=${recoveryGuardrailRate?.denominator ?? 0}`);
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

  return {
    pack_id: growthPack.pack_id,
    pack_version: growthPack.pack_version,
    consumer_of_pack_versions: growthPack.consumer_of_pack_versions,
    warehouse_receipt_count: receipts.length,
    placement_contract: {
      placement_id: growthPack.placement_contract.placement_id,
      label: growthPack.placement_contract.label,
      surface_id: growthPack.placement_contract.surface_id,
      mode: growthPack.placement_contract.mode,
      success_kpi_ids: growthPack.placement_contract.success_kpi_ids,
    },
    baseline_dashboard: {
      pack_id: dashboardReport.pack_id,
      pack_version: dashboardReport.pack_version,
      recovery_warning_stage_count: recoveryWarningStageCount,
      recovery_guardrail_application_rate: {
        numerator: recoveryGuardrailRate?.numerator ?? 0,
        denominator: recoveryGuardrailRate?.denominator ?? 0,
        value: recoveryGuardrailRate?.value ?? null,
      },
    },
    summary,
    candidates,
    acceptance_checks,
  };
}
