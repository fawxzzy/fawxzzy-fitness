"use client";

import { Fragment } from "react";
import { HistoryCompactDisclosure, HistoryDisclosureTitle } from "@/components/history/HistoryMetricsDisclosure";
import { HistorySection } from "@/components/history/HistoryShared";
import { cn } from "@/lib/cn";
import {
  describeHistoryConsistencyHeatmap,
  type HistoryConsistencyHeatmap,
  type HistoryConsistencyHeatmapCell,
} from "@/lib/history-consistency-heatmap";

type HeatmapTone = HistoryConsistencyHeatmapCell["tone"];

// Fixed locale + UTC on purpose: day keys are already local-day strings (History timezone), so formatting them must
// not shift them again, and the server and client must render identical text.
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

// Rows are Monday-first (ISO weeks); only every other row is labelled so the labels stay legible at ~14px rows.
const WEEKDAY_ROW_LABELS = ["M", "", "W", "", "F", "", ""] as const;

const LEGEND_STEPS: Array<{ tone: HeatmapTone; cue: "dot" | string | null }> = [
  { tone: "none", cue: null },
  { tone: "low", cue: "dot" },
  { tone: "medium", cue: "2" },
  { tone: "high", cue: "3+" },
];

function formatDay(dayKey: string) {
  return DAY_LABEL_FORMAT.format(new Date(`${dayKey}T12:00:00.000Z`));
}

function formatMonth(monthKey: string) {
  return MONTH_LABEL_FORMAT.format(new Date(`${monthKey}-15T12:00:00.000Z`));
}

function describeCell(cell: HistoryConsistencyHeatmapCell) {
  const day = cell.isToday ? `${formatDay(cell.dayKey)} (today)` : formatDay(cell.dayKey);
  return `${day}: ${cell.sessionCount} ${cell.sessionCount === 1 ? "session" : "sessions"}`;
}

// Green family of the History calendar (same high step). The low and medium steps are lifted so a one-session day
// separates from an empty day by fill, not only by its dot; white cues stay above 4.5:1 on every step.
function cellToneClassName(tone: HeatmapTone) {
  switch (tone) {
    case "high":
      return "border-[rgb(var(--success-rgb)/0.94)] bg-[rgb(24_132_67)] text-[rgb(247_255_252)]";
    case "medium":
      return "border-[rgb(var(--success-rgb)/0.82)] bg-[rgb(20_108_58)] text-[rgb(244_255_250)]";
    case "low":
      return "border-[rgb(var(--success-rgb)/0.7)] bg-[rgb(16_84_46)] text-[rgb(238_255_248)]";
    default:
      return "border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-3-rgb)/0.58)]";
  }
}

// Cue text is 10px (11px from 390px up): the smallest size that still fits a ~13.5px cell at 320px.
const CELL_BASE_CLASS_NAME = "flex aspect-square w-full min-w-0 items-center justify-center rounded-[0.2rem] border text-[0.625rem] font-bold leading-none min-[390px]:text-[0.6875rem]";
const CUE_DOT_CLASS_NAME = "block h-[5px] w-[5px] rounded-full bg-current";
const FUTURE_CELL_CLASS_NAME = "border-dashed border-[rgb(var(--border-strong)/0.12)] bg-transparent";
const TODAY_CELL_CLASS_NAME = "ring-[1.5px] ring-[rgb(var(--accent-yellow-on)/0.95)]";

// Non-colour cue so intensity survives colour-blindness and low contrast: a dot for one session, the count for more.
function CellCue({ sessionCount }: { sessionCount: number }) {
  if (sessionCount <= 0) {
    return null;
  }

  if (sessionCount === 1) {
    return <span aria-hidden="true" className={CUE_DOT_CLASS_NAME} />;
  }

  return <span aria-hidden="true">{Math.min(sessionCount, 9)}</span>;
}

function HeatmapGrid({ heatmap, ariaLabel }: { heatmap: HistoryConsistencyHeatmap; ariaLabel: string }) {
  const markerByWeekIndex = new Map(heatmap.monthMarkers.map((marker) => [marker.weekIndex, marker.monthKey]));

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      data-history-consistency-heatmap="grid"
      className="grid w-full min-w-0 grid-flow-col gap-[2px] min-[360px]:gap-[3px]"
      style={{
        gridTemplateColumns: `auto repeat(${heatmap.weeks.length}, minmax(0, 1fr))`,
        gridTemplateRows: "auto repeat(7, auto)",
      }}
    >
      <span aria-hidden="true" className="block h-3.5" />
      {WEEKDAY_ROW_LABELS.map((label, index) => (
        <span
          key={`weekday-${index}`}
          aria-hidden="true"
          className="flex items-center pr-1.5 text-[0.5625rem] font-semibold uppercase leading-none text-[rgb(var(--text-muted)/0.78)] min-[390px]:text-[0.625rem]"
        >
          {label}
        </span>
      ))}
      {heatmap.weeks.map((week, weekIndex) => {
        const monthKey = markerByWeekIndex.get(weekIndex);
        return (
          <Fragment key={week[0]?.dayKey ?? weekIndex}>
            <span
              aria-hidden="true"
              data-heatmap-month={monthKey}
              className="block h-3.5 whitespace-nowrap text-[0.5625rem] font-semibold uppercase leading-none tracking-[0.08em] text-[rgb(var(--text-muted)/0.78)] min-[390px]:text-[0.625rem]"
            >
              {monthKey ? formatMonth(monthKey) : null}
            </span>
            {week.map((cell) => (
              <span
                key={cell.dayKey}
                title={cell.isFuture ? undefined : describeCell(cell)}
                data-heatmap-day={cell.dayKey}
                data-heatmap-count={cell.sessionCount}
                data-heatmap-tone={cell.isFuture ? "future" : cell.tone}
                data-heatmap-today={cell.isToday ? "true" : undefined}
                className={cn(
                  CELL_BASE_CLASS_NAME,
                  cell.isFuture ? FUTURE_CELL_CLASS_NAME : cellToneClassName(cell.tone),
                  cell.isToday ? TODAY_CELL_CLASS_NAME : undefined,
                )}
              >
                {cell.isFuture ? null : <CellCue sessionCount={cell.sessionCount} />}
              </span>
            ))}
          </Fragment>
        );
      })}
    </div>
  );
}

function HeatmapLegend() {
  return (
    <div
      aria-hidden="true"
      data-history-consistency-heatmap="legend"
      className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.78)]"
    >
      <span className="inline-flex items-center gap-1.5">
        <span className={cn("h-3.5 w-3.5 rounded-[0.2rem] border", cellToneClassName("none"), TODAY_CELL_CLASS_NAME)} />
        <span>Today</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span>Less</span>
        {LEGEND_STEPS.map((step) => (
          <span
            key={step.tone}
            className={cn("flex h-4 w-4 items-center justify-center rounded-[0.2rem] border text-[0.625rem] font-bold leading-none tracking-normal", cellToneClassName(step.tone))}
          >
            {step.cue === "dot"
              ? <span className={CUE_DOT_CLASS_NAME} />
              : step.cue}
          </span>
        ))}
        <span>More</span>
      </span>
    </div>
  );
}

function ActiveDayList({ heatmap }: { heatmap: HistoryConsistencyHeatmap }) {
  // Newest first. Today is always named, even with no session yet, so a screen-reader user knows where "now" is.
  const listedCells = heatmap.weeks.flat().filter((cell) => cell.sessionCount > 0 || cell.isToday).reverse();
  if (listedCells.length === 0) {
    return null;
  }

  return (
    <ul className="sr-only" aria-label="Active days">
      {listedCells.map((cell) => (
        <li key={cell.dayKey}>{describeCell(cell)}</li>
      ))}
    </ul>
  );
}

function HeatmapBody({
  heatmap,
  description,
  emptyMessage,
}: {
  heatmap: HistoryConsistencyHeatmap;
  description: string;
  emptyMessage: string | null;
}) {
  return (
    <div data-history-consistency-heatmap="body" className="min-w-0">
      {/* One line above the grid: the window summary, or, while the window is empty, an invitation instead of a "no data" line. */}
      {emptyMessage ? (
        <p
          data-history-consistency-heatmap="empty"
          className="mb-3 text-[0.78rem] font-semibold leading-snug text-[rgb(var(--success-rgb)/0.94)]"
        >
          {emptyMessage}
        </p>
      ) : (
        <p
          data-history-consistency-heatmap="summary"
          className="mb-3 text-[0.72rem] font-medium leading-snug text-[rgb(var(--text-muted)/0.86)]"
        >
          {description}
        </p>
      )}
      <HeatmapGrid
        heatmap={heatmap}
        ariaLabel={`${description} Brighter green squares and higher numbers mean more sessions that day.`}
      />
      <ActiveDayList heatmap={heatmap} />
      <HeatmapLegend />
    </div>
  );
}

export function ConsistencyHeatmapSurface({
  heatmap,
  viewMode,
}: {
  heatmap: HistoryConsistencyHeatmap;
  viewMode: "compact" | "detailed";
}) {
  const { description, compactSummaryItems, emptyMessage } = describeHistoryConsistencyHeatmap(heatmap);

  if (viewMode === "compact") {
    return (
      <HistoryCompactDisclosure
        title={<HistoryDisclosureTitle label="Consistency" meta={`${heatmap.weeks.length} weeks`} />}
        summaryItems={compactSummaryItems}
        accentTone="green"
      >
        <div className="px-3 pb-4 pt-4">
          <HeatmapBody heatmap={heatmap} description={description} emptyMessage={emptyMessage} />
        </div>
      </HistoryCompactDisclosure>
    );
  }

  return (
    <HistorySection
      title={<span className="block w-full text-center">Consistency</span>}
      className="!border-0 !bg-transparent !p-0"
      headerAlign="center"
    >
      <HeatmapBody heatmap={heatmap} description={description} emptyMessage={emptyMessage} />
    </HistorySection>
  );
}
