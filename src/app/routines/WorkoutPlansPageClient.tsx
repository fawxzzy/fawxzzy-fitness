"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { RoutineOverviewDayCard } from "@/components/day-list/RoutineDayCardPresentation";
import { RoutinesCardList, RoutinesListItem, RoutinesPageScaffold, SharedDayListSection } from "@/components/routines/RoutinesScreenFamily";
import { CardActionRow, CardEmptyState, CardIconButton, closeCardActionsOnEscape } from "@/components/ui/card-system";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useToast } from "@/components/ui/ToastProvider";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import type { ActionResult } from "@/lib/action-result";
import type { WorkoutPlanSourceListItem } from "@/lib/workout-plan-source-list";
import { getLibraryDayTitle, withPlainProgressionLabels } from "@/app/routines/routine-copy";

type WorkoutPlanLibraryCardItem = WorkoutPlanSourceListItem & {
  href?: string | null;
};

export function WorkoutPlansPageClient({
  workoutPlans,
  routinesHref = "/routines",
  newWorkoutPlanHref,
  deleteWorkoutPlanSourceAction,
}: {
  workoutPlans: WorkoutPlanLibraryCardItem[];
  routinesHref?: string;
  newWorkoutPlanHref?: string | null;
  deleteWorkoutPlanSourceAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [planPendingDelete, setPlanPendingDelete] = useState<WorkoutPlanLibraryCardItem | null>(null);
  const [expandedActionsPlanId, setExpandedActionsPlanId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const actionsNode = useMemo(() => (
    // One action: the bottom tab bar already goes to Routines, so the dock no longer repeats it (DESIGN.md #2).
    <BottomActionSingle>
      {newWorkoutPlanHref ? (
        <BottomDockLink href={newWorkoutPlanHref} intent="positive">
          New Day
        </BottomDockLink>
      ) : (
        <BottomDockButton type="button" intent="positive" disabled>
          New Day
        </BottomDockButton>
      )}
    </BottomActionSingle>
  ), [newWorkoutPlanHref]);

  usePublishBottomActions(actionsNode);

  useEffect(() => {
    if (newWorkoutPlanHref) {
      router.prefetch(newWorkoutPlanHref);
    }
    if (routinesHref) {
      router.prefetch(routinesHref);
    }
  }, [newWorkoutPlanHref, routinesHref, router]);

  return (
    <RoutinesPageScaffold>
      <SharedDayListSection>
        {workoutPlans.length === 0 ? (
          <CardEmptyState
            title="No days yet"
            body={newWorkoutPlanHref
              ? "Create a day without drilling into a routine first."
              : "Create a routine first, then build days from that routine."}
            action={newWorkoutPlanHref ? (
              <BottomDockLink
                href={newWorkoutPlanHref}
                // The dock already holds the screen's one primary (New Day); the empty-state copy of it is secondary.
                intent="toggleInactive"
                className={getAppButtonClassName({ variant: "secondary", fullWidth: true })}
              >
                New Day
              </BottomDockLink>
            ) : (
              <BottomDockLink
                href={routinesHref}
                // Sits beside the dock's disabled New Day primary, so it stays secondary too.
                intent="toggleInactive"
                className={getAppButtonClassName({ variant: "secondary", fullWidth: true })}
              >
                Open Routines
              </BottomDockLink>
            )}
          />
        ) : (
          <RoutinesCardList>
            {workoutPlans.map((plan) => {
              const planHref = plan.href ?? null;
              // F-020: never a bare "Day"; unnamed days read "Day N · Routine".
              const planTitle = getLibraryDayTitle({ title: plan.title, dayIndex: plan.dayIndex, sourceRoutineName: plan.sourceRoutineName });
              const actionsOpen = expandedActionsPlanId === plan.id;
              const actionsId = `workout-plan-actions-${plan.id}`;
              const closeActions = () => setExpandedActionsPlanId(null);

              return (
                <RoutinesListItem key={plan.id}>
                  <div onKeyDown={(event) => closeCardActionsOnEscape(event, actionsOpen, closeActions)}>
                  <RoutineOverviewDayCard
                    day={{
                      dayIndex: plan.dayIndex,
                      title: planTitle,
                      occurrenceWeekday: null,
                      isRest: plan.isRest,
                      splitSummary: plan.splitSummary,
                      recapExercises: withPlainProgressionLabels(plan.recapExercises),
                      isToday: false,
                      isCompleted: false,
                      isSkipped: false,
                      isInSession: false,
                    }}
                    allowWeekdayFallback={false}
                    showPosition={false}
                    showRecap
                    recapMaxVisible={3}
                    headingLevel={2}
                    onPress={planHref ? () => router.push(planHref) : undefined}
                    trailing={(
                      <CardIconButton
                        label={`Actions for ${planTitle}`}
                        aria-expanded={actionsOpen}
                        aria-controls={actionsId}
                        onClick={() => setExpandedActionsPlanId((current) => current === plan.id ? null : plan.id)}
                      >
                        <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5">
                          {[4.5, 10, 15.5].map((cx) => <circle key={cx} cx={cx} cy="10" r="1.6" fill="currentColor" />)}
                        </svg>
                      </CardIconButton>
                    )}
                    footer={actionsOpen ? (
                      <div id={actionsId}>
                        <CardActionRow
                          label={`Actions for ${planTitle}`}
                          actions={[{
                            key: "delete",
                            label: "Delete",
                            ariaLabel: `Delete ${planTitle}`,
                            intent: "danger",
                            disabled: isPending,
                            onPress: () => setPlanPendingDelete(plan),
                          }]}
                        />
                      </div>
                    ) : <span id={actionsId} hidden />}
                  />
                  </div>
                </RoutinesListItem>
              );
            })}
          </RoutinesCardList>
        )}
      </SharedDayListSection>

      <ConfirmDestructiveModal
        open={planPendingDelete !== null}
        title="Delete day?"
        objectName={planPendingDelete ? getLibraryDayTitle({ title: planPendingDelete.title, dayIndex: planPendingDelete.dayIndex, sourceRoutineName: planPendingDelete.sourceRoutineName }) : undefined}
        consequenceText="This removes the day, and every copy of it, from the routines that use it."
        confirmLabel="Delete day"
        isLoading={isPending}
        onCancel={() => {
          if (!isPending) {
            setPlanPendingDelete(null);
          }
        }}
        onConfirm={() => {
          if (!planPendingDelete) {
            return;
          }

          startTransition(async () => {
            const formData = new FormData();
            if (planPendingDelete.workoutPlanTemplateId) {
              formData.set("workoutPlanTemplateId", planPendingDelete.workoutPlanTemplateId);
            }
            if (planPendingDelete.sourceRoutineDayId) {
              formData.set("sourceRoutineDayId", planPendingDelete.sourceRoutineDayId);
            }

            const result = await deleteWorkoutPlanSourceAction(formData);
            if (!result.ok) {
              toast.error(result.error ?? "Could not delete day.");
              return;
            }

            setPlanPendingDelete(null);
            toast.success("Day deleted.");
            router.refresh();
          });
        }}
      />
    </RoutinesPageScaffold>
  );
}
