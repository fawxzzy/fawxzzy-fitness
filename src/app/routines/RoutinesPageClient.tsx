"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { getBottomActionButtonClassName } from "@/components/layout/bottomActionIntents";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { RoutineBrowseCard, type RoutineBrowseCardItem } from "@/components/routines/RoutineBrowseCard";
import { CreateRoutineClient } from "@/app/routines/CreateRoutineClient";
import { AttachedCardActionStripFrame, getAttachedCardActionButtonClassName } from "@/components/session/SessionExerciseBlock";
import { ChevronDownIcon } from "@/components/ui/Chevrons";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
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
const ROUTINE_BROWSE_DELETE_PILL_CLASS_NAME = cn(
  getBottomActionButtonClassName({
    intent: "danger",
    fullWidth: false,
    className: "!h-6 !min-h-0 rounded-full !px-4 text-[12px] font-semibold tracking-[0.04em]",
  }),
  "!rounded-tl-[0.5rem] !rounded-tr-none !rounded-bl-none !rounded-br-none",
  "!border-[rgb(var(--danger-rgb)/0.98)] !bg-[linear-gradient(180deg,rgb(var(--danger-rgb)/0.98),rgb(132_31_31/0.98))] !text-[rgb(255_245_245)] shadow-[0_2px_10px_rgb(var(--danger-rgb)/0.16)]",
);

export function RoutinesPageClient({
  routines,
  newRoutineHref,
  workoutPlansHref = "/routines/workout-plans",
  draftRoutineName,
  duplicateRoutineAction,
  setActiveRoutineAction,
  deleteRoutineAction,
}: {
  routines: RoutineBrowseCardItem[];
  newRoutineHref?: string;
  workoutPlansHref?: string;
  draftRoutineName?: string | null;
  duplicateRoutineAction?: Parameters<typeof CreateRoutineClient>[0]["duplicateRoutineAction"];
  setActiveRoutineAction?: (formData: FormData) => Promise<ActionResult>;
  deleteRoutineAction?: (payload: { routineId: string }) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isCreateRoutineOpen, setIsCreateRoutineOpen] = useState(false);
  const [expandedInactiveRoutineId, setExpandedInactiveRoutineId] = useState<string | null>(null);
  const [routinePendingDelete, setRoutinePendingDelete] = useState<RoutineBrowseCardItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const canOpenInlineCreate = Boolean(duplicateRoutineAction);
  const activeRoutines = routines.filter((routine) => routine.isActive);
  const inactiveRoutines = routines.filter((routine) => !routine.isActive);

  useEffect(() => {
    if (!canOpenInlineCreate) {
      return;
    }

    router.prefetch(newRoutineHref ?? "/routines/new");
  }, [canOpenInlineCreate, newRoutineHref, router]);

  useEffect(() => {
    if (!workoutPlansHref) {
      return;
    }

    router.prefetch(workoutPlansHref);
  }, [router, workoutPlansHref]);

  useEffect(() => {
    const routineHrefs = routines
      .map((routine) => routine.href?.trim())
      .filter((href): href is string => Boolean(href));

    if (routineHrefs.length === 0) {
      return;
    }

    for (const href of routineHrefs) {
      router.prefetch(href);
    }
  }, [router, routines]);

  const actionsNode = useMemo(() => (
    <BottomActionSplit
      secondary={(
        <BottomDockLink href={workoutPlansHref} intent="toggleInactive">
          Workout Plans
        </BottomDockLink>
      )}
      primary={canOpenInlineCreate ? (
        <BottomDockButton type="button" intent="positive" onClick={() => setIsCreateRoutineOpen(true)}>
          New Routine
        </BottomDockButton>
      ) : (
        <BottomDockLink href={newRoutineHref ?? "/routines/new"} intent="positive">
          New Routine
        </BottomDockLink>
      )}
    />
  ), [canOpenInlineCreate, newRoutineHref, workoutPlansHref]);

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
                      <div className="relative min-w-0 pt-[0.72rem] sm:pt-0">
                        <div className="pointer-events-none absolute left-[8px] top-0 z-[4] sm:top-px">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setRoutinePendingDelete(routine);
                            }}
                            disabled={isPending || !deleteRoutineAction}
                            aria-label={`Delete ${routine.name}`}
                            data-bottom-action-intent="danger"
                            className={cn(
                              ROUTINE_BROWSE_DELETE_PILL_CLASS_NAME,
                              "pointer-events-auto",
                              (isPending || !deleteRoutineAction) ? "opacity-75" : undefined,
                            )}
                          >
                            <span className="bottom-action__label">Delete</span>
                          </button>
                        </div>
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
                      </div>
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
      <ConfirmDestructiveModal
        open={routinePendingDelete !== null}
        title="Confirm Delete"
        confirmLabel="Delete"
        titleVariant="raw"
        isLoading={isPending}
        onCancel={() => {
          if (!isPending) {
            setRoutinePendingDelete(null);
          }
        }}
        onConfirm={() => {
          if (!deleteRoutineAction || !routinePendingDelete) {
            return;
          }

          startTransition(async () => {
            const routineId = routinePendingDelete.id;
            const result = await deleteRoutineAction({ routineId });
            if (!result.ok) {
              toast.error(result.error ?? "Failed to delete routine.");
              return;
            }

            setRoutinePendingDelete(null);
            setExpandedInactiveRoutineId((current) => current === routineId ? null : current);
            toast.success("Routine deleted.");
            router.refresh();
          });
        }}
      />
      {isCreateRoutineOpen && duplicateRoutineAction ? (
        <CreateRoutineClient
          backHref="/routines"
          routines={routines}
          draftRoutineName={draftRoutineName}
          duplicateRoutineAction={duplicateRoutineAction}
          onRequestClose={() => setIsCreateRoutineOpen(false)}
        />
      ) : null}
    </RoutinesPageScaffold>
  );
}
