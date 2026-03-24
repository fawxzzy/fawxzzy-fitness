"use client";

import { useCallback, useMemo, useState } from "react";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { AnchoredSelectorPanel } from "@/components/ui/app/AnchoredSelectorPanel";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import {
  DayCard,
  DayList,
  formatLoggedSetCount,
  resolveDayCardBadgeText,
  resolveDayCardState,
  REST_DAY_CARD_COPY,
} from "@/components/day-list/DayList";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { BottomActionSingle, BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { SecondaryButton } from "@/components/ui/AppButton";
import { AccentSubtitleText, SubtitleText } from "@/components/ui/text-roles";
import { getExerciseCountSummaryFromInputs } from "@/lib/day-summary";

type TodayExercise = {
  id: string;
  exerciseId: string;
  name: string;
  targets: string | null;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | null;
  isCardio?: boolean | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
  image_howto_path: string | null;
  image_icon_path: string | null;
  slug: string | null;
  how_to_short: string | null;
};

type TodayDayState = "rest" | "empty" | "partial" | "runnable";

type TodayDay = {
  id: string;
  dayIndex: number;
  name: string;
  isRest: boolean;
  state: TodayDayState;
  invalidExerciseCount: number;
  exercises: TodayExercise[];
};

function getDaySummary(day: TodayDay) {
  if (day.state === "rest") {
    return REST_DAY_CARD_COPY;
  }

  if (day.state === "empty" && day.invalidExerciseCount > 0) {
    return "This day has invalid exercises. Edit the day before starting a workout.";
  }

  if (day.state === "empty") {
    return "No exercises yet.";
  }

  if (day.state === "partial") {
    return "Some exercises could not be loaded and will be skipped when you start this workout.";
  }

  return null;
}

function getDaySummaryTone(day: TodayDay): "blocking" | "warning" | null {
  if (day.state === "empty" && day.invalidExerciseCount > 0) {
    return "blocking";
  }

  if (day.state === "partial") {
    return "warning";
  }

  return null;
}


export function TodayDayPicker({
  routineName,
  days,
  currentDayIndex,
  inProgressSessionId,
  completedDayIndexes,
  inSessionDayIndex,
  loggedSetCountsByDayIndex,
}: {
  routineName: string;
  days: TodayDay[];
  currentDayIndex: number;
  inProgressSessionId?: string | null;
  completedDayIndexes?: number[];
  inSessionDayIndex?: number | null;
  loggedSetCountsByDayIndex?: Record<number, number>;
}) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(currentDayIndex);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const selectedDay = useMemo(
    () => days.find((day) => day.dayIndex === selectedDayIndex) ?? days.find((day) => day.dayIndex === currentDayIndex) ?? null,
    [currentDayIndex, days, selectedDayIndex],
  );

  const togglePicker = useCallback(() => {
    setIsPickerOpen((previous) => !previous);
  }, []);

  const isRunnableDay = selectedDay?.state === "runnable" || selectedDay?.state === "partial";
  const daySummary = selectedDay ? getDaySummary(selectedDay) : null;
  const daySummaryTone = selectedDay ? getDaySummaryTone(selectedDay) : null;
  const hasInProgressSession = Boolean(inProgressSessionId);
  const completedDayIndexSet = useMemo(() => new Set(completedDayIndexes ?? []), [completedDayIndexes]);

  const actionsNode = useMemo(() => {
    const selectDayButton = (
      <SecondaryButton
        id="today-day-picker"
        type="button"
        className="w-full justify-center border-white/14 bg-transparent text-center text-[rgb(var(--text)/0.78)] shadow-none hover:bg-white/[0.05]"
        onClick={togglePicker}
        aria-expanded={isPickerOpen}
        aria-controls="today-day-selector-list"
      >
        <span>{isPickerOpen ? "Hide Days" : "Select Day"}</span>
      </SecondaryButton>
    );

    if (!hasInProgressSession && !isRunnableDay) {
      return <BottomActionSingle>{selectDayButton}</BottomActionSingle>;
    }

    return (
      <BottomActionSplit
        secondary={selectDayButton}
        primary={hasInProgressSession ? (
          <TodayStartButton
            sessionId={inProgressSessionId ?? undefined}
            returnTo="/today"
            fullWidth
            className="w-full"
            label="Resume Session"
          />
        ) : (
          <TodayStartButton
            selectedDayIndex={selectedDayIndex}
            returnTo="/today"
            fullWidth
            className="w-full"
          />
        )}
      />
    );
  }, [hasInProgressSession, inProgressSessionId, isPickerOpen, isRunnableDay, selectedDayIndex, togglePicker]);

  usePublishBottomActions(actionsNode);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {selectedDay ? (
        <AnchoredSelectorPanel
          title={`${routineName} | ${selectedDay.name}`}
          subtitleRight={selectedDay.state === "rest" ? undefined : getExerciseCountSummaryFromInputs(selectedDay.exercises).label}
          action={inSessionDayIndex === selectedDay.dayIndex
            ? <AppBadge>In Session</AppBadge>
            : completedDayIndexSet.has(selectedDay.dayIndex)
              ? <AppBadge>Completed</AppBadge>
              : undefined}
          revealOpen={isPickerOpen}
          revealId="today-day-selector-list"
          revealLabel="Routine days"
          revealContent={(
            <DayList>
              {days.map((day) => {
                const isSelected = selectedDayIndex === day.dayIndex;
                return (
                  <DayCard
                    key={day.id}
                    title={`Day ${day.dayIndex} | ${day.name}`}
                    subtitle={day.state === "runnable" || day.state === "partial" ? getExerciseCountSummaryFromInputs(day.exercises).label : getDaySummary(day) ?? undefined}
                    onPress={() => {
                      setSelectedDayIndex(day.dayIndex);
                      setIsPickerOpen(false);
                    }}
                    state={resolveDayCardState({
                      isSelected,
                      isToday: day.dayIndex === currentDayIndex,
                      isRest: day.isRest,
                      isCompleted: completedDayIndexSet.has(day.dayIndex),
                      isInSession: inSessionDayIndex === day.dayIndex,
                    })}
                    badgeText={resolveDayCardBadgeText({
                      isToday: day.dayIndex === currentDayIndex,
                      isRest: day.isRest,
                      isCompleted: completedDayIndexSet.has(day.dayIndex),
                      isInSession: inSessionDayIndex === day.dayIndex,
                    })}
                    metaText={formatLoggedSetCount(loggedSetCountsByDayIndex?.[day.dayIndex])}
                    rightIcon={null}
                  />
                );
              })}
            </DayList>
          )}
        >
          {!isPickerOpen && daySummary ? (
            <div
              className={[
                "rounded-md px-3 py-2",
                daySummaryTone === "blocking"
                  ? "border border-red-400/30 bg-red-500/10 text-red-100"
                  : daySummaryTone === "warning"
                    ? "border border-amber-400/20 bg-amber-500/10 text-amber-100"
                    : "border border-border/70 bg-[rgb(var(--bg)/0.35)] text-muted",
              ].join(" ")}
            >
              {daySummaryTone
                ? <AccentSubtitleText className={daySummaryTone === "blocking" ? "text-red-100" : "text-amber-100"}>{daySummary}</AccentSubtitleText>
                : <SubtitleText>{daySummary}</SubtitleText>}
            </div>
          ) : null}

          {!isPickerOpen ? <ul className={selectedDay.state === "rest" ? "space-y-0" : "space-y-2"}>
            {selectedDay.exercises.map((exercise) => (
              <li key={exercise.id}>
                <StandardExerciseRow
                  exercise={exercise}
                  summary={exercise.targets}
                  onPress={() => {
                    if (process.env.NODE_ENV === "development") {
                      console.debug("[ExerciseInfo:open] TodayDayPicker", { exerciseId: exercise.exerciseId, exercise });
                    }
                    setSelectedExerciseId(exercise.exerciseId);
                  }}
                />
              </li>
            ))}
            {selectedDay.exercises.length === 0 ? (
              <li className={selectedDay.state === "rest" ? "pt-1" : "px-3 py-3"}>
                {selectedDay.state === "rest" ? null : <SubtitleText>No exercises yet.</SubtitleText>}
              </li>
            ) : null}
          </ul> : null}
        </AnchoredSelectorPanel>
      ) : null}

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
