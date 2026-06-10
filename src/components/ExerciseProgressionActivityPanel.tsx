"use client";

import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { ExerciseSurfaceMetricGrid } from "@/components/exercises/ExerciseSurfaceMetricGrid";
import { DetailSectionBlocks, DetailSectionItems } from "@/components/ui/DetailSectionList";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { MetricAccentBar, type MetricDatum } from "@/components/ui/MetricItem";
import { PillButton } from "@/components/ui/Pill";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/formatting";
import type { ExerciseProgressionActivityDay, ExerciseProgressionLifelineSummary } from "@/lib/progression-lifeline-summary";

function buildProgressionChangeMixMetrics(args: {
  promotionCount: number;
  deloadCount: number;
  manualChangeCount: number;
  revertCount: number;
}) {
  return [
    {
      label: "Promotions",
      value: String(args.promotionCount),
      valueTone: args.promotionCount > 0 ? "success" : "muted",
    },
    {
      label: "Regressed",
      value: String(args.deloadCount),
      valueTone: args.deloadCount > 0 ? "danger" : "muted",
    },
    {
      label: "Manual",
      value: String(args.manualChangeCount),
      valueTone: args.manualChangeCount > 0 ? "default" : "muted",
    },
    {
      label: "Reverted",
      value: String(args.revertCount),
      valueTone: args.revertCount > 0 ? "default" : "muted",
    },
  ] satisfies MetricDatum[];
}

function buildProgressionActivityOverviewSections(
  progression: ExerciseProgressionLifelineSummary,
  options?: {
    hideLastPromotion?: boolean;
  },
) {
  const recentWindowDays = progression.recentWindowDays ?? 30;

  return [
    progression.latestChangeSummary ? { title: "Latest Change", items: [progression.latestChangeSummary] } : null,
    progression.recentActivitySummary
      ? { title: `${recentWindowDays}D Activity`, items: [progression.recentActivitySummary] }
      : null,
    !options?.hideLastPromotion && progression.lastPromotionAt
      ? { title: "Last Promotion", items: [formatDateShort(progression.lastPromotionAt)] }
      : null,
  ].filter((section): section is { title: string; items: string[] } => Boolean(section));
}

function buildProgressionTimelineSummary(day: ExerciseProgressionActivityDay) {
  const parts = [
    day.valueLabel,
    day.promotionCount > 0 ? `${day.promotionCount} promo` : null,
    day.deloadCount > 0 ? `${day.deloadCount} regress` : null,
    day.manualChangeCount > 0 ? `${day.manualChangeCount} manual` : null,
    day.revertCount > 0 ? `${day.revertCount} revert` : null,
  ].filter((part): part is string => Boolean(part));

  return parts.join(" | ");
}

function ProgressionActivityTimelineGraph({
  activityDays,
  selectedDayId,
  onSelectDay,
}: {
  activityDays: NonNullable<ExerciseProgressionLifelineSummary["activityDays"]>;
  selectedDayId: string | null;
  onSelectDay: (dayId: string) => void;
}) {
  if (activityDays.length === 0) {
    return null;
  }

  const chartWidth = 320;
  const chartHeight = 124;
  const paddingX = 18;
  const paddingTop = 16;
  const paddingBottom = 28;
  const innerWidth = chartWidth - (paddingX * 2);
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const maxEventCount = Math.max(...activityDays.map((day) => day.eventCount), 1);
  const firstDayLabel = activityDays[0]?.label ?? "";
  const lastDayLabel = activityDays[activityDays.length - 1]?.label ?? "";
  const selectedDay = activityDays.find((day) => day.id === selectedDayId) ?? null;
  const points = activityDays.map((day, index) => {
    const x = activityDays.length === 1
      ? chartWidth / 2
      : paddingX + ((innerWidth / (activityDays.length - 1)) * index);
    const normalizedValue = maxEventCount <= 1 ? 1 : day.eventCount / maxEventCount;
    const y = paddingTop + ((1 - normalizedValue) * innerHeight);
    return {
      day,
      x,
      y,
      leftPercent: (x / chartWidth) * 100,
      topPercent: (y / chartHeight) * 100,
      selected: day.id === selectedDayId,
    };
  });
  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const guideValues = maxEventCount <= 1
    ? [1]
    : Array.from(new Set([1, Math.max(1, Math.round(maxEventCount / 2)), maxEventCount])).sort((left, right) => left - right);

  return (
    <div className="space-y-2 rounded-[1rem] border border-[rgb(var(--border-rgb)/0.42)] bg-[rgb(var(--surface-2-rgb)/0.14)] px-3 py-3">
      <div className="flex items-center justify-between gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-secondary)/0.84)]">
        <span className="truncate">{firstDayLabel}</span>
        <span className="shrink-0">{maxEventCount === 1 ? "1 event peak" : `${maxEventCount} event peak`}</span>
        <span className="truncate text-right">{lastDayLabel}</span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[7.75rem] w-full" aria-hidden="true">
          {guideValues.map((guideValue) => {
            const normalizedValue = maxEventCount <= 1 ? 1 : guideValue / maxEventCount;
            const y = paddingTop + ((1 - normalizedValue) * innerHeight);
            return (
              <line
                key={`guide-${guideValue}`}
                x1={paddingX}
                x2={chartWidth - paddingX}
                y1={y}
                y2={y}
                stroke="rgb(var(--border-rgb) / 0.2)"
                strokeWidth="1"
                strokeDasharray="3 5"
              />
            );
          })}
          <line
            x1={paddingX}
            x2={chartWidth - paddingX}
            y1={chartHeight - paddingBottom}
            y2={chartHeight - paddingBottom}
            stroke="rgb(var(--border-rgb) / 0.34)"
            strokeWidth="1.2"
          />
          {points.length > 1 ? (
            <polyline
              fill="none"
              stroke="rgb(var(--accent-strong) / 0.82)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={polylinePoints}
            />
          ) : null}
          {points.map((point) => (
            <g key={point.day.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={point.selected ? 6.5 : 5}
                fill={point.selected ? "rgb(var(--accent-strong) / 0.96)" : "rgb(var(--surface-1-rgb) / 0.96)"}
                stroke="rgb(var(--accent-strong) / 0.92)"
                strokeWidth={point.selected ? 2.4 : 1.8}
              />
            </g>
          ))}
        </svg>
        {points.map((point) => (
          <button
            key={`point-${point.day.id}`}
            type="button"
            onClick={() => onSelectDay(point.day.id)}
            className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${point.leftPercent}%`, top: `${point.topPercent}%` }}
            aria-label={`Open progression details for ${point.day.label}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 text-[0.72rem] leading-5 text-[rgb(var(--text-secondary)/0.88)]">
        <span>{activityDays.length} tracked {activityDays.length === 1 ? "day" : "days"}</span>
        <span className="text-right">
          {selectedDay ? buildProgressionTimelineSummary(selectedDay) : "Tap a point to inspect that day."}
        </span>
      </div>
    </div>
  );
}

type ExerciseProgressionActivityPanelProps = {
  progression: ExerciseProgressionLifelineSummary;
  activityTitle?: string;
  headingClassName: string;
  subsectionTitleClassName: string;
  renderMetaLine: (parts: string[]) => ReactNode;
  metricGridProps?: Omit<ComponentProps<typeof ExerciseSurfaceMetricGrid>, "items">;
  topDividerClassName?: string | null;
  className?: string;
  hideLastPromotionOverview?: boolean;
};

export function ExerciseProgressionActivityPanel({
  progression,
  activityTitle = "Progression Activity",
  headingClassName,
  subsectionTitleClassName,
  renderMetaLine,
  metricGridProps,
  topDividerClassName,
  className,
  hideLastPromotionOverview = false,
}: ExerciseProgressionActivityPanelProps) {
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const activityDays = useMemo(
    () => [...(progression.activityDays ?? [])].sort((left, right) => left.id.localeCompare(right.id)),
    [progression.activityDays],
  );

  useEffect(() => {
    setSelectedDayId(null);
  }, [progression.latestChangeAt]);

  const selectedDay = activityDays.find((day) => day.id === selectedDayId) ?? null;
  const maxEventCount = activityDays.reduce((current, day) => Math.max(current, day.eventCount), 0);
  const changeMixMetrics = buildProgressionChangeMixMetrics({
    promotionCount: selectedDay?.promotionCount ?? progression.promotionCount,
    deloadCount: selectedDay?.deloadCount ?? progression.deloadCount,
    manualChangeCount: selectedDay?.manualChangeCount ?? progression.manualChangeCount,
    revertCount: selectedDay?.revertCount ?? progression.revertCount,
  });
  const overviewSections = selectedDay
    ? []
    : buildProgressionActivityOverviewSections(progression, { hideLastPromotion: hideLastPromotionOverview });
  const changeTitle = selectedDay ? `${selectedDay.label} Changes` : "Changes";
  const selectedDaySummaryParts = selectedDay
    ? [selectedDay.detail, selectedDay.valueLabel].filter((part): part is string => Boolean(part?.trim()))
    : [];

  if (activityDays.length === 0 && overviewSections.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2 px-1 pb-1", className)}>
      {topDividerClassName ? <MetricAccentBar variant="thin" className={topDividerClassName} /> : null}
      <div className="space-y-2">
        <div className="relative min-h-[1.9rem] px-2">
          <p className={headingClassName}>
            {activityTitle}
          </p>
        </div>
        {overviewSections.length > 0 ? (
          <div className={cn(appTokens.detailHistoryRow, "px-2 py-2")}>
            <DetailSectionBlocks sections={overviewSections} titleClassName={subsectionTitleClassName} />
          </div>
        ) : null}
        {activityDays.length > 0 ? (
          <ProgressionActivityTimelineGraph
            activityDays={activityDays}
            selectedDayId={selectedDayId}
            onSelectDay={setSelectedDayId}
          />
        ) : null}
        {selectedDay ? (
          <div className={cn(appTokens.detailHistoryRow, "px-2 py-2")}>
            <div className="space-y-2.5">
              <div className="relative min-h-[1.9rem] px-0.5">
                <PillButton
                  active
                  type="button"
                  onClick={() => setSelectedDayId(null)}
                  className="absolute left-0 top-1/2 min-h-[1.7rem] -translate-y-1/2 px-2 py-[3px] text-[9px] tracking-[0.14em]"
                >
                  <ChevronRightIcon className="h-3.5 w-3.5 rotate-180 text-[rgb(var(--accent-divider-rgb)/0.96)]" />
                  Back
                </PillButton>
                <p className={cn(headingClassName, "px-8")}>
                  {selectedDay.label}
                </p>
              </div>
              {selectedDaySummaryParts.length > 0 ? (
                <div className="px-0.5">
                  {renderMetaLine(selectedDaySummaryParts)}
                </div>
              ) : null}
              <DetailSectionItems items={selectedDay.items} className="pl-0.5" showBullets={false} />
            </div>
          </div>
        ) : activityDays.length > 0 ? (
          <div className="space-y-2">
            {activityDays.map((day) => {
              const widthPercent = maxEventCount > 0
                ? Math.max((day.eventCount / maxEventCount) * 100, day.eventCount > 0 ? 8 : 0)
                : 0;

              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedDayId(day.id)}
                  className="w-full rounded-[1rem] border border-[rgb(var(--border-rgb)/0.42)] bg-[rgb(var(--surface-2-rgb)/0.14)] px-3.5 py-3 text-left transition-colors hover:border-[rgb(var(--accent-strong)/0.45)] hover:bg-[rgb(var(--surface-2-rgb)/0.22)]"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary)/0.95)]">
                          {day.label}
                        </p>
                        {day.detail ? (
                          <p className="text-[0.75rem] leading-5 text-[rgb(var(--text-muted)/0.88)]">
                            {day.detail}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.86)]">
                          {day.valueLabel}
                        </p>
                        <ChevronRightIcon className="h-4 w-4 text-[rgb(var(--text-muted)/0.92)]" />
                      </div>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[rgb(var(--surface-3-rgb)/0.42)]">
                      <div
                        className="h-full rounded-full bg-[rgb(var(--accent-strong)/0.72)] transition-[width] duration-300"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <p className={headingClassName}>
          {changeTitle}
        </p>
        <ExerciseSurfaceMetricGrid items={changeMixMetrics} {...metricGridProps} />
      </div>
    </div>
  );
}
