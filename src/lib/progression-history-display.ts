import { formatDateTime } from "@/lib/datetime";
import { formatDateShort } from "@/lib/formatting";
import {
  bucketProgressionEventsByTime,
  getTopProgressedExercisesByPromotionCount,
  summarizeProgressionEventAnalytics,
  summarizeProgressionEventNumericDeltas,
  sortProgressionEventsNewestFirst,
  type ProgressionAnalyticsEvent,
} from "@/lib/progression-event-analytics";
import {
  buildProgressionHistoryActiveFilterLabels,
  DEFAULT_PROGRESSION_HISTORY_FILTERS,
  getProgressionHistoryEventTypeLabel,
  type ProgressionHistoryFilters,
  type ProgressionHistoryFilterOptions,
} from "@/lib/progression-history-filters";
import { formatProgressionReviewTargetLabel } from "@/lib/progression-review-display";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";

export type ProgressionHistorySummaryCard = {
  label: string;
  value: string;
  detail?: string | null;
  tone?: "default" | "success" | "danger" | "muted";
};

export type ProgressionDashboardCard = {
  id: string;
  label: string;
  value: string;
  detail?: string | null;
  caption?: string | null;
  tone?: "default" | "success" | "danger" | "muted";
};

export type ProgressionHistoryChartBar = {
  id: string;
  label: string;
  value: number;
  valueLabel: string;
  detail?: string | null;
};

export type ProgressionHistoryChartSection = {
  id: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyCaption: string;
  bars: ProgressionHistoryChartBar[];
};

export type ProgressionHistoryDisplayRow = {
  id: string;
  eventTypeValue: ProgressionAnalyticsEvent["event_type"];
  eventTypeLabel: string;
  eventTypeTone: "default" | "success" | "warning" | "destructive";
  createdAtLabel: string;
  createdAtFullLabel: string;
  exerciseName: string;
  routineName: string | null;
  fromTargetLabel: string | null;
  toTargetLabel: string | null;
  targetChangeSummary: string;
  methodLabel: string;
  vectorLabel: string;
  stepSummary: string | null;
  reason: string | null;
  sourceSessionId: string | null;
};

export type ProgressionHistoryDisplayModel = {
  dashboardCards: ProgressionDashboardCard[];
  chartSections: ProgressionHistoryChartSection[];
  summaryCards: ProgressionHistorySummaryCard[];
  rows: ProgressionHistoryDisplayRow[];
  filters: ProgressionHistoryFilters;
  filterOptions: ProgressionHistoryFilterOptions;
  activeFilterLabels: string[];
  hasActiveFilters: boolean;
  filteredEventCount: number;
  totalEventCount: number;
};

type ProgressionHistoryDisplayArgs = {
  events: ProgressionAnalyticsEvent[];
  routineNameById?: Map<string, string>;
  exerciseNameById?: Map<string, string>;
  filters?: ProgressionHistoryFilters;
  filterOptions?: ProgressionHistoryFilterOptions;
  totalEventCount?: number;
};

const KNOWN_MEASUREMENT_TYPES = new Set<ProgressionTargetPlan["measurementType"]>([
  "reps",
  "time",
  "distance",
  "time_distance",
  "none",
]);

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeWeightUnit(value: unknown) {
  return value === "kg" || value === "lbs" ? value : null;
}

function normalizeDistanceUnit(value: unknown) {
  return value === "mi" || value === "km" || value === "m" ? value : null;
}

function prettifyKey(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSignedNumber(value: number) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function toProgressionTargetPlan(snapshot: Record<string, unknown> | null | undefined): ProgressionTargetPlan | null {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  const measurementType = snapshot.measurementType;
  return {
    measurementType: KNOWN_MEASUREMENT_TYPES.has(measurementType as ProgressionTargetPlan["measurementType"])
      ? measurementType as ProgressionTargetPlan["measurementType"]
      : "reps",
    setsMin: normalizeNumber(snapshot.setsMin),
    setsMax: normalizeNumber(snapshot.setsMax),
    repsTarget: normalizeNumber(snapshot.repsTarget),
    repsMin: normalizeNumber(snapshot.repsMin),
    repsMax: normalizeNumber(snapshot.repsMax),
    weightMin: normalizeNumber(snapshot.weightMin),
    weightMax: normalizeNumber(snapshot.weightMax),
    weightUnit: normalizeWeightUnit(snapshot.weightUnit),
    durationSeconds: normalizeNumber(snapshot.durationSeconds),
    distance: normalizeNumber(snapshot.distance),
    distanceUnit: normalizeDistanceUnit(snapshot.distanceUnit),
    calories: normalizeNumber(snapshot.calories),
  };
}

function formatVectorLabel(vector: string) {
  switch (vector) {
    case "coupled_load_reps":
      return "Load + reps";
    case "coupled_duration_distance":
      return "Duration + distance";
    case "load":
      return "Load";
    case "reps":
      return "Reps";
    case "duration":
      return "Duration";
    case "distance":
      return "Distance";
    case "none":
      return "Manual";
    default:
      return prettifyKey(vector);
  }
}

function formatEventTypeTone(eventType: ProgressionAnalyticsEvent["event_type"]): ProgressionHistoryDisplayRow["eventTypeTone"] {
  switch (eventType) {
    case "promotion_applied":
      return "success";
    case "promotion_reverted":
      return "destructive";
    case "deload_applied":
      return "warning";
    case "manual_target_change":
      return "default";
    case "lock_in":
      return "default";
    case "review_acknowledged":
      return "default";
    default:
      return "default";
  }
}

function formatStepSummary(event: ProgressionAnalyticsEvent) {
  const deltas = summarizeProgressionEventNumericDeltas(event);
  const parts = [
    deltas.weight ? `${formatSignedNumber(deltas.weight.delta)} ${deltas.weight.unit ?? "weight"}` : null,
    deltas.reps ? `${formatSignedNumber(deltas.reps.delta)} reps` : null,
    deltas.durationSeconds ? `${formatSignedNumber(deltas.durationSeconds.delta)} sec` : null,
    deltas.distance ? `${formatSignedNumber(deltas.distance.delta)} ${deltas.distance.unit ?? "distance"}` : null,
    deltas.sets ? `${formatSignedNumber(deltas.sets.delta)} sets` : null,
    deltas.calories ? `${formatSignedNumber(deltas.calories.delta)} cal` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" | ") : null;
}

function toHistoryCardTone(tone: ProgressionHistoryDisplayRow["eventTypeTone"]): ProgressionDashboardCard["tone"] {
  switch (tone) {
    case "success":
      return "success";
    case "destructive":
      return "danger";
    case "warning":
      return "danger";
    default:
      return "default";
  }
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatMonthBucketLabel(bucket: string) {
  const [year, month] = bucket.split("-");
  const parsedYear = Number.parseInt(year ?? "", 10);
  const parsedMonth = Number.parseInt(month ?? "", 10);
  if (!Number.isInteger(parsedYear) || !Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    return bucket;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parsedYear, parsedMonth - 1, 1)));
}

function getLatestProgressionHistoryCard(args: {
  events: ProgressionAnalyticsEvent[];
  routineNameById?: Map<string, string>;
  exerciseNameById?: Map<string, string>;
}): ProgressionDashboardCard {
  const latestEvent = sortProgressionEventsNewestFirst(args.events)[0] ?? null;
  if (!latestEvent) {
    return {
      id: "latest-change",
      label: "Latest change",
      value: "No changes yet",
      detail: "The ledger starts after the first applied progression change.",
      caption: null,
      tone: "muted",
    };
  }

  const latestRow = buildProgressionHistoryDisplayRow({
    event: latestEvent,
    routineNameById: args.routineNameById,
    exerciseNameById: args.exerciseNameById,
  });

  return {
    id: "latest-change",
    label: "Latest change",
    value: latestRow.exerciseName,
    detail: latestRow.eventTypeLabel,
    caption: latestRow.createdAtLabel,
    tone: toHistoryCardTone(latestRow.eventTypeTone),
  };
}

function getMostActiveCountCard(args: {
  id: string;
  label: string;
  topEntry?: { key: string; count: number } | null;
  formatValue: (value: string) => string;
  emptyValue: string;
  emptyDetail: string;
}): ProgressionDashboardCard {
  if (!args.topEntry) {
    return {
      id: args.id,
      label: args.label,
      value: args.emptyValue,
      detail: args.emptyDetail,
      caption: null,
      tone: "muted",
    };
  }

  return {
    id: args.id,
    label: args.label,
    value: args.formatValue(args.topEntry.key),
    detail: countLabel(args.topEntry.count, "event"),
    caption: null,
    tone: "default",
  };
}

function toChartBarsFromCountEntries(args: {
  entries: Array<{ key: string; count: number }>;
  formatLabel: (value: string) => string;
  detail?: (entry: { key: string; count: number }) => string | null;
  limit?: number;
}) {
  return args.entries
    .slice(0, Math.max(0, args.limit ?? args.entries.length))
    .map((entry) => ({
      id: entry.key,
      label: args.formatLabel(entry.key),
      value: entry.count,
      valueLabel: countLabel(entry.count, "event"),
      detail: args.detail?.(entry) ?? null,
    }));
}

export function buildProgressionHistoryChartSections(args: ProgressionHistoryDisplayArgs): ProgressionHistoryChartSection[] {
  const summary = summarizeProgressionEventAnalytics(args.events);
  const monthlyBuckets = bucketProgressionEventsByTime({
    events: args.events,
    granularity: "month",
    timeZone: "UTC",
  });
  const monthlyBars = monthlyBuckets
    .slice(-6)
    .map((bucket) => ({
      id: bucket.bucket,
      label: formatMonthBucketLabel(bucket.bucket),
      value: bucket.count,
      valueLabel: countLabel(bucket.count, "event"),
      detail: bucket.eventIds.length > 0 ? `${bucket.eventIds.length} ledger entr${bucket.eventIds.length === 1 ? "y" : "ies"}` : null,
    }));

  const eventMixBars = toChartBarsFromCountEntries({
    entries: summary.byType,
    formatLabel: (value) => getProgressionHistoryEventTypeLabel(value as ProgressionAnalyticsEvent["event_type"]),
    limit: 5,
  });

  const promotionBars = getTopProgressedExercisesByPromotionCount(args.events, 5).map((entry) => ({
    id: entry.exerciseId,
    label: args.exerciseNameById?.get(entry.exerciseId) ?? "Exercise",
    value: entry.promotionCount,
    valueLabel: countLabel(entry.promotionCount, "promotion"),
    detail: null,
  }));

  const vectorBars = toChartBarsFromCountEntries({
    entries: summary.byVector,
    formatLabel: formatVectorLabel,
    detail: (entry) => (entry.key ? null : "Unknown vector"),
    limit: 5,
  });

  return [
    {
      id: "monthly-activity",
      title: "Monthly activity",
      description: "Ledger event volume by month for the current filtered result set.",
      emptyTitle: "No monthly activity yet.",
      emptyCaption: "Applied changes will start the trend once progression events are recorded.",
      bars: monthlyBars,
    },
    {
      id: "event-mix",
      title: "Event mix",
      description: "Distribution of progression event types in the visible ledger slice.",
      emptyTitle: "No event mix yet.",
      emptyCaption: "Event type distribution appears after the first progression ledger entry.",
      bars: eventMixBars,
    },
    {
      id: "top-promotions",
      title: "Top promotions",
      description: "Exercises with the most applied promotions in the current filtered result set.",
      emptyTitle: "No promotions yet.",
      emptyCaption: "Promotion rankings appear after the first applied promotion event.",
      bars: promotionBars,
    },
    {
      id: "vector-distribution",
      title: "Progression vectors",
      description: "Which vectors are driving the current filtered history.",
      emptyTitle: "No vector data yet.",
      emptyCaption: "Vector distribution appears after the first progression ledger entry.",
      bars: vectorBars,
    },
  ];
}

export function buildProgressionHistoryDashboardCards(args: ProgressionHistoryDisplayArgs): ProgressionDashboardCard[] {
  const summary = summarizeProgressionEventAnalytics(args.events);
  const topExercise = getTopProgressedExercisesByPromotionCount(args.events, 1)[0] ?? null;
  const topExerciseName = topExercise
    ? args.exerciseNameById?.get(topExercise.exerciseId) ?? "Exercise"
    : "None yet";
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthlyBuckets = bucketProgressionEventsByTime({
    events: args.events,
    granularity: "month",
    timeZone: "UTC",
  });
  const currentMonthCount = monthlyBuckets.find((bucket) => bucket.bucket === currentMonthKey)?.count ?? 0;

  return [
    {
      id: "total-events",
      label: "Total events",
      value: String(summary.totalEvents),
      detail: summary.totalEvents > 0 ? "Durable ledger entries" : "No progression changes recorded yet",
      caption: null,
      tone: summary.totalEvents > 0 ? "default" : "muted",
    },
    {
      id: "promotions-applied",
      label: "Promotions applied",
      value: String(summary.promotionsAppliedCount),
      detail: countLabel(summary.promotionsAppliedCount, "promotion"),
      caption: null,
      tone: summary.promotionsAppliedCount > 0 ? "success" : "muted",
    },
    {
      id: "top-progressed",
      label: "Top progressed",
      value: topExerciseName,
      detail: topExercise ? countLabel(topExercise.promotionCount, "promotion") : "No promotions yet",
      caption: null,
      tone: topExercise ? "success" : "muted",
    },
    getLatestProgressionHistoryCard(args),
    {
      id: "deloads-applied",
      label: "Deloads applied",
      value: String(summary.deloadsAppliedCount),
      detail: countLabel(summary.deloadsAppliedCount, "deload"),
      caption: null,
      tone: summary.deloadsAppliedCount > 0 ? "danger" : "muted",
    },
    {
      id: "manual-target-changes",
      label: "Manual target changes",
      value: String(summary.manualTargetChangesCount),
      detail: countLabel(summary.manualTargetChangesCount, "manual change"),
      caption: null,
      tone: summary.manualTargetChangesCount > 0 ? "default" : "muted",
    },
    getMostActiveCountCard({
      id: "most-active-vector",
      label: "Most active vector",
      topEntry: summary.byVector[0] ?? null,
      formatValue: formatVectorLabel,
      emptyValue: "No vector data",
      emptyDetail: "Vector counts appear after the first ledger event.",
    }),
    getMostActiveCountCard({
      id: "most-active-method",
      label: "Most active method",
      topEntry: summary.byMethod[0] ?? null,
      formatValue: prettifyKey,
      emptyValue: "No method data",
      emptyDetail: "Method counts appear after the first ledger event.",
    }),
    {
      id: "events-this-month",
      label: "This month",
      value: String(currentMonthCount),
      detail: countLabel(currentMonthCount, "event"),
      caption: currentMonthKey,
      tone: currentMonthCount > 0 ? "default" : "muted",
    },
  ];
}

export function buildProgressionHistoryDisplayRow(args: {
  event: ProgressionAnalyticsEvent;
  routineNameById?: Map<string, string>;
  exerciseNameById?: Map<string, string>;
}): ProgressionHistoryDisplayRow {
  const fromPlan = toProgressionTargetPlan(args.event.from_target);
  const toPlan = toProgressionTargetPlan(args.event.to_target);
  const fromTargetLabel = formatProgressionReviewTargetLabel(fromPlan);
  const toTargetLabel = formatProgressionReviewTargetLabel(toPlan);
  const fallbackTargetSummary = fromTargetLabel && toTargetLabel
    ? `${fromTargetLabel} -> ${toTargetLabel}`
    : toTargetLabel
      ? `To ${toTargetLabel}`
      : fromTargetLabel
        ? `From ${fromTargetLabel}`
        : "Target changed";

  return {
    id: args.event.id,
    eventTypeValue: args.event.event_type,
    eventTypeLabel: getProgressionHistoryEventTypeLabel(args.event.event_type),
    eventTypeTone: formatEventTypeTone(args.event.event_type),
    createdAtLabel: formatDateShort(args.event.created_at),
    createdAtFullLabel: formatDateTime(args.event.created_at),
    exerciseName: args.exerciseNameById?.get(args.event.exercise_id) ?? "Exercise",
    routineName: args.routineNameById?.get(args.event.routine_id) ?? null,
    fromTargetLabel,
    toTargetLabel,
    targetChangeSummary: fallbackTargetSummary,
    methodLabel: prettifyKey(args.event.method),
    vectorLabel: formatVectorLabel(args.event.vector),
    stepSummary: formatStepSummary(args.event),
    reason: args.event.reason?.trim() ? args.event.reason.trim() : null,
    sourceSessionId: args.event.source_session_id ?? null,
  };
}

export function buildProgressionHistorySummaryCards(args: ProgressionHistoryDisplayArgs): ProgressionHistorySummaryCard[] {
  const summary = summarizeProgressionEventAnalytics(args.events);
  const topExercise = getTopProgressedExercisesByPromotionCount(args.events, 1)[0] ?? null;
  const topExerciseName = topExercise
    ? args.exerciseNameById?.get(topExercise.exerciseId) ?? "Exercise"
    : "None yet";

  return [
    { label: "Total events", value: String(summary.totalEvents) },
    { label: "Promotions", value: String(summary.promotionsAppliedCount), tone: "success" },
    { label: "Deloads", value: String(summary.deloadsAppliedCount), tone: summary.deloadsAppliedCount > 0 ? "danger" : "muted" },
    { label: "Manual changes", value: String(summary.manualTargetChangesCount) },
    { label: "Reverts", value: String(summary.revertsCount), tone: summary.revertsCount > 0 ? "danger" : "muted" },
    {
      label: "Top progressed",
      value: topExerciseName,
      detail: topExercise ? `${topExercise.promotionCount} promotion${topExercise.promotionCount === 1 ? "" : "s"}` : "No promotions yet",
      tone: topExercise ? "success" : "muted",
    },
  ];
}

export function buildProgressionHistoryDisplayModel(args: ProgressionHistoryDisplayArgs): ProgressionHistoryDisplayModel {
  const filters = args.filters ?? DEFAULT_PROGRESSION_HISTORY_FILTERS;
  const filterOptions = args.filterOptions ?? {
    eventTypes: [],
    routines: [],
    exercises: [],
  };
  const hasActiveFilters = Boolean(
    filters.eventType
    || filters.routineId
    || filters.exerciseId
    || filters.dateFrom
    || filters.dateTo,
  );

  return {
    dashboardCards: buildProgressionHistoryDashboardCards(args),
    chartSections: buildProgressionHistoryChartSections(args),
    summaryCards: buildProgressionHistorySummaryCards(args),
    rows: sortProgressionEventsNewestFirst(args.events).map((event) => buildProgressionHistoryDisplayRow({
      event,
      routineNameById: args.routineNameById,
      exerciseNameById: args.exerciseNameById,
    })),
    filters,
    filterOptions,
    activeFilterLabels: buildProgressionHistoryActiveFilterLabels({
      filters,
      options: filterOptions,
    }),
    hasActiveFilters,
    filteredEventCount: args.events.length,
    totalEventCount: args.totalEventCount ?? args.events.length,
  };
}
