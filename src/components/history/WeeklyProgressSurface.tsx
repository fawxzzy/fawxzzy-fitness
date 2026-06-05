"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { cardShellToneClassNames } from "@/components/cardSemanticTones";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { MetricAccentBar, SurfaceMetricGrid, type MetricDatum } from "@/components/ui/MetricItem";
import { SignatureDot, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { cn } from "@/lib/cn";
import type { WeeklyProgressSummary } from "@/lib/history-weekly-progress";

const HISTORY_YELLOW_ACCENT_BAR_CLASS_NAME = "bg-[linear-gradient(90deg,rgb(var(--accent-yellow-on)/0.16),rgb(var(--accent-yellow-on)/0.92),rgb(var(--accent-yellow-on)/0.16))] shadow-[0_0_14px_rgb(var(--accent-yellow-on)/0.22)]";
const HISTORY_YELLOW_CARD_BORDER_CLASS_NAME = "border-[rgb(var(--accent-yellow-on)/0.24)]";
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
        <SignatureMiniPipe className="w-[0.38rem]" />
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

function buildCurrentProgressionPreview(summary: WeeklyProgressSummary) {
  const coverageLabel = summary.primaryRoutineTargetCount > 0
    ? `${summary.completedWorkoutCount}/${summary.primaryRoutineTargetCount} planned`
    : `${summary.activeDayCount} ${summary.activeDayCount === 1 ? "active day" : "active days"}`;
  const prLabel = summary.prMomentCount > 0
    ? `${summary.prMomentCount} ${summary.prMomentCount === 1 ? "PR" : "PRs"}`
    : "No PRs yet";

  return [coverageLabel, summary.consistencyTrend.label, prLabel].join(" • ");
}

function getTrendTone(direction: WeeklyProgressSummary["consistencyTrend"]["direction"]): MetricDatum["valueTone"] {
  if (direction === "up" || direction === "new") {
    return "success";
  }

  if (direction === "down") {
    return "danger";
  }

  if (direction === "none") {
    return "muted";
  }

  return "default";
}

function getCoverageTone(summary: WeeklyProgressSummary): MetricDatum["valueTone"] {
  if (summary.primaryRoutineTargetCount <= 0) {
    return "muted";
  }

  if (summary.completedWorkoutCount >= summary.primaryRoutineTargetCount) {
    return "success";
  }

  return summary.completedWorkoutCount > 0 ? "default" : "muted";
}

function buildCoverageValueNode(summary: WeeklyProgressSummary) {
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

function buildCoverageDetail(summary: WeeklyProgressSummary) {
  if (summary.primaryRoutineTargetCount <= 0) {
    return summary.activeDayCount > 0
      ? `Logged across ${summary.activeDayCount} ${summary.activeDayCount === 1 ? "active day" : "active days"}.`
      : "No routine target is set for this cycle yet.";
  }

  if (summary.completedWorkoutCount >= summary.primaryRoutineTargetCount) {
    return `Completed all ${summary.primaryRoutineTargetCount} planned routine ${summary.primaryRoutineTargetCount === 1 ? "day" : "days"} this cycle.`;
  }

  return `${summary.completedWorkoutCount} of ${summary.primaryRoutineTargetCount} planned routine ${summary.primaryRoutineTargetCount === 1 ? "day" : "days"} completed so far.`;
}

function buildCurrentMetricItems(summary: WeeklyProgressSummary): MetricDatum[] {
  return [
    {
      label: "Sessions",
      value: String(summary.completedWorkoutCount),
    },
    {
      label: "Active Days",
      value: String(summary.activeDayCount),
      valueTone: summary.activeDayCount > 0 ? "default" : "muted",
    },
    {
      label: "Coverage",
      value: summary.primaryRoutineTargetCount > 0
        ? `${summary.completedWorkoutCount}/${summary.primaryRoutineTargetCount}`
        : "Open",
      valueNode: buildCoverageValueNode(summary),
      valueTone: getCoverageTone(summary),
    },
    {
      label: "Trend",
      value: summary.consistencyTrend.label,
      valueTone: getTrendTone(summary.consistencyTrend.direction),
    },
    {
      label: "PRs",
      value: String(summary.prMomentCount),
      valueTone: summary.prMomentCount > 0 ? "success" : "muted",
    },
  ];
}

function CurrentWeeklyMetricGrid({ summary }: { summary: WeeklyProgressSummary }) {
  const metricItems = buildCurrentMetricItems(summary);
  return <SurfaceMetricGrid items={metricItems} accentBarVariant="compact" itemClassName="min-h-[3.55rem]" />;
}

function WeeklyProgressBody({
  summary,
  topPaddingClassName = "pt-2",
}: {
  summary: WeeklyProgressSummary;
  topPaddingClassName?: string;
}) {
  return (
    <div className={cn("space-y-4 px-4 pb-4 sm:px-5 sm:pb-5", topPaddingClassName)}>
      <CurrentWeeklyMetricGrid summary={summary} />
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
            Cycle Review
          </p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[0.82rem] leading-5 text-[rgb(var(--text-secondary)/0.92)]">
            {[summary.consistencyTrend.detail, buildCoverageDetail(summary)].map((entry, index) => (
              <span key={`${entry}-${index}`} className="inline-flex items-center gap-2">
                <SignatureDot />
                <span>{entry}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
            PR Moments
          </p>
          {summary.prExerciseNames.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[0.84rem] leading-5 text-[rgb(var(--text-primary)/0.94)]">
              {summary.prExerciseNames.slice(0, 4).map((name) => (
                <span key={name} className="inline-flex items-center gap-2">
                  <SignatureDot />
                  <span className={cn("min-w-0")}>{name}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-[0.82rem] leading-5 text-[rgb(var(--text-secondary)/0.9)]">
              <SignatureDot />
              <span>No PR moments recorded in the current cycle.</span>
            </div>
          )}
        </div>
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
      style={HISTORY_YELLOW_METRIC_ACCENT_STYLE}
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
          <div className="px-px pt-[1px]">
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
      style={HISTORY_YELLOW_METRIC_ACCENT_STYLE}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] border bg-transparent",
        HISTORY_YELLOW_CARD_BORDER_CLASS_NAME,
        cardShellToneClassNames.logged,
      )}
    >
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
          <MetricAccentBar variant="compact" className={cn("mt-3", HISTORY_YELLOW_ACCENT_BAR_CLASS_NAME)} />
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
  const progressionPreview = buildCurrentProgressionPreview(summary);

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
          <MetricAccentBar variant="compact" className={cn("mt-3", HISTORY_YELLOW_ACCENT_BAR_CLASS_NAME)} />
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
        summary={progressionPreview}
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
