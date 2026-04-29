"use client";

import { Fragment } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import {
  DayCard,
  DayList,
  resolveDayCardState,
} from "@/components/day-list/DayList";
import {
  RoutinesCardList,
  RoutinesListItemCard,
  RoutinesListItem,
  RoutinesPageScaffold,
  RoutinesRouteHeaderCard,
  SharedDayListSection,
} from "@/components/routines/RoutinesScreenFamily";
import { SignatureDot, SignatureMetaTag } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { cn } from "@/lib/cn";
import { splitWeekdayDisplayLabel } from "@/lib/header-meta";
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

const ROUTINES_DAY_CARD_BODY_CLASS_NAME = "min-h-[4.3rem] py-2";
const ROUTINES_REST_DAY_CARD_BODY_CLASS_NAME = "min-h-[2.9rem] py-1";
const ROUTINES_DAY_CARD_CONTENT_CLASS_NAME = "py-0.5";
const ROUTINES_REST_DAY_CARD_CONTENT_CLASS_NAME = "py-0";
const ROUTINES_LIST_CARD_BODY_CLASS_NAME = "min-h-[3.85rem] py-2";
const ROUTINES_LIST_CARD_CONTENT_CLASS_NAME = "py-0.5";
const ROUTINES_DAY_CARD_SUBTITLE_CLASS_NAME = "text-[11.5px] leading-[1.22]";
const ROUTINES_DAY_CARD_TITLE_CLASS_NAME = "leading-[1.04]";
const ROUTINES_CONTENT_GAP_CLASS_NAME = "pt-2";
const ROUTINES_TAG_CLASS_NAME = "text-[8px] tracking-[0.12em]";
const ROUTINES_REST_DAY_CARD_CLASS_NAME = "border-[rgb(var(--accent-yellow-on)/0.26)] bg-[rgb(var(--accent-yellow-off)/0.1)] [&_[data-exercise-card-accent-rail='true']]:bg-[rgb(var(--accent-yellow-on)/0.96)]";

function formatRoutineCount(count: number) {
  return `${count} ${count === 1 ? "routine" : "routines"} total`;
}

function splitSummaryParts(value: string | null | undefined) {
  return String(value ?? "")
    .split(/\s*(?:\u00B7|\u2022|\|)\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function renderSignatureParts(parts: string[], className?: string) {
  if (parts.length === 0) {
    return undefined;
  }

  return (
    <span className={cn("inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 [text-wrap:pretty]", className)}>
      {parts.map((part, index) => (
        <Fragment key={`${part}-${index}`}>
          {index > 0 ? <SignatureDot /> : null}
          <span className="min-w-0">{part}</span>
        </Fragment>
      ))}
    </span>
  );
}

function buildRoutineSplitParts(summary: NonNullable<RoutineDayCardItem["splitSummary"]>) {
  const parts: string[] = [];

  if (summary.strength > 0) parts.push(`${summary.strength} strength`);
  if (summary.cardio > 0) parts.push(`${summary.cardio} cardio`);
  if (summary.bodyweight > 0) parts.push(`${summary.bodyweight} bodyweight`);
  if (summary.unknown > 0) parts.push(`${summary.unknown} other`);

  return parts;
}

function resolveRoutineDayTagLabel(day: Pick<RoutineDayCardItem, "isToday" | "isRest" | "isCompleted" | "isInSession">) {
  if (day.isInSession) {
    return "IN SESSION";
  }

  if (day.isToday) {
    return "TODAY";
  }

  if (day.isCompleted) {
    return "COMPLETED";
  }

  if (day.isRest) {
    return "REST DAY";
  }

  return undefined;
}

function renderRoutineTag(label: string | undefined) {
  const normalizedLabel = label?.trim().toUpperCase();
  if (!normalizedLabel) {
    return undefined;
  }

  const colorClassName = normalizedLabel === "REST DAY"
      ? "text-[rgb(var(--accent-yellow-on))]"
      : normalizedLabel === "TODAY"
        || normalizedLabel === "CURRENT"
        || normalizedLabel === "IN SESSION"
        || normalizedLabel === "COMPLETED"
        ? "text-[rgb(var(--accent)/0.96)]"
        : "text-[rgb(var(--text-secondary)/0.92)]";

  return <SignatureMetaTag className={cn(ROUTINES_TAG_CLASS_NAME, colorClassName)}>{normalizedLabel}</SignatureMetaTag>;
}

function renderRoutineDayTitle(args: {
  name: string | null | undefined;
  dayIndex: number;
  startDate: string | null | undefined;
}) {
  const displayName = formatRoutineDayDisplayName({
    name: args.name,
    dayIndex: args.dayIndex,
    startDate: args.startDate,
  });
  const dayParts = splitWeekdayDisplayLabel(displayName);

  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 [text-wrap:pretty]">
      <span className="text-[rgb(var(--accent)/0.96)]">{dayParts?.weekday ?? displayName}</span>
      {dayParts?.remainder ? (
        <>
          <SignatureDot />
          <span>{dayParts.remainder}</span>
        </>
      ) : null}
    </span>
  );
}

function renderRoutineDaySubtitle(day: RoutineDayCardItem) {
  if (day.isRest) {
    return undefined;
  }

  if (day.splitSummary) {
    return renderSignatureParts(buildRoutineSplitParts(day.splitSummary)) ?? "No exercises yet";
  }

  return renderSignatureParts(splitSummaryParts(day.exerciseSummary)) ?? day.exerciseSummary ?? "No exercises yet";
}

function renderRoutineHeaderSubtitle(summary: string | null | undefined) {
  const parts = splitSummaryParts(summary);
  return renderSignatureParts(parts, "justify-center text-center") ?? summary ?? undefined;
}

function renderRoutineListSubtitle(summary: string) {
  return renderSignatureParts(splitSummaryParts(summary)) ?? summary;
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
      {args.isCurrent ? renderRoutineTag("CURRENT") : null}
      <span aria-hidden="true" className={appTokens.metaText}>{"\u203A"}</span>
    </span>
  );
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

  const floatingHeaderTitle = screenMode === "browse-routines"
    ? "All Routines"
    : (activeRoutineName ?? "Routine Selection");
  const floatingHeaderSubtitle = screenMode === "browse-routines"
    ? (activeRoutineName ? `${activeRoutineName} active \u2022 ${allRoutinesMeta}` : allRoutinesMeta)
    : activeRoutineSummary;

  const floatingHeader = (
    <RoutinesRouteHeaderCard
      title={floatingHeaderTitle}
      subtitle={renderRoutineHeaderSubtitle(floatingHeaderSubtitle)}
    />
  );

  return (
    <RoutinesPageScaffold>
      {floatingHeaderSlot ? createPortal(floatingHeader, floatingHeaderSlot) : floatingHeader}

      {screenMode === "browse-routines" ? (
        <div id="routines-switch-list" aria-label={ROUTINES_IA_COPY.allRoutines.listAriaLabel} className={ROUTINES_CONTENT_GAP_CLASS_NAME}>
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
                      titleClassName={ROUTINES_DAY_CARD_TITLE_CLASS_NAME}
                      subtitleClassName={ROUTINES_DAY_CARD_SUBTITLE_CLASS_NAME}
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
          <div className={ROUTINES_CONTENT_GAP_CLASS_NAME}>
            {days.length > 0 ? (
              <DayList>
                {days.map((day) => (
                  <DayCard
                    key={day.id}
                    title={renderRoutineDayTitle({
                      name: day.name ?? day.title ?? null,
                      dayIndex: day.dayIndex,
                      startDate: activeRoutineStartDate,
                    })}
                    subtitle={renderRoutineDaySubtitle(day)}
                    subtitleTone="plain"
                    titleMeta={renderRoutineTag(resolveRoutineDayTagLabel(day))}
                    rightIcon={<span aria-hidden="true" className={appTokens.metaText}>{"\u203A"}</span>}
                    state={resolveDayCardState({
                      isToday: day.isToday,
                      isSelected: day.isToday,
                      isRest: day.isRest,
                      isCompleted: day.isCompleted,
                      isInSession: day.isInSession,
                    })}
                    className={day.isRest ? ROUTINES_REST_DAY_CARD_CLASS_NAME : undefined}
                    bodyClassName={day.isRest ? ROUTINES_REST_DAY_CARD_BODY_CLASS_NAME : ROUTINES_DAY_CARD_BODY_CLASS_NAME}
                    contentClassName={day.isRest ? ROUTINES_REST_DAY_CARD_CONTENT_CLASS_NAME : ROUTINES_DAY_CARD_CONTENT_CLASS_NAME}
                    titleClassName={ROUTINES_DAY_CARD_TITLE_CLASS_NAME}
                    subtitleClassName={ROUTINES_DAY_CARD_SUBTITLE_CLASS_NAME}
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
          </div>
        </SharedDayListSection>
      ) : null}
    </RoutinesPageScaffold>
  );
}
