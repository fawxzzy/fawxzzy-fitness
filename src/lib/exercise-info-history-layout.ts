import type { HistoryGraphMetricKey } from "@/lib/exercise-info-history-axis";

export type HistoryDayBand = {
  centerX: number;
  endX: number;
  innerEndX: number;
  innerStartX: number;
  startX: number;
  width: number;
};

export function buildHistoryDayBandLayout(args: {
  dayKeys: string[];
  actualDayKeys: Set<string>;
  leftGutter: number;
  innerWidth: number;
  setCountsByDay: Map<string, number>;
  changeCountsByDay: Map<string, number>;
}) {
  const weightedDays = args.dayKeys.map((dayKey) => {
    const setCount = args.setCountsByDay.get(dayKey) ?? 0;
    const changeCount = args.changeCountsByDay.get(dayKey) ?? 0;
    const hasActualDayPoint = args.actualDayKeys.has(dayKey);
    const baseWeight = hasActualDayPoint ? 0.92 : 0.24;
    const setWeight = Math.max(setCount - 1, 0) * 0.94;
    const changeWeight = Math.max(Math.min(changeCount, 3) - 1, 0) * 0.42;
    const weight = baseWeight + setWeight + changeWeight;

    return {
      dayKey,
      weight,
    };
  });
  const totalWeight = Math.max(weightedDays.reduce((sum, day) => sum + day.weight, 0), 1);
  const xByDayKey = new Map<string, number>();
  const slotWidthByDayKey = new Map<string, number>();
  const bandByDayKey = new Map<string, HistoryDayBand>();
  let cursor = args.leftGutter;

  weightedDays.forEach((day, index) => {
    const remainingWidth = (args.leftGutter + args.innerWidth) - cursor;
    const width = index === weightedDays.length - 1
      ? Math.max(remainingWidth, 0)
      : args.innerWidth * (day.weight / totalWeight);
    const safeWidth = Math.max(width, 0);
    const centerX = cursor + (safeWidth / 2);
    const outerPadding = Math.min(Math.max(5, safeWidth * 0.12), 18);
    const innerStartX = cursor + outerPadding;
    const innerEndX = (cursor + safeWidth) - outerPadding;
    xByDayKey.set(day.dayKey, centerX);
    slotWidthByDayKey.set(day.dayKey, safeWidth);
    bandByDayKey.set(day.dayKey, {
      centerX,
      endX: cursor + safeWidth,
      innerEndX,
      innerStartX,
      startX: cursor,
      width: safeWidth,
    });
    cursor += safeWidth;
  });

  return {
    bandByDayKey,
    xByDayKey,
    slotWidthByDayKey,
  };
}

export function resolveHistorySetSlotX(args: {
  band: HistoryDayBand | null | undefined;
  baseX: number;
  daySlotWidth?: number | null;
  pointIndex: number;
  pointsInDay: number;
}) {
  if (args.pointsInDay <= 1) {
    return args.baseX;
  }

  if (!args.band) {
    const daySlotWidth = args.daySlotWidth ?? 16;
    const maxSpreadWithinDay = Math.max(10, Math.min(daySlotWidth * 0.82, 42));
    const spread = Math.min(maxSpreadWithinDay, Math.max(12, args.pointsInDay * 6.25));
    const step = spread / Math.max(args.pointsInDay - 1, 1);
    return args.baseX + ((args.pointIndex * step) - (spread / 2));
  }

  const usableWidth = Math.max(args.band.innerEndX - args.band.innerStartX, 0);
  if (usableWidth <= 0) {
    return args.band.centerX;
  }

  const slotStep = args.pointsInDay <= 1 ? 0 : usableWidth / Math.max(args.pointsInDay - 1, 1);
  return args.band.innerStartX + (slotStep * args.pointIndex);
}

export function buildHistoryValueGridTicks(args: {
  metricKey: HistoryGraphMetricKey;
  numericValues: number[];
  tickCount?: number;
}) {
  if (args.metricKey === "weight") {
    return Array.from(new Set(args.numericValues.map((value) => Number(value.toFixed(3)))))
      .sort((left, right) => right - left);
  }

  const tickCount = args.tickCount ?? 5;
  const minValue = args.numericValues.length > 0 ? Math.min(...args.numericValues) : 0;
  const maxValue = args.numericValues.length > 0 ? Math.max(...args.numericValues) : 1;
  const range = Math.max(maxValue - minValue, 1);

  return Array.from({ length: tickCount }, (_, index) => {
    const ratio = tickCount === 1 ? 0 : index / (tickCount - 1);
    return Number((maxValue - (range * ratio)).toFixed(3));
  });
}

export function resolveHistorySetPlotY(args: {
  metricKey: HistoryGraphMetricKey;
  maxSecondaryReps?: number | null;
  minValue: number;
  primaryLevelsDesc?: number[];
  primaryValue: number;
  secondaryReps?: number | null;
  setLaneHeight: number;
  setLaneTop: number;
  valueRange: number;
}) {
  const baseY = args.setLaneTop + ((1 - ((args.primaryValue - args.minValue) / args.valueRange)) * args.setLaneHeight);
  if (
    args.metricKey !== "weight"
    || typeof args.secondaryReps !== "number"
    || !Number.isFinite(args.secondaryReps)
    || args.secondaryReps <= 1
    || typeof args.maxSecondaryReps !== "number"
    || !Number.isFinite(args.maxSecondaryReps)
    || args.maxSecondaryReps <= 1
    || !args.primaryLevelsDesc?.length
  ) {
    return baseY;
  }

  const currentLevelIndex = args.primaryLevelsDesc.findIndex((level) => Math.abs(level - args.primaryValue) < 0.001);
  if (currentLevelIndex < 0) {
    return baseY;
  }

  const higherLevel = currentLevelIndex > 0 ? args.primaryLevelsDesc[currentLevelIndex - 1] : null;
  const lowerLevel = currentLevelIndex < args.primaryLevelsDesc.length - 1 ? args.primaryLevelsDesc[currentLevelIndex + 1] : null;
  const referenceLevel = higherLevel ?? lowerLevel;
  const referenceY = typeof referenceLevel === "number" && Number.isFinite(referenceLevel)
    ? args.setLaneTop + ((1 - ((referenceLevel - args.minValue) / args.valueRange)) * args.setLaneHeight)
    : null;
  const referenceGap = typeof referenceY === "number" && Number.isFinite(referenceY)
    ? Math.abs(baseY - referenceY)
    : 0;
  const fallbackGap = Math.max(Math.min(args.setLaneHeight / Math.max(args.primaryLevelsDesc.length + 2, 3), 32), 12);
  const gap = referenceGap > 0 ? referenceGap : fallbackGap;

  const maxOffsetPx = Math.max(Math.min(gap * 0.84, 30), 8);
  const repsRatio = Math.max(0, Math.min((args.secondaryReps - 1) / Math.max(args.maxSecondaryReps - 1, 1), 1));
  return baseY - (repsRatio * maxOffsetPx);
}
