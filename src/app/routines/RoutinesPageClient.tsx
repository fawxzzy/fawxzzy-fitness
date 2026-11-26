"use client";

import { CONFIRM_ACTION_LABELS } from "@/lib/action-labels";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { RoutineBrowseCard, type RoutineBrowseCardItem } from "@/components/routines/RoutineBrowseCard";
import { ArchivedRoutinesSection, type ArchivedRoutineListItem } from "@/components/routines/ArchivedRoutinesSection";
import { CreateRoutineClient } from "@/app/routines/CreateRoutineClient";
import { CardEmptyState } from "@/components/ui/card-system";
import { buildRoutineCardActions } from "@/components/routines/routineCardActions";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useToast } from "@/components/ui/ToastProvider";
import {
  RoutinesCardList,
  RoutinesListItem,
  RoutinesPageScaffold,
  SharedDayListSection,
} from "@/components/routines/RoutinesScreenFamily";
import type { ActionResult } from "@/lib/action-result";
import { getRoutineEditHref } from "@/lib/routine-day-navigation";
import { canAddListedRoutineForTier } from "@/lib/pro-tier-limits";
import { ROUTINE_ARCHIVE_COPY, describeRoutineArchiveConsequence } from "@/lib/routine-archive";

/** Server answers that are expected outcomes, not failures: shown as a plain warning, never as an error. */
const ROUTINE_ARCHIVE_PLAIN_OUTCOMES = new Set<string>([
  ROUTINE_ARCHIVE_COPY.inProgressBlocked,
  ROUTINE_ARCHIVE_COPY.restoreLimit,
  ROUTINE_ARCHIVE_COPY.unavailable,
]);

/** Rename opens the routine settings screen with the name field focused (saved by the existing autosave). */
export function getRoutineRenameHref(routineId: string) {
  const editHref = getRoutineEditHref(routineId, "/routines");
  return `${editHref}${editHref.includes("?") ? "&" : "?"}focus=name`;
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
  archiveRoutineAction,
  restoreRoutineAction,
  archivedRoutines = [],
  listedRoutineCount,
  accessState = "free",
  initialCreateRoutineOpen = false,
  initialCreateRoutineDuplicateExpanded = false,
  initialArchivedExpanded = false,
}: {
  routines: RoutineBrowseCardItem[];
  newRoutineHref?: string;
  workoutPlansHref?: string;
  draftRoutineName?: string | null;
  curatedOnboardingEnabled?: boolean;
  curatedOnboardingUserId?: string | null;
  duplicateRoutineAction?: Parameters<typeof CreateRoutineClient>[0]["duplicateRoutineAction"];
  setActiveRoutineAction?: (formData: FormData) => Promise<ActionResult>;
  /** Left undefined while routines.archived_at is missing: Archive is then not offered (src/lib/routine-archive.ts). */
  archiveRoutineAction?: (payload: { routineId: string }) => Promise<ActionResult>;
  restoreRoutineAction?: (payload: { routineId: string }) => Promise<ActionResult>;
  archivedRoutines?: ArchivedRoutineListItem[];
  /** Non-archived routines, including any the Free plan hides; defaults to the routines shown. */
  listedRoutineCount?: number;
  accessState?: "free" | "pro";
  initialCreateRoutineOpen?: boolean;
  initialCreateRoutineDuplicateExpanded?: boolean;
  initialArchivedExpanded?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isCreateRoutineOpen, setIsCreateRoutineOpen] = useState(initialCreateRoutineOpen);
  // Set by a card's Duplicate: the New routine chooser opens on Duplicate with that routine preselected.
  const [duplicateSourceRoutineId, setDuplicateSourceRoutineId] = useState<string | null>(null);
  const [routinePendingArchive, setRoutinePendingArchive] = useState<RoutineBrowseCardItem | null>(null);
  const [restoringRoutineId, setRestoringRoutineId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const atRestoreLimit = !canAddListedRoutineForTier({ listedRoutineCount: listedRoutineCount ?? routines.length, accessState });
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
          // One create action: the dock's New Routine. The empty state only says what a routine is.
          archivedRoutines.length > 0 && restoreRoutineAction ? (
            <CardEmptyState
              title="No routines in your list"
              body="Your archived routines are below. Restore one, or tap New Routine to make a new one."
            />
          ) : (
            <CardEmptyState
              title="No routines yet"
              body="A routine is your weekly plan: the days you train and the exercises on each day. Tap New Routine to make one."
            />
          )
        ) : (
          <RoutinesCardList>
            {[...activeRoutines, ...inactiveRoutines].map((routine, index) => {
              const routineHref = routine.href;
              const actions = buildRoutineCardActions({
                routine,
                isPending,
                canArchive: Boolean(archiveRoutineAction),
                canSetActive: Boolean(setActiveRoutineAction),
                onRequestArchive: archiveRoutineAction ? () => setRoutinePendingArchive(routine) : undefined,
                onEdit: (routineId) => router.push(getRoutineEditHref(routineId, "/routines")),
                onRename: (routineId) => router.push(getRoutineRenameHref(routineId)),
                onDuplicate: duplicateRoutineAction
                  ? (routineId) => {
                    setDuplicateSourceRoutineId(routineId);
                    setIsCreateRoutineOpen(true);
                  }
                  : undefined,
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
      {restoreRoutineAction ? (
        <ArchivedRoutinesSection
          routines={archivedRoutines}
          atRestoreLimit={atRestoreLimit}
          pendingRoutineId={restoringRoutineId}
          disabled={isPending}
          defaultExpanded={initialArchivedExpanded}
          onRestore={(routine) => {
            if (atRestoreLimit) {
              toast.warning(ROUTINE_ARCHIVE_COPY.restoreLimit);
              return;
            }

            setRestoringRoutineId(routine.id);
            startTransition(async () => {
              const result = await restoreRoutineAction({ routineId: routine.id });
              setRestoringRoutineId(null);
              if (!result.ok) {
                const message = result.error ?? ROUTINE_ARCHIVE_COPY.restoreFailed;
                if (ROUTINE_ARCHIVE_PLAIN_OUTCOMES.has(message)) {
                  toast.warning(message);
                } else {
                  toast.error(message);
                }
                return;
              }

              toast.success(ROUTINE_ARCHIVE_COPY.restoredToast);
              router.refresh();
            });
          }}
        />
      ) : null}
      <ConfirmDestructiveModal
        open={routinePendingArchive !== null}
        title={ROUTINE_ARCHIVE_COPY.confirmTitle}
        objectName={routinePendingArchive?.name}
        consequenceText={routinePendingArchive ? describeRoutineArchiveConsequence(routinePendingArchive) : undefined}
        confirmLabel={CONFIRM_ACTION_LABELS.archiveRoutine}
        confirmVariant="primary"
        isLoading={isPending && routinePendingArchive !== null}
        onCancel={() => {
          if (!isPending) {
            setRoutinePendingArchive(null);
          }
        }}
        onConfirm={() => {
          if (!archiveRoutineAction || !routinePendingArchive) {
            return;
          }

          startTransition(async () => {
            const routineId = routinePendingArchive.id;
            const result = await archiveRoutineAction({ routineId });
            if (!result.ok) {
              const message = result.error ?? ROUTINE_ARCHIVE_COPY.archiveFailed;
              setRoutinePendingArchive(null);
              if (ROUTINE_ARCHIVE_PLAIN_OUTCOMES.has(message)) {
                toast.warning(message);
              } else {
                toast.error(message);
              }
              return;
            }

            setRoutinePendingArchive(null);
            toast.success(ROUTINE_ARCHIVE_COPY.archivedToast);
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
          onRequestClose={() => {
            setIsCreateRoutineOpen(false);
            setDuplicateSourceRoutineId(null);
          }}
          initialDuplicateExpanded={initialCreateRoutineDuplicateExpanded}
          initialDuplicateSourceRoutineId={duplicateSourceRoutineId}
        />
      ) : null}
    </RoutinesPageScaffold>
  );
}
