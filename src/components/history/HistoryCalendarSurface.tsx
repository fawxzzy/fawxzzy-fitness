"use client";

import { useState } from "react";
import { HistoryDisclosureCard } from "@/components/history/HistoryMetricsDisclosure";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { cardTokens } from "@/components/ui/card-system";
import { cn } from "@/lib/cn";
import type { HistoryCalendarView } from "@/lib/history-calendar";
import { HistorySection } from "./HistoryShared";

function formatMonthSummary(activeDayCount: number, sessionCount: number) {
  return `${activeDayCount} active ${activeDayCount === 1 ? "day" : "days"} · ${sessionCount} ${sessionCount === 1 ? "session" : "sessions"}`;
}

function getDayButtonClassName(args: {
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isSkipped: boolean;
  activityTone: "none" | "low" | "medium" | "high";
}) {
  if (!args.inMonth) {
    return "border-[rgb(var(--border-strong)/0.08)] bg-[rgb(var(--surface-2)/0.2)] text-[rgb(var(--text-muted)/0.4)]";
  }

  if (args.isSelected) {
    return "border-[rgb(var(--accent-yellow-on)/0.92)] bg-[rgb(25_102_53)] text-[rgb(240_255_251)] shadow-[0_0_0_1px_rgb(var(--accent-yellow-on)/0.28),0_8px_20px_rgb(24_132_67/0.12)]";
  }

  if (args.isToday) {
    return "border-[rgb(var(--accent-yellow-on)/0.9)] bg-[rgb(93_74_21)] text-[rgb(255_250_231)] shadow-[0_0_0_1px_rgb(var(--accent-yellow-on)/0.12)]";
  }

  if (args.isSkipped) {
    return "border-[rgb(var(--danger-rgb)/0.82)] bg-[rgb(92_26_31)] text-[rgb(255_244_244)] shadow-[0_0_0_1px_rgb(var(--danger-rgb)/0.12)]";
  }

  switch (args.activityTone) {
    case "high":
      return "border-[rgb(var(--success-rgb)/0.94)] bg-[rgb(24_132_67)] text-[rgb(247_255_252)] shadow-[0_0_0_1px_rgb(var(--success-rgb)/0.12)]";
    case "medium":
      return "border-[rgb(var(--success-rgb)/0.82)] bg-[rgb(17_91_49)] text-[rgb(244_255_250)]";
    case "low":
      return "border-[rgb(var(--success-rgb)/0.68)] bg-[rgb(12_57_33)] text-[rgb(238_255_248)]";
    default:
      return "border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-3-rgb)/0.58)] text-[rgb(var(--text-secondary)/0.82)]";
  }
}

function getDayBackgroundColor(args: {
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isSkipped: boolean;
  activityTone: "none" | "low" | "medium" | "high";
}) {
  if (!args.inMonth) return undefined;
  if (args.isSelected) return "rgb(25 102 53)";
  if (args.isToday) return "rgb(93 74 21)";
  if (args.isSkipped) return "rgb(92 26 31)";

  switch (args.activityTone) {
    case "high":
      return "rgb(24 132 67)";
    case "medium":
      return "rgb(17 91 49)";
    case "low":
      return "rgb(12 57 33)";
    default:
      return undefined;
  }
}

/** Visually hidden suffix, so the button name reads `12 2 sessions` and still contains what is printed on the cell. */
function formatDayStatus(day: { sessionCount: number; isSkipped: boolean }) {
  if (day.sessionCount > 0) {
    return `${day.sessionCount === 1 ? "1 session" : `${day.sessionCount} sessions`}`;
  }
  return day.isSkipped ? "planned workout skipped" : null;
}

const MONTH_NAV_BUTTON_CLASS_NAME = cardTokens.iconControl;

/**
 * One month at a time with older / newer controls (`aria-disabled`, not `disabled`, so the pressed control keeps
 * keyboard focus when it reaches the end of the range). The months used to sit side by side in a sideways scroller,
 * and every cell shrank to about 35px so the whole month fit in a 280px column; one month fills the card width
 * (cells are 44px tall, as wide as the card allows) and the month label is a polite live region.
 */
function CalendarContent({
  calendarView,
  onSelectDayKey,
}: {
  calendarView: HistoryCalendarView;
  onSelectDayKey: (dayKey: string | null) => void;
}) {
  // `months` is newest first, so index 0 is the latest month and a higher index is older.
  const [requestedIndex, setRequestedIndex] = useState(0);
  const lastIndex = Math.max(0, calendarView.months.length - 1);
  const monthIndex = Math.min(requestedIndex, lastIndex);
  const month = calendarView.months[monthIndex];
  const olderMonth = calendarView.months[monthIndex + 1];
  const newerMonth = calendarView.months[monthIndex - 1];

  if (!month) {
    return null;
  }

  return (
    <div data-history-calendar="true" className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={olderMonth ? `Show ${olderMonth.monthLabel}` : "Show older month"}
          aria-disabled={!olderMonth}
          onClick={() => olderMonth && setRequestedIndex(monthIndex + 1)}
          data-calendar-nav="older"
          className={MONTH_NAV_BUTTON_CLASS_NAME}
        >
          <ChevronRightIcon className="h-5 w-5 rotate-180" />
        </button>
        <div aria-live="polite" data-calendar-month-label="true" className="min-w-0 flex-1 text-center">
          <p className="m-0 text-base font-semibold leading-snug text-[rgb(var(--text-primary)/0.98)]">{month.monthLabel}</p>
          <p className="m-0 text-xs font-medium leading-snug text-[rgb(var(--text-secondary)/0.92)]">
            {formatMonthSummary(month.activeDayCount, month.sessionCount)}
          </p>
        </div>
        <button
          type="button"
          aria-label={newerMonth ? `Show ${newerMonth.monthLabel}` : "Show newer month"}
          aria-disabled={!newerMonth}
          onClick={() => newerMonth && setRequestedIndex(monthIndex - 1)}
          data-calendar-nav="newer"
          className={MONTH_NAV_BUTTON_CLASS_NAME}
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="grid gap-0.5">
        <div aria-hidden="true" className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-muted)/0.95)]">
          {["M", "T", "W", "T", "F", "S", "S"].map((label, index) => (
            <span key={`${month.monthKey}-weekday-${index}`}>{label}</span>
          ))}
        </div>
        {month.weeks.map((week, weekIndex) => (
          <div key={`${month.monthKey}-week-${weekIndex}`} className="grid grid-cols-7 gap-0.5">
            {week.map((day) => {
              if (!day.inMonth) {
                return <span key={day.dayKey} aria-hidden="true" data-calendar-day-filler="true" className="block h-11" />;
              }

              return (
                <button
                  key={day.dayKey}
                  type="button"
                  aria-pressed={day.isSelected}
                  data-calendar-day-state={day.sessionCount > 0 ? "training" : day.isSkipped ? "skipped" : day.isToday ? "today" : "empty"}
                  disabled={day.sessionCount === 0}
                  onClick={() => onSelectDayKey(day.isSelected ? null : day.dayKey)}
                  style={{ backgroundColor: getDayBackgroundColor(day) }}
                  className={cn(
                    "flex h-11 min-w-0 flex-col items-center justify-center rounded-lg border px-0.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)] disabled:cursor-default disabled:opacity-100 motion-reduce:transition-none",
                    getDayButtonClassName(day),
                  )}
                >
                  <span className="text-sm font-semibold leading-none">{day.dayNumber}</span>
                  <span className="mt-0.5 h-[11px] text-[11px] font-semibold leading-none">
                    {day.sessionCount > 0 ? day.sessionCount : ""}
                  </span>
                  {formatDayStatus(day) ? <span className="sr-only"> {formatDayStatus(day)}</span> : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-muted)/0.95)]">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 rounded-[0.2rem] border border-[rgb(var(--accent-yellow-on)/0.5)] bg-[rgb(var(--accent-yellow-on)/0.18)]" />
          <span>Today</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 rounded-[0.2rem] border border-[rgb(var(--success-rgb)/0.6)] bg-[rgb(17_91_49)]" />
          <span>Training</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 rounded-[0.2rem] border border-[rgb(var(--danger-rgb)/0.62)] bg-[rgb(92_26_31)]" />
          <span>Skipped</span>
        </span>
      </div>
    </div>
  );
}

export function HistoryCalendarSurface({
  calendarView,
  onSelectDayKey,
  viewMode,
}: {
  calendarView: HistoryCalendarView;
  onSelectDayKey: (dayKey: string | null) => void;
  viewMode: "compact" | "detailed";
}) {
  const content = <CalendarContent calendarView={calendarView} onSelectDayKey={onSelectDayKey} />;

  if (viewMode === "compact") {
    return (
      <HistoryDisclosureCard title="Calendar" tone="logged" panelClassName="px-2 pb-3 pt-3">
        {content}
      </HistoryDisclosureCard>
    );
  }

  return (
    <HistorySection
      title={<span className="block w-full text-center">Calendar</span>}
      className="!border-0 !bg-transparent !p-0"
      headerAlign="center"
    >
      {content}
    </HistorySection>
  );
}
