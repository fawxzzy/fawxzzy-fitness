"use client";

import { HorizontalScrollHint } from "@/components/ui/HorizontalScrollHint";
import { HistorySection } from "@/components/history/HistoryShared";
import { cn } from "@/lib/cn";
import type { HistoryConsistencyHeatmap } from "@/lib/history-consistency-heatmap";

function formatDay(dayKey: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dayKey}T12:00:00.000Z`));
}

function cellClassName(tone: "none" | "low" | "medium" | "high", isFuture: boolean) {
  if (isFuture) return "border-[rgb(var(--border-strong)/0.06)] bg-[rgb(var(--surface-2)/0.16)]";
  if (tone === "high") return "border-[rgb(var(--accent)/0.58)] bg-[rgb(var(--accent)/0.72)]";
  if (tone === "medium") return "border-[rgb(var(--accent)/0.42)] bg-[rgb(var(--accent)/0.46)]";
  if (tone === "low") return "border-[rgb(var(--success-rgb)/0.3)] bg-[rgb(var(--success-rgb)/0.22)]";
  return "border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface-3-rgb)/0.58)]";
}

export function ConsistencyHeatmapSurface({ heatmap }: { heatmap: HistoryConsistencyHeatmap }) {
  const description = heatmap.sessionCount > 0
    ? `${heatmap.sessionCount} sessions across ${heatmap.activeDayCount} active days in the last ${heatmap.weeks.length} weeks.`
    : "Your first completed workout will start the map.";

  return (
    <HistorySection title="Consistency Heatmap" description={description}>
      <HorizontalScrollHint scrollClassName="-mx-1.5 px-1.5" contentClassName="min-w-max pb-1">
        <div
          role="img"
          aria-label={description}
          className="grid grid-flow-col grid-rows-7 gap-1.5"
        >
          {heatmap.weeks.flatMap((week) => week.map((cell) => (
            <span
              key={cell.dayKey}
              title={`${formatDay(cell.dayKey)}: ${cell.sessionCount} ${cell.sessionCount === 1 ? "session" : "sessions"}`}
              className={cn(
                "h-3.5 w-3.5 rounded-[0.28rem] border sm:h-4 sm:w-4",
                cellClassName(cell.tone, cell.isFuture),
              )}
            />
          )))}
        </div>
      </HorizontalScrollHint>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[0.62rem] uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.78)]">
        <span>Less</span>
        {(["none", "low", "medium", "high"] as const).map((tone) => (
          <span key={tone} aria-hidden="true" className={cn("h-3 w-3 rounded-[0.24rem] border", cellClassName(tone, false))} />
        ))}
        <span>More</span>
      </div>
    </HistorySection>
  );
}
