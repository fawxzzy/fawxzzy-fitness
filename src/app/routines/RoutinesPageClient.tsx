"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { RoutineBrowseCard, type RoutineBrowseCardItem } from "@/components/routines/RoutineBrowseCard";
import { CreateRoutineClient } from "@/app/routines/CreateRoutineClient";
import { AttachedCardActionStripFrame, getAttachedCardActionButtonClassName } from "@/components/session/SessionExerciseBlock";
import { ChevronDownIcon } from "@/components/ui/Chevrons";
import { EmptyState } from "@/components/ui/EmptyState";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { useToast } from "@/components/ui/ToastProvider";
import {
  RoutinesCardList,
  RoutinesListItem,
  RoutinesPageScaffold,
  SharedDayListSection,
} from "@/components/routines/RoutinesScreenFamily";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";

const INACTIVE_ROUTINE_CARD_CLASS_NAME = "border-[rgb(var(--warning-rgb)/0.24)] bg-[linear-gradient(180deg,rgb(var(--warning-rgb)/0.12),rgb(var(--surface-1-rgb)/0.96))] ring-1 ring-[rgb(var(--warning-rgb)/0.08)]";
const INACTIVE_ROUTINE_SET_ACTIVE_BUTTON_CLASS_NAME = getAttachedCardActionButtonClassName({
  intent: "toggleActive",
  className: "!border-r !border-r-[rgb(var(--secondary-action-rgb)/0.18)] focus-visible:ring-[rgb(var(--secondary-action-rgb)/0.22)]",
});
const INACTIVE_ROUTINE_EDIT_BUTTON_CLASS_NAME = getAttachedCardActionButtonClassName({
  intent: "positive",
  className: "translate-x-px focus-visible:ring-[rgb(var(--accent)/0.24)]",
});

export function RoutinesPageClient({
  routines,
  newRoutineHref,
  duplicateRoutineAction,
  setActiveRoutineAction,
}: {
  routines: RoutineBrowseCardItem[];
  newRoutineHref?: string;
  duplicateRoutineAction?: Parameters<typeof CreateRoutineClient>[0]["duplicateRoutineAction"];
  setActiveRoutineAction?: (formData: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isCreateRoutineOpen, setIsCreateRoutineOpen] = useState(false);
  const [expandedInactiveRoutineId, setExpandedInactiveRoutineId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canOpenInlineCreate = Boolean(duplicateRoutineAction);
  const activeRoutines = routines.filter((routine) => routine.isActive);
  const inactiveRoutines = routines.filter((routine) => !routine.isActive);

  useEffect(() => {
    if (!canOpenInlineCreate) {
      return;
    }

    router.prefetch("/routines/new?mode=blank");
  }, [canOpenInlineCreate, router]);

  const actionsNode = useMemo(() => (
    <BottomActionSingle>
      {canOpenInlineCreate ? (
        <BottomDockButton type="button" intent="positive" onClick={() => setIsCreateRoutineOpen(true)}>
          New Routine
        </BottomDockButton>
      ) : (
        <BottomDockLink href={newRoutineHref ?? "/routines/new"} intent="positive">
          New Routine
        </BottomDockLink>
      )}
    </BottomActionSingle>
  ), [canOpenInlineCreate, newRoutineHref]);

  usePublishBottomActions(actionsNode);

  return (
    <RoutinesPageScaffold>
      <SharedDayListSection>
        {routines.length === 0 ? (
          <EmptyState
            title="No routines yet"
            body="Create a routine to unify Today, session tracking, and history around the same training plan."
            action={canOpenInlineCreate
              ? (
                <button
                  type="button"
                  onClick={() => setIsCreateRoutineOpen(true)}
                  className={getAppButtonClassName({ variant: "primary", fullWidth: true })}
                >
                  Create your first routine
                </button>
              )
              : (
                <BottomDockLink
                  href={newRoutineHref ?? "/routines/new"}
                  intent="positive"
                  className={getAppButtonClassName({ variant: "primary", fullWidth: true })}
                >
                  Create your first routine
                </BottomDockLink>
              )}
          />
        ) : (
          <RoutinesCardList>
            {[...activeRoutines, ...inactiveRoutines].map((routine, index) => (
              <RoutinesListItem
                key={routine.id}
              >
                {index === activeRoutines.length && activeRoutines.length > 0 && inactiveRoutines.length > 0 ? (
                  <div className="px-2 pb-3 pt-1">
                    <MetricAccentBar variant="thin" className="w-full opacity-85" />
                  </div>
                ) : null}
                {(() => {
                  const routineHref = routine.href;
                  const isExpandedInactiveRoutine = !routine.isActive && expandedInactiveRoutineId === routine.id;

                  return (
                    <div className="min-w-0">
                      <RoutineBrowseCard
                        routine={routine}
                        onPress={routine.isActive
                          ? (routineHref ? () => router.push(routineHref) : undefined)
                          : () => {
                            setExpandedInactiveRoutineId((current) => current === routine.id ? null : routine.id);
                          }}
                        state={routine.isActive || isExpandedInactiveRoutine ? "selected" : "default"}
                        semanticTone={routine.isActive ? "current" : "attention"}
                        rightIcon={isExpandedInactiveRoutine
                          ? <ChevronDownIcon className="h-5 w-5 text-[rgb(var(--accent-divider-rgb)/0.98)]" />
                          : undefined}
                        className={routine.isActive
                          ? undefined
                          : cn(
                            INACTIVE_ROUTINE_CARD_CLASS_NAME,
                            isExpandedInactiveRoutine ? "!rounded-bl-none !rounded-br-none" : undefined,
                          )}
                        showPreviewDays={Boolean(routine.isActive)}
                      />
                      {isExpandedInactiveRoutine ? (
                        <AttachedCardActionStripFrame className="rounded-t-none" gridClassName="grid-cols-[minmax(112px,0.92fr)_minmax(0,1.78fr)]">
                          <button
                            type="button"
                            data-bottom-action-intent="toggleActive"
                            disabled={isPending || !setActiveRoutineAction}
                            onClick={() => {
                              if (!setActiveRoutineAction) {
                                return;
                              }

                              startTransition(async () => {
                                const formData = new FormData();
                                formData.set("routineId", routine.id);
                                const result = await setActiveRoutineAction(formData);
                                if (!result.ok) {
                                  toast.error(result.error ?? "Could not set active routine.");
                                  return;
                                }

                                setExpandedInactiveRoutineId(null);
                                toast.success("Routine is now active");
                                router.refresh();
                              });
                            }}
                            className={INACTIVE_ROUTINE_SET_ACTIVE_BUTTON_CLASS_NAME}
                          >
                            <span className="bottom-action__label">{isPending ? "Saving..." : "Set Active"}</span>
                          </button>
                          <button
                            type="button"
                            data-bottom-action-intent="positive"
                            onClick={() => {
                              setExpandedInactiveRoutineId(null);
                              if (routineHref) {
                                router.push(routineHref);
                              }
                            }}
                            className={INACTIVE_ROUTINE_EDIT_BUTTON_CLASS_NAME}
                          >
                            <span className="bottom-action__label">Edit</span>
                          </button>
                        </AttachedCardActionStripFrame>
                      ) : null}
                    </div>
                  );
                })()}
              </RoutinesListItem>
            ))}
          </RoutinesCardList>
        )}
      </SharedDayListSection>
      {isCreateRoutineOpen && duplicateRoutineAction ? (
        <CreateRoutineClient
          backHref="/routines"
          routines={routines}
          duplicateRoutineAction={duplicateRoutineAction}
          onRequestClose={() => setIsCreateRoutineOpen(false)}
        />
      ) : null}
    </RoutinesPageScaffold>
  );
}
