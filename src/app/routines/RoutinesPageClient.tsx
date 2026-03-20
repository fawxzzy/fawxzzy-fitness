"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { AnchoredSelectorPanel } from "@/components/ui/app/AnchoredSelectorPanel";
import { BottomActionUtilityCluster } from "@/components/layout/CanonicalBottomActions";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
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
        <span>{isRoutineListOpen ? "Hide routines" : "Select routine"}</span>
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
    <div className="space-y-4">
      <AnchoredSelectorPanel
        title={activeRoutineName}
        subtitleRight={activeRoutineSummary}
        action={activeRoutineId ? <AppBadge>Active</AppBadge> : undefined}
        revealOpen={isRoutineListOpen}
        revealId="routines-switch-list"
        revealLabel="Routines"
        revealContent={(
          <>
            <Link
              href={newRoutineHref}
              className={getAppButtonClassName({ variant: "primary", size: "md", fullWidth: true })}
            >
              New Routine
            </Link>
            {routines.map((routine) => {
              const isCurrent = routine.id === activeRoutineId;
              return (
                <ExerciseCard
                  key={routine.id}
                  title={routine.name}
                  subtitle={routine.summary}
                  onPress={() => handleSwitchRoutine(routine.id)}
                  state={isCurrent ? "selected" : "default"}
                  badgeText={isCurrent ? "Active" : undefined}
                  rightIcon={isPending && isCurrent ? <span className="text-xs text-muted">Updating…</span> : undefined}
                />
              );
            })}
          </>
        )}
      />

      <AppPanel className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[rgb(var(--text)/0.98)]">Days</h2>
          <p className="text-sm text-[rgb(var(--text)/0.68)]">{days.length === 1 ? "1 day" : `${days.length} days`}</p>
        </div>
        {days.length > 0 ? (
          <ul className="space-y-2">
            {days.map((day) => {
              const subtitleParts = [
                day.exerciseSummary,
                day.notes?.trim() || null,
              ].filter(Boolean);

              return (
                <li key={day.id}>
                  <Link href={day.href} className="block">
                    <ExerciseCard
                      title={`Day ${day.dayIndex} | ${day.title}`}
                      subtitle={subtitleParts.join(" • ")}
                      badgeText={day.isToday ? "Today" : day.isRest ? "Rest" : undefined}
                      rightIcon={<span aria-hidden="true" className="text-muted">›</span>}
                      state={day.isToday ? "selected" : day.isRest ? "empty" : "default"}
                      className="items-center"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-1 text-sm text-muted">No days yet.</p>
        )}
      </AppPanel>
    </div>
  );
}
