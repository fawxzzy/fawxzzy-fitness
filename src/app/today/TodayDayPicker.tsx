"use client";

import { useMemo, useState } from "react";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { AppRow } from "@/components/ui/app/AppRow";
import { ExerciseCard } from "@/components/ExerciseCard";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { SecondaryButton } from "@/components/ui/AppButton";
import type { ActionResult } from "@/lib/action-result";

type TodayExercise = {
  id: string;
  exerciseId: string;
  name: string;
  targets: string | null;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  image_howto_path: string | null;
  image_icon_path: string | null;
  slug: string | null;
  how_to_short: string | null;
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
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const selectedDay = useMemo(
    () => days.find((day) => day.dayIndex === selectedDayIndex) ?? days.find((day) => day.dayIndex === currentDayIndex) ?? null,
    [currentDayIndex, days, selectedDayIndex],
  );

  return (
    <div className="flex min-h-0 flex-col gap-4">
      {selectedDay ? (
        <AppPanel className="space-y-3 p-4">
          <AppHeader
            title={`${routineName} | ${selectedDay.name}`}
            subtitleRight={`${selectedDay.exercises.length} exercises`}
            action={completedTodayCount > 0 && selectedDay.dayIndex === currentDayIndex ? <AppBadge>Completed</AppBadge> : undefined}
          />

          <ul className="space-y-2">
            {selectedDay.exercises.map((exercise) => (
              <li key={exercise.id}>
                <ExerciseCard
                  title={exercise.name}
                  onPress={() => {
                    if (process.env.NODE_ENV === "development") {
                      console.debug("[ExerciseInfo:open] TodayDayPicker", { exerciseId: exercise.exerciseId, exercise });
                    }
                    setSelectedExerciseId(exercise.exerciseId);
                  }}
                >
                  <p className="min-w-0 text-xs leading-snug whitespace-normal break-words text-[rgb(var(--text)/0.7)]">{exercise.targets ?? "Goal: Not set"}</p>
                </ExerciseCard>
              </li>
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

      <BottomActionBar variant="sticky">
        <TodayStartButton
          startSessionAction={startSessionAction}
          selectedDayIndex={selectedDayIndex}
          fullWidth
          className="w-full"
        />
        <SecondaryButton
          id="today-day-picker"
          type="button"
          className="w-full min-h-[44px] justify-center border-white/14 bg-transparent text-center text-[rgb(var(--text)/0.78)] shadow-none hover:bg-white/[0.05]"
          onClick={() => {
            setIsPickerOpen((previous) => !previous);
          }}
          aria-expanded={isPickerOpen}
        >
          <span>{isPickerOpen ? "Hide options" : "Change Workout"}</span>
        </SecondaryButton>
      </BottomActionBar>

      <ExerciseInfo
        exerciseId={selectedExerciseId}
        open={Boolean(selectedExerciseId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedExerciseId(null);
          }
        }}
        onClose={() => {
          setSelectedExerciseId(null);
        }}
        sourceContext="TodayDayPicker"
      />
    </div>
  );
}
