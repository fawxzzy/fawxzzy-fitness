"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { cardShellToneClassNames } from "@/components/cardSemanticTones";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { MetricAccentBar, MetricGrid, MetricItem, MetricStrip, type MetricDatum } from "@/components/ui/MetricItem";
import { SignatureDot, SignatureMetaTag } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
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

function formatSignedCount(value: number) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function formatVolumeSummary(
  summary: WeeklyProgressSummary,
  key: "strength" | "cardio" | "bodyweight",
) {
  const entry = summary.volumeCategories.find((category) => category.key === key);
  const setCount = entry?.setCount ?? 0;
  const exerciseCount = entry?.exerciseCount ?? 0;
  return `${setCount} ${setCount === 1 ? "set" : "sets"} | ${exerciseCount} ${exerciseCount === 1 ? "exercise" : "exercises"}`;
}

function buildCurrentMetricItems(summary: WeeklyProgressSummary): MetricDatum[] {
  return [
    {
      label: "Sessions",
      value: String(summary.completedWorkoutCount),
    },
    {
      label: "Trend",
      value: `${formatSignedCount(summary.consistencyTrend.delta)} sessions`,
      valueTone: getTrendTone(summary.consistencyTrend.direction),
    },
    {
      label: "PRs",
      value: String(summary.prMomentCount),
      valueTone: summary.prMomentCount > 0 ? "success" : "muted",
    },
    {
      label: "Strength",
      value: formatVolumeSummary(summary, "strength"),
    },
    {
      label: "Cardio",
      value: formatVolumeSummary(summary, "cardio"),
    },
    {
      label: "Bodyweight",
      value: formatVolumeSummary(summary, "bodyweight"),
    },
    {
      label: "Score",
      value: `${summary.progressScore.value}/${summary.progressScore.max}`,
      valueNode: (
        <>
          <span className="text-[rgb(var(--success-rgb)/0.94)]">{summary.progressScore.value}</span>
          <span>/{summary.progressScore.max}</span>
        </>
      ),
    },
  ];
}

function CurrentWeeklyMetricGrid({ summary }: { summary: WeeklyProgressSummary }) {
  const metricItems = buildCurrentMetricItems(summary);
  const metricLabelClassName = "!text-[rgb(var(--accent-divider-rgb)/0.92)]";

  return (
    <div className="grid grid-cols-6 gap-2">
      {metricItems.map((item) => (
        <MetricItem
          key={`${item.label}-${item.value}`}
          item={item}
          className={cn(
            "min-h-[3.55rem]",
            item.label === "Score" ? "col-span-2 col-start-3" : "col-span-2",
          )}
          valueClassName={cn(
            appTokens.workoutMetricValueCompact,
            item.label === "Strength" || item.label === "Cardio" || item.label === "Bodyweight"
              ? "text-[0.8rem] leading-[1.08] sm:text-[0.84rem]"
              : undefined,
          )}
          labelClassName={metricLabelClassName}
          accentBarVariant="compact"
        />
      ))}
    </div>
  );
}

function WeeklyProgressBody({
  summary,
  topPaddingClassName = "pt-2",
  showVolumeMix = true,
}: {
  summary: WeeklyProgressSummary;
  topPaddingClassName?: string;
  showVolumeMix?: boolean;
}) {
  const volumeItems = summary.volumeCategories.slice(0, 3).map((entry) => ({
    label: entry.label,
    value: `${entry.setCount} sets`,
    delta: `${entry.exerciseCount} ${entry.exerciseCount === 1 ? "exercise" : "exercises"}`,
  }));

  return (
    <div className={cn("space-y-4 px-4 pb-4 sm:px-5 sm:pb-5", topPaddingClassName)}>
      <CurrentWeeklyMetricGrid summary={summary} />
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
            Score Summary
          </p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[0.82rem] leading-5 text-[rgb(var(--text-secondary)/0.92)]">
            {summary.progressScore.breakdown.map((entry, index) => (
              <span key={entry.label} className="inline-flex items-center gap-2">
                {index > 0 ? <SignatureDot /> : null}
                <span>{`${entry.label} ${entry.value}/${entry.max}`}</span>
              </span>
            ))}
          </div>
        </div>
        {showVolumeMix ? (
          <div className="space-y-1.5">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
              Volume Mix
            </p>
            {volumeItems.length > 0 ? (
              <MetricStrip items={volumeItems} accentBarVariant="compact" />
            ) : (
              <p className="text-[0.82rem] leading-5 text-[rgb(var(--text-secondary)/0.9)]">
                No logged set volume in this cycle yet.
              </p>
            )}
          </div>
        ) : null}
        <div className="space-y-1.5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
            PR Moments
          </p>
          {summary.prExerciseNames.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[0.84rem] leading-5 text-[rgb(var(--text-primary)/0.94)]">
              {summary.prExerciseNames.slice(0, 4).map((name, index) => (
                <span key={name} className="inline-flex items-center gap-2">
                  {index > 0 ? <SignatureDot /> : null}
                  <span className={cn("min-w-0")}>{name}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[0.82rem] leading-5 text-[rgb(var(--text-secondary)/0.9)]">
              No PR moments recorded in the current cycle.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryGroupCompactHeader({
  title,
  label = "Cycle Progression",
  expanded,
  controlsId,
  onToggle,
}: {
  title: string;
  label?: string;
  expanded: boolean;
  controlsId: string;
  onToggle: () => void;
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
            </div>
          </div>
          <div className="px-px pt-[1px]">
            <MetricAccentBar variant="compact" />
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
        "relative overflow-hidden rounded-[var(--radius-lg)] border border-[rgb(var(--success-rgb)/0.22)] bg-transparent",
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
}: {
  summary: WeeklyProgressSummary;
  viewMode: "compact" | "detailed";
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded || viewMode === "detailed");
  const panelId = useId();
  const weekRangeLabel = formatWeekRangeLabel(summary);

  if (viewMode === "detailed") {
    return (
      <ExpandedWeeklySummaryCard>
          <div className="px-5 pb-2 pt-4">
            <div className="flex items-center gap-3">
              <p className="shrink-0 text-[0.82rem] font-semibold tracking-[0.01em] text-[rgb(var(--text-primary)/0.98)]">
                Cycle Summary
              </p>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[1.05rem] font-semibold leading-tight text-[rgb(var(--success-rgb)/0.94)]">
                  {weekRangeLabel}
                </p>
              </div>
            </div>
            <MetricAccentBar variant="compact" className="mt-3" />
          </div>
          <WeeklyProgressBody summary={summary} showVolumeMix={false} />
      </ExpandedWeeklySummaryCard>
    );
  }

  return (
    <section>
      <HistoryGroupCompactHeader
        title={weekRangeLabel}
        label="Cycle Summary"
        expanded={expanded}
        controlsId={panelId}
        onToggle={() => setExpanded((current) => !current)}
      />
      <div id={panelId} hidden={!expanded} className="pt-2">
        <ExpandedWeeklySummaryCard>
          <WeeklyProgressBody summary={summary} topPaddingClassName="pt-4" showVolumeMix={false} />
        </ExpandedWeeklySummaryCard>
      </div>
    </section>
  );
}

export function WeeklyProgressSurface({
  summary,
  viewMode = "compact",
  presentation = "current",
}: {
  summary: WeeklyProgressSummary;
  viewMode?: "compact" | "detailed";
  presentation?: "current" | "historical";
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const weekRangeLabel = formatWeekRangeLabel(summary);

  if (presentation === "historical") {
    return <HistoricalWeeklyProgressSurface summary={summary} viewMode={viewMode} />;
  }

  return (
    <section>
      <HistoryGroupCompactHeader
        title={weekRangeLabel}
        expanded={expanded}
        controlsId={panelId}
        onToggle={() => setExpanded((current) => !current)}
      />
      <div id={panelId} hidden={!expanded} className="pt-2">
        <ExpandedWeeklySummaryCard>
          <WeeklyProgressBody
            summary={summary}
            topPaddingClassName="pt-4"
            showVolumeMix={false}
          />
        </ExpandedWeeklySummaryCard>
      </div>
    </section>
  );
}
