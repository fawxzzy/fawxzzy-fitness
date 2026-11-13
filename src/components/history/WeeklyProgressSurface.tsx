"use client";

import { HistoryDisclosureCard } from "@/components/history/HistoryMetricsDisclosure";
import { toHistoryStatItems } from "@/components/history/historyStats";
import { StatGrid } from "@/components/ui/card-system";
import { DetailSectionBlock, DetailSectionItems } from "@/components/ui/DetailSectionList";
import type { MetricDatum } from "@/components/ui/MetricItem";
import type { WeeklyProgressSummary } from "@/lib/history-weekly-progress";

function formatDayKey(dayKey: string) {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatWeekRangeLabel(summary: WeeklyProgressSummary) {
  return `${formatDayKey(summary.weekStart)} - ${formatDayKey(summary.weekEnd)}`;
}

function buildWeeklyHeaderTitle({
  summary,
  suffix,
  fallbackLabel,
  routineTitleOverride,
}: {
  summary: WeeklyProgressSummary;
  suffix: "Summary" | "Progression";
  fallbackLabel: string;
  routineTitleOverride?: string | null;
}) {
  const routineTitle = routineTitleOverride?.trim() || summary.primaryRoutineTitle?.trim();

  return {
    title: routineTitle ? `${routineTitle} ${suffix}` : fallbackLabel,
    rangeLabel: formatWeekRangeLabel(summary),
  };
}

function buildHistoricalSummaryTitle(summary: WeeklyProgressSummary, routineTitleOverride?: string | null) {
  return buildWeeklyHeaderTitle({
    summary,
    suffix: "Summary",
    fallbackLabel: "Summary",
    routineTitleOverride,
  });
}

function buildCurrentProgressionTitle(summary: WeeklyProgressSummary, routineTitleOverride?: string | null) {
  return buildWeeklyHeaderTitle({
    summary,
    suffix: "Progression",
    fallbackLabel: "Cycle Progression",
    routineTitleOverride,
  });
}

function getCompletionTone(summary: WeeklyProgressSummary): MetricDatum["valueTone"] {
  if (summary.primaryRoutineTargetCount <= 0) {
    return "muted";
  }

  if (summary.completedWorkoutCount >= summary.primaryRoutineTargetCount) {
    return "success";
  }

  return summary.completedWorkoutCount > 0 ? "default" : "muted";
}

function getTodayKey(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : null;
}

function buildPlannedDayStatusMetric(summary: WeeklyProgressSummary): MetricDatum {
  const remainingPlannedDayCount = Math.max(0, summary.primaryRoutineTargetCount - summary.completedWorkoutCount);
  const todayKey = getTodayKey(summary.timezone);
  const isCurrentOrFutureCycle = todayKey ? summary.weekEnd >= todayKey : true;
  const label = summary.primaryRoutineTargetCount > 0 && isCurrentOrFutureCycle ? "Open Days" : "Skipped Days";

  return {
    label,
    value: String(remainingPlannedDayCount),
    valueTone: remainingPlannedDayCount > 0 ? (label === "Open Days" ? "warning" : "danger") : "muted",
  };
}

function buildWeekComparisonMetric(summary: WeeklyProgressSummary): MetricDatum {
  const delta = summary.completedWorkoutCount - summary.previousWeekWorkoutCount;
  const absDelta = Math.abs(delta);
  const unit = absDelta === 1 ? "workout" : "workouts";

  if (delta > 0) {
    return {
      label: "Vs Last Cycle",
      value: `+${absDelta} ${unit}`,
      valueTone: "success",
    };
  }

  if (delta < 0) {
    return {
      label: "Vs Last Cycle",
      value: `-${absDelta} ${unit}`,
      valueTone: "danger",
    };
  }

  return {
    label: "Vs Last Cycle",
    value: "Even",
    valueTone: summary.completedWorkoutCount > 0 ? "default" : "muted",
  };
}

function buildCompletionValueNode(summary: WeeklyProgressSummary) {
  if (summary.primaryRoutineTargetCount <= 0) {
    return <span>Open</span>;
  }

  return (
    <>
      <span className="text-[rgb(var(--success-rgb)/0.94)]">{summary.completedWorkoutCount}</span>
      <span>/{summary.primaryRoutineTargetCount}</span>
    </>
  );
}

function formatCompletionPercent(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function getCycleCompletionTone(value: number | null | undefined): MetricDatum["valueTone"] {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "muted";
  }

  if (value >= 1) {
    return "success";
  }

  return value > 0 ? "warning" : "muted";
}

function isOpenPlannedDaysAttentionItem(item: string) {
  return /^\d+ planned days? (?:is|are) still open this cycle\.$/i.test(item.trim());
}

function buildCurrentMetricItems(summary: WeeklyProgressSummary): MetricDatum[] {
  const regressionCount = summary.progressionSummary.deloadCount + (summary.progressionSummary.revertCount ?? 0);
  const watchCount = summary.progressionSummary.watchCount ?? 0;

  return [
    {
      label: summary.primaryRoutineTargetCount > 0 ? "Completed" : "Sessions",
      value: summary.primaryRoutineTargetCount > 0
        ? `${summary.completedWorkoutCount}/${summary.primaryRoutineTargetCount}`
        : String(summary.completedWorkoutCount),
      valueNode: summary.primaryRoutineTargetCount > 0 ? buildCompletionValueNode(summary) : undefined,
      valueTone: summary.primaryRoutineTargetCount > 0 ? getCompletionTone(summary) : undefined,
    },
    typeof summary.cycleCompletionRate === "number" && Number.isFinite(summary.cycleCompletionRate)
      ? {
          label: "Completion",
          value: formatCompletionPercent(summary.cycleCompletionRate),
          valueTone: getCycleCompletionTone(summary.cycleCompletionRate),
        }
      : null,
    buildWeekComparisonMetric(summary),
    buildPlannedDayStatusMetric(summary),
    {
      label: "PRs",
      value: String(summary.prMomentCount),
      valueTone: summary.prMomentCount > 0 ? "success" : "muted",
    },
    {
      label: "Promotions",
      value: String(summary.progressionSummary.promotionCount),
      valueTone: summary.progressionSummary.promotionCount > 0 ? "success" : "muted",
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
      value: String(summary.progressionSummary.manualChangeCount),
      valueTone: summary.progressionSummary.manualChangeCount > 0 ? "warning" : "muted",
    },
  ].filter((item): item is MetricDatum => item !== null);
}

function CurrentWeeklyMetricGrid({ summary }: { summary: WeeklyProgressSummary }) {
  return <StatGrid items={toHistoryStatItems(buildCurrentMetricItems(summary))} />;
}

function ProgressionRecapRow({ summary }: { summary: WeeklyProgressSummary }) {
  const items = summary.recapItems ?? [];
  if (items.length === 0) {
    return null;
  }

  return (
    <DetailSectionItems
      items={items}
      layout="inline"
      className="pb-0"
    />
  );
}

function reduceProgressionReviewItems(items: string[]) {
  return items.filter((item) => {
    const normalized = item.trim().toLowerCase();
    return !(
      /\bpromotions?\b.*\blanded\b/.test(normalized)
      || /\bpromotions?\b.*\bapplied\b/.test(normalized)
      || /\bregressions?\b.*\bmanual change\b/.test(normalized)
      || /\bdeloads?\b.*\bmanual change\b/.test(normalized)
      || normalized.startsWith("no promotions")
      || normalized.startsWith("no regressions")
    );
  });
}

function WeeklyProgressBody({ summary }: { summary: WeeklyProgressSummary }) {
  const hasProgressionData = summary.progressionSummary.totalEventCount > 0;
  const progressionReviewItems = reduceProgressionReviewItems(summary.progressionSummary.reviewItems);
  const watchItems = summary.attentionItems.filter((item) => !isOpenPlannedDaysAttentionItem(item));

  return (
    <div className="space-y-4">
      <CurrentWeeklyMetricGrid summary={summary} />
      <ProgressionRecapRow summary={summary} />
      <div className="space-y-3">
        <DetailSectionBlock
          title="Signals"
          items={summary.hotspotItems}
          divider={false}
        />
        {watchItems.length > 0 ? (
          <DetailSectionBlock
            title="Watch"
            items={watchItems}
            divider={false}
          />
        ) : null}
        {hasProgressionData && progressionReviewItems.length > 0 ? (
          <DetailSectionBlock
            title="Progression"
            items={progressionReviewItems}
            tone="muted"
            divider={false}
          />
        ) : null}
      </div>
    </div>
  );
}

function HistoricalWeeklyProgressSurface({
  summary,
  viewMode,
  titleRoutineOverride = null,
}: {
  summary: WeeklyProgressSummary;
  viewMode: "compact" | "detailed";
  titleRoutineOverride?: string | null;
}) {
  const { title, rangeLabel } = buildHistoricalSummaryTitle(summary, titleRoutineOverride);

  return (
    <HistoryDisclosureCard title={title} titleMeta={rangeLabel} viewMode={viewMode}>
      <WeeklyProgressBody summary={summary} />
    </HistoryDisclosureCard>
  );
}

export function WeeklyProgressSurface({
  summary,
  viewMode = "compact",
  presentation = "current",
  titleRoutineOverride = null,
}: {
  summary: WeeklyProgressSummary;
  viewMode?: "compact" | "detailed";
  presentation?: "current" | "historical";
  titleRoutineOverride?: string | null;
}) {
  if (presentation === "historical") {
    return <HistoricalWeeklyProgressSurface summary={summary} viewMode={viewMode} titleRoutineOverride={titleRoutineOverride} />;
  }

  const { title, rangeLabel } = buildCurrentProgressionTitle(summary, titleRoutineOverride);

  return (
    <HistoryDisclosureCard title={title} titleMeta={rangeLabel} viewMode={viewMode}>
      <WeeklyProgressBody summary={summary} />
    </HistoryDisclosureCard>
  );
}
