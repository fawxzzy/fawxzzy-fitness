"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import { HistoryDetailExerciseCard } from "@/components/history/HistoryDetailExerciseCard";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { SignatureDot, SignatureMetaTag } from "@/components/ui/app/SignatureSeparator";
import { type MetricDatum } from "@/components/ui/MetricItem";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import type { ExerciseBrowserTrendPreview } from "@/lib/exercises-browser";
import { resolveWorkoutCardMediaRailWidth } from "@/lib/workout-card-surface-policy";

const HISTORY_EXERCISE_MEDIA_SIZE = resolveWorkoutCardMediaRailWidth("history-browser");
const HISTORY_EXERCISE_DETAIL_MEDIA_WIDTH = HISTORY_EXERCISE_MEDIA_SIZE + 32;
function renderMetaBadge(value: string) {
  return (
    <SignatureMetaTag>
      {value}
    </SignatureMetaTag>
  );
}

function RotatingMetaBadge({
  items,
}: {
  items: string[];
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) {
      setIndex(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [items]);

  const current = items[index] ?? items[0] ?? null;
  return current ? renderMetaBadge(current) : null;
}

function MiniExerciseTrendPreview({ trend }: { trend?: ExerciseBrowserTrendPreview | null }) {
  const points = trend?.points ?? [];
  if (!trend || points.length < 2) {
    return null;
  }

  const width = 168;
  const height = 104;
  const paddingX = 9;
  const paddingY = 14;
  const getPointPlotValue = (point: (typeof points)[number]) => (
    typeof point.plotValue === "number" && Number.isFinite(point.plotValue)
      ? point.plotValue
      : point.value
  );
  const values = points.map((point) => getPointPlotValue(point));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueSpan = Math.max(maxValue - minValue, 1);
  const usableWidth = width - (paddingX * 2);
  const usableHeight = height - (paddingY * 2);
  const path = points
    .map((point, index) => {
      const x = paddingX + (points.length === 1 ? usableWidth / 2 : (index / (points.length - 1)) * usableWidth);
      const plotValue = getPointPlotValue(point);
      const y = paddingY + (1 - ((plotValue - minValue) / valueSpan)) * usableHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const lastPlotValue = getPointPlotValue(lastPoint);
  const firstPlotValue = getPointPlotValue(firstPoint);
  const trendTone = lastPlotValue > firstPlotValue
    ? "text-[rgb(var(--success-rgb)/0.96)]"
    : lastPlotValue < firstPlotValue
      ? "text-[rgb(var(--danger-rgb)/0.9)]"
      : "text-[rgb(var(--accent-yellow-on)/0.9)]";

  return (
    <div
      aria-hidden="true"
      className="relative h-full min-h-[104px] overflow-hidden rounded-[0.8rem] border border-[rgb(var(--accent-divider-rgb)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.42)] px-2 py-1.5"
    >
      <div className="mb-0.5 flex items-center justify-between gap-2 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.82)]">
        <span className="truncate">{trend.label}</span>
        <span className="text-[rgb(var(--accent-divider-rgb)/0.88)]">{points.length}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[calc(100%-1rem)] w-full overflow-visible">
        <defs>
          <linearGradient id={`history-mini-trend-${trend.metricKey}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgb(var(--accent-divider-rgb) / 0.36)" />
            <stop offset="48%" stopColor="rgb(var(--accent-divider-rgb) / 0.88)" />
            <stop offset="100%" stopColor="rgb(var(--accent-divider-rgb) / 0.52)" />
          </linearGradient>
        </defs>
        <path
          d={`M ${paddingX} ${height - paddingY} H ${width - paddingX}`}
          fill="none"
          stroke="rgb(var(--accent-divider-rgb) / 0.16)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d={path}
          fill="none"
          stroke={`url(#history-mini-trend-${trend.metricKey})`}
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point, index) => {
          const x = paddingX + (points.length === 1 ? usableWidth / 2 : (index / (points.length - 1)) * usableWidth);
          const plotValue = getPointPlotValue(point);
          const y = paddingY + (1 - ((plotValue - minValue) / valueSpan)) * usableHeight;
          return (
            <circle
              key={point.id}
              cx={x}
              cy={y}
              r={index === points.length - 1 ? 2.05 : 1.25}
              fill="rgb(var(--bg-app) / 0.98)"
              stroke="rgb(var(--accent-divider-rgb) / 0.9)"
              strokeWidth="1.05"
            />
          );
        })}
      </svg>
      <div className={cn("pointer-events-none absolute bottom-1.5 right-2 text-[0.58rem] font-semibold uppercase tracking-[0.14em]", trendTone)}>
        Trend
      </div>
    </div>
  );
}

export function HistoryExerciseCard({
  exercise,
  title,
  summaryLabel,
  summary,
  comparison,
  metadata,
  badgeText,
  badgeItems = [],
  metrics,
  trendPreview,
  detailSections = [],
  density,
  tone,
  onPress,
}: {
  exercise?: {
    name: string;
    slug?: string | null;
    image_path?: string | null;
    image_icon_path?: string | null;
    image_howto_path?: string | null;
  };
  title: string;
  summaryLabel: string;
  summary: string;
  comparison?: string | null;
  metadata?: ReactNode;
  badgeText?: string;
  badgeItems?: string[];
  metrics?: MetricDatum[];
  trendPreview?: ExerciseBrowserTrendPreview | null;
  detailSections?: Array<{
    title: string;
    items: string[];
  }>;
  density: "compact" | "detailed";
  tone: CardSemanticTone;
  onPress: () => void;
}) {
  const resolvedExercise = exercise ?? { name: title };
  const resolvedBadgeItems = badgeItems.length > 0 ? badgeItems : (badgeText ? [badgeText] : []);
  const summaryText = comparison ? `${summary} | ${comparison}` : summary;
  const resolvedSubtitleLabel = summaryLabel;
  const resolvedSubtitle = summaryText;

  if (density === "detailed") {
    return (
      <div
        data-history-card="exercise"
        data-history-density={density}
        data-history-surface="history-browser"
      >
        <HistoryDetailExerciseCard
          exercise={resolvedExercise}
          summary=""
          summaryLabel=""
          headerMetadata={metadata}
          badgeText={badgeText}
          badgeItems={resolvedBadgeItems}
          metrics={metrics}
          density="detailed"
          tone={tone}
          leadingVisual={(
            <ExerciseThumb
              exercise={resolvedExercise}
              detailed={false}
              layout="inline"
              width={HISTORY_EXERCISE_DETAIL_MEDIA_WIDTH}
              height={HISTORY_EXERCISE_DETAIL_MEDIA_WIDTH}
              sizes={`${HISTORY_EXERCISE_DETAIL_MEDIA_WIDTH}px`}
              fitOverride="contain"
              intent="row-card"
              className="h-full w-full rounded-[0.8rem] border border-[rgb(var(--accent-divider-rgb)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.92)]"
            />
          )}
          mediaRailWidthOverride={HISTORY_EXERCISE_DETAIL_MEDIA_WIDTH}
          detailVisualAside={<MiniExerciseTrendPreview trend={trendPreview} />}
          detailSections={detailSections}
          expanded={false}
          onPress={onPress}
        />
      </div>
    );
  }

  return (
    <div
      data-history-card="exercise"
      data-history-density={density}
      data-history-surface="history-browser"
    >
      <HistoryDetailExerciseCard
        exercise={resolvedExercise}
        summary={resolvedSubtitle}
        summaryLabel={resolvedSubtitleLabel}
        headerMetadata={metadata}
        badgeText={badgeText}
        badgeItems={resolvedBadgeItems}
        density="compact"
        tone={tone}
        surface="history-browser"
        dataSurface="history-browser"
        compactBadgePlacement="stack"
        leadingVisual={(
          <ExerciseThumb
            exercise={resolvedExercise}
            detailed={false}
            layout="rail"
            railWidth={HISTORY_EXERCISE_MEDIA_SIZE}
            sizes={`${HISTORY_EXERCISE_MEDIA_SIZE}px`}
            intent="row-card"
          />
        )}
        mediaRailWidthOverride={HISTORY_EXERCISE_MEDIA_SIZE}
        footerContent={resolvedBadgeItems.length > 0 ? (
          <div className="pt-[1px]">
            <RotatingMetaBadge items={resolvedBadgeItems} />
          </div>
        ) : null}
        expanded={false}
        onPress={onPress}
      />
    </div>
  );
}
