"use client";

import { useMemo, useState } from "react";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { AppRow } from "@/components/ui/app/AppRow";
import { StickyActionBar } from "@/components/ui/app/StickyActionBar";
import { appTokens } from "@/components/ui/app/tokens";
import { SecondaryButton } from "@/components/ui/AppButton";
import type { ActionResult } from "@/lib/action-result";

type TodayExercise = {
  id: string;
  name: string;
  targets: string | null;
};

type TodayDay = {
  id: string;
  dayIndex: number;
  name: string;
  isRest: boolean;
  exercises: TodayExercise[];
};

export function TodayDayPicker({
  routineName,
  days,
  currentDayIndex,
  completedTodayCount,
  startSessionAction,
}: {
  routineName: string;
  days: TodayDay[];
  currentDayIndex: number;
  completedTodayCount: number;
  startSessionAction: (payload?: { dayIndex?: number }) => Promise<ActionResult<{ sessionId: string }>>;
}) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(currentDayIndex);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const selectedDay = useMemo(
    () => days.find((day) => day.dayIndex === selectedDayIndex) ?? days.find((day) => day.dayIndex === currentDayIndex) ?? null,
    [currentDayIndex, days, selectedDayIndex],
  );

  return (
    <div className="flex min-h-0 flex-col gap-4 pb-4">
      {selectedDay ? (
        <AppPanel className="space-y-3 p-4">
          <AppHeader
            title={selectedDay.isRest ? `${routineName} (Rest Day)` : selectedDay.name}
            subtitleLeft={`Day ${selectedDay.dayIndex} • ${routineName}`}
            subtitleRight={selectedDay.exercises.length > 0 ? `${selectedDay.exercises.length} exercises` : undefined}
            action={completedTodayCount > 0 && selectedDay.dayIndex === currentDayIndex ? <AppBadge>Completed</AppBadge> : undefined}
          />

          <ul className={`${appTokens.listDivider} overflow-hidden rounded-lg border border-white/15 bg-[rgb(var(--surface)/0.72)] text-sm`}>
            {selectedDay.exercises.map((exercise) => (
              <li key={exercise.id}><AppRow leftTop={exercise.name} leftBottom={exercise.targets || undefined} className="rounded-none border-x-0 border-t-0 border-b-white/12 bg-transparent px-3" /></li>
            ))}
            {selectedDay.exercises.length === 0 ? <li className="px-3 py-3 text-muted">No routine exercises planned for this day.</li> : null}
          </ul>
        </AppPanel>
      ) : null}

      {isPickerOpen ? (
        <AppPanel className="space-y-3 rounded-lg border-white/15 bg-[rgb(var(--surface-2-soft)/0.7)] p-3 shadow-none">
          <p className="text-sm font-semibold text-muted">Choose workout day</p>
          <div aria-label="Routine days" className="space-y-2">
            {days.map((day) => {
              const isSelected = selectedDayIndex === day.dayIndex;
              return (
                <AppRow
                  key={day.id}
                  tone={isSelected ? "active" : "default"}
                  leftTop={<span>{day.name}{day.isRest ? " (Rest)" : ""}</span>}
                  onClick={() => {
                    setSelectedDayIndex(day.dayIndex);
                    setIsPickerOpen(false);
                  }}
                  className={isSelected ? "border-accent/70 bg-accent/26" : "border-border/85 bg-surface-2-soft/95"}
                />
              );
            })}
          </div>
        </AppPanel>
      ) : null}

      <StickyActionBar
        primary={<TodayStartButton startSessionAction={startSessionAction} selectedDayIndex={selectedDayIndex} />}
        secondary={(
          <SecondaryButton
            id="today-day-picker"
            type="button"
            fullWidth
            className="h-11 border-white/14 bg-transparent text-[rgb(var(--text)/0.78)] shadow-none hover:bg-white/[0.05]"
            onClick={() => {
              setIsPickerOpen((previous) => !previous);
            }}
            aria-expanded={isPickerOpen}
          >
            <span>{isPickerOpen ? "Hide options" : "Change Workout"}</span>
          </SecondaryButton>
        )}
      />
    </div>
  );
}
