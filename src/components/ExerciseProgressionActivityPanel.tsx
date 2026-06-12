"use client";

import type { ComponentProps, ReactNode } from "react";
import { ExerciseSurfaceMetricGrid } from "@/components/exercises/ExerciseSurfaceMetricGrid";
import { MetricAccentBar, type MetricDatum } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";
import type { ExerciseProgressionLifelineSummary } from "@/lib/progression-lifeline-summary";

function buildProgressionChangeMixMetrics(args: {
  promotionCount: number;
  deloadCount: number;
  manualChangeCount: number;
  watchCount?: number;
  revertCount: number;
}) {
  const regressionCount = args.deloadCount + args.revertCount;
  const watchCount = args.watchCount ?? 0;

  return [
    {
      label: "Promotions",
      value: String(args.promotionCount),
      valueTone: args.promotionCount > 0 ? "success" : "muted",
    },
    {
      label: "Regressions",
      value: String(regressionCount),
      valueTone: regressionCount > 0 ? "danger" : "muted",
    },
    {
      label: "Watch",
      value: String(watchCount),
      valueTone: watchCount > 0 ? "warning" : "muted",
    },
    {
      label: "Manual",
      value: String(args.manualChangeCount),
      valueTone: args.manualChangeCount > 0 ? "warning" : "muted",
    },
  ] satisfies MetricDatum[];
}

type ExerciseProgressionActivityPanelProps = {
  progression: ExerciseProgressionLifelineSummary;
  activityTitle?: string;
  headingClassName: string;
  subsectionTitleClassName: string;
  renderMetaLine?: (parts: string[]) => ReactNode;
  metricGridProps?: Omit<ComponentProps<typeof ExerciseSurfaceMetricGrid>, "items">;
  topDividerClassName?: string | null;
  className?: string;
  hideLastPromotionOverview?: boolean;
};

export function ExerciseProgressionActivityPanel({
  progression,
  metricGridProps,
  topDividerClassName,
  className,
}: ExerciseProgressionActivityPanelProps) {
  const changeMixMetrics = buildProgressionChangeMixMetrics({
    promotionCount: progression.promotionCount,
    deloadCount: progression.deloadCount,
    manualChangeCount: progression.manualChangeCount,
    watchCount: progression.watchCount,
    revertCount: progression.revertCount,
  });

  if (changeMixMetrics.every((metric) => metric.value === "0")) {
    return null;
  }

  return (
    <div className={cn("space-y-2 px-1 pb-1", className)}>
      {topDividerClassName ? <MetricAccentBar variant="thin" className={topDividerClassName} /> : null}
      <div className="space-y-1.5 pt-1">
        <ExerciseSurfaceMetricGrid items={changeMixMetrics} {...metricGridProps} scrollable />
      </div>
    </div>
  );
}
