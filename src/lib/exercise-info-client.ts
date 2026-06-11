import type { ExerciseInfoSheetExercise, ExerciseInfoSheetStats } from "@/components/ExerciseInfoSheet";
import type { MetricDatum } from "@/components/ui/MetricItem";
import type { DetailSectionListItemInput, DetailSectionSignalTone } from "@/components/ui/DetailSectionList";
import type { ExerciseHistoryDayGroup, ExerciseHistoryPoint, ExerciseHistoryValuePart } from "@/lib/exercise-info";
import type { ExerciseInfoReviewSection } from "@/lib/exercise-info-presentation";
import type {
  ExerciseInfoAnalyticsScope,
  ExerciseInfoCycleFilterOption,
  ExerciseInfoFilterOptions,
  ExerciseInfoFilterState,
  ExerciseInfoRoutineFilterOption,
} from "@/lib/exercise-info-scope";
import type { ExerciseProgressionActivityDay, ExerciseProgressionLifelineSummary } from "@/lib/progression-lifeline-summary";
import type { ProgressionHistoryChartSection } from "@/lib/progression-history-display";

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

function normalizeSignals(value: unknown) {
  if (typeof value === "string") {
    return value === "pr" || value === "promotion" || value === "watch" || value === "regression"
      ? value
      : null;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const signals = value.filter((item): item is DetailSectionSignalTone => (
    item === "pr" || item === "promotion" || item === "watch" || item === "regression"
  ));

  return signals.length > 0 ? signals : null;
}

function normalizeDetailSectionItemInput(value: unknown, index: number): DetailSectionListItemInput | null {
  const primitive = readPrimitiveText(value);
  if (primitive) {
    return primitive;
  }

  if (!isRecord(value)) {
    return null;
  }

  const primary = readPrimitiveText(value.primary);
  if (!primary) {
    return null;
  }

  const tagLabels = Array.isArray(value.tagLabels)
    ? value.tagLabels.map((item) => readPrimitiveText(item)).filter((item): item is string => Boolean(item))
    : [];
  const signals = normalizeSignals(value.signals);

  return {
    id: readPrimitiveText(value.id) || `detail-item-${index}`,
    primary,
    ...(readOptionalString(value.value) ? { value: readOptionalString(value.value) } : {}),
    ...(readOptionalString(value.meta) ? { meta: readOptionalString(value.meta) } : {}),
    ...(signals ? { signals } : {}),
    ...(tagLabels.length > 0 ? { tagLabels } : {}),
    ...(value.tone === "muted" ? { tone: "muted" as const } : {}),
    ...(value.layout === "single-column" || value.layout === "auto" ? { layout: value.layout } : {}),
  };
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
        .map((item, index) => normalizeDetailSectionItemInput(item, index))
        .filter((item): item is DetailSectionListItemInput => Boolean(item));

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

function normalizePerformanceEntries(value: unknown): NonNullable<NonNullable<ExerciseInfoSheetStats["progress"]>["performances"]> {
  if (!Array.isArray(value)) {
    return [] as NonNullable<NonNullable<ExerciseInfoSheetStats["progress"]>["performances"]>;
  }

  const entries: NonNullable<NonNullable<ExerciseInfoSheetStats["progress"]>["performances"]> = [];

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }

    const label = readPrimitiveText(entry.label);
    const metricValue = readPrimitiveText(entry.value);
    const sessionId = readPrimitiveText(entry.sessionId) || `legacy-${label}`;
    const performedAt = readPrimitiveText(entry.performedAt) || label;
    const setCount = readOptionalNumber(entry.setCount) ?? 1;
    const setSummaries = Array.isArray(entry.setSummaries)
      ? entry.setSummaries.map((item) => readPrimitiveText(item)).filter((item): item is string => Boolean(item))
      : [];
    const displayKind: "session-summary" | "set-list" | "condensed-session" = entry.displayKind === "set-list"
      || entry.displayKind === "condensed-session"
      || entry.displayKind === "session-summary"
      ? entry.displayKind
      : "session-summary";
    if (!label || !metricValue || !sessionId || !performedAt || typeof setCount !== "number") {
      continue;
    }

    entries.push({
      sessionId,
      performedAt,
      label,
      value: metricValue,
      setCount,
      setSummaries: setSummaries.length > 0 ? setSummaries : [metricValue],
      displayKind,
      ...(readOptionalString(entry.context) ? { context: readOptionalString(entry.context) } : {}),
      ...(readOptionalString(entry.summary) ? { summary: readOptionalString(entry.summary) } : {}),
    });
  }

  return entries;
}

function normalizeHistoryValueParts(value: unknown): ExerciseHistoryValuePart[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): ExerciseHistoryValuePart | null => {
      if (!isRecord(item)) {
        return null;
      }
      const label = readPrimitiveText(item.label);
      const partValue = readPrimitiveText(item.value);
      if (!label || !partValue) {
        return null;
      }

      return {
        label,
        value: partValue,
        ...(readOptionalNumber(item.numericValue) !== undefined ? { numericValue: readOptionalNumber(item.numericValue) } : {}),
      };
    })
    .filter((item): item is ExerciseHistoryValuePart => Boolean(item));
}

function normalizeTagLabels(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => readPrimitiveText(item)).filter((item): item is string => Boolean(item))
    : [];
}

function normalizeExerciseInfoFilterOptions(value: unknown): ExerciseInfoFilterOptions {
  if (!isRecord(value) || !Array.isArray(value.routines)) {
    return { routines: [] };
  }

  const routines = value.routines
    .map((routine): ExerciseInfoRoutineFilterOption | null => {
      if (!isRecord(routine)) {
        return null;
      }

      const id = readPrimitiveText(routine.id);
      const title = readPrimitiveText(routine.title);
      if (!id || !title) {
        return null;
      }

      const cycleOptions = Array.isArray(routine.cycleOptions)
        ? routine.cycleOptions
            .map((cycle): ExerciseInfoCycleFilterOption | null => {
              if (!isRecord(cycle)) {
                return null;
              }

              const startDate = readPrimitiveText(cycle.startDate);
              const endDate = readPrimitiveText(cycle.endDate);
              const label = readPrimitiveText(cycle.label);
              if (!startDate || !endDate || !label) {
                return null;
              }

              return { startDate, endDate, label };
            })
            .filter((cycle): cycle is ExerciseInfoCycleFilterOption => Boolean(cycle))
        : [];

      return {
        id,
        title,
        ...(routine.isActive === true ? { isActive: true } : {}),
        cycleOptions,
      };
    })
    .filter((routine): routine is ExerciseInfoRoutineFilterOption => Boolean(routine));

  return { routines };
}

function normalizeHistoryGroups(value: unknown): ExerciseHistoryDayGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((group) => {
      if (!isRecord(group) || !Array.isArray(group.rows)) {
        return null;
      }
      const id = readPrimitiveText(group.id);
      const dayKey = readPrimitiveText(group.dayKey);
      const label = readPrimitiveText(group.label);
      const performedAt = readPrimitiveText(group.performedAt);
      if (!id || !dayKey || !label || !performedAt) {
        return null;
      }
      const routineTitles = Array.isArray(group.routineTitles)
        ? group.routineTitles.map((item) => readPrimitiveText(item)).filter((item): item is string => Boolean(item))
        : [];

      const rows = group.rows
        .map((row) => {
          if (!isRecord(row)) {
            return null;
          }
          const rowId = readPrimitiveText(row.id);
          const pointId = readPrimitiveText(row.pointId);
          const sessionId = readPrimitiveText(row.sessionId);
          const rowPerformedAt = readPrimitiveText(row.performedAt);
          const rowDayKey = readPrimitiveText(row.dayKey);
          const dayLabel = readPrimitiveText(row.dayLabel);
          const setIndex = readOptionalNumber(row.setIndex);
          const primary = readPrimitiveText(row.primary);
          if (!rowId || !pointId || !sessionId || !rowPerformedAt || !rowDayKey || !dayLabel || typeof setIndex !== "number" || !primary) {
            return null;
          }

          return {
            id: rowId,
            pointId,
            sessionId,
            performedAt: rowPerformedAt,
            dayKey: rowDayKey,
            dayLabel,
            setIndex,
            primary,
            ...(readOptionalString(row.meta) ? { meta: readOptionalString(row.meta) } : {}),
            values: normalizeHistoryValueParts(row.values),
            ...(row.isSkipped === true ? { isSkipped: true } : {}),
            ...(normalizeSignals(row.signals) ? { signals: normalizeSignals(row.signals) as ExerciseHistoryDayGroup["rows"][number]["signals"] } : {}),
            ...(normalizeTagLabels(row.tagLabels).length > 0 ? { tagLabels: normalizeTagLabels(row.tagLabels) } : {}),
          };
        })
        .filter((row): row is ExerciseHistoryDayGroup["rows"][number] => Boolean(row));

      return {
        id,
        dayKey,
        label,
        performedAt,
        ...(routineTitles.length > 0 ? { routineTitles } : {}),
        ...(group.isSkipped === true ? { isSkipped: true } : {}),
        ...(normalizeSignals(group.signals) ? { signals: normalizeSignals(group.signals) as ExerciseHistoryDayGroup["signals"] } : {}),
        ...(normalizeTagLabels(group.tagLabels).length > 0 ? { tagLabels: normalizeTagLabels(group.tagLabels) } : {}),
        rows,
      };
    })
    .filter((group): group is ExerciseHistoryDayGroup => Boolean(group));
}

function normalizeHistoryPoints(value: unknown): ExerciseHistoryPoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((point) => {
      if (!isRecord(point)) {
        return null;
      }
      const id = readPrimitiveText(point.id);
      const type = point.type === "day" || point.type === "set" || point.type === "progression-event" ? point.type : null;
      const performedAt = readPrimitiveText(point.performedAt);
      const dayKey = readPrimitiveText(point.dayKey);
      const label = readPrimitiveText(point.label);
      const summary = readPrimitiveText(point.summary);
      if (!id || !type || !performedAt || !dayKey || !label || !summary) {
        return null;
      }

      return {
        id,
        type,
        performedAt,
        dayKey,
        label,
        summary,
        ...(readOptionalString(point.meta) ? { meta: readOptionalString(point.meta) } : {}),
        numericValue: readOptionalNumber(point.numericValue) ?? null,
        values: normalizeHistoryValueParts(point.values),
        ...(point.isSkipped === true ? { isSkipped: true } : {}),
        ...(normalizeSignals(point.signals) ? { signals: normalizeSignals(point.signals) as ExerciseHistoryPoint["signals"] } : {}),
        ...(normalizeTagLabels(point.tagLabels).length > 0 ? { tagLabels: normalizeTagLabels(point.tagLabels) } : {}),
        ...(readOptionalString(point.rowId) ? { rowId: readOptionalString(point.rowId) } : {}),
      };
    })
    .filter((point): point is ExerciseHistoryPoint => Boolean(point));
}

function normalizeProgressionChartSections(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as ProgressionHistoryChartSection[];
  }

  const sections: ProgressionHistoryChartSection[] = [];

  for (const section of value) {
      if (!isRecord(section)) {
        continue;
      }

      const id = readPrimitiveText(section.id);
      const title = readPrimitiveText(section.title);
      const description = readPrimitiveText(section.description);
      const emptyTitle = readPrimitiveText(section.emptyTitle);
      const emptyCaption = readPrimitiveText(section.emptyCaption);
      if (!id || !title || !description || !emptyTitle || !emptyCaption || !Array.isArray(section.bars)) {
        continue;
      }

      const bars: ProgressionHistoryChartSection["bars"] = [];
      for (const bar of section.bars) {
        if (!isRecord(bar)) {
          continue;
        }

        const barId = readPrimitiveText(bar.id);
        const label = readPrimitiveText(bar.label);
        const value = readOptionalNumber(bar.value);
        const valueLabel = readPrimitiveText(bar.valueLabel);
        if (!barId || !label || typeof value !== "number" || !Number.isFinite(value) || !valueLabel) {
          continue;
        }

        bars.push({
          id: barId,
          label,
          value,
          valueLabel,
          ...(readOptionalString(bar.detail) !== null ? { detail: readOptionalString(bar.detail) } : {}),
        });
      }

      sections.push({
        id,
        title,
        description,
        emptyTitle,
        emptyCaption,
        bars,
      });
  }

  return sections;
}

function normalizeProgressionActivityDays(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as ExerciseProgressionActivityDay[];
  }

  const days: ExerciseProgressionActivityDay[] = [];

  for (const day of value) {
    if (!isRecord(day)) {
      continue;
    }

    const id = readPrimitiveText(day.id);
    const label = readPrimitiveText(day.label);
    const valueLabel = readPrimitiveText(day.valueLabel);
    if (!id || !label || !valueLabel || !Array.isArray(day.items)) {
      continue;
    }

    days.push({
      id,
      label,
      valueLabel,
      detail: readOptionalString(day.detail),
      eventCount: typeof day.eventCount === "number" && Number.isFinite(day.eventCount) ? day.eventCount : 0,
      promotionCount: typeof day.promotionCount === "number" && Number.isFinite(day.promotionCount) ? day.promotionCount : 0,
      deloadCount: typeof day.deloadCount === "number" && Number.isFinite(day.deloadCount) ? day.deloadCount : 0,
      manualChangeCount: typeof day.manualChangeCount === "number" && Number.isFinite(day.manualChangeCount) ? day.manualChangeCount : 0,
      revertCount: typeof day.revertCount === "number" && Number.isFinite(day.revertCount) ? day.revertCount : 0,
      items: day.items
        .map((item, index) => normalizeDetailSectionItemInput(item, index))
        .filter((item): item is DetailSectionListItemInput => Boolean(item))
        .map((item, index) => typeof item === "string"
          ? {
              id: `${id}-item-${index}`,
              primary: item,
            }
          : item),
    });
  }

  return days;
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
    chartSections: normalizeProgressionChartSections(value.chartSections),
    activityDays: normalizeProgressionActivityDays(value.activityDays),
    lifelineItems: Array.isArray(value.lifelineItems)
      ? value.lifelineItems.map((item) => readPrimitiveText(item)).filter((item): item is string => Boolean(item))
      : [],
  };
}

function normalizeDerivedProgression(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const signalLabel = readOptionalString(value.signalLabel);
  const methodLabel = readOptionalString(value.methodLabel);
  const reason = readOptionalString(value.reason);
  if (!signalLabel || !methodLabel || !reason) {
    return null;
  }

  const signalTone: "default" | "success" | "danger" | "muted" = value.signalTone === "success"
    || value.signalTone === "danger"
    || value.signalTone === "muted"
    || value.signalTone === "default"
    ? value.signalTone
    : "default";

  return {
    signalLabel,
    signalTone,
    methodLabel,
    currentTargetLabel: readOptionalString(value.currentTargetLabel),
    nextTargetLabel: readOptionalString(value.nextTargetLabel),
    reason,
    historySessionCount: readOptionalNumber(value.historySessionCount) ?? 0,
    historySetCount: readOptionalNumber(value.historySetCount) ?? 0,
    sourcePerformedAt: readOptionalString(value.sourcePerformedAt),
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
  const progressionDerived = normalizeDerivedProgression(value.progressionDerived);
  const bestSetSummary = readOptionalString(value.bests.bestSetSummary);
  const bestDistanceUnit = readOptionalString(value.bests.bestDistanceUnit);
  const graphMetricKey = readOptionalString(progress?.graphMetricKey);

  return {
    ...(readOptionalString(value.exercise_id) ? { exercise_id: readOptionalString(value.exercise_id) ?? undefined } : {}),
    ...(readOptionalString(value.activeRoutineTitle) !== null ? { activeRoutineTitle: readOptionalString(value.activeRoutineTitle) } : {}),
    filterOptions: normalizeExerciseInfoFilterOptions(value.filterOptions),
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
      ...(graphMetricKey && ["reps", "weight", "time", "distance", "calories"].includes(graphMetricKey)
        ? { graphMetricKey }
        : {}),
      performances: normalizePerformanceEntries(progress?.performances),
      historyGroups: normalizeHistoryGroups(progress?.historyGroups),
      historyPoints: normalizeHistoryPoints(progress?.historyPoints),
    },
    progression,
    ...(progressionDerived ? { progressionDerived } : {}),
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
  filterState: Partial<ExerciseInfoFilterState> | ExerciseInfoAnalyticsScope,
  signal?: AbortSignal,
): Promise<ExerciseInfoClientFetchResult> {
  const normalizedFilterState = typeof filterState === "string"
    ? {
        analyticsScope: filterState,
        routineId: null,
        cycleStartDate: null,
      }
    : {
        analyticsScope: filterState.analyticsScope ?? "all_time",
        routineId: filterState.routineId ?? null,
        cycleStartDate: filterState.cycleStartDate ?? null,
      };
  const params = new URLSearchParams({
    scope: normalizedFilterState.analyticsScope,
  });
  if (normalizedFilterState.routineId) {
    params.set("routineId", normalizedFilterState.routineId);
  }
  if (normalizedFilterState.cycleStartDate) {
    params.set("cycleStartDate", normalizedFilterState.cycleStartDate);
  }

  const response = await fetch(`/api/exercise-info/${exerciseId}?${params.toString()}`, { signal });
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
