"use client";

import { HistoryDisclosureCard } from "@/components/history/HistoryMetricsDisclosure";
import { toHistoryStatItems } from "@/components/history/historyStats";
import { StatGrid } from "@/components/ui/card-system";
import { DetailSectionBlock, DetailSectionItems } from "@/components/ui/DetailSectionList";
import type { MetricDatum } from "@/components/ui/MetricItem";
import type { HistoryScopeSummary } from "@/lib/history-scope-summary";

function formatDayKey(dayKey: string) {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function normalizeScopeSummaryRangeLabel(summary: HistoryScopeSummary, routineTitleOverride?: string | null) {
  const scopeLabel = summary.scopeLabel?.trim() ?? "";
  const routineTitle = routineTitleOverride?.trim() || summary.primaryRoutineTitle?.trim() || "";

  if (!scopeLabel) {
    return `${formatDayKey(summary.windowStart)} - ${formatDayKey(summary.windowEnd)}`;
  }

  if (scopeLabel === "All Time") {
    return "All Time";
  }

  if (scopeLabel.startsWith("Current Routine:")) {
    const scopedRoutineTitle = scopeLabel.replace(/^Current Routine:\s*/i, "").trim();
    if (routineTitle && scopedRoutineTitle.toLowerCase() === routineTitle.toLowerCase()) {
      return "Routine";
    }
  }

  if (scopeLabel.startsWith("Current Cycle:")) {
    return scopeLabel.replace(/^Current Cycle:\s*/i, "").trim();
  }

  return scopeLabel;
}

function buildScopeSummaryTitle(summary: HistoryScopeSummary, routineTitleOverride?: string | null) {
  const rangeLabel = normalizeScopeSummaryRangeLabel(summary, routineTitleOverride);
  const isAllTimeScope = rangeLabel === "All Time";
  const resolvedRoutineTitle = isAllTimeScope ? "" : (routineTitleOverride?.trim() || summary.primaryRoutineTitle?.trim() || "");

  return {
    title: resolvedRoutineTitle ? `${resolvedRoutineTitle} Summary` : "History Summary",
    rangeLabel,
  };
}

function buildMetricItems(summary: HistoryScopeSummary): MetricDatum[] {
  const regressionCount = summary.progressionSummary.deloadCount + summary.progressionSummary.revertCount;
  const watchCount = summary.progressionSummary.watchCount ?? 0;

  return [
    { label: "Planned Days", value: String(summary.plannedWorkoutDayCount), valueTone: summary.plannedWorkoutDayCount > 0 ? "default" : "muted" },
    { label: "Completed Days", value: String(summary.completedWorkoutDayCount), valueTone: summary.completedWorkoutDayCount > 0 ? "success" : "muted" },
    { label: "Skipped Days", value: String(summary.skippedWorkoutDayCount), valueTone: summary.skippedWorkoutDayCount > 0 ? "danger" : "muted" },
    { label: "Routines", value: String(summary.routineCount), valueTone: summary.routineCount > 0 ? "default" : "muted" },
    { label: "Exercises Trained", value: String(summary.exerciseCount), valueTone: summary.exerciseCount > 0 ? "default" : "muted" },
    { label: "PR Moments", value: String(summary.prMomentCount), valueTone: summary.prMomentCount > 0 ? "success" : "muted" },
    { label: "Promotions", value: String(summary.progressionSummary.promotionCount), valueTone: summary.progressionSummary.promotionCount > 0 ? "success" : "muted" },
    { label: "Regressions", value: String(regressionCount), valueTone: regressionCount > 0 ? "danger" : "muted" },
    { label: "Watch", value: String(watchCount), valueTone: watchCount > 0 ? "warning" : "muted" },
    { label: "Manual", value: String(summary.progressionSummary.manualChangeCount), valueTone: summary.progressionSummary.manualChangeCount > 0 ? "warning" : "muted" },
  ];
}

function MetricGrid({ summary }: { summary: HistoryScopeSummary }) {
  return <StatGrid items={toHistoryStatItems(buildMetricItems(summary))} />;
}

function ProgressionRecapRow({ summary }: { summary: HistoryScopeSummary }) {
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

function Body({ summary }: { summary: HistoryScopeSummary }) {
  const hasProgressionData = summary.progressionSummary.totalEventCount > 0;
  const progressionReviewItems = reduceProgressionReviewItems(summary.progressionSummary.reviewItems);

  return (
    <div className="space-y-4">
      <MetricGrid summary={summary} />
      <ProgressionRecapRow summary={summary} />
      <div className="space-y-3">
        {summary.hotspotItems.length > 0 ? (
          <DetailSectionBlock
            title="Signals"
            items={summary.hotspotItems}
            divider={false}
          />
        ) : null}
        {summary.attentionItems.length > 0 ? (
          <DetailSectionBlock
            title="Watch"
            items={summary.attentionItems}
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

export function HistoryScopeSummarySurface({
  summary,
  viewMode = "compact",
  titleRoutineOverride = null,
}: {
  summary: HistoryScopeSummary;
  viewMode?: "compact" | "detailed";
  titleRoutineOverride?: string | null;
}) {
  const { title, rangeLabel } = buildScopeSummaryTitle(summary, titleRoutineOverride);

  return (
    <HistoryDisclosureCard title={title} titleMeta={rangeLabel} viewMode={viewMode}>
      <Body summary={summary} />
    </HistoryDisclosureCard>
  );
}
