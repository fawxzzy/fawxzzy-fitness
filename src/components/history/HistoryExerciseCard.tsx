"use client";

import type { ReactNode } from "react";
import { HistoryDetailExerciseCard, type HistoryExerciseVisual } from "@/components/history/HistoryDetailExerciseCard";
import { toHistoryMetaText, toHistoryStatItems } from "@/components/history/historyStats";
import { StatGrid, type CardTone } from "@/components/ui/card-system";
import { type MetricDatum } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";
import type { ExerciseBrowserTrendPreview } from "@/lib/exercises-browser";

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
      className="relative h-full min-h-[104px] overflow-hidden rounded-[var(--radius-md)] border border-[rgb(var(--accent-divider-rgb)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.42)] px-3 py-2"
    >
      <div className="mb-0.5 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted)/0.82)]">
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
      <div className={cn("pointer-events-none absolute bottom-2 right-3 text-[11px] font-semibold uppercase tracking-[0.12em]", trendTone)}>
        Trend
      </div>
    </div>
  );
}

function HistoryBulletSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-1.5">
      <h3 className="m-0 text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-[rgb(var(--text-muted)/0.98)]">{title}</h3>
      <ul className="m-0 grid list-disc gap-1 pl-4 marker:text-[rgb(var(--accent-divider-rgb)/0.96)]">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="text-[12.5px] leading-snug text-[rgb(var(--text-primary)/0.95)] [overflow-wrap:anywhere]">{item}</li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Exercise browser row. Compact: thumbnail, name, facts, `Last` summary and signals. Detailed: the same header
 * plus a body with the trend sparkline, the metric grid and the detail bullets (the old detailed card put a
 * 120px thumbnail in a float cut-out and the metrics in a sideways scroller). Opening the exercise info sheet is
 * the one action (`press`, right chevron).
 */
export function HistoryExerciseCard({
  exercise,
  title,
  summaryLabel,
  summary,
  comparison,
  metaItems = [],
  badgeItems = [],
  metrics,
  trendPreview,
  detailSections = [],
  density,
  tone,
  showMedia = true,
  onPress,
}: {
  exercise?: HistoryExerciseVisual;
  title: string;
  summaryLabel: string;
  summary: string;
  comparison?: string | null;
  metaItems?: string[];
  badgeItems?: string[];
  metrics?: MetricDatum[];
  trendPreview?: ExerciseBrowserTrendPreview | null;
  detailSections?: Array<{
    title: string;
    items: string[];
  }>;
  density: "compact" | "detailed";
  tone: CardTone;
  /** Hide the thumbnail (surface policy, tests). */
  showMedia?: boolean;
  onPress: () => void;
}) {
  const resolvedExercise = exercise ?? { name: title };
  const summaryText = [summary, comparison].filter((part): part is string => Boolean(part && part.trim())).map(toHistoryMetaText).join(" · ");
  const isDetailed = density === "detailed";
  const hasBody = isDetailed && ((metrics?.length ?? 0) > 0 || detailSections.length > 0 || (trendPreview?.points.length ?? 0) >= 2);

  return (
    <div
      data-history-card="exercise"
      data-history-density={density}
      data-history-surface="history-browser"
    >
      <HistoryDetailExerciseCard
        exercise={resolvedExercise}
        summary={isDetailed ? undefined : summaryText}
        summaryLabel={summaryLabel}
        metaItems={metaItems}
        factItems={badgeItems}
        tone={tone}
        interaction="press"
        showLeadingVisual={showMedia}
        onPress={onPress}
        dataSurface="history-browser"
        density={density}
        body={hasBody ? (
          <div className="grid gap-4">
            <MiniExerciseTrendPreview trend={trendPreview} />
            <StatGrid items={toHistoryStatItems(metrics ?? [])} />
            {detailSections.map((section) => <HistoryBulletSection key={section.title} title={section.title} items={section.items} />)}
          </div>
        ) : undefined}
      />
    </div>
  );
}
