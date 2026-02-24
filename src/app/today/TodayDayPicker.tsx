"use client";

import { useMemo, useState } from "react";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import type { ActionResult } from "@/lib/action-result";

type TodayDay = {
  id: string;
  dayIndex: number;
  name: string;
  isRest: boolean;
};

export function TodayDayPicker({
  days,
  currentDayIndex,
  startSessionAction,
}: {
  days: TodayDay[];
  currentDayIndex: number;
  startSessionAction: (payload?: { dayIndex?: number }) => Promise<ActionResult<{ sessionId: string }>>;
}) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(currentDayIndex);
  const selectedDay = useMemo(() => days.find((day) => day.dayIndex === selectedDayIndex) ?? null, [days, selectedDayIndex]);

  return (
    <div className="space-y-2">
      <label htmlFor="today-day-picker" className="block text-xs font-semibold uppercase tracking-wide text-muted">
        Workout day for this session
      </label>
      <select
        id="today-day-picker"
        value={selectedDayIndex}
        onChange={(event) => setSelectedDayIndex(Number(event.target.value))}
        className="w-full rounded-md border border-border bg-surface-2-soft px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
      >
        {days.map((day) => (
          <option key={day.id} value={day.dayIndex}>
            {day.name}
            {day.isRest ? " (Rest)" : ""}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted">
        Temporary selection only. Routine schedule stays unchanged.
        {selectedDay && selectedDay.dayIndex !== currentDayIndex ? ` Starting ${selectedDay.name} for this workout.` : ""}
      </p>
      <TodayStartButton startSessionAction={startSessionAction} selectedDayIndex={selectedDayIndex} />
    </div>
  );
}
