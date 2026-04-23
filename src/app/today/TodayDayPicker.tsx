"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { TodayOverviewHeader, TodayOverviewScaffold } from "@/components/today/TodayScreenFamily";
import { WorkoutExerciseCardDetails } from "@/components/workout/WorkoutExerciseCardDetails";
import {
  DayCard,
  DayList,
  formatLoggedSetCount,
  REST_DAY_CARD_COPY,
  resolveDayCardBadgeText,
  resolveDayCardState,
} from "@/components/day-list/DayList";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { BottomActionSingle, BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { appTokens } from "@/components/ui/app/tokens";
import { DayTaxonomyHeaderSummary } from "@/components/day-list/DayTaxonomyHeaderSummary";
import { DayDetailStateCard } from "@/components/routines/day-detail/DayDetailStateCard";
import { getRestDayExerciseCountSummaryFromInputs } from "@/lib/day-summary";
import { cn } from "@/lib/cn";
import { ACTIVE_SESSION_EVENT, clearActiveSessionHint, readActiveSessionHint } from "@/lib/session-state-sync";
import { buildPlannedExerciseDetailMetrics } from "@/lib/workout-card-view-models";
import { applyWorkoutCardSurfacePolicy } from "@/lib/workout-card-surface-policy";
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
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
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
  days,
  currentDayIndex,
  inProgressSessionId,
  completedDayIndexes,
  inSessionDayIndex,
  loggedSetCountsByDayIndex,
  routineName,
  floatingHeaderSlotId,
  exerciseDensity = "compact",
}: {
  days: TodayDay[];
  currentDayIndex: number;
  inProgressSessionId?: string | null;
  completedDayIndexes?: number[];
  inSessionDayIndex?: number | null;
  loggedSetCountsByDayIndex?: Record<number, number>;
  routineName: string;
  floatingHeaderSlotId?: string;
  exerciseDensity?: "compact" | "detailed";
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


  const [floatingHeaderTarget, setFloatingHeaderTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!floatingHeaderSlotId) return;
    const syncSlot = () => {
      const nextTarget = document.getElementById(floatingHeaderSlotId);
      setFloatingHeaderTarget((current) => (current === nextTarget ? current : nextTarget));
    };

    syncSlot();
    const frameId = window.requestAnimationFrame(syncSlot);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [floatingHeaderSlotId]);

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
  const getDayExerciseSummaryLabel = useCallback((day: TodayDay) => (
    getRestDayExerciseCountSummaryFromInputs(day.exercises, day.state === "rest").label
  ), []);
  const resolveDayCardSubtitle = useCallback((day: TodayDay) => {
    const daySummary = getTodayDaySummary(day);
    if (day.state === "partial" || day.invalidExerciseCount > 0) {
      return daySummary || getDayExerciseSummaryLabel(day) || undefined;
    }

    return getDayExerciseSummaryLabel(day) || undefined;
  }, [getDayExerciseSummaryLabel]);
  const daySummary = selectedDay
    ? getTodayDaySummary(selectedDay)
    : null;
  const daySummaryTone = selectedDay ? getTodayDaySummaryTone(selectedDay) : null;
  const completedDayIndexSet = useMemo(() => new Set(completedDayIndexes ?? []), [completedDayIndexes]);
  const hasSelectedDayRows = Boolean(selectedDay && selectedDay.exercises.length > 0);
  const selectedDaySummaryToneClassName = daySummaryTone === "blocking"
    ? "border-[rgb(var(--accent-red)/0.34)] bg-[rgb(var(--accent-red)/0.12)] text-[rgb(var(--button-destructive-text))]"
    : "border-[rgb(var(--accent-yellow-on)/0.28)] bg-[rgb(var(--accent-yellow-off)/0.12)] text-[rgb(var(--accent-yellow-on))]";
  const selectedDayStateCard = useMemo(() => {
    if (!selectedDay || mode.dayPickerOpen) {
      return null;
    }

    if (selectedDay.state === "rest") {
      return (
        <DayDetailStateCard
          tone="rest"
          title="Rest day"
          body={REST_DAY_CARD_COPY}
        />
      );
    }

    if (selectedDay.state === "empty" && selectedDay.invalidExerciseCount === 0) {
      return (
        <DayDetailStateCard
          tone="neutral"
          title="No exercises planned"
          body="Add exercises to this day to start a workout."
        />
      );
    }

    return null;
  }, [mode.dayPickerOpen, selectedDay]);
  const selectedDaySummaryNode = useMemo(() => {
    if (selectedDayStateCard) {
      return selectedDayStateCard;
    }

    if (!mode.summaryVisible || !daySummary || !daySummaryTone) {
      return null;
    }

    return (
      <div className={cn(appTokens.detailStateCard, selectedDaySummaryToneClassName)}>
        <p className={cn(appTokens.detailBodyText, "font-medium")}>
          {daySummary}
        </p>
      </div>
    );
  }, [daySummary, daySummaryTone, mode.summaryVisible, selectedDayStateCard, selectedDaySummaryToneClassName]);
  const shouldCenterSelectedDayState = Boolean(!mode.dayPickerOpen && selectedDayStateCard && !hasSelectedDayRows);

  const headerNode = selectedDay ? (
    <TodayOverviewHeader
      title={routineName}
      subtitle={(
        <DayTaxonomyHeaderSummary
          dayName={selectedDay.name}
          summary={getRestDayExerciseCountSummaryFromInputs(selectedDay.exercises, selectedDay.isRest)}
          isRest={selectedDay.isRest}
        />
      )}
      action={inProgressSessionId
        ? <AppBadge tone="success">In Session</AppBadge>
        : completedDayIndexSet.has(selectedDay.dayIndex)
          ? <AppBadge tone="success">Completed</AppBadge>
          : undefined}
    />
  ) : null;

  const actionsNode = useMemo(() => {
    const selectDayButton = (
      <BottomDockButton
        id="today-day-picker"
        type="button"
        intent={mode.dayPickerOpen ? "toggleActive" : "toggleInactive"}
        onClick={togglePicker}
        aria-expanded={mode.dayPickerOpen}
        aria-controls="today-day-selector-list"
      >
        <span>{mode.cta.secondaryLabel}</span>
      </BottomDockButton>
    );

    if (!mode.cta.showPrimary) {
      return <BottomActionSingle>{selectDayButton}</BottomActionSingle>;
    }

    return (
      <BottomActionSplit
        secondary={selectDayButton}
        primary={mode.cta.primaryLabel === "Resume" ? (
          <TodayStartButton
            sessionId={inProgressSessionId ?? undefined}
            returnTo="/today"
            fullWidth
            className="w-full"
            label="Resume"
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
    <>
      {headerNode && floatingHeaderTarget ? createPortal(headerNode, floatingHeaderTarget) : null}
      <div className="flex min-h-0 flex-col">
        {!mode.noRoutine && selectedDay ? (
          <TodayOverviewScaffold>
            {mode.contentShellVisible ? (
              <div className="flex flex-col gap-[0.625rem]">
                {mode.dayPickerOpen ? (
                  <DayList>
                    {days.map((day) => {
                      const isSelected = selectedDayIndex === day.dayIndex;
                      return (
                        <DayCard
                          key={day.id}
                          title={`Day ${day.dayIndex} | ${day.name}`}
                          subtitle={resolveDayCardSubtitle(day)}
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

                {selectedDaySummaryNode ? (
                  <div className={shouldCenterSelectedDayState ? appTokens.todaySummaryCenteredShell : undefined}>
                    {selectedDaySummaryNode}
                  </div>
                ) : null}

                {mode.dayRowsVisible && hasSelectedDayRows ? (
                  <ul className="flex flex-col gap-[0.375rem]">
                    {selectedDay.exercises.map((exercise) => {
                      const detailedMetrics = buildPlannedExerciseDetailMetrics({
                        measurementType: exercise.measurement_type,
                        isCardio: exercise.isCardio,
                        kind: exercise.kind,
                        type: exercise.type,
                        equipment: exercise.equipment,
                        movementPattern: exercise.movement_pattern,
                        primaryMuscle: exercise.primary_muscle,
                        tags: exercise.tags,
                        categories: exercise.categories,
                        targetSetsMin: exercise.targetSetsMin,
                        targetSetsMax: exercise.targetSetsMax,
                      });
                      const { policy, chips, detailedMetrics: visibleDetailedMetrics } = applyWorkoutCardSurfacePolicy({
                        surface: "today",
                        density: exerciseDensity,
                        detailedMetrics,
                      });

                      return (
                        <li key={exercise.id}>
                          <StandardExerciseRow
                            exercise={exercise}
                            variant="interactive"
                            density={exerciseDensity}
                            summary={exercise.targets}
                            summaryLabel="Goal"
                            onPress={() => {
                              if (process.env.NODE_ENV === "development") {
                                console.debug("[ExerciseInfo:open] TodayDayPicker", { exerciseId: exercise.exerciseId, exercise });
                              }
                              setSelectedExerciseId(exercise.exerciseId);
                            }}
                            showLeadingVisual={policy.showMedia}
                          >
                            <WorkoutExerciseCardDetails
                              density={exerciseDensity}
                              chips={chips}
                              detailedMetrics={visibleDetailedMetrics}
                            />
                          </StandardExerciseRow>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </TodayOverviewScaffold>
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
    </>
  );
}
