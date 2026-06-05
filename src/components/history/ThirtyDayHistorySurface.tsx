"use client";

import { type ReactNode, useId, useState } from "react";
import { cardShellToneClassNames } from "@/components/cardSemanticTones";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { MetricAccentBar, SurfaceMetricGrid, type MetricDatum } from "@/components/ui/MetricItem";
import { SignatureDot, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { cn } from "@/lib/cn";
import type { ThirtyDayHistorySummary } from "@/lib/history-30-day-summary";

function formatDayKey(dayKey: string) {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function buildThirtyDayTitle(summary: ThirtyDayHistorySummary) {
  const rangeLabel = summary.scopeLabel?.trim()
    ? summary.scopeLabel.trim()
    : `${formatDayKey(summary.windowStart)} - ${formatDayKey(summary.windowEnd)}`;
  const leadingLabel = summary.primaryRoutineTitle?.trim() ? `${summary.primaryRoutineTitle} Summary` : "History Summary";

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

function buildMetricItems(summary: ThirtyDayHistorySummary): MetricDatum[] {
  return [
    { label: "Completed Workouts", value: String(summary.completedWorkoutCount) },
    { label: "Workout Days", value: String(summary.activeDayCount), valueTone: summary.activeDayCount > 0 ? "default" : "muted" },
    { label: "Exercises Trained", value: String(summary.exerciseCount), valueTone: summary.exerciseCount > 0 ? "default" : "muted" },
    { label: "PR Moments", value: String(summary.prMomentCount), valueTone: summary.prMomentCount > 0 ? "success" : "muted" },
    { label: "Last 7 Days", value: summary.consistencyTrend.label, valueTone: getTrendTone(summary.consistencyTrend.direction) },
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
        All-time training summary with a last-7-days trend check.
      </p>
      <MetricGrid summary={summary} />
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
            Summary
          </p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[0.82rem] leading-5 text-[rgb(var(--text-secondary)/0.92)]">
            {summary.reviewItems.map((entry, index) => (
              <span key={`${entry}-${index}`} className="inline-flex items-center gap-2">
                <SignatureDot />
                <span>{entry}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
            Watch
          </p>
          {summary.attentionItems.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[0.82rem] leading-5 text-[rgb(var(--text-primary)/0.94)]">
              {summary.attentionItems.map((entry, index) => (
                <span key={`${entry}-${index}`} className="inline-flex items-center gap-2">
                  <SignatureDot />
                  <span>{entry}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-[0.82rem] leading-5 text-[rgb(var(--text-secondary)/0.9)]">
              <SignatureDot />
              <span>Nothing needs attention right now.</span>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
            Progression
          </p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[0.82rem] leading-5 text-[rgb(var(--text-secondary)/0.92)]">
            {summary.progressionSummary.reviewItems.map((entry, index) => (
              <span key={`${entry}-${index}`} className="inline-flex items-center gap-2">
                <SignatureDot />
                <span>{entry}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.92)]">
            Progression Watch
          </p>
          {summary.progressionSummary.attentionItems.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[0.82rem] leading-5 text-[rgb(var(--text-primary)/0.94)]">
              {summary.progressionSummary.attentionItems.map((entry, index) => (
                <span key={`${entry}-${index}`} className="inline-flex items-center gap-2">
                  <SignatureDot />
                  <span>{entry}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-[0.82rem] leading-5 text-[rgb(var(--text-secondary)/0.9)]">
              <SignatureDot />
              <span>Nothing stands out in progression right now.</span>
            </div>
          )}
        </div>
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
          <div className="px-px pt-[1px]">
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
}: {
  summary: ThirtyDayHistorySummary;
  viewMode?: "compact" | "detailed";
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const title = buildThirtyDayTitle(summary);

  if (viewMode === "detailed") {
    return (
      <ExpandedCard>
        <div className="px-5 pb-2 pt-4">
          <div className="min-w-0 text-[0.98rem] font-semibold leading-tight tracking-[0.01em] text-[rgb(var(--text-primary)/0.98)]">
            {title}
          </div>
          <MetricAccentBar
            variant="compact"
            className="mt-3 bg-[linear-gradient(90deg,rgb(var(--accent-yellow-on)/0.16),rgb(var(--accent-yellow-on)/0.92),rgb(var(--accent-yellow-on)/0.16))] shadow-[0_0_14px_rgb(var(--accent-yellow-on)/0.22)]"
          />
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
