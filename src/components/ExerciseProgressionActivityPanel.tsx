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
import type { ExerciseProgressionLifelineSummary } from "@/lib/progression-lifeline-summary";

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
