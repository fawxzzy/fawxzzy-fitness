"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { cardShellToneClassNames } from "@/components/cardSemanticTones";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { DetailSectionBlock, DetailSectionItems } from "@/components/ui/DetailSectionList";
import { MetricAccentBar, SurfaceMetricGrid, type MetricDatum } from "@/components/ui/MetricItem";
import { SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { cn } from "@/lib/cn";
import type { WeeklyProgressSummary } from "@/lib/history-weekly-progress";

const HISTORY_YELLOW_ACCENT_BAR_CLASS_NAME = "bg-[linear-gradient(90deg,rgb(var(--accent-yellow-on)/0.16),rgb(var(--accent-yellow-on)/0.92),rgb(var(--accent-yellow-on)/0.16))] shadow-[0_0_14px_rgb(var(--accent-yellow-on)/0.22)]";
const HISTORY_YELLOW_METRIC_ACCENT_STYLE = { ["--metric-accent-rgb" as string]: "var(--accent-yellow-on)" };

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
  const rangeLabel = formatWeekRangeLabel(summary);
  const routineTitle = routineTitleOverride?.trim() || summary.primaryRoutineTitle?.trim();
  const leadingLabel = routineTitle ? `${routineTitle} ${suffix}` : fallbackLabel;

  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 [text-wrap:pretty]">
      <span className="min-w-0">{leadingLabel}</span>
      <span className="inline-flex items-center">
        <SignatureMiniPipe className="w-[0.38rem] translate-y-px" />
      </span>
      <span className="text-[rgb(var(--accent-yellow-on)/0.94)]">{rangeLabel}</span>
    </span>
  );
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
      label: "Vs Last Week",
      value: `+${absDelta} ${unit}`,
      valueTone: "success",
    };
  }

  if (delta < 0) {
    return {
      label: "Vs Last Week",
      value: `-${absDelta} ${unit}`,
      valueTone: "danger",
    };
  }

  return {
    label: "Vs Last Week",
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
  const metricItems = buildCurrentMetricItems(summary);
  return <SurfaceMetricGrid items={metricItems} accentBarVariant="compact" itemClassName="min-h-[3.55rem]" scrollable />;
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

function WeeklyProgressBody({
  summary,
  topPaddingClassName = "pt-2",
}: {
  summary: WeeklyProgressSummary;
  topPaddingClassName?: string;
}) {
  const hasProgressionData = summary.progressionSummary.totalEventCount > 0;
  const progressionReviewItems = reduceProgressionReviewItems(summary.progressionSummary.reviewItems);
  const watchItems = summary.attentionItems.filter((item) => !isOpenPlannedDaysAttentionItem(item));

  return (
    <div className={cn("space-y-4 px-4 pb-4 sm:px-5 sm:pb-5", topPaddingClassName)}>
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

function HistoryGroupCompactHeader({
  title,
  summary,
  label = "Cycle Progression",
  expanded,
  controlsId,
  onToggle,
  variant = "split",
}: {
  title: ReactNode;
  summary?: ReactNode;
  label?: string;
  expanded: boolean;
  controlsId: string;
  onToggle: () => void;
  variant?: "split" | "title";
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controlsId}
      onClick={onToggle}
      className="group block w-full appearance-none !border-0 !bg-transparent text-left shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
    >
      <div className="relative w-full max-w-none overflow-hidden rounded-[1rem] bg-transparent px-[3px] py-[2px]">
        <div className="relative rounded-[0.9rem] px-[13px] py-[3px] transition-colors">
          <div className="flex min-h-[30px] items-center">
            <div className="w-full min-w-0 pl-px text-[0.79rem] font-semibold leading-[1] tracking-[-0.01em]">
              {variant === "title" ? (
                <span className="flex w-full min-w-0 items-start gap-2 leading-[1.08]">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[rgb(var(--text-primary)/0.98)]">
                      {title}
                    </span>
                    {summary && !expanded ? (
                      <span className="mt-1 block text-[0.68rem] font-medium leading-[1.28] text-[rgb(var(--text-secondary)/0.82)] [text-wrap:pretty]">
                        {summary}
                      </span>
                    ) : null}
                  </span>
                  <span className="inline-flex h-4 w-4 items-center justify-center text-[rgb(var(--text-muted)/0.92)]">
                    {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                  </span>
                </span>
              ) : (
                <span className="flex w-full min-w-0 items-center gap-3 leading-[1.08]">
                  <span className="min-w-0 flex-1 truncate text-[rgb(var(--text-primary)/0.98)]">{label}</span>
                  <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap align-middle">
                    <span className="text-[0.79rem] font-semibold tracking-[-0.01em] text-[rgb(var(--success-rgb)/0.94)]">
                      {title}
                    </span>
                    <span className="inline-flex h-4 w-4 items-center justify-center text-[rgb(var(--text-muted)/0.92)]">
                      {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                    </span>
                  </span>
                </span>
              )}
            </div>
          </div>
          <div className="px-px pt-[1px]" style={HISTORY_YELLOW_METRIC_ACCENT_STYLE}>
            <MetricAccentBar variant="compact" className={HISTORY_YELLOW_ACCENT_BAR_CLASS_NAME} />
          </div>
        </div>
      </div>
    </button>
  );
}

function ExpandedWeeklySummaryCard({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--card-radius)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.88)] shadow-none",
        cardShellToneClassNames.logged,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-px left-px top-px w-[4px] rounded-r-full bg-[linear-gradient(180deg,rgb(var(--accent-yellow-on)/0.96),rgb(var(--accent-yellow-on)/0.52))]"
      />
      <div className="relative">
        {children}
      </div>
    </div>
  );
}

function HistoricalWeeklyProgressSurface({
  summary,
  viewMode,
  defaultExpanded = false,
  titleRoutineOverride = null,
}: {
  summary: WeeklyProgressSummary;
  viewMode: "compact" | "detailed";
  defaultExpanded?: boolean;
  titleRoutineOverride?: string | null;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded || viewMode === "detailed");
  const panelId = useId();
  const summaryTitle = buildHistoricalSummaryTitle(summary, titleRoutineOverride);

  if (viewMode === "detailed") {
    return (
      <ExpandedWeeklySummaryCard>
        <div className="px-5 pb-2 pt-4">
          <div className="min-w-0 text-[0.98rem] font-semibold leading-tight tracking-[0.01em] text-[rgb(var(--text-primary)/0.98)]">
            {summaryTitle}
          </div>
          <div style={HISTORY_YELLOW_METRIC_ACCENT_STYLE}>
            <MetricAccentBar variant="compact" className={cn("mt-3", HISTORY_YELLOW_ACCENT_BAR_CLASS_NAME)} />
          </div>
        </div>
        <WeeklyProgressBody summary={summary} />
      </ExpandedWeeklySummaryCard>
    );
  }

  return (
    <section>
      <HistoryGroupCompactHeader
        title={summaryTitle}
        label=""
        expanded={expanded}
        controlsId={panelId}
        onToggle={() => setExpanded((current) => !current)}
        variant="title"
      />
      <div id={panelId} hidden={!expanded} className="pt-2">
        <ExpandedWeeklySummaryCard>
          <WeeklyProgressBody summary={summary} topPaddingClassName="pt-4" />
        </ExpandedWeeklySummaryCard>
      </div>
    </section>
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
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const progressionTitle = buildCurrentProgressionTitle(summary, titleRoutineOverride);

  if (presentation === "historical") {
    return <HistoricalWeeklyProgressSurface summary={summary} viewMode={viewMode} titleRoutineOverride={titleRoutineOverride} />;
  }

  if (viewMode === "detailed") {
    return (
      <ExpandedWeeklySummaryCard>
        <div className="px-5 pb-2 pt-4">
          <div className="min-w-0 text-[0.98rem] font-semibold leading-tight tracking-[0.01em] text-[rgb(var(--text-primary)/0.98)]">
            {progressionTitle}
          </div>
          <div style={HISTORY_YELLOW_METRIC_ACCENT_STYLE}>
            <MetricAccentBar variant="compact" className={cn("mt-3", HISTORY_YELLOW_ACCENT_BAR_CLASS_NAME)} />
          </div>
        </div>
        <WeeklyProgressBody
          summary={summary}
        />
      </ExpandedWeeklySummaryCard>
    );
  }

  return (
    <section>
      <HistoryGroupCompactHeader
        title={progressionTitle}
        expanded={expanded}
        controlsId={panelId}
        onToggle={() => setExpanded((current) => !current)}
        variant="title"
      />
      <div id={panelId} hidden={!expanded} className="pt-2">
        <ExpandedWeeklySummaryCard>
          <WeeklyProgressBody
            summary={summary}
            topPaddingClassName="pt-4"
          />
        </ExpandedWeeklySummaryCard>
      </div>
    </section>
  );
}
