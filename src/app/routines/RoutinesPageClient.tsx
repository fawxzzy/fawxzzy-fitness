"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { BottomActionUtilityCluster } from "@/components/layout/CanonicalBottomActions";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import {
  ActiveRoutineStatusBadge,
  ActiveRoutineSummaryCard,
  RoutinesCardList,
  RoutinesListEmpty,
  RoutinesListItem,
  RoutinesListItemCard,
  RoutinesPageScaffold,
  RoutinesSectionCard,
  SharedDayList,
  SharedDayListRow,
  SharedDayListSection,
} from "@/components/routines/RoutinesScreenFamily";
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
};

export function RoutinesPageClient({
  activeRoutineId,
  activeRoutineName,
  activeRoutineSummary,
  activeRoutineEditHref,
  newRoutineHref,
  routines,
  days,
  setActiveRoutineAction,
}: {
  activeRoutineId: string | null;
  activeRoutineName: string;
  activeRoutineSummary?: string;
  activeRoutineEditHref: string | null;
  newRoutineHref: string;
  routines: RoutineSwitcherItem[];
  days: RoutineDayCardItem[];
  setActiveRoutineAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [isRoutineListOpen, setIsRoutineListOpen] = useState(false);
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

  const actionsNode = useMemo(() => (
    <BottomActionUtilityCluster>
      <SecondaryButton
        type="button"
        className="w-full min-h-[44px] justify-center border-white/14 bg-transparent text-center text-[rgb(var(--text)/0.78)] shadow-none hover:bg-white/[0.05]"
        onClick={handleToggleRoutineList}
        aria-expanded={isRoutineListOpen}
        aria-controls="routines-switch-list"
      >
        <span>{isRoutineListOpen ? "Hide Routines" : "Select Routine"}</span>
      </SecondaryButton>
      {activeRoutineEditHref ? (
        <Link
          href={activeRoutineEditHref}
          className={getAppButtonClassName({ variant: "secondary", size: "md", fullWidth: true })}
        >
          Edit Routine
        </Link>
      ) : null}
    </BottomActionUtilityCluster>
  ), [activeRoutineEditHref, handleToggleRoutineList, isRoutineListOpen]);

  usePublishBottomActions(actionsNode);

  return (
    <RoutinesPageScaffold
      summary={(
        <ActiveRoutineSummaryCard
          title={activeRoutineName}
          subtitle={activeRoutineSummary}
          status={<ActiveRoutineStatusBadge active={Boolean(activeRoutineId)} />}
        />
      )}
    >
      {isRoutineListOpen ? (
        <RoutinesSectionCard
          title="Routines"
          meta={routines.length === 1 ? "1 routine" : `${routines.length} routines`}
          action={(
            <Link
              href={newRoutineHref}
              className={getAppButtonClassName({ variant: "primary", size: "sm" })}
            >
              New Routine
            </Link>
          )}
        >
          <div id="routines-switch-list" aria-label="Routines">
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
                      badgeText={isCurrent ? "Active" : undefined}
                      rightIcon={isPending && isCurrent ? <span className="text-xs text-muted">Updating…</span> : undefined}
                    />
                  </RoutinesListItem>
                );
              })}
            </RoutinesCardList>
          </div>
        </RoutinesSectionCard>
      ) : null}
      {!isRoutineListOpen ? (
        <SharedDayListSection meta={days.length === 1 ? "1 day" : `${days.length} days`}>
          {days.length > 0 ? (
            <SharedDayList>
              {days.map((day) => {
                const subtitleParts = [
                  day.exerciseSummary,
                  day.notes?.trim() || null,
                ].filter(Boolean);

                return (
                  <SharedDayListRow
                    key={day.id}
                    title={`Day ${day.dayIndex} | ${day.title}`}
                    subtitle={subtitleParts.join(" • ")}
                    badgeText={day.isToday ? "Today" : day.isRest ? "Rest" : undefined}
                    rightIcon={<span aria-hidden="true" className="text-muted">›</span>}
                    state={day.isToday ? "selected" : day.isRest ? "empty" : "default"}
                    onPress={() => router.push(day.href)}
                  />
                );
              })}
            </SharedDayList>
          ) : (
            <RoutinesListEmpty>No days yet.</RoutinesListEmpty>
          )}
        </SharedDayListSection>
      ) : null}
    </RoutinesPageScaffold>
  );
}
