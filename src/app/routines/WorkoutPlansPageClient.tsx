"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { DayList } from "@/components/day-list/DayList";
import { RoutineOverviewDayCard } from "@/components/day-list/RoutineDayCardPresentation";
import { RoutinesPageScaffold, SharedDayListSection } from "@/components/routines/RoutinesScreenFamily";
import {
  ROUTINE_CARD_DELETE_CORNER_ANCHOR_CLASS_NAME,
  ROUTINE_CARD_DELETE_TEXT_CLASS_NAME,
} from "@/components/routines/routineCardChrome";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { EmptyState } from "@/components/ui/EmptyState";
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
          <EmptyState
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
          <DayList className="space-y-[0.375rem] sm:space-y-[0.375rem]">
            {workoutPlans.map((plan) => {
              const planHref = plan.href ?? null;
              const planTitle = plan.title?.trim() || "Workout Plan";

              return (
                <RoutineOverviewDayCard
                  key={plan.id}
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
                  headerLayout="cornered"
                  onPress={planHref ? () => router.push(planHref) : undefined}
                  wrapper={(card) => (
                    <div className="relative min-w-0">
                      <div className={ROUTINE_CARD_DELETE_CORNER_ANCHOR_CLASS_NAME}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setPlanPendingDelete(plan);
                          }}
                          disabled={isPending}
                          aria-label={`Delete ${planTitle}`}
                          className={`${ROUTINE_CARD_DELETE_TEXT_CLASS_NAME} pointer-events-auto${isPending ? " opacity-75" : ""}`}
                        >
                          <span className="bottom-action__label">Delete</span>
                        </button>
                      </div>
                      {card}
                    </div>
                  )}
                />
              );
            })}
          </DayList>
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
