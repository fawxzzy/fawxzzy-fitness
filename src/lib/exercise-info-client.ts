import type { ExerciseInfoSheetExercise, ExerciseInfoSheetStats } from "@/components/ExerciseInfoSheet";
import type { MetricDatum } from "@/components/ui/MetricItem";
import type { ExerciseInfoReviewSection } from "@/lib/exercise-info-presentation";
import type { ExerciseInfoAnalyticsScope } from "@/lib/exercise-info-scope";
import type { ExerciseProgressionLifelineSummary } from "@/lib/progression-lifeline-summary";

export type ExerciseInfoClientPayload = {
  exercise: ExerciseInfoSheetExercise;
  stats: ExerciseInfoSheetStats | null;
};

type ExerciseInfoApiSuccess = {
  ok: true;
  payload: ExerciseInfoClientPayload;
};

type ExerciseInfoApiFailure = {
  ok?: false;
  message?: string;
  error?: string;
  code?: string;
  details?: unknown;
};

type ExerciseInfoClientFetchResult =
  | {
      ok: true;
      payload: ExerciseInfoClientPayload;
    }
  | {
      ok: false;
      message: string;
      status?: number;
      code?: string;
      details?: unknown;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readPrimitiveText(value: unknown) {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return null;
}

function normalizeMetricDatum(value: unknown): MetricDatum | null {
  if (!isRecord(value)) {
    return null;
  }

  const label = readPrimitiveText(value.label);
  const metricValue = readPrimitiveText(value.value);
  if (!label || !metricValue) {
    return null;
  }

  const valueTone = value.valueTone === "success" || value.valueTone === "danger" || value.valueTone === "muted"
    ? value.valueTone
    : undefined;

  return {
    label,
    value: metricValue,
    ...(readOptionalString(value.delta) ? { delta: readOptionalString(value.delta) } : {}),
    ...(readOptionalString(value.timeframe) ? { timeframe: readOptionalString(value.timeframe) } : {}),
    ...(readOptionalString(value.trend) ? { trend: readOptionalString(value.trend) } : {}),
    ...(readOptionalString(value.valuePrefix) ? { valuePrefix: readOptionalString(value.valuePrefix) } : {}),
    ...(valueTone ? { valueTone } : {}),
  };
}

function normalizeMetricList(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as MetricDatum[];
  }

  return value
    .map((item) => normalizeMetricDatum(item))
    .filter((item): item is MetricDatum => Boolean(item));
}

function normalizeReviewSections(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as ExerciseInfoReviewSection[];
  }

  return value
    .map((section) => {
      if (!isRecord(section)) {
        return null;
      }

      const title = readPrimitiveText(section.title);
      if (!title || !Array.isArray(section.items)) {
        return null;
      }

      const items = section.items
        .map((item) => readPrimitiveText(item))
        .filter((item): item is string => Boolean(item));

      if (items.length === 0) {
        return null;
      }

      return {
        title,
        items,
      } satisfies ExerciseInfoReviewSection;
    })
    .filter((section): section is ExerciseInfoReviewSection => Boolean(section));
}

function normalizePerformanceEntries(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as NonNullable<NonNullable<ExerciseInfoSheetStats["progress"]>["performances"]>;
  }

  return value
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const label = readPrimitiveText(entry.label);
      const metricValue = readPrimitiveText(entry.value);
      if (!label || !metricValue) {
        return null;
      }

      return {
        label,
        value: metricValue,
        ...(readOptionalString(entry.context) ? { context: readOptionalString(entry.context) } : {}),
      };
    })
    .filter((entry): entry is NonNullable<NonNullable<ExerciseInfoSheetStats["progress"]>["performances"]>[number] => Boolean(entry));
}

function normalizeProgression(value: unknown): ExerciseProgressionLifelineSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    eventCount: typeof value.eventCount === "number" && Number.isFinite(value.eventCount) ? value.eventCount : 0,
    promotionCount: typeof value.promotionCount === "number" && Number.isFinite(value.promotionCount) ? value.promotionCount : 0,
    deloadCount: typeof value.deloadCount === "number" && Number.isFinite(value.deloadCount) ? value.deloadCount : 0,
    manualChangeCount: typeof value.manualChangeCount === "number" && Number.isFinite(value.manualChangeCount) ? value.manualChangeCount : 0,
    revertCount: typeof value.revertCount === "number" && Number.isFinite(value.revertCount) ? value.revertCount : 0,
    lockInCount: typeof value.lockInCount === "number" && Number.isFinite(value.lockInCount) ? value.lockInCount : 0,
    linkedSessionCount: typeof value.linkedSessionCount === "number" && Number.isFinite(value.linkedSessionCount) ? value.linkedSessionCount : 0,
    distinctExerciseCount: typeof value.distinctExerciseCount === "number" && Number.isFinite(value.distinctExerciseCount) ? value.distinctExerciseCount : 0,
    firstChangeAt: readOptionalString(value.firstChangeAt),
    latestChangeAt: readOptionalString(value.latestChangeAt),
    lastPromotionAt: readOptionalString(value.lastPromotionAt),
    firstTargetLabel: readOptionalString(value.firstTargetLabel),
    currentTargetLabel: readOptionalString(value.currentTargetLabel),
    latestChangeSummary: readOptionalString(value.latestChangeSummary),
    latestEventLabel: readOptionalString(value.latestEventLabel),
    timelineSummary: readOptionalString(value.timelineSummary),
    recentWindowDays: typeof value.recentWindowDays === "number" && Number.isFinite(value.recentWindowDays) ? value.recentWindowDays : 30,
    recentEventCount: typeof value.recentEventCount === "number" && Number.isFinite(value.recentEventCount) ? value.recentEventCount : 0,
    recentPromotionCount: typeof value.recentPromotionCount === "number" && Number.isFinite(value.recentPromotionCount) ? value.recentPromotionCount : 0,
    recentDeloadCount: typeof value.recentDeloadCount === "number" && Number.isFinite(value.recentDeloadCount) ? value.recentDeloadCount : 0,
    recentManualChangeCount: typeof value.recentManualChangeCount === "number" && Number.isFinite(value.recentManualChangeCount) ? value.recentManualChangeCount : 0,
    recentActivitySummary: readOptionalString(value.recentActivitySummary),
    recentFocusSummary: readOptionalString(value.recentFocusSummary),
    lifelineItems: Array.isArray(value.lifelineItems)
      ? value.lifelineItems.map((item) => readPrimitiveText(item)).filter((item): item is string => Boolean(item))
      : [],
  };
}

export function normalizeExerciseInfoStats(value: unknown): ExerciseInfoSheetStats | null {
  if (!isRecord(value)) {
    return null;
  }

  const kind = value.kind === "cardio" ? "cardio" : value.kind === "strength" ? "strength" : null;
  if (!kind || !isRecord(value.recent) || !isRecord(value.totals) || !isRecord(value.bests)) {
    return null;
  }

  const presentationKind = value.presentationKind === "strength"
    || value.presentationKind === "bodyweight"
    || value.presentationKind === "cardio"
    || value.presentationKind === "timed"
    ? value.presentationKind
    : undefined;

  const progress = isRecord(value.progress) ? value.progress : null;
  const progression = normalizeProgression(value.progression);
  const bestSetSummary = readOptionalString(value.bests.bestSetSummary);
  const bestDistanceUnit = readOptionalString(value.bests.bestDistanceUnit);

  return {
    ...(readOptionalString(value.exercise_id) ? { exercise_id: readOptionalString(value.exercise_id) ?? undefined } : {}),
    ...(readOptionalString(value.activeRoutineTitle) !== null ? { activeRoutineTitle: readOptionalString(value.activeRoutineTitle) } : {}),
    kind,
    ...(presentationKind ? { presentationKind } : {}),
    recent: {
      lastPerformedAt: readOptionalString(value.recent.lastPerformedAt),
      lastSummary: readOptionalString(value.recent.lastSummary),
      ...(readOptionalNumber(value.recent.lastDurationSeconds) !== undefined ? { lastDurationSeconds: readOptionalNumber(value.recent.lastDurationSeconds) } : {}),
      ...(readOptionalNumber(value.recent.lastDistance) !== undefined ? { lastDistance: readOptionalNumber(value.recent.lastDistance) } : {}),
      ...(readOptionalNumber(value.recent.lastCalories) !== undefined ? { lastCalories: readOptionalNumber(value.recent.lastCalories) } : {}),
      ...(readOptionalNumber(value.recent.lastPaceSecondsPerUnit) !== undefined ? { lastPaceSecondsPerUnit: readOptionalNumber(value.recent.lastPaceSecondsPerUnit) } : {}),
      ...(readOptionalString(value.recent.lastDistanceUnit) ? { lastDistanceUnit: readOptionalString(value.recent.lastDistanceUnit) } : {}),
    },
    totals: {
      sessions: typeof value.totals.sessions === "number" && Number.isFinite(value.totals.sessions) ? value.totals.sessions : 0,
      sets: typeof value.totals.sets === "number" && Number.isFinite(value.totals.sets) ? value.totals.sets : 0,
      ...(readOptionalNumber(value.totals.reps) !== undefined ? { reps: readOptionalNumber(value.totals.reps) } : {}),
      ...(readOptionalNumber(value.totals.durationSeconds) !== undefined ? { durationSeconds: readOptionalNumber(value.totals.durationSeconds) } : {}),
      ...(readOptionalNumber(value.totals.distance) !== undefined ? { distance: readOptionalNumber(value.totals.distance) } : {}),
      ...(readOptionalNumber(value.totals.calories) !== undefined ? { calories: readOptionalNumber(value.totals.calories) } : {}),
    },
    bests: {
      ...(readOptionalNumber(value.bests.bestBodyweightReps) !== undefined ? { bestBodyweightReps: readOptionalNumber(value.bests.bestBodyweightReps) } : {}),
      ...(readOptionalNumber(value.bests.bestWeight) !== undefined ? { bestWeight: readOptionalNumber(value.bests.bestWeight) } : {}),
      ...(readOptionalNumber(value.bests.bestRepsAtBestWeight) !== undefined ? { bestRepsAtBestWeight: readOptionalNumber(value.bests.bestRepsAtBestWeight) } : {}),
      ...(bestSetSummary ? { bestSetSummary } : {}),
      ...(readOptionalNumber(value.bests.bestDurationSeconds) !== undefined ? { bestDurationSeconds: readOptionalNumber(value.bests.bestDurationSeconds) } : {}),
      ...(readOptionalNumber(value.bests.bestDistance) !== undefined ? { bestDistance: readOptionalNumber(value.bests.bestDistance) } : {}),
      ...(readOptionalNumber(value.bests.bestPace) !== undefined ? { bestPace: readOptionalNumber(value.bests.bestPace) } : {}),
      ...(bestDistanceUnit ? { bestDistanceUnit } : {}),
      ...(readOptionalNumber(value.bests.bestCalories) !== undefined ? { bestCalories: readOptionalNumber(value.bests.bestCalories) } : {}),
    },
    prLabel: readPrimitiveText(value.prLabel) ?? "",
    prCount: typeof value.prCount === "number" && Number.isFinite(value.prCount) ? value.prCount : 0,
    quickMetrics: normalizeMetricList(value.quickMetrics),
    performanceMetrics: normalizeMetricList(value.performanceMetrics),
    surfaceMetrics: normalizeMetricList(value.surfaceMetrics),
    progress: {
      metrics: normalizeMetricList(progress?.metrics),
      reviewSections: normalizeReviewSections(progress?.reviewSections),
      performances: normalizePerformanceEntries(progress?.performances),
    },
    progression,
  };
}

export function normalizeExerciseInfoClientPayload(value: unknown): ExerciseInfoClientPayload | null {
  if (!isRecord(value) || !isRecord(value.exercise)) {
    return null;
  }

  const exerciseId = readString(value.exercise.id);
  const name = readString(value.exercise.name);
  if (!exerciseId || !name) {
    return null;
  }

  return {
    exercise: {
      id: exerciseId,
      name,
      ...(readOptionalString(value.exercise.exercise_id) ? { exercise_id: readOptionalString(value.exercise.exercise_id) } : {}),
      primary_muscle: readOptionalString(value.exercise.primary_muscle),
      equipment: readOptionalString(value.exercise.equipment),
      movement_pattern: readOptionalString(value.exercise.movement_pattern),
      image_howto_path: readOptionalString(value.exercise.image_howto_path),
      how_to_short: readOptionalString(value.exercise.how_to_short),
      image_icon_path: readOptionalString(value.exercise.image_icon_path),
      slug: readOptionalString(value.exercise.slug),
    },
    stats: normalizeExerciseInfoStats(value.stats),
  };
}

export async function fetchExerciseInfoClientPayload(
  exerciseId: string,
  scope: ExerciseInfoAnalyticsScope,
  signal?: AbortSignal,
): Promise<ExerciseInfoClientFetchResult> {
  const response = await fetch(`/api/exercise-info/${exerciseId}?scope=${scope}`, { signal });
  const payload = (await response.json().catch(() => null)) as ExerciseInfoApiSuccess | ExerciseInfoApiFailure | null;

  if (!response.ok) {
    const errorPayload = payload as ExerciseInfoApiFailure | null;
    return {
      ok: false,
      status: response.status,
      code: errorPayload?.code,
      details: errorPayload?.details,
      message: errorPayload?.message ?? errorPayload?.error ?? "Could not load exercise info.",
    };
  }

  const normalizedPayload = normalizeExerciseInfoClientPayload((payload as ExerciseInfoApiSuccess | null)?.payload ?? null);
  if (!normalizedPayload) {
    return {
      ok: false,
      status: response.status,
      message: "Exercise info payload was incomplete.",
    };
  }

  return {
    ok: true,
    payload: normalizedPayload,
  };
}
