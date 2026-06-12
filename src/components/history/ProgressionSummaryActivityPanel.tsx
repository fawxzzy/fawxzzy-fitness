"use client";

import { ExerciseSurfaceMetricGrid } from "@/components/exercises/ExerciseSurfaceMetricGrid";
import { DetailSectionItems } from "@/components/ui/DetailSectionList";
import type { MetricDatum } from "@/components/ui/MetricItem";

type ProgressionChangeSummary = {
  promotionCount: number;
  deloadCount: number;
  manualChangeCount: number;
  watchCount?: number;
  revertCount?: number;
};

function buildChangeMixMetrics(summary: ProgressionChangeSummary) {
  const regressionCount = summary.deloadCount + (summary.revertCount ?? 0);
  const watchCount = summary.watchCount ?? 0;

  return [
    {
      label: "Promotions",
      value: String(summary.promotionCount),
      valueTone: summary.promotionCount > 0 ? "success" : "muted",
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
      value: String(summary.manualChangeCount),
      valueTone: summary.manualChangeCount > 0 ? "warning" : "muted",
    },
  ] satisfies MetricDatum[];
}

const SECTION_HEADING_CLASS_NAME = "px-2 pt-0.5 text-center text-[0.82rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-divider-rgb)/0.96)]";

export function ProgressionSummaryActivityPanel({
  changeSummary,
  hotspotItems,
}: {
  changeSummary: ProgressionChangeSummary;
  hotspotItems: string[];
}) {
  const changeMixMetrics = buildChangeMixMetrics(changeSummary);

  if (changeMixMetrics.every((metric) => metric.value === "0") && hotspotItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {changeMixMetrics.length > 0 ? (
        <div className="space-y-1.5 px-1">
          <ExerciseSurfaceMetricGrid items={changeMixMetrics} scrollable />
        </div>
      ) : null}
      {hotspotItems.length > 0 ? (
        <div className="space-y-1.5">
          <p className={SECTION_HEADING_CLASS_NAME}>Signals</p>
          <div className="px-2 py-1">
            <DetailSectionItems items={hotspotItems} className="pl-0.5" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
