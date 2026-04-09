"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import {
  DayCard,
  DayList,
  formatLoggedSetCount,
  resolveDayCardBadgeText,
  resolveDayCardState,
} from "@/components/day-list/DayList";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { BottomActionSingle, BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { AccentSubtitleText } from "@/components/ui/text-roles";
import { DayTaxonomyHeaderSummary } from "@/components/day-list/DayTaxonomyHeaderSummary";
import { getRestDayExerciseCountSummaryFromInputs } from "@/lib/day-summary";
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
  days,
  currentDayIndex,
  inProgressSessionId,
  completedDayIndexes,
  inSessionDayIndex,
  loggedSetCountsByDayIndex,
  routineName,
  floatingHeaderSlotId,
}: {
  days: TodayDay[];
  currentDayIndex: number;
  inProgressSessionId?: string | null;
  completedDayIndexes?: number[];
  inSessionDayIndex?: number | null;
  loggedSetCountsByDayIndex?: Record<number, number>;
  routineName: string;
  floatingHeaderSlotId?: string;
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
    const syncSlot = () => setFloatingHeaderTarget(document.getElementById(floatingHeaderSlotId));
    syncSlot();
    const observer = new MutationObserver(syncSlot);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", syncSlot);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncSlot);
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


  const headerNode = selectedDay ? (
    <ScreenScaffold recipe="todayOverview" className="mx-auto w-full max-w-md">
      <SharedScreenHeader
        recipe="todayOverview"
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
    </ScreenScaffold>
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
        <ScreenScaffold recipe="todayOverview" className="mx-auto w-full max-w-md">
          {selectedDay.state !== "rest" && mode.contentShellVisible ? (
            <SharedSectionShell recipe="todayOverview" bodyClassName="space-y-2.5">
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

              {mode.summaryVisible && daySummaryTone && daySummary ? (
                <div
                  className={[
                    "rounded-md px-3 py-1.5",
                    daySummaryTone === "blocking"
                      ? "border border-[rgb(var(--accent-red)/0.34)] bg-[rgb(var(--accent-red)/0.12)] text-[rgb(var(--button-destructive-text))]"
                      : daySummaryTone === "warning"
                        ? "border border-[rgb(var(--accent-yellow-on)/0.28)] bg-[rgb(var(--accent-yellow-off)/0.12)] text-[rgb(var(--accent-yellow-on))]"
                        : "border border-border/70 bg-[rgb(var(--bg)/0.35)] text-muted",
                  ].join(" ")}
                >
                  <AccentSubtitleText className={daySummaryTone === "blocking" ? "text-[rgb(var(--button-destructive-text))]" : "text-[rgb(var(--accent-yellow-on))]"}>
                    {daySummary}
                  </AccentSubtitleText>
                </div>
              ) : null}

              {mode.dayRowsVisible && hasSelectedDayRows ? <ul className="space-y-1.5">
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
              </ul> : null}
            </SharedSectionShell>
          ) : null}
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
    </>
  );
}
