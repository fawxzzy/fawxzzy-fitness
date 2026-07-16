"use client";

import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import {
  ROUTINE_SURFACE_TAG_CLASS_NAME,
  splitRoutineSummaryParts,
} from "@/components/day-list/RoutineDayCardPresentation";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import type { RoutineBrowseCardItem } from "@/components/routines/RoutineBrowseCard";
import {
  RoutineChooserOptionCard,
  RoutineDuplicateChooserPanel,
  RoutineChooserSourceCard,
} from "@/components/routines/RoutineChooserMenu";
import { RoutineDuplicateChooserListViewport } from "@/components/routines/RoutineDuplicateChooserListViewport";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { HorizontalScrollHint } from "@/components/ui/HorizontalScrollHint";
import { labeledEditorFieldControlClassName, LabeledEditorField } from "@/components/ui/LabeledEditorField";
import { SHARED_OVERLAY_PANEL_MAX_WIDTH_CLASS_NAME } from "@/components/ui/app/overlayPanelTokens";
import { overlayChromeClassNames } from "@/components/ui/OverlayChrome";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { useToast } from "@/components/ui/ToastProvider";
import { resolveCuratedRoutineMenuOption, type CuratedRoutineMenuOption } from "@/features/curated-onboarding/selectors";
import { loadCuratedOnboardingGateState } from "@/features/curated-onboarding/storage";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/formatting";
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
};

function renderRoutineSourceTags(routine: RoutineBrowseCardItem) {
  const parts = routine.summaryParts?.length
    ? routine.summaryParts
    : splitRoutineSummaryParts(routine.summary);
  if (parts.length === 0) {
    return null;
  }

  function renderCompactRoutineSourceTagLabel(value: string) {
    const normalizedValue = value.trim();
    const match = normalizedValue.match(/^(\d+(?:[.,]\d+)?)(\s+.*)?$/);
    if (!match) {
      return normalizedValue;
    }

    const [, count, suffix = ""] = match;
    const trimmedSuffix = suffix.trim().toLowerCase();
    const mobileSuffix = trimmedSuffix === "workout plans"
      ? "plans"
      : trimmedSuffix === "sessions logged"
        ? "sessions"
        : trimmedSuffix === "training"
          ? "train"
          : suffix.trim();

    return (
      <>
        <span className="text-[rgb(var(--text-primary))]">{count}</span>
        {trimmedSuffix ? (
          <>
            <span className="ml-1 sm:hidden">{mobileSuffix}</span>
            <span className="ml-1 hidden sm:inline">{suffix.trim()}</span>
          </>
        ) : null}
      </>
    );
  }

  return (
    <HorizontalScrollHint
      className="-mx-0.5"
      scrollClassName="px-0.5 pb-0.5 pr-[0.85rem]"
      contentClassName="flex w-max min-w-full flex-nowrap items-center gap-1 pr-[0.65rem]"
      showEdgeFades={false}
    >
      {parts.map((part) => (
        <AppBadge
          key={`${routine.id}-${part}`}
          tone="default"
          className={`${ROUTINE_SURFACE_TAG_CLASS_NAME} px-[0.54rem] py-[0.2rem] text-[9px] sm:px-[0.6875rem] sm:py-[0.3125rem] sm:text-[11px]`}
        >
          {renderCompactRoutineSourceTagLabel(part)}
        </AppBadge>
      ))}
    </HorizontalScrollHint>
  );
}

function renderRoutineSourceFooter(routine: RoutineBrowseCardItem) {
  const normalizedCreatedAt = typeof routine.createdAt === "string" ? routine.createdAt.trim() : "";
  if (!normalizedCreatedAt) {
    return null;
  }

  return `Created ${formatDateShort(normalizedCreatedAt)}`;
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
  initialDuplicateExpanded = false,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const preferredDuplicateSourceRoutineId = resolvePreferredDuplicateSourceRoutine(routines)?.id ?? "";
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
  const titleId = useId();
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const portalTarget = typeof document === "undefined"
    ? null
    : document.querySelector(".app-shell") ?? document.body;
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

      const result = await duplicateRoutineAction(formData);
      if (!result.ok) {
        toast.error(result.error ?? "Could not duplicate routine.");
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

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (onRequestClose) {
          onRequestClose();
          return;
        }

        router.push(backHref);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [backHref, onRequestClose, router]);

  useEffect(() => {
    if (!(portalTarget instanceof HTMLElement)) {
      return;
    }

    const shellContent = Array.from(portalTarget.children).find(
      (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains("z-10"),
    );
    if (!shellContent) {
      return;
    }

    const previousFilter = shellContent.style.filter;
    const previousTransition = shellContent.style.transition;
    const previousTransform = shellContent.style.transform;
    const previousWillChange = shellContent.style.willChange;

    shellContent.style.filter = "blur(1.5px) brightness(0.96) saturate(0.98)";
    shellContent.style.transform = "scale(0.992) translateZ(0)";
    shellContent.style.willChange = "filter";
    shellContent.style.transition = previousTransition
      ? `${previousTransition}, filter 180ms cubic-bezier(0.22, 1, 0.36, 1)`
      : "filter 180ms cubic-bezier(0.22, 1, 0.36, 1)";

    return () => {
      shellContent.style.filter = previousFilter;
      shellContent.style.transition = previousTransition;
      shellContent.style.transform = previousTransform;
      shellContent.style.willChange = previousWillChange;
    };
  }, [portalTarget]);

  useEffect(() => {
    const focusable = modalRootRef.current?.querySelector<HTMLElement>(
      "button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus();
  }, []);

  useEffect(() => {
    router.prefetch("/routines/new?mode=blank");
  }, [router]);

  useEffect(() => {
    if (curatedMenuOption) {
      router.prefetch(curatedMenuOption.href);
    }
  }, [curatedMenuOption, router]);

  if (!isMounted || !portalTarget) {
    return null;
  }

  const duplicateTriggerIcon = isDuplicateExpanded
    ? <ChevronDownIcon className="h-5 w-5 text-[rgb(var(--accent-divider-rgb)/0.98)]" />
    : <ChevronRightIcon className="h-5 w-5 text-[rgb(var(--text-muted)/0.92)]" />;

  return createPortal(
    <div
      ref={modalRootRef}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 pt-[max(1rem,var(--app-safe-top))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div aria-hidden="true" className="fixed inset-0 z-0 bg-[rgba(7,17,27,0.015)] backdrop-blur-[2px]" />
      <div
        className={cn(
          overlayChromeClassNames.panelBase,
          "relative z-10 flex w-full min-w-0 flex-col overflow-hidden rounded-[1.5rem]",
          `max-h-[min(100dvh-2rem,42rem)] ${SHARED_OVERLAY_PANEL_MAX_WIDTH_CLASS_NAME}`,
        )}
      >
        <div className="relative px-4 pb-2 pt-4 text-center">
          <div className="absolute right-4 top-4">
            <TopRightBackButton
              href={!onRequestClose ? backHref : undefined}
              ariaLabel="Back to routines"
              historyBehavior="fallback-only"
              onClick={onRequestClose
                ? (event) => {
                  event.preventDefault();
                  onRequestClose();
                }
                : undefined}
            />
          </div>
          <h2 id={titleId} className="text-[1.3125rem] font-semibold tracking-[-0.03em] text-[rgb(var(--text-primary))]">
            New Routine
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-4 pb-6 pt-2">
          <div className="flex h-full min-h-0 flex-col gap-2.5">
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
                rightSlot={<ChevronRightIcon className="h-4 w-4" />}
                disabled={isPending}
                onPress={() => {
                  setIsDuplicateExpanded(false);
                  router.push(curatedMenuOption.href, { scroll: false });
                }}
              />
            ) : null}
            <RoutineChooserOptionCard
              title="Build manually"
              rightSlot={<ChevronRightIcon className="h-4 w-4" />}
              disabled={isPending}
              onPress={() => {
                setIsDuplicateExpanded(false);
                router.push("/routines/new?mode=blank", { scroll: false });
              }}
            />
            <RoutineChooserOptionCard
              title="Duplicate routine"
              active={isDuplicateExpanded}
              rightSlot={duplicateTriggerIcon}
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
                        tags={renderRoutineSourceTags(routine)}
                        footer={renderRoutineSourceFooter(routine)}
                      />
                    ))}
                  </RoutineDuplicateChooserListViewport>
                )}
                footer={selectedSourceRoutineId ? (
                  <>
                    <LabeledEditorField
                      label="New Routine Title"
                      className={cn(
                        "rounded-[1rem] bg-[rgb(var(--surface-2-rgb)/0.54)]",
                        duplicateNameConflict
                          ? "border-[rgb(var(--danger-rgb,220_68_68)/0.72)] shadow-[0_0_0_1px_rgb(var(--danger-rgb,220_68_68)/0.18),0_10px_24px_rgba(0,0,0,0.12)]"
                          : undefined,
                      )}
                    >
                      <input
                        value={duplicateName}
                        onChange={(event) => {
                          setDuplicateNameError(null);
                          setDuplicateName(event.target.value.slice(0, ROUTINE_COPY_NAME_MAX_LENGTH));
                        }}
                        placeholder="Enter routine name"
                        aria-label="New routine title"
                        maxLength={ROUTINE_COPY_NAME_MAX_LENGTH}
                        className={cn(
                          labeledEditorFieldControlClassName,
                          "h-12 px-4 py-3 text-center text-sm font-semibold",
                        )}
                      />
                    </LabeledEditorField>
                    {duplicateNameError ? (
                      <p className="px-1 text-center text-[0.78rem] font-medium text-[rgb(var(--danger-rgb,220_68_68)/0.94)]">
                        {duplicateNameError}
                      </p>
                    ) : null}
                    <BottomDockButton
                      type="button"
                      intent="positive"
                      onClick={handleDuplicateRoutine}
                      disabled={duplicateName.trim().length === 0}
                      loading={isPending}
                    >
                      Confirm
                    </BottomDockButton>
                  </>
                ) : null}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
