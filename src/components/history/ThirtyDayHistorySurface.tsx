"use client";

import { type ReactNode, useId, useState } from "react";
import { cardShellToneClassNames } from "@/components/cardSemanticTones";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { DetailSectionBlock } from "@/components/ui/DetailSectionList";
import { MetricAccentBar, SurfaceMetricGrid, type MetricDatum } from "@/components/ui/MetricItem";
import { SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { cn } from "@/lib/cn";
import type { ThirtyDayHistorySummary } from "@/lib/history-30-day-summary";
import { ProgressionSummaryActivityPanel } from "./ProgressionSummaryActivityPanel";

const HISTORY_YELLOW_METRIC_ACCENT_STYLE = { ["--metric-accent-rgb" as string]: "var(--accent-yellow-on)" };

function formatDayKey(dayKey: string) {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function buildThirtyDayTitle(summary: ThirtyDayHistorySummary, routineTitleOverride?: string | null) {
  const rangeLabel = summary.scopeLabel?.trim()
    ? summary.scopeLabel.trim()
    : `${formatDayKey(summary.windowStart)} - ${formatDayKey(summary.windowEnd)}`;
  const resolvedRoutineTitle = routineTitleOverride?.trim() || summary.primaryRoutineTitle?.trim() || "";
  const leadingLabel = resolvedRoutineTitle ? `${resolvedRoutineTitle} Summary` : "History Summary";

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

function getTrendTone(direction: ThirtyDayHistorySummary["consistencyTrend"]["direction"]): MetricDatum["valueTone"] {
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

function buildWeeklyChangeLabel(summary: ThirtyDayHistorySummary) {
  if (summary.consistencyTrend.direction === "up") {
    return `${summary.consistencyTrend.delta > 0 ? "+" : ""}${summary.consistencyTrend.delta} workout${Math.abs(summary.consistencyTrend.delta) === 1 ? "" : "s"}`;
  }

  if (summary.consistencyTrend.direction === "down") {
    return `${summary.consistencyTrend.delta} workout${Math.abs(summary.consistencyTrend.delta) === 1 ? "" : "s"}`;
  }

  if (summary.consistencyTrend.direction === "flat" && summary.consistencyTrend.delta === 0) {
    return "Matched workouts";
  }

  return summary.consistencyTrend.label;
}

function buildMetricItems(summary: ThirtyDayHistorySummary): MetricDatum[] {
  return [
    { label: "Completed Workouts", value: String(summary.completedWorkoutCount) },
    { label: "Workout Days", value: String(summary.activeDayCount), valueTone: summary.activeDayCount > 0 ? "default" : "muted" },
    { label: "Unique Exercises", value: String(summary.exerciseCount), valueTone: summary.exerciseCount > 0 ? "default" : "muted" },
    { label: "PR Moments", value: String(summary.prMomentCount), valueTone: summary.prMomentCount > 0 ? "success" : "muted" },
    { label: "Weekly Change", value: buildWeeklyChangeLabel(summary), valueTone: getTrendTone(summary.consistencyTrend.direction) },
  ];
}

function MetricGrid({ summary }: { summary: ThirtyDayHistorySummary }) {
  const metricItems = buildMetricItems(summary);
  return <SurfaceMetricGrid items={metricItems} accentBarVariant="compact" itemClassName="min-h-[3.55rem]" />;
}

function Body({ summary, topPaddingClassName = "pt-2" }: { summary: ThirtyDayHistorySummary; topPaddingClassName?: string }) {
  return (
    <div className={cn("space-y-4 px-4 pb-4 sm:px-5 sm:pb-5", topPaddingClassName)}>
      <p className="text-[0.72rem] leading-5 text-[rgb(var(--text-muted)/0.82)]">
        All-time training summary with a week-over-week workout check.
      </p>
      <MetricGrid summary={summary} />
      <div className="space-y-3">
        <DetailSectionBlock
          title="Summary"
          items={summary.reviewItems}
          tone="muted"
          divider={false}
        />
        <DetailSectionBlock
          title="Hotspots"
          items={summary.hotspotItems.length > 0 ? summary.hotspotItems : ["No hotspots stand out yet."]}
          divider={false}
        />
        <DetailSectionBlock
          title="Watch"
          items={summary.attentionItems.length > 0 ? summary.attentionItems : ["Nothing needs attention right now."]}
          divider={false}
          sectionSignal="watch"
        />
        <DetailSectionBlock
          title="Progression"
          items={summary.progressionSummary.reviewItems}
          tone="muted"
          divider={false}
          sectionSignal={summary.progressionSummary.promotionCount > 0 ? "promotion" : undefined}
        />
        <ProgressionSummaryActivityPanel
          activityBuckets={summary.progressionSummary.activityBuckets}
          hotspotItems={summary.progressionSummary.hotspotItems}
          emptyHotspotCopy="No progression hotspots stand out yet."
        />
        <DetailSectionBlock
          title="Progression Watch"
          items={summary.progressionSummary.attentionItems.length > 0 ? summary.progressionSummary.attentionItems : ["Nothing stands out in progression right now."]}
          divider={false}
          sectionSignal="watch"
        />
      </div>
    </div>
  );
}

function CompactHeader({
  title,
  expanded,
  controlsId,
  onToggle,
}: {
  title: ReactNode;
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
              <span className="flex w-full min-w-0 items-start gap-2 leading-[1.08]">
                <span className="min-w-0 flex-1">
                  <span className="block text-[rgb(var(--text-primary)/0.98)]">{title}</span>
                </span>
                <span className="inline-flex h-4 w-4 items-center justify-center text-[rgb(var(--text-muted)/0.92)]">
                  {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                </span>
              </span>
            </div>
          </div>
          <div className="px-px pt-[1px]" style={HISTORY_YELLOW_METRIC_ACCENT_STYLE}>
            <MetricAccentBar
              variant="compact"
              className="bg-[linear-gradient(90deg,rgb(var(--accent-yellow-on)/0.16),rgb(var(--accent-yellow-on)/0.92),rgb(var(--accent-yellow-on)/0.16))] shadow-[0_0_14px_rgb(var(--accent-yellow-on)/0.22)]"
            />
          </div>
        </div>
      </div>
    </button>
  );
}

function ExpandedCard({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] border border-[rgb(var(--accent-yellow-on)/0.24)] bg-transparent",
        cardShellToneClassNames.logged,
      )}
    >
      <div className="relative">{children}</div>
    </div>
  );
}

export function ThirtyDayHistorySurface({
  summary,
  viewMode = "compact",
  titleRoutineOverride = null,
}: {
  summary: ThirtyDayHistorySummary;
  viewMode?: "compact" | "detailed";
  titleRoutineOverride?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const title = buildThirtyDayTitle(summary, titleRoutineOverride);

  if (viewMode === "detailed") {
    return (
      <ExpandedCard>
        <div className="px-5 pb-2 pt-4">
          <div className="min-w-0 text-[0.98rem] font-semibold leading-tight tracking-[0.01em] text-[rgb(var(--text-primary)/0.98)]">
            {title}
          </div>
          <div style={HISTORY_YELLOW_METRIC_ACCENT_STYLE}>
            <MetricAccentBar
              variant="compact"
              className="mt-3 bg-[linear-gradient(90deg,rgb(var(--accent-yellow-on)/0.16),rgb(var(--accent-yellow-on)/0.92),rgb(var(--accent-yellow-on)/0.16))] shadow-[0_0_14px_rgb(var(--accent-yellow-on)/0.22)]"
            />
          </div>
        </div>
        <Body summary={summary} />
      </ExpandedCard>
    );
  }

  return (
    <section>
      <CompactHeader
        title={title}
        expanded={expanded}
        controlsId={panelId}
        onToggle={() => setExpanded((current) => !current)}
      />
      <div id={panelId} hidden={!expanded} className="pt-2">
        <ExpandedCard>
          <Body summary={summary} topPaddingClassName="pt-4" />
        </ExpandedCard>
      </div>
    </section>
  );
}
