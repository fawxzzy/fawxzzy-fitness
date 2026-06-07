import type { ProgressionEventRow } from "@/types/db";
import { formatCalories, formatDistance } from "@/lib/exercise-stats-formatting";
import { formatDurationClock } from "@/lib/duration";
import { formatWeight } from "@/lib/formatting";
import { formatProgressionReviewTargetLabel } from "@/lib/progression-review-display";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";

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
  lifelineItems: string[];
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

export function buildExerciseProgressionLifelineSummary(events: ProgressionEventRow[]): ExerciseProgressionLifelineSummary | null {
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
  const lifelineItems = [
    latestChangeSummary ? `Latest: ${latestChangeSummary}` : null,
    timelineSummary ? `Target Path: ${timelineSummary}` : null,
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
