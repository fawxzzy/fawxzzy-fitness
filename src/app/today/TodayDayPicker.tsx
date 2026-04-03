"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
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
import { getExerciseCountSummaryFromInputs, getRestDayExerciseCountSummaryFromInputs } from "@/lib/day-summary";
import { ACTIVE_SESSION_EVENT, clearActiveSessionHint, readActiveSessionHint } from "@/lib/session-state-sync";
import {
  deriveTodayScreenMode,
  getTodayDaySummary,
  getTodayDaySummaryTone,
  type TodayPickerDayState,
} from "@/lib/today-page-state";

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

type TodayDay = {
  id: string;
  dayIndex: number;
  name: string;
  isRest: boolean;
  state: TodayPickerDayState;
  invalidExerciseCount: number;
  exercises: TodayExercise[];
};


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
  const router = useRouter();

  useEffect(() => {
    const syncActiveSession = () => {
      const hintSessionId = readActiveSessionHint()?.sessionId ?? null;
      if (!inProgressSessionId && hintSessionId) {
        clearActiveSessionHint(hintSessionId);
        router.refresh();
      }
    };

    syncActiveSession();
    window.addEventListener("focus", syncActiveSession);
    window.addEventListener("pageshow", syncActiveSession);
    window.addEventListener(ACTIVE_SESSION_EVENT, syncActiveSession as EventListener);

    return () => {
      window.removeEventListener("focus", syncActiveSession);
      window.removeEventListener("pageshow", syncActiveSession);
      window.removeEventListener(ACTIVE_SESSION_EVENT, syncActiveSession as EventListener);
    };
  }, [inProgressSessionId, router]);

  const mode = useMemo(() => deriveTodayScreenMode({
    days,
    selectedDayIndex,
    currentDayIndex,
    dayPickerOpen: isPickerOpen,
    inProgressSessionId,
  }), [currentDayIndex, days, inProgressSessionId, isPickerOpen, selectedDayIndex]);

  const togglePicker = useCallback(() => {
    setIsPickerOpen((previous) => !previous);
  }, []);

  const selectedDay = mode.selectedDay;
  const selectedDaySummary = selectedDay
    ? getRestDayExerciseCountSummaryFromInputs(selectedDay.exercises, selectedDay.state === "rest").label
    : null;
  const daySummary = selectedDay
    ? (selectedDay.state === "rest" ? REST_DAY_CARD_COPY : getTodayDaySummary(selectedDay))
    : null;
  const daySummaryTone = selectedDay ? getTodayDaySummaryTone(selectedDay) : null;
  const completedDayIndexSet = useMemo(() => new Set(completedDayIndexes ?? []), [completedDayIndexes]);

  const actionsNode = useMemo(() => {
    const selectDayButton = (
      <SecondaryButton
        id="today-day-picker"
        type="button"
        className="w-full justify-center border-white/14 bg-transparent text-center text-[rgb(var(--text)/0.78)] shadow-none hover:bg-white/[0.05]"
        onClick={togglePicker}
        aria-expanded={mode.dayPickerOpen}
        aria-controls="today-day-selector-list"
      >
        <span>{mode.cta.secondaryLabel}</span>
      </SecondaryButton>
    );

    if (!mode.cta.showPrimary) {
      return <BottomActionSingle>{selectDayButton}</BottomActionSingle>;
    }

    return (
      <BottomActionSplit
        secondary={selectDayButton}
        primary={mode.cta.primaryLabel === "Resume Session" ? (
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
  }, [inProgressSessionId, mode.cta.primaryLabel, mode.cta.secondaryLabel, mode.cta.showPrimary, mode.dayPickerOpen, selectedDayIndex, togglePicker]);

  usePublishBottomActions(actionsNode);

  return (
    <div className="flex min-h-0 flex-col">
      {!mode.noRoutine && selectedDay ? (
        <ScreenScaffold recipe="todayOverview" className="mx-auto w-full max-w-md pb-3">
          <SharedScreenHeader
            recipe="todayOverview"
            eyebrow="Today"
            title={routineName}
            subtitle={selectedDay.name}
            meta={selectedDaySummary ? <span className="whitespace-nowrap">{selectedDaySummary}</span> : undefined}
            action={inSessionDayIndex === selectedDay.dayIndex
              ? <AppBadge tone="success">In Session</AppBadge>
              : completedDayIndexSet.has(selectedDay.dayIndex)
                ? <AppBadge tone="success">Completed</AppBadge>
                : undefined}
          />

          <SharedSectionShell recipe="todayOverview" bodyClassName="space-y-2.5">
            {mode.dayPickerOpen ? (
              <DayList>
                {days.map((day) => {
                  const isSelected = selectedDayIndex === day.dayIndex;
                  return (
                    <DayCard
                      key={day.id}
                      title={`Day ${day.dayIndex} | ${day.name}`}
                      subtitle={day.state === "runnable" || day.state === "partial" ? getExerciseCountSummaryFromInputs(day.exercises).label : (day.state === "rest" ? REST_DAY_CARD_COPY : getTodayDaySummary(day)) ?? undefined}
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
            ) : null}

            {mode.summaryVisible && daySummary ? (
              <div
                className={[
                  "rounded-md px-3 py-1.5",
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

            {mode.dayRowsVisible ? <ul className="space-y-1.5">
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
                <li className="px-3 py-3">
                  <SubtitleText>No exercises yet.</SubtitleText>
                </li>
              ) : null}
            </ul> : null}
          </SharedSectionShell>
        </ScreenScaffold>
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
