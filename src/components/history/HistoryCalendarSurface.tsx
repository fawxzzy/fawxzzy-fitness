"use client";

import { HorizontalScrollHint } from "@/components/ui/HorizontalScrollHint";
import { HistoryCompactDisclosure } from "@/components/history/HistoryMetricsDisclosure";
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

function CalendarContent({
  calendarView,
  onSelectDayKey,
}: {
  calendarView: HistoryCalendarView;
  onSelectDayKey: (dayKey: string | null) => void;
}) {
  return (
    <>
      <HorizontalScrollHint
        scrollClassName="-mx-1.5 px-1.5 [touch-action:pan-x_pan-y] [overscroll-behavior-y:auto]"
        contentClassName="flex min-w-max gap-2 pb-1"
      >
        {calendarView.months.map((month) => (
          <section
            key={month.monthKey}
            className="min-w-[17.5rem] space-y-2 rounded-[var(--card-radius)] border border-[rgb(var(--accent-divider-rgb)/0.22)] bg-[rgb(var(--surface-1-rgb)/0.5)] p-3 shadow-[inset_0_0_0_1px_rgb(var(--surface-2-rgb)/0.2)]"
          >
            <div className="space-y-1">
              <p className="text-center text-[0.88rem] font-semibold tracking-[-0.01em] text-[rgb(var(--text-primary)/0.98)]">
                {month.monthLabel}
              </p>
              <p className="text-center text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.84)]">
                {formatMonthSummary(month.activeDayCount, month.sessionCount)}
              </p>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.72)]">
              {["M", "T", "W", "T", "F", "S", "S"].map((label, index) => (
                <span key={`${month.monthKey}-weekday-${index}`}>
                  {label}
                </span>
              ))}
            </div>
            <div className="space-y-1">
              {month.weeks.map((week, weekIndex) => (
                <div key={`${month.monthKey}-week-${weekIndex}`} className="grid grid-cols-7 gap-1">
                  {week.map((day) => {
                    if (!day.inMonth) {
                      return (
                        <span
                          key={day.dayKey}
                          aria-hidden="true"
                          data-calendar-day-filler="true"
                          className="block aspect-square min-h-[2.2rem]"
                        />
                      );
                    }

                    return (
                      <button
                        key={day.dayKey}
                        type="button"
                        aria-pressed={day.isSelected}
                        aria-label={day.isSkipped ? `${day.dayNumber}, planned workout skipped` : undefined}
                        data-calendar-day-state={day.sessionCount > 0 ? "training" : day.isSkipped ? "skipped" : day.isToday ? "today" : "empty"}
                        disabled={day.sessionCount === 0}
                        onClick={() => onSelectDayKey(day.isSelected ? null : day.dayKey)}
                        style={{ backgroundColor: getDayBackgroundColor(day) }}
                        className={cn(
                          "flex aspect-square min-h-[2.2rem] flex-col items-center justify-center rounded-[0.55rem] border px-1 py-1 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)] disabled:cursor-default disabled:opacity-100",
                          getDayButtonClassName(day),
                        )}
                      >
                        <span className="text-[0.78rem] font-semibold leading-none">
                          {day.dayNumber}
                        </span>
                        <span className="mt-0.5 text-[0.52rem] font-semibold uppercase tracking-[0.1em]">
                          {day.sessionCount > 0 ? day.sessionCount : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        ))}
      </HorizontalScrollHint>
      <div className="flex items-center justify-center gap-1.5 pt-1 text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.72)]">
        <span className="h-2.5 w-2.5 rounded-[0.2rem] border border-[rgb(var(--accent-yellow-on)/0.5)] bg-[rgb(var(--accent-yellow-on)/0.18)]" />
        <span>Today</span>
        <span className="ml-2 h-2.5 w-2.5 rounded-[0.2rem] border border-[rgb(var(--success-rgb)/0.6)] bg-[rgb(17_91_49)]" />
        <span>Training</span>
        <span className="ml-2 h-2.5 w-2.5 rounded-[0.2rem] border border-[rgb(var(--danger-rgb)/0.62)] bg-[rgb(92_26_31)]" />
        <span>Skipped</span>
      </div>
    </>
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
      <HistoryCompactDisclosure title="Calendar" accentTone="green">
        <div className="px-3 pb-4 pt-4">{content}</div>
      </HistoryCompactDisclosure>
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
