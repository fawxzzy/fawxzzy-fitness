"use client";

import { type ReactNode, useId, useState } from "react";
import { cardShellToneClassNames } from "@/components/cardSemanticTones";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { DetailSectionBlock, DetailSectionItems } from "@/components/ui/DetailSectionList";
import { MetricAccentBar, SurfaceMetricGrid, type MetricDatum } from "@/components/ui/MetricItem";
import { SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { cn } from "@/lib/cn";
import type { HistoryScopeSummary } from "@/lib/history-scope-summary";

const HISTORY_YELLOW_METRIC_ACCENT_STYLE = { ["--metric-accent-rgb" as string]: "var(--accent-yellow-on)" };

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

function buildMetricItems(summary: HistoryScopeSummary): MetricDatum[] {
  const regressionCount = summary.progressionSummary.deloadCount + summary.progressionSummary.revertCount;
  const watchCount = summary.progressionSummary.watchCount ?? 0;

  return [
    { label: "Planned Days", value: String(summary.plannedWorkoutDayCount), valueTone: summary.plannedWorkoutDayCount > 0 ? "default" : "muted" },
    { label: "Completed Days", value: String(summary.completedWorkoutDayCount), valueTone: summary.completedWorkoutDayCount > 0 ? "success" : "muted" },
    { label: "Skipped Days", value: String(summary.skippedWorkoutDayCount), valueTone: summary.skippedWorkoutDayCount > 0 ? "danger" : "muted" },
    { label: "Distinct Exercises", value: String(summary.exerciseCount), valueTone: summary.exerciseCount > 0 ? "default" : "muted" },
    { label: "PR Moments", value: String(summary.prMomentCount), valueTone: summary.prMomentCount > 0 ? "success" : "muted" },
    { label: "Promotions", value: String(summary.progressionSummary.promotionCount), valueTone: summary.progressionSummary.promotionCount > 0 ? "success" : "muted" },
    { label: "Regressions", value: String(regressionCount), valueTone: regressionCount > 0 ? "danger" : "muted" },
    { label: "Watch", value: String(watchCount), valueTone: watchCount > 0 ? "warning" : "muted" },
    { label: "Manual", value: String(summary.progressionSummary.manualChangeCount), valueTone: summary.progressionSummary.manualChangeCount > 0 ? "warning" : "muted" },
  ];
}

function MetricGrid({ summary }: { summary: HistoryScopeSummary }) {
  const metricItems = buildMetricItems(summary);
  return <SurfaceMetricGrid items={metricItems} accentBarVariant="compact" itemClassName="min-h-[3.55rem]" scrollable />;
}

function ProgressionRecapRow({ summary }: { summary: HistoryScopeSummary }) {
  const items = (summary.recapItems ?? []).map((item) => ({
    ...item,
    signals: null,
    tagLabels: null,
    layout: "auto" as const,
  }));
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

function Body({ summary, topPaddingClassName = "pt-2" }: { summary: HistoryScopeSummary; topPaddingClassName?: string }) {
  const hasProgressionData = summary.progressionSummary.totalEventCount > 0;
  const progressionReviewItems = reduceProgressionReviewItems(summary.progressionSummary.reviewItems);

  return (
    <div className={cn("space-y-4 px-4 pb-4 sm:px-5 sm:pb-5", topPaddingClassName)}>
      <MetricGrid summary={summary} />
      <ProgressionRecapRow summary={summary} />
      <div className="space-y-3">
        <DetailSectionBlock
          title="Summary"
          items={summary.reviewItems}
          tone="muted"
          divider={false}
        />
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
        "relative overflow-hidden rounded-[var(--card-radius)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.88)] shadow-none",
        cardShellToneClassNames.logged,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-px left-px top-px w-[4px] rounded-r-full bg-[linear-gradient(180deg,rgb(var(--accent-yellow-on)/0.96),rgb(var(--accent-yellow-on)/0.52))]"
      />
      <div className="relative">{children}</div>
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
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const title = buildScopeSummaryTitle(summary, titleRoutineOverride);

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
