"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ACTION_CHROME_CONTROL_CLASS_NAME,
} from "@/components/ui/actionChrome";
import { DayCard, DayList } from "@/components/day-list/DayList";
import {
  ROUTINE_DAY_CARD_BODY_CLASS_NAME,
  ROUTINE_DAY_CARD_CONTENT_CLASS_NAME,
  ROUTINE_DAY_CARD_TITLE_CLASS_NAME,
} from "@/components/day-list/RoutineDayCardPresentation";
import { appTokens } from "@/components/ui/app/tokens";
import { StateChevron } from "@/components/ui/StateChevron";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import {
  formatProgressionReviewTargetLabel,
  type ProgressionReviewApplyResult,
  type ProgressionReviewDisplayItem,
  type ProgressionReviewLinkedTargetSnapshot,
  type ProgressionReviewRevertTargetSnapshot,
} from "@/lib/progression-review-display";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";
import {
  buildProgressionAppliedPin,
  finalizeAppliedPinsForCurrentTargets,
  clearProgressionAppliedPinsForRoutineDay,
  getPendingProgressionAppliedPinsForRoutineDay,
  PROGRESSION_APPLIED_PINS_CHANGED_EVENT,
  getProgressionAppliedPinsStorageKey,
  mergeProgressionAppliedPinsWithItems,
  progressionAppliedPinTouchesRoutineDay,
  pruneExpiredProgressionAppliedPins,
  removeProgressionAppliedPin,
  type ProgressionAppliedPin,
  upsertProgressionAppliedPin,
} from "@/lib/progression-applied-pins";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";

type AppliedProgressionState = {
  previousTarget: ProgressionTargetPlan;
  appliedTarget: ProgressionTargetPlan;
  linkedTargets?: ProgressionReviewLinkedTargetSnapshot[];
  lifecycleState?: ProgressionAppliedPin["lifecycleState"];
};

function getDefaultLinkedSelection(item: ProgressionReviewDisplayItem) {
  return item.linkedUpdate?.targets.map((target) => target.routineDayExerciseId) ?? [];
}

function resolveTargetDisplayPair({
  item,
  applied,
}: {
  item: ProgressionReviewDisplayItem;
  applied: AppliedProgressionState | null;
}) {
  if (applied) {
    return {
      left: formatProgressionReviewTargetLabel(applied.previousTarget),
      right: formatProgressionReviewTargetLabel(applied.appliedTarget),
    };
  }

  return {
    left: item.summaryParts.currentTarget,
    right: item.summaryParts.proposedTarget,
  };
}

export function ProgressionReviewCard({
  items,
  routineId,
  applyAction,
  revertAction,
  expanded,
  onExpandedChange,
  routineDayIdScope,
  clearScopedPinsSignal = 0,
  onScopedPendingPinsChange,
}: {
  items: ProgressionReviewDisplayItem[];
  routineId: string;
  applyAction: (payload: {
    routineId: string;
    routineDayExerciseId: string;
    candidateType: ProgressionReviewDisplayItem["type"];
    linkedRoutineDayExerciseIds?: string[];
  }) => Promise<ActionResult<ProgressionReviewApplyResult>>;
  revertAction: (payload: {
    routineId: string;
    routineDayExerciseId: string;
    previousTarget: ProgressionTargetPlan;
    linkedPreviousTargets?: ProgressionReviewRevertTargetSnapshot[];
  }) => Promise<ActionResult>;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  routineDayIdScope?: string | null;
  clearScopedPinsSignal?: number;
  onScopedPendingPinsChange?: (hasPendingPins: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [appliedById, setAppliedById] = useState<Record<string, AppliedProgressionState>>({});
  const [appliedPins, setAppliedPins] = useState<ProgressionAppliedPin[]>([]);
  const [hasLoadedAppliedPins, setHasLoadedAppliedPins] = useState(false);
  const [revertSettlingById, setRevertSettlingById] = useState<Record<string, true>>({});
  const [selectedLinkedIdsByItemId, setSelectedLinkedIdsByItemId] = useState<Record<string, string[]>>({});
  const showDebugMetadata = false;
  const isExpanded = expanded ?? uncontrolledExpanded;
  const appliedPinsStorageKey = useMemo(() => getProgressionAppliedPinsStorageKey(routineId), [routineId]);

  const persistAppliedPins = useCallback((pins: ProgressionAppliedPin[]) => {
    if (typeof window === "undefined" || !hasLoadedAppliedPins) {
      return;
    }

    const nextPins = pruneExpiredProgressionAppliedPins(pins);
    if (nextPins.length === 0) {
      window.sessionStorage.removeItem(appliedPinsStorageKey);
      window.dispatchEvent(new CustomEvent(PROGRESSION_APPLIED_PINS_CHANGED_EVENT, {
        detail: { routineId, storageKey: appliedPinsStorageKey },
      }));
      return;
    }

    window.sessionStorage.setItem(appliedPinsStorageKey, JSON.stringify(nextPins));
    window.dispatchEvent(new CustomEvent(PROGRESSION_APPLIED_PINS_CHANGED_EVENT, {
      detail: { routineId, storageKey: appliedPinsStorageKey },
    }));
  }, [appliedPinsStorageKey, hasLoadedAppliedPins, routineId]);

  function setExpanded(nextExpanded: boolean) {
    if (expanded === undefined) {
      setUncontrolledExpanded(nextExpanded);
    }
    onExpandedChange?.(nextExpanded);
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      setHasLoadedAppliedPins(true);
      return;
    }

    try {
      const raw = window.sessionStorage.getItem(appliedPinsStorageKey);
      const parsed = raw ? JSON.parse(raw) as ProgressionAppliedPin[] : [];
      const pins = pruneExpiredProgressionAppliedPins(Array.isArray(parsed) ? parsed : []);
      setAppliedPins(pins);
      setAppliedById(Object.fromEntries(pins.map((pin) => [pin.routineDayExerciseId, {
        previousTarget: pin.previousTarget,
        appliedTarget: pin.appliedTarget,
        linkedTargets: pin.linkedTargets,
        lifecycleState: pin.lifecycleState,
      }])));
    } catch {
      setAppliedPins([]);
    } finally {
      setHasLoadedAppliedPins(true);
    }
  }, [appliedPinsStorageKey]);

  useEffect(() => {
    if (!hasLoadedAppliedPins || typeof window === "undefined") {
      return;
    }

    const pins = pruneExpiredProgressionAppliedPins(appliedPins);
    if (pins.length !== appliedPins.length) {
      setAppliedPins(pins);
      return;
    }

    if (pins.length === 0) {
      window.sessionStorage.removeItem(appliedPinsStorageKey);
      return;
    }

    window.sessionStorage.setItem(appliedPinsStorageKey, JSON.stringify(pins));
  }, [appliedPins, appliedPinsStorageKey, hasLoadedAppliedPins]);

  useEffect(() => {
    if (!hasLoadedAppliedPins || appliedPins.length === 0) {
      return;
    }

    setAppliedPins((current) => {
      const next = finalizeAppliedPinsForCurrentTargets({ pins: current, items });
      if (next.length === current.length) {
        return current;
      }

      persistAppliedPins(next);
      setAppliedById(Object.fromEntries(next.map((pin) => [pin.routineDayExerciseId, {
        previousTarget: pin.previousTarget,
        appliedTarget: pin.appliedTarget,
        linkedTargets: pin.linkedTargets,
        lifecycleState: pin.lifecycleState,
      }])));
      return next;
    });
  }, [appliedPins.length, hasLoadedAppliedPins, items, persistAppliedPins]);

  useEffect(() => {
    if (!hasLoadedAppliedPins || clearScopedPinsSignal <= 0 || !routineDayIdScope) {
      return;
    }

    setAppliedPins((current) => {
      const next = clearProgressionAppliedPinsForRoutineDay({
        pins: current,
        routineDayId: routineDayIdScope,
      });
      persistAppliedPins(next);
      setAppliedById(Object.fromEntries(next.map((pin) => [pin.routineDayExerciseId, {
        previousTarget: pin.previousTarget,
        appliedTarget: pin.appliedTarget,
        linkedTargets: pin.linkedTargets,
        lifecycleState: pin.lifecycleState,
      }])));
      return next;
    });
  }, [clearScopedPinsSignal, hasLoadedAppliedPins, persistAppliedPins, routineDayIdScope]);

  function clearAppliedPin(id: string) {
    setAppliedPins((current) => {
      const next = removeProgressionAppliedPin(current, id);
      persistAppliedPins(next);
      return next;
    });
    setAppliedById((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setRevertSettlingById((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  const scopedAppliedPins = useMemo(() => {
    if (!routineDayIdScope) {
      return appliedPins;
    }

    return appliedPins.filter((pin) => progressionAppliedPinTouchesRoutineDay(pin, routineDayIdScope));
  }, [appliedPins, routineDayIdScope]);

  useEffect(() => {
    if (!hasLoadedAppliedPins || !routineDayIdScope) {
      onScopedPendingPinsChange?.(false);
      return;
    }

    onScopedPendingPinsChange?.(getPendingProgressionAppliedPinsForRoutineDay({
      pins: scopedAppliedPins,
      routineDayId: routineDayIdScope,
    }).length > 0);
  }, [hasLoadedAppliedPins, onScopedPendingPinsChange, routineDayIdScope, scopedAppliedPins]);

  const visibleItems = useMemo(
    () => mergeProgressionAppliedPinsWithItems({
      items: items.filter((item) => item.type !== "review" || !appliedById[item.id]),
      pins: scopedAppliedPins,
    }),
    [appliedById, scopedAppliedPins, items],
  );
  const groupedItems = useMemo(() => {
    const groups: Array<{
      id: string;
      dayName: string;
      items: ProgressionReviewDisplayItem[];
    }> = [];
    const groupIndexById = new Map<string, number>();

    for (const item of visibleItems) {
      const dayName = item.dayName?.trim() || "Routine day";
      const groupId = item.dayGroupId?.trim() || dayName;
      const existingIndex = groupIndexById.get(groupId);

      if (existingIndex === undefined) {
        groupIndexById.set(groupId, groups.length);
        groups.push({
          id: groupId,
          dayName,
          items: [item],
        });
        continue;
      }

      groups[existingIndex]?.items.push(item);
    }
    return groups.filter((group) => group.items.length > 0);
  }, [visibleItems]);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section
      data-progression-updates-card="true"
      className="flex flex-col"
      aria-label="Progression updates"
    >
      <div className="fixed inset-x-0 bottom-[calc(var(--app-mobile-bottom-dock-height,0px)-0.25rem)] z-30 mx-auto w-full max-w-[720px] px-1">
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity,transform] duration-200 ease-out",
            isExpanded
              ? "grid-rows-[1fr] translate-y-0 opacity-100 pb-2"
              : "grid-rows-[0fr] translate-y-2 opacity-0",
          )}
        >
          <div className="min-h-0 overflow-hidden px-1">
            <div
              className={cn(
                appTokens.exercisePickerFilterPanel,
                "max-h-[calc(100dvh-var(--app-mobile-bottom-dock-height,0px)-8.25rem)] overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              )}
            >
              {actionError ? (
                <p className="mb-2 rounded-[0.8rem] border border-[rgb(var(--warning-rgb)/0.22)] bg-[rgb(var(--warning-rgb)/0.08)] px-3 py-2 text-[12px] font-semibold text-[rgb(var(--warning-rgb)/0.96)]">
                  {actionError}
                </p>
              ) : null}

              <DayList>
                {groupedItems.map((group) => (
                  <DayCard
                    key={group.id}
                    title={(
                      <span className={group.dayName.trim().toLowerCase() === "rest" ? "text-[rgb(var(--accent-yellow-on))]" : "text-[rgb(var(--accent-divider-rgb)/0.96)]"}>
                        {group.dayName}
                      </span>
                    )}
                    subtitle={undefined}
                    state={group.dayName.trim().toLowerCase() === "rest" ? "rest" : "default"}
                    bodyClassName={ROUTINE_DAY_CARD_BODY_CLASS_NAME}
                    contentClassName={ROUTINE_DAY_CARD_CONTENT_CLASS_NAME}
                    titleClassName={ROUTINE_DAY_CARD_TITLE_CLASS_NAME}
                    subtitleTone="plain"
                    rightIcon={null}
                    showAccentRail
                  >
                    {group.items.length > 0 ? (
                      <div className="mt-2 space-y-1.5">
                        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent-divider-rgb)/0.9)]">
                          Ready Updates
                        </p>
                        <ul className="space-y-1.5">
                      {group.items.map((item) => {
                        const applied = appliedById[item.id] ?? null;
                        const isStaleSourceDeleted = applied?.lifecycleState === "stale_source_deleted";
                        const isRevertSettling = Boolean(revertSettlingById[item.id]);
                        const canApply = item.type === "promote" || item.type === "deload";
                        const isItemPending = isPending && pendingItemId === item.id;
                        const targetDisplay = resolveTargetDisplayPair({ item, applied });
                        const linkedTargets = item.linkedUpdate?.targets ?? [];
                        const selectedLinkedIds = linkedTargets.length > 1
                          ? (selectedLinkedIdsByItemId[item.id] ?? getDefaultLinkedSelection(item))
                          : [];
                        const selectedLinkedTargets = linkedTargets.filter((target) => selectedLinkedIds.includes(target.routineDayExerciseId));
                        const canApplyLinkedSelection = linkedTargets.length <= 1 || selectedLinkedIds.length > 0;
                        const linkedActionLabel = linkedTargets.length > 1 ? "Promote selected" : item.actionLabel;
                        const itemForAction = item.linkedUpdate && linkedTargets.length > 1 ? {
                          ...item,
                          linkedUpdate: {
                            ...item.linkedUpdate,
                            count: selectedLinkedTargets.length,
                            dayNames: selectedLinkedTargets.map((target) => target.dayName),
                            routineDayExerciseIds: selectedLinkedTargets.map((target) => target.routineDayExerciseId),
                            targets: selectedLinkedTargets,
                          },
                        } satisfies ProgressionReviewDisplayItem : item;

                        return (
                          <li
                            key={item.id}
                            className="rounded-[1rem] border border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface-2-rgb)/0.32)] px-3 py-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 space-y-1.5">
                                <div className="min-w-0 space-y-0.5">
                                <p className="min-w-0 text-[13px] font-semibold leading-tight text-[rgb(var(--text)/0.94)]">
                                  <span>{item.summaryParts.exerciseName}</span>
                                  {item.linkedUpdate && item.linkedUpdate.dayNames.length > 1 ? (
                                    <span className="text-[rgb(var(--accent-divider-rgb)/0.9)]">
                                      {" · "}
                                      {item.linkedUpdate.dayNames.join(" + ")}
                                    </span>
                                  ) : null}
                                </p>
                                  <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12.5px] font-semibold leading-tight text-[rgb(var(--text-secondary)/0.94)]">
                                  {targetDisplay.left && targetDisplay.right ? (
                                    <>
                                      <span>{targetDisplay.left}</span>
                                      <span className="inline-flex min-w-4 items-center justify-center text-[12px] font-bold text-[rgb(var(--accent-divider-rgb)/0.95)]">
                                        {applied ? "←" : "→"}
                                      </span>
                                      <span>{targetDisplay.right}</span>
                                    </>
                                  ) : (
                                    <span>{item.summaryParts.fallback}</span>
                                  )}
                                  </p>
                                </div>
                                <p className={cn(appTokens.metaText, "text-[12px] leading-snug")}>{item.reason}</p>
                                {isStaleSourceDeleted ? (
                                  <p className="text-[11px] font-semibold leading-snug text-[rgb(var(--warning-rgb)/0.94)]">
                                    Source session was removed. Recheck this update.
                                  </p>
                                ) : null}
                                {item.linkedUpdate && item.linkedUpdate.dayNames.length > 1 ? (
                                  <p className="text-[11px] font-semibold leading-snug text-[rgb(var(--accent-divider-rgb)/0.86)]">
                                    Linked ready update across {item.linkedUpdate.dayNames.join(" + ")}. Promote applies to selected days.
                                  </p>
                                ) : null}
                                {!applied && linkedTargets.length > 1 ? (
                                  <div className="mt-1.5 rounded-[0.75rem] border border-[rgb(var(--border-strong)/0.10)] bg-[rgb(var(--surface-2-rgb)/0.16)] p-1.5">
                                    <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted)/0.76)]">
                                      Apply to
                                    </p>
                                    <div className="grid gap-1">
                                      {linkedTargets.map((target) => {
                                        const checked = selectedLinkedIds.includes(target.routineDayExerciseId);
                                        return (
                                          <label
                                            key={target.routineDayExerciseId}
                                            className="flex items-center gap-2 rounded-[0.65rem] px-1.5 py-1 text-[11.5px] font-semibold text-[rgb(var(--text)/0.88)]"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={checked}
                                              onChange={(event) => {
                                                const nextChecked = event.currentTarget.checked;
                                                setSelectedLinkedIdsByItemId((current) => {
                                                  const currentIds = current[item.id] ?? getDefaultLinkedSelection(item);
                                                  const nextIds = nextChecked
                                                    ? Array.from(new Set([...currentIds, target.routineDayExerciseId]))
                                                    : currentIds.filter((id) => id !== target.routineDayExerciseId);
                                                  return {
                                                    ...current,
                                                    [item.id]: nextIds,
                                                  };
                                                });
                                              }}
                                              className="h-3.5 w-3.5 accent-[rgb(var(--accent-divider-rgb))]"
                                            />
                                            <span>{target.dayName}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : null}
                                {item.evidence ? (
                                  <div className={cn(appTokens.metaText, "space-y-0.5 text-[11.5px] leading-snug")}>
                                    <p>{item.evidence.usedLine}</p>
                                    <p>{item.evidence.needsLine}</p>
                                    <p>{item.evidence.resultLine}</p>
                                  </div>
                                ) : null}
                                {showDebugMetadata && item.debug ? (
                                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-muted)/0.72)]">
                                    Debug: {item.debug.historySource.replaceAll("_", " ")} • {item.debug.historySetCount} sets • {item.debug.historySessionCount} sessions • {item.debug.candidateType}
                                  </p>
                                ) : null}
                              </div>
                              {applied ? (
                                <div className="flex shrink-0 flex-col gap-1.5">
                                  {isStaleSourceDeleted ? (
                                    <button
                                      type="button"
                                      disabled={isPending || isRevertSettling}
                                      onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        clearAppliedPin(item.id);
                                      }}
                                      className="rounded-full border border-[rgb(var(--accent-strong)/0.32)] bg-[rgb(var(--accent-strong)/0.10)] px-3 py-1.5 text-[11px] font-semibold text-[rgb(var(--accent-strong)/0.94)]"
                                    >
                                      Keep target
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    disabled={isPending || isRevertSettling}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      setActionError(null);
                                      setPendingItemId(item.id);
                                      startTransition(async () => {
                                        const result = await revertAction({
                                          routineId,
                                          routineDayExerciseId: item.id,
                                          previousTarget: applied.previousTarget,
                                          linkedPreviousTargets: applied.linkedTargets?.map((target) => ({
                                            routineDayExerciseId: target.routineDayExerciseId,
                                            previousTarget: target.previousTarget,
                                          })),
                                        });
                                        if (result.ok) {
                                          clearAppliedPin(item.id);
                                          if (pathname !== "/routines") {
                                            router.refresh();
                                          }
                                        } else {
                                          setActionError(result.error);
                                        }
                                        setPendingItemId(null);
                                      });
                                    }}
                                    className="rounded-full border border-[rgb(var(--warning-rgb)/0.28)] bg-[rgb(var(--warning-rgb)/0.10)] px-3 py-1.5 text-[11px] font-semibold text-[rgb(var(--warning-rgb)/0.94)]"
                                  >
                                    {isItemPending || isRevertSettling ? "Reverting..." : "Revert"}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isPending || !canApply || !canApplyLinkedSelection}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    if (!canApply || !canApplyLinkedSelection) {
                                      return;
                                    }

                                    setActionError(null);
                                    setPendingItemId(item.id);
                                    startTransition(async () => {
                                      const result = await applyAction({
                                        routineId,
                                        routineDayExerciseId: item.id,
                                        candidateType: item.type,
                                        linkedRoutineDayExerciseIds: linkedTargets.length > 1 ? selectedLinkedIds : item.linkedUpdate?.routineDayExerciseIds,
                                      });
                                      if (result.ok && result.data) {
                                        const appliedTarget = result.data;
                                        const pin = buildProgressionAppliedPin({
                                          item: itemForAction,
                                          previousTarget: appliedTarget.previousTarget,
                                          appliedTarget: appliedTarget.appliedTarget,
                                          linkedTargets: appliedTarget.linkedTargets,
                                        });
                                        setAppliedById((current) => ({
                                          ...current,
                                          [item.id]: {
                                            ...appliedTarget,
                                            linkedTargets: appliedTarget.linkedTargets,
                                            lifecycleState: "pending_revert",
                                          },
                                        }));
                                        setAppliedPins((current) => {
                                          const next = upsertProgressionAppliedPin(current, pin);
                                          persistAppliedPins(next);
                                          return next;
                                        });
                                      } else if (!result.ok) {
                                        setActionError(result.error);
                                      }
                                      setPendingItemId(null);
                                    });
                                  }}
                                  className={cn(
                                    ACTION_CHROME_CONTROL_CLASS_NAME,
                                    "shrink-0 rounded-full px-3.5 py-2 text-[11px] font-semibold",
                                    canApply && canApplyLinkedSelection
                                      ? "border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] text-[rgb(var(--text-primary))] shadow-[var(--action-chrome-shadow-hover)]"
                                      : "border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.14)] text-[rgb(var(--text-muted)/0.76)]",
                                  )}
                                  data-action-chrome-intent={canApply && canApplyLinkedSelection ? "positive" : "neutral"}
                                >
                                  {isItemPending && canApply ? "Applying..." : linkedActionLabel}
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                        </ul>
                      </div>
                    ) : null}

                  </DayCard>
                ))}
              </DayList>
            </div>
          </div>
        </div>
        <button
          type="button"
          className={cn(
            "group relative block w-full select-none appearance-none !border-0 !bg-[rgba(var(--bg-app),0.82)] px-1 pt-3 pb-2 text-center caret-transparent shadow-none backdrop-blur-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]",
            appTokens.routineEditorInlineTitle,
          )}
          onClick={() => setExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <span className="grid min-h-[2rem] grid-cols-[2rem_minmax(0,1fr)_2rem] items-end px-4 pb-3">
            <span aria-hidden="true" />
            <span className="min-w-0 w-full text-center">
              <span className="block text-[0.82rem] font-semibold leading-tight text-[rgb(var(--text-primary)/0.98)]">Progression Updates</span>
            </span>
            <span className={cn(
              "flex items-center justify-end transition-colors group-hover:text-[rgb(var(--text-secondary)/0.96)]",
              isExpanded ? "text-[rgb(var(--accent-divider-rgb)/0.98)]" : "text-[rgb(var(--text-muted)/0.84)]",
            )}>
              <StateChevron expanded={isExpanded} className="h-4 w-4" />
            </span>
          </span>
          <MetricAccentBar variant="thin" className="opacity-85 transition-opacity group-hover:opacity-100" />
        </button>
      </div>
    </section>
  );
}
