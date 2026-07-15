"use client";

import { type ReactNode, useEffect, useId, useState } from "react";
import { cardShellToneClassNames } from "@/components/cardSemanticTones";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { MetricAccentBar, SurfaceMetricGrid, type MetricDatum } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";

const HISTORY_YELLOW_METRIC_ACCENT_STYLE = { ["--metric-accent-rgb" as string]: "var(--accent-yellow-on)" };
const HISTORY_YELLOW_ACCENT_BAR_CLASS_NAME = "bg-[linear-gradient(90deg,rgb(var(--accent-yellow-on)/0.16),rgb(var(--accent-yellow-on)/0.92),rgb(var(--accent-yellow-on)/0.16))] shadow-[0_0_14px_rgb(var(--accent-yellow-on)/0.22)]";
const HISTORY_GREEN_METRIC_ACCENT_STYLE = { ["--metric-accent-rgb" as string]: "var(--success-rgb)" };
const HISTORY_GREEN_ACCENT_BAR_CLASS_NAME = "bg-[linear-gradient(90deg,rgb(var(--success-rgb)/0.16),rgb(var(--success-rgb)/0.92),rgb(var(--success-rgb)/0.16))] shadow-[0_0_14px_rgb(var(--success-rgb)/0.22)]";

export type HistoryDisclosureAccentTone = "yellow" | "green";

function getAccentStyle(tone: HistoryDisclosureAccentTone) {
  return tone === "green" ? HISTORY_GREEN_METRIC_ACCENT_STYLE : HISTORY_YELLOW_METRIC_ACCENT_STYLE;
}

function getAccentBarClassName(tone: HistoryDisclosureAccentTone) {
  return tone === "green" ? HISTORY_GREEN_ACCENT_BAR_CLASS_NAME : HISTORY_YELLOW_ACCENT_BAR_CLASS_NAME;
}

function MetricsBody({ items }: { items: MetricDatum[] }) {
  return (
    <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
      <SurfaceMetricGrid items={items} accentBarVariant="compact" itemClassName="min-h-[3.55rem]" scrollable />
    </div>
  );
}

function ExpandedCard({ children, accentTone = "yellow" }: { children: ReactNode; accentTone?: HistoryDisclosureAccentTone }) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-[var(--card-radius)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.88)] shadow-none",
      cardShellToneClassNames.logged,
    )}>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-px left-px top-px w-[4px] rounded-r-full",
          accentTone === "green"
            ? "bg-[linear-gradient(180deg,rgb(var(--success-rgb)/0.96),rgb(var(--success-rgb)/0.52))]"
            : "bg-[linear-gradient(180deg,rgb(var(--accent-yellow-on)/0.96),rgb(var(--accent-yellow-on)/0.52))]",
        )}
      />
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
  accentTone,
}: {
  title: ReactNode;
  summary?: string;
  expanded: boolean;
  controlsId: string;
  onToggle: () => void;
  accentTone: HistoryDisclosureAccentTone;
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
            {summary ? (
              <p
                aria-live="off"
                className="min-w-0 max-w-[56%] truncate text-right text-[0.68rem] font-semibold text-[rgb(var(--success-rgb)/0.94)]"
              >
                {summary}
              </p>
            ) : null}
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-[rgb(var(--text-muted)/0.92)]">
              {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
            </span>
          </div>
          <div className="px-px pt-[3px]" style={getAccentStyle(accentTone)}>
            <MetricAccentBar variant="compact" className={getAccentBarClassName(accentTone)} />
          </div>
        </div>
      </div>
    </button>
  );
}

export function normalizeHistoryCompactSummaryItems(items: Array<string | null | undefined>) {
  return [...new Set(items.map((item) => item?.trim()).filter((item): item is string => Boolean(item)))];
}

function useRotatingCompactSummary(items: Array<string | null | undefined>) {
  const normalizedItems = normalizeHistoryCompactSummaryItems(items);
  const itemCount = normalizedItems.length;
  const summarySignature = normalizedItems.join("\u001f");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
    if (itemCount <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % itemCount);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [itemCount, summarySignature]);

  return normalizedItems[activeIndex] ?? normalizedItems[0] ?? undefined;
}

export function HistoryCompactDisclosure({
  title,
  summaryItems = [],
  children,
  accentTone = "yellow",
}: {
  title: ReactNode;
  summaryItems?: Array<string | null | undefined>;
  children: ReactNode;
  accentTone?: HistoryDisclosureAccentTone;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const activeSummary = useRotatingCompactSummary(summaryItems);

  return (
    <section data-history-compact-disclosure="true">
      <CompactHeader
        title={title}
        summary={activeSummary}
        expanded={expanded}
        controlsId={panelId}
        onToggle={() => setExpanded((current) => !current)}
        accentTone={accentTone}
      />
      <div id={panelId} hidden={!expanded} className="pt-2">
        <ExpandedCard accentTone={accentTone}>{children}</ExpandedCard>
      </div>
    </section>
  );
}

export function HistoryMetricsDisclosure({
  title,
  summary,
  compactSummaryItems = [],
  items,
  viewMode,
  accentTone = "yellow",
}: {
  title: ReactNode;
  summary?: string;
  compactSummaryItems?: Array<string | null | undefined>;
  items: MetricDatum[];
  viewMode: "compact" | "detailed";
  accentTone?: HistoryDisclosureAccentTone;
}) {
  if (viewMode === "detailed") {
    return (
      <ExpandedCard accentTone={accentTone}>
        <div className="px-5 pb-2 pt-4">
          <p className="text-[0.98rem] font-semibold leading-tight text-[rgb(var(--text-primary)/0.98)]">{title}</p>
          {summary ? <p className="mt-1 text-[0.72rem] font-medium text-[rgb(var(--text-muted)/0.86)]">{summary}</p> : null}
          <div className="mt-3" style={getAccentStyle(accentTone)}>
            <MetricAccentBar variant="compact" className={getAccentBarClassName(accentTone)} />
          </div>
        </div>
        <MetricsBody items={items} />
      </ExpandedCard>
    );
  }

  return (
    <HistoryCompactDisclosure title={title} summaryItems={compactSummaryItems} accentTone={accentTone}>
      <MetricsBody items={items} />
    </HistoryCompactDisclosure>
  );
}

export function HistoryDisclosureTitle({
  label,
  meta,
  metaTone = "green",
}: {
  label: string;
  meta: string;
  metaTone?: "green" | "yellow";
}) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
      <span className="truncate">{label}</span>
      <span aria-hidden="true" className="shrink-0 text-[rgb(var(--success-rgb)/0.94)]">|</span>
      <span className={cn(
        "truncate",
        metaTone === "yellow"
          ? "text-[rgb(var(--accent-yellow-on)/0.98)]"
          : "text-[rgb(var(--success-rgb)/0.94)]",
      )}>
        {meta}
      </span>
    </span>
  );
}
