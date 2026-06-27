"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { getBottomActionButtonClassName } from "@/components/layout/bottomActionIntents";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { DayList } from "@/components/day-list/DayList";
import { RoutineOverviewDayCard } from "@/components/day-list/RoutineDayCardPresentation";
import { RoutinesPageScaffold, SharedDayListSection } from "@/components/routines/RoutinesScreenFamily";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import type { WorkoutPlanSourceListItem } from "@/lib/workout-plan-source-list";

const WORKOUT_PLAN_LIBRARY_DELETE_PILL_CLASS_NAME = cn(
  getBottomActionButtonClassName({
    intent: "danger",
    fullWidth: false,
    className: "!h-6 !min-h-0 rounded-full !px-4 text-[12px] font-semibold tracking-[0.04em]",
  }),
  "!rounded-tl-[0.5rem] !rounded-tr-none !rounded-bl-none !rounded-br-none",
  "!border-[rgb(var(--danger-rgb)/0.98)] !bg-[linear-gradient(180deg,rgb(var(--danger-rgb)/0.98),rgb(132_31_31/0.98))] !text-[rgb(255_245_245)] shadow-[0_2px_10px_rgb(var(--danger-rgb)/0.16)]",
);

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
                  onPress={planHref ? () => router.push(planHref) : undefined}
                  wrapper={(card) => (
                    <div className="relative min-w-0 pt-[0.72rem] sm:pt-0">
                      <div className="pointer-events-none absolute left-[8px] top-0 z-[4] sm:top-px">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setPlanPendingDelete(plan);
                          }}
                          disabled={isPending}
                          aria-label={`Delete ${planTitle}`}
                          data-bottom-action-intent="danger"
                          className={cn(
                            WORKOUT_PLAN_LIBRARY_DELETE_PILL_CLASS_NAME,
                            "pointer-events-auto",
                            isPending ? "opacity-75" : undefined,
                          )}
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
