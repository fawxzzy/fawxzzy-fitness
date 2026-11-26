"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { splitRoutineSummaryParts } from "@/components/day-list/RoutineDayCardPresentation";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import type { RoutineBrowseCardItem } from "@/components/routines/RoutineBrowseCard";
import {
  RoutineChooserOptionCard,
  RoutineDuplicateChooserPanel,
  RoutineChooserSourceCard,
} from "@/components/routines/RoutineChooserMenu";
import { RoutineDuplicateChooserListViewport } from "@/components/routines/RoutineDuplicateChooserListViewport";
import { FormField, formFieldControlClassName } from "@/components/ui/FormField";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { resolveCuratedRoutineMenuOption, type CuratedRoutineMenuOption } from "@/features/curated-onboarding/selectors";
import { loadCuratedOnboardingGateState } from "@/features/curated-onboarding/storage";
import type { ActionResult } from "@/lib/action-result";
import { getRoutineLimitNoticeCopy, isRoutineLimitError } from "@/app/routines/routine-copy";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/formatting";
import { normalizeRoutineSummaryParts } from "@/lib/routine-card-copy";
import { ROUTINE_COPY_NAME_MAX_LENGTH, resolveUniqueRoutineCopyName } from "@/lib/routine-copy-name";

type Props = {
  backHref: string;
  routines: RoutineBrowseCardItem[];
  draftRoutineName?: string | null;
  curatedOnboardingEnabled?: boolean;
  curatedOnboardingUserId?: string | null;
  duplicateRoutineAction: (formData: FormData) => Promise<ActionResult & { routineId?: string }>;
  onRequestClose?: () => void;
  initialDuplicateExpanded?: boolean;
  /** Opened from a routine card's Duplicate: the chooser starts expanded with this routine as the source. */
  initialDuplicateSourceRoutineId?: string | null;
};

function buildRoutineSourceMeta(routine: RoutineBrowseCardItem): string[] {
  const parts = routine.summaryParts?.length
    ? routine.summaryParts
    : splitRoutineSummaryParts(routine.summary);
  const normalizedCreatedAt = typeof routine.createdAt === "string" ? routine.createdAt.trim() : "";
  return [
    // Same plain words as the Routines list ("4 training days", not the legacy "4 train").
    ...normalizeRoutineSummaryParts(parts.map((part) => part.trim()).filter(Boolean)),
    normalizedCreatedAt ? `Created ${formatDateShort(normalizedCreatedAt)}` : "",
  ].filter(Boolean);
}

function routineLooksConfigured(routine: RoutineBrowseCardItem) {
  if ((routine.summaryParts?.length ?? 0) > 0) {
    return true;
  }

  if ((routine.previewDays?.length ?? 0) > 0) {
    return true;
  }

  const summaryText = typeof routine.summary === "string" ? routine.summary.trim() : "";
  return summaryText.length > 0;
}

function resolvePreferredDuplicateSourceRoutine(routines: RoutineBrowseCardItem[]) {
  if (routines.length === 0) {
    return null;
  }

  const activeConfiguredRoutine = routines.find((routine) => routine.isActive && routineLooksConfigured(routine));
  if (activeConfiguredRoutine) {
    return activeConfiguredRoutine;
  }

  const configuredRoutine = routines.find((routine) => routineLooksConfigured(routine));
  if (configuredRoutine) {
    return configuredRoutine;
  }

  return routines.find((routine) => routine.isActive) ?? routines[0] ?? null;
}

export function CreateRoutineClient({
  backHref,
  routines,
  draftRoutineName,
  curatedOnboardingEnabled = false,
  curatedOnboardingUserId = null,
  duplicateRoutineAction,
  onRequestClose,
  initialDuplicateExpanded: initialDuplicateExpandedProp = false,
  initialDuplicateSourceRoutineId = null,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const requestedSourceRoutineId = initialDuplicateSourceRoutineId && routines.some((routine) => routine.id === initialDuplicateSourceRoutineId)
    ? initialDuplicateSourceRoutineId
    : null;
  const initialDuplicateExpanded = initialDuplicateExpandedProp || Boolean(requestedSourceRoutineId);
  const preferredDuplicateSourceRoutineId = requestedSourceRoutineId ?? resolvePreferredDuplicateSourceRoutine(routines)?.id ?? "";
  const [isDuplicateExpanded, setIsDuplicateExpanded] = useState(initialDuplicateExpanded);
  const [selectedSourceRoutineId, setSelectedSourceRoutineId] = useState<string>(
    initialDuplicateExpanded ? preferredDuplicateSourceRoutineId : "",
  );
  const [duplicateName, setDuplicateName] = useState(() => {
    if (!initialDuplicateExpanded) {
      return "";
    }

    const preferredRoutine = routines.find((routine) => routine.id === preferredDuplicateSourceRoutineId);
    return resolveUniqueRoutineCopyName({
      sourceName: preferredRoutine?.name,
      existingNames: routines.map((routine) => routine.name),
    });
  });
  const [duplicateNameError, setDuplicateNameError] = useState<string | null>(null);
  const [curatedMenuOption, setCuratedMenuOption] = useState<CuratedRoutineMenuOption | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const duplicateSourceRoutines = useMemo(() => {
    const selectedOrPreferredId = selectedSourceRoutineId || preferredDuplicateSourceRoutineId;

    return [...routines].sort((left, right) => {
      const leftPriority = left.id === selectedOrPreferredId ? 0 : left.isActive ? 1 : routineLooksConfigured(left) ? 2 : 3;
      const rightPriority = right.id === selectedOrPreferredId ? 0 : right.isActive ? 1 : routineLooksConfigured(right) ? 2 : 3;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return left.name.localeCompare(right.name);
    });
  }, [preferredDuplicateSourceRoutineId, routines, selectedSourceRoutineId]);
  const normalizedDuplicateName = duplicateName.trim().toLowerCase();
  const duplicateNameConflict = normalizedDuplicateName.length > 0
    && routines.some((routine) => routine.name.trim().toLowerCase() === normalizedDuplicateName);

  function handleSelectSourceRoutine(sourceRoutineId: string) {
    const sourceRoutine = routines.find((routine) => routine.id === sourceRoutineId);
    setSelectedSourceRoutineId(sourceRoutineId);
    setDuplicateNameError(null);
    setDuplicateName(resolveUniqueRoutineCopyName({
      sourceName: sourceRoutine?.name,
      existingNames: routines.map((routine) => routine.name),
    }));
  }

  function handleDuplicateRoutine() {
    if (isPending || !selectedSourceRoutineId) {
      return;
    }

    if (duplicateNameConflict) {
      setDuplicateNameError("Routine name already exists.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("sourceRoutineId", selectedSourceRoutineId);
      formData.set("name", duplicateName.trim());

      let result: Awaited<ReturnType<typeof duplicateRoutineAction>>;
      try {
        result = await duplicateRoutineAction(formData);
      } catch {
        toast.error("Could not duplicate the routine. Check your connection and try again.");
        return;
      }
      if (!result.ok) {
        toast.error(isRoutineLimitError(result.error)
          ? getRoutineLimitNoticeCopy()
          : result.error ?? "Could not duplicate routine.");
        return;
      }
      if (!result.routineId) {
        toast.error("New routine was created without a destination.");
        return;
      }

      toast.success("Routine duplicated.");
      router.push("/routines");
    });
  }

  function handleToggleDuplicateExpanded() {
    setIsDuplicateExpanded((current) => {
      if (current) {
        setSelectedSourceRoutineId("");
        setDuplicateName("");
        setDuplicateNameError(null);
      }

      return !current;
    });
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!curatedOnboardingEnabled || !curatedOnboardingUserId) {
      setCuratedMenuOption(null);
      return;
    }

    const gateState = loadCuratedOnboardingGateState(curatedOnboardingUserId);
    setCuratedMenuOption(resolveCuratedRoutineMenuOption({
      enabled: true,
      savedDraftId: gateState.savedCuratedDraftId,
    }));
  }, [curatedOnboardingEnabled, curatedOnboardingUserId]);

  useEffect(() => {
    if (!isDuplicateExpanded) {
      return;
    }

    if (selectedSourceRoutineId && routines.some((routine) => routine.id === selectedSourceRoutineId)) {
      return;
    }

    const preferredRoutine = resolvePreferredDuplicateSourceRoutine(routines);
    if (!preferredRoutine) {
      return;
    }

    setSelectedSourceRoutineId(preferredRoutine.id);
    setDuplicateNameError(null);
    setDuplicateName(resolveUniqueRoutineCopyName({
      sourceName: preferredRoutine.name,
      existingNames: routines.map((routine) => routine.name),
    }));
  }, [isDuplicateExpanded, routines, selectedSourceRoutineId]);

  function handleClose() {
    if (onRequestClose) {
      onRequestClose();
      return;
    }

    router.push(backHref);
  }

  useEffect(() => {
    router.prefetch("/routines/new?mode=blank");
  }, [router]);

  useEffect(() => {
    if (curatedMenuOption) {
      router.prefetch(curatedMenuOption.href);
    }
  }, [curatedMenuOption, router]);

  // Mounted gate: the Sheet portals to <body>, which the server render cannot match.
  if (!isMounted) {
    return null;
  }

  // The chooser is the shared Sheet (docs/ui/FOUNDATION.md): focus trap, Escape, scroll lock, safe area and a
  // 44px Close; closing returns to the routines list (onRequestClose, else backHref).
  return (
    <Sheet open title="New routine" onClose={handleClose} dialogProps={{ "data-create-routine-chooser": "" }}>
      <div className="flex min-h-0 flex-col gap-2.5 pb-3">
        {draftRoutineName?.trim() ? (
          <RoutineChooserOptionCard
            title={(
              <span className="inline-flex items-center gap-1.5">
                <span>Continue Draft:</span>
                <span className="text-[rgb(var(--accent))]">{draftRoutineName.trim()}</span>
              </span>
            )}
            active
            disabled={isPending}
            onPress={() => {
              setIsDuplicateExpanded(false);
              router.push("/routines/new", { scroll: false });
            }}
          />
        ) : null}
        {curatedMenuOption ? (
          <RoutineChooserOptionCard
            title={curatedMenuOption.label}
            disabled={isPending}
            onPress={() => {
              setIsDuplicateExpanded(false);
              router.push(curatedMenuOption.href, { scroll: false });
            }}
          />
        ) : null}
        <RoutineChooserOptionCard
          title="Build manually"
          disabled={isPending}
          onPress={() => {
            setIsDuplicateExpanded(false);
            router.push("/routines/new?mode=blank", { scroll: false });
          }}
        />
        <RoutineChooserOptionCard
          title="Duplicate routine"
          kind="toggle"
          active={isDuplicateExpanded}
          disabled={routines.length === 0 || isPending}
          onPress={routines.length > 0 && !isPending ? handleToggleDuplicateExpanded : undefined}
        />

        {isDuplicateExpanded && routines.length > 0 ? (
          <RoutineDuplicateChooserPanel
            className="min-h-0 flex flex-1 flex-col"
            title="Choose Routine"
            list={(
              <RoutineDuplicateChooserListViewport contentClassName="space-y-2">
                {duplicateSourceRoutines.map((routine) => (
                  <RoutineChooserSourceCard
                    key={routine.id}
                    onPress={() => handleSelectSourceRoutine(routine.id)}
                    title={routine.name}
                    selected={selectedSourceRoutineId === routine.id}
                    meta={buildRoutineSourceMeta(routine)}
                  />
                ))}
              </RoutineDuplicateChooserListViewport>
            )}
            footer={selectedSourceRoutineId ? (
              <>
                <FormField
                  label="New routine name"
                  invalid={Boolean(duplicateNameConflict)}
                  error={duplicateNameError}
                >
                  {(control) => (
                    <input
                      {...control}
                      value={duplicateName}
                      onChange={(event) => {
                        setDuplicateNameError(null);
                        setDuplicateName(event.target.value.slice(0, ROUTINE_COPY_NAME_MAX_LENGTH));
                      }}
                      placeholder="Enter routine name"
                      maxLength={ROUTINE_COPY_NAME_MAX_LENGTH}
                      className={cn(formFieldControlClassName, "font-semibold")}
                    />
                  )}
                </FormField>
                <BottomDockButton
                  type="button"
                  intent="positive"
                  onClick={handleDuplicateRoutine}
                  disabled={duplicateName.trim().length === 0}
                  loading={isPending}
                >
                  Duplicate
                </BottomDockButton>
              </>
            ) : null}
          />
        ) : null}
      </div>
    </Sheet>
  );
}
