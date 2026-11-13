"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { RoutineOverviewDayCard } from "@/components/day-list/RoutineDayCardPresentation";
import { RoutinesCardList, RoutinesListItem, RoutinesPageScaffold, SharedDayListSection } from "@/components/routines/RoutinesScreenFamily";
import { CardActionRow, CardEmptyState, CardIconButton } from "@/components/ui/card-system";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useToast } from "@/components/ui/ToastProvider";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import type { ActionResult } from "@/lib/action-result";
import type { WorkoutPlanSourceListItem } from "@/lib/workout-plan-source-list";

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
    <BottomActionSplit
      secondary={(
        <BottomDockLink href={routinesHref} intent="toggleInactive">
          Routines
        </BottomDockLink>
      )}
      primary={newWorkoutPlanHref ? (
        <BottomDockLink href={newWorkoutPlanHref} intent="positive">
          New Workout Plan
        </BottomDockLink>
      ) : (
        <BottomDockButton type="button" intent="positive" disabled>
          New Workout Plan
        </BottomDockButton>
      )}
    />
  ), [newWorkoutPlanHref, routinesHref]);

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
            title="No workout plans yet"
            body={newWorkoutPlanHref
              ? "Create a workout plan without drilling into a routine first."
              : "Create a routine first, then build workout plans from that routine."}
            action={newWorkoutPlanHref ? (
              <BottomDockLink
                href={newWorkoutPlanHref}
                intent="positive"
                className={getAppButtonClassName({ variant: "primary", fullWidth: true })}
              >
                New Workout Plan
              </BottomDockLink>
            ) : (
              <BottomDockLink
                href={routinesHref}
                intent="toggleInactive"
                className={getAppButtonClassName({ variant: "primary", fullWidth: true })}
              >
                Open Routines
              </BottomDockLink>
            )}
          />
        ) : (
          <RoutinesCardList>
            {workoutPlans.map((plan) => {
              const planHref = plan.href ?? null;
              const planTitle = plan.title?.trim() || "Workout Plan";
              const actionsOpen = expandedActionsPlanId === plan.id;

              return (
                <RoutinesListItem key={plan.id}>
                  <RoutineOverviewDayCard
                    day={{
                      dayIndex: plan.dayIndex,
                      title: planTitle,
                      occurrenceWeekday: null,
                      isRest: plan.isRest,
                      splitSummary: plan.splitSummary,
                      recapExercises: plan.recapExercises,
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
                        onClick={() => setExpandedActionsPlanId((current) => current === plan.id ? null : plan.id)}
                      >
                        <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5">
                          {[4.5, 10, 15.5].map((cx) => <circle key={cx} cx={cx} cy="10" r="1.6" fill="currentColor" />)}
                        </svg>
                      </CardIconButton>
                    )}
                    footer={actionsOpen ? (
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
                    ) : undefined}
                  />
                </RoutinesListItem>
              );
            })}
          </RoutinesCardList>
        )}
      </SharedDayListSection>

      <ConfirmDestructiveModal
        open={planPendingDelete !== null}
        title="Confirm Delete"
        confirmLabel="Delete"
        titleVariant="raw"
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
              toast.error(result.error ?? "Could not delete workout plan.");
              return;
            }

            setPlanPendingDelete(null);
            toast.success("Workout plan deleted.");
            router.refresh();
          });
        }}
      />
    </RoutinesPageScaffold>
  );
}
