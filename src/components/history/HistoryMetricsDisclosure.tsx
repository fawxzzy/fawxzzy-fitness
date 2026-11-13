"use client";

import { type ReactNode, useId, useState } from "react";
import { CardHeader, CardMeta, CardSurface, StatGrid, type CardTone } from "@/components/ui/card-system";
import { cn } from "@/lib/cn";
import { toHistoryStatItems } from "@/components/history/historyStats";
import type { MetricDatum } from "@/components/ui/MetricItem";

export type HistoryDisclosureTone = Extract<CardTone, "current" | "logged">;

function normalizeHistoryCompactSummaryItems(items: Array<string | null | undefined>) {
  return [...new Set(items.map((item) => item?.trim()).filter((item): item is string => Boolean(item)))];
}

/**
 * The one History summary card (streak, monthly, calendar, heatmap, scope summary, cycle progression).
 *
 * - `compact`: the whole header toggles the panel (`CardHeader` toggle: aria-expanded, aria-controls, rotating chevron).
 * - `detailed`: the same card with the panel always open and no toggle.
 * - `summaryItems` are plain facts on a wrapping meta line, all visible at once. They used to rotate through a
 *   timer (3.2 s, no pause) so only one was readable at a time.
 * - The panel stays mounted while collapsed (`hidden`), so child state (selected calendar month) survives.
 */
export function HistoryDisclosureCard({
  title,
  titleMeta,
  summaryItems = [],
  tone = "current",
  viewMode = "compact",
  defaultExpanded = false,
  headingLevel = 2,
  panelClassName,
  children,
}: {
  title: ReactNode;
  /** Qualifier shown after the title (a month, a date range). Part of the heading text. */
  titleMeta?: ReactNode;
  summaryItems?: Array<string | null | undefined>;
  tone?: HistoryDisclosureTone;
  viewMode?: "compact" | "detailed";
  defaultExpanded?: boolean;
  headingLevel?: 2 | 3;
  /** Panel padding override (the calendar wants every pixel of width for its 44px day cells). */
  panelClassName?: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();
  const isDetailed = viewMode === "detailed";
  const open = isDetailed || expanded;
  const normalizedSummaryItems = normalizeHistoryCompactSummaryItems(summaryItems);

  return (
    <CardSurface as="section" tone={tone} data-history-compact-disclosure="true" data-history-disclosure-state={open ? "open" : "closed"}>
      <CardHeader
        headingLevel={headingLevel}
        title={title}
        titleSecondary={titleMeta}
        meta={normalizedSummaryItems.length > 0 ? <CardMeta items={normalizedSummaryItems} /> : undefined}
        interaction={isDetailed ? { kind: "none" } : { kind: "toggle", expanded, onToggle: () => setExpanded((current) => !current), controlsId: panelId }}
      />
      <div id={panelId} hidden={!open} className={cn("border-t border-[rgb(var(--border-strong)/0.14)]", panelClassName ?? "px-4 pb-4 pt-3")}>
        {children}
      </div>
    </CardSurface>
  );
}

export function HistoryMetricsDisclosure({
  title,
  titleMeta,
  summary,
  compactSummaryItems = [],
  items,
  viewMode,
  tone = "current",
}: {
  title: ReactNode;
  titleMeta?: ReactNode;
  /** Supporting sentence shown in the detailed view. */
  summary?: string;
  compactSummaryItems?: Array<string | null | undefined>;
  items: MetricDatum[];
  viewMode: "compact" | "detailed";
  tone?: HistoryDisclosureTone;
}) {
  return (
    <HistoryDisclosureCard
      title={title}
      titleMeta={titleMeta}
      summaryItems={viewMode === "detailed" ? [summary] : compactSummaryItems}
      tone={tone}
      viewMode={viewMode}
    >
      <StatGrid items={toHistoryStatItems(items)} />
    </HistoryDisclosureCard>
  );
}
