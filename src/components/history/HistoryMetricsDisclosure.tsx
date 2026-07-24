"use client";

import { type ReactNode, useId, useState } from "react";
import { cardShellToneClassNames } from "@/components/cardSemanticTones";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { MetricAccentBar, SurfaceMetricGrid, type MetricDatum } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";

const HISTORY_YELLOW_METRIC_ACCENT_STYLE = { ["--metric-accent-rgb" as string]: "var(--accent-yellow-on)" };
const HISTORY_YELLOW_ACCENT_BAR_CLASS_NAME = "bg-[linear-gradient(90deg,rgb(var(--accent-yellow-on)/0.16),rgb(var(--accent-yellow-on)/0.92),rgb(var(--accent-yellow-on)/0.16))] shadow-[0_0_14px_rgb(var(--accent-yellow-on)/0.22)]";

function MetricsBody({ items }: { items: MetricDatum[] }) {
  return (
    <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
      <SurfaceMetricGrid items={items} accentBarVariant="compact" itemClassName="min-h-[3.55rem]" scrollable />
    </div>
  );
}

function ExpandedCard({ children }: { children: ReactNode }) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-[var(--card-radius)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.88)] shadow-none",
      cardShellToneClassNames.logged,
    )}>
      <span aria-hidden="true" className="pointer-events-none absolute bottom-px left-px top-px w-[4px] rounded-r-full bg-[linear-gradient(180deg,rgb(var(--accent-yellow-on)/0.96),rgb(var(--accent-yellow-on)/0.52))]" />
      <div className="relative">{children}</div>
    </div>
  );
}

function CompactHeader({
  title,
  summary,
  expanded,
  controlsId,
  onToggle,
}: {
  title: ReactNode;
  summary?: string;
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
          <div className="flex min-h-[30px] items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-[0.79rem] font-semibold leading-[1.08] text-[rgb(var(--text-primary)/0.98)]">{title}</p>
            {summary ? <p className="min-w-0 max-w-[56%] truncate text-right text-[0.66rem] font-medium text-[rgb(var(--text-muted)/0.82)]">{summary}</p> : null}
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[rgb(var(--text-muted)/0.92)]">
              {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
            </span>
          </div>
          <div className="px-px pt-[3px]" style={HISTORY_YELLOW_METRIC_ACCENT_STYLE}>
            <MetricAccentBar variant="compact" className={HISTORY_YELLOW_ACCENT_BAR_CLASS_NAME} />
          </div>
        </div>
      </div>
    </button>
  );
}

export function HistoryMetricsDisclosure({
  title,
  summary,
  items,
  viewMode,
}: {
  title: ReactNode;
  summary?: string;
  items: MetricDatum[];
  viewMode: "compact" | "detailed";
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  if (viewMode === "detailed") {
    return (
      <ExpandedCard>
        <div className="px-5 pb-2 pt-4">
          <p className="text-[0.98rem] font-semibold leading-tight text-[rgb(var(--text-primary)/0.98)]">{title}</p>
          {summary ? <p className="mt-1 text-[0.72rem] font-medium text-[rgb(var(--text-muted)/0.86)]">{summary}</p> : null}
          <div className="mt-3" style={HISTORY_YELLOW_METRIC_ACCENT_STYLE}>
            <MetricAccentBar variant="compact" className={HISTORY_YELLOW_ACCENT_BAR_CLASS_NAME} />
          </div>
        </div>
        <MetricsBody items={items} />
      </ExpandedCard>
    );
  }

  return (
    <section>
      <CompactHeader title={title} summary={summary} expanded={expanded} controlsId={panelId} onToggle={() => setExpanded((current) => !current)} />
      <div id={panelId} hidden={!expanded} className="pt-2">
        <ExpandedCard><MetricsBody items={items} /></ExpandedCard>
      </div>
    </section>
  );
}
