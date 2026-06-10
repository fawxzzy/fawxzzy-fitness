import type { ProgressionEventRow } from "@/types/db";
import type { DetailSectionListItem } from "@/components/ui/DetailSectionList";
import { formatCalories, formatDistance } from "@/lib/exercise-stats-formatting";
import { formatDurationClock } from "@/lib/duration";
import { formatWeight } from "@/lib/formatting";
import type { ProgressionHistoryChartSection } from "@/lib/progression-history-display";
import { formatProgressionReviewTargetLabel } from "@/lib/progression-review-display";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";
import { buildProgressionSummaryChartSections } from "@/lib/progression-summary-charts";
import { getProgressionEventBucketKey } from "@/lib/progression-event-analytics";

export type ProgressionAnalyticsDigest = {
  eventCount: number;
  promotionCount: number;
  deloadCount: number;
  manualChangeCount: number;
  revertCount: number;
  lockInCount: number;
  linkedSessionCount: number;
  distinctExerciseCount: number;
  firstChangeAt: string | null;
  latestChangeAt: string | null;
  lastPromotionAt: string | null;
};

export type ExerciseProgressionLifelineSummary = ProgressionAnalyticsDigest & {
  firstTargetLabel: string | null;
  currentTargetLabel: string | null;
  latestChangeSummary: string | null;
  latestEventLabel: string | null;
  timelineSummary: string | null;
  recentWindowDays?: number;
  recentEventCount?: number;
  recentPromotionCount?: number;
  recentDeloadCount?: number;
  recentManualChangeCount?: number;
  recentActivitySummary?: string | null;
  recentFocusSummary?: string | null;
  chartSections?: ProgressionHistoryChartSection[];
  activityDays?: ExerciseProgressionActivityDay[];
  lifelineItems: string[];
};

export type ExerciseProgressionActivityDay = {
  id: string;
  label: string;
  detail: string | null;
  valueLabel: string;
  eventCount: number;
  promotionCount: number;
  deloadCount: number;
  manualChangeCount: number;
  revertCount: number;
  items: DetailSectionListItem[];
};

export type SessionProgressionSummary = ProgressionAnalyticsDigest & {
  affectedExerciseNames: string[];
  headline: string | null;
  detail: string | null;
};

const KNOWN_MEASUREMENT_TYPES = new Set<ProgressionTargetPlan["measurementType"]>([
  "reps",
  "time",
  "distance",
  "time_distance",
  "none",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asWeightUnit(value: unknown) {
  return value === "kg" || value === "lbs" ? value : null;
}

function asDistanceUnit(value: unknown) {
  return value === "mi" || value === "km" || value === "m" ? value : null;
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatEventTypeLabel(eventType: ProgressionEventRow["event_type"]) {
  switch (eventType) {
    case "promotion_applied":
      return "Promotion";
    case "promotion_reverted":
      return "Promotion reverted";
    case "deload_applied":
      return "Regression";
    case "manual_target_change":
      return "Manual change";
    case "lock_in":
      return "Lock-in";
    case "review_acknowledged":
      return "Review";
    default:
      return "Update";
  }
}

function sortEventsAscending(events: ProgressionEventRow[]) {
  return [...events].sort((left, right) => {
    if (left.created_at === right.created_at) {
      return left.id.localeCompare(right.id);
    }
    return left.created_at.localeCompare(right.created_at);
  });
}

function toProgressionTargetPlan(snapshot: Record<string, unknown> | null | undefined): ProgressionTargetPlan | null {
  if (!snapshot) {
    return null;
  }

  const measurementType = snapshot.measurementType;
  return {
    measurementType: KNOWN_MEASUREMENT_TYPES.has(measurementType as ProgressionTargetPlan["measurementType"])
      ? measurementType as ProgressionTargetPlan["measurementType"]
      : "reps",
    setsMin: asNumber(snapshot.setsMin),
    setsMax: asNumber(snapshot.setsMax),
    repsTarget: asNumber(snapshot.repsTarget),
    repsMin: asNumber(snapshot.repsMin),
    repsMax: asNumber(snapshot.repsMax),
    weightMin: asNumber(snapshot.weightMin),
    weightMax: asNumber(snapshot.weightMax),
    weightUnit: asWeightUnit(snapshot.weightUnit),
    durationSeconds: asNumber(snapshot.durationSeconds),
    distance: asNumber(snapshot.distance),
    distanceUnit: asDistanceUnit(snapshot.distanceUnit),
    calories: asNumber(snapshot.calories),
  };
}

function formatTarget(snapshot: Record<string, unknown> | null | undefined) {
  return formatProgressionReviewTargetLabel(toProgressionTargetPlan(snapshot ?? null));
}

function getProgressionEventSignal(eventType: ProgressionEventRow["event_type"]) {
  switch (eventType) {
    case "promotion_applied":
      return "promotion" as const;
    case "deload_applied":
      return "regression" as const;
    case "manual_target_change":
    case "promotion_reverted":
      return "watch" as const;
    default:
      return null;
  }
}

const PROGRESSION_FLOW_ARROW = "\u2192";

type TargetPartKey = "reps" | "weight" | "duration" | "distance" | "calories";
type TargetPartEntry = {
  key: TargetPartKey;
  label: string;
  numericValue: number | null;
};

function formatTargetPartName(key: TargetPartKey) {
  switch (key) {
    case "reps":
      return "Reps";
    case "weight":
      return "Weight";
    case "duration":
      return "Duration";
    case "distance":
      return "Distance";
    case "calories":
      return "Calories";
    default:
      return "Target";
  }
}

function buildTargetPartEntries(plan: ProgressionTargetPlan | null): TargetPartEntry[] {
  if (!plan) {
    return [];
  }

  if (plan.measurementType === "reps") {
    const reps = typeof plan.repsTarget === "number" && Number.isFinite(plan.repsTarget) && plan.repsTarget > 0
      ? plan.repsTarget
      : (typeof plan.repsMax === "number" && Number.isFinite(plan.repsMax) && plan.repsMax > 0
          ? plan.repsMax
          : (typeof plan.repsMin === "number" && Number.isFinite(plan.repsMin) && plan.repsMin > 0 ? plan.repsMin : null));
    const weight = typeof plan.weightMax === "number" && Number.isFinite(plan.weightMax) && plan.weightMax > 0
      ? plan.weightMax
      : (typeof plan.weightMin === "number" && Number.isFinite(plan.weightMin) && plan.weightMin > 0 ? plan.weightMin : null);
    const repsLabel = typeof reps === "number"
      ? (Number.isInteger(reps) ? `${reps} reps` : `${reps.toFixed(1).replace(/\.0$/, "")} reps`)
      : null;
    const weightLabel = typeof weight === "number" ? formatWeight(weight, plan.weightUnit ?? null) : null;

    return [
      repsLabel ? { key: "reps", label: repsLabel, numericValue: reps } : null,
      weightLabel ? { key: "weight", label: weightLabel, numericValue: weight } : null,
    ].filter((entry): entry is TargetPartEntry => Boolean(entry));
  }

  const entries: TargetPartEntry[] = [];

  if (typeof plan.durationSeconds === "number" && plan.durationSeconds > 0) {
    entries.push({
      key: "duration",
      label: formatDurationClock(plan.durationSeconds),
      numericValue: plan.durationSeconds,
    });
  }

  if (typeof plan.distance === "number" && plan.distance > 0) {
    const distanceLabel = formatDistance(plan.distance, plan.distanceUnit ?? null);
    if (distanceLabel) {
      entries.push({
        key: "distance",
        label: distanceLabel,
        numericValue: plan.distance,
      });
    }
  }

  if (typeof plan.calories === "number" && plan.calories > 0) {
    const caloriesLabel = formatCalories(plan.calories);
    if (caloriesLabel) {
      entries.push({
        key: "calories",
        label: caloriesLabel,
        numericValue: plan.calories,
      });
    }
  }

  return entries;
}

function buildCondensedTargetChangeSummary(fromPlan: ProgressionTargetPlan | null, toPlan: ProgressionTargetPlan | null) {
  if (!fromPlan || !toPlan) {
    return null;
  }

  const orderedKeys: TargetPartKey[] = ["reps", "weight", "duration", "distance", "calories"];
  const fromParts = new Map(buildTargetPartEntries(fromPlan).map((entry) => [entry.key, entry] as const));
  const toParts = new Map(buildTargetPartEntries(toPlan).map((entry) => [entry.key, entry] as const));
  const sharedKeys = orderedKeys.filter((key) => {
    const fromEntry = fromParts.get(key);
    const toEntry = toParts.get(key);
    return fromEntry && toEntry && fromEntry.label === toEntry.label;
  });
  if (sharedKeys.length === 0) {
    return null;
  }

  const changedFrom = orderedKeys.flatMap((key) => {
    const fromEntry = fromParts.get(key);
    const toEntry = toParts.get(key);
    return fromEntry && (!toEntry || fromEntry.label !== toEntry.label) ? [fromEntry] : [];
  });
  const changedTo = orderedKeys.flatMap((key) => {
    const fromEntry = fromParts.get(key);
    const toEntry = toParts.get(key);
    return toEntry && (!fromEntry || fromEntry.label !== toEntry.label) ? [toEntry] : [];
  });

  if (changedFrom.length === 0 && changedTo.length === 0) {
    return null;
  }

  if (changedFrom.length === 1 && changedTo.length === 0) {
    const changedEntry = changedFrom[0]!;
    return `${formatTargetPartName(changedEntry.key)} removed`;
  }

  if (changedFrom.length === 0 && changedTo.length === 1) {
    const changedEntry = changedTo[0]!;
    return `${formatTargetPartName(changedEntry.key)} added | ${changedEntry.label}`;
  }

  if (changedFrom.length === 1 && changedTo.length === 1 && changedFrom[0]!.key === changedTo[0]!.key) {
    const fromEntry = changedFrom[0]!;
    const toEntry = changedTo[0]!;
    const measurementName = formatTargetPartName(fromEntry.key);

    if (typeof fromEntry.numericValue === "number" && typeof toEntry.numericValue === "number") {
      if (toEntry.numericValue < fromEntry.numericValue) {
        return `${measurementName} reduced | ${fromEntry.label} ${PROGRESSION_FLOW_ARROW} ${toEntry.label}`;
      }

      if (toEntry.numericValue > fromEntry.numericValue) {
        return `${measurementName} increased | ${fromEntry.label} ${PROGRESSION_FLOW_ARROW} ${toEntry.label}`;
      }
    }

    return `${measurementName} updated | ${fromEntry.label} ${PROGRESSION_FLOW_ARROW} ${toEntry.label}`;
  }

  if (changedFrom.length > 0 && changedTo.length > 0) {
    return `${changedFrom.map((entry) => entry.label).join(" | ")} ${PROGRESSION_FLOW_ARROW} ${changedTo.map((entry) => entry.label).join(" | ")}`;
  }

  return null;
}

function buildTimelineSummary(firstTargetLabel: string | null, currentTargetLabel: string | null) {
  if (firstTargetLabel && currentTargetLabel && firstTargetLabel !== currentTargetLabel) {
    return `Started at ${firstTargetLabel} | now ${currentTargetLabel}`;
  }

  return currentTargetLabel ?? firstTargetLabel;
}

function buildLatestChangeSummary(event: ProgressionEventRow) {
  const fromTarget = toProgressionTargetPlan(asRecord(event.from_target));
  const toTarget = toProgressionTargetPlan(asRecord(event.to_target));
  const fromTargetLabel = formatProgressionReviewTargetLabel(fromTarget);
  const toTargetLabel = formatProgressionReviewTargetLabel(toTarget);

  if (fromTargetLabel && toTargetLabel && fromTargetLabel !== toTargetLabel) {
    const condensedSummary = buildCondensedTargetChangeSummary(fromTarget, toTarget);
    if (condensedSummary) {
      return condensedSummary;
    }
    return `${fromTargetLabel} ${PROGRESSION_FLOW_ARROW} ${toTargetLabel}`;
  }

  return toTargetLabel ?? fromTargetLabel ?? formatEventTypeLabel(event.event_type);
}

export function formatProgressionActivityDayLabel(dayKey: string) {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function buildProgressionActivityItemLabel(event: ProgressionEventRow) {
  const eventLabel = formatEventTypeLabel(event.event_type);
  const changeSummary = buildLatestChangeSummary(event)?.trim() ?? "";
  if (!changeSummary) {
    return eventLabel;
  }

  return changeSummary.toLowerCase() === eventLabel.toLowerCase()
    ? eventLabel
    : `${eventLabel} | ${changeSummary}`;
}

export function buildStructuredProgressionActivityItem(args: {
  event: ProgressionEventRow;
  exerciseName?: string | null;
  routineTitle?: string | null;
}): DetailSectionListItem {
  const eventLabel = formatEventTypeLabel(args.event.event_type);
  const changeSummary = buildLatestChangeSummary(args.event)?.trim() ?? eventLabel;
  const [headlineRaw, transitionRaw] = changeSummary.split(/\s+\|\s+/, 2);
  const headline = headlineRaw?.trim() || eventLabel;
  const hasTransition = typeof transitionRaw === "string" && transitionRaw.includes(PROGRESSION_FLOW_ARROW);
  const primary = hasTransition
    ? headline.replace(/\b(increased|reduced|updated)\b/gi, "").replace(/\s{2,}/g, " ").trim() || headline
    : changeSummary;
  const value = hasTransition ? transitionRaw.trim() : null;
  const metaParts = [
    args.exerciseName?.trim() || null,
    args.routineTitle?.trim() || null,
  ].filter((part): part is string => Boolean(part));

  return {
    id: args.event.id,
    primary,
    value,
    meta: metaParts.join(" | ") || null,
    signals: getProgressionEventSignal(args.event.event_type) ?? undefined,
    layout: "single-column",
  };
}

function buildProgressionActivityDays(args: {
  events: ProgressionEventRow[];
  exerciseNameById?: Map<string, string>;
  routineTitleById?: Map<string, string>;
}): ExerciseProgressionActivityDay[] {
  const eventsByDayKey = new Map<string, ProgressionEventRow[]>();

  for (const event of sortEventsAscending(args.events)) {
    const dayKey = getProgressionEventBucketKey({
      createdAt: event.created_at,
      granularity: "day",
    });
    if (!dayKey) {
      continue;
    }

    const current = eventsByDayKey.get(dayKey) ?? [];
    current.push(event);
    eventsByDayKey.set(dayKey, current);
  }

  return [...eventsByDayKey.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .slice(-7)
    .map(([dayKey, dayEvents]) => {
      const orderedDayEvents = [...dayEvents].sort((left, right) => {
        if (left.created_at === right.created_at) {
          return right.id.localeCompare(left.id);
        }
        return right.created_at.localeCompare(left.created_at);
      });
      const promotionCount = orderedDayEvents.filter((event) => event.event_type === "promotion_applied").length;
      const deloadCount = orderedDayEvents.filter((event) => event.event_type === "deload_applied").length;
      const manualChangeCount = orderedDayEvents.filter((event) => event.event_type === "manual_target_change").length;
      const revertCount = orderedDayEvents.filter((event) => event.event_type === "promotion_reverted").length;

      return {
        id: dayKey,
        label: formatProgressionActivityDayLabel(dayKey),
        detail: `${countLabel(dayEvents.length, "change")} landed.`,
        valueLabel: countLabel(dayEvents.length, "event"),
        eventCount: dayEvents.length,
        promotionCount,
        deloadCount,
        manualChangeCount,
        revertCount,
        items: orderedDayEvents.map((event) => buildStructuredProgressionActivityItem({
          event,
          exerciseName: args.exerciseNameById?.get(event.exercise_id) ?? null,
          routineTitle: args.routineTitleById?.get(event.routine_id) ?? null,
        })),
      } satisfies ExerciseProgressionActivityDay;
    });
}

const RECENT_ACTIVITY_WINDOW_DAYS = 30;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function countEventLabel(count: number) {
  return countLabel(count, "update");
}

function buildRecentEventWindow(events: ProgressionEventRow[], windowDays = RECENT_ACTIVITY_WINDOW_DAYS) {
  const latestEvent = events.at(-1) ?? null;
  if (!latestEvent) {
    return {
      recentWindowDays: windowDays,
      recentEvents: [] as ProgressionEventRow[],
      recentEventCount: 0,
      recentPromotionCount: 0,
      recentDeloadCount: 0,
      recentManualChangeCount: 0,
      recentActivitySummary: null as string | null,
      recentFocusSummary: null as string | null,
    };
  }

  const latestTimestamp = Date.parse(latestEvent.created_at);
  if (!Number.isFinite(latestTimestamp)) {
    return {
      recentWindowDays: windowDays,
      recentEvents: [] as ProgressionEventRow[],
      recentEventCount: 0,
      recentPromotionCount: 0,
      recentDeloadCount: 0,
      recentManualChangeCount: 0,
      recentActivitySummary: null as string | null,
      recentFocusSummary: null as string | null,
    };
  }

  const windowStart = latestTimestamp - ((windowDays - 1) * ONE_DAY_MS);
  const recentEvents = events.filter((event) => {
    const eventTimestamp = Date.parse(event.created_at);
    return Number.isFinite(eventTimestamp) && eventTimestamp >= windowStart;
  });
  const recentPromotionCount = recentEvents.filter((event) => event.event_type === "promotion_applied").length;
  const recentDeloadCount = recentEvents.filter((event) => event.event_type === "deload_applied").length;
  const recentManualChangeCount = recentEvents.filter((event) => event.event_type === "manual_target_change").length;
  const recentEventCount = recentEvents.length;
  const recentActivityParts = [
    recentEventCount > 0 ? countEventLabel(recentEventCount) : null,
    recentPromotionCount > 0 ? countLabel(recentPromotionCount, "promotion") : null,
    recentDeloadCount > 0 ? countLabel(recentDeloadCount, "regression") : null,
    recentManualChangeCount > 0 ? countLabel(recentManualChangeCount, "manual change") : null,
  ].filter((value): value is string => Boolean(value));

  const activeRecentSignalCount = [
    recentPromotionCount > 0,
    recentDeloadCount > 0,
    recentManualChangeCount > 0,
  ].filter(Boolean).length;

  let recentFocusSummary: string | null = null;
  if (
    activeRecentSignalCount >= 2
    && recentPromotionCount > recentDeloadCount
    && recentPromotionCount > recentManualChangeCount
  ) {
    recentFocusSummary = `${countLabel(recentPromotionCount, "promotion")} led recent changes`;
  } else if (
    activeRecentSignalCount >= 2
    && recentDeloadCount > recentPromotionCount
    && recentDeloadCount > recentManualChangeCount
  ) {
    recentFocusSummary = `${countLabel(recentDeloadCount, "regression")} led recent changes`;
  } else if (
    activeRecentSignalCount >= 2
    && recentManualChangeCount > recentPromotionCount
    && recentManualChangeCount > recentDeloadCount
  ) {
    recentFocusSummary = `${countLabel(recentManualChangeCount, "manual change")} led recent changes`;
  }

  return {
    recentWindowDays: windowDays,
    recentEvents,
    recentEventCount,
    recentPromotionCount,
    recentDeloadCount,
    recentManualChangeCount,
    recentActivitySummary: recentActivityParts.length > 0 ? recentActivityParts.join(" | ") : null,
    recentFocusSummary,
  };
}

export function buildProgressionAnalyticsDigest(events: ProgressionEventRow[]): ProgressionAnalyticsDigest {
  const ordered = sortEventsAscending(events);
  const linkedSessionIds = new Set(
    ordered
      .map((event) => event.source_session_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  const distinctExerciseIds = new Set(
    ordered
      .map((event) => event.exercise_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  const promotions = ordered.filter((event) => event.event_type === "promotion_applied");

  return {
    eventCount: ordered.length,
    promotionCount: promotions.length,
    deloadCount: ordered.filter((event) => event.event_type === "deload_applied").length,
    manualChangeCount: ordered.filter((event) => event.event_type === "manual_target_change").length,
    revertCount: ordered.filter((event) => event.event_type === "promotion_reverted").length,
    lockInCount: ordered.filter((event) => event.event_type === "lock_in").length,
    linkedSessionCount: linkedSessionIds.size,
    distinctExerciseCount: distinctExerciseIds.size,
    firstChangeAt: ordered[0]?.created_at ?? null,
    latestChangeAt: ordered.at(-1)?.created_at ?? null,
    lastPromotionAt: promotions.at(-1)?.created_at ?? null,
  };
}

export function buildExerciseProgressionLifelineSummary(
  events: ProgressionEventRow[],
  options?: {
    exerciseNameById?: Map<string, string>;
    routineTitleById?: Map<string, string>;
  },
): ExerciseProgressionLifelineSummary | null {
  const ordered = sortEventsAscending(events);
  if (ordered.length === 0) {
    return null;
  }

  const digest = buildProgressionAnalyticsDigest(ordered);
  const firstEvent = ordered[0] ?? null;
  const latestEvent = ordered.at(-1) ?? null;
  const firstTargetLabel = firstEvent
    ? (formatTarget(asRecord(firstEvent.from_target)) ?? formatTarget(asRecord(firstEvent.to_target)))
    : null;
  const currentTargetLabel = latestEvent
    ? (formatTarget(asRecord(latestEvent.to_target)) ?? formatTarget(asRecord(latestEvent.from_target)))
    : null;
  const latestChangeSummary = latestEvent ? buildLatestChangeSummary(latestEvent) : null;
  const timelineSummary = buildTimelineSummary(firstTargetLabel, currentTargetLabel);
  const latestEventLabel = latestEvent ? formatEventTypeLabel(latestEvent.event_type) : null;
  const recentWindow = buildRecentEventWindow(ordered);
  const chartSections = buildProgressionSummaryChartSections({
    events: ordered,
    activityGranularity: "day",
  }).filter((section) => section.id !== "progression-hotspots");
  const activityDays = buildProgressionActivityDays({
    events: ordered,
    exerciseNameById: options?.exerciseNameById,
    routineTitleById: options?.routineTitleById,
  });
  const lifelineItems = [
    latestChangeSummary ? `Latest: ${latestChangeSummary}` : null,
    timelineSummary ? `Target Path: ${timelineSummary}` : null,
    recentWindow.recentActivitySummary ? `Recent activity: ${recentWindow.recentActivitySummary}` : null,
    digest.promotionCount > 0 ? `${countLabel(digest.promotionCount, "promotion")} applied` : null,
    digest.deloadCount > 0 ? `${countLabel(digest.deloadCount, "regression")} logged` : null,
    digest.manualChangeCount > 0 ? `${countLabel(digest.manualChangeCount, "manual change")} recorded` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    ...digest,
    firstTargetLabel,
    currentTargetLabel,
    latestChangeSummary,
    latestEventLabel,
    timelineSummary,
    recentWindowDays: recentWindow.recentWindowDays,
    recentEventCount: recentWindow.recentEventCount,
    recentPromotionCount: recentWindow.recentPromotionCount,
    recentDeloadCount: recentWindow.recentDeloadCount,
    recentManualChangeCount: recentWindow.recentManualChangeCount,
    recentActivitySummary: recentWindow.recentActivitySummary,
    recentFocusSummary: recentWindow.recentFocusSummary,
    chartSections,
    activityDays,
    lifelineItems: Array.from(new Set(lifelineItems)).slice(0, 4),
  };
}

export function buildSessionProgressionSummary(
  events: ProgressionEventRow[],
  exerciseNameById?: Map<string, string>,
): SessionProgressionSummary | null {
  const ordered = sortEventsAscending(events);
  if (ordered.length === 0) {
    return null;
  }

  const digest = buildProgressionAnalyticsDigest(ordered);
  const affectedExerciseNames = Array.from(new Set(
    ordered
      .map((event) => exerciseNameById?.get(event.exercise_id)?.trim())
      .filter((value): value is string => Boolean(value)),
  ));

  let headline: string | null = null;
  if (digest.promotionCount > 0) {
    headline = digest.promotionCount === 1 && affectedExerciseNames[0]
      ? `${affectedExerciseNames[0]} promoted`
      : `${countLabel(digest.promotionCount, "promotion")} applied`;
  } else if (digest.deloadCount > 0) {
    headline = `${countLabel(digest.deloadCount, "regression")} applied`;
  } else if (digest.manualChangeCount > 0) {
    headline = `${countLabel(digest.manualChangeCount, "manual change")} recorded`;
  } else {
    headline = `${countLabel(digest.eventCount, "target update")} logged`;
  }

  const detail = affectedExerciseNames.length === 0
    ? null
    : affectedExerciseNames.length === 1
      ? affectedExerciseNames[0]
      : `${affectedExerciseNames.slice(0, 2).join(", ")}${affectedExerciseNames.length > 2 ? ` +${affectedExerciseNames.length - 2}` : ""}`;

  return {
    ...digest,
    affectedExerciseNames,
    headline,
    detail,
  };
}
