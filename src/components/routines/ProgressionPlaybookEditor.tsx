"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  ACTION_CHROME_CONTROL_CLASS_NAME,
  ACTION_CHROME_RAIL_CLASS_NAME,
  ACTION_CHROME_RAIL_GRID_CLASS_NAME,
  ACTION_CHROME_SEGMENTED_CLASS_NAME,
} from "@/components/ui/actionChrome";
import { AccentDotSeparatedText, SignatureDot, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon } from "@/components/ui/Chevrons";
import { FilterScrollPanel } from "@/components/ui/FilterScrollPanel";
import { labeledEditorFieldControlClassName, labeledEditorFieldFloatingLabelClassName } from "@/components/ui/LabeledEditorField";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";
import {
  areProgressionPlaybookFormStatesEqual,
  createProgressionPlaybookFormState,
  type ProgressionPlaybookFormState,
} from "@/lib/progression-playbook-form-state";
import type {
  ProgressionPromotionUiModel,
  ProgressionPromotionUiOptionId,
  ProgressionTargetMutationUiModel,
  PromotionStepFieldId,
} from "@/lib/progression-playbook-ui-options";
import { QUALIFICATION_SESSION_COUNT_OPTIONS } from "@/lib/progression-playbook-ui-options";
import {
  getRepPromotionTarget,
  usesRepsForPromotion,
} from "@/lib/progression-promotion";
import { DEFAULT_QUALIFICATION_WINDOW_MODE } from "@/lib/progression-qualification-window";
import {
  getDefaultProgressionPlaybookConfig,
  listProgressionMethodDefinitions,
  PROGRESSION_INFO_TERM_DEFINITIONS,
  PROGRESSION_METHOD_DEFINITIONS,
  SET_FLOW_DEFINITIONS,
  STALL_POLICY_DEFINITIONS,
  type ProgressionMethodId,
  type ProgressionPlaybookId,
  type ProgressionStallPolicy,
  type TrainingGoalId,
} from "@/lib/progression-playbooks";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";
import { shouldPersistExplicitTargetMutation } from "@/lib/progression-target-mutation";
import { listSupportedSetFlowDefinitions } from "@/lib/set-flow";

export type { PromotionStepFieldId } from "@/lib/progression-playbook-ui-options";

const progressionFieldShellClassName = "relative min-w-0 rounded-[1rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.22)] [touch-action:pan-x_pan-y] transition-[border-color,box-shadow] focus-within:border-[rgb(var(--button-primary-border)/0.42)] focus-within:ring-2 focus-within:ring-[rgb(var(--button-primary-border)/0.18)]";
const progressionFieldLabelClassName = cn(
  labeledEditorFieldFloatingLabelClassName,
  "whitespace-nowrap px-1 py-0 text-[9px] leading-none",
);
const progressionFieldInputClassName = cn(
  appTokens.measurementInput,
  labeledEditorFieldControlClassName,
  "h-11 rounded-[inherit] !border-0 !bg-transparent px-3 py-0 text-center !shadow-none placeholder:text-[rgb(var(--text-muted)/0.7)] focus-visible:!border-0 focus-visible:!ring-0",
);

function formatSetFlowButtonLabel(label: string) {
  return label.replace(/\s+Sets$/i, "");
}

function parsePositiveIntegerInput(value: string) {
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatRepRangePreview(minReps: number, maxReps: number) {
  return minReps === maxReps ? `${minReps}` : `${minReps}\u2013${maxReps}`;
}

function parseOptionalPositiveInteger(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  return parsePositiveIntegerInput(value);
}

export function ProgressionNumberField({
  label,
  name,
  inputMode,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  name: string;
  inputMode: "decimal" | "numeric";
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className={cn(appTokens.measurementField, appTokens.measurementFieldStandard, "min-h-0 overflow-visible border-transparent bg-transparent px-0 py-0 shadow-none")}>
      <fieldset className={progressionFieldShellClassName}>
        <legend className={progressionFieldLabelClassName}>{label}</legend>
        <input
          name={name}
          type="text"
          inputMode={inputMode}
          value={value}
          placeholder="-"
          readOnly={readOnly}
          tabIndex={readOnly ? -1 : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn(progressionFieldInputClassName, readOnly ? "pointer-events-none" : undefined)}
        />
      </fieldset>
    </div>
  );
}

const allPromotionStepFieldIds: PromotionStepFieldId[] = [
  "barbellLoad",
  "dumbbellLoad",
  "machineLoad",
  "cableLoad",
  "bodyweightReps",
  "duration",
  "distance",
];

function getVisiblePromotionStepFieldIds({
  isRoutineDefaultContext,
  progressionStepPolicy,
}: {
  isRoutineDefaultContext: boolean;
  progressionStepPolicy?: ProgressionStepPolicy | null;
}): PromotionStepFieldId[] {
  if (isRoutineDefaultContext || !progressionStepPolicy) {
    return allPromotionStepFieldIds;
  }

  switch (progressionStepPolicy.kind) {
    case "load":
      switch (progressionStepPolicy.equipmentFamily) {
        case "barbell":
          return ["barbellLoad"];
        case "dumbbell":
          return ["dumbbellLoad"];
        case "machine":
          return ["machineLoad"];
        case "cable":
          return ["cableLoad"];
        default:
          return ["genericLoad"];
      }
    case "reps":
      return ["bodyweightReps"];
    case "duration":
      return ["duration"];
    case "distance":
    case "pace_or_volume":
      return ["distance"];
    default:
      return [];
  }
}

const progressionInfoTitleClassName = "text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-divider-rgb)/0.92)]";
const progressionInfoBodyClassName = "text-[0.78rem] leading-5 text-[rgb(var(--text-secondary)/0.94)]";
const progressionInfoMiniCardClassName = "rounded-[1rem] bg-[rgb(var(--surface-1-rgb)/0.12)] shadow-none";
const progressionInfoMiniCardButtonClassName = "group block w-full select-none appearance-none !border-0 !border-transparent !bg-transparent px-3 pt-3 pb-2 text-center caret-transparent shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0";
const progressionInfoMutedClassName = "text-[0.78rem] leading-5 text-[rgb(var(--text-muted)/0.9)]";

type ActiveProgressionInfoSection =
  | "custom"
  | "progression_method"
  | "regression_method"
  | "deload_settings"
  | "promotion_step_settings"
  | "set_step_settings";

type ActiveProgressionInfoContent = {
  title: string;
  summary: string;
  rows?: Array<{ label: string; value: string }>;
};

function formatTermDefinitionValue(term: {
  meaning: string;
  affects: string;
  example: string;
}) {
  return `Meaning: ${term.meaning} | Affects: ${term.affects} | Example: ${term.example}`;
}

function ProgressionInfoRows({
  rows,
}: {
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <dl className="space-y-2 text-left">
      {rows.map((row) => (
        <div
          key={row.label}
          className="rounded-[0.9rem] border border-[rgb(var(--border-strong)/0.1)] bg-[rgb(var(--surface-1-rgb)/0.14)] px-3 py-2 text-center sm:grid sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-start sm:gap-3 sm:text-left"
        >
          <dt className={cn(progressionInfoBodyClassName, "inline-flex items-center justify-center gap-2 font-semibold text-[rgb(var(--text-primary)/0.96)] sm:justify-start")}>
            <span>{row.label}</span>
            <SignatureDot />
          </dt>
          <dd className={cn(progressionInfoBodyClassName, "min-w-0 pt-1 sm:pt-0")}>
            <AccentDotSeparatedText
              text={row.value}
              className="justify-center text-center sm:justify-start sm:text-left"
              separatorClassName="h-[4px] w-[4px]"
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ProgressionInfoSection({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 space-y-2", className)}>
      <div className="mx-auto w-fit max-w-full space-y-1">
        <p className={progressionInfoTitleClassName}>{title}</p>
        <MetricAccentBar variant="thin" className="w-full opacity-80" />
      </div>
      {children}
    </section>
  );
}

function ProgressionInfoMiniSection({
  title,
  children,
  defaultOpen = false,
  accent = "primary",
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  accent?: "primary" | "secondary";
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className={progressionInfoMiniCardClassName}>
      <button
        type="button"
        className={progressionInfoMiniCardButtonClassName}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span className="grid grid-cols-[1.25rem_minmax(0,1fr)_1.25rem] items-center">
          <span aria-hidden="true" />
          <span
            className={cn(
              progressionInfoTitleClassName,
              "min-w-0 text-center",
              accent === "secondary" ? "text-[rgb(var(--secondary-action-rgb)/0.92)]" : undefined,
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              "flex justify-end transition-colors group-hover:text-[rgb(var(--text-secondary)/0.96)]",
              isOpen ? "text-[rgb(var(--accent-divider-rgb)/0.98)]" : "text-[rgb(var(--text-muted)/0.84)]",
            )}
          >
            {isOpen ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
          </span>
        </span>
        <MetricAccentBar variant="thin" className="mt-1 opacity-80 transition-opacity group-hover:opacity-100" />
      </button>
      {isOpen ? (
        <div className="px-3 pb-3 pt-1">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function ProgressionControlsSection({
  title,
  children,
  accent = "primary",
}: {
  title: ReactNode;
  children: ReactNode;
  accent?: "primary" | "secondary";
}) {
  return (
    <section className={progressionInfoMiniCardClassName}>
      <div className="px-3 pb-3 pt-2.5">
        <div className="mx-auto mb-2 w-fit max-w-full text-center">
          <p
            className={cn(
              progressionInfoTitleClassName,
              "min-w-0 text-center",
              accent === "secondary" ? "text-[rgb(var(--secondary-action-rgb)/0.92)]" : undefined,
            )}
          >
            {title}
          </p>
          <MetricAccentBar variant="thin" className="mt-1 w-full opacity-80" />
        </div>
        {children}
      </div>
    </section>
  );
}

function ProgressionInfoAccordion({
  children,
  currentSectionTitle,
  currentSectionSummary,
  hasSelection,
}: {
  children: ReactNode;
  currentSectionTitle: string;
  currentSectionSummary: string;
  hasSelection: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <RoutineEditorFloatingDropdownChrome
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      title="Info"
      currentSectionTitle={currentSectionTitle}
      currentSectionSummary={currentSectionSummary}
      hasSelection={hasSelection}
    >
      {children}
    </RoutineEditorFloatingDropdownChrome>
  );
}

function RoutineEditorFloatingDropdownChrome({
  children,
  isOpen,
  onOpenChange,
  title,
  currentSectionTitle,
  currentSectionSummary,
  hasSelection = false,
  reserveLayoutSpace = true,
  blockBackground = false,
}: {
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (nextOpen: boolean | ((current: boolean) => boolean)) => void;
  title: string;
  currentSectionTitle?: string;
  currentSectionSummary?: string;
  hasSelection?: boolean;
  reserveLayoutSpace?: boolean;
  blockBackground?: boolean;
}) {
  return (
    <section className="relative pt-2">
      {isOpen && blockBackground ? (
        <button
          type="button"
          aria-label={`Close ${title}`}
          className="fixed inset-0 z-[69] cursor-default bg-transparent"
          onClick={() => onOpenChange(false)}
        />
      ) : null}
      {isOpen ? (
        <div className="fixed inset-x-0 bottom-[calc(var(--app-mobile-bottom-dock-height,0px)+4.75rem)] z-[70] mx-auto w-full max-w-[720px] px-2">
          <div
            className={cn(
              appTokens.exercisePickerFilterPanel,
              "mx-auto max-w-[760px] bg-[rgba(var(--bg-app),0.92)] shadow-[0_22px_60px_rgb(0_0_0_/0.42)] backdrop-blur-[18px]",
            )}
          >
            <FilterScrollPanel viewportClassName="max-h-[min(46dvh,28rem)] space-y-2.5">
              {children}
            </FilterScrollPanel>
          </div>
        </div>
      ) : null}
      {reserveLayoutSpace ? (
        <div
          aria-hidden="true"
          className={isOpen ? "h-[min(52dvh,32rem)]" : "h-[4.25rem]"}
        />
      ) : null}
      <div className="fixed inset-x-0 bottom-[calc(var(--app-mobile-bottom-dock-height,0px)-0.25rem)] z-[75] mx-auto w-full max-w-[720px] px-1">
        <button
            type="button"
            className={cn(
              "group relative block w-full select-none appearance-none !border-0 !bg-[rgba(var(--bg-app),0.82)] px-1 pt-3 pb-2 text-center caret-transparent shadow-none backdrop-blur-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]",
              appTokens.routineEditorInlineTitle,
            )}
          onClick={() => onOpenChange((current) => !current)}
          aria-expanded={isOpen}
        >
          <span className="grid min-h-[2rem] grid-cols-[2rem_minmax(0,1fr)_4rem] items-end px-4 pb-3">
            <span aria-hidden="true" />
            <span className="min-w-0 w-full text-center">
              {hasSelection && !isOpen && currentSectionTitle && currentSectionSummary ? (
                <>
                  <span className="mt-0.5 block truncate text-[0.82rem] font-semibold leading-tight text-[rgb(var(--text-primary)/0.98)]">
                    {currentSectionTitle}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.68rem] font-medium normal-case tracking-[0.02em] text-[rgb(var(--text-secondary)/0.82)]">
                    {currentSectionSummary}
                  </span>
                </>
              ) : (
                <span className="block text-[0.82rem] font-semibold leading-tight text-[rgb(var(--text-primary)/0.98)]">{title}</span>
              )}
            </span>
            <span className={cn(
              "flex items-center justify-end gap-1 transition-colors group-hover:text-[rgb(var(--text-secondary)/0.96)]",
              isOpen ? "text-[rgb(var(--accent-divider-rgb)/0.98)]" : "text-[rgb(var(--text-muted)/0.84)]",
            )}>
              {hasSelection && !isOpen ? (
                <span className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.78)]">
                  {title}
                </span>
              ) : null}
              {isOpen ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
            </span>
          </span>
          <MetricAccentBar variant="thin" className="opacity-85 transition-opacity group-hover:opacity-100" />
        </button>
      </div>
    </section>
  );
}

export function ProgressionPlaybookEditor({
  value,
  onChange,
  weightUnit,
  title = "Progression",
  context = "exercise",
  routineDefaultValue,
  onApplyRoutineDefault,
  showDefaultState = false,
  collapsible = false,
  defaultExpanded = true,
  separateInfoBox = false,
  portalProgressionSettings = false,
  portalTriggerMode = "inline",
  progressionStepLabel,
  progressionStepPolicy,
  visiblePromotionStepFields,
  promotionUiModel,
  targetMutationUiModel,
  showProgressionSettingsRow = true,
  showTargetMutationControls = false,
  showQualificationWindowControls = false,
  extraPanelContent,
  repRangeMin,
  repRangeMax,
  trainingFocusValue = "",
  trainingFocusCustomized = false,
  onTrainingFocusChange,
}: {
  value: ProgressionPlaybookFormState;
  onChange: (nextValue: ProgressionPlaybookFormState) => void;
  weightUnit: "lbs" | "kg";
  title?: string;
  context?: "routine-default" | "exercise";
  routineDefaultValue?: ProgressionPlaybookFormState | null;
  onApplyRoutineDefault?: () => void;
  showDefaultState?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  separateInfoBox?: boolean;
  portalProgressionSettings?: boolean;
  portalTriggerMode?: "inline" | "fixed" | "dock";
  progressionStepLabel?: string | null;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  visiblePromotionStepFields?: PromotionStepFieldId[] | null;
  promotionUiModel?: ProgressionPromotionUiModel | null;
  targetMutationUiModel?: ProgressionTargetMutationUiModel | null;
  showProgressionSettingsRow?: boolean;
  showTargetMutationControls?: boolean;
  showQualificationWindowControls?: boolean;
  extraPanelContent?: ReactNode;
  repRangeMin?: number | null;
  repRangeMax?: number | null;
  trainingFocusValue?: TrainingGoalId | "";
  trainingFocusCustomized?: boolean;
  onTrainingFocusChange?: (goal: TrainingGoalId) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeInfoSection, setActiveInfoSection] = useState<ActiveProgressionInfoSection>("progression_method");
  const [hasInfoSelection, setHasInfoSelection] = useState(false);
  const [customInfoContent, setCustomInfoContent] = useState<ActiveProgressionInfoContent | null>(null);
  const selectedPlaybookId = value.progressionPlaybookId || null;
  const selectedMethodInfo = selectedPlaybookId
    ? PROGRESSION_METHOD_DEFINITIONS[selectedPlaybookId as ProgressionMethodId]
    : PROGRESSION_METHOD_DEFINITIONS.manual;
  const selectedStallPolicyInfo = STALL_POLICY_DEFINITIONS[value.progressionStallPolicy] ?? STALL_POLICY_DEFINITIONS.none;
  const selectedSetFlowInfo = SET_FLOW_DEFINITIONS[value.progressionSetFlow] ?? SET_FLOW_DEFINITIONS.straight_sets;
  const methodOptions = listProgressionMethodDefinitions();
  const setFlowOptions = listSupportedSetFlowDefinitions();
  const stallPolicyOptions = [
    STALL_POLICY_DEFINITIONS.none,
    STALL_POLICY_DEFINITIONS.deload_after_stall,
  ];

  const setPlaybookId = (nextPlaybookId: ProgressionPlaybookId | "") => {
    if (!nextPlaybookId) {
      onChange({
        ...value,
        progressionPlaybookId: "",
        progressionStallPolicy: "none",
      });
      return;
    }

    const nextDefaults = getDefaultProgressionPlaybookConfig(nextPlaybookId);
    const nextState = createProgressionPlaybookFormState({
      playbookId: nextPlaybookId,
      config: nextDefaults,
    });

    onChange({
      ...nextState,
      progressionStallPolicy: value.progressionStallPolicy,
      progressionStallThreshold: value.progressionStallThreshold,
      progressionDeloadPercent: value.progressionDeloadPercent,
      progressionAutoUpdateRoutineGoals: value.progressionAutoUpdateRoutineGoals,
      progressionSetFlow: value.progressionSetFlow,
      progressionPromotionBasis: value.progressionPromotionBasis,
      progressionRepPromotionThreshold: value.progressionRepPromotionThreshold,
      progressionCustomRepPromotionTarget: value.progressionCustomRepPromotionTarget,
    });
  };
  const setStallPolicy = (nextPolicy: ProgressionStallPolicy) => {
    onChange({
      ...value,
      progressionStallPolicy: selectedPlaybookId ? nextPolicy : "none",
    });
  };
  const setFlow = (nextSetFlow: ProgressionPlaybookFormState["progressionSetFlow"]) => {
    onChange({
      ...value,
      progressionSetFlow: nextSetFlow,
    });
  };
  const matchesRoutineDefault = routineDefaultValue
    ? areProgressionPlaybookFormStatesEqual(value, routineDefaultValue)
    : value.progressionPlaybookId === "";
  const showApplyRoutineDefault = context === "exercise"
    && showDefaultState
    && Boolean(routineDefaultValue)
    && !matchesRoutineDefault
    && Boolean(onApplyRoutineDefault);
  const isRoutineDefaultContext = context === "routine-default";
  const shouldRenderProgressionInfo = context === "routine-default";
  const supportsPromotionQualificationControls = isRoutineDefaultContext
    || (context === "exercise" && showDefaultState && Boolean(onApplyRoutineDefault));
  const visiblePromotionStepFieldIds = visiblePromotionStepFields ?? getVisiblePromotionStepFieldIds({
    isRoutineDefaultContext,
    progressionStepPolicy,
  });
  const promotionOptions = promotionUiModel?.visibleOptions ?? [
    {
      id: "weight_only" as const,
      label: "Weight only",
      isSelectable: true,
    },
    {
      id: "reps_only" as const,
      label: "Reps only",
      isSelectable: true,
    },
    {
      id: "weight_and_reps" as const,
      label: "Reps + weight",
      isSelectable: true,
    },
  ];
  const selectedPromotionOptionId: ProgressionPromotionUiOptionId | null = promotionUiModel?.selectedOptionId ?? value.progressionPromotionBasis;
  const targetMutationOptions = targetMutationUiModel?.visibleOptions ?? [];
  const selectedTargetMutationOptionId = targetMutationUiModel?.selectedOptionId ?? value.progressionTargetMutation;
  const targetMutationSummary = targetMutationUiModel?.summary ?? null;
  const selectedQualificationSessionCount = value.progressionRequiredQualifiedSessions;
  const promotionSummary = promotionUiModel?.summary ?? (
    value.progressionPromotionBasis === "weight_only"
      ? "Weight only: Reps are tracked for guidance but do not affect auto-promotion."
      : value.progressionPromotionBasis === "reps_only"
        ? "Reps only: Weight is tracked/manual but does not affect auto-promotion."
        : "Weight + reps: Both dimensions participate in auto-promotion."
  );
  const repsParticipateInPromotion = promotionUiModel?.showsRepThresholdControls ?? usesRepsForPromotion(value.progressionPromotionBasis);
  const resolvedRepRangeMin = typeof repRangeMin === "number" ? repRangeMin : null;
  const resolvedRepRangeMax = typeof repRangeMax === "number" ? repRangeMax : null;
  const repPromotionTarget = repsParticipateInPromotion
    ? getRepPromotionTarget({
      minReps: resolvedRepRangeMin,
      maxReps: resolvedRepRangeMax,
      thresholdType: value.progressionRepPromotionThreshold,
      customTarget: parseOptionalPositiveInteger(value.progressionCustomRepPromotionTarget),
    })
    : null;
  const hasRepRangePreview = repPromotionTarget !== null
    && resolvedRepRangeMin !== null
    && resolvedRepRangeMax !== null;
  const repRangePreviewLabel = hasRepRangePreview
    ? formatRepRangePreview(resolvedRepRangeMin, resolvedRepRangeMax)
    : null;
  const activeRepPromotionPreview = hasRepRangePreview && repRangePreviewLabel
    ? `${repRangePreviewLabel} + ${value.progressionRepPromotionThreshold === "top_half_of_range"
      ? "Top half of range"
      : value.progressionRepPromotionThreshold === "custom"
        ? "Custom rep target"
        : "Top of range"} => ${repPromotionTarget}+ reps`
    : null;
  const customRepTargetInputInvalid = value.progressionRepPromotionThreshold === "custom"
    && parseOptionalPositiveInteger(value.progressionCustomRepPromotionTarget) === null;
  const customRepTargetOutOfRange = value.progressionRepPromotionThreshold === "custom"
    && parseOptionalPositiveInteger(value.progressionCustomRepPromotionTarget) !== null
    && hasRepRangePreview
    && repPromotionTarget !== parseOptionalPositiveInteger(value.progressionCustomRepPromotionTarget);
  const shouldRenderPromotionStepSettings = Boolean(selectedPlaybookId) && visiblePromotionStepFieldIds.length > 0;
  const shouldRenderDeloadSettings = Boolean(selectedPlaybookId) && value.progressionStallPolicy === "deload_after_stall";
  const shouldRenderSetStepSettings = Boolean(selectedPlaybookId) && (isRoutineDefaultContext || value.progressionSetFlow !== "straight_sets");
  const shouldRenderProgressionSettingsRow = showProgressionSettingsRow && (shouldRenderPromotionStepSettings || shouldRenderDeloadSettings || shouldRenderSetStepSettings);
  const keyTermRows = PROGRESSION_INFO_TERM_DEFINITIONS
    .filter((term) => ["Sets", "Min reps", "Max reps", "Load", "Progression step", "Duration step", "Distance step", "Pace / volume step", "Equipment step", "Sets flow", "Stall", "Deload"].includes(term.term))
    .map((term) => ({
      label: term.term,
      value: formatTermDefinitionValue(term),
    }));
  const resolvedProgressionStepLabel = progressionStepLabel ?? `STEP (${weightUnit})`;
  const getPromotionStepInfoRows = (): Array<{ label: string; value: string }> => {
    const rowsByFieldId: Record<PromotionStepFieldId, { label: string; value: string }> = {
      barbellLoad: { label: "Barbell", value: `${value.progressionBarbellLoadIncrement || "-"} ${weightUnit}` },
      dumbbellLoad: { label: "Dumbbell", value: `${value.progressionDumbbellLoadIncrement || "-"} ${weightUnit}` },
      machineLoad: { label: "Machine", value: `${value.progressionMachineLoadIncrement || "-"} ${weightUnit}` },
      cableLoad: { label: "Cable", value: `${value.progressionCableLoadIncrement || "-"} ${weightUnit}` },
      genericLoad: { label: "Load", value: `${value.progressionLoadIncrement || "-"} ${weightUnit}` },
      bodyweightReps: { label: "Bodyweight reps", value: `+${value.progressionBodyweightRepIncrement || "-"} rep` },
      duration: { label: "Duration", value: `+${value.progressionDurationIncrementSeconds || "-"}s` },
      distance: { label: "Distance", value: `+${value.progressionDistanceIncrement || "-"}` },
    };

    return visiblePromotionStepFieldIds.map((fieldId) => rowsByFieldId[fieldId]);
  };
  useEffect(() => {
    const handleRoutineEditorInfo = (event: Event) => {
      const payload = (event as CustomEvent<ActiveProgressionInfoContent>).detail;
      if (!payload?.title || !payload.summary) {
        return;
      }

      setCustomInfoContent(payload);
      setActiveInfoSection("custom");
      setHasInfoSelection(true);
    };

    window.addEventListener("fitness:routine-editor-info", handleRoutineEditorInfo);
    return () => window.removeEventListener("fitness:routine-editor-info", handleRoutineEditorInfo);
  }, []);

  const activeInfoContent = (() => {
    if (activeInfoSection === "custom" && customInfoContent) {
      return customInfoContent;
    }

    switch (activeInfoSection) {
      case "regression_method":
        return {
          title: "Regression",
          summary: selectedPlaybookId
            ? "Controls recovery after repeated misses. None leaves the target alone; Deload can lower the target so the lift can rebuild."
            : "Regression stays off while progression is manual because the app is not generating progression changes for this target.",
          rows: [
            { label: "Selected", value: selectedStallPolicyInfo.label },
            { label: "Effect", value: selectedStallPolicyInfo.whatItDoes },
            { label: "Safety", value: "A deload never applies silently; it appears as an update that still needs review." },
          ],
        };
      case "deload_settings":
        return {
          title: "Deload Settings",
          summary: "These fields define how many misses count as a stall and how far the target drops when a deload update is earned.",
          rows: [
            { label: "Deload", value: `${value.progressionStallThreshold || "-"} missed attempts` },
            { label: "Deload", value: `${value.progressionDeloadPercent || "-"}% target reduction` },
            { label: "Applies to", value: "The measured target for the exercise, usually load for strength work." },
          ],
        };
      case "promotion_step_settings":
        return {
          title: "Promotion Step Settings",
          summary: "These defaults decide the size of the next target jump after the exercise has enough logged proof to qualify.",
          rows: getPromotionStepInfoRows(),
        };
      case "set_step_settings":
        return {
          title: "Set Step Settings",
          summary: "Sets flow step settings change the suggested load/reps from one live set to the next. They affect quick log and the auto-filled next set, not promotion math.",
          rows: [
            { label: "Flow", value: selectedSetFlowInfo.label },
            { label: "Session effect", value: "Affects quick log and next-set defaults while logging the workout." },
            { label: "Step", value: `Load ${value.progressionSetFlowLoadStep || "-"} ${weightUnit} | Reps ${value.progressionSetFlowRepStep || "-"} | Time ${value.progressionSetFlowDurationStep || "-"}s | Distance ${value.progressionSetFlowDistanceStep || "-"}` },
            { label: "Straight sets", value: "Uses the same target across sets, so set-step settings are not needed on exercise-level screens." },
          ],
        };
      case "progression_method":
      default:
        return {
          title: "Progression",
          summary: "Controls whether targets stay exactly where you set them or move through the deterministic progression engine after logged proof.",
          rows: [
            { label: "Selected", value: selectedMethodInfo.label },
            { label: "Effect", value: selectedMethodInfo.id === "manual" ? "Uses the goal you enter. No automatic target changes." : selectedMethodInfo.whatItDoes },
            { label: "Review", value: "Earned updates appear for approval. Applying or reverting is explicit." },
          ],
        };
    }
  })();
  const getInfoSectionHandlers = (section: ActiveProgressionInfoSection) => ({
    onFocusCapture: () => {
      setCustomInfoContent(null);
      setActiveInfoSection(section);
      setHasInfoSelection(true);
    },
    onPointerDownCapture: () => {
      setCustomInfoContent(null);
      setActiveInfoSection(section);
      setHasInfoSelection(true);
    },
  });
  const setProgressionHeaderInfo = () => {
    setCustomInfoContent({
      title: "Progression",
      summary: "Settings that control target progression, deload behavior, promotion steps, and set-step suggestions.",
    });
    setActiveInfoSection("custom");
    setHasInfoSelection(true);
  };
  const setPromotionBasis = (promotionBasis: ProgressionPlaybookFormState["progressionPromotionBasis"]) => {
    onChange({
      ...value,
      progressionPromotionBasis: promotionBasis,
      progressionHasExplicitTargetMutation: shouldPersistExplicitTargetMutation({
        targetMutation: value.progressionTargetMutation,
        promotionBasis,
      }),
    });
  };
  const setRepPromotionThreshold = (repPromotionThreshold: ProgressionPlaybookFormState["progressionRepPromotionThreshold"]) => {
    onChange({
      ...value,
      progressionRepPromotionThreshold: repPromotionThreshold,
    });
  };
  const setCustomRepPromotionTarget = (nextValue: string) => {
    onChange({
      ...value,
      progressionCustomRepPromotionTarget: nextValue,
    });
  };
  const setTargetMutation = (targetMutation: ProgressionPlaybookFormState["progressionTargetMutation"]) => {
    onChange({
      ...value,
      progressionTargetMutation: targetMutation,
      progressionHasExplicitTargetMutation: shouldPersistExplicitTargetMutation({
        targetMutation,
        promotionBasis: value.progressionPromotionBasis,
      }),
    });
  };
  const setRequiredQualifiedSessions = (requiredQualifiedSessions: string) => {
    onChange({
      ...value,
      progressionRequiredQualifiedSessions: requiredQualifiedSessions,
      progressionQualificationWindowMode: DEFAULT_QUALIFICATION_WINDOW_MODE,
      progressionQualificationWindowResetOnMiss: false,
      progressionHasExplicitQualificationWindow: requiredQualifiedSessions !== "1",
    });
  };
  const renderPromotionStepField = (fieldId: PromotionStepFieldId) => {
    switch (fieldId) {
      case "barbellLoad":
        return (
          <ProgressionNumberField
            label={`BARBELL (${weightUnit})`}
            name="progressionBarbellLoadIncrement"
            inputMode="decimal"
            value={value.progressionBarbellLoadIncrement}
            onChange={(nextValue) => onChange({ ...value, progressionBarbellLoadIncrement: nextValue })}
          />
        );
      case "dumbbellLoad":
        return (
          <ProgressionNumberField
            label={`DUMBBELL (${weightUnit})`}
            name="progressionDumbbellLoadIncrement"
            inputMode="decimal"
            value={value.progressionDumbbellLoadIncrement}
            onChange={(nextValue) => onChange({ ...value, progressionDumbbellLoadIncrement: nextValue })}
          />
        );
      case "machineLoad":
        return (
          <ProgressionNumberField
            label={`MACHINE (${weightUnit})`}
            name="progressionMachineLoadIncrement"
            inputMode="decimal"
            value={value.progressionMachineLoadIncrement}
            onChange={(nextValue) => onChange({ ...value, progressionMachineLoadIncrement: nextValue })}
          />
        );
      case "cableLoad":
        return (
          <ProgressionNumberField
            label={`CABLE (${weightUnit})`}
            name="progressionCableLoadIncrement"
            inputMode="decimal"
            value={value.progressionCableLoadIncrement}
            onChange={(nextValue) => onChange({ ...value, progressionCableLoadIncrement: nextValue })}
          />
        );
      case "genericLoad":
        return (
          <ProgressionNumberField
            label={resolvedProgressionStepLabel}
            name="progressionLoadIncrement"
            inputMode="decimal"
            value={value.progressionLoadIncrement}
            onChange={(nextValue) => onChange({ ...value, progressionLoadIncrement: nextValue })}
          />
        );
      case "bodyweightReps":
        return (
          <ProgressionNumberField
            label="BODYWEIGHT REPS"
            name="progressionBodyweightRepIncrement"
            inputMode="numeric"
            value={value.progressionBodyweightRepIncrement}
            onChange={(nextValue) => onChange({ ...value, progressionBodyweightRepIncrement: nextValue })}
          />
        );
      case "duration":
        return (
          <ProgressionNumberField
            label="DURATION (S)"
            name="progressionDurationIncrementSeconds"
            inputMode="numeric"
            value={value.progressionDurationIncrementSeconds}
            onChange={(nextValue) => onChange({ ...value, progressionDurationIncrementSeconds: nextValue })}
          />
        );
      case "distance":
        return (
          <ProgressionNumberField
            label="DISTANCE"
            name="progressionDistanceIncrement"
            inputMode="decimal"
            value={value.progressionDistanceIncrement}
            onChange={(nextValue) => onChange({ ...value, progressionDistanceIncrement: nextValue })}
          />
        );
      default:
        return null;
    }
  };
  const progressionSettingsGroupTitleClassName = "mx-auto w-fit max-w-full space-y-1 text-center";
  const progressionSettingsGroupLabelClassName = "text-[9.5px] font-semibold uppercase tracking-[0.15em]";
  const progressionSettingsFieldRowClassName = "flex w-max flex-nowrap items-center justify-center gap-1.5";
  const renderProgressionSettingsRow = () => {
    if (!shouldRenderProgressionSettingsRow) {
      return null;
    }

    const fieldGroups: Array<{
      key: string;
      title: string;
      tone: "primary" | "secondary";
      infoSection: ActiveProgressionInfoSection;
      fields: ReactNode[];
    }> = [];

    if (shouldRenderPromotionStepSettings) {
      const promotionFields = visiblePromotionStepFieldIds.map((fieldId) => (
        <div key={fieldId} className="w-[8.25rem] shrink-0">
          {renderPromotionStepField(fieldId)}
        </div>
      ));

      if (promotionFields.length > 0) {
        fieldGroups.push({
          key: "promotion-step-settings",
          title: "Promotion Step Settings",
          tone: "primary",
          infoSection: "promotion_step_settings",
          fields: promotionFields,
        });
      }
    }

    if (shouldRenderSetStepSettings) {
      fieldGroups.push({
        key: "set-step-settings",
        title: "Set Step Settings",
        tone: "primary",
        infoSection: "set_step_settings",
        fields: [
          <div key="set-load" className="w-[8.25rem] shrink-0">
            <ProgressionNumberField
              label={`SET LOAD (${weightUnit})`}
              name="progressionSetFlowLoadStep"
              inputMode="decimal"
              value={value.progressionSetFlowLoadStep}
              onChange={(nextValue) => onChange({ ...value, progressionSetFlowLoadStep: nextValue })}
            />
          </div>,
          <div key="set-reps" className="w-[8.25rem] shrink-0">
            <ProgressionNumberField
              label="SET REPS"
              name="progressionSetFlowRepStep"
              inputMode="numeric"
              value={value.progressionSetFlowRepStep}
              onChange={(nextValue) => onChange({ ...value, progressionSetFlowRepStep: nextValue })}
            />
          </div>,
          <div key="set-time" className="w-[8.25rem] shrink-0">
            <ProgressionNumberField
              label="SET TIME (S)"
              name="progressionSetFlowDurationStep"
              inputMode="numeric"
              value={value.progressionSetFlowDurationStep}
              onChange={(nextValue) => onChange({ ...value, progressionSetFlowDurationStep: nextValue })}
            />
          </div>,
          <div key="set-distance" className="w-[8.25rem] shrink-0">
            <ProgressionNumberField
              label="SET DISTANCE"
              name="progressionSetFlowDistanceStep"
              inputMode="decimal"
              value={value.progressionSetFlowDistanceStep}
              onChange={(nextValue) => onChange({ ...value, progressionSetFlowDistanceStep: nextValue })}
            />
          </div>,
        ],
      });
    }

    if (shouldRenderDeloadSettings) {
      fieldGroups.push({
        key: "deload-settings",
        title: "Deload Settings",
        tone: "secondary",
        infoSection: "deload_settings",
        fields: [
          <div key="miss-count" className="w-[8.25rem] shrink-0">
            <ProgressionNumberField
              label="MISS COUNT"
              name="progressionStallThreshold"
              inputMode="numeric"
              value={value.progressionStallThreshold}
              onChange={(nextValue) => onChange({
                ...value,
                progressionStallThreshold: nextValue,
              })}
            />
          </div>,
          <div key="deload-percent" className="w-[8.25rem] shrink-0">
            <ProgressionNumberField
              label="DELOAD %"
              name="progressionDeloadPercent"
              inputMode="decimal"
              value={value.progressionDeloadPercent}
              onChange={(nextValue) => onChange({
                ...value,
                progressionDeloadPercent: nextValue,
              })}
            />
          </div>,
        ],
      });
    }

    if (fieldGroups.length === 0) {
      return null;
    }

    const orderedFieldGroups = fieldGroups.sort((left, right) => {
      const order: Record<string, number> = {
        "promotion-step-settings": 0,
        "set-step-settings": 1,
        "deload-settings": 2,
      };
      return (order[left.key] ?? 99) - (order[right.key] ?? 99);
    });

    return (
      <section className="pt-1.5">
        <div className="hide-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1.5 pt-1 [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]">
          <div className="mx-auto flex min-w-full w-max flex-nowrap items-center justify-center gap-1.5 px-1">
            {orderedFieldGroups.map((group, groupIndex) => (
              <div key={group.key} className="flex shrink-0 flex-nowrap items-stretch gap-2">
                {groupIndex > 0 ? (
                  <span className="mx-1.5 flex shrink-0 self-stretch items-center" aria-hidden="true">
                    <span className="block h-[3.7rem] w-px rounded-full bg-[rgb(var(--accent-divider-rgb)/0.52)]" />
                  </span>
                ) : null}
                <div className="shrink-0 space-y-2" {...getInfoSectionHandlers(group.infoSection)}>
                  <div className={progressionSettingsGroupTitleClassName}>
                    <p className={cn(
                      progressionSettingsGroupLabelClassName,
                      group.tone === "secondary"
                        ? "text-[rgb(var(--secondary-action-rgb)/0.9)]"
                        : "text-[rgb(var(--accent-divider-rgb)/0.9)]",
                    )}>
                      {group.title}
                    </p>
                    <MetricAccentBar variant="thin" className="w-full opacity-85" />
                  </div>
                  <div className={progressionSettingsFieldRowClassName}>
                    {group.fields}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };
  const progressionInfoBox = (
    <div className="rounded-[1.1rem] border border-transparent bg-[rgb(var(--surface-1-rgb)/0.2)] px-2 py-3 text-left">
      <div className="space-y-2.5">
        <ProgressionInfoMiniSection title="Routine setup" defaultOpen>
          <ProgressionInfoRows
            rows={[
              { label: "Cycle Start", value: "Calendar date that anchors Day 1. Changing it shifts which routine day appears on Today." },
              { label: "Weekday chips", value: "Tap a weekday to move Day 1 inside the currently selected calendar week." },
              { label: "Cycle Length", value: "Number of days before the routine repeats. This drives Today rotation and cycle review timing." },
              { label: "Timezone", value: "Controls day rollover for Today, session grouping, and routine occurrence dates." },
              { label: "Units", value: "Default weight and distance units used for target display and logged workout values." },
            ]}
          />
        </ProgressionInfoMiniSection>

        <ProgressionInfoMiniSection
          title={(
            <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 text-center">
              <span>Progression type</span>
              <SignatureMiniPipe />
              <span className="text-[rgb(var(--secondary-action-rgb)/0.94)]">{selectedMethodInfo.label}</span>
            </span>
          )}
          defaultOpen
        >
          <ProgressionInfoRows
            rows={[
              { label: "What it does", value: selectedMethodInfo.id === "manual" ? "Uses the target you enter. No automatic target changes are generated." : selectedMethodInfo.whatItDoes },
              { label: "Use it for", value: selectedMethodInfo.id === "manual" ? "Anything you want to control directly." : selectedMethodInfo.useItFor },
              { label: "Promotion proof", value: "The app only suggests updates from completed logged work, not from planned targets alone." },
              { label: "Apply/Revert", value: "Ready updates require approval, keep a quick undo pin, and can be locked in once you train on the new target." },
            ]}
          />
        </ProgressionInfoMiniSection>

        {selectedPlaybookId ? (
          <ProgressionInfoMiniSection
            title={(
              <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 text-center">
                <span className="text-[rgb(var(--accent-divider-rgb)/0.92)]">Regression Type</span>
                <SignatureMiniPipe />
                <span className="text-[rgb(var(--secondary-action-rgb)/0.94)]">{selectedStallPolicyInfo.label}</span>
              </span>
            )}
            accent="secondary"
          >
            <ProgressionInfoRows
              rows={[
                { label: "What it does", value: selectedStallPolicyInfo.whatItDoes },
                { label: "Use it for", value: selectedStallPolicyInfo.useItFor },
                { label: "When it runs", value: "Only after repeated misses against the current target. Deleted evidence recomputes status but does not silently rewrite goals." },
                { label: "Review", value: "A deload candidate is still an explicit update; it is not auto-applied from the settings screen." },
              ]}
            />
          </ProgressionInfoMiniSection>
        ) : null}

        <ProgressionInfoMiniSection title="Promotion Step Settings">
          <ProgressionInfoRows
            rows={[
              { label: "Purpose", value: "Controls how far the next target moves after the exercise qualifies." },
              { label: "Load steps", value: "Barbell, dumbbell, machine, and cable defaults let equipment progress at different sizes." },
              { label: "Bodyweight reps", value: "Reps-only bodyweight work can progress by rep target instead of load." },
              { label: "Cardio metrics", value: "Duration and distance steps apply to time, distance, and time-plus-distance targets." },
              { label: "Vector rule", value: "The exercise measurement decides which step is compatible. Old load steps are ignored for cardio vectors." },
            ]}
          />
        </ProgressionInfoMiniSection>

        <ProgressionInfoMiniSection title="Set Step Settings">
          <ProgressionInfoRows
            rows={[
              { label: "Purpose", value: "Controls how load and reps change from one set to the next during live logging." },
              { label: "Quick Log", value: "Quick Log uses these settings to suggest the next set when the sets flow is not straight sets." },
              { label: "Live sets", value: "The next blank set can auto-load adjusted reps/load based on the previous logged set." },
              { label: "Straight sets", value: "Straight sets use the same target across work sets, so exercise-level set steps stay hidden." },
              { label: "Scope", value: "Set steps affect session suggestions. They do not change promotion qualification or target updates." },
            ]}
          />
        </ProgressionInfoMiniSection>

        <ProgressionInfoMiniSection title="Deload Settings">
          <ProgressionInfoRows
            rows={[
              { label: "Deload", value: "How many missed attempts count before a deload candidate can be suggested." },
              { label: "Deload percent", value: "How far the measured target drops when the deload update is reviewed and applied." },
              { label: "No silent edits", value: "Deleting a session can invalidate evidence, but it does not automatically revert routine targets." },
            ]}
          />
        </ProgressionInfoMiniSection>

        <ProgressionInfoMiniSection title="Progression terms">
          <ProgressionInfoRows rows={keyTermRows} />
        </ProgressionInfoMiniSection>

        <ProgressionInfoMiniSection title="Sets Flow">
          <ProgressionInfoRows
            rows={[
              {
                label: SET_FLOW_DEFINITIONS.straight_sets.label,
                value: `${SET_FLOW_DEFINITIONS.straight_sets.shortExplanation} Best for normal sets where each work set uses the same target.`,
              },
              {
                label: SET_FLOW_DEFINITIONS.ascending_ramp.label,
                value: `${SET_FLOW_DEFINITIONS.ascending_ramp.shortExplanation} Set step settings define the per-set load/reps movement.`,
              },
              {
                label: SET_FLOW_DEFINITIONS.descending_backoff.label,
                value: `${SET_FLOW_DEFINITIONS.descending_backoff.shortExplanation} Useful when the first set is heaviest and later sets back off.`,
              },
              {
                label: "Current flow",
                value: `${selectedSetFlowInfo.label}: ${selectedSetFlowInfo.shortExplanation}`,
              },
            ]}
          />
        </ProgressionInfoMiniSection>
      </div>
    </div>
  );
  const progressionControlsContent = (
    <div className="rounded-[1.1rem] border border-transparent bg-[rgb(var(--surface-1-rgb)/0.2)] px-2 py-3 text-left">
      <div className="space-y-2.5">
        <section className={progressionInfoMiniCardClassName}>
          <div className="px-3 pb-3 pt-2.5">
          <div className="overflow-x-auto pb-1 pt-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto flex w-max min-w-max items-start justify-center gap-3">
              <div {...getInfoSectionHandlers("progression_method")}>
                <div className="mx-auto mb-1 w-fit max-w-full text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-divider-rgb)/0.9)]">Progression</p>
                  <MetricAccentBar variant="thin" className="w-full opacity-85" />
                </div>
                <div className={cn(ACTION_CHROME_RAIL_CLASS_NAME, "mx-auto flex w-max min-w-max flex-row flex-nowrap items-stretch justify-center gap-1")}>
                  {methodOptions.map((option) => {
                    const isActive = option.id === "manual"
                      ? value.progressionPlaybookId === ""
                      : value.progressionPlaybookId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPlaybookId(option.id === "manual" ? "" : option.id)}
                        data-action-chrome-intent={isActive ? "positive" : "neutral"}
                        data-action-chrome-selected={isActive ? "true" : undefined}
                        data-action-chrome-segmented="true"
                        className={cn(
                          ACTION_CHROME_CONTROL_CLASS_NAME,
                          ACTION_CHROME_SEGMENTED_CLASS_NAME,
                          "min-h-10 min-w-[6.9rem] rounded-[var(--action-chrome-segment-radius-compact)] px-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] focus-visible:ring-[rgb(var(--accent)/0.2)]",
                          isActive
                            ? "border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] text-[rgb(var(--text-primary))] shadow-[var(--action-chrome-shadow-hover)]"
                            : "text-[rgb(var(--text-secondary)/0.9)]",
                        )}
                        aria-pressed={isActive}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedPlaybookId ? (
                <div {...getInfoSectionHandlers("regression_method")}>
                  <div className="mx-auto mb-1 w-fit max-w-full text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--secondary-action-rgb)/0.9)]">Regression</p>
                    <MetricAccentBar variant="thin" className="w-full opacity-85" />
                  </div>
                  <div className={cn(ACTION_CHROME_RAIL_CLASS_NAME, "mx-auto flex w-max min-w-max flex-row flex-nowrap items-stretch justify-center gap-1")}>
                    {stallPolicyOptions.map((option) => {
                      const isActive = value.progressionStallPolicy === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setStallPolicy(option.id)}
                          data-action-chrome-intent={isActive ? "positive" : "neutral"}
                          data-action-chrome-selected={isActive ? "true" : undefined}
                          data-action-chrome-segmented="true"
                          className={cn(
                            ACTION_CHROME_CONTROL_CLASS_NAME,
                            ACTION_CHROME_SEGMENTED_CLASS_NAME,
                            "min-h-10 min-w-[6.9rem] rounded-[var(--action-chrome-segment-radius-compact)] px-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] focus-visible:ring-[rgb(var(--accent)/0.2)]",
                            isActive
                              ? "border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] text-[rgb(var(--text-primary))] shadow-[var(--action-chrome-shadow-hover)]"
                              : "text-[rgb(var(--text-secondary)/0.9)]",
                          )}
                          aria-pressed={isActive}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          </div>
        </section>

        {selectedPlaybookId && !isRoutineDefaultContext ? (
          <ProgressionControlsSection title="Sets Flow">
            <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" {...getInfoSectionHandlers("set_step_settings")}>
              <div className={cn(ACTION_CHROME_RAIL_CLASS_NAME, ACTION_CHROME_RAIL_GRID_CLASS_NAME, "mx-auto w-max min-w-max justify-center")}>
                {setFlowOptions.map((option) => {
                  const isActive = value.progressionSetFlow === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFlow(option.id)}
                      data-action-chrome-intent={isActive ? "positive" : "neutral"}
                      data-action-chrome-selected={isActive ? "true" : undefined}
                      data-action-chrome-segmented="true"
                      className={cn(
                        ACTION_CHROME_CONTROL_CLASS_NAME,
                        ACTION_CHROME_SEGMENTED_CLASS_NAME,
                        "min-h-10 min-w-[7.15rem] rounded-[var(--action-chrome-segment-radius-compact)] px-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] focus-visible:ring-[rgb(var(--accent)/0.2)]",
                        isActive
                          ? "border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] text-[rgb(var(--text-primary))] shadow-[var(--action-chrome-shadow-hover)]"
                          : "text-[rgb(var(--text-secondary)/0.9)]",
                      )}
                      aria-pressed={isActive}
                    >
                      {formatSetFlowButtonLabel(option.label)}
                    </button>
                  );
                })}
              </div>
            </div>
          </ProgressionControlsSection>
        ) : null}

        {selectedPlaybookId && supportsPromotionQualificationControls && promotionOptions.length > 0 ? (
          <ProgressionControlsSection title="Promotion uses">
            <div className="space-y-2" {...getInfoSectionHandlers("progression_method")}>
              <div className={cn(ACTION_CHROME_RAIL_CLASS_NAME, ACTION_CHROME_RAIL_GRID_CLASS_NAME, "mx-auto w-max min-w-max justify-center")}>
                {promotionOptions.map((option) => {
                  const isActive = selectedPromotionOptionId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        if (option.isSelectable) {
                          setPromotionBasis(option.id as ProgressionPlaybookFormState["progressionPromotionBasis"]);
                        }
                      }}
                      disabled={!option.isSelectable}
                      data-action-chrome-intent={isActive ? "positive" : "neutral"}
                      data-action-chrome-selected={isActive ? "true" : undefined}
                      data-action-chrome-segmented="true"
                      className={cn(
                        ACTION_CHROME_CONTROL_CLASS_NAME,
                        ACTION_CHROME_SEGMENTED_CLASS_NAME,
                        "min-h-10 min-w-[7.2rem] rounded-[var(--action-chrome-segment-radius-compact)] px-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] focus-visible:ring-[rgb(var(--accent)/0.2)]",
                        isActive
                          ? "border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] text-[rgb(var(--text-primary))] shadow-[var(--action-chrome-shadow-hover)]"
                          : "text-[rgb(var(--text-secondary)/0.9)]",
                        !option.isSelectable ? "cursor-default opacity-100" : undefined,
                      )}
                      aria-pressed={isActive}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {promotionSummary ? (
                <p className="px-1 text-center text-[0.72rem] leading-5 text-[rgb(var(--text-secondary)/0.9)]">
                  {promotionSummary}
                </p>
              ) : null}
            </div>
          </ProgressionControlsSection>
        ) : null}

        {showTargetMutationControls && selectedPlaybookId && supportsPromotionQualificationControls && targetMutationOptions.length > 0 ? (
          <ProgressionControlsSection title="Target changes">
            <div className="space-y-2" {...getInfoSectionHandlers("progression_method")}>
              <div className={cn(ACTION_CHROME_RAIL_CLASS_NAME, ACTION_CHROME_RAIL_GRID_CLASS_NAME, "mx-auto w-max min-w-max justify-center")}>
                {targetMutationOptions.map((option) => {
                  const isActive = selectedTargetMutationOptionId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        if (option.isSelectable) {
                          setTargetMutation(option.id);
                        }
                      }}
                      disabled={!option.isSelectable}
                      data-action-chrome-intent={isActive ? "positive" : "neutral"}
                      data-action-chrome-selected={isActive ? "true" : undefined}
                      data-action-chrome-segmented="true"
                      className={cn(
                        ACTION_CHROME_CONTROL_CLASS_NAME,
                        ACTION_CHROME_SEGMENTED_CLASS_NAME,
                        "min-h-10 min-w-[7.6rem] rounded-[var(--action-chrome-segment-radius-compact)] px-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] focus-visible:ring-[rgb(var(--accent)/0.2)]",
                        isActive
                          ? "border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] text-[rgb(var(--text-primary))] shadow-[var(--action-chrome-shadow-hover)]"
                          : "text-[rgb(var(--text-secondary)/0.9)]",
                        !option.isSelectable ? "cursor-default opacity-100" : undefined,
                      )}
                      aria-pressed={isActive}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {targetMutationSummary ? (
                <p className="px-1 text-center text-[0.72rem] leading-5 text-[rgb(var(--text-secondary)/0.9)]">
                  {targetMutationSummary}
                </p>
              ) : null}
            </div>
          </ProgressionControlsSection>
        ) : null}

        {showQualificationWindowControls && selectedPlaybookId && supportsPromotionQualificationControls ? (
          <ProgressionControlsSection title="Require successful sessions">
            <div className="space-y-2" {...getInfoSectionHandlers("progression_method")}>
              <div className={cn(ACTION_CHROME_RAIL_CLASS_NAME, ACTION_CHROME_RAIL_GRID_CLASS_NAME, "mx-auto w-max min-w-max justify-center")}>
                {QUALIFICATION_SESSION_COUNT_OPTIONS.map((count) => {
                  const countValue = String(count);
                  const isActive = selectedQualificationSessionCount === countValue;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setRequiredQualifiedSessions(countValue)}
                      data-action-chrome-intent={isActive ? "positive" : "neutral"}
                      data-action-chrome-selected={isActive ? "true" : undefined}
                      data-action-chrome-segmented="true"
                      className={cn(
                        ACTION_CHROME_CONTROL_CLASS_NAME,
                        ACTION_CHROME_SEGMENTED_CLASS_NAME,
                        "min-h-10 min-w-[4.5rem] rounded-[var(--action-chrome-segment-radius-compact)] px-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] focus-visible:ring-[rgb(var(--accent)/0.2)]",
                        isActive
                          ? "border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] text-[rgb(var(--text-primary))] shadow-[var(--action-chrome-shadow-hover)]"
                          : "text-[rgb(var(--text-secondary)/0.9)]",
                      )}
                      aria-pressed={isActive}
                    >
                      {count}
                    </button>
                  );
                })}
              </div>
            </div>
          </ProgressionControlsSection>
        ) : null}

        {selectedPlaybookId && supportsPromotionQualificationControls && repsParticipateInPromotion ? (
          <ProgressionControlsSection title="Rep target for promotion">
            <div className="space-y-2" {...getInfoSectionHandlers("progression_method")}>
              <div className={cn(ACTION_CHROME_RAIL_CLASS_NAME, ACTION_CHROME_RAIL_GRID_CLASS_NAME, "mx-auto w-max min-w-max justify-center")}>
                {[
                  {
                    id: "top_of_range" as const,
                    label: "Top of range",
                  },
                  {
                    id: "top_half_of_range" as const,
                    label: "Top half of range",
                  },
                  {
                    id: "custom" as const,
                    label: "Custom rep target",
                  },
                ].map((option) => {
                  const isActive = value.progressionRepPromotionThreshold === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setRepPromotionThreshold(option.id)}
                      data-action-chrome-intent={isActive ? "positive" : "neutral"}
                      data-action-chrome-selected={isActive ? "true" : undefined}
                      data-action-chrome-segmented="true"
                      className={cn(
                        ACTION_CHROME_CONTROL_CLASS_NAME,
                        ACTION_CHROME_SEGMENTED_CLASS_NAME,
                        "min-h-10 min-w-[7.5rem] rounded-[var(--action-chrome-segment-radius-compact)] px-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] focus-visible:ring-[rgb(var(--accent)/0.2)]",
                        isActive
                          ? "border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] text-[rgb(var(--text-primary))] shadow-[var(--action-chrome-shadow-hover)]"
                          : "text-[rgb(var(--text-secondary)/0.9)]",
                      )}
                      aria-pressed={isActive}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {value.progressionRepPromotionThreshold === "custom" ? (
                <div className="mx-auto max-w-[8.25rem]">
                  <ProgressionNumberField
                    label="CUSTOM REPS"
                    name="progressionCustomRepPromotionTarget"
                    inputMode="numeric"
                    value={value.progressionCustomRepPromotionTarget}
                    onChange={setCustomRepPromotionTarget}
                  />
                </div>
              ) : null}
              {activeRepPromotionPreview ? (
                <p className="px-1 text-center text-[0.72rem] leading-5 text-[rgb(var(--text-secondary)/0.9)]">
                  {activeRepPromotionPreview}
                </p>
              ) : hasRepRangePreview ? null : (
                <p className="px-1 text-center text-[0.72rem] leading-5 text-[rgb(var(--text-secondary)/0.9)]">
                  Add a rep range on the exercise goal to preview the promotion target.
                </p>
              )}
              {customRepTargetInputInvalid ? (
                <p className="px-1 text-center text-[0.7rem] leading-5 text-[rgb(var(--secondary-action-rgb)/0.9)]">
                  Enter a numeric rep target. Invalid custom values fall back to top of range.
                </p>
              ) : customRepTargetOutOfRange && repRangePreviewLabel ? (
                <p className="px-1 text-center text-[0.7rem] leading-5 text-[rgb(var(--secondary-action-rgb)/0.9)]">
                  Custom rep target should fit inside {repRangePreviewLabel}. Out-of-range values fall back to top of range.
                </p>
              ) : null}
            </div>
          </ProgressionControlsSection>
        ) : null}

        {shouldRenderProgressionSettingsRow ? (
          renderProgressionSettingsRow()
        ) : null}

        {extraPanelContent ? (
          <div className="pt-1">
            {extraPanelContent}
          </div>
        ) : null}

        {!separateInfoBox && shouldRenderProgressionInfo ? progressionInfoBox : null}
      </div>
    </div>
  );
  const fixedPortalTriggerBottomClassName = "bottom-[calc(var(--bottom-actions-height,var(--app-mobile-bottom-dock-height,0px))-0.25rem)]";
  const fixedPortalPanelBottomClassName = "bottom-[calc(var(--bottom-actions-height,var(--app-mobile-bottom-dock-height,0px))+4.75rem)]";
  const progressionFloatingBottomOffsetClassName = portalTriggerMode === "fixed"
    ? fixedPortalPanelBottomClassName
    : "bottom-[calc(var(--bottom-actions-height,var(--app-mobile-bottom-dock-height,0px))+0.02rem)]";
  const dockPortalOverlay = (
    <div className="absolute inset-x-0 bottom-[calc(100%+0.35rem)] z-[90] mx-auto w-full px-1">
      <div
        className={cn(
          appTokens.exercisePickerFilterPanel,
          "relative isolate mx-auto max-w-[760px] overflow-hidden !bg-[rgb(var(--bg-app))] shadow-[0_22px_60px_rgb(0_0_0_/0.42)] backdrop-blur-none",
        )}
      >
        <div className="pointer-events-none absolute inset-0 z-0 bg-[rgb(var(--bg-app))]" aria-hidden="true" />
        <FilterScrollPanel
          className="relative z-[1] !bg-[rgb(var(--bg-app))]"
          showEdgeFades={false}
          viewportClassName="max-h-[min(46dvh,28rem)] space-y-2.5"
        >
          <div className={cn(appTokens.routineEditorCompactStack, "space-y-2.5")}>
            {progressionControlsContent}
          </div>
        </FilterScrollPanel>
      </div>
    </div>
  );

  const progressionFloatingOverlay = (
    <div className={cn("fixed inset-x-0 z-[70] mx-auto w-full max-w-[720px] px-2", progressionFloatingBottomOffsetClassName)}>
      <div
        className={cn(
          appTokens.exercisePickerFilterPanel,
          "relative isolate mx-auto max-w-[760px] overflow-hidden !bg-[rgb(var(--bg-app))] shadow-[0_22px_60px_rgb(0_0_0_/0.42)] backdrop-blur-none",
        )}
      >
        <div className="pointer-events-none absolute inset-0 z-0 bg-[rgb(var(--bg-app))]" aria-hidden="true" />
        <FilterScrollPanel
          className="relative z-[1] !bg-[rgb(var(--bg-app))]"
          showEdgeFades={false}
          viewportClassName="max-h-[min(46dvh,28rem)] space-y-2.5"
        >
          <div className={cn(appTokens.routineEditorCompactStack, "space-y-2.5")}>
            {progressionControlsContent}
          </div>
        </FilterScrollPanel>
      </div>
    </div>
  );
  const triggerButton = collapsible ? (
    <button
      type="button"
      className={cn(
        "group relative block w-full select-none appearance-none !border-0 !bg-transparent px-0 text-center caret-transparent shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]",
        appTokens.routineEditorInlineTitle,
      )}
      onFocusCapture={setProgressionHeaderInfo}
      onClick={() => {
        setProgressionHeaderInfo();
        setIsExpanded((current) => !current);
      }}
      aria-expanded={isExpanded}
    >
      <span className="grid min-h-[2rem] grid-cols-[2rem_minmax(0,1fr)_auto] items-end gap-2 px-4 pb-3">
        <span aria-hidden="true" />
        <span className="min-w-0 w-full text-center">
          <span className="block text-[0.82rem] font-semibold leading-tight text-[rgb(var(--text-primary)/0.98)]">{title}</span>
        </span>
        <span className="inline-flex items-center justify-end gap-1.5">
          {isExpanded && showApplyRoutineDefault ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onApplyRoutineDefault?.();
              }}
              data-action-chrome-intent="info"
              className={cn(
                ACTION_CHROME_CONTROL_CLASS_NAME,
                "min-h-7 rounded-[999px] px-2.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--secondary-action-rgb)/0.96)]",
              )}
            >
              Reset
            </button>
          ) : null}
          <span className={cn(
            "flex items-center justify-end transition-colors group-hover:text-[rgb(var(--text-secondary)/0.96)]",
            isExpanded ? "text-[rgb(var(--accent-divider-rgb)/0.98)]" : "text-[rgb(var(--text-muted)/0.84)]",
          )}>
            {isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          </span>
        </span>
      </span>
      <MetricAccentBar variant="thin" className="opacity-85 transition-opacity group-hover:opacity-100" />
    </button>
  ) : null;

  return (
    <section className="relative isolate">
      <input type="hidden" name="progressionPlaybookId" value={value.progressionPlaybookId} />
      <input type="hidden" name="progressionStallPolicy" value={value.progressionStallPolicy} />
      <input type="hidden" name="progressionSetFlow" value={value.progressionSetFlow} />
      <input type="hidden" name="progressionAutoUpdateRoutineGoals" value="0" />
      <input type="hidden" name="progressionBarbellLoadIncrement" value={value.progressionBarbellLoadIncrement} />
      <input type="hidden" name="progressionDumbbellLoadIncrement" value={value.progressionDumbbellLoadIncrement} />
      <input type="hidden" name="progressionMachineLoadIncrement" value={value.progressionMachineLoadIncrement} />
      <input type="hidden" name="progressionCableLoadIncrement" value={value.progressionCableLoadIncrement} />
      <input type="hidden" name="progressionBodyweightRepIncrement" value={value.progressionBodyweightRepIncrement} />
      <input type="hidden" name="progressionDurationIncrementSeconds" value={value.progressionDurationIncrementSeconds} />
      <input type="hidden" name="progressionDistanceIncrement" value={value.progressionDistanceIncrement} />
      <input type="hidden" name="progressionSetFlowLoadStep" value={value.progressionSetFlowLoadStep} />
      <input type="hidden" name="progressionSetFlowRepStep" value={value.progressionSetFlowRepStep} />
      <input type="hidden" name="progressionSetFlowDurationStep" value={value.progressionSetFlowDurationStep} />
      <input type="hidden" name="progressionSetFlowDistanceStep" value={value.progressionSetFlowDistanceStep} />
      <input type="hidden" name="progressionPromotionBasis" value={value.progressionPromotionBasis} />
      <input type="hidden" name="progressionRepPromotionThreshold" value={value.progressionRepPromotionThreshold} />
      <input type="hidden" name="progressionCustomRepPromotionTarget" value={value.progressionCustomRepPromotionTarget} />
      <input type="hidden" name="progressionTargetMutation" value={value.progressionTargetMutation} />
      <input type="hidden" name="progressionRequiredQualifiedSessions" value={value.progressionRequiredQualifiedSessions} />
      <input type="hidden" name="progressionQualificationWindowMode" value={value.progressionQualificationWindowMode} />
      <input type="hidden" name="progressionQualificationWindowResetOnMiss" value={value.progressionQualificationWindowResetOnMiss ? "1" : "0"} />
      <input type="hidden" name="progressionHasExplicitTargetMutation" value={value.progressionHasExplicitTargetMutation ? "1" : "0"} />
      <input type="hidden" name="progressionHasExplicitQualificationWindow" value={value.progressionHasExplicitQualificationWindow ? "1" : "0"} />
      <input type="hidden" name="progressionLoadIncrement" value={value.progressionLoadIncrement} />
      {!(isExpanded && selectedPlaybookId && value.progressionStallPolicy === "deload_after_stall") ? (
        <>
          <input type="hidden" name="progressionStallThreshold" value={value.progressionStallThreshold} />
          <input type="hidden" name="progressionDeloadPercent" value={value.progressionDeloadPercent} />
        </>
      ) : null}
      {collapsible ? (
        portalProgressionSettings && portalTriggerMode === "fixed" ? (
          <>
            <div aria-hidden="true" className="h-[4.25rem]" />
            <div className={cn("fixed inset-x-0 z-[75] mx-auto w-full max-w-[720px] px-1", fixedPortalTriggerBottomClassName)}>
              {triggerButton}
            </div>
          </>
        ) : triggerButton
      ) : (
        <p className={cn(appTokens.routineEditorInlineTitle, "text-center")}>{title}</p>
      )}
      {isExpanded && collapsible && portalProgressionSettings ? (
        portalTriggerMode === "dock"
          ? dockPortalOverlay
          : progressionFloatingOverlay
      ) : isExpanded ? (
          <div className={cn(appTokens.routineEditorCompactStack, "mt-3")}>
            {progressionControlsContent}
          </div>
      ) : null}
      {separateInfoBox && shouldRenderProgressionInfo ? (
        <ProgressionInfoAccordion
          currentSectionTitle={activeInfoContent.title}
          currentSectionSummary={activeInfoContent.summary}
          hasSelection={hasInfoSelection}
        >
          {progressionInfoBox}
        </ProgressionInfoAccordion>
      ) : null}
    </section>
  );
}
