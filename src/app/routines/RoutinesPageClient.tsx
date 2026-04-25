"use client";

import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import {
  DayCard,
  DayList,
  REST_DAY_CARD_COPY,
  resolveDayCardBadgeText,
  resolveDayCardState,
} from "@/components/day-list/DayList";
import {
  RoutinesCardList,
  RoutinesListItem,
  RoutinesPageScaffold,
  RoutinesRouteHeaderCard,
  SharedDayListSection,
} from "@/components/routines/RoutinesScreenFamily";
import { appTokens } from "@/components/ui/app/tokens";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { formatExerciseSplitSummary } from "@/lib/day-summary";
import { formatRoutineDayDisplayName } from "@/lib/routines";

export type RoutineSwitcherItem = {
  id: string;
  name: string;
  summary: string;
};

export type RoutineDayCardItem = {
  id: string;
  dayIndex: number;
  name?: string | null;
  title?: string;
  isRest: boolean;
  splitSummary?: {
    total: number;
    strength: number;
    cardio: number;
    bodyweight: number;
    unknown: number;
  };
  exerciseSummary?: string;
  notes?: string | null;
  href: string;
  isToday: boolean;
  isCompleted: boolean;
  isInSession: boolean;
  loggedSetCount?: number;
};

const ROUTINES_IA_COPY = {
  allRoutines: {
    listAriaLabel: "All routines list",
  },
  selectedRoutine: {
    empty: "No routine days yet.",
  },
} as const;

function formatRoutineCount(count: number) {
  return `${count} ${count === 1 ? "routine" : "routines"} total`;
}

export function RoutinesPageClient({
  activeRoutineId,
  activeRoutineName,
  activeRoutineSummary,
  activeRoutineStartDate,
  activeRoutineEditHref,
  newRoutineHref,
  routines,
  days,
  setActiveRoutineAction,
  initialRoutineListOpen = false,
}: {
  activeRoutineId: string | null;
  activeRoutineName: string | null;
  activeRoutineSummary: string | null;
  activeRoutineStartDate?: string | null;
  activeRoutineEditHref: string | null;
  newRoutineHref: string;
  routines: RoutineSwitcherItem[];
  days: RoutineDayCardItem[];
  setActiveRoutineAction: (formData: FormData) => Promise<void>;
  initialRoutineListOpen?: boolean;
}) {
  const router = useRouter();
  const [isRoutineListOpen, setIsRoutineListOpen] = useState(initialRoutineListOpen);
  const [isPending, startTransition] = useTransition();
  const [floatingHeaderSlot, setFloatingHeaderSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setFloatingHeaderSlot(document.getElementById("routines-floating-header"));
  }, []);

  const handleToggleRoutineList = useCallback(() => {
    setIsRoutineListOpen((previous) => !previous);
  }, []);

  const handleSwitchRoutine = useCallback((routineId: string) => {
    if (isPending || routineId === activeRoutineId) {
      setIsRoutineListOpen(false);
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("routineId", routineId);
      await setActiveRoutineAction(formData);
      setIsRoutineListOpen(false);
    });
  }, [activeRoutineId, isPending, setActiveRoutineAction]);

  const screenMode = isRoutineListOpen
    ? "browse-routines"
    : activeRoutineId
      ? "selected-routine-days"
      : "summary";
  const allRoutinesMeta = formatRoutineCount(routines.length);

  const actionsNode = useMemo(() => {
    const toggleButton = (
      <BottomDockButton
        type="button"
        intent={isRoutineListOpen ? "toggleActive" : "toggleInactive"}
        onClick={handleToggleRoutineList}
        aria-expanded={isRoutineListOpen}
        aria-controls="routines-switch-list"
      >
        <span>{isRoutineListOpen ? "Hide" : "Routines"}</span>
      </BottomDockButton>
    );

    const editRoutineAction = activeRoutineEditHref ? (
      <BottomDockLink href={activeRoutineEditHref} intent="positive">
        Edit
      </BottomDockLink>
    ) : (
      <div aria-hidden="true" />
    );

    if (isRoutineListOpen) {
      return (
        <BottomActionSplit
          secondary={toggleButton}
          primary={(
            <BottomDockLink href={newRoutineHref} intent="positive">
              New
            </BottomDockLink>
          )}
        />
      );
    }

    return <BottomActionSplit secondary={toggleButton} primary={editRoutineAction} />;
  }, [activeRoutineEditHref, handleToggleRoutineList, isRoutineListOpen, newRoutineHref]);

  usePublishBottomActions(actionsNode);

  const floatingHeader = (
    <RoutinesRouteHeaderCard
      title={screenMode === "browse-routines" ? "All Routines" : (activeRoutineName ?? "Routine Selection")}
      subtitle={screenMode === "browse-routines" ? allRoutinesMeta : activeRoutineSummary}
    />
  );

  return (
    <RoutinesPageScaffold>
      {floatingHeaderSlot ? createPortal(floatingHeader, floatingHeaderSlot) : floatingHeader}

      {screenMode === "browse-routines" ? (
        <div id="routines-switch-list" aria-label={ROUTINES_IA_COPY.allRoutines.listAriaLabel}>
          <RoutinesCardList>
            {routines.map((routine) => {
              const isCurrent = routine.id === activeRoutineId;
              return (
                <RoutinesListItem key={routine.id}>
                  <StandardExerciseRow
                    exercise={{ name: routine.name }}
                    summary={routine.summary}
                    variant="standard"
                    density="compact"
                    onPress={() => handleSwitchRoutine(routine.id)}
                    showLeadingVisual={false}
                    state={isCurrent ? "selected" : "default"}
                    badgeText={isCurrent ? "ACTIVE" : undefined}
                    rightIcon={isPending && isCurrent ? <span className={appTokens.routinesOverviewPendingText}>Updating...</span> : undefined}
                    className={appTokens.routinesOverviewCardFlat}
                  />
                </RoutinesListItem>
              );
            })}
          </RoutinesCardList>
        </div>
      ) : null}

      {screenMode === "selected-routine-days" ? (
        <SharedDayListSection>
          {days.length > 0 ? (
            <DayList>
              {days.map((day) => (
                <DayCard
                  key={day.id}
                  title={formatRoutineDayDisplayName({
                    name: day.name ?? day.title ?? null,
                    dayIndex: day.dayIndex,
                    startDate: activeRoutineStartDate,
                  })}
                  subtitle={day.isRest
                    ? REST_DAY_CARD_COPY
                    : day.splitSummary
                      ? formatExerciseSplitSummary(day.splitSummary)
                      : (day.exerciseSummary ?? "No exercises yet")}
                  subtitleTone="plain"
                  badgeText={resolveDayCardBadgeText({
                    isToday: day.isToday,
                    isRest: day.isRest,
                    isCompleted: day.isCompleted,
                    isInSession: day.isInSession,
                  })}
                  rightIcon={<span aria-hidden="true" className={appTokens.metaText}>›</span>}
                  state={resolveDayCardState({
                    isToday: day.isToday,
                    isSelected: day.isToday,
                    isRest: day.isRest,
                    isCompleted: day.isCompleted,
                    isInSession: day.isInSession,
                  })}
                  onPress={() => router.push(day.href)}
                />
              ))}
            </DayList>
          ) : (
            <EmptyState
              title="No routine days"
              body={ROUTINES_IA_COPY.selectedRoutine.empty}
              action={(
                <Link href={newRoutineHref} className={getAppButtonClassName({ variant: "secondary", fullWidth: true })}>
                  Create a routine
                </Link>
              )}
              className={appTokens.routinesOverviewEmptyState}
            />
          )}
        </SharedDayListSection>
      ) : null}
    </RoutinesPageScaffold>
  );
}
