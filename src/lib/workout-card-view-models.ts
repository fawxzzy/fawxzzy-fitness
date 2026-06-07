import type { SessionSummary } from "@/app/history/session-summary";
import type { CardSemanticTone } from "@/components/cardSemanticTones";
import type { MetricDatum } from "@/components/ui/MetricItem";
import {
  mapExerciseAnalyticsFamilyToPresentationKind,
  resolveExerciseAnalyticsFamily,
  type ExerciseAnalyticsFamily,
} from "@/lib/exercise-analytics-family";
import type { ExerciseBrowserRow } from "@/lib/exercises-browser";
import { isCardioExercise } from "@/lib/exercise-metadata";
import {
  getStretchHubChipLabels,
  isStretchHubExercise,
} from "@/lib/stretch-library";
import { formatDistance, formatDurationShort as formatWorkoutDuration, formatPace, positive } from "@/lib/exercise-stats-formatting";
import { formatCount, formatDateShort, formatDurationShort, formatSetDisplay, formatWeight } from "@/lib/formatting";

export type WorkoutCardDensity = "compact" | "detailed";
export type WorkoutCardPresentationKind = "strength" | "bodyweight" | "cardio" | "timed";
export type WorkoutCardChipTone = "default" | "success" | "warning" | "destructive";

export type WorkoutCardChip = {
  label: string;
  tone?: WorkoutCardChipTone;
};

export type WorkoutProgressChip =
  | "skipped"
  | "endedEarly"
  | "loggedProgress"
  | "addedToday";

export type HistoryExerciseCardViewModel = {
  presentationKind: WorkoutCardPresentationKind;
  summaryLabel: string;
  summary: string;
  comparison: string | null;
  chips: WorkoutCardChip[];
  badgeItems: string[];
  badgeText?: string;
  detailedMetrics: MetricDatum[];
  detailedSections: Array<{
    title: string;
    items: string[];
  }>;
  semanticTone: CardSemanticTone;
};

export type HistorySessionCardViewModel = {
  outcome: string;
  progress: string | null;
  compactChips: WorkoutCardChip[];
  detailedMetrics: MetricDatum[];
  tone: CardSemanticTone;
};

type ExerciseIdentityChipArgs = {
  name?: string | null;
  slug?: string | null;
  measurementType?: string | null;
  isCardio?: boolean | null;
  kind?: string | null;
  type?: string | null;
  equipment?: string | null;
  movementPattern?: string | null;
  primaryMuscle?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
};

function clampChips(chips: WorkoutCardChip[], max = 3) {
  return chips.slice(0, max);
}

function normalizeTagArray(value: string[] | string | null | undefined) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
  }

  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function resolvePrimaryTag(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function titleCase(value: string | null | undefined) {
  if (!value) return null;
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatLoad(value: number) {
  return `${Math.round(value).toLocaleString()} load`;
}

function formatLoadWithUnit(value: number, unit?: string | null) {
  const normalizedUnit = unit === "kg" ? "kg" : unit === "lb" || unit === "lbs" ? "lbs" : null;
  return normalizedUnit ? `${Math.round(value).toLocaleString()} ${normalizedUnit}` : formatLoad(value);
}

function formatIntegerValue(value: number) {
  return Math.max(0, Math.round(value)).toLocaleString();
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatSignedWholeDelta(delta: number, suffix = "") {
  const magnitude = Math.abs(delta);
  const rounded = Number.isInteger(magnitude) ? String(magnitude) : magnitude.toFixed(1).replace(/\.0$/, "");
  return `${delta > 0 ? "+" : "-"}${rounded}${suffix}`;
}

function formatWeightReps(weight: number | null, reps: number | null, unit: string | null) {
  const weightValue = positive(weight);
  const repsValue = positive(reps);
  const weightLabel = formatWeight(weightValue > 0 ? weightValue : null, unit);

  if (weightLabel && repsValue > 0) {
    return `${weightLabel} x ${Number.isInteger(repsValue) ? repsValue : repsValue.toFixed(1).replace(/\.0$/, "")}`;
  }

  if (weightLabel) {
    return weightLabel;
  }

  if (repsValue > 0) {
    return `${Number.isInteger(repsValue) ? repsValue : repsValue.toFixed(1).replace(/\.0$/, "")} reps`;
  }

  return null;
}

function resolveStrengthPresentationKind(row: {
  last_weight?: number | null;
  actual_pr_weight?: number | null;
  last_reps?: number | null;
  actual_pr_reps?: number | null;
}) {
  const hasWeightedSignal = positive(row.last_weight) > 0 || positive(row.actual_pr_weight) > 0;
  const hasRepSignal = positive(row.last_reps) > 0 || positive(row.actual_pr_reps) > 0;

  if (!hasWeightedSignal && hasRepSignal) {
    return "bodyweight" as const;
  }

  return "strength" as const;
}

function hasBodyweightToken(value: string) {
  return value === "bodyweight" || value === "body weight" || value === "calisthenics" || value === "gymnastics";
}

function resolveExplicitPresentationKind(args: ExerciseIdentityChipArgs): WorkoutCardPresentationKind | null {
  const normalizedMeasurementType = resolvePrimaryTag(args.measurementType);
  const normalizedKind = resolvePrimaryTag(args.kind);
  const normalizedType = resolvePrimaryTag(args.type);
  const normalizedEquipment = resolvePrimaryTag(args.equipment);
  const normalizedMovementPattern = resolvePrimaryTag(args.movementPattern);
  const normalizedPrimaryMuscle = resolvePrimaryTag(args.primaryMuscle);
  const normalizedTags = new Set([
    ...normalizeTagArray(args.tags),
    ...normalizeTagArray(args.categories),
    normalizedKind,
    normalizedType,
    normalizedEquipment,
    normalizedMovementPattern,
    normalizedPrimaryMuscle,
  ].filter(Boolean));
  const hasIdentitySignal = Boolean(
    args.isCardio
    || normalizedMeasurementType
    || normalizedKind
    || normalizedType
    || normalizedEquipment
    || normalizedMovementPattern
    || normalizedPrimaryMuscle
    || normalizedTags.size > 0,
  );

  if (!hasIdentitySignal) {
    return null;
  }

  if (
    isCardioExercise({
      isCardio: args.isCardio,
      measurement_type: normalizedMeasurementType === "time" || normalizedMeasurementType === "duration"
        ? null
        : (args.measurementType ?? null),
      equipment: args.equipment,
      movement_pattern: args.movementPattern,
      primary_muscle: args.primaryMuscle,
      kind: args.kind,
      type: args.type,
      tags: args.tags,
      categories: args.categories,
    })
    || normalizedMeasurementType === "distance"
    || normalizedMeasurementType === "time_distance"
  ) {
    return "cardio";
  }

  if (
    normalizedKind === "timed"
    || normalizedType === "timed"
    || normalizedMeasurementType === "time"
    || normalizedMeasurementType === "duration"
  ) {
    return "timed";
  }

  if (
    Array.from(normalizedTags).some(hasBodyweightToken)
  ) {
    return "bodyweight";
  }

  return "strength";
}

export function resolveWorkoutCardPresentationKind(args: ExerciseIdentityChipArgs): WorkoutCardPresentationKind | null {
  return resolveExplicitPresentationKind(args);
}

export function buildExerciseIdentityChips(
  args: ExerciseIdentityChipArgs,
  options?: {
    includePrimaryMuscle?: boolean;
    maxChips?: number;
  },
): WorkoutCardChip[] {
  if (isStretchHubExercise(args)) {
    return clampChips(
      getStretchHubChipLabels().map((label) => ({ label })),
      options?.maxChips ?? 3,
    );
  }

  const presentationKind = resolveExplicitPresentationKind(args);
  const chips: WorkoutCardChip[] = [];

  if (presentationKind) {
    chips.push({
      label: presentationKind === "cardio"
        ? "Cardio"
        : presentationKind === "timed"
          ? "Timed"
          : presentationKind === "bodyweight"
            ? "Bodyweight"
            : "Strength",
      tone: "default",
    });
  }

  const supportingLabels = [
    titleCase(args.equipment),
    titleCase(args.movementPattern),
    options?.includePrimaryMuscle ? titleCase(args.primaryMuscle) : null,
  ];

  if (supportingLabels.filter(Boolean).length < 2) {
    supportingLabels.push(titleCase(args.primaryMuscle));
  }

  for (const label of supportingLabels.filter((value): value is string => Boolean(value))) {
    if (chips.some((chip) => chip.label.toLowerCase() === label.toLowerCase())) {
      continue;
    }
    chips.push({ label });
  }

  return clampChips(chips, options?.maxChips ?? 3);
}

export function buildExerciseProgressChips(args: {
  chips: WorkoutProgressChip[];
  progressLabel?: string;
}): WorkoutCardChip[] {
  const resolved: WorkoutCardChip[] = [];

  if (args.chips.includes("addedToday")) {
    resolved.push({ label: "Added today", tone: "success" });
  }

  if (args.chips.includes("loggedProgress")) {
    resolved.push({ label: args.progressLabel ?? "Logged", tone: "default" });
  }

  if (args.chips.includes("endedEarly")) {
    resolved.push({ label: "Ended early", tone: "warning" });
  }

  if (args.chips.includes("skipped")) {
    resolved.push({ label: "Skipped", tone: "warning" });
  }

  return resolved;
}

export function mergeWorkoutCardChips(...groups: WorkoutCardChip[][]) {
  const merged: WorkoutCardChip[] = [];

  for (const group of groups) {
    for (const chip of group) {
      if (merged.some((existing) => existing.label.toLowerCase() === chip.label.toLowerCase())) {
        continue;
      }
      merged.push(chip);
    }
  }

  return clampChips(merged);
}

function formatPlannedSetCount(args: {
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  presentationKind: WorkoutCardPresentationKind;
  useIntervalLanguage?: boolean;
}) {
  const min = positive(args.targetSetsMin);
  const max = positive(args.targetSetsMax);

  if (min <= 0 && max <= 0) {
    return "Open target";
  }

  const unitLabel = args.useIntervalLanguage
    ? "round"
    : args.presentationKind === "cardio" || args.presentationKind === "timed"
      ? "effort"
      : "set";

  if (min > 0 && max > 0 && min !== max) {
    return `${min}-${max} ${unitLabel}${max === 1 ? "" : "s"} planned`;
  }

  const count = Math.max(min, max);
  return `${count} ${unitLabel}${count === 1 ? "" : "s"} planned`;
}

function resolveTrackingLabel(presentationKind: WorkoutCardPresentationKind) {
  switch (presentationKind) {
    case "cardio":
      return "Time + Distance";
    case "timed":
      return "Time";
    case "bodyweight":
      return "Reps";
    default:
      return "Reps + Load";
  }
}

export function buildPlannedExerciseDetailMetrics(args: ExerciseIdentityChipArgs & {
  loggedSetCount?: number;
  isSkipped?: boolean;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  useIntervalLanguage?: boolean;
}): MetricDatum[] {
  if (isStretchHubExercise(args)) {
    return [];
  }

  const presentationKind = resolveExplicitPresentationKind(args) ?? "strength";
  const metrics: MetricDatum[] = [];
  const loggedSetCount = Math.max(0, Math.floor(args.loggedSetCount ?? 0));
  const targetSetGoal = positive(args.targetSetsMin) > 0 ? positive(args.targetSetsMin) : positive(args.targetSetsMax);

  if (!args.isSkipped) {
    if (loggedSetCount > 0) {
      metrics.push({
        label: "Logged",
        value: targetSetGoal > 0 ? `${loggedSetCount} of ${targetSetGoal}` : `${loggedSetCount}`,
      });
    } else {
      metrics.push({
        label: "Status",
        value: "Ready",
      });
    }
  }

  metrics.push({
    label: "Next",
    value: formatPlannedSetCount({
      targetSetsMin: args.targetSetsMin,
      targetSetsMax: args.targetSetsMax,
      presentationKind,
      useIntervalLanguage: args.useIntervalLanguage,
    }),
  });
  metrics.push({
    label: "Tracking",
    value: resolveTrackingLabel(presentationKind),
  });

  return metrics.slice(0, 3);
}

function buildHistoryExerciseDetailedMetrics(row: ExerciseBrowserRow, family: ExerciseAnalyticsFamily): MetricDatum[] {
  if (row.progressionSummary?.eventCount) {
    return [
      {
        label: "Sessions",
        value: formatIntegerValue(row.sessionCount),
        valueTone: row.sessionCount > 0 ? "default" : "muted",
      },
      {
        label: "Sets",
        value: formatIntegerValue(row.setCount ?? 0),
        valueTone: positive(row.setCount) > 0 ? "default" : "muted",
      },
      {
        label: "Promoted",
        value: formatIntegerValue(row.progressionSummary.promotionCount),
        valueTone: row.progressionSummary.promotionCount > 0 ? "success" : "muted",
      },
      {
        label: "Current",
        value: row.progressionSummary.currentTargetLabel ?? "No target",
        valueTone: row.progressionSummary.currentTargetLabel ? "default" : "muted",
      },
    ];
  }

  const recentLabel = family === "timed-hold" ? "Active" : "Recent";
  const trackingValue = family === "timed-hold" ? "Time" : "Review";

  const metrics: MetricDatum[] = [
    {
      label: "Sessions",
      value: formatIntegerValue(row.sessionCount),
      valueTone: row.sessionCount > 0 ? "default" : "muted",
    },
    {
      label: "Sets",
      value: formatIntegerValue(row.setCount ?? 0),
      valueTone: positive(row.setCount) > 0 ? "default" : "muted",
    },
    {
      label: recentLabel,
      value: formatIntegerValue(row.sessionsLast30Days ?? 0),
      timeframe: "recent window",
      valueTone: positive(row.sessionsLast30Days) > 0 ? "default" : "muted",
    },
    {
      label: family.startsWith("cardio") || family === "timed-hold" ? "Tracked" : "PRs",
      value: family.startsWith("cardio") || family === "timed-hold"
        ? trackingValue
        : formatIntegerValue(row.prCount),
      valueTone: family.startsWith("cardio") || family === "timed-hold"
        ? "muted"
        : row.prCount > 0 ? "success" : "muted",
    },
  ];

  return metrics;
}

function buildHistoryExerciseBadgeItems(row: ExerciseBrowserRow) {
  const items: string[] = [];

  if (row.activityRank === 1) {
    items.push("Most Trained");
  } else if (row.activityRank && row.activityRank > 1 && row.activityRank <= 5) {
    items.push("Top 5");
  } else if (row.activityRank && row.activityRank > 5 && row.activityRank <= 10) {
    items.push("Top 10");
  }

  if (positive(row.sessionsLast30Days) > 0) {
    items.push(`${formatIntegerValue(row.sessionsLast30Days ?? 0)} recent`);
  }

  if (row.progressionSummary?.promotionCount) {
    items.push(formatProgressionCountLabel(row.progressionSummary.promotionCount));
  }

  if (row.prCount > 0) {
    items.push(`${formatIntegerValue(row.prCount)} ${row.prCount === 1 ? "PR" : "PRs"}`);
  }

  if (row.sessionCount > 0) {
    items.push(`${formatIntegerValue(row.sessionCount)} ${row.sessionCount === 1 ? "Session" : "Sessions"}`);
  }

  if (row.last_performed_at) {
    items.push(`Last ${formatDateShort(row.last_performed_at)}`);
  }

  return items.slice(0, 4);
}

function buildHistoryExerciseDetailedSections(row: ExerciseBrowserRow, family: ExerciseAnalyticsFamily) {
  if (row.detailSections && row.detailSections.length > 0) {
    if (!row.progressionSummary?.eventCount) {
      return row.detailSections;
    }

    return row.detailSections.map((section) => (
      section.title === "Progress"
        ? {
            title: "Progression",
            items: [...section.items, ...(row.progressionSummary?.lifelineItems ?? [])]
              .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index)
              .slice(0, 4),
          }
        : section
    ));
  }

  const cleanedBest = row.bestSummary?.replace(/^Best\s*[:|]\s*/i, "").trim() || null;
  const progressItems = [
    row.deltaFromBest,
    ...(row.progressionSummary?.lifelineItems ?? []),
    row.prCount > 0 ? (row.prLabel || `${formatIntegerValue(row.prCount)} ${row.prCount === 1 ? "PR" : "PRs"} recorded`) : null,
    row.last_performed_at ? `Last trained ${formatDateShort(row.last_performed_at)}` : null,
  ].filter((value, index, items): value is string => Boolean(value) && items.indexOf(value) === index);

  return [
    {
      title: "Last",
      items: [row.lastSummary ?? (family === "timed-hold" ? "No timed effort logged yet." : "No logged history yet.")],
    },
    {
      title: "Best",
      items: [cleanedBest ?? (family === "timed-hold" ? "No best hold recorded yet." : "No best effort recorded yet.")],
    },
    {
      title: row.progressionSummary?.eventCount ? "Progression" : "Progress",
      items: progressItems.length > 0 ? progressItems.slice(0, 4) : ["No progression signal yet."],
    },
  ];
}

function buildHistoryExerciseComparison(row: ExerciseBrowserRow) {
  if (row.deltaFromBest) {
    return row.deltaFromBest;
  }

  if (row.progressionSummary?.latestChangeSummary) {
    return row.progressionSummary.latestChangeSummary;
  }

  if (row.prCount > 0 && row.prLabel) {
    return row.prLabel;
  }

  if (row.last_performed_at) {
    return `Last ${formatDateShort(row.last_performed_at)}`;
  }

  return null;
}

function formatProgressionCountLabel(count: number) {
  return `${formatIntegerValue(count)} ${count === 1 ? "promotion" : "promotions"}`;
}

export function buildHistoryExerciseCardViewModel(row: ExerciseBrowserRow): HistoryExerciseCardViewModel {
  if (isStretchHubExercise(row)) {
    return {
      presentationKind: "timed",
      summaryLabel: "",
      summary: "",
      comparison: null,
      chips: buildExerciseIdentityChips({
        name: row.name,
        slug: row.slug,
        equipment: row.equipment,
        movementPattern: row.movement_pattern,
        primaryMuscle: row.primary_muscle,
      }),
      badgeItems: buildHistoryExerciseBadgeItems(row),
      badgeText: buildHistoryExerciseBadgeItems(row)[0],
      detailedMetrics: [],
      detailedSections: [],
      semanticTone: "current",
    };
  }

  const fallbackPresentationKind = row.kind === "cardio"
    ? (row.measurement_type === "time" || row.measurement_type === "duration" ? "timed" : "cardio")
    : resolveStrengthPresentationKind(row);
  const family = row.analyticsFamily ?? resolveExerciseAnalyticsFamily({
    presentationKind: fallbackPresentationKind,
    measurement_type: row.measurement_type ?? null,
    defaultUnit: row.default_unit ?? null,
    equipment: row.equipment,
    movement_pattern: row.movement_pattern,
    primary_muscle: row.primary_muscle,
  });
  const basePresentationKind = mapExerciseAnalyticsFamilyToPresentationKind(family);
  const hasLoggedHistory = positive(row.setCount) > 0 || row.sessionCount > 0;
  const semanticTone: CardSemanticTone = hasLoggedHistory ? "logged" : "attention";
  const badgeItems = buildHistoryExerciseBadgeItems(row);

  return {
    presentationKind: basePresentationKind,
    summaryLabel: row.lastSummary ? "Last" : "History",
    summary: row.lastSummary ?? (
      basePresentationKind === "cardio"
        ? "No cardio efforts logged yet."
        : basePresentationKind === "bodyweight"
          ? "No rep history yet."
          : "No lifting history yet."
    ),
    comparison: buildHistoryExerciseComparison(row),
    chips: buildExerciseIdentityChips({
      name: row.name,
      slug: row.slug,
      kind: basePresentationKind,
      measurementType: row.measurement_type ?? null,
      equipment: row.equipment,
      movementPattern: row.movement_pattern,
      primaryMuscle: row.primary_muscle,
    }),
    badgeItems,
    badgeText: badgeItems[0],
    detailedMetrics: row.progressionSummary?.eventCount
      ? buildHistoryExerciseDetailedMetrics(row, family)
      : (row.detailedMetrics ?? buildHistoryExerciseDetailedMetrics(row, family)),
    detailedSections: buildHistoryExerciseDetailedSections(row, family),
    semanticTone,
  };
}

function buildSessionOutcome(session: SessionSummary) {
  if (session.bestLift) {
    return `Best: ${session.bestLift.exerciseName} | ${session.bestLift.display}`;
  }

  if (session.totalVolume > 0) {
    return `Volume: ${formatLoad(session.totalVolume)}`;
  }

  if (session.hasSetData) {
    return `${formatCount(session.setCount, "set")} logged`;
  }

  return "No set data recorded";
}

function buildSessionProgress(session: SessionSummary, previousSession?: SessionSummary | null) {
  if (session.progressionSummary?.promotionCount) {
    return session.progressionSummary.headline ?? formatProgressionCountLabel(session.progressionSummary.promotionCount);
  }

  if (session.progressionSummary?.eventCount) {
    return session.progressionSummary.headline ?? `${formatIntegerValue(session.progressionSummary.eventCount)} target updates`;
  }

  if (session.prCounts.total > 0) {
    return `${session.prCounts.total} ${session.prCounts.total === 1 ? "PR" : "PRs"} this session`;
  }

  if (
    previousSession
    && typeof session.completionRate === "number"
    && typeof previousSession.completionRate === "number"
    && session.completionRate !== previousSession.completionRate
  ) {
    return `${formatSignedWholeDelta((session.completionRate - previousSession.completionRate) * 100, "%")} completion`;
  }

  if (session.hasNote) {
    return "Session note saved";
  }

  return null;
}

function buildSessionCompactChips(session: SessionSummary, progress: string | null): WorkoutCardChip[] {
  const chips: WorkoutCardChip[] = [];

  const duration = session.durationSec ? formatDurationShort(session.durationSec) : null;
  if (duration) {
    chips.push({ label: duration, tone: "default" });
  }

  if (session.progressionSummary?.promotionCount) {
    chips.push({ label: formatProgressionCountLabel(session.progressionSummary.promotionCount), tone: "success" });
  } else {
    chips.push({ label: formatCount(session.setCount, "set") });
  }

  if (progress) {
    chips.push({
      label: progress,
      tone: progress.startsWith("+") || progress.includes("PR") ? "success" : "default",
    });
  } else if (session.completionRate !== undefined) {
    chips.push({ label: `${formatPercent(session.completionRate)} complete` });
  }

  return clampChips(chips);
}

function buildSessionDetailedMetrics(session: SessionSummary): MetricDatum[] {
  if (session.progressionSummary?.eventCount) {
    const metrics: MetricDatum[] = [
      {
        label: "Exercises",
        value: formatIntegerValue(session.exerciseCount),
      },
      {
        label: "Sets",
        value: formatIntegerValue(session.setCount),
      },
      {
        label: "Updates",
        value: formatIntegerValue(session.progressionSummary.eventCount),
        valueTone: session.progressionSummary.promotionCount > 0 ? "success" : "default",
      },
      {
        label: "Completion",
        value: session.completionRate !== undefined ? formatPercent(session.completionRate) : (session.hasSetData ? "Logged" : "Open"),
      },
    ];
    return metrics.slice(0, 4);
  }

  return [
    {
      label: "Exercises",
      value: formatIntegerValue(session.exerciseCount),
    },
    {
      label: "Sets",
      value: formatIntegerValue(session.setCount),
    },
    {
      label: "Duration",
      value: formatDurationShort(session.durationSec) ?? "0m",
    },
    {
      label: "Completion",
      value: session.completionRate !== undefined ? formatPercent(session.completionRate) : (session.hasSetData ? "Logged" : "Open"),
    },
  ].slice(0, 4);
}

export function buildHistorySessionCardViewModel(session: SessionSummary, previousSession?: SessionSummary | null): HistorySessionCardViewModel {
  const progress = buildSessionProgress(session, previousSession);

  return {
    outcome: buildSessionOutcome(session),
    progress,
    compactChips: buildSessionCompactChips(session, progress),
    detailedMetrics: buildSessionDetailedMetrics(session),
    tone: "current",
  };
}

export function formatEstimatedOneRepMax(value?: number | null, unit?: string | null) {
  const safe = positive(value);
  if (safe <= 0) return null;

  const label = formatSetDisplay({ weight: Math.round(safe), unit, reps: null });
  if (!label) {
    return `${Math.round(safe)}`;
  }

  return label;
}

export function buildStrengthVolumeMetric(
  rows: Array<{ weight: number | null; reps: number | null; performedAt: string }>,
  recentDays = 28,
  unit?: string | null,
) {
  const cutoff = Date.now() - (recentDays * 24 * 60 * 60 * 1000);
  const total = rows.reduce((sum, row) => {
    const timestamp = Date.parse(row.performedAt);
    if (!Number.isFinite(timestamp) || timestamp < cutoff) {
      return sum;
    }

    return sum + (positive(row.weight) * positive(row.reps));
  }, 0);

  return total > 0 ? formatLoadWithUnit(total, unit) : null;
}

export function buildBodyweightRepMetric(rows: Array<{ reps: number | null; performedAt: string }>, recentDays = 28) {
  const cutoff = Date.now() - (recentDays * 24 * 60 * 60 * 1000);
  const total = rows.reduce((sum, row) => {
    const timestamp = Date.parse(row.performedAt);
    if (!Number.isFinite(timestamp) || timestamp < cutoff) {
      return sum;
    }

    return sum + positive(row.reps);
  }, 0);

  return total > 0 ? `${Math.round(total)} reps` : null;
}

export function buildCardioRecentTotal(args: {
  rows: Array<{ durationSeconds: number; distance: number; distanceUnit: "mi" | "km" | "m" | "steps" | null; performedAt: string }>;
  recentDays?: number;
}) {
  const cutoff = Date.now() - ((args.recentDays ?? 7) * 24 * 60 * 60 * 1000);
  let durationSeconds = 0;
  let distance = 0;
  let distanceUnit: "mi" | "km" | "m" | "steps" | null = null;

  for (const row of args.rows) {
    const timestamp = Date.parse(row.performedAt);
    if (!Number.isFinite(timestamp) || timestamp < cutoff) {
      continue;
    }

    durationSeconds += positive(row.durationSeconds);
    if (!distanceUnit && row.distanceUnit) {
      distanceUnit = row.distanceUnit;
    }
    if (!distanceUnit || row.distanceUnit === distanceUnit) {
      distance += positive(row.distance);
    }
  }

  if (distance > 0 && distanceUnit) {
    return formatDistance(distance, distanceUnit);
  }

  if (durationSeconds > 0) {
    return formatWorkoutDuration(durationSeconds);
  }

  return null;
}

export function buildCardioPaceMetric(durationSeconds?: number | null, distance?: number | null, distanceUnit?: "mi" | "km" | "m" | "steps" | null) {
  const safeDuration = positive(durationSeconds);
  const safeDistance = positive(distance);
  if (safeDuration <= 0 || safeDistance <= 0 || !distanceUnit || distanceUnit === "steps") {
    return null;
  }

  return formatPace(safeDuration / safeDistance, distanceUnit);
}
