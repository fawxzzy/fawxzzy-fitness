"use client";

import { CardHeader, CardMeta, CardSurface } from "@/components/ui/card-system";
import { DayList } from "@/components/day-list/DayList";
import { buildSwitchDayCardModel, type SwitchDayCardInput } from "@/lib/today-switch-day";

export type TodaySwitchDay = SwitchDayCardInput & { id: string };

/**
 * Visible selected cue for Switch Day: a check in a filled circle. Decorative (aria-hidden); the header button
 * carries `aria-pressed`, so the state never relies on colour or this glyph alone.
 */
function SelectedCheck() {
  return (
    <span
      aria-hidden="true"
      data-switch-day-selected-check="true"
      className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[rgb(var(--selection-rgb)/0.9)] text-[rgb(var(--text-primary))]"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 8.5l3 3 6-7" />
      </svg>
    </span>
  );
}

/**
 * One Switch Day card. No chips or tags (Zac 2026-11-19): the title names the day, the meta line carries the plain
 * facts, training days show a snapshot of their first exercises, rest days are a one-line "Rest day" card.
 * Selecting is one stretched header button with `aria-pressed`; the selected card is green (current tone) and shows
 * a check (DESIGN-CONTRACT C4).
 */
export function TodaySwitchDayCard({
  day,
  startDate,
  isToday,
  isSelected,
  isCompleted,
  isInSession,
  onSelect,
}: {
  day: TodaySwitchDay;
  startDate: string | null | undefined;
  isToday: boolean;
  isSelected: boolean;
  isCompleted: boolean;
  isInSession: boolean;
  onSelect: () => void;
}) {
  const model = buildSwitchDayCardModel(day, { isToday, isSelected, isCompleted, isInSession }, startDate);
  const interaction = { kind: "select" as const, selected: isSelected, onSelect };
  const trailing = isSelected ? <SelectedCheck /> : undefined;

  if (model.kind === "rest") {
    return (
      <li className="min-w-0">
        <CardSurface tone={model.tone} data-routine-day-card={day.dayIndex} data-switch-day-card="rest">
          <CardHeader
            headingLevel={2}
            title={model.title}
            titleSecondary={model.meta.join(" · ")}
            interaction={interaction}
            trailing={trailing}
            trailingClassName="pointer-events-none"
            mainClassName="!py-2"
          />
        </CardSurface>
      </li>
    );
  }

  return (
    <li className="min-w-0">
      <CardSurface tone={model.tone} data-routine-day-card={day.dayIndex} data-switch-day-card="training">
        <CardHeader
          headingLevel={2}
          title={model.title}
          meta={<CardMeta items={model.meta} />}
          details={model.snapshotNames.length > 0 ? (
            <p data-switch-day-snapshot="true" className="m-0 -mt-1 text-[13px] leading-snug text-[rgb(var(--text-muted))] [overflow-wrap:anywhere]">
              {model.snapshotNames.join(", ")}
              {model.snapshotOverflow ? <span className="whitespace-nowrap">{`, ${model.snapshotOverflow}`}</span> : null}
            </p>
          ) : undefined}
          interaction={interaction}
          trailing={trailing}
          trailingClassName="pointer-events-none"
        />
      </CardSurface>
    </li>
  );
}

/** The Switch Day list: one `ul` (DayList) of TodaySwitchDayCards. Shared by the live picker and /dev/switch-day. */
export function TodaySwitchDayList({
  days,
  startDate,
  currentDayIndex,
  selectedDayIndex,
  completedDayIndexes,
  inSessionDayIndex,
  onSelectDay,
}: {
  days: TodaySwitchDay[];
  startDate: string | null | undefined;
  currentDayIndex: number | null;
  selectedDayIndex: number | null;
  completedDayIndexes?: ReadonlySet<number> | readonly number[];
  inSessionDayIndex?: number | null;
  onSelectDay: (dayIndex: number) => void;
}) {
  const completed = completedDayIndexes instanceof Set
    ? completedDayIndexes
    : new Set(completedDayIndexes ?? []);

  return (
    <DayList className="space-y-[0.375rem] sm:space-y-[0.375rem]">
      {days.map((day) => (
        <TodaySwitchDayCard
          key={day.id}
          day={day}
          startDate={startDate}
          isToday={day.dayIndex === currentDayIndex}
          isSelected={day.dayIndex === selectedDayIndex}
          isCompleted={completed.has(day.dayIndex)}
          isInSession={inSessionDayIndex === day.dayIndex}
          onSelect={() => onSelectDay(day.dayIndex)}
        />
      ))}
    </DayList>
  );
}
