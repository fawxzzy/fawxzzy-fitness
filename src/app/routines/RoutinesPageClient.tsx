"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import {
  ActiveRoutineSummaryCard,
  ActiveRoutineStatusBadge,
  RoutinesCardList,
  RoutinesListEmpty,
  RoutinesListItem,
  RoutinesListItemCard,
  RoutinesPageScaffold,
  RoutinesSectionCard,
  SharedDayListSection,
} from "@/components/routines/RoutinesScreenFamily";
import {
  DayCard,
  DayList,
  formatLoggedSetCount,
  resolveDayCardBadgeText,
  resolveDayCardState,
  REST_DAY_CARD_COPY,
} from "@/components/day-list/DayList";
import { SecondaryButton } from "@/components/ui/AppButton";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";

export type RoutineSwitcherItem = {
  id: string;
  name: string;
  summary: string;
};

export type RoutineDayCardItem = {
  id: string;
  dayIndex: number;
  title: string;
  isRest: boolean;
  exerciseSummary: string;
  notes: string | null;
  href: string;
  isToday: boolean;
  isCompleted: boolean;
  isInSession: boolean;
  loggedSetCount: number;
};

const ROUTINES_IA_COPY = {
  currentRoutine: {
    title: "Current routine",
  },
  routineDays: {
    title: "Routine days",
    empty: "No routine days yet.",
  },
  allRoutines: {
    title: "All routines",
    listAriaLabel: "All routines list",
    duplicateRuleHint: "Includes your current routine for quick switching.",
  },
} as const;

function formatRoutineCount(count: number) {
  return `${count} ${count === 1 ? "routine" : "routines"} total`;
}

function formatRoutineDayCount(count: number) {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

export function RoutinesPageClient({
  activeRoutineId,
  activeRoutineName,
  activeRoutineSummary,
  activeRoutineEditHref,
  newRoutineHref,
  routines,
  days,
  setActiveRoutineAction,
  initialRoutineListOpen = false,
}: {
  activeRoutineId: string | null;
  activeRoutineName: string;
  activeRoutineSummary?: string;
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

  const actionsNode = useMemo(() => {
    const toggleButton = (
      <SecondaryButton
        type="button"
        className="w-full min-h-[44px] justify-center border-white/14 bg-transparent text-center text-[rgb(var(--text)/0.78)] shadow-none hover:bg-white/[0.05]"
        onClick={handleToggleRoutineList}
        aria-expanded={isRoutineListOpen}
        aria-controls="routines-switch-list"
      >
        <span>{isRoutineListOpen ? "Hide All Routines" : "View All Routines"}</span>
      </SecondaryButton>
    );

    const editRoutineAction = activeRoutineEditHref ? (
      <Link
        href={activeRoutineEditHref}
        className={getAppButtonClassName({ variant: "secondary", size: "md", fullWidth: true })}
      >
        Edit Routine
      </Link>
    ) : (
      <div aria-hidden="true" />
    );

    if (isRoutineListOpen) {
      return (
        <BottomActionSplit
          secondary={toggleButton}
          primary={(
            <Link
              href={newRoutineHref}
              className={getAppButtonClassName({ variant: "primary", size: "md", fullWidth: true })}
            >
              New Routine
            </Link>
          )}
        />
      );
    }

    return (
      <BottomActionSplit
        secondary={toggleButton}
        primary={editRoutineAction}
      />
    );
  }, [activeRoutineEditHref, handleToggleRoutineList, isRoutineListOpen, newRoutineHref]);

  usePublishBottomActions(actionsNode);

  return (
    <RoutinesPageScaffold
      summary={(
        <ActiveRoutineSummaryCard
          title={ROUTINES_IA_COPY.currentRoutine.title}
          subtitle={activeRoutineSummary}
          status={<ActiveRoutineStatusBadge active={Boolean(activeRoutineId)} />}
        >
          <p className="text-sm font-medium text-[rgb(var(--text)/0.92)]">{activeRoutineName}</p>
        </ActiveRoutineSummaryCard>
      )}
    >
      {isRoutineListOpen ? (
        <RoutinesSectionCard
          title={ROUTINES_IA_COPY.allRoutines.title}
          meta={`${formatRoutineCount(routines.length)} • ${ROUTINES_IA_COPY.allRoutines.duplicateRuleHint}`}
        >
          <div id="routines-switch-list" aria-label={ROUTINES_IA_COPY.allRoutines.listAriaLabel}>
            <RoutinesCardList>
              {routines.map((routine) => {
                const isCurrent = routine.id === activeRoutineId;
                return (
                  <RoutinesListItem key={routine.id}>
                    <RoutinesListItemCard
                      title={routine.name}
                      subtitle={routine.summary}
                      onPress={() => handleSwitchRoutine(routine.id)}
                      state={isCurrent ? "selected" : "default"}
                      badgeText={isCurrent ? "ACTIVE" : undefined}
                      rightIcon={isPending && isCurrent ? <span className="text-xs text-muted">Updating…</span> : undefined}
                    />
                  </RoutinesListItem>
                );
              })}
            </RoutinesCardList>
          </div>
        </RoutinesSectionCard>
      ) : null}
      <SharedDayListSection title={ROUTINES_IA_COPY.routineDays.title} meta={formatRoutineDayCount(days.length)}>
          {days.length > 0 ? (
            <DayList>
              {days.map((day) => {
                const subtitleParts = [
                  day.exerciseSummary,
                  day.notes?.trim() || null,
                ].filter(Boolean);

                return (
                  <DayCard
                    key={day.id}
                    title={`Day ${day.dayIndex} | ${day.title}`}
                    subtitle={(day.isRest ? [REST_DAY_CARD_COPY, day.notes?.trim() || null] : subtitleParts).filter(Boolean).join(" • ")}
                    badgeText={resolveDayCardBadgeText({
                      isToday: day.isToday,
                      isRest: day.isRest,
                      isCompleted: day.isCompleted,
                      isInSession: day.isInSession,
                    })}
                    metaText={formatLoggedSetCount(day.loggedSetCount)}
                    rightIcon={<span aria-hidden="true" className="text-muted">›</span>}
                    state={resolveDayCardState({
                      isToday: day.isToday,
                      isSelected: day.isToday,
                      isRest: day.isRest,
                      isCompleted: day.isCompleted,
                      isInSession: day.isInSession,
                    })}
                    onPress={() => router.push(day.href)}
                  />
                );
              })}
            </DayList>
          ) : (
            <RoutinesListEmpty>{ROUTINES_IA_COPY.routineDays.empty}</RoutinesListEmpty>
          )}
        </SharedDayListSection>
    </RoutinesPageScaffold>
  );
}
