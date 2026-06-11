"use client";

import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { AttachedCardActionStripFrame, getAttachedCardActionButtonClassName } from "@/components/session/SessionExerciseBlock";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { useToast } from "@/components/ui/ToastProvider";
import {
  DayList,
} from "@/components/day-list/DayList";
import { updateRoutineDaySettingsAction } from "@/app/routines/[id]/edit/day/actions";
import {
  ROUTINE_CONTENT_GAP_CLASS_NAME,
  ROUTINE_DAY_CARD_BODY_CLASS_NAME,
  ROUTINE_DAY_CARD_CONTENT_CLASS_NAME,
  ROUTINE_DAY_CARD_SUBTITLE_CLASS_NAME,
  ROUTINE_DAY_CARD_TITLE_CLASS_NAME,
  ROUTINE_REST_DAY_CARD_BODY_CLASS_NAME,
  ROUTINE_REST_DAY_CARD_CLASS_NAME,
  RoutineOverviewDayCard,
  renderRoutineTag,
  renderSignatureParts,
  splitRoutineSummaryParts,
} from "@/components/day-list/RoutineDayCardPresentation";
import {
  RoutinesCardList,
  RoutinesListItemCard,
  RoutinesListItem,
  RoutinesPageScaffold,
  RoutinesRouteHeaderCard,
  SharedDayListSection,
} from "@/components/routines/RoutinesScreenFamily";
import { HeaderInfoRail } from "@/components/ui/HeaderInfoRail";
import { appTokens } from "@/components/ui/app/tokens";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { cn } from "@/lib/cn";
import { REST_DAY_BEHAVIOR_CONTRACT } from "@/features/day-state/restDayBehavior";
import {
  buildCurrentRoutineInfoRailItems,
} from "@/lib/header-info-rail";
import type { SetFlowDirection } from "@/lib/set-flow-directions";

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
  isSkipped?: boolean;
  isInSession: boolean;
  loggedSetCount?: number;
  dayAdjustmentDirection?: SetFlowDirection | null;
};

const ROUTINES_IA_COPY = {
  allRoutines: {
    listAriaLabel: "All routines list",
  },
  selectedRoutine: {
    empty: "No routine days yet.",
  },
} as const;

const ROUTINES_LIST_CARD_BODY_CLASS_NAME = "min-h-[2.85rem] py-1";
const ROUTINES_LIST_CARD_CONTENT_CLASS_NAME = "py-0";
const ROUTINE_HOME_TOGGLE_ACTION_BUTTON_CLASS_NAME = getAttachedCardActionButtonClassName({
  intent: "toggleInactive",
  className: "!border-r !border-r-[rgb(var(--secondary-action-rgb)/0.18)]",
});
const ROUTINE_HOME_RESTING_ACTION_BUTTON_CLASS_NAME = getAttachedCardActionButtonClassName({
  intent: "toggleActive",
  className: "!border-r !border-r-[rgb(var(--secondary-action-rgb)/0.18)]",
});
const ROUTINE_HOME_EDIT_ACTION_BUTTON_CLASS_NAME = getAttachedCardActionButtonClassName({
  intent: "positive",
  className: "translate-x-px !border-l-0 focus-visible:ring-[rgb(var(--accent)/0.24)]",
});

function renderRoutineHeaderSubtitle(summary: string | null | undefined) {
  const parts = splitRoutineSummaryParts(summary);
  return renderSignatureParts(parts, "justify-center text-center") ?? summary ?? undefined;
}
function renderRoutineListSubtitle(summary: string) {
  return renderSignatureParts(splitRoutineSummaryParts(summary)) ?? summary;
}

function renderRoutineListRightRail(args: {
  isCurrent: boolean;
  isPending: boolean;
}) {
  if (args.isPending && args.isCurrent) {
    return <span className={appTokens.routinesOverviewPendingText}>Updating...</span>;
  }

  return (
    <span className="inline-flex items-center gap-3">
      {args.isCurrent ? renderRoutineTag("SELECTED") : null}
      <span aria-hidden="true" className={appTokens.metaText}>{"\u203A"}</span>
    </span>
  );
}

function resolveRoutineHomeEditDayHref(routineId: string, dayId: string) {
  return `/routines/${routineId}/edit/day/${dayId}`;
}

export function RoutinesPageClient({
  activeRoutineId,
  activeRoutineName,
  activeRoutineSummary,
  activeRoutineTrainingDays,
  activeRoutineRestDays,
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
  activeRoutineTrainingDays?: number | null;
  activeRoutineRestDays?: number | null;
  activeRoutineStartDate?: string | null;
  activeRoutineEditHref: string | null;
  newRoutineHref: string;
  routines: RoutineSwitcherItem[];
  days: RoutineDayCardItem[];
  setActiveRoutineAction: (formData: FormData) => Promise<void>;
  initialRoutineListOpen?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isRoutineListOpen, setIsRoutineListOpen] = useState(initialRoutineListOpen);
  const [isPending, startTransition] = useTransition();
  const [isRestTogglePending, startRestToggleTransition] = useTransition();
  const [floatingHeaderSlot, setFloatingHeaderSlot] = useState<HTMLElement | null>(null);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [restOverrideByDayId, setRestOverrideByDayId] = useState<Record<string, boolean>>({});
  const [restTogglePendingDayId, setRestTogglePendingDayId] = useState<string | null>(null);

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

  const handleToggleDayExpansion = useCallback((dayId: string) => {
    setExpandedDayId((current) => (current === dayId ? null : dayId));
  }, []);

  const handleToggleDayRest = useCallback((day: RoutineDayCardItem, currentIsRest: boolean) => {
    if (!activeRoutineId || isRestTogglePending) {
      return;
    }

    const nextIsRest = !currentIsRest;
    const previousOverride = restOverrideByDayId[day.id];
    const dayName = String(day.name ?? day.title ?? day.dayIndex).trim();

    setRestOverrideByDayId((current) => ({
      ...current,
      [day.id]: nextIsRest,
    }));
    setRestTogglePendingDayId(day.id);

    startRestToggleTransition(async () => {
      const formData = new FormData();
      formData.set("routineId", activeRoutineId);
      formData.set("routineDayId", day.id);
      formData.set("name", dayName);
      if (nextIsRest) {
        formData.set("isRest", "on");
      }

      const result = await updateRoutineDaySettingsAction(formData);
      if (!result.ok) {
        setRestOverrideByDayId((current) => {
          const next = { ...current };
          if (previousOverride === undefined) {
            delete next[day.id];
          } else {
            next[day.id] = previousOverride;
          }
          return next;
        });
        toast.error(result.error ?? "Could not update rest day status.");
        setRestTogglePendingDayId(null);
        return;
      }

      toast.info(nextIsRest ? REST_DAY_BEHAVIOR_CONTRACT.copy.enabled : REST_DAY_BEHAVIOR_CONTRACT.copy.disabled, {
        id: "day-rest-toggle-status",
        durationMs: 2600,
      });
      setRestTogglePendingDayId(null);
      router.refresh();
    });
  }, [activeRoutineId, isRestTogglePending, restOverrideByDayId, router, toast]);

  const screenMode = isRoutineListOpen
    ? "browse-routines"
    : activeRoutineId
      ? "selected-routine-days"
      : "summary";

  const actionsNode = useMemo(() => {
    const toggleButton = (
      <BottomDockButton
        type="button"
        intent="toggleActive"
        onClick={handleToggleRoutineList}
        aria-expanded={isRoutineListOpen}
        aria-controls="routines-switch-list"
      >
        <span>{isRoutineListOpen ? "Hide" : "Routines"}</span>
      </BottomDockButton>
    );

    const editRoutineAction = activeRoutineEditHref ? (
      <BottomDockLink href={activeRoutineEditHref} intent="positive">
        Edit Routine
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
              New Routine
            </BottomDockLink>
          )}
        />
      );
    }

    return <BottomActionSplit secondary={toggleButton} primary={editRoutineAction} />;
  }, [activeRoutineEditHref, handleToggleRoutineList, isRoutineListOpen, newRoutineHref]);

  usePublishBottomActions(actionsNode);

  const floatingHeaderTitle = screenMode === "browse-routines"
    ? "All Routines"
    : (activeRoutineName ?? "Routine Selection");
  const floatingHeaderInfoItems = screenMode === "browse-routines"
    ? []
    : activeRoutineTrainingDays === null || activeRoutineTrainingDays === undefined || activeRoutineRestDays === null || activeRoutineRestDays === undefined
      ? []
      : buildCurrentRoutineInfoRailItems({
          trainingDays: activeRoutineTrainingDays,
          restDays: activeRoutineRestDays,
          days,
        });

  const floatingHeader = (
    <RoutinesRouteHeaderCard
      title={floatingHeaderTitle}
      subtitle={screenMode === "browse-routines"
        ? undefined
        : floatingHeaderInfoItems.length > 0 ? (
            <HeaderInfoRail
              items={floatingHeaderInfoItems}
              ariaLabel="Routine cycle summary"
              behavior="rotate-single"
              className="justify-center text-center"
            />
          ) : renderRoutineHeaderSubtitle(activeRoutineSummary)}
    />
  );

  return (
    <RoutinesPageScaffold>
      {floatingHeaderSlot ? createPortal(floatingHeader, floatingHeaderSlot) : floatingHeader}

      {screenMode === "browse-routines" ? (
        <div id="routines-switch-list" aria-label={ROUTINES_IA_COPY.allRoutines.listAriaLabel} className={ROUTINE_CONTENT_GAP_CLASS_NAME}>
          <SharedDayListSection>
            <RoutinesCardList>
              {routines.map((routine) => {
                const isCurrent = routine.id === activeRoutineId;
                return (
                  <RoutinesListItem key={routine.id}>
                    <RoutinesListItemCard
                      title={routine.name}
                      subtitle={renderRoutineListSubtitle(routine.summary)}
                      subtitleTone="plain"
                      onPress={() => handleSwitchRoutine(routine.id)}
                      state={isCurrent ? "selected" : "default"}
                      rightIcon={renderRoutineListRightRail({ isCurrent, isPending })}
                      bodyClassName={ROUTINES_LIST_CARD_BODY_CLASS_NAME}
                      contentClassName={ROUTINES_LIST_CARD_CONTENT_CLASS_NAME}
                      titleClassName={ROUTINE_DAY_CARD_TITLE_CLASS_NAME}
                      subtitleClassName={ROUTINE_DAY_CARD_SUBTITLE_CLASS_NAME}
                      trailingStackClassName="flex items-center gap-3"
                    />
                  </RoutinesListItem>
                );
              })}
            </RoutinesCardList>
          </SharedDayListSection>
        </div>
      ) : null}

      {screenMode === "selected-routine-days" ? (
        <SharedDayListSection>
          <div className={ROUTINE_CONTENT_GAP_CLASS_NAME}>
            {days.length > 0 ? (
              <DayList className="space-y-[0.375rem] sm:space-y-[0.375rem]">
                {days.map((day) => {
                  const displayIsRest = restOverrideByDayId[day.id] ?? day.isRest;
                  const displayDay = { ...day, isRest: displayIsRest };
                  const isExpanded = expandedDayId === day.id;
                  const isThisTogglePending = restTogglePendingDayId === day.id && isRestTogglePending;
                  const editDayHref = activeRoutineId ? resolveRoutineHomeEditDayHref(activeRoutineId, day.id) : day.href;

                  return (
                    <RoutineOverviewDayCard
                      key={day.id}
                      day={displayDay}
                      startDate={activeRoutineStartDate}
                      isSelected={day.isToday}
                      isExpanded={isExpanded}
                      onPress={() => handleToggleDayExpansion(day.id)}
                      wrapper={(card) => (
                        <div className="min-w-0">
                          {card}
                          {isExpanded ? (
                            <AttachedCardActionStripFrame gridClassName={displayIsRest ? "grid-cols-1" : "grid-cols-[minmax(112px,0.92fr)_minmax(0,1.78fr)]"}>
                                <button
                                  type="button"
                                  data-bottom-action-intent={displayIsRest ? "toggleActive" : "toggleInactive"}
                                  onClick={() => handleToggleDayRest(day, displayIsRest)}
                                  disabled={!activeRoutineId || isThisTogglePending}
                                  aria-pressed={displayIsRest}
                                  className={displayIsRest
                                    ? getAttachedCardActionButtonClassName({ intent: "toggleActive" })
                                    : ROUTINE_HOME_TOGGLE_ACTION_BUTTON_CLASS_NAME}
                                >
                                  <span className={cn("bottom-action__label", isThisTogglePending ? "opacity-65" : undefined)}>
                                    {isThisTogglePending ? "Saving..." : displayIsRest ? "Set Training" : "Set Rest"}
                                  </span>
                                </button>
                                {!displayIsRest ? (
                                  <button
                                    type="button"
                                    data-bottom-action-intent="positive"
                                    onClick={() => router.push(editDayHref)}
                                    className={ROUTINE_HOME_EDIT_ACTION_BUTTON_CLASS_NAME}
                                  >
                                    <span className="bottom-action__label">Edit Day</span>
                                  </button>
                                ) : null}
                            </AttachedCardActionStripFrame>
                          ) : null}
                        </div>
                      )}
                    />
                  );
                })}
              </DayList>
            ) : (
              <EmptyState
                title="No routine days"
                body={ROUTINES_IA_COPY.selectedRoutine.empty}
                action={(
                  <Link href={newRoutineHref} className={getAppButtonClassName({ variant: "primary", fullWidth: true })}>
                    Create a routine
                  </Link>
                )}
                className={appTokens.routinesOverviewEmptyState}
              />
            )}
          </div>
        </SharedDayListSection>
      ) : null}
    </RoutinesPageScaffold>
  );
}
