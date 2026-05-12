import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type WarehouseEventKind = "signal" | "snapshot" | "receipt";

type WarehouseReceipt = {
  receipt_version: string;
  event: {
    contract_version: string;
    event_kind: WarehouseEventKind;
    event_type: string;
    occurred_at: string;
    correlation: Record<string, string | undefined>;
    payload: Record<string, string | number | boolean>;
  };
  schema: {
    schema_ref: string;
  };
  processing: {
    accepted: boolean;
    status: "accepted" | "rejected";
    errors: readonly string[];
  };
};

type MetricsPack = {
  pack_id: string;
  pack_version: string;
  funnel_definitions: Array<{
    funnel_id: string;
    label: string;
    stages: Array<{
      stage_id: string;
      event_kind: WarehouseEventKind;
      event_type: string;
      correlation_keys: string[];
      denominator_id: string;
    }>;
  }>;
  kpis: Array<{
    kpi_id: string;
    label: string;
    unit: string;
    denominator_id: string;
    funnel_id: string;
  }>;
  dashboard_acceptance_checks: Array<{
    check_id: string;
    description: string;
    funnel_ids: string[];
    kpi_ids: string[];
    criteria: string[];
  }>;
};

type DashboardFilter = {
  field: string;
  operator: ">" | ">=" | "=";
  value: string | number | boolean;
};

type DashboardPack = {
  pack_id: string;
  pack_version: string;
  consumer_of_pack_version: string;
  selected_funnels: string[];
  selected_kpis: string[];
  dashboard_views: Array<{
    view_id: string;
    label: string;
    funnel_id: string;
    kpi_ids: string[];
    default_window: string;
  }>;
  warehouse_queries: {
    denominators: Array<{
      denominator_id: string;
      event_kind: WarehouseEventKind;
      event_types: string[];
      correlation_keys: string[];
      filters?: DashboardFilter[];
    }>;
    numerators: Array<{
      kpi_id: string;
      event_kind: WarehouseEventKind;
      event_types: string[];
      correlation_keys: string[];
      denominator_id: string;
      requires_lineage_match_to?: string;
    }>;
  };
  acceptance_checks: Array<{
    check_id: string;
    metrics_pack_check_id: string;
    description: string;
    expected_relations: string[];
  }>;
};

export type FitnessDashboardReport = {
  pack_id: string;
  pack_version: string;
  consumer_of_pack_version: string;
  warehouse_receipt_count: number;
  kpis: Array<{
    kpi_id: string;
    label: string;
    numerator: number;
    denominator: number;
    value: number | null;
    unit: string;
  }>;
  funnels: Array<{
    funnel_id: string;
    label: string;
    stage_counts: Array<{
      stage_id: string;
      event_kind: WarehouseEventKind;
      event_type: string;
      count: number;
    }>;
  }>;
  dashboard_views: DashboardPack["dashboard_views"];
  acceptance_checks: Array<{
    check_id: string;
    passed: boolean;
    details: string[];
  }>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const eventContractRoot = path.join(repoRoot, "truth-pack", "fitness", "event-contract");
const metricsPackPath = path.join(eventContractRoot, "atlas-fitness-wave-2-metrics-pack.v1.json");
const dashboardPackPath = path.join(eventContractRoot, "atlas-fitness-funnel-dashboard-pack.v1.json");

function loadJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function loadFitnessWave2MetricsPack(): MetricsPack {
  return loadJson<MetricsPack>(metricsPackPath);
}

export function loadFitnessFunnelDashboardPack(): DashboardPack {
  return loadJson<DashboardPack>(dashboardPackPath);
}

function getNestedValue(payload: Record<string, string | number | boolean>, field: string): string | number | boolean | undefined {
  const [, key] = field.split(".", 2);
  if (!key) {
    return undefined;
  }

  return payload[key];
}

function filterMatches(receipt: WarehouseReceipt, filters: readonly DashboardFilter[] | undefined): boolean {
  if (!filters || filters.length === 0) {
    return true;
  }

  return filters.every((filter) => {
    const value = getNestedValue(receipt.event.payload, filter.field);

    if (filter.operator === "=") {
      return value === filter.value;
    }

    if (typeof value !== "number" || typeof filter.value !== "number") {
      return false;
    }

    if (filter.operator === ">") {
      return value > filter.value;
    }

    return value >= filter.value;
  });
}

function deriveCorrelationValue(receipt: WarehouseReceipt, key: string): string | null {
  const correlation = receipt.event.correlation;
  const payload = receipt.event.payload;

  if (key === "member_id") {
    return correlation.member_id ?? (typeof payload.memberId === "string" ? payload.memberId : null);
  }

  if (key === "session_id") {
    return correlation.session_id ?? (typeof payload.sessionId === "string" ? payload.sessionId : null);
  }

  if (key === "week_start_date") {
    return correlation.week_start_date ?? (typeof payload.weekStartDate === "string" ? payload.weekStartDate : null);
  }

  if (key === "outbound_id") {
    return correlation.outbound_id ?? null;
  }

  if (key === "source_outbound_id") {
    return correlation.source_outbound_id ?? (typeof payload.sourceOutboundId === "string" ? payload.sourceOutboundId : null);
  }

  if (key === "observed_day") {
    const raw =
      (typeof payload.observedAt === "string" ? payload.observedAt : null)
      ?? (typeof payload.capturedAt === "string" ? payload.capturedAt : null)
      ?? (typeof payload.appliedAt === "string" ? payload.appliedAt : null)
      ?? receipt.event.occurred_at;

    return raw.slice(0, 10);
  }

  return null;
}

function serializeCorrelationKey(receipt: WarehouseReceipt, correlationKeys: readonly string[]): string | null {
  const values = correlationKeys.map((key) => deriveCorrelationValue(receipt, key));
  if (values.some((value) => value === null || value === "")) {
    return null;
  }

  return values.join("::");
}

function listWarehouseReceiptFiles(receiptRoot: string): string[] {
  if (!fs.existsSync(receiptRoot)) {
    return [];
  }

  const files: string[] = [];
  for (const entry of fs.readdirSync(receiptRoot, { withFileTypes: true })) {
    const fullPath = path.join(receiptRoot, entry.name);
    if (entry.isDirectory()) {
      files.push(...listWarehouseReceiptFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json") && entry.name !== "latest.json") {
      files.push(fullPath);
    }
  }

  return files;
}

export function readAcceptedShadowWarehouseReceipts(receiptRoot: string): WarehouseReceipt[] {
  return listWarehouseReceiptFiles(receiptRoot)
    .map((filePath) => loadJson<WarehouseReceipt>(filePath))
    .filter((receipt) => receipt.processing.accepted && receipt.processing.status === "accepted");
}

function collectDistinctKeys(
  receipts: readonly WarehouseReceipt[],
  options: {
    event_kind: WarehouseEventKind;
    event_types: readonly string[];
    correlation_keys: readonly string[];
    filters?: readonly DashboardFilter[];
  },
): Set<string> {
  const keys = new Set<string>();

  for (const receipt of receipts) {
    if (receipt.event.event_kind !== options.event_kind) {
      continue;
    }

    if (!options.event_types.includes(receipt.event.event_type)) {
      continue;
    }

    if (!filterMatches(receipt, options.filters)) {
      continue;
    }

    const serialized = serializeCorrelationKey(receipt, options.correlation_keys);
    if (serialized) {
      keys.add(serialized);
    }
  }

  return keys;
}

export function buildFitnessDashboardReport(options: {
  receiptRoot: string;
  metricsPack?: MetricsPack;
  dashboardPack?: DashboardPack;
}): FitnessDashboardReport {
  const metricsPack = options.metricsPack ?? loadFitnessWave2MetricsPack();
  const dashboardPack = options.dashboardPack ?? loadFitnessFunnelDashboardPack();
  const receipts = readAcceptedShadowWarehouseReceipts(options.receiptRoot);

  const denominatorCounts = new Map<string, number>();
  const denominatorKeysById = new Map<string, Set<string>>();

  for (const denominator of dashboardPack.warehouse_queries.denominators) {
    const keys = collectDistinctKeys(receipts, denominator);
    denominatorKeysById.set(denominator.denominator_id, keys);
    denominatorCounts.set(denominator.denominator_id, keys.size);
  }

  const funnels = metricsPack.funnel_definitions
    .filter((funnel) => dashboardPack.selected_funnels.includes(funnel.funnel_id))
    .map((funnel) => ({
      funnel_id: funnel.funnel_id,
      label: funnel.label,
      stage_counts: funnel.stages.map((stage) => ({
        stage_id: stage.stage_id,
        event_kind: stage.event_kind,
        event_type: stage.event_type,
        count: collectDistinctKeys(receipts, {
          event_kind: stage.event_kind,
          event_types: [stage.event_type],
          correlation_keys: stage.correlation_keys,
        }).size,
      })),
    }));

  const recoveryWarningLineage = denominatorKeysById.get("recovery_warning_lineage_window") ?? new Set<string>();

  const kpis = metricsPack.kpis
    .filter((kpi) => dashboardPack.selected_kpis.includes(kpi.kpi_id))
    .map((kpi) => {
      const numeratorQuery = dashboardPack.warehouse_queries.numerators.find((entry) => entry.kpi_id === kpi.kpi_id);
      if (!numeratorQuery) {
        throw new Error(`Missing dashboard numerator query for KPI '${kpi.kpi_id}'`);
      }

      let numeratorKeys = collectDistinctKeys(receipts, numeratorQuery);
      if (numeratorQuery.requires_lineage_match_to) {
        numeratorKeys = new Set([...numeratorKeys].filter((value) => recoveryWarningLineage.has(value)));
      }

      const numerator = numeratorKeys.size;
      const denominator = denominatorCounts.get(kpi.denominator_id) ?? 0;
      return {
        kpi_id: kpi.kpi_id,
        label: kpi.label,
        numerator,
        denominator,
        value: denominator === 0 ? null : Number((numerator / denominator).toFixed(4)),
        unit: kpi.unit,
      };
    });

  const stageCount = (funnelId: string, stageId: string): number => {
    const funnel = funnels.find((entry) => entry.funnel_id === funnelId);
    const stage = funnel?.stage_counts.find((entry) => entry.stage_id === stageId);
    return stage?.count ?? 0;
  };

  const kpiValue = (kpiId: string) => kpis.find((entry) => entry.kpi_id === kpiId);

  const acceptance_checks = dashboardPack.acceptance_checks.map((check) => {
    const details: string[] = [];
    let passed = true;

    if (check.check_id === "weekly-goal-hit-denominator-match") {
      const denominator = kpiValue("weekly_goal_hit_rate")?.denominator ?? 0;
      const stage = stageCount("weekly_adherence_funnel", "weekly_progress_state_available");
      passed = denominator === stage;
      details.push(`weekly_goal_hit_rate denominator=${denominator}`);
      details.push(`weekly_progress_state_available count=${stage}`);
    } else if (check.check_id === "session-outcome-denominator-match") {
      const denominator = kpiValue("workout_completion_rate")?.denominator ?? 0;
      const expected = denominatorCounts.get("tracked_session_outcome_window") ?? 0;
      passed = denominator === expected;
      details.push(`workout_completion_rate denominator=${denominator}`);
      details.push(`tracked_session_outcome_window count=${expected}`);
    } else if (check.check_id === "recovery-lineage-match") {
      const numerator = kpiValue("recovery_guardrail_application_rate")?.numerator ?? 0;
      const denominator = kpiValue("recovery_guardrail_application_rate")?.denominator ?? 0;
      passed = numerator <= denominator;
      details.push(`recovery_guardrail_application_rate numerator=${numerator}`);
      details.push(`recovery_guardrail_application_rate denominator=${denominator}`);
    } else {
      details.push("No executable relation registered for this check.");
      passed = false;
    }

    return {
      check_id: check.check_id,
      passed,
      details,
    };
  });

  return {
    pack_id: dashboardPack.pack_id,
    pack_version: dashboardPack.pack_version,
    consumer_of_pack_version: dashboardPack.consumer_of_pack_version,
    warehouse_receipt_count: receipts.length,
    kpis,
    funnels,
    dashboard_views: dashboardPack.dashboard_views,
    acceptance_checks,
  };
}
