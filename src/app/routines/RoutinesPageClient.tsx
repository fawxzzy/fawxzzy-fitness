"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { RoutineBrowseCard, type RoutineBrowseCardItem } from "@/components/routines/RoutineBrowseCard";
import { CreateRoutineClient } from "@/app/routines/CreateRoutineClient";
import { CardEmptyState } from "@/components/ui/card-system";
import { buildRoutineCardActions } from "@/components/routines/routineCardActions";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { AppButton } from "@/components/ui/AppButton";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { useToast } from "@/components/ui/ToastProvider";
import {
  RoutinesCardList,
  RoutinesListItem,
  RoutinesPageScaffold,
  SharedDayListSection,
} from "@/components/routines/RoutinesScreenFamily";
import type { ActionResult } from "@/lib/action-result";

/**
 * What deleting a routine does, in the words the confirm shows. Mirrors deleteRoutineMutation (src/lib/dal/routine-delete.ts):
 * the routine, its days and exercises, the workouts logged on it and its progression events go; if it was the
 * active routine another one takes over.
 */
export function describeRoutineDeleteConsequence(routine: { name: string; isActive?: boolean }): string {
  const base = "This permanently deletes the routine, its days and exercises, and the workouts you logged with it, along with their progression history. It can't be undone.";
  return routine.isActive ? `${base} Another routine becomes your active one.` : base;
}

export function RoutinesPageClient({
  routines,
  newRoutineHref,
  workoutPlansHref = "/routines/workout-plans",
  draftRoutineName,
  curatedOnboardingEnabled = false,
  curatedOnboardingUserId = null,
  duplicateRoutineAction,
  setActiveRoutineAction,
  deleteRoutineAction,
  initialCreateRoutineOpen = false,
  initialCreateRoutineDuplicateExpanded = false,
}: {
  routines: RoutineBrowseCardItem[];
  newRoutineHref?: string;
  workoutPlansHref?: string;
  draftRoutineName?: string | null;
  curatedOnboardingEnabled?: boolean;
  curatedOnboardingUserId?: string | null;
  duplicateRoutineAction?: Parameters<typeof CreateRoutineClient>[0]["duplicateRoutineAction"];
  setActiveRoutineAction?: (formData: FormData) => Promise<ActionResult>;
  deleteRoutineAction?: (payload: { routineId: string }) => Promise<ActionResult>;
  initialCreateRoutineOpen?: boolean;
  initialCreateRoutineDuplicateExpanded?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isCreateRoutineOpen, setIsCreateRoutineOpen] = useState(initialCreateRoutineOpen);
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
          Days
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
          <CardEmptyState
            title="No routines yet"
            body="Create a routine to unify Today, session tracking, and history around the same training plan."
            action={canOpenInlineCreate
              ? (
                // The dock holds the screen's one primary (New Routine); the empty-state action is secondary.
                <AppButton type="button" variant="secondary" fullWidth onClick={() => setIsCreateRoutineOpen(true)}>
                  Create your first routine
                </AppButton>
              )
              : (
                <BottomDockLink
                  href={newRoutineHref ?? "/routines/new"}
                  intent="toggleInactive"
                  className={getAppButtonClassName({ variant: "secondary", fullWidth: true })}
                >
                  Create your first routine
                </BottomDockLink>
              )}
          />
        ) : (
          <RoutinesCardList>
            {[...activeRoutines, ...inactiveRoutines].map((routine, index) => {
              const routineHref = routine.href;
              const actions = buildRoutineCardActions({
                routine,
                isPending,
                canDelete: Boolean(deleteRoutineAction),
                canSetActive: Boolean(setActiveRoutineAction),
                onRequestDelete: () => setRoutinePendingDelete(routine),
                onSetActive: (routineId) => {
                  if (!setActiveRoutineAction) {
                    return;
                  }

                  startTransition(async () => {
                    const formData = new FormData();
                    formData.set("routineId", routineId);
                    const result = await setActiveRoutineAction(formData);
                    if (!result.ok) {
                      toast.error(result.error ?? "Could not set active routine.");
                      return;
                    }

                    toast.success("Routine is now active");
                    router.refresh();
                  });
                },
              });

              return (
                <RoutinesListItem key={routine.id}>
                  {index === activeRoutines.length && activeRoutines.length > 0 && inactiveRoutines.length > 0 ? (
                    <div role="separator" className="mb-3 mt-1 h-px w-full bg-[rgb(var(--border-strong)/0.16)]" />
                  ) : null}
                  <RoutineBrowseCard
                    routine={routine}
                    onPress={routineHref ? () => router.push(routineHref) : undefined}
                    actions={actions}
                    showPreviewDays={Boolean(routine.isActive)}
                  />
                </RoutinesListItem>
              );
            })}
          </RoutinesCardList>
        )}
      </SharedDayListSection>
      <ConfirmDestructiveModal
        open={routinePendingDelete !== null}
        title="Delete routine?"
        objectName={routinePendingDelete?.name}
        consequenceText={routinePendingDelete ? describeRoutineDeleteConsequence(routinePendingDelete) : undefined}
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
          curatedOnboardingEnabled={curatedOnboardingEnabled}
          curatedOnboardingUserId={curatedOnboardingUserId}
          duplicateRoutineAction={duplicateRoutineAction}
          onRequestClose={() => setIsCreateRoutineOpen(false)}
          initialDuplicateExpanded={initialCreateRoutineDuplicateExpanded}
        />
      ) : null}
    </RoutinesPageScaffold>
  );
}
