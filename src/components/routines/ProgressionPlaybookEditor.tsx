"use client";

import { Fragment, type ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
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
import { ExpandingChoiceRow } from "@/components/ui/ExpandingChoiceRow";
import { AttachedCardActionStripFrame, getAttachedCardActionButtonClassName } from "@/components/session/SessionExerciseBlock";
import { labeledEditorFieldControlClassName, labeledEditorFieldFloatingLabelClassName } from "@/components/ui/LabeledEditorField";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import type { BottomActionIntent } from "@/components/layout/bottomActionIntents";
import { cn } from "@/lib/cn";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import {
  ROUTINE_PROMOTION_MEASUREMENT_LABELS,
  type PromotionMeasurementConnector,
  type ProgressionMeasurementKey,
} from "@/lib/progression-active-measurements";
import {
  areProgressionPlaybookFormStatesEqual,
  createProgressionPlaybookFormState,
  type ProgressionPlaybookFormState,
} from "@/lib/progression-playbook-form-state";
import type {
  ProgressionTargetMutationUiModel,
  ProgressionPromotionUiModel,
  ProgressionPromotionUiOptionId,
  PromotionStepFieldId,
} from "@/lib/progression-playbook-ui-options";
import {
  buildProgressionTargetMutationUiModel,
  getProgressionTargetMutationLabel,
} from "@/lib/progression-playbook-ui-options";
import {
  buildProgressionExampleSequence,
  classifyProgressionExampleMetricChange,
  splitProgressionExampleMetricPart,
  type ProgressionExampleMetricChange,
} from "@/lib/progression-example-visuals";
import {
  getRepPromotionTarget,
  usesRepsForPromotion,
} from "@/lib/progression-promotion";
import {
  getDefaultProgressionPlaybookConfig,
  PROGRESSION_INFO_TERM_DEFINITIONS,
  PROGRESSION_METHOD_DEFINITIONS,
  SET_FLOW_DEFINITIONS,
  STALL_POLICY_DEFINITIONS,
  type ProgressionDayMode,
  type ProgressionMethodId,
  type ProgressionPlaybookId,
  type ProgressionStallPolicy,
  type TrainingGoalId,
} from "@/lib/progression-playbooks";
import type { ProgressionTargetMutationId } from "@/lib/progression-target-mutation";
import {
  ensurePromotionGroupedSessionCountFieldMap,
  getPromotionMeasurementGroupKey,
} from "@/lib/promotion-session-counts";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";
import {
  areSetFlowDirectionsStraight,
  cycleSetFlowDirection,
  hasSetFlowDirectionStepValue,
  inferLegacySetFlowFromDirections,
  normalizeSetFlowDirectionForStepValue,
  shouldShowEffortShiftLabel,
  type SetFlowDirection,
} from "@/lib/set-flow-directions";

export type { PromotionStepFieldId } from "@/lib/progression-playbook-ui-options";

const progressionFieldShellClassName = "relative min-w-0 rounded-[1rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.22)] [touch-action:pan-x_pan-y] transition-[border-color,box-shadow] focus-within:border-[rgb(var(--button-primary-border)/0.42)] focus-within:ring-2 focus-within:ring-[rgb(var(--button-primary-border)/0.18)]";
const progressionFieldLabelClassName = cn(
  labeledEditorFieldFloatingLabelClassName,
  "whitespace-nowrap px-1 py-0 text-[9px] leading-none",
);
const progressionMeasurementTitleClassName = "text-[rgb(var(--accent-strong)/0.94)] tracking-[0.11em]";
const progressionExampleTitleClassName = "text-[rgb(var(--accent)/0.82)] tracking-[0.15em]";
const progressionExampleMeasurementLabelClassName = "text-[rgb(var(--accent)/0.82)]";
const progressionExampleMetricUnitClassName = "text-[rgb(var(--accent-strong)/0.98)]";
const progressionExampleArrowClassName = "text-[rgb(var(--accent)/0.88)]";
const progressionFieldInputClassName = cn(
  appTokens.measurementInput,
  labeledEditorFieldControlClassName,
  "h-11 rounded-[inherit] !border-0 !bg-transparent px-3 py-0 text-center !shadow-none placeholder:text-[rgb(var(--text-muted)/0.7)] focus-visible:!border-0 focus-visible:!ring-0",
);

type SetFlowMeasurementKey = "time" | "distance" | "reps" | "weight";

function getSetFlowMeasurementGroupKey(group: SetFlowMeasurementKey[]) {
  return group.join("+");
}

function ensureSetFlowGroupedCountFieldMap(args: {
  groups: SetFlowMeasurementKey[][];
  measurementCounts: ProgressionPlaybookFormState["progressionSetFlowCountMap"];
  groupedCounts: ProgressionPlaybookFormState["progressionSetFlowGroupedCountMap"];
  fallbackValue: string;
}) {
  const fallback = /^\d+$/u.test(args.fallbackValue.trim()) ? args.fallbackValue.trim() : "3";
  const nextMap = { ...args.groupedCounts };

  for (const group of args.groups) {
    if (group.length < 2) {
      continue;
    }

    const key = getSetFlowMeasurementGroupKey(group);
    if (!key || nextMap[key]) {
      continue;
    }

    const firstMeasurement = group[0];
    const measurementValue = firstMeasurement ? args.measurementCounts[firstMeasurement]?.trim() : "";
    nextMap[key] = measurementValue && /^\d+$/u.test(measurementValue) ? measurementValue : fallback;
  }

  return nextMap;
}

function formatSetFlowButtonLabel(label: string) {
  return label.replace(/\s+Sets$/i, "");
}

function formatSetFlowDirectionLabel(direction: SetFlowDirection) {
  switch (direction) {
  case "up":
    return "Ascending";
  case "down":
    return "Descending";
  case "straight":
  default:
    return "Straight";
  }
}

function formatSetFlowDirectionGlyph(direction: SetFlowDirection) {
  switch (direction) {
  case "up":
    return "↑";
  case "down":
    return "↓";
  case "straight":
  default:
    return "—";
  }
}

function StraightDirectionIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-[2px] w-4 rounded-full bg-current", className)}
    />
  );
}

function DirectionGlyph({
  direction,
  className,
}: {
  direction: SetFlowDirection;
  className?: string;
}) {
  if (direction === "up") {
    return <span aria-hidden="true" className={cn("text-[14px] leading-none", className)}>↑</span>;
  }

  if (direction === "down") {
    return <span aria-hidden="true" className={cn("text-[14px] leading-none", className)}>↓</span>;
  }

  return <StraightDirectionIcon className={className} />;
}

function DirectionArrowGlyph({
  direction,
  className,
}: {
  direction: SetFlowDirection;
  className?: string;
}) {
  if (direction === "up") {
    return <span aria-hidden="true" className={cn("text-[14px] leading-none", className)}>↑</span>;
  }

  if (direction === "down") {
    return <span aria-hidden="true" className={cn("text-[14px] leading-none", className)}>↓</span>;
  }

  return <StraightDirectionIcon className={className} />;
}

function getEffortShiftTitleClassName(direction: SetFlowDirection) {
  if (direction === "up") {
    return "text-[rgb(var(--accent)/0.82)]";
  }

  if (direction === "down") {
    return "text-[rgb(var(--danger-rgb)/0.92)]";
  }

  return "text-[rgb(var(--accent-yellow-on)/0.96)]";
}

function getEffortShiftBarClassName(direction: SetFlowDirection) {
  if (direction === "up") {
    return "bg-[rgb(var(--accent)/0.82)]";
  }

  if (direction === "down") {
    return "bg-[rgb(var(--danger-rgb)/0.92)]";
  }

  return "bg-[rgb(var(--accent-yellow-on)/0.96)]";
}

function ConnectorGlyph({
  mode,
}: {
  mode: PromotionMeasurementConnector;
}) {
  if (mode === "and") {
    return (
      <span className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap leading-none">
        <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 rotate-180" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.08em]">and</span>
        <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap leading-none">
      <span className="text-[9px] font-semibold uppercase tracking-[0.08em]">then</span>
      <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
    </span>
  );
}

function ProgressionBinaryToggleButton({
  label,
  ariaLabel,
  onClick,
  className,
}: {
  label: string;
  ariaLabel: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        ACTION_CHROME_CONTROL_CLASS_NAME,
        ACTION_CHROME_SEGMENTED_CLASS_NAME,
        "inline-flex min-h-10 items-center justify-center rounded-[var(--action-chrome-segment-radius-compact)] border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] px-4 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-primary))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] shadow-[var(--action-chrome-shadow-hover)] focus-visible:ring-[rgb(var(--accent)/0.2)]",
        className,
      )}
    >
      <span className="flex flex-col items-center justify-center gap-0.5 leading-none">
        <span>{label}</span>
        <ChevronDownIcon className="h-3 w-3 text-[rgb(var(--accent-strong)/0.94)]" />
      </span>
    </button>
  );
}

function buildPromotionMeasurementGroups(
  measurements: ProgressionMeasurementKey[],
  links: PromotionMeasurementConnector[],
) {
  const groups: ProgressionMeasurementKey[][] = [];
  let currentGroup: ProgressionMeasurementKey[] = [];

  measurements.forEach((measurement, index) => {
    currentGroup.push(measurement);
    if (links[index] !== "and") {
      groups.push(currentGroup);
      currentGroup = [];
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

function hasConfiguredPromotionValue(measurement: ProgressionMeasurementKey, args: {
  values: Record<ProgressionMeasurementKey, string>;
  repRangeStep: string;
  repRangeMin: string;
  repRangeMax: string;
}) {
  if (measurement === "calories") {
    return false;
  }

  if (measurement === "reps") {
    return args.repRangeStep.trim().length > 0;
  }

  return args.values[measurement].trim().length > 0;
}

function getPromotionMeasurementStepValue(
  measurement: ProgressionMeasurementKey,
  args: {
    values: Record<ProgressionMeasurementKey, string>;
    repRangeStep: string;
  },
) {
  return measurement === "reps" ? args.repRangeStep : args.values[measurement];
}

function getActivePromotionMeasurementGroup(
  group: ProgressionMeasurementKey[],
  args: {
    values: Record<ProgressionMeasurementKey, string>;
    repRangeStep: string;
    repRangeMin: string;
    repRangeMax: string;
  },
) {
  return group.filter((measurement) => hasConfiguredPromotionValue(measurement, args));
}

function resolvePromotionMeasurementDirection(args: {
  measurement: ProgressionMeasurementKey;
  values: Record<ProgressionMeasurementKey, string>;
  repRangeStep: string;
  directions: ProgressionPlaybookFormState["progressionPromotionDirectionMap"];
}) {
  return normalizeSetFlowDirectionForStepValue({
    current: args.directions[args.measurement] ?? "up",
    nextValue: getPromotionMeasurementStepValue(args.measurement, {
      values: args.values,
      repRangeStep: args.repRangeStep,
    }),
  });
}

function resolvePromotionGroupDirection(args: {
  fullGroup: ProgressionMeasurementKey[];
  activeGroup: ProgressionMeasurementKey[];
  values: Record<ProgressionMeasurementKey, string>;
  repRangeStep: string;
  directions: ProgressionPlaybookFormState["progressionPromotionDirectionMap"];
  groupedDirections: ProgressionPlaybookFormState["progressionPromotionGroupedDirectionMap"];
}) {
  const leadMeasurement = args.activeGroup[0] ?? args.fullGroup[0];
  if (!leadMeasurement) {
    return "straight" as const;
  }

  const leadStepValue = getPromotionMeasurementStepValue(leadMeasurement, {
    values: args.values,
    repRangeStep: args.repRangeStep,
  });

  if (args.activeGroup.length <= 1) {
    return normalizeSetFlowDirectionForStepValue({
      current: args.directions[leadMeasurement] ?? "up",
      nextValue: leadStepValue,
    });
  }

  const activeGroupKey = getPromotionMeasurementGroupKey(args.activeGroup);
  const fullGroupKey = getPromotionMeasurementGroupKey(args.fullGroup);
  const currentDirection = args.groupedDirections[activeGroupKey]
    ?? args.groupedDirections[fullGroupKey]
    ?? args.directions[leadMeasurement]
    ?? "up";

  return normalizeSetFlowDirectionForStepValue({
    current: currentDirection,
    nextValue: leadStepValue,
  });
}

function resolvePromotionGroupSessionCountValue(args: {
  fullGroup: ProgressionMeasurementKey[];
  activeGroup: ProgressionMeasurementKey[];
  sessionCounts: ProgressionPlaybookFormState["progressionPromotionSessionCountMap"];
  groupedSessionCounts: ProgressionPlaybookFormState["progressionPromotionGroupedSessionCountMap"];
  defaultSessionCount: string;
}) {
  const fallbackValue = args.defaultSessionCount.trim() || "1";
  const leadMeasurement = args.activeGroup[0] ?? args.fullGroup[0] ?? "weight";
  const fullGroupKey = getPromotionMeasurementGroupKey(args.fullGroup);

  if (args.activeGroup.length > 1) {
    const activeGroupKey = getPromotionMeasurementGroupKey(args.activeGroup);
    return args.groupedSessionCounts[activeGroupKey]
      ?? args.groupedSessionCounts[fullGroupKey]
      ?? args.sessionCounts[leadMeasurement]
      ?? fallbackValue;
  }

  if (args.activeGroup.length === 1) {
    return args.sessionCounts[leadMeasurement]
      ?? args.groupedSessionCounts[fullGroupKey]
      ?? fallbackValue;
  }

  if (args.fullGroup.length > 1) {
    return args.groupedSessionCounts[fullGroupKey]
      ?? args.sessionCounts[leadMeasurement]
      ?? fallbackValue;
  }

  return args.sessionCounts[leadMeasurement] ?? fallbackValue;
}

function getSetFlowMeasurementStepValue(
  measurement: SetFlowMeasurementKey,
  values: Record<SetFlowMeasurementKey, string>,
) {
  return values[measurement];
}

function getActiveSetFlowMeasurementGroup(
  group: SetFlowMeasurementKey[],
  values: Record<SetFlowMeasurementKey, string>,
) {
  return group.filter((measurement) => hasSetFlowDirectionStepValue(values[measurement]));
}

function resolveSetFlowMeasurementDirection(args: {
  measurement: SetFlowMeasurementKey;
  values: Record<SetFlowMeasurementKey, string>;
  directions: Record<SetFlowMeasurementKey, SetFlowDirection>;
}) {
  return normalizeSetFlowDirectionForStepValue({
    current: args.directions[args.measurement] ?? "up",
    nextValue: getSetFlowMeasurementStepValue(args.measurement, args.values),
  });
}

function resolveSetFlowGroupDirection(args: {
  fullGroup: SetFlowMeasurementKey[];
  activeGroup: SetFlowMeasurementKey[];
  values: Record<SetFlowMeasurementKey, string>;
  directions: Record<SetFlowMeasurementKey, SetFlowDirection>;
  groupedDirections: ProgressionPlaybookFormState["progressionSetFlowGroupedDirectionMap"];
}) {
  const leadMeasurement = args.activeGroup[0] ?? args.fullGroup[0];
  if (!leadMeasurement) {
    return "straight" as const;
  }

  const leadStepValue = getSetFlowMeasurementStepValue(leadMeasurement, args.values);

  if (args.activeGroup.length <= 1) {
    return normalizeSetFlowDirectionForStepValue({
      current: args.directions[leadMeasurement] ?? "up",
      nextValue: leadStepValue,
    });
  }

  const activeGroupKey = getSetFlowMeasurementGroupKey(args.activeGroup);
  const fullGroupKey = getSetFlowMeasurementGroupKey(args.fullGroup);
  const currentDirection = args.groupedDirections[activeGroupKey]
    ?? args.groupedDirections[fullGroupKey]
    ?? args.directions[leadMeasurement]
    ?? "up";

  return normalizeSetFlowDirectionForStepValue({
    current: currentDirection,
    nextValue: leadStepValue,
  });
}

function resolveSetFlowGroupCountValue(args: {
  fullGroup: SetFlowMeasurementKey[];
  activeGroup: SetFlowMeasurementKey[];
  counts: ProgressionPlaybookFormState["progressionSetFlowCountMap"];
  groupedCounts: ProgressionPlaybookFormState["progressionSetFlowGroupedCountMap"];
  defaultCount: string;
}) {
  const fallbackValue = args.defaultCount.trim() || "3";
  const leadMeasurement = args.activeGroup[0] ?? args.fullGroup[0] ?? "weight";
  const fullGroupKey = getSetFlowMeasurementGroupKey(args.fullGroup);

  if (args.activeGroup.length > 1) {
    const activeGroupKey = getSetFlowMeasurementGroupKey(args.activeGroup);
    return args.groupedCounts[activeGroupKey]
      ?? args.groupedCounts[fullGroupKey]
      ?? args.counts[leadMeasurement]
      ?? fallbackValue;
  }

  if (args.activeGroup.length === 1) {
    return args.counts[leadMeasurement]
      ?? args.groupedCounts[fullGroupKey]
      ?? fallbackValue;
  }

  if (args.fullGroup.length > 1) {
    return args.groupedCounts[fullGroupKey]
      ?? args.counts[leadMeasurement]
      ?? fallbackValue;
  }

  return args.counts[leadMeasurement] ?? fallbackValue;
}

function resolveTotalSetCountFromGroups(args: {
  groups: SetFlowMeasurementKey[][];
  values: Record<SetFlowMeasurementKey, string>;
  counts: ProgressionPlaybookFormState["progressionSetFlowCountMap"];
  groupedCounts: ProgressionPlaybookFormState["progressionSetFlowGroupedCountMap"];
  fallbackCount: string;
}) {
  const total = args.groups.reduce((sum, group) => {
    const activeGroup = getActiveSetFlowMeasurementGroup(group, args.values);
    const countValue = resolveSetFlowGroupCountValue({
      fullGroup: group,
      activeGroup,
      counts: args.counts,
      groupedCounts: args.groupedCounts,
      defaultCount: args.fallbackCount,
    });
    const parsed = Number.parseInt(countValue, 10);
    return sum + (Number.isInteger(parsed) && parsed > 0 && activeGroup.length > 0 ? parsed : 0);
  }, 0);

  if (total > 0) {
    return String(total);
  }

  return args.fallbackCount.trim() || "3";
}

function inferRoutineDefaultTargetMutation(args: {
  measurements: ProgressionMeasurementKey[];
  links: PromotionMeasurementConnector[];
  values: Record<ProgressionMeasurementKey, string>;
  repRangeStep: string;
  repRangeMin: string;
  repRangeMax: string;
  fallback: ProgressionTargetMutationId;
}): ProgressionTargetMutationId {
  const groups = buildPromotionMeasurementGroups(args.measurements, args.links)
    .map((group) => group.filter((measurement) => hasConfiguredPromotionValue(measurement, args)))
    .filter((group) => group.length > 0);
  const activeMeasurements = groups.flat();

  if (activeMeasurements.length === 0) {
    return args.fallback;
  }

  const hasWeight = activeMeasurements.includes("weight");
  const hasReps = activeMeasurements.includes("reps");
  const hasTime = activeMeasurements.includes("time");
  const hasDistance = activeMeasurements.includes("distance");
  const hasJoinedStrengthGroup = groups.some((group) => group.includes("weight") && group.includes("reps"));
  const hasJoinedCardioGroup = groups.some((group) => group.includes("time") && group.includes("distance"));

  if (hasTime && hasDistance) {
    return hasJoinedCardioGroup ? "increase_duration_and_distance" : "increase_duration";
  }
  if (hasTime) {
    return "increase_duration";
  }
  if (hasDistance) {
    return "increase_distance";
  }
  if (hasWeight && hasReps) {
    return hasJoinedStrengthGroup ? "increase_load_and_reps" : "increase_load_reset_reps";
  }
  if (hasWeight) {
    return "increase_load";
  }
  if (hasReps) {
    return "increase_reps";
  }

  return args.fallback;
}

function flattenPromotionMeasurementGroups(groups: ProgressionMeasurementKey[][]) {
  return groups.flat();
}

function buildPromotionLinksFromGroups(groups: ProgressionMeasurementKey[][]): PromotionMeasurementConnector[] {
  const links: PromotionMeasurementConnector[] = [];

  groups.forEach((group, groupIndex) => {
    group.forEach((_, index) => {
      if (index < group.length - 1) {
        links.push("and");
      }
    });
    if (groupIndex < groups.length - 1) {
      links.push("then");
    }
  });

  return links;
}

function formatPromotionMeasurementSequence(
  measurements: ProgressionMeasurementKey[],
  links: PromotionMeasurementConnector[],
) {
  return buildPromotionMeasurementGroups(measurements, links)
    .map((group) => group.map((measurement) => ROUTINE_PROMOTION_MEASUREMENT_LABELS[measurement]).join(" and "))
    .join(" then ");
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

function parseOptionalPositiveNumber(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isAllowedNumericDraftValue(value: string, inputMode: "decimal" | "numeric") {
  if (value === "") {
    return true;
  }

  return inputMode === "numeric"
    ? /^\d+$/u.test(value)
    : /^(?:\d+|\d+\.\d*|\d*\.\d+)$/u.test(value);
}

function isValidCommittedNumericValue(value: string, inputMode: "decimal" | "numeric") {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (inputMode === "numeric" && !/^\d+$/u.test(trimmed)) {
    return false;
  }

  if (inputMode === "decimal" && !/^(?:\d+|\d+\.\d*|\d*\.\d+)$/u.test(trimmed)) {
    return false;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0;
}

function ValidatedNumericTextInput({
  name,
  inputMode,
  value,
  onCommit,
  readOnly = false,
  placeholder = "-",
  className,
  tabIndex,
}: {
  name: string;
  inputMode: "decimal" | "numeric";
  value: string;
  onCommit: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  tabIndex?: number;
}) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  const commitDraft = () => {
    if (readOnly) {
      return;
    }

    if (draftValue.trim() === "") {
      setDraftValue("");
      if (value !== "") {
        onCommit("");
      }
      return;
    }

    if (isValidCommittedNumericValue(draftValue, inputMode)) {
      const trimmed = draftValue.trim();
      setDraftValue(trimmed);
      if (trimmed !== value) {
        onCommit(trimmed);
      }
      return;
    }

    setDraftValue(value);
  };

  return (
    <input
      name={name}
      type="text"
      inputMode={inputMode}
      value={draftValue}
      placeholder={placeholder}
      readOnly={readOnly}
      tabIndex={tabIndex}
      onChange={(event) => {
        if (readOnly) {
          return;
        }

        const nextValue = event.target.value;
        if (!isAllowedNumericDraftValue(nextValue, inputMode)) {
          return;
        }

        setDraftValue(nextValue);
      }}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commitDraft();
          (event.currentTarget as HTMLInputElement).blur();
        }
      }}
      className={className}
    />
  );
}

export function ProgressionNumberField({
  label,
  name,
  inputMode,
  value,
  onChange,
  readOnly = false,
  suffix,
  labelClassName,
  attachedBottom = false,
  attachedFooter,
}: {
  label: string;
  name: string;
  inputMode: "decimal" | "numeric";
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  suffix?: string;
  labelClassName?: string;
  attachedBottom?: boolean;
  attachedFooter?: ReactNode;
}) {
  return (
    <div className={cn(
      appTokens.measurementField,
      appTokens.measurementFieldStandard,
      attachedFooter
        ? "min-h-0 overflow-hidden rounded-[1rem] border-transparent bg-transparent px-0 py-0 shadow-none"
        : "min-h-0 overflow-visible border-transparent bg-transparent px-0 py-0 shadow-none",
    )}>
      <fieldset className={cn(
        progressionFieldShellClassName,
        attachedBottom || attachedFooter ? "rounded-b-none border-b-0" : undefined,
      )}>
        <legend className={cn(progressionFieldLabelClassName, labelClassName)}>{label}</legend>
        <ValidatedNumericTextInput
          name={name}
          inputMode={inputMode}
          value={value}
          onCommit={onChange}
          readOnly={readOnly}
          tabIndex={readOnly ? -1 : undefined}
          className={cn(progressionFieldInputClassName, suffix ? "pr-7" : undefined, readOnly ? "pointer-events-none" : undefined)}
        />
        {suffix && value.trim().length > 0 ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.82rem] font-semibold text-[rgb(var(--text-secondary)/0.92)]">
            {suffix}
          </span>
        ) : null}
      </fieldset>
      {attachedFooter}
    </div>
  );
}

function CompactProgressionNumberField({
  label,
  name,
  inputMode,
  value,
  onChange,
  className,
  labelClassName,
  labelStyle,
  attachedBottom = false,
  attachedFooter,
  fieldShellClassName,
}: {
  label: string;
  name: string;
  inputMode: "decimal" | "numeric";
  value: string;
  onChange: (value: string) => void;
  className?: string;
  labelClassName?: string;
  labelStyle?: React.CSSProperties;
  attachedBottom?: boolean;
  attachedFooter?: ReactNode;
  fieldShellClassName?: string;
}) {
  return (
    <div className={cn(
      className,
      attachedFooter
        ? "min-h-0 shrink-0 overflow-hidden rounded-[1rem] border-transparent bg-transparent px-0 py-0 shadow-none"
        : "min-h-0 shrink-0",
    )}>
      <fieldset className={cn(
        "relative min-w-0 rounded-[0.92rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.22)] px-2 py-1.5 transition-[border-color,box-shadow] focus-within:border-[rgb(var(--button-primary-border)/0.42)] focus-within:ring-2 focus-within:ring-[rgb(var(--button-primary-border)/0.18)]",
        attachedBottom || attachedFooter ? "rounded-b-none border-b-0" : undefined,
        fieldShellClassName,
      )}>
        <legend className={cn(
          "mx-auto px-1 text-[8px] font-semibold uppercase tracking-[0.13em] text-[rgb(var(--text-secondary)/0.84)]",
          labelClassName,
        )} style={labelStyle}>
          {label}
        </legend>
        <ValidatedNumericTextInput
          name={name}
          inputMode={inputMode}
          value={value}
          onCommit={onChange}
          className="w-full border-0 bg-transparent px-0 py-0 text-center text-[0.88rem] font-semibold leading-tight text-[rgb(var(--text-primary)/0.96)] outline-none placeholder:text-[rgb(var(--text-secondary)/0.46)]"
        />
      </fieldset>
      {attachedFooter}
    </div>
  );
}

function LoopingScrollRail({
  children,
  className,
  innerClassName,
  segmentClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  segmentClassName?: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const segmentRef = useRef<HTMLDivElement | null>(null);
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    const segment = segmentRef.current;
    if (!element || !segment) {
      return;
    }

    const updateLoopMode = () => {
      const segmentWidth = segment.scrollWidth;
      const nextLoopEnabled = segmentWidth > element.clientWidth + 1;
      setIsLoopEnabled((currentValue) => currentValue !== nextLoopEnabled ? nextLoopEnabled : currentValue);
      if (!nextLoopEnabled) {
        element.scrollLeft = 0;
      }
    };

    updateLoopMode();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateLoopMode);
      observer.observe(element);
      observer.observe(segment);
      return () => observer.disconnect();
    }
  }, [children]);

  useEffect(() => {
    const element = scrollRef.current;
    const segment = segmentRef.current;
    if (!element || !segment || !isLoopEnabled) {
      return;
    }

    let frameId = 0;
    const positionToMiddle = () => {
      const segmentWidth = segment.scrollWidth;
      if (segmentWidth > 0) {
        element.scrollLeft = segmentWidth;
      }
    };

    const handleScroll = () => {
      const segmentWidth = segment.scrollWidth;
      if (segmentWidth <= 0) {
        return;
      }

      const viewportWidth = element.clientWidth;
      const leftWrapThreshold = Math.max(0, segmentWidth - viewportWidth);
      const rightWrapThreshold = segmentWidth * 2;

      if (element.scrollLeft <= leftWrapThreshold) {
        element.scrollLeft += segmentWidth;
      } else if (element.scrollLeft >= rightWrapThreshold) {
        element.scrollLeft -= segmentWidth;
      }
    };

    frameId = window.requestAnimationFrame(positionToMiddle);
    element.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      element.removeEventListener("scroll", handleScroll);
    };
  }, [children, isLoopEnabled]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "hide-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]",
        className,
      )}
    >
      {isLoopEnabled ? (
        <div className={cn("mx-auto flex w-max min-w-max", innerClassName)}>
          <div aria-hidden="true" className={segmentClassName}>{children}</div>
          <div ref={segmentRef} className={segmentClassName}>{children}</div>
          <div aria-hidden="true" className={segmentClassName}>{children}</div>
        </div>
      ) : (
        <div ref={segmentRef} className={cn("mx-auto flex w-max min-w-max", innerClassName, segmentClassName)}>
          {children}
        </div>
      )}
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

const ROUTINE_DEFAULT_VISUAL_STEP_FIELD_ORDER: PromotionStepFieldId[] = [
  "duration",
  "distance",
  "bodyweightReps",
  "genericLoad",
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

function getRoutineDefaultVisualStepFieldIds(args: {
  visibleMeasurements: ProgressionMeasurementKey[];
  showAll?: boolean;
}) {
  if (args.showAll) {
    return [...ROUTINE_DEFAULT_VISUAL_STEP_FIELD_ORDER];
  }

  const visibleMeasurementSet = new Set(args.visibleMeasurements);

  return ROUTINE_DEFAULT_VISUAL_STEP_FIELD_ORDER.filter((fieldId) => {
    switch (fieldId) {
    case "duration":
      return visibleMeasurementSet.has("time");
    case "distance":
      return visibleMeasurementSet.has("distance");
    case "bodyweightReps":
      return visibleMeasurementSet.has("reps");
    case "genericLoad":
      return visibleMeasurementSet.has("weight");
    default:
      return false;
    }
  });
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
  | "day_settings"
  | "set_step_settings";

type ProgressionInfoMiniSectionKey =
  | "routine_setup"
  | "progression_method"
  | "regression_method"
  | "session_settings"
  | "day_settings"
  | "set_step_settings"
  | "deload_settings"
  | "progression_terms"
  | "sets_flow";

type ActiveProgressionInfoContent = {
  title: string;
  summary: string;
  rows?: Array<{ label: string; value: string }>;
  sectionKey?: ProgressionInfoMiniSectionKey | null;
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
  sectionKey,
  openSectionKey,
  onOpenSectionKeyChange,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  accent?: "primary" | "secondary";
  sectionKey?: ProgressionInfoMiniSectionKey;
  openSectionKey?: ProgressionInfoMiniSectionKey | null;
  onOpenSectionKeyChange?: (nextValue: ProgressionInfoMiniSectionKey | null) => void;
}) {
  const [isLocalOpen, setIsLocalOpen] = useState(defaultOpen);
  const isControlled = Boolean(sectionKey && onOpenSectionKeyChange);
  const isOpen = isControlled ? openSectionKey === sectionKey : isLocalOpen;

  return (
    <section className={progressionInfoMiniCardClassName}>
      <button
        type="button"
        className={progressionInfoMiniCardButtonClassName}
        onClick={() => {
          if (isControlled && sectionKey) {
            onOpenSectionKeyChange?.(isOpen ? null : sectionKey);
            return;
          }

          setIsLocalOpen((current) => !current);
        }}
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
  titleClassName,
}: {
  title: ReactNode;
  children: ReactNode;
  accent?: "primary" | "secondary";
  titleClassName?: string;
}) {
  return (
    <section className={progressionInfoMiniCardClassName}>
      <div className="px-3 pb-3 pt-2.5">
        <div className="mx-auto mb-[5px] w-fit max-w-full text-center">
          <p
            className={cn(
              progressionInfoTitleClassName,
              "min-w-0 text-center",
              accent === "secondary" ? "text-[rgb(var(--secondary-action-rgb)/0.92)]" : undefined,
              titleClassName,
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

function PromotionMeasurementOrderRow({
  measurements,
  onMove,
  infoHandlers,
}: {
  measurements: ProgressionMeasurementKey[];
  onMove: (measurement: ProgressionMeasurementKey, direction: "left" | "right") => void;
  infoHandlers?: {
    onFocusCapture?: () => void;
    onPointerDownCapture?: () => void;
  };
}) {
  return (
    <div className="space-y-2" {...infoHandlers}>
      <div className="max-w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex w-max min-w-max flex-row flex-nowrap items-stretch justify-center gap-2">
          {measurements.map((measurement, index) => (
            <Fragment key={`promotion-order-${measurement}`}>
              <div className="flex items-center gap-1 px-1 py-1">
                {index > 0 ? (
                  <button
                    type="button"
                    onClick={() => onMove(measurement, "left")}
                    className={cn(
                      ACTION_CHROME_CONTROL_CLASS_NAME,
                      ACTION_CHROME_SEGMENTED_CLASS_NAME,
                      "min-h-8 min-w-8 rounded-[0.8rem] px-0 text-[rgb(var(--text-secondary)/0.9)]",
                    )}
                    aria-label={`Move ${ROUTINE_PROMOTION_MEASUREMENT_LABELS[measurement]} left`}
                  >
                    <ChevronRightIcon className="mx-auto h-3.5 w-3.5 rotate-180" />
                  </button>
                ) : null}
                <div
                  className={cn(
                    ACTION_CHROME_CONTROL_CLASS_NAME,
                    ACTION_CHROME_SEGMENTED_CLASS_NAME,
                    "flex min-h-9 min-w-[6.2rem] items-center justify-center rounded-[0.9rem] px-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-primary))]",
                  )}
                >
                  {ROUTINE_PROMOTION_MEASUREMENT_LABELS[measurement]}
                </div>
                {index < measurements.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => onMove(measurement, "right")}
                    className={cn(
                      ACTION_CHROME_CONTROL_CLASS_NAME,
                      ACTION_CHROME_SEGMENTED_CLASS_NAME,
                      "min-h-8 min-w-8 rounded-[0.8rem] px-0 text-[rgb(var(--text-secondary)/0.9)]",
                    )}
                    aria-label={`Move ${ROUTINE_PROMOTION_MEASUREMENT_LABELS[measurement]} right`}
                  >
                    <ChevronRightIcon className="mx-auto h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              {index < measurements.length - 1 ? (
                <div className="flex items-center px-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-strong)/0.9)]">
                  then
                </div>
              ) : null}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function PromotionMeasurementStepRow({
  measurements,
  links,
  weightUnit,
  values,
  sessionCounts,
  groupedSessionCounts,
  directions,
  groupedDirections,
  defaultSessionCount,
  repRangeMin,
  repRangeMax,
  repRangeStep,
  onMove,
  onToggleConnector,
  onStepChange,
  onSessionCountChange,
  onGroupedSessionCountChange,
  onDirectionToggle,
  onGroupedDirectionToggle,
  onRepRangeMinChange,
  onRepRangeMaxChange,
  onRepRangeStepChange,
  infoHandlers,
}: {
  measurements: ProgressionMeasurementKey[];
  links: PromotionMeasurementConnector[];
  weightUnit: string;
  values: Record<ProgressionMeasurementKey, string>;
  sessionCounts: ProgressionPlaybookFormState["progressionPromotionSessionCountMap"];
  groupedSessionCounts: ProgressionPlaybookFormState["progressionPromotionGroupedSessionCountMap"];
  directions: ProgressionPlaybookFormState["progressionPromotionDirectionMap"];
  groupedDirections: ProgressionPlaybookFormState["progressionPromotionGroupedDirectionMap"];
  defaultSessionCount: string;
  repRangeMin: string;
  repRangeMax: string;
  repRangeStep: string;
  onMove: (measurement: ProgressionMeasurementKey, direction: "left" | "right") => void;
  onToggleConnector: (index: number) => void;
  onStepChange: (measurement: ProgressionMeasurementKey, nextValue: string) => void;
  onSessionCountChange: (measurement: ProgressionMeasurementKey, nextValue: string) => void;
  onGroupedSessionCountChange: (group: ProgressionMeasurementKey[], nextValue: string) => void;
  onDirectionToggle: (measurement: ProgressionMeasurementKey, stepValue: string) => void;
  onGroupedDirectionToggle: (group: ProgressionMeasurementKey[]) => void;
  onRepRangeMinChange: (nextValue: string) => void;
  onRepRangeMaxChange: (nextValue: string) => void;
  onRepRangeStepChange: (nextValue: string) => void;
  infoHandlers?: {
    onFocusCapture?: () => void;
    onPointerDownCapture?: () => void;
  };
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const labels: Record<ProgressionMeasurementKey, string> = {
    time: "TIME (S)",
    distance: "DISTANCE",
    reps: "REPS",
    weight: `LOAD (${weightUnit})`,
    calories: "CALORIES",
  };

  const inputModes: Record<ProgressionMeasurementKey, "decimal" | "numeric"> = {
    time: "numeric",
    distance: "decimal",
    reps: "numeric",
    weight: "decimal",
    calories: "numeric",
  };
  const measurementGroups = buildPromotionMeasurementGroups(measurements, links);
  const measurementGroupIndex = new Map<ProgressionMeasurementKey, number>();
  const measurementIndexMap = new Map<ProgressionMeasurementKey, number>();
  measurementGroups.forEach((group, groupIndex) => {
    group.forEach((measurement) => {
      measurementGroupIndex.set(measurement, groupIndex);
    });
  });
  measurements.forEach((measurement, index) => {
    measurementIndexMap.set(measurement, index);
  });
  const gridTemplateColumns = measurements.flatMap((measurement, index) => {
    const columns = ["6.2rem"];
    if (index < measurements.length - 1) {
      columns.push("3.05rem");
    }
    return columns;
  }).join(" ");
  const promotionArrowButtonClassName = (
    divider: "left" | "right" | null = null,
    connectorEdge: "left" | "right" | null = null,
  ) => getAttachedCardActionButtonClassName({
    intent: "positive",
    className: cn(
      "w-full !min-w-0 !justify-center !bg-[rgb(var(--surface-1-rgb)/0.16)] !px-0 !text-[rgb(var(--accent-strong)/0.96)] shadow-none hover:!bg-[rgb(var(--surface-1-rgb)/0.28)] focus-visible:ring-[rgb(var(--accent)/0.24)]",
      divider === "left"
        ? "!border-r !border-r-[rgb(var(--secondary-action-rgb)/0.18)]"
        : divider === "right"
          ? "!border-l !border-l-[rgb(var(--secondary-action-rgb)/0.18)]"
          : undefined,
      connectorEdge === "left"
        ? "-mr-px !rounded-r-none ![border-top-right-radius:0] ![border-bottom-right-radius:0]"
        : connectorEdge === "right"
          ? "-ml-px !rounded-l-none ![border-top-left-radius:0] ![border-bottom-left-radius:0]"
          : undefined,
    ),
  });
  const renderAttachedArrowFooter = (
    measurement: ProgressionMeasurementKey,
    index: number,
    { suppressDirection = false }: { suppressDirection?: boolean } = {},
  ) => {
    const stepValue = measurement === "reps" ? repRangeStep : values[measurement];
    const hasStepValue = hasSetFlowDirectionStepValue(stepValue);
    const directionValue = normalizeSetFlowDirectionForStepValue({
      current: directions[measurement] ?? "up",
      nextValue: stepValue,
    });
    const isDisplayOnly = !hasStepValue || suppressDirection;
    const showLeft = index > 0 && links[index - 1] !== "and";
    const showRight = index < measurements.length - 1 && links[index] !== "and";
    const footerGridClassName = suppressDirection
      ? showLeft && showRight
        ? "grid-cols-2"
        : showLeft || showRight
          ? "grid-cols-1"
          : ""
      : showLeft && showRight
        ? "grid-cols-3"
        : showLeft
          ? "grid-cols-2"
          : showRight
            ? "grid-cols-2"
            : "grid-cols-1";
    const footerFrameClassName = cn(
      "mt-0",
      showLeft ? "!rounded-bl-none" : undefined,
      showRight ? "!rounded-br-none" : undefined,
    );
    const footerGridRoundingClassName = cn(
      footerGridClassName,
      showLeft ? "!rounded-bl-none" : undefined,
      showRight ? "!rounded-br-none" : undefined,
    );

    if (suppressDirection && !showLeft && !showRight) {
      return null;
    }

    return (
      <AttachedCardActionStripFrame
        className={footerFrameClassName}
        gridClassName={footerGridRoundingClassName}
      >
        {showLeft ? (
          <button
            type="button"
            onClick={() => onMove(measurements[index]!, "left")}
            className={cn(
              promotionArrowButtonClassName("left", suppressDirection ? null : "left"),
              suppressDirection ? "!rounded-l-none ![border-top-left-radius:0] ![border-bottom-left-radius:0]" : undefined,
            )}
            aria-label={`Move ${ROUTINE_PROMOTION_MEASUREMENT_LABELS[measurement]} left`}
          >
            <span aria-hidden="true" className="text-[15px] leading-none">‹</span>
          </button>
        ) : null}
        {!suppressDirection ? (
          <button
            type="button"
            className={getDirectionActionButtonClassName({ direction: directionValue, active: true })}
            onClick={isDisplayOnly ? undefined : () => onDirectionToggle(measurement, stepValue)}
            disabled={isDisplayOnly}
            aria-label={hasStepValue ? `Flip ${ROUTINE_PROMOTION_MEASUREMENT_LABELS[measurement]} direction` : `${ROUTINE_PROMOTION_MEASUREMENT_LABELS[measurement]} direction`}
          >
            <span className="flex flex-col items-center justify-center gap-0.5 leading-none">
              <DirectionArrowGlyph direction={directionValue} />
              {isDisplayOnly ? null : <ChevronDownIcon className="h-3 w-3 opacity-72" />}
            </span>
          </button>
        ) : null}
        {showRight ? (
          <button
            type="button"
            onClick={() => onMove(measurement, "right")}
            className={cn(
              promotionArrowButtonClassName("right", suppressDirection ? null : "right"),
              suppressDirection ? "!rounded-r-none ![border-top-right-radius:0] ![border-bottom-right-radius:0]" : undefined,
            )}
            aria-label={`Move ${ROUTINE_PROMOTION_MEASUREMENT_LABELS[measurement]} right`}
          >
            <span aria-hidden="true" className="text-[15px] leading-none">›</span>
          </button>
        ) : null}
      </AttachedCardActionStripFrame>
    );
  };
  const hasRepRangeBounds = repRangeMin.trim().length > 0 || repRangeMax.trim().length > 0;

  return (
    <div className="space-y-0" {...infoHandlers}>
      <div
        ref={scrollRef}
        data-promotion-scroll="true"
        className="hide-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]"
      >
        <div
          className="mx-auto flex w-max min-w-max justify-center px-1"
        >
          <div
            className="inline-grid w-max min-w-max items-start gap-x-0 gap-y-0"
            style={{ gridTemplateColumns }}
          >
            {measurements.map((measurement, index) => (
              <Fragment key={`promotion-step-${measurement}`}>
                {(() => {
                  const groupIndex = measurementGroupIndex.get(measurement) ?? -1;
                  const group = groupIndex >= 0 ? measurementGroups[groupIndex] ?? [measurement] : [measurement];
                  const activeGroup = getActivePromotionMeasurementGroup(group, {
                    values,
                    repRangeStep,
                    repRangeMin,
                    repRangeMax,
                  });
                  const groupLeadMeasurement = group[0] ?? measurement;
                  const sessionLeadMeasurement = activeGroup[0] ?? group[0] ?? measurement;
                  const shouldRenderGroupedControls = group.length > 1;
                  const sessionCountSpanStartMeasurement = group[0] ?? measurement;
                  const sessionCountSpanEndMeasurement = group[group.length - 1] ?? measurement;
                  const sessionCountSpanStartIndex = measurementIndexMap.get(sessionCountSpanStartMeasurement) ?? index;
                  const sessionCountSpanEndIndex = measurementIndexMap.get(sessionCountSpanEndMeasurement) ?? index;
                  const sessionCountSpanWidthRem = ((sessionCountSpanEndIndex - sessionCountSpanStartIndex + 1) * 6.2) + ((sessionCountSpanEndIndex - sessionCountSpanStartIndex) * 3.05);
                  const sessionCountSpanColumnStart = (sessionCountSpanStartIndex * 2) + 1;
                  const sessionCountSpanColumnCount = ((sessionCountSpanEndIndex - sessionCountSpanStartIndex) * 2) + 1;
                  const sessionCountValue = resolvePromotionGroupSessionCountValue({
                    fullGroup: group,
                    activeGroup,
                    sessionCounts,
                    groupedSessionCounts,
                    defaultSessionCount,
                  });
                  const sharedDirectionValue = resolvePromotionGroupDirection({
                    fullGroup: group,
                    activeGroup,
                    values,
                    repRangeStep,
                    directions,
                    groupedDirections,
                  });
                  const usesSharedDirection = true;
                  const sharedDirectionHasStepValue = activeGroup.some((entry) => hasSetFlowDirectionStepValue(
                    getPromotionMeasurementStepValue(entry, {
                      values,
                      repRangeStep,
                    }),
                  ));
                  const sharedDirectionAriaPrefix = shouldRenderGroupedControls
                    ? `${(activeGroup.length > 0 ? activeGroup : group).map((entry) => ROUTINE_PROMOTION_MEASUREMENT_LABELS[entry] ?? entry).join(" and ")} group`
                    : `${ROUTINE_PROMOTION_MEASUREMENT_LABELS[measurement] ?? measurement} direction`;
                  const footerNode = renderAttachedArrowFooter(measurement, index, { suppressDirection: usesSharedDirection });
                  const hasFooterNode = Boolean(footerNode);
                  const compactFieldShellClassName = !hasFooterNode
                    ? cn(
                      "relative z-10",
                      index > 0 ? "-ml-px !rounded-l-none ![border-top-left-radius:0] ![border-bottom-left-radius:0]" : undefined,
                      index < measurements.length - 1 ? "-mr-px !rounded-r-none ![border-top-right-radius:0] ![border-bottom-right-radius:0]" : undefined,
                    )
                    : undefined;

                  return (
                    <>
                      {groupLeadMeasurement === measurement ? (
                        <div
                          className="shrink-0 self-start"
                          style={{ gridColumn: `${sessionCountSpanColumnStart} / span ${sessionCountSpanColumnCount}`, gridRow: 1 }}
                        >
                          <div className="flex min-h-[2rem] justify-center" style={{ width: `${sessionCountSpanWidthRem}rem` }}>
                            <div className="flex flex-col items-center">
                              <fieldset
                                className={cn(
                                  progressionFieldShellClassName,
                                  "min-h-0 w-[6.2rem] px-2 py-1",
                                  "!rounded-b-none ![border-bottom-left-radius:0] ![border-bottom-right-radius:0] border-b-0",
                                  shouldRenderGroupedControls
                                    ? undefined
                                    : undefined,
                                )}
                              >
                                <legend
                                  className={cn(
                                    "ml-auto mr-1 block w-fit px-1 text-right text-[7px] font-semibold uppercase tracking-[0.08em] leading-none whitespace-nowrap",
                                    progressionMeasurementTitleClassName,
                                  )}
                                >
                                  Session count
                                </legend>
                                <ValidatedNumericTextInput
                                  name={`promotion-session-count-${measurement}`}
                                  inputMode="numeric"
                                  value={sessionCountValue}
                                  onCommit={(nextValue) => {
                                    if (activeGroup.length > 1) {
                                      onGroupedSessionCountChange(activeGroup, nextValue);
                                      return;
                                    }
                                    onSessionCountChange(sessionLeadMeasurement, nextValue);
                                  }}
                                  className="h-6 w-full border-0 bg-transparent px-0 py-0 text-center text-[0.88rem] font-semibold leading-tight text-[rgb(var(--text-primary)/0.96)] outline-none placeholder:text-[rgb(var(--text-secondary)/0.46)]"
                                />
                              </fieldset>
                              <div className="-mt-px w-[6.2rem]">
                                <DirectionControlFooter
                                  value={sharedDirectionValue}
                                  onToggle={() => {
                                    if (activeGroup.length > 1) {
                                      onGroupedDirectionToggle(activeGroup);
                                      return;
                                    }
                                    if (activeGroup.length === 1) {
                                      const leadMeasurement = activeGroup[0]!;
                                      onDirectionToggle(leadMeasurement, getPromotionMeasurementStepValue(leadMeasurement, {
                                        values,
                                        repRangeStep,
                                      }));
                                      return;
                                    }
                                    onDirectionToggle(measurement, getPromotionMeasurementStepValue(measurement, {
                                      values,
                                      repRangeStep,
                                    }));
                                  }}
                                  allowStraight={false}
                                  hasStepValue={sharedDirectionHasStepValue}
                                  ariaPrefix={sharedDirectionAriaPrefix}
                                  slim
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      <div
                        className="shrink-0 self-end"
                        style={{ gridColumn: index * 2 + 1, gridRow: 2 }}
                      >
                        <div>
                          {measurement === "reps" ? (
                            <CompactProgressionNumberField
                              label="REP STEP"
                              name="progressionBodyweightRepIncrement"
                              inputMode="numeric"
                              value={repRangeStep}
                              className="w-[6.2rem]"
                              labelClassName={cn(progressionMeasurementTitleClassName, "!ml-auto !mr-1 block w-fit text-right")}
                              labelStyle={{ color: "rgb(var(--accent-strong) / 0.94)" }}
                              attachedBottom={hasFooterNode}
                              attachedFooter={footerNode}
                              fieldShellClassName={compactFieldShellClassName}
                              onChange={onRepRangeStepChange}
                            />
                          ) : (
                            <CompactProgressionNumberField
                              label={labels[measurement]}
                              name={`promotion-${measurement}-step`}
                              inputMode={inputModes[measurement]}
                              value={values[measurement]}
                              className="w-[6.2rem]"
                              labelClassName={cn(progressionMeasurementTitleClassName, "!ml-auto !mr-1 block w-fit text-right")}
                              labelStyle={{ color: "rgb(var(--accent-strong) / 0.94)" }}
                              attachedBottom={hasFooterNode}
                              attachedFooter={footerNode}
                              fieldShellClassName={compactFieldShellClassName}
                              onChange={(nextValue) => onStepChange(measurement, nextValue)}
                            />
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
                {index < measurements.length - 1 ? (
                  <div
                    className="flex self-end items-end px-0 pb-px text-[9px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-yellow-on))]"
                    style={{ gridColumn: index * 2 + 2, gridRow: 2 }}
                  >
                    <div className="relative flex h-11 w-full items-stretch justify-center">
                      <button
                        type="button"
                        onClick={() => onToggleConnector(index)}
                        className={getAttachedCardActionButtonClassName({
                          intent: "positive",
                          className: "relative z-10 -mx-px h-11 w-[calc(100%+2px)] !min-w-0 !rounded-none !border !border-[rgb(var(--accent-divider-rgb)/0.18)] !bg-[rgb(var(--surface-1-rgb)/0.16)] !px-1.5 !text-[rgb(var(--accent-strong)/0.96)] ring-1 ring-[rgb(var(--text-primary)/0.12)] shadow-[inset_0_0_0_1px_rgb(255_255_255_/0.05)] hover:!bg-[rgb(var(--surface-1-rgb)/0.28)] focus-visible:ring-[rgb(var(--accent)/0.24)]",
                        })}
                        aria-label={links[index] === "and" ? "Change and to then" : "Change then to and"}
                      >
                        <ConnectorGlyph mode={links[index] ?? "then"} />
                      </button>
                    </div>
                  </div>
                ) : null}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SetFlowMeasurementStepRow({
  measurements,
  links,
  weightUnit,
  values,
  counts,
  groupedCounts,
  directions,
  groupedDirections,
  defaultCount,
  onMove,
  onToggleConnector,
  onStepChange,
  onCountChange,
  onGroupedCountChange,
  onDirectionToggle,
  onGroupedDirectionToggle,
  infoHandlers,
}: {
  measurements: SetFlowMeasurementKey[];
  links: PromotionMeasurementConnector[];
  weightUnit: string;
  values: Record<SetFlowMeasurementKey, string>;
  counts: ProgressionPlaybookFormState["progressionSetFlowCountMap"];
  groupedCounts: ProgressionPlaybookFormState["progressionSetFlowGroupedCountMap"];
  directions: Record<SetFlowMeasurementKey, SetFlowDirection>;
  groupedDirections: ProgressionPlaybookFormState["progressionSetFlowGroupedDirectionMap"];
  defaultCount: string;
  onMove: (measurement: SetFlowMeasurementKey, direction: "left" | "right") => void;
  onToggleConnector: (index: number) => void;
  onStepChange: (measurement: SetFlowMeasurementKey, nextValue: string) => void;
  onCountChange: (measurement: SetFlowMeasurementKey, nextValue: string) => void;
  onGroupedCountChange: (group: SetFlowMeasurementKey[], nextValue: string) => void;
  onDirectionToggle: (measurement: SetFlowMeasurementKey, stepValue: string) => void;
  onGroupedDirectionToggle: (group: SetFlowMeasurementKey[]) => void;
  infoHandlers?: {
    onFocusCapture?: () => void;
    onPointerDownCapture?: () => void;
  };
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const labels: Record<SetFlowMeasurementKey, string> = {
    time: "TIME (S)",
    distance: "DISTANCE",
    reps: "REP STEP",
    weight: `LOAD (${weightUnit})`,
  };
  const inputModes: Record<SetFlowMeasurementKey, "decimal" | "numeric"> = {
    time: "numeric",
    distance: "decimal",
    reps: "numeric",
    weight: "decimal",
  };
  const measurementGroups = buildPromotionMeasurementGroups(measurements, links) as SetFlowMeasurementKey[][];
  const measurementGroupIndex = new Map<SetFlowMeasurementKey, number>();
  const measurementIndexMap = new Map<SetFlowMeasurementKey, number>();
  measurementGroups.forEach((group, groupIndex) => {
    group.forEach((measurement) => {
      measurementGroupIndex.set(measurement, groupIndex);
    });
  });
  measurements.forEach((measurement, index) => {
    measurementIndexMap.set(measurement, index);
  });
  const gridTemplateColumns = measurements.flatMap((measurement, index) => {
    const columns = ["6.2rem"];
    if (index < measurements.length - 1) {
      columns.push("3.05rem");
    }
    return columns;
  }).join(" ");
  const setFlowArrowButtonClassName = (
    divider: "left" | "right" | null = null,
    connectorEdge: "left" | "right" | null = null,
  ) => getAttachedCardActionButtonClassName({
    intent: "positive",
    className: cn(
      "w-full !min-w-0 !justify-center !bg-[rgb(var(--surface-1-rgb)/0.16)] !px-0 !text-[rgb(var(--accent-strong)/0.96)] shadow-none hover:!bg-[rgb(var(--surface-1-rgb)/0.28)] focus-visible:ring-[rgb(var(--accent)/0.24)]",
      divider === "left"
        ? "!border-r !border-r-[rgb(var(--secondary-action-rgb)/0.18)]"
        : divider === "right"
          ? "!border-l !border-l-[rgb(var(--secondary-action-rgb)/0.18)]"
          : undefined,
      connectorEdge === "left"
        ? "-mr-px !rounded-r-none ![border-top-right-radius:0] ![border-bottom-right-radius:0]"
        : connectorEdge === "right"
          ? "-ml-px !rounded-l-none ![border-top-left-radius:0] ![border-bottom-left-radius:0]"
          : undefined,
    ),
  });
  const renderAttachedArrowFooter = (measurement: SetFlowMeasurementKey, index: number) => {
    const showLeft = index > 0 && links[index - 1] !== "and";
    const showRight = index < measurements.length - 1 && links[index] !== "and";
    const footerGridClassName = showLeft && showRight
      ? "grid-cols-2"
      : showLeft || showRight
        ? "grid-cols-1"
        : "";
    const footerFrameClassName = cn(
      "mt-0",
      showLeft ? "!rounded-bl-none" : undefined,
      showRight ? "!rounded-br-none" : undefined,
    );
    const footerGridRoundingClassName = cn(
      footerGridClassName,
      showLeft ? "!rounded-bl-none" : undefined,
      showRight ? "!rounded-br-none" : undefined,
    );

    if (!showLeft && !showRight) {
      return null;
    }

    return (
      <AttachedCardActionStripFrame
        className={footerFrameClassName}
        gridClassName={footerGridRoundingClassName}
      >
        {showLeft ? (
          <button
            type="button"
            onClick={() => onMove(measurements[index]!, "left")}
            className={cn(
              setFlowArrowButtonClassName("left"),
              "!rounded-l-none ![border-top-left-radius:0] ![border-bottom-left-radius:0]",
            )}
            aria-label={`Move ${ROUTINE_PROMOTION_MEASUREMENT_LABELS[measurement]} left`}
          >
            <span aria-hidden="true" className="text-[15px] leading-none">‹</span>
          </button>
        ) : null}
        {showRight ? (
          <button
            type="button"
            onClick={() => onMove(measurement, "right")}
            className={cn(
              setFlowArrowButtonClassName("right"),
              "!rounded-r-none ![border-top-right-radius:0] ![border-bottom-right-radius:0]",
            )}
            aria-label={`Move ${ROUTINE_PROMOTION_MEASUREMENT_LABELS[measurement]} right`}
          >
            <span aria-hidden="true" className="text-[15px] leading-none">›</span>
          </button>
        ) : null}
      </AttachedCardActionStripFrame>
    );
  };

  return (
    <div className="space-y-0" {...infoHandlers}>
      <div
        ref={scrollRef}
        className="hide-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]"
      >
        <div className="mx-auto flex w-max min-w-max justify-center px-1">
          <div
            className="inline-grid w-max min-w-max items-start gap-x-0 gap-y-0"
            style={{ gridTemplateColumns }}
          >
            {measurements.map((measurement, index) => (
              <Fragment key={`set-flow-step-${measurement}`}>
                {(() => {
                  const groupIndex = measurementGroupIndex.get(measurement) ?? -1;
                  const group = groupIndex >= 0 ? measurementGroups[groupIndex] ?? [measurement] : [measurement];
                  const activeGroup = getActiveSetFlowMeasurementGroup(group, values);
                  const groupLeadMeasurement = group[0] ?? measurement;
                  const countLeadMeasurement = activeGroup[0] ?? group[0] ?? measurement;
                  const shouldRenderGroupedControls = group.length > 1;
                  const countSpanStartMeasurement = group[0] ?? measurement;
                  const countSpanEndMeasurement = group[group.length - 1] ?? measurement;
                  const countSpanStartIndex = measurementIndexMap.get(countSpanStartMeasurement) ?? index;
                  const countSpanEndIndex = measurementIndexMap.get(countSpanEndMeasurement) ?? index;
                  const countSpanWidthRem = ((countSpanEndIndex - countSpanStartIndex + 1) * 6.2) + ((countSpanEndIndex - countSpanStartIndex) * 3.05);
                  const countSpanColumnStart = (countSpanStartIndex * 2) + 1;
                  const countSpanColumnCount = ((countSpanEndIndex - countSpanStartIndex) * 2) + 1;
                  const countValue = resolveSetFlowGroupCountValue({
                    fullGroup: group,
                    activeGroup,
                    counts,
                    groupedCounts,
                    defaultCount,
                  });
                  const sharedDirectionValue = resolveSetFlowGroupDirection({
                    fullGroup: group,
                    activeGroup,
                    values,
                    directions,
                    groupedDirections,
                  });
                  const sharedDirectionHasStepValue = activeGroup.some((entry) => hasSetFlowDirectionStepValue(
                    getSetFlowMeasurementStepValue(entry, values),
                  ));
                  const sharedDirectionAriaPrefix = shouldRenderGroupedControls
                    ? `${(activeGroup.length > 0 ? activeGroup : group).map((entry) => ROUTINE_PROMOTION_MEASUREMENT_LABELS[entry] ?? entry).join(" and ")} group`
                    : `${ROUTINE_PROMOTION_MEASUREMENT_LABELS[measurement] ?? measurement} direction`;
                  const footerNode = renderAttachedArrowFooter(measurement, index);
                  const hasFooterNode = Boolean(footerNode);
                  const compactFieldShellClassName = !hasFooterNode
                    ? cn(
                      "relative z-10",
                      index > 0 ? "-ml-px !rounded-l-none ![border-top-left-radius:0] ![border-bottom-left-radius:0]" : undefined,
                      index < measurements.length - 1 ? "-mr-px !rounded-r-none ![border-top-right-radius:0] ![border-bottom-right-radius:0]" : undefined,
                    )
                    : undefined;

                  return (
                    <>
                      {groupLeadMeasurement === measurement ? (
                        <div
                          className="shrink-0 self-start"
                          style={{ gridColumn: `${countSpanColumnStart} / span ${countSpanColumnCount}`, gridRow: 1 }}
                        >
                          <div className="flex min-h-[2rem] justify-center" style={{ width: `${countSpanWidthRem}rem` }}>
                            <div className="flex flex-col items-center">
                              <fieldset
                                className={cn(
                                  progressionFieldShellClassName,
                                  "min-h-0 w-[6.2rem] px-2 py-1",
                                  "!rounded-b-none ![border-bottom-left-radius:0] ![border-bottom-right-radius:0] border-b-0",
                                )}
                              >
                                <legend
                                  className={cn(
                                    "ml-auto mr-1 block w-fit px-1 text-right text-[7px] font-semibold uppercase tracking-[0.08em] leading-none whitespace-nowrap",
                                    progressionMeasurementTitleClassName,
                                  )}
                                >
                                  Set count
                                </legend>
                                <ValidatedNumericTextInput
                                  name={`set-flow-count-${measurement}`}
                                  inputMode="numeric"
                                  value={countValue}
                                  onCommit={(nextValue) => {
                                    if (activeGroup.length > 1) {
                                      onGroupedCountChange(activeGroup, nextValue);
                                      return;
                                    }
                                    onCountChange(countLeadMeasurement, nextValue);
                                  }}
                                  className="h-6 w-full border-0 bg-transparent px-0 py-0 text-center text-[0.88rem] font-semibold leading-tight text-[rgb(var(--text-primary)/0.96)] outline-none placeholder:text-[rgb(var(--text-secondary)/0.46)]"
                                />
                              </fieldset>
                              <div className="-mt-px w-[6.2rem]">
                                <DirectionControlFooter
                                  value={sharedDirectionValue}
                                  onToggle={() => {
                                    if (activeGroup.length > 1) {
                                      onGroupedDirectionToggle(activeGroup);
                                      return;
                                    }
                                    const leadMeasurement = activeGroup[0] ?? measurement;
                                    onDirectionToggle(leadMeasurement, getSetFlowMeasurementStepValue(leadMeasurement, values));
                                  }}
                                  allowStraight={false}
                                  hasStepValue={sharedDirectionHasStepValue}
                                  ariaPrefix={sharedDirectionAriaPrefix}
                                  slim
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      <div
                        className="shrink-0 self-end"
                        style={{ gridColumn: index * 2 + 1, gridRow: 2 }}
                      >
                        <CompactProgressionNumberField
                          label={labels[measurement]}
                          name={`set-flow-${measurement}-step`}
                          inputMode={inputModes[measurement]}
                          value={values[measurement]}
                          className="w-[6.2rem]"
                          labelClassName={cn(progressionMeasurementTitleClassName, "!ml-auto !mr-1 block w-fit text-right")}
                          labelStyle={{ color: "rgb(var(--accent-strong) / 0.94)" }}
                          attachedBottom={hasFooterNode}
                          attachedFooter={footerNode}
                          fieldShellClassName={compactFieldShellClassName}
                          onChange={(nextValue) => onStepChange(measurement, nextValue)}
                        />
                      </div>
                    </>
                  );
                })()}
                {index < measurements.length - 1 ? (
                  <div
                    className="flex self-end items-end px-0 pb-px text-[9px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-yellow-on))]"
                    style={{ gridColumn: index * 2 + 2, gridRow: 2 }}
                  >
                    <div className="relative flex h-11 w-full items-stretch justify-center">
                      <button
                        type="button"
                        onClick={() => onToggleConnector(index)}
                        className={getAttachedCardActionButtonClassName({
                          intent: "positive",
                          className: "relative z-10 -mx-px h-11 w-[calc(100%+2px)] !min-w-0 !rounded-none !border !border-[rgb(var(--accent-divider-rgb)/0.18)] !bg-[rgb(var(--surface-1-rgb)/0.16)] !px-1.5 !text-[rgb(var(--accent-strong)/0.96)] ring-1 ring-[rgb(var(--text-primary)/0.12)] shadow-[inset_0_0_0_1px_rgb(255_255_255_/0.05)] hover:!bg-[rgb(var(--surface-1-rgb)/0.28)] focus-visible:ring-[rgb(var(--accent)/0.24)]",
                        })}
                        aria-label={links[index] === "and" ? "Change and to then" : "Change then to and"}
                      >
                        <ConnectorGlyph mode={links[index] ?? "then"} />
                      </button>
                    </div>
                  </div>
                ) : null}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getSetFlowDirectionIntent(direction: SetFlowDirection): BottomActionIntent {
  switch (direction) {
  case "up":
    return "positive";
  case "down":
    return "danger";
  case "straight":
  default:
    return "info";
  }
}

function getDirectionActionButtonClassName(args: {
  direction: SetFlowDirection;
  active?: boolean;
  compact?: boolean;
}) {
  const intent = getSetFlowDirectionIntent(args.direction);
  return getAttachedCardActionButtonClassName({
    intent,
    className: cn(
      args.compact ? "w-full !justify-center !px-0" : "w-full !justify-center !px-3",
      "!text-[10px] !tracking-[0.1em]",
      args.active
        ? undefined
        : "opacity-82",
      intent === "info"
        ? "focus-visible:ring-[rgb(var(--secondary-action-rgb)/0.24)]"
        : intent === "danger"
          ? "focus-visible:ring-[rgb(var(--danger-rgb)/0.24)]"
          : "focus-visible:ring-[rgb(var(--accent)/0.24)]",
    ),
  });
}

function DirectionControlFooter({
  value,
  onToggle,
  allowStraight,
  hasStepValue,
  ariaPrefix = "Direction",
  slim = false,
}: {
  value: SetFlowDirection;
  onToggle: () => void;
  allowStraight: boolean;
  hasStepValue: boolean;
  ariaPrefix?: string;
  slim?: boolean;
}) {
  const canUseStraight = allowStraight || !hasStepValue;
  const isDisplayOnly = !hasStepValue;

  return (
    <AttachedCardActionStripFrame
      className="mt-0"
      gridClassName={cn("grid-cols-1", slim ? "min-h-9" : undefined)}
    >
      <button
        type="button"
        className={cn(
          getDirectionActionButtonClassName({ direction: value, active: true }),
          slim ? "!h-9 !text-[9px]" : undefined,
        )}
        onClick={isDisplayOnly ? undefined : onToggle}
        disabled={isDisplayOnly}
        aria-label={isDisplayOnly ? `${ariaPrefix} direction` : canUseStraight ? `Cycle ${ariaPrefix.toLowerCase()}` : `Flip ${ariaPrefix.toLowerCase()}`}
      >
        <span className="flex flex-col items-center justify-center gap-0.5 leading-none">
          <DirectionArrowGlyph direction={value} />
          {isDisplayOnly ? null : <ChevronDownIcon className="h-3 w-3 opacity-72" />}
        </span>
      </button>
    </AttachedCardActionStripFrame>
  );
}

function getProgressionExampleMetricValueClassName(
  change: ProgressionExampleMetricChange,
  highlightTone: "left" | "right",
) {
  switch (change) {
  case "higher":
    return "text-[rgb(var(--accent)/0.82)]";
  case "lower":
    return "text-[rgb(var(--danger-rgb)/0.95)]";
  case "same":
    return "text-[rgb(var(--accent-yellow-on))]";
  case "neutral":
  default:
    return "text-[rgb(var(--text-primary)/0.96)]";
  }
}

function ProgressionExampleArrow() {
  return (
    <span className={cn("inline-flex min-w-5 items-center justify-center text-[13px] font-bold", progressionExampleArrowClassName)}>
      {"\u2192"}
    </span>
  );
}

function ProgressionDayDirectionButton({
  dayNumber,
  direction,
  onClick,
  className,
}: {
  dayNumber: number;
  direction: SetFlowDirection;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        getDirectionActionButtonClassName({ direction, active: true, compact: true }),
        "inline-flex !min-h-[2.4rem] !min-w-[1.95rem] items-center justify-center !rounded-[0.9rem] ![border-radius:0.9rem] border px-1.5 py-1 shadow-[inset_0_0_0_1px_rgb(255_255_255_/0.02)] transition-[border-color,background-color,transform] focus-visible:outline-none focus-visible:ring-2",
        className,
      )}
      aria-label={`Cycle day ${dayNumber} shift`}
    >
      <span className="flex flex-col items-center justify-center gap-0.5 leading-none">
        <span className="flex h-3.5 items-center justify-center">
          <DirectionArrowGlyph direction={direction} />
        </span>
        <ChevronDownIcon className="h-3 w-3 opacity-72" />
      </span>
    </button>
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
            <FilterScrollPanel viewportClassName="max-h-[min(72dvh,44rem)] space-y-2.5">
              {children}
            </FilterScrollPanel>
          </div>
        </div>
      ) : null}
      {reserveLayoutSpace ? (
        <div
          aria-hidden="true"
          className={isOpen ? "h-[min(78dvh,48rem)]" : "h-[4.25rem]"}
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
  distanceUnit = "mi",
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
  showProgressionSettingsRow = true,
  extraPanelContent,
  repRangeMin,
  repRangeMax,
  cycleLengthDays: _cycleLengthDays,
  trainingFocusValue = "",
  trainingFocusCustomized = false,
  onTrainingFocusChange,
  autoApplyUpdatesToExercises,
  onAutoApplyUpdatesToExercisesChange,
}: {
  value: ProgressionPlaybookFormState;
  onChange: (nextValue: ProgressionPlaybookFormState) => void;
  weightUnit: "lbs" | "kg";
  distanceUnit?: FitnessDistanceUnit;
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
  showProgressionSettingsRow?: boolean;
  extraPanelContent?: ReactNode;
  repRangeMin?: number | null;
  repRangeMax?: number | null;
  cycleLengthDays?: number | null;
  trainingFocusValue?: TrainingGoalId | "";
  trainingFocusCustomized?: boolean;
  onTrainingFocusChange?: (goal: TrainingGoalId) => void;
  autoApplyUpdatesToExercises?: boolean;
  onAutoApplyUpdatesToExercisesChange?: (nextValue: boolean) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeInfoSection, setActiveInfoSection] = useState<ActiveProgressionInfoSection>("progression_method");
  const [hasInfoSelection, setHasInfoSelection] = useState(false);
  const [customInfoContent, setCustomInfoContent] = useState<ActiveProgressionInfoContent | null>(null);
  const [openInfoMiniSectionKey, setOpenInfoMiniSectionKey] = useState<ProgressionInfoMiniSectionKey | null>("progression_method");
  const selectedPlaybookId = value.progressionPlaybookId || null;
  const selectedMethodInfo = selectedPlaybookId
    ? PROGRESSION_METHOD_DEFINITIONS[selectedPlaybookId as ProgressionMethodId]
    : PROGRESSION_METHOD_DEFINITIONS.manual;
  const selectedStallPolicyInfo = STALL_POLICY_DEFINITIONS[value.progressionStallPolicy] ?? STALL_POLICY_DEFINITIONS.none;
  const showAutoApplyUpdatesControl = context === "routine-default"
    && typeof autoApplyUpdatesToExercises === "boolean"
    && typeof onAutoApplyUpdatesToExercisesChange === "function";
  const setFlowDirections = {
    time: normalizeSetFlowDirectionForStepValue({
      current: value.progressionSetFlowTimeDirection,
      nextValue: value.progressionSetFlowDurationStep,
    }),
    distance: normalizeSetFlowDirectionForStepValue({
      current: value.progressionSetFlowDistanceDirection,
      nextValue: value.progressionSetFlowDistanceStep,
    }),
    reps: normalizeSetFlowDirectionForStepValue({
      current: value.progressionSetFlowRepDirection,
      nextValue: value.progressionSetFlowRepStep,
    }),
    weight: normalizeSetFlowDirectionForStepValue({
      current: value.progressionSetFlowLoadDirection,
      nextValue: value.progressionSetFlowLoadStep,
    }),
  } as const;
  const derivedSetFlowId = inferLegacySetFlowFromDirections(setFlowDirections);
  const selectedSetFlowInfo = SET_FLOW_DEFINITIONS[derivedSetFlowId] ?? SET_FLOW_DEFINITIONS.straight_sets;
  const isCustomSetFlow = derivedSetFlowId === "straight_sets" && !areSetFlowDirectionsStraight(setFlowDirections);
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
      progressionSetFlow: derivedSetFlowId,
      progressionSetFlowTimeDirection: setFlowDirections.time,
      progressionSetFlowDistanceDirection: setFlowDirections.distance,
      progressionSetFlowRepDirection: setFlowDirections.reps,
      progressionSetFlowLoadDirection: setFlowDirections.weight,
      progressionSetFlowMeasurements: value.progressionSetFlowMeasurements,
      progressionSetFlowLinks: value.progressionSetFlowLinks,
      progressionSetFlowCountMap: value.progressionSetFlowCountMap,
      progressionSetFlowGroupedCountMap: value.progressionSetFlowGroupedCountMap,
      progressionSetFlowGroupedDirectionMap: value.progressionSetFlowGroupedDirectionMap,
      progressionPromotionBasis: value.progressionPromotionBasis,
      progressionRepPromotionThreshold: value.progressionRepPromotionThreshold,
      progressionCustomRepPromotionTarget: value.progressionCustomRepPromotionTarget,
      progressionPromotionDirectionMap: value.progressionPromotionDirectionMap,
      progressionPromotionSessionCountMap: value.progressionPromotionSessionCountMap,
      progressionPromotionGroupedSessionCountMap: value.progressionPromotionGroupedSessionCountMap,
      progressionTargetMutation: value.progressionTargetMutation,
      progressionHasExplicitTargetMutation: value.progressionHasExplicitTargetMutation,
      progressionRequiredQualifiedSessions: value.progressionRequiredQualifiedSessions,
      progressionQualificationWindowMode: value.progressionQualificationWindowMode,
      progressionQualificationWindowResetOnMiss: value.progressionQualificationWindowResetOnMiss,
      progressionHasExplicitQualificationWindow: value.progressionHasExplicitQualificationWindow,
    });
  };
  const setStallPolicy = (nextPolicy: ProgressionStallPolicy) => {
    onChange({
      ...value,
      progressionStallPolicy: selectedPlaybookId ? nextPolicy : "none",
    });
  };
  const setFlowDirection = (measurement: "time" | "distance" | "reps" | "weight", nextDirection: SetFlowDirection) => {
    onChange({
      ...value,
      progressionSetFlow: inferLegacySetFlowFromDirections({
        ...setFlowDirections,
        [measurement]: nextDirection,
      }),
      progressionSetFlowTimeDirection: measurement === "time" ? nextDirection : setFlowDirections.time,
      progressionSetFlowDistanceDirection: measurement === "distance" ? nextDirection : setFlowDirections.distance,
      progressionSetFlowRepDirection: measurement === "reps" ? nextDirection : setFlowDirections.reps,
      progressionSetFlowLoadDirection: measurement === "weight" ? nextDirection : setFlowDirections.weight,
    });
  };
  const updateSetFlowStepValue = (
    measurement: "time" | "distance" | "reps" | "weight",
    nextValue: string,
  ) => {
    const currentDirection = measurement === "time"
      ? setFlowDirections.time
      : measurement === "distance"
        ? setFlowDirections.distance
        : measurement === "reps"
          ? setFlowDirections.reps
          : setFlowDirections.weight;
    const normalizedDirection = normalizeSetFlowDirectionForStepValue({
      current: currentDirection,
      nextValue,
    });

    onChange(syncSetFlowCountState({
      ...value,
      progressionSetFlow: inferLegacySetFlowFromDirections({
        ...setFlowDirections,
        [measurement]: normalizedDirection,
      }),
      progressionSetFlowTimeDirection: measurement === "time" ? normalizedDirection : setFlowDirections.time,
      progressionSetFlowDistanceDirection: measurement === "distance" ? normalizedDirection : setFlowDirections.distance,
      progressionSetFlowRepDirection: measurement === "reps" ? normalizedDirection : setFlowDirections.reps,
      progressionSetFlowLoadDirection: measurement === "weight" ? normalizedDirection : setFlowDirections.weight,
      progressionSetFlowDurationStep: measurement === "time" ? nextValue : value.progressionSetFlowDurationStep,
      progressionSetFlowDistanceStep: measurement === "distance" ? nextValue : value.progressionSetFlowDistanceStep,
      progressionSetFlowRepStep: measurement === "reps" ? nextValue : value.progressionSetFlowRepStep,
      progressionSetFlowLoadStep: measurement === "weight" ? nextValue : value.progressionSetFlowLoadStep,
    }, setFlowMeasurementGroups));
  };
  const toggleSetFlowDirection = (
    measurement: "time" | "distance" | "reps" | "weight",
    stepValue: string,
  ) => {
    const currentDirection = measurement === "time"
      ? setFlowDirections.time
      : measurement === "distance"
        ? setFlowDirections.distance
        : measurement === "reps"
          ? setFlowDirections.reps
          : setFlowDirections.weight;
    setFlowDirection(
      measurement,
      cycleSetFlowDirection({
        current: currentDirection,
        hasStepValue: hasSetFlowDirectionStepValue(stepValue),
      }),
    );
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
  const showLegacyTopMethodRail = true;
  const shouldRenderProgressionInfo = true;
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
  const routinePromotionMeasurements = value.progressionStrengthPromotionMeasurements;
  const routinePromotionLinks = value.progressionStrengthPromotionLinks;
  const routinePromotionMeasurementGroups = buildPromotionMeasurementGroups(routinePromotionMeasurements, routinePromotionLinks);
  const promotionSummary = promotionUiModel?.summary ?? (
    value.progressionPromotionBasis === "weight_only"
      ? "Weight only: Reps are tracked for guidance but do not affect auto-promotion."
      : value.progressionPromotionBasis === "reps_only"
        ? "Reps only: Weight is tracked/manual but does not affect auto-promotion."
        : "Weight + reps: Both dimensions participate in auto-promotion."
  );
  const targetMutationUiModel: ProgressionTargetMutationUiModel = buildProgressionTargetMutationUiModel({
    context,
    activeMeasurements: promotionUiModel?.activeMeasurements ?? [],
    savedTargetMutation: value.progressionTargetMutation,
  });
  const qualificationWindowOptions = [
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
  ] as const;
  const defaultRoutineSessionCount = value.progressionRequiredQualifiedSessions.trim() || "1";
  const setFlowStepValues: Record<SetFlowMeasurementKey, string> = {
    time: value.progressionSetFlowDurationStep,
    distance: value.progressionSetFlowDistanceStep,
    reps: value.progressionSetFlowRepStep,
    weight: value.progressionSetFlowLoadStep,
  };
  const setFlowMeasurements = value.progressionSetFlowMeasurements as SetFlowMeasurementKey[];
  const setFlowLinks = value.progressionSetFlowLinks;
  const setFlowMeasurementGroups = buildPromotionMeasurementGroups(setFlowMeasurements, setFlowLinks) as SetFlowMeasurementKey[][];
  const defaultSetFlowCount = "3";
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
  const shouldRenderSetStepSettings = Boolean(selectedPlaybookId);
  const cycleLengthDays = Math.max(1, _cycleLengthDays ?? 7);
  const shouldRenderProgressionSettingsRow = showProgressionSettingsRow && (shouldRenderPromotionStepSettings || shouldRenderDeloadSettings || shouldRenderSetStepSettings);
  const keyTermRows = PROGRESSION_INFO_TERM_DEFINITIONS
    .filter((term) => [
      "Sets",
      "Min reps",
      "Max reps",
      "Load",
      "Progression step",
      "Duration step",
      "Distance step",
      "Pace / volume step",
      "Equipment step",
      "Session Settings",
      "Session count",
      "Day Sync Session",
      "Set Settings",
      "Stall",
      "Deload",
    ].includes(term.term))
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

  useEffect(() => {
    const handleRoutineEditorSectionToggle = (event: Event) => {
      const payload = (event as CustomEvent<{ sectionKey?: ProgressionInfoMiniSectionKey; isOpen?: boolean }>).detail;
      if (!payload?.sectionKey || typeof payload.isOpen !== "boolean") {
        return;
      }

      const sectionKey: ProgressionInfoMiniSectionKey = payload.sectionKey;

      setOpenInfoMiniSectionKey((current) => {
        if (payload.isOpen) {
          return sectionKey;
        }

        return current === sectionKey ? null : current;
      });
    };

    window.addEventListener("fitness:routine-editor-section-toggle", handleRoutineEditorSectionToggle);
    return () => window.removeEventListener("fitness:routine-editor-section-toggle", handleRoutineEditorSectionToggle);
  }, []);

  useEffect(() => {
    const nextSectionKey = (() => {
      if (activeInfoSection === "custom") {
        return customInfoContent?.sectionKey ?? null;
      }

      switch (activeInfoSection) {
        case "regression_method":
          return "regression_method";
        case "deload_settings":
          return "deload_settings";
        case "day_settings":
          return "day_settings";
        case "set_step_settings":
          return "set_step_settings";
        case "progression_method":
        default:
          return "progression_method";
      }
    })();

    if (nextSectionKey) {
      setOpenInfoMiniSectionKey(nextSectionKey);
    }
  }, [activeInfoSection, customInfoContent]);

  const activeInfoContent = (() => {
    if (activeInfoSection === "custom" && customInfoContent) {
      return customInfoContent;
    }

    switch (activeInfoSection) {
      case "regression_method":
        return {
          title: "Regression",
          summary: selectedPlaybookId
            ? "Controls what happens after repeated misses. None leaves the target where it is; Deload can lower the target so the progression lane can rebuild."
            : "Regression stays off while progression is manual because the app is not generating progression changes for this target.",
          rows: [
            { label: "Selected", value: selectedStallPolicyInfo.label },
            { label: "Effect", value: selectedStallPolicyInfo.whatItDoes },
            { label: "Safety", value: "A deload never applies silently; it appears as an update that still needs review." },
          ],
        };
      case "deload_settings":
        return {
          title: "Regression",
          summary: "These inputs define when a miss streak becomes a stall and how far the target drops when Deload is active.",
          rows: [
            { label: "Missed count", value: `${value.progressionStallThreshold || "-"} missed attempts` },
            { label: "Deload", value: `${value.progressionDeloadPercent || "-"}% target reduction` },
            { label: "Applies to", value: "The measured target that is currently progressing for the exercise." },
          ],
        };
      case "day_settings":
        return {
          title: "Day Settings",
          summary: "Day Settings shape the target for that cycle day before Session Settings and Set Settings continue the progression flow.",
          rows: [
            {
              label: "Day Sync Session",
              value: value.progressionDayMode === "synced"
                ? "Synced: Day Settings mirror Session Settings and the day input boxes stay hidden."
                : "Unsynced: Day Settings use their own step inputs and show inline beside the regression inputs.",
            },
            {
              label: "Active measurements",
              value: "Only measurements active in the Session Settings row appear here. Unused measurements stay hidden.",
            },
            ...getPromotionStepInfoRows(),
            { label: "Effort schedule", value: value.progressionEffortWaveDirections.map((direction, index) => `Day ${index + 1} ${formatSetFlowDirectionGlyph(direction)}`).join(" • ") },
          ],
        };
      case "set_step_settings":
        return {
          title: "Set Settings",
          summary: "Set Settings control within-session set order, grouping, set count, and asc, desc, or straight direction for the active set measurements.",
          rows: [
            { label: "Flow", value: isCustomSetFlow ? "Custom order and grouping per measurement" : selectedSetFlowInfo.label },
            { label: "Set count", value: "Each active measurement or active AND group holds its own set count span. Grouped sets default to a shared count." },
            { label: "Session effect", value: "Changes the within-session example, quick log targets, and next-set defaults while logging." },
            { label: "Step", value: `Load ${value.progressionSetFlowLoadStep || "-"} ${weightUnit} | Reps ${value.progressionSetFlowRepStep || "-"} | Time ${value.progressionSetFlowDurationStep || "-"}s | Distance ${value.progressionSetFlowDistanceStep || "-"}` },
            { label: "Empty inputs", value: "Blank set-step inputs stay straight, do not show active direction behavior, and are omitted from active grouped set logic." },
          ],
        };
      case "progression_method":
      default:
        return {
          title: "Progression",
          summary: "Controls whether targets stay exactly where you set them or move through reviewed progression after logged proof.",
          rows: [
            { label: "Type", value: selectedPlaybookId ? "Auto" : "Manual" },
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
  const showCustomInfo = (payload: ActiveProgressionInfoContent) => {
    setCustomInfoContent(payload);
    setActiveInfoSection("custom");
    setHasInfoSelection(true);
  };
  const getCustomInfoHandlers = (buildPayload: () => ActiveProgressionInfoContent) => ({
    onFocusCapture: () => showCustomInfo(buildPayload()),
    onPointerDownCapture: () => showCustomInfo(buildPayload()),
  });
  const getProgressionMethodInfoPayload = (playbookId: ProgressionPlaybookId | ""): ActiveProgressionInfoContent => {
    const methodInfo = playbookId
      ? PROGRESSION_METHOD_DEFINITIONS[playbookId as ProgressionMethodId]
      : PROGRESSION_METHOD_DEFINITIONS.manual;
    return {
      title: "Progression",
      summary: methodInfo.id === "manual"
        ? "Manual keeps the target exactly where you set it until you change it yourself."
        : methodInfo.whatItDoes,
      rows: [
        { label: "Type", value: playbookId ? "Auto" : "Manual" },
        { label: "Use it for", value: methodInfo.id === "manual" ? "Anything you want to control directly." : methodInfo.useItFor },
        { label: "Review", value: "Changes still show up as explicit updates to review, not hidden edits." },
      ],
      sectionKey: "progression_method",
    };
  };
  const getRegressionInfoPayload = (policy: ProgressionStallPolicy): ActiveProgressionInfoContent => {
    const policyInfo = STALL_POLICY_DEFINITIONS[policy] ?? STALL_POLICY_DEFINITIONS.none;
    return {
      title: "Regression",
      summary: policyInfo.whatItDoes,
      rows: [
        { label: "Selected", value: policyInfo.label },
        { label: "Use it for", value: policyInfo.useItFor },
        { label: "Safety", value: "Regression changes never apply silently; they still need explicit review." },
      ],
      sectionKey: "regression_method",
    };
  };
  const getSetFlowInfoPayload = (measurement?: ProgressionMeasurementKey): ActiveProgressionInfoContent => {
    const selectedMeasurement = measurement ?? "time";
    const selectedDirection = selectedMeasurement === "time"
      ? setFlowDirections.time
      : selectedMeasurement === "distance"
        ? setFlowDirections.distance
        : selectedMeasurement === "reps"
          ? setFlowDirections.reps
          : setFlowDirections.weight;
    return {
      title: "Set Settings",
      summary: isCustomSetFlow
        ? "Each active set measurement can be ordered, grouped, counted, and pointed up, down, or straight across sets."
        : selectedSetFlowInfo.shortExplanation,
      rows: [
        { label: "Current flow", value: isCustomSetFlow ? "Custom order and grouping per measurement" : selectedSetFlowInfo.label },
        { label: ROUTINE_PROMOTION_MEASUREMENT_LABELS[selectedMeasurement], value: formatSetFlowDirectionLabel(selectedDirection) },
        { label: "Session effect", value: "Affects set-to-set targets and the within-session example, not post-session promotion proof." },
      ],
      sectionKey: "set_step_settings",
    };
  };
  const getPromotionBasisInfoPayload = (optionId: ProgressionPromotionUiOptionId): ActiveProgressionInfoContent => {
    const summaries: Record<ProgressionPromotionUiOptionId, string> = {
      weight_only: "Load proves readiness. Reps are tracked but do not decide promotion.",
      reps_only: "Reps prove readiness. Load is tracked but does not decide promotion.",
      weight_and_reps: "Load and reps both prove readiness before the next update can be earned.",
      time_only: "Elapsed time proves readiness for cardio progression.",
      distance_only: "Distance proves readiness for cardio progression.",
      time_and_distance: "Time and distance both need qualifying evidence.",
    };
    const optionLabel = promotionOptions.find((option) => option.id === optionId)?.label ?? optionId;
    return {
      title: "Promotion uses",
      summary: summaries[optionId],
      rows: [
        { label: "Selected", value: optionLabel },
        { label: "Rule", value: "This setting proves readiness only. It does not decide what mutates next." },
      ],
      sectionKey: "progression_method",
    };
  };
  const getTargetMutationInfoPayload = (
    targetMutation: ProgressionPlaybookFormState["progressionTargetMutation"],
  ): ActiveProgressionInfoContent => ({
    title: "Target changes",
    summary: "Target changes decide what mutates after readiness is earned. Readiness rules stay separate.",
    rows: [
      { label: "Selected", value: getProgressionTargetMutationLabel(targetMutation) },
      { label: "Rule", value: "This changes the next target only. It does not change qualification proof." },
    ],
    sectionKey: "progression_method",
  });
  const getQualificationWindowInfoPayload = (
    requiredQualifiedSessions: string,
  ): ActiveProgressionInfoContent => ({
    title: "Session count",
    summary: "This count defines how many successful sessions a measurement or active AND group holds before the next progression move can be earned.",
    rows: [
      { label: "Selected", value: requiredQualifiedSessions || "1" },
      { label: "Rule", value: "Each successful session must independently satisfy the readiness rule; partial sessions never combine into one fake pass." },
    ],
    sectionKey: "progression_method",
  });
  const getRepThresholdInfoPayload = (threshold: ProgressionPlaybookFormState["progressionRepPromotionThreshold"]): ActiveProgressionInfoContent => ({
    title: "Rep target for promotion",
    summary: threshold === "top_half_of_range"
      ? "Promotion can qualify once reps enter the top half of the range."
      : threshold === "custom"
        ? "Promotion uses a custom rep count instead of the standard range rules."
        : "Promotion waits for the top of the rep range.",
    rows: [
      { label: "Selected", value: threshold === "top_half_of_range" ? "Top half of range" : threshold === "custom" ? "Custom rep target" : "Top of range" },
      ...(activeRepPromotionPreview ? [{ label: "Preview", value: activeRepPromotionPreview }] : []),
    ],
    sectionKey: "progression_method",
  });
  const getRoutinePromotionOrderInfoPayload = (
    measurements: ProgressionMeasurementKey[] = routinePromotionMeasurements,
    links: PromotionMeasurementConnector[] = routinePromotionLinks,
  ): ActiveProgressionInfoContent => ({
    title: "Session Settings",
    summary: "Session Settings control measurement order, grouping, session count span, and asc or desc direction for the measurements that can progress.",
    rows: [
      { label: "Order", value: formatPromotionMeasurementSequence(measurements, links) },
      { label: "Resolution", value: "Each exercise keeps this order, then drops anything its target does not use or whose step field is blank. Empty measurements are omitted from active AND groups, and active AND groups share session count and direction until the flow advances." },
    ],
    sectionKey: "progression_method",
  });
  const getRoutinePromotionStepValuesForState = (
    state: ProgressionPlaybookFormState,
  ): Record<ProgressionMeasurementKey, string> => ({
    time: state.progressionDurationIncrementSeconds,
    distance: state.progressionDistanceIncrement,
    reps: state.progressionBodyweightRepIncrement,
    weight: state.progressionLoadIncrement,
    calories: "",
  });
  const resolveRoutineDefaultQualifiedSessionCount = (
    state: ProgressionPlaybookFormState,
    groups: ProgressionMeasurementKey[][],
  ) => {
    const firstGroup = groups.find((group) => group.length > 0);
    if (!firstGroup) {
      return state.progressionRequiredQualifiedSessions.trim() || "1";
    }

    const routinePromotionValues = getRoutinePromotionStepValuesForState(state);
    const activeGroup = getActivePromotionMeasurementGroup(firstGroup, {
      values: routinePromotionValues,
      repRangeStep: state.progressionBodyweightRepIncrement,
      repRangeMin: state.progressionPromotionRepRangeMin,
      repRangeMax: state.progressionPromotionRepRangeMax,
    });

    return resolvePromotionGroupSessionCountValue({
      fullGroup: firstGroup,
      activeGroup,
      sessionCounts: state.progressionPromotionSessionCountMap,
      groupedSessionCounts: state.progressionPromotionGroupedSessionCountMap,
      defaultSessionCount: state.progressionRequiredQualifiedSessions,
    });
  };
  const applyRoutineDefaultPromotionState = (
    draftState: ProgressionPlaybookFormState,
    groups: ProgressionMeasurementKey[][],
  ) => {
    const nextGroups = groups.map((group) => [...group]);
    const nextGroupedSessionCounts = ensurePromotionGroupedSessionCountFieldMap({
      groups: nextGroups,
      measurementCounts: draftState.progressionPromotionSessionCountMap,
      groupedCounts: draftState.progressionPromotionGroupedSessionCountMap,
      fallbackValue: draftState.progressionRequiredQualifiedSessions.trim() || "1",
    });
    const nextState = {
      ...draftState,
      progressionPromotionGroupedSessionCountMap: nextGroupedSessionCounts,
    };

    return {
      ...nextState,
      progressionTargetMutation: inferRoutineDefaultTargetMutation({
        measurements: nextState.progressionStrengthPromotionMeasurements,
        links: nextState.progressionStrengthPromotionLinks,
        values: getRoutinePromotionStepValuesForState(nextState),
        repRangeStep: nextState.progressionBodyweightRepIncrement,
        repRangeMin: nextState.progressionPromotionRepRangeMin,
        repRangeMax: nextState.progressionPromotionRepRangeMax,
        fallback: nextState.progressionTargetMutation,
      }),
      progressionHasExplicitTargetMutation: true,
      progressionRequiredQualifiedSessions: resolveRoutineDefaultQualifiedSessionCount(nextState, nextGroups),
      progressionHasExplicitQualificationWindow: true,
    };
  };
  const applyRoutinePromotionGrouping = (groups: ProgressionMeasurementKey[][]) => {
    const nextMeasurements = flattenPromotionMeasurementGroups(groups);
    const nextLinks = buildPromotionLinksFromGroups(groups);
    onChange(applyRoutineDefaultPromotionState({
      ...value,
      progressionStrengthPromotionMeasurements: nextMeasurements,
      progressionBodyweightPromotionMeasurements: nextMeasurements,
      progressionCardioPromotionMeasurements: nextMeasurements,
      progressionStrengthPromotionLinks: nextLinks,
      progressionBodyweightPromotionLinks: nextLinks,
      progressionCardioPromotionLinks: nextLinks,
    }, groups));
    showCustomInfo(getRoutinePromotionOrderInfoPayload(nextMeasurements, nextLinks));
  };
  const moveRoutinePromotionMeasurement = (measurement: ProgressionMeasurementKey, direction: "left" | "right") => {
    const currentGroups = routinePromotionMeasurementGroups.map((group) => [...group]);
    const currentIndex = currentGroups.findIndex((group) => group.includes(measurement));
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentGroups.length) {
      return;
    }

    const [movedGroup] = currentGroups.splice(currentIndex, 1);
    currentGroups.splice(targetIndex, 0, movedGroup);
    applyRoutinePromotionGrouping(currentGroups);
  };
  const toggleRoutinePromotionConnector = (index: number) => {
    const nextLinks = [...routinePromotionLinks];
    nextLinks[index] = nextLinks[index] === "and" ? "then" : "and";
    applyRoutinePromotionGrouping(buildPromotionMeasurementGroups(routinePromotionMeasurements, nextLinks));
  };
  const setRoutinePromotionStep = (measurement: ProgressionMeasurementKey, nextValue: string) => {
    if (!isRoutineDefaultContext) {
      return;
    }

    const currentDirection = value.progressionPromotionDirectionMap[measurement] ?? "up";
    const normalizedDirection = hasSetFlowDirectionStepValue(nextValue)
      ? normalizeSetFlowDirectionForStepValue({
        current: currentDirection,
        nextValue,
      })
      : currentDirection;

    if (measurement === "time") {
      onChange(applyRoutineDefaultPromotionState({
        ...value,
        progressionDurationIncrementSeconds: nextValue,
        progressionPromotionDirectionMap: {
          ...value.progressionPromotionDirectionMap,
          [measurement]: normalizedDirection,
        },
      }, routinePromotionMeasurementGroups));
      return;
    }

    if (measurement === "distance") {
      onChange(applyRoutineDefaultPromotionState({
        ...value,
        progressionDistanceIncrement: nextValue,
        progressionPromotionDirectionMap: {
          ...value.progressionPromotionDirectionMap,
          [measurement]: normalizedDirection,
        },
      }, routinePromotionMeasurementGroups));
      return;
    }

    if (measurement === "reps") {
      onChange(applyRoutineDefaultPromotionState({
        ...value,
        progressionBodyweightRepIncrement: nextValue,
        progressionPromotionDirectionMap: {
          ...value.progressionPromotionDirectionMap,
          [measurement]: normalizedDirection,
        },
      }, routinePromotionMeasurementGroups));
      return;
    }

    onChange(applyRoutineDefaultPromotionState({
      ...value,
      progressionLoadIncrement: nextValue,
      progressionBarbellLoadIncrement: nextValue,
      progressionDumbbellLoadIncrement: nextValue,
      progressionMachineLoadIncrement: nextValue,
      progressionCableLoadIncrement: nextValue,
      progressionPromotionDirectionMap: {
        ...value.progressionPromotionDirectionMap,
        [measurement]: normalizedDirection,
      },
    }, routinePromotionMeasurementGroups));
  };
  const setRoutinePromotionDirection = (measurement: ProgressionMeasurementKey, stepValue: string) => {
    onChange(applyRoutineDefaultPromotionState({
      ...value,
      progressionPromotionDirectionMap: {
        ...value.progressionPromotionDirectionMap,
        [measurement]: cycleSetFlowDirection({
          current: value.progressionPromotionDirectionMap[measurement] ?? "up",
          hasStepValue: hasSetFlowDirectionStepValue(stepValue),
        }),
      },
    }, routinePromotionMeasurementGroups));
  };
  const setRoutinePromotionGroupedDirection = (group: ProgressionMeasurementKey[]) => {
    if (group.length < 2) {
      return;
    }

    const nextDirection = cycleSetFlowDirection({
      current: resolvePromotionGroupDirection({
        fullGroup: group,
        activeGroup: group,
        values: routinePromotionStepValues,
        repRangeStep: value.progressionBodyweightRepIncrement,
        directions: value.progressionPromotionDirectionMap,
        groupedDirections: value.progressionPromotionGroupedDirectionMap,
      }),
      hasStepValue: true,
    });
    const groupKey = getPromotionMeasurementGroupKey(group);

    onChange(applyRoutineDefaultPromotionState({
      ...value,
      progressionPromotionGroupedDirectionMap: {
        ...value.progressionPromotionGroupedDirectionMap,
        [groupKey]: nextDirection,
      },
    }, routinePromotionMeasurementGroups));
  };
  const setRoutinePromotionSessionCount = (measurement: ProgressionMeasurementKey, nextValue: string) => {
    onChange(applyRoutineDefaultPromotionState({
      ...value,
      progressionPromotionSessionCountMap: {
        ...value.progressionPromotionSessionCountMap,
        [measurement]: nextValue,
      },
    }, routinePromotionMeasurementGroups));
    showCustomInfo(getQualificationWindowInfoPayload(nextValue));
  };
  const setRoutinePromotionGroupedSessionCount = (group: ProgressionMeasurementKey[], nextValue: string) => {
    const groupKey = getPromotionMeasurementGroupKey(group);
    onChange(applyRoutineDefaultPromotionState({
      ...value,
      progressionPromotionGroupedSessionCountMap: {
        ...value.progressionPromotionGroupedSessionCountMap,
        [groupKey]: nextValue,
      },
    }, routinePromotionMeasurementGroups));
    showCustomInfo(getQualificationWindowInfoPayload(nextValue));
  };
  const setRoutinePromotionRepRangeMin = (nextValue: string) => {
    onChange({
      ...value,
      progressionPromotionRepRangeMin: nextValue,
    });
  };
  const setRoutinePromotionRepRangeMax = (nextValue: string) => {
    onChange({
      ...value,
      progressionPromotionRepRangeMax: nextValue,
    });
  };
  const syncSetFlowCountState = (draftState: ProgressionPlaybookFormState, groups: SetFlowMeasurementKey[][]) => {
    const nextGroupedCounts = ensureSetFlowGroupedCountFieldMap({
      groups,
      measurementCounts: draftState.progressionSetFlowCountMap,
      groupedCounts: draftState.progressionSetFlowGroupedCountMap,
      fallbackValue: draftState.progressionSetCount || defaultSetFlowCount,
    });
    return {
      ...draftState,
      progressionSetFlowGroupedCountMap: nextGroupedCounts,
      progressionSetCount: resolveTotalSetCountFromGroups({
        groups,
        values: {
          time: draftState.progressionSetFlowDurationStep,
          distance: draftState.progressionSetFlowDistanceStep,
          reps: draftState.progressionSetFlowRepStep,
          weight: draftState.progressionSetFlowLoadStep,
        },
        counts: draftState.progressionSetFlowCountMap,
        groupedCounts: nextGroupedCounts,
        fallbackCount: draftState.progressionSetCount || defaultSetFlowCount,
      }),
    };
  };
  const applySetFlowGrouping = (groups: SetFlowMeasurementKey[][]) => {
    const nextMeasurements = groups.flat();
    const nextLinks = buildPromotionLinksFromGroups(groups);
    onChange(syncSetFlowCountState({
      ...value,
      progressionSetFlowMeasurements: nextMeasurements,
      progressionSetFlowLinks: nextLinks,
    }, groups));
  };
  const moveSetFlowMeasurement = (measurement: SetFlowMeasurementKey, direction: "left" | "right") => {
    const currentGroups = setFlowMeasurementGroups.map((group) => [...group]);
    const currentIndex = currentGroups.findIndex((group) => group.includes(measurement));
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentGroups.length) {
      return;
    }

    const [movedGroup] = currentGroups.splice(currentIndex, 1);
    currentGroups.splice(targetIndex, 0, movedGroup);
    applySetFlowGrouping(currentGroups);
  };
  const toggleSetFlowConnector = (index: number) => {
    const nextLinks = [...setFlowLinks];
    nextLinks[index] = nextLinks[index] === "and" ? "then" : "and";
    applySetFlowGrouping(buildPromotionMeasurementGroups(setFlowMeasurements, nextLinks) as SetFlowMeasurementKey[][]);
  };
  const setSetFlowCount = (measurement: SetFlowMeasurementKey, nextValue: string) => {
    onChange(syncSetFlowCountState({
      ...value,
      progressionSetFlowCountMap: {
        ...value.progressionSetFlowCountMap,
        [measurement]: nextValue,
      },
    }, setFlowMeasurementGroups));
  };
  const setSetFlowGroupedCount = (group: SetFlowMeasurementKey[], nextValue: string) => {
    const groupKey = getSetFlowMeasurementGroupKey(group);
    onChange(syncSetFlowCountState({
      ...value,
      progressionSetFlowGroupedCountMap: {
        ...value.progressionSetFlowGroupedCountMap,
        [groupKey]: nextValue,
      },
    }, setFlowMeasurementGroups));
  };
  const setSetFlowGroupedDirection = (group: SetFlowMeasurementKey[]) => {
    if (group.length < 2) {
      return;
    }

    const nextDirection = cycleSetFlowDirection({
      current: resolveSetFlowGroupDirection({
        fullGroup: group,
        activeGroup: group,
        values: setFlowStepValues,
        directions: setFlowDirections,
        groupedDirections: value.progressionSetFlowGroupedDirectionMap,
      }),
      hasStepValue: true,
    });
    const groupKey = getSetFlowMeasurementGroupKey(group);

    onChange({
      ...value,
      progressionSetFlowGroupedDirectionMap: {
        ...value.progressionSetFlowGroupedDirectionMap,
        [groupKey]: nextDirection,
      },
    });
  };
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
  const setTargetMutation = (nextValue: string) => {
    onChange({
      ...value,
      progressionTargetMutation: nextValue as ProgressionPlaybookFormState["progressionTargetMutation"],
      progressionHasExplicitTargetMutation: true,
    });
  };
  const setRequiredQualifiedSessions = (nextValue: string) => {
    onChange({
      ...value,
      progressionRequiredQualifiedSessions: nextValue,
      progressionHasExplicitQualificationWindow: true,
    });
  };
  const setDayMode = (nextMode: ProgressionDayMode) => {
    onChange({
      ...value,
      progressionDayMode: nextMode,
    });
  };
  const setEffortWaveDirection = (dayIndex: number, nextDirection: SetFlowDirection) => {
    const nextDirections = Array.from({ length: cycleLengthDays }, (_, index) => value.progressionEffortWaveDirections[index] ?? "straight");
    nextDirections[dayIndex] = nextDirection;
    onChange({
      ...value,
      progressionEffortWaveDirections: nextDirections,
    });
  };
  const toggleEffortWaveDirection = (dayIndex: number) => {
    const currentDirection = value.progressionEffortWaveDirections[dayIndex] ?? "straight";
    setEffortWaveDirection(
      dayIndex,
      cycleSetFlowDirection({
        current: currentDirection,
        hasStepValue: false,
      }),
    );
  };
  const renderDayProgressionField = (fieldId: PromotionStepFieldId) => {
    const readOnly = value.progressionDayMode === "synced";
    switch (fieldId) {
    case "barbellLoad":
    case "dumbbellLoad":
    case "machineLoad":
    case "cableLoad":
    case "genericLoad":
      return (
        <ProgressionNumberField
          label={`LOAD (${weightUnit})`}
          labelClassName={progressionMeasurementTitleClassName}
          name="progressionDayLoadStep"
          inputMode="decimal"
          value={readOnly ? value.progressionLoadIncrement : value.progressionDayLoadStep}
          readOnly={readOnly}
          onChange={(nextValue) => onChange({ ...value, progressionDayLoadStep: nextValue })}
        />
      );
    case "bodyweightReps":
      return (
        <ProgressionNumberField
          label="REPS"
          labelClassName={progressionMeasurementTitleClassName}
          name="progressionDayRepStep"
          inputMode="numeric"
          value={readOnly ? value.progressionBodyweightRepIncrement : value.progressionDayRepStep}
          readOnly={readOnly}
          onChange={(nextValue) => onChange({ ...value, progressionDayRepStep: nextValue })}
        />
      );
    case "duration":
      return (
        <ProgressionNumberField
          label="TIME (S)"
          labelClassName={progressionMeasurementTitleClassName}
          name="progressionDayDurationStep"
          inputMode="numeric"
          value={readOnly ? value.progressionDurationIncrementSeconds : value.progressionDayDurationStep}
          readOnly={readOnly}
          onChange={(nextValue) => onChange({ ...value, progressionDayDurationStep: nextValue })}
        />
      );
    case "distance":
      return (
        <ProgressionNumberField
          label="DISTANCE"
          labelClassName={progressionMeasurementTitleClassName}
          name="progressionDayDistanceStep"
          inputMode="decimal"
          value={readOnly ? value.progressionDistanceIncrement : value.progressionDayDistanceStep}
          readOnly={readOnly}
          onChange={(nextValue) => onChange({ ...value, progressionDayDistanceStep: nextValue })}
        />
      );
    default:
      return null;
    }
  };
  const renderPromotionStepField = (fieldId: PromotionStepFieldId) => {
    switch (fieldId) {
      case "barbellLoad":
        return (
          <ProgressionNumberField
            label={`BARBELL (${weightUnit})`}
            labelClassName={progressionMeasurementTitleClassName}
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
            labelClassName={progressionMeasurementTitleClassName}
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
            labelClassName={progressionMeasurementTitleClassName}
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
            labelClassName={progressionMeasurementTitleClassName}
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
            labelClassName={progressionMeasurementTitleClassName}
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
            labelClassName={progressionMeasurementTitleClassName}
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
            labelClassName={progressionMeasurementTitleClassName}
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
            labelClassName={progressionMeasurementTitleClassName}
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
  const progressionSettingsPipeClassName = "h-11 w-px shrink-0 self-end -translate-y-[31px] rounded-full bg-[rgb(var(--accent-strong)/0.82)]";
  const renderInlineSettingsFields = (fields: ReactNode[], infoSection: ActiveProgressionInfoSection) => {
    if (fields.length === 0) {
      return null;
    }

    return (
      <div className="hide-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 pt-1 [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]" {...getInfoSectionHandlers(infoSection)}>
        <div className={cn(progressionSettingsFieldRowClassName, "mx-auto px-1")}>
          {fields}
        </div>
      </div>
    );
  };
  const renderInlineSettingsFieldGroups = (
    groups: Array<{ key: string; title?: string; titleClassName?: string; fields: ReactNode[] }>,
    infoSection: ActiveProgressionInfoSection,
  ) => {
    const visibleGroups = groups.filter((group) => group.fields.length > 0);
    if (visibleGroups.length === 0) {
      return null;
    }

    return (
      <div className="hide-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 pt-1 [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]" {...getInfoSectionHandlers(infoSection)}>
        <div className={cn(progressionSettingsFieldRowClassName, "mx-auto items-end px-1")}>
          {visibleGroups.map((group, groupIndex) => (
            <Fragment key={group.key}>
              {groupIndex > 0 ? <div className={progressionSettingsPipeClassName} aria-hidden="true" /> : null}
              <div className={cn("shrink-0", group.title ? "space-y-2" : undefined)}>
                {group.title ? (
                  <div className={progressionSettingsGroupTitleClassName}>
                    <p className={cn(
                      progressionSettingsGroupLabelClassName,
                      group.titleClassName ?? "text-[rgb(var(--accent-divider-rgb)/0.9)]",
                    )}>
                      {group.title}
                    </p>
                    <MetricAccentBar variant="thin" className="w-full opacity-85" />
                  </div>
                ) : null}
                <div className={cn(progressionSettingsFieldRowClassName, "gap-1.5")}>
                  {group.fields}
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    );
  };
  const sessionSettingFields = visiblePromotionStepFieldIds.map((fieldId) => (
    <div key={`session-${fieldId}`} className="w-[6.65rem] shrink-0">
      {renderPromotionStepField(fieldId)}
    </div>
  ));
  const effortWaveDirections = Array.from(
    { length: cycleLengthDays },
    (_, index) => value.progressionEffortWaveDirections[index] ?? "straight",
  );
  const promotionLoadStepValue = parseOptionalPositiveNumber(value.progressionLoadIncrement) ?? 5;
  const promotionRepStepValue = parseOptionalPositiveInteger(value.progressionBodyweightRepIncrement) ?? 1;
  const promotionDurationStepValue = parseOptionalPositiveInteger(value.progressionDurationIncrementSeconds) ?? 60;
  const promotionDistanceStepValue = parseOptionalPositiveNumber(value.progressionDistanceIncrement) ?? 1;
  const dayLoadStepValue = parseOptionalPositiveNumber(
    value.progressionDayMode === "synced" ? value.progressionLoadIncrement : value.progressionDayLoadStep,
  ) ?? promotionLoadStepValue;
  const dayRepStepValue = parseOptionalPositiveInteger(
    value.progressionDayMode === "synced" ? value.progressionBodyweightRepIncrement : value.progressionDayRepStep,
  ) ?? promotionRepStepValue;
  const dayDurationStepValue = parseOptionalPositiveInteger(
    value.progressionDayMode === "synced" ? value.progressionDurationIncrementSeconds : value.progressionDayDurationStep,
  ) ?? promotionDurationStepValue;
  const dayDistanceStepValue = parseOptionalPositiveNumber(
    value.progressionDayMode === "synced" ? value.progressionDistanceIncrement : value.progressionDayDistanceStep,
  ) ?? promotionDistanceStepValue;
  const setFlowLoadStepValue = parseOptionalPositiveNumber(value.progressionSetFlowLoadStep) ?? 5;
  const setFlowRepStepValue = parseOptionalPositiveInteger(value.progressionSetFlowRepStep) ?? 2;
  const setFlowDurationStepValue = parseOptionalPositiveInteger(value.progressionSetFlowDurationStep) ?? 60;
  const setFlowDistanceStepValue = parseOptionalPositiveNumber(value.progressionSetFlowDistanceStep) ?? 1;
  const setCountValue = parseOptionalPositiveInteger(resolveTotalSetCountFromGroups({
    groups: setFlowMeasurementGroups,
    values: {
      time: value.progressionSetFlowDurationStep,
      distance: value.progressionSetFlowDistanceStep,
      reps: value.progressionSetFlowRepStep,
      weight: value.progressionSetFlowLoadStep,
    },
    counts: value.progressionSetFlowCountMap,
    groupedCounts: value.progressionSetFlowGroupedCountMap,
    fallbackCount: value.progressionSetCount || defaultSetFlowCount,
  })) ?? 3;
  const activeDayStepMeasurements = (["time", "distance", "reps", "weight"] as const).filter((measurement) => {
    if (measurement === "time") {
      const rawValue = value.progressionDayMode === "synced" ? value.progressionDurationIncrementSeconds : value.progressionDayDurationStep;
      return rawValue.trim().length > 0;
    }
    if (measurement === "distance") {
      const rawValue = value.progressionDayMode === "synced" ? value.progressionDistanceIncrement : value.progressionDayDistanceStep;
      return rawValue.trim().length > 0;
    }
    if (measurement === "reps") {
      const rawValue = value.progressionDayMode === "synced" ? value.progressionBodyweightRepIncrement : value.progressionDayRepStep;
      return rawValue.trim().length > 0;
    }
    const rawValue = value.progressionDayMode === "synced" ? value.progressionLoadIncrement : value.progressionDayLoadStep;
    return rawValue.trim().length > 0;
  });
  const deloadSettingFields = shouldRenderDeloadSettings
    ? [
      <div key="miss-count" className="w-[8.25rem] shrink-0">
        <ProgressionNumberField
          label="Missed Count"
          name="progressionStallThreshold"
          inputMode="numeric"
          value={value.progressionStallThreshold}
          labelClassName="normal-case tracking-[0.06em]"
          onChange={(nextValue) => onChange({
            ...value,
            progressionStallThreshold: nextValue,
          })}
        />
      </div>,
      <div key="deload-percent" className="w-[8.25rem] shrink-0">
        <ProgressionNumberField
          label="DELOAD"
          name="progressionDeloadPercent"
          inputMode="decimal"
          value={value.progressionDeloadPercent}
          suffix="%"
          labelClassName="normal-case tracking-[0.06em]"
          onChange={(nextValue) => onChange({
            ...value,
            progressionDeloadPercent: nextValue,
          })}
        />
      </div>,
    ]
    : [];
  const renderSessionMetaControls = () => (
    <div className="mx-auto grid w-full max-w-[28rem] grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-2" {...getCustomInfoHandlers(() => getTargetMutationInfoPayload(value.progressionTargetMutation))}>
        <p className={cn(
          progressionMeasurementTitleClassName,
          "px-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em]",
        )}>
          Target changes
        </p>
        <ExpandingChoiceRow
          ariaLabel="Target changes"
          options={targetMutationUiModel.options.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          value={targetMutationUiModel.selectedValue}
          onChange={(nextValue) => {
            setTargetMutation(nextValue);
            showCustomInfo(getTargetMutationInfoPayload(nextValue as ProgressionPlaybookFormState["progressionTargetMutation"]));
          }}
          className="w-full"
          buttonClassName="min-w-[7.6rem] text-[9.5px] tracking-[0.08em]"
        />
      </div>
      <div className="space-y-2" {...getCustomInfoHandlers(() => getQualificationWindowInfoPayload(value.progressionRequiredQualifiedSessions))}>
        <p className={cn(
          progressionMeasurementTitleClassName,
          "px-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em]",
        )}>
          Session count
        </p>
        <ExpandingChoiceRow
          ariaLabel="Require successful sessions"
          options={qualificationWindowOptions}
          value={value.progressionRequiredQualifiedSessions}
          onChange={(nextValue) => {
            setRequiredQualifiedSessions(nextValue);
            showCustomInfo(getQualificationWindowInfoPayload(nextValue));
          }}
          className="w-full"
          buttonClassName="min-w-[5.25rem] text-[9.5px] tracking-[0.08em]"
        />
      </div>
    </div>
  );
  const progressionMeasurementFloor = {
    time: 1,
    distance: 0.1,
    reps: 1,
    weight: weightUnit === "kg" ? 0.5 : 1,
  } as const;
  const clampProgressionMeasurementValue = (
    measurement: "time" | "distance" | "reps" | "weight",
    value: number,
  ) => {
    const floor = progressionMeasurementFloor[measurement];
    const clamped = Math.max(floor, value);

    if (measurement === "time" || measurement === "reps") {
      return Math.round(clamped);
    }

    return Number(clamped.toFixed(2));
  };
  const formatSetFlowWeight = (weight: number) => `${Number(weight.toFixed(2)).toString()} ${weightUnit}`;
  const formatSetFlowDistance = (distance: number) => `${Number(distance.toFixed(2)).toString()} ${distanceUnit}`;
  const formatSetFlowDuration = (seconds: number) => {
    const wholeMinutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (remainingSeconds === 0) {
      return `${wholeMinutes} min`;
    }

    if (wholeMinutes <= 0) {
      return `${seconds} s`;
    }

    return `${wholeMinutes}m ${remainingSeconds}s`;
  };
  const resolveSetFlowDirectionOffset = (direction: SetFlowDirection, setIndex: number) => {
    if (direction === "up") {
      return setIndex;
    }
    if (direction === "down") {
      return -setIndex;
    }
    return 0;
  };
  const formatTargetMeasurements = (
    measurements: ProgressionMeasurementKey[],
    target: { time: number; distance: number; reps: number; weight: number },
  ) => {
    const parts = measurements
      .filter((measurement) => measurement !== "calories")
      .map((measurement) => {
        if (measurement === "time") {
          return formatSetFlowDuration(target.time);
        }
        if (measurement === "distance") {
          return formatSetFlowDistance(target.distance);
        }
        if (measurement === "reps") {
          return `${target.reps} reps`;
        }
        if (measurement === "weight") {
          return formatSetFlowWeight(target.weight);
        }
        return null;
      })
      .filter((part): part is string => Boolean(part));

    return parts.length > 0 ? parts.join(" • ") : "—";
  };
  const setStepMeasurementValues: Record<ProgressionMeasurementKey, string> = {
    time: value.progressionSetFlowDurationStep,
    distance: value.progressionSetFlowDistanceStep,
    reps: value.progressionSetFlowRepStep,
    weight: value.progressionSetFlowLoadStep,
    calories: "",
  };
  const hasConfiguredPromotionStepValue = (rawValue: string) => rawValue.trim().length > 0;
  const activeSetStepMeasurements = (["time", "distance", "reps", "weight"] as const).filter((measurement) => (
    hasConfiguredPromotionStepValue(setStepMeasurementValues[measurement])
  ));
  const modularSetExampleEntries = Array.from({ length: setCountValue }, (_, setIndex) => {
    const durationSeconds = clampProgressionMeasurementValue("time", 600 + (setFlowDurationStepValue * resolveSetFlowDirectionOffset(setFlowDirections.time, setIndex)));
    const distance = clampProgressionMeasurementValue("distance", 1 + (setFlowDistanceStepValue * resolveSetFlowDirectionOffset(setFlowDirections.distance, setIndex)));
    const reps = clampProgressionMeasurementValue("reps", 8 + (setFlowRepStepValue * resolveSetFlowDirectionOffset(setFlowDirections.reps, setIndex)));
    const weight = clampProgressionMeasurementValue("weight", 185 + (setFlowLoadStepValue * resolveSetFlowDirectionOffset(setFlowDirections.weight, setIndex)));
    return {
      label: `Set ${setIndex + 1}`,
      value: `${formatSetFlowDuration(durationSeconds)} • ${formatSetFlowDistance(distance)} • ${reps} reps • ${formatSetFlowWeight(weight)}`,
    };
  });
  const setStepExampleRows = Array.from({ length: setCountValue }, (_, setIndex) => {
    const previousIndex = setIndex === 0 ? 0 : setIndex - 1;
    const previousTarget = {
      time: clampProgressionMeasurementValue("time", 630 + (setFlowDurationStepValue * resolveSetFlowDirectionOffset(setFlowDirections.time, previousIndex))),
      distance: clampProgressionMeasurementValue("distance", 1.5 + (setFlowDistanceStepValue * resolveSetFlowDirectionOffset(setFlowDirections.distance, previousIndex))),
      reps: clampProgressionMeasurementValue("reps", 10 + (setFlowRepStepValue * resolveSetFlowDirectionOffset(setFlowDirections.reps, previousIndex))),
      weight: clampProgressionMeasurementValue("weight", 140 + (setFlowLoadStepValue * resolveSetFlowDirectionOffset(setFlowDirections.weight, previousIndex))),
    };
    const nextTarget = {
      time: clampProgressionMeasurementValue("time", 630 + (setFlowDurationStepValue * resolveSetFlowDirectionOffset(setFlowDirections.time, setIndex))),
      distance: clampProgressionMeasurementValue("distance", 1.5 + (setFlowDistanceStepValue * resolveSetFlowDirectionOffset(setFlowDirections.distance, setIndex))),
      reps: clampProgressionMeasurementValue("reps", 10 + (setFlowRepStepValue * resolveSetFlowDirectionOffset(setFlowDirections.reps, setIndex))),
      weight: clampProgressionMeasurementValue("weight", 140 + (setFlowLoadStepValue * resolveSetFlowDirectionOffset(setFlowDirections.weight, setIndex))),
    };

    return {
      label: `Set ${setIndex + 1}`,
      before: formatTargetMeasurements(activeSetStepMeasurements, previousTarget),
      after: formatTargetMeasurements(activeSetStepMeasurements, nextTarget),
    };
  });
  const setExampleMultipliers = Array.from({ length: setCountValue }, (_, index) => {
    if (value.progressionSetFlow === "ascending_ramp") {
      return index;
    }
    if (value.progressionSetFlow === "descending_backoff") {
      return (setCountValue - 1) - index;
    }
    return 0;
  });
  const setExampleEntries = setExampleMultipliers.map((multiplier, index) => {
    const durationSeconds = clampProgressionMeasurementValue("time", 630 + (setFlowDurationStepValue * multiplier));
    const distance = clampProgressionMeasurementValue("distance", 1.5 + (setFlowDistanceStepValue * multiplier));
    const reps = clampProgressionMeasurementValue("reps", 10 + (setFlowRepStepValue * multiplier));
    const weight = clampProgressionMeasurementValue("weight", 140 + (setFlowLoadStepValue * multiplier));
    return {
      label: `Set ${index + 1}`,
      value: `${formatSetFlowDuration(durationSeconds)} • ${formatSetFlowDistance(distance)} • ${reps} reps • ${formatSetFlowWeight(weight)}`,
    };
  });
  const routinePromotionStepValues: Record<ProgressionMeasurementKey, string> = {
    time: value.progressionDurationIncrementSeconds,
    distance: value.progressionDistanceIncrement,
    reps: value.progressionBodyweightRepIncrement,
    weight: value.progressionLoadIncrement,
    calories: "",
  };
  const hasConfiguredPromotionRepMin = hasConfiguredPromotionStepValue(value.progressionPromotionRepRangeMin);
  const hasConfiguredPromotionRepMax = hasConfiguredPromotionStepValue(value.progressionPromotionRepRangeMax);
  const hasConfiguredPromotionRepStep = hasConfiguredPromotionStepValue(value.progressionBodyweightRepIncrement);
  const promotionRepMinConfiguredValue = parseOptionalPositiveInteger(value.progressionPromotionRepRangeMin);
  const promotionRepMaxConfiguredValue = parseOptionalPositiveInteger(value.progressionPromotionRepRangeMax);
  const promotionRepStepConfiguredValue = parseOptionalPositiveInteger(value.progressionBodyweightRepIncrement);
  const shouldUsePromotionRepMeasurement = hasConfiguredPromotionRepStep;
  const visibleRoutinePromotionMeasurementGroups = routinePromotionMeasurementGroups
    .map((group) => group.filter((measurement) => {
      if (measurement === "calories") {
        return false;
      }

      if (measurement === "reps") {
        return shouldUsePromotionRepMeasurement;
      }

      return hasConfiguredPromotionStepValue(routinePromotionStepValues[measurement]);
    }))
    .filter((group) => group.length > 0);
  const visibleRoutinePromotionGroupMeta = visibleRoutinePromotionMeasurementGroups.map((group) => {
    const fullGroup = routinePromotionMeasurementGroups.find((candidate) => group.every((measurement) => candidate.includes(measurement))) ?? group;
    return {
      fullGroup,
      activeGroup: group,
      direction: resolvePromotionGroupDirection({
        fullGroup,
        activeGroup: group,
        values: routinePromotionStepValues,
        repRangeStep: value.progressionBodyweightRepIncrement,
        directions: value.progressionPromotionDirectionMap,
        groupedDirections: value.progressionPromotionGroupedDirectionMap,
      }),
    };
  });
  const resolveVisiblePromotionGroupDirection = (group: ProgressionMeasurementKey[]) => {
    const matchedGroup = visibleRoutinePromotionGroupMeta.find((entry) => entry.activeGroup === group);
    if (matchedGroup) {
      return matchedGroup.direction;
    }

    return resolvePromotionGroupDirection({
      fullGroup: group,
      activeGroup: group,
      values: routinePromotionStepValues,
      repRangeStep: value.progressionBodyweightRepIncrement,
      directions: value.progressionPromotionDirectionMap,
      groupedDirections: value.progressionPromotionGroupedDirectionMap,
    });
  };
  const promotionRepDirection = (() => {
    const repGroup = visibleRoutinePromotionGroupMeta.find((entry) => entry.activeGroup.includes("reps"));
    if (repGroup) {
      return repGroup.direction;
    }

    return resolvePromotionMeasurementDirection({
      measurement: "reps",
      values: routinePromotionStepValues,
      repRangeStep: value.progressionBodyweightRepIncrement,
      directions: value.progressionPromotionDirectionMap,
    });
  })();
  const promotionRepRangeMinValue = promotionRepMinConfiguredValue ?? promotionRepMaxConfiguredValue ?? 8;
  const promotionRepRangeMaxValue = promotionRepMinConfiguredValue != null && promotionRepMaxConfiguredValue != null
    ? Math.max(promotionRepRangeMinValue, promotionRepMaxConfiguredValue)
    : promotionRepRangeMinValue + (promotionRepStepConfiguredValue ?? 1);
  const shouldUsePromotionRepRangeExample = Boolean(
    shouldUsePromotionRepMeasurement
    && promotionRepMinConfiguredValue != null
    && promotionRepMaxConfiguredValue != null
    && promotionRepRangeMaxValue > promotionRepRangeMinValue,
  );
  const visibleRoutinePromotionMeasurements = flattenPromotionMeasurementGroups(
    visibleRoutinePromotionGroupMeta.map((entry) => entry.activeGroup),
  );
  const resolveExampleGroupSessionCount = (group: ProgressionMeasurementKey[]) => {
    const fallbackCount = parsePositiveIntegerInput(defaultRoutineSessionCount) ?? 1;
    const fullGroup = visibleRoutinePromotionGroupMeta.find((entry) => entry.activeGroup === group)?.fullGroup ?? group;
    const rawValue = resolvePromotionGroupSessionCountValue({
      fullGroup,
      activeGroup: group,
      sessionCounts: value.progressionPromotionSessionCountMap,
      groupedSessionCounts: value.progressionPromotionGroupedSessionCountMap,
      defaultSessionCount: defaultRoutineSessionCount,
    });
    return parsePositiveIntegerInput(rawValue) ?? fallbackCount;
  };
  const visibleProgressionExampleGroups = (
    visibleRoutinePromotionMeasurementGroups.length > 0
      ? visibleRoutinePromotionMeasurementGroups
      : [["weight"] as ProgressionMeasurementKey[]]
  ).map((group) => ({
    measurements: [...group],
    sessionCount: resolveExampleGroupSessionCount(group),
  }));
  const visibleProgressionMeasurementKeys: Array<"time" | "distance" | "reps" | "weight"> = (["time", "distance", "reps", "weight"] as const).filter((measurement) => {
    return visibleRoutinePromotionMeasurements.includes(measurement);
  });
  const progressionMeasurementHeadings: Record<(typeof visibleProgressionMeasurementKeys)[number], string> = {
    time: "TIME",
    distance: "DISTANCE",
    reps: "REP",
    weight: "LOAD",
  };
  const formatProgressionExampleHeadingMeasurement = (measurements: ProgressionMeasurementKey[]) => measurements
    .map((measurement) => progressionMeasurementHeadings[measurement as keyof typeof progressionMeasurementHeadings] ?? ROUTINE_PROMOTION_MEASUREMENT_LABELS[measurement]?.toUpperCase() ?? measurement.toUpperCase())
    .join(" + ");
  const getPostSessionTitle = (measurementLabel: string, sessionCount: number) => `Post ${measurementLabel} ${sessionCount > 1 ? "Sessions" : "Session"}`;
  const visibleDayStepFieldIds = isRoutineDefaultContext
    ? getRoutineDefaultVisualStepFieldIds({
      visibleMeasurements: visibleRoutinePromotionMeasurements,
      showAll: value.progressionDayMode === "unsynced",
    })
    : visiblePromotionStepFieldIds;
  const daySettingFields = shouldRenderPromotionStepSettings
    ? visibleDayStepFieldIds.map((fieldId) => (
      <div key={`day-${fieldId}`} className="w-[6.65rem] shrink-0">
        {renderDayProgressionField(fieldId)}
      </div>
    ))
    : [];
  const shouldShowTopRowDaySettingFields = shouldRenderPromotionStepSettings
    && value.progressionDayMode === "unsynced"
    && daySettingFields.length > 0;
  const exampleBaseTarget = {
    time: 630,
    distance: 1.5,
    reps: Math.max(
      1,
      shouldUsePromotionRepRangeExample && promotionRepDirection === "down"
        ? promotionRepRangeMaxValue
        : promotionRepRangeMinValue || 10,
    ),
    repsCap: Math.max(promotionRepRangeMinValue || 10, promotionRepRangeMaxValue || 12),
    weight: 140,
  };
  const dayExampleRows = effortWaveDirections.map((direction, dayIndex) => {
    const baseTarget = {
      time: exampleBaseTarget.time,
      distance: exampleBaseTarget.distance,
      reps: exampleBaseTarget.reps,
      weight: exampleBaseTarget.weight,
    };
    const offset = resolveSetFlowDirectionOffset(direction, 1);
    const nextTarget = {
      time: clampProgressionMeasurementValue("time", baseTarget.time + (dayDurationStepValue * offset)),
      distance: clampProgressionMeasurementValue("distance", baseTarget.distance + (dayDistanceStepValue * offset)),
      reps: clampProgressionMeasurementValue("reps", baseTarget.reps + (dayRepStepValue * offset)),
      weight: clampProgressionMeasurementValue("weight", baseTarget.weight + (dayLoadStepValue * offset)),
    };

    return {
      label: `Day ${dayIndex + 1}`,
      direction,
      before: formatTargetMeasurements(visibleRoutinePromotionMeasurements, baseTarget),
      after: formatTargetMeasurements(visibleRoutinePromotionMeasurements, nextTarget),
    };
  });
  const progressivePromotionExampleRows = (() => {
    const rows: Array<{ left: string; right: string }> = [];
    const firstVisibleGroup = visibleRoutinePromotionMeasurementGroups[0] ?? null;
    const lastVisibleGroup = visibleRoutinePromotionMeasurementGroups[visibleRoutinePromotionMeasurementGroups.length - 1] ?? null;
    const renderTarget = (target: { time: number; distance: number; reps: number; repsCap: number; weight: number }) => formatTargetMeasurements(
      visibleRoutinePromotionMeasurements,
      {
        time: target.time,
        distance: target.distance,
        reps: target.reps,
        weight: target.weight,
      },
    );
    const applyPromotionStep = (
      target: { time: number; distance: number; reps: number; repsCap: number; weight: number },
      group: ProgressionMeasurementKey[],
      { isCycleWrap = false }: { isCycleWrap?: boolean } = {},
    ) => {
      const nextTarget = { ...target };
      const groupDirection = resolveVisiblePromotionGroupDirection(group);
      for (const measurement of group) {
        if (measurement === "time") {
          nextTarget.time = clampProgressionMeasurementValue(
            "time",
            target.time + (groupDirection === "down" ? -promotionDurationStepValue : promotionDurationStepValue),
          );
        } else if (measurement === "distance") {
          nextTarget.distance = clampProgressionMeasurementValue(
            "distance",
            target.distance + (groupDirection === "down" ? -promotionDistanceStepValue : promotionDistanceStepValue),
          );
        } else if (measurement === "weight") {
          nextTarget.weight = clampProgressionMeasurementValue(
            "weight",
            target.weight + (groupDirection === "down" ? -promotionLoadStepValue : promotionLoadStepValue),
          );
        } else if (measurement === "reps") {
          if (isCycleWrap) {
            nextTarget.reps = groupDirection === "down"
              ? promotionRepRangeMaxValue
              : promotionRepRangeMinValue;
          } else if (shouldUsePromotionRepRangeExample) {
            nextTarget.reps = groupDirection === "down"
              ? clampProgressionMeasurementValue("reps", Math.max(promotionRepRangeMinValue, target.reps - promotionRepStepValue))
              : clampProgressionMeasurementValue("reps", Math.min(target.repsCap, target.reps + promotionRepStepValue));
          } else {
            nextTarget.reps = groupDirection === "down"
              ? clampProgressionMeasurementValue("reps", target.reps - promotionRepStepValue)
              : clampProgressionMeasurementValue("reps", target.reps + promotionRepStepValue);
          }
        }
      }

      if (
        !group.includes("reps")
        && shouldUsePromotionRepMeasurement
        && (
          promotionRepDirection === "down"
            ? target.reps <= promotionRepRangeMinValue
            : target.reps >= target.repsCap
        )
        && (group === lastVisibleGroup || isCycleWrap)
      ) {
        nextTarget.reps = promotionRepDirection === "down"
          ? promotionRepRangeMaxValue
          : promotionRepRangeMinValue;
      }

      return nextTarget;
    };

    let currentTarget = {
      time: exampleBaseTarget.time,
      distance: exampleBaseTarget.distance,
      reps: exampleBaseTarget.reps,
      repsCap: exampleBaseTarget.repsCap,
      weight: exampleBaseTarget.weight,
    };

    for (const group of visibleRoutinePromotionMeasurementGroups) {
      if (group.includes("reps")) {
        if (!shouldUsePromotionRepRangeExample) {
          const nextTarget = applyPromotionStep(currentTarget, group);
          rows.push({
            left: renderTarget(currentTarget),
            right: renderTarget(nextTarget),
          });
          currentTarget = nextTarget;
          continue;
        }

        while (
          promotionRepDirection === "down"
            ? currentTarget.reps > promotionRepRangeMinValue
            : currentTarget.reps < currentTarget.repsCap
        ) {
          const nextTarget = applyPromotionStep(currentTarget, group);
          rows.push({
            left: renderTarget(currentTarget),
            right: renderTarget(nextTarget),
          });
          currentTarget = nextTarget;
        }
        continue;
      }

      const nextTarget = applyPromotionStep(currentTarget, group);
      rows.push({
        left: renderTarget(currentTarget),
        right: renderTarget(nextTarget),
      });
      currentTarget = nextTarget;
    }

    if (
      shouldUsePromotionRepMeasurement
      && (
        promotionRepDirection === "down"
          ? currentTarget.reps <= promotionRepRangeMinValue
          : currentTarget.reps >= currentTarget.repsCap
      )
      && Boolean(lastVisibleGroup?.includes("reps"))
      && firstVisibleGroup
    ) {
      const nextTarget = applyPromotionStep(currentTarget, firstVisibleGroup, { isCycleWrap: true });
      rows.push({
        left: renderTarget(currentTarget),
        right: renderTarget(nextTarget),
      });
    }

    return rows;
  })();
  const renderPromotionExampleMetricLineLegacyUnused = (
    valueLine: string,
    compareLine?: string,
    highlightTone: "left" | "right" = "right",
  ) => {
    const valueParts = valueLine.split(/\s+[•·]\s+/u);
    const compareParts = compareLine ? compareLine.split(/\s+[•·]\s+/u) : [];

    return valueParts.map((part, index) => (
      <Fragment key={`promotion-example-part-${index}-${part}`}>
        {index > 0 ? <span className="px-1 text-[rgb(var(--accent-strong)/0.92)]">•</span> : null}
        <span className={compareParts[index] && compareParts[index] !== part
          ? highlightTone === "left"
            ? "text-[rgb(var(--accent-yellow-on))]"
            : "text-[rgb(var(--accent-strong)/0.98)]"
          : undefined}
        >
          {part}
        </span>
      </Fragment>
    ));
  };
  const renderPromotionExampleMetricLineLegacyRenderer = (
    valueLine: string,
    compareLine?: string,
    highlightTone: "left" | "right" = "right",
    dotClassName = "text-[rgb(var(--accent-strong)/0.92)]",
  ) => {
    const valueParts = valueLine.split(/\s+[•·]\s+/u);
    const compareParts = compareLine ? compareLine.split(/\s+[•·]\s+/u) : [];
    const parsePromotionMetricComparableValue = (part: string) => {
      const match = part.match(/^(\d+(?:\.\d+)?)/u);
      return match ? Number(match[1]) : null;
    };

    return valueParts.map((part, index) => (
      <Fragment key={`promotion-example-part-${index}-${part}`}>
        {index > 0 ? <span className="px-1 text-[rgb(var(--accent-strong)/0.92)]">•</span> : null}
        <span className={(() => {
          if (!compareParts[index] || compareParts[index] === part) {
            return undefined;
          }

          const currentValue = parsePromotionMetricComparableValue(part);
          const compareValue = parsePromotionMetricComparableValue(compareParts[index]!);
          const isDecrease = currentValue != null
            && compareValue != null
            && (
              (highlightTone === "left" && currentValue > compareValue)
              || (highlightTone === "right" && currentValue < compareValue)
            );

          if (isDecrease) {
            return highlightTone === "left"
              ? "text-[rgb(var(--accent-strong)/0.98)]"
              : "text-[rgb(var(--accent-yellow-on))]";
          }

          return highlightTone === "left"
            ? "text-[rgb(var(--accent-yellow-on))]"
            : "text-[rgb(var(--accent-strong)/0.98)]";
        })()}>
          {part}
        </span>
      </Fragment>
    ));
  };
  const renderSetStepExampleMetricLineLegacyRenderer = (
    valueLine: string,
    compareLine?: string,
    highlightTone: "left" | "right" = "right",
  ) => renderPromotionExampleMetricLine(
    valueLine,
    compareLine,
    highlightTone,
    "text-[rgb(var(--accent-strong)/0.95)]",
  );
  const renderProgressionExampleMetricToken = (
    part: string,
    comparePart?: string,
    highlightTone: "left" | "right" = "right",
  ) => {
    const { valueText, labelText } = splitProgressionExampleMetricPart(part);
    const change = classifyProgressionExampleMetricChange(part, comparePart);

    return (
      <>
        <span className={getProgressionExampleMetricValueClassName(change, highlightTone)}>
          {valueText}
        </span>
        {labelText ? (
          <span className={cn("ml-1", progressionExampleMetricUnitClassName)}>
            {labelText}
          </span>
        ) : null}
      </>
    );
  };
  const parseProgressionExampleLeadingNumber = (valueLine: string) => {
    const match = valueLine.match(/(\d+(?:\.\d+)?)/u);
    return match ? Number(match[1]) : null;
  };
  const getPreProgressionCycleShiftDirection = (beforeLine: string, afterLine: string): SetFlowDirection => {
    const beforeValue = parseProgressionExampleLeadingNumber(beforeLine);
    const afterValue = parseProgressionExampleLeadingNumber(afterLine);

    if (beforeValue == null || afterValue == null || beforeValue === afterValue) {
      return "straight";
    }

    return afterValue > beforeValue ? "up" : "down";
  };
  const renderPromotionExampleMetricLine = (
    valueLine: string,
    compareLine?: string,
    highlightTone: "left" | "right" = "right",
    dotClassName = "text-[rgb(var(--accent-strong)/0.92)]",
  ) => {
    const valueParts = valueLine.split(/\s+[\u2022\u00B7]\s+/u);
    const compareParts = compareLine ? compareLine.split(/\s+[\u2022\u00B7]\s+/u) : [];

    const visibleParts = valueParts
      .map((part, index) => ({
        part,
        comparePart: compareParts[index],
        change: classifyProgressionExampleMetricChange(part, compareParts[index]),
      }))
      .filter((entry) => !(highlightTone === "left" && entry.change === "same"));

    return visibleParts.map((entry, index) => (
      <Fragment key={`progression-example-part-${highlightTone}-${index}-${entry.part}`}>
        {index > 0 ? <span className={cn("px-1", dotClassName)}>{"\u2022"}</span> : null}
        <span data-highlight-tone={highlightTone}>
          {renderProgressionExampleMetricToken(entry.part, entry.comparePart, highlightTone)}
        </span>
      </Fragment>
    ));
  };
  const renderChangedOnlyPromotionExampleMetricLine = (
    valueLine: string,
    compareLine?: string,
    highlightTone: "left" | "right" = "right",
    dotClassName = "text-[rgb(var(--accent-strong)/0.92)]",
  ) => {
    const valueParts = valueLine.split(/\s+[\u2022\u00B7]\s+/u);
    const compareParts = compareLine ? compareLine.split(/\s+[\u2022\u00B7]\s+/u) : [];

    const visibleParts = valueParts
      .map((part, index) => ({
        part,
        comparePart: compareParts[index],
        change: classifyProgressionExampleMetricChange(part, compareParts[index]),
      }))
      .filter((entry) => entry.change !== "same");

    return visibleParts.length > 0
      ? visibleParts.map((entry, index) => (
        <Fragment key={`progression-example-changed-part-${highlightTone}-${index}-${entry.part}`}>
          {index > 0 ? <span className={cn("px-1", dotClassName)}>{"\u2022"}</span> : null}
          <span data-highlight-tone={highlightTone}>
            {renderProgressionExampleMetricToken(entry.part, entry.comparePart, highlightTone)}
          </span>
        </Fragment>
      ))
      : <span className="text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.72)]">{"\u2014"}</span>;
  };
  const renderSetStepExampleMetricLine = (
    valueLine: string,
    compareLine?: string,
    highlightTone: "left" | "right" = "right",
  ) => renderPromotionExampleMetricLine(
    valueLine,
    compareLine,
    highlightTone,
    "text-[rgb(var(--accent-strong)/0.95)]",
  );
  const renderProgressionExampleComparisonStack = (
    beforeLine: string,
    afterLine: string,
  ) => (
    <div className="mx-auto flex w-fit max-w-full flex-col items-center gap-1 text-center">
      <div className="w-fit max-w-full border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
        {renderPromotionExampleMetricLine(beforeLine, afterLine, "left")}
      </div>
      <div className="flex flex-col items-center justify-center gap-0.5 py-0.5">
        <span className="block h-3 w-px rounded-full bg-[rgb(var(--accent-divider-rgb)/0.72)]" aria-hidden="true" />
        <ChevronDownIcon className="h-3 w-3 text-[rgb(var(--accent-divider-rgb)/0.95)]" />
      </div>
      <div className="w-fit max-w-full border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
        {renderPromotionExampleMetricLine(afterLine, beforeLine)}
      </div>
    </div>
  );
  const formatExampleTargetMeasurements = (target: {
    time: number;
    distance: number;
    reps: number;
    repsCap: number;
    weight: number;
  }) => formatTargetMeasurements(
    visibleRoutinePromotionMeasurements.length > 0 ? visibleRoutinePromotionMeasurements : ["weight"],
    {
      time: target.time,
      distance: target.distance,
      reps: target.reps,
      weight: target.weight,
    },
  );
  const formatExampleTargetMeasurementsFor = (
    measurements: ProgressionMeasurementKey[],
    target: {
      time: number;
      distance: number;
      reps: number;
      repsCap: number;
      weight: number;
    },
  ) => measurements.length > 0
    ? formatTargetMeasurements(
      measurements,
      {
        time: target.time,
        distance: target.distance,
        reps: target.reps,
        weight: target.weight,
      },
    )
    : "—";
  const applyExampleDayShift = (
    target: { time: number; distance: number; reps: number; repsCap: number; weight: number },
    direction: SetFlowDirection,
  ) => {
    const offset = resolveSetFlowDirectionOffset(direction, 1);
    return {
      ...target,
      time: activeDayStepMeasurements.includes("time")
        ? clampProgressionMeasurementValue("time", target.time + (dayDurationStepValue * offset))
        : target.time,
      distance: activeDayStepMeasurements.includes("distance")
        ? clampProgressionMeasurementValue("distance", target.distance + (dayDistanceStepValue * offset))
        : target.distance,
      reps: activeDayStepMeasurements.includes("reps")
        ? clampProgressionMeasurementValue("reps", target.reps + (dayRepStepValue * offset))
        : target.reps,
      weight: activeDayStepMeasurements.includes("weight")
        ? clampProgressionMeasurementValue("weight", target.weight + (dayLoadStepValue * offset))
        : target.weight,
    };
  };
  const applyExampleSetShift = (
    target: { time: number; distance: number; reps: number; repsCap: number; weight: number },
    measurements: SetFlowMeasurementKey[],
    setIndex: number,
  ) => {
    const nextTarget = { ...target };
    const groupDirection = resolveSetFlowGroupDirection({
      fullGroup: measurements,
      activeGroup: measurements,
      values: setFlowStepValues,
      directions: setFlowDirections,
      groupedDirections: value.progressionSetFlowGroupedDirectionMap,
    });
    const offset = resolveSetFlowDirectionOffset(groupDirection, setIndex);

    for (const measurement of measurements) {
      if (measurement === "time") {
        nextTarget.time = clampProgressionMeasurementValue("time", target.time + (setFlowDurationStepValue * offset));
      } else if (measurement === "distance") {
        nextTarget.distance = clampProgressionMeasurementValue("distance", target.distance + (setFlowDistanceStepValue * offset));
      } else if (measurement === "reps") {
        nextTarget.reps = clampProgressionMeasurementValue("reps", target.reps + (setFlowRepStepValue * offset));
      } else if (measurement === "weight") {
        nextTarget.weight = clampProgressionMeasurementValue("weight", target.weight + (setFlowLoadStepValue * offset));
      }
    }

    return nextTarget;
  };
  const visibleSetFlowMeasurementGroups = setFlowMeasurementGroups
    .map((group) => getActiveSetFlowMeasurementGroup(group, setFlowStepValues))
    .filter((group) => group.length > 0);
  const visibleSetFlowExampleMeasurements = (
    visibleSetFlowMeasurementGroups.length > 0
      ? Array.from(new Set(visibleSetFlowMeasurementGroups.flat()))
      : activeSetStepMeasurements
  ) as ProgressionMeasurementKey[];
  const resolveExampleSetGroupCount = (group: SetFlowMeasurementKey[]) => {
    const rawValue = resolveSetFlowGroupCountValue({
      fullGroup: setFlowMeasurementGroups.find((candidate) => group.every((measurement) => candidate.includes(measurement))) ?? group,
      activeGroup: group,
      counts: value.progressionSetFlowCountMap,
      groupedCounts: value.progressionSetFlowGroupedCountMap,
      defaultCount: defaultSetFlowCount,
    });
    return parsePositiveIntegerInput(rawValue) ?? 3;
  };
  const buildWithinSessionTargets = (
    dayShiftedTarget: { time: number; distance: number; reps: number; repsCap: number; weight: number },
  ) => {
    if (visibleSetFlowMeasurementGroups.length === 0) {
      return Array.from(
        { length: Math.max(1, setCountValue) },
        (_, setIndex) => applyExampleSetShift(dayShiftedTarget, activeSetStepMeasurements as SetFlowMeasurementKey[], setIndex),
      );
    }

    const targets: Array<{ time: number; distance: number; reps: number; repsCap: number; weight: number }> = [];
    let currentTarget = { ...dayShiftedTarget };

    for (const group of visibleSetFlowMeasurementGroups) {
      const groupBaseTarget = { ...currentTarget };
      const groupCount = resolveExampleSetGroupCount(group);
      for (let localSetIndex = 0; localSetIndex < Math.max(1, groupCount); localSetIndex += 1) {
        const nextTarget = applyExampleSetShift(groupBaseTarget, group, localSetIndex);
        targets.push(nextTarget);
        currentTarget = nextTarget;
      }
    }

    return targets.length > 0 ? targets : [{ ...dayShiftedTarget }];
  };
  const applyFocusedPromotionMeasurements = (
    target: { time: number; distance: number; reps: number; repsCap: number; weight: number },
    measurements: ProgressionMeasurementKey[],
  ) => {
    const nextTarget = { ...target };
    const groupDirection = resolveVisiblePromotionGroupDirection(measurements);
    for (const measurement of measurements) {
      if (measurement === "time") {
        nextTarget.time = clampProgressionMeasurementValue(
          "time",
          target.time + (groupDirection === "down" ? -promotionDurationStepValue : promotionDurationStepValue),
        );
      } else if (measurement === "distance") {
        nextTarget.distance = clampProgressionMeasurementValue(
          "distance",
          target.distance + (groupDirection === "down" ? -promotionDistanceStepValue : promotionDistanceStepValue),
        );
      } else if (measurement === "weight") {
        nextTarget.weight = clampProgressionMeasurementValue(
          "weight",
          target.weight + (groupDirection === "down" ? -promotionLoadStepValue : promotionLoadStepValue),
        );
      } else if (measurement === "reps") {
        if (shouldUsePromotionRepRangeExample) {
          nextTarget.reps = groupDirection === "down"
            ? clampProgressionMeasurementValue("reps", Math.max(promotionRepRangeMinValue, target.reps - promotionRepStepValue))
            : clampProgressionMeasurementValue("reps", Math.min(target.repsCap, target.reps + promotionRepStepValue));
        } else {
          nextTarget.reps = groupDirection === "down"
            ? clampProgressionMeasurementValue("reps", target.reps - promotionRepStepValue)
            : clampProgressionMeasurementValue("reps", target.reps + promotionRepStepValue);
        }
      }
    }

    return nextTarget;
  };
  const combinedProgressionExampleSequence = buildProgressionExampleSequence({
    cycleLengthDays,
    groups: visibleProgressionExampleGroups,
  });
  const {
    sections: combinedProgressionExampleSections,
    pendingRepResetPreview,
  } = (() => {
    const sections: Array<{
      key: string;
      roundIndex: number;
      groupIndex: number;
      dayIndex: number;
      dayNumber: number;
      isFinalSessionForGroup: boolean;
      direction: SetFlowDirection;
      headingPrefix: string;
      headingMeasurement: string;
      sessionCount: number;
      repResetBefore?: string;
      repResetAfter?: string;
      dayBefore: string;
      dayAfter: string;
      setTargets: Array<{ label: string; value: string; compareValue?: string }>;
      postBefore: string;
      postAfter: string;
    }> = [];
    let pendingRepResetPreview: {
      before: string;
      after: string;
    } | null = null;
    let currentTarget = { ...exampleBaseTarget };
    let pendingRepReset = false;

    for (const step of combinedProgressionExampleSequence) {
      let repResetBefore: string | undefined;
      let repResetAfter: string | undefined;

      if (step.isFirstStepOfRound && sections.length > 0 && pendingRepReset) {
        repResetBefore = `${currentTarget.reps} reps`;
        currentTarget = {
          ...currentTarget,
          reps: promotionRepDirection === "down" ? promotionRepRangeMaxValue : promotionRepRangeMinValue,
        };
        repResetAfter = `${currentTarget.reps} reps`;
        pendingRepReset = false;
      }

      const direction = effortWaveDirections[step.dayIndex] ?? "straight";
      const dayBaseTarget = { ...currentTarget };
      const dayShiftedTarget = shouldRenderPromotionStepSettings
        ? applyExampleDayShift(dayBaseTarget, direction)
        : dayBaseTarget;
      const withinSessionTargets = buildWithinSessionTargets(dayShiftedTarget);
      const postSessionTarget = step.isFinalSessionForGroup
        ? applyFocusedPromotionMeasurements(dayBaseTarget, step.measurements)
        : { ...dayBaseTarget };

      if (
        step.isFinalSessionForGroup
        && shouldUsePromotionRepRangeExample
        && step.measurements.includes("reps")
        && (
          promotionRepDirection === "down"
            ? postSessionTarget.reps <= promotionRepRangeMinValue
            : postSessionTarget.reps >= postSessionTarget.repsCap
        )
      ) {
        pendingRepReset = true;
      }

      sections.push({
        key: `${step.roundIndex}-${step.dayIndex}-${step.groupIndex}-${step.sessionIndex}`,
        roundIndex: step.roundIndex,
        groupIndex: step.groupIndex,
        dayIndex: step.dayIndex,
        dayNumber: step.dayNumber,
        isFinalSessionForGroup: step.isFinalSessionForGroup,
        direction,
        headingPrefix: `Day ${step.dayNumber} | Session ${step.sessionIndex}`,
        headingMeasurement: formatProgressionExampleHeadingMeasurement(step.measurements),
        sessionCount: Math.max(1, step.sessionCount),
        repResetBefore,
        repResetAfter,
        dayBefore: formatExampleTargetMeasurementsFor(activeDayStepMeasurements, dayBaseTarget),
        dayAfter: formatExampleTargetMeasurementsFor(activeDayStepMeasurements, dayShiftedTarget),
        setTargets: withinSessionTargets.map((target, targetIndex) => ({
          label: `Set ${targetIndex + 1}`,
          value: formatExampleTargetMeasurementsFor(visibleSetFlowExampleMeasurements, target),
          compareValue: targetIndex > 0
            ? formatExampleTargetMeasurementsFor(
              visibleSetFlowExampleMeasurements,
              withinSessionTargets[targetIndex - 1]!,
            )
            : formatExampleTargetMeasurementsFor(visibleSetFlowExampleMeasurements, dayShiftedTarget),
        })),
        postBefore: formatExampleTargetMeasurements(dayBaseTarget),
        postAfter: formatExampleTargetMeasurements(postSessionTarget),
      });

      currentTarget = postSessionTarget;
    }

    if (pendingRepReset && combinedProgressionExampleSequence.length > 0) {
      const resetTarget = {
        ...currentTarget,
        reps: promotionRepDirection === "down" ? promotionRepRangeMaxValue : promotionRepRangeMinValue,
      };
      pendingRepResetPreview = {
        before: `${currentTarget.reps} reps`,
        after: `${resetTarget.reps} reps`,
      };
    }

    return {
      sections,
      pendingRepResetPreview,
    };
  })();
  const combinedProgressionExampleRows = (() => {
    const rows: Array<{
      key: string;
      headingMeasurement: string;
      sections: typeof combinedProgressionExampleSections;
    }> = [];

    for (const section of combinedProgressionExampleSections) {
      const rowKey = `${section.roundIndex}-${section.groupIndex}`;
      const lastRow = rows[rows.length - 1];
      if (!lastRow || lastRow.key !== rowKey) {
        rows.push({
          key: rowKey,
          headingMeasurement: section.headingMeasurement,
          sections: [section],
        });
        continue;
      }

      lastRow.sections.push(section);
    }

    return rows;
  })();
  const preProgressionCycleShiftRows = combinedProgressionExampleSections
    .filter((section) => section.repResetBefore && section.repResetAfter)
    .map((section) => ({
      key: `${section.key}-pre-progression-cycle-shift`,
      before: section.repResetBefore!,
      after: section.repResetAfter!,
    }));
  if (pendingRepResetPreview) {
    preProgressionCycleShiftRows.push({
      key: "pending-pre-progression-cycle-shift",
      before: pendingRepResetPreview.before,
      after: pendingRepResetPreview.after,
    });
  }
  const uniquePreProgressionCycleShiftRows = preProgressionCycleShiftRows.filter((row, index, rows) => {
    const firstMatchIndex = rows.findIndex((candidate) => candidate.before === row.before && candidate.after === row.after);
    return firstMatchIndex === index;
  });
  const setFlowSettingsRow = (
    <SetFlowMeasurementStepRow
      measurements={setFlowMeasurements}
      links={setFlowLinks}
      weightUnit={weightUnit}
      values={setFlowStepValues}
      counts={value.progressionSetFlowCountMap}
      groupedCounts={value.progressionSetFlowGroupedCountMap}
      directions={setFlowDirections}
      groupedDirections={value.progressionSetFlowGroupedDirectionMap}
      defaultCount={defaultSetFlowCount}
      onMove={moveSetFlowMeasurement}
      onToggleConnector={toggleSetFlowConnector}
      onStepChange={(measurement, nextValue) => {
        updateSetFlowStepValue(measurement, nextValue);
        showCustomInfo(getSetFlowInfoPayload(measurement));
      }}
      onCountChange={setSetFlowCount}
      onGroupedCountChange={setSetFlowGroupedCount}
      onDirectionToggle={(measurement, stepValue) => {
        toggleSetFlowDirection(measurement, stepValue);
        showCustomInfo(getSetFlowInfoPayload(measurement));
      }}
      onGroupedDirectionToggle={setSetFlowGroupedDirection}
      infoHandlers={getInfoSectionHandlers("set_step_settings")}
    />
  );
  void setExampleEntries;
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
      if (daySettingFields.length > 0) {
        fieldGroups.push({
          key: "promotion-step-settings",
          title: "Day Settings",
          tone: "primary",
          infoSection: "day_settings",
          fields: daySettingFields,
        });
      }
    }

    if (shouldRenderSetStepSettings) {
      fieldGroups.push({
        key: "set-step-settings",
        title: "Set Settings",
        tone: "primary",
        infoSection: "set_step_settings",
        fields: [
          <div key="set-flow-row" className="shrink-0">
            {setFlowSettingsRow}
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
        <ProgressionInfoMiniSection
          title="Routine setup"
          defaultOpen
          sectionKey="routine_setup"
          openSectionKey={openInfoMiniSectionKey}
          onOpenSectionKeyChange={setOpenInfoMiniSectionKey}
        >
          <ProgressionInfoRows
            rows={[
              { label: "Schedule Mode", value: "Week-based anchors Day 1 to a weekday. Day-based repeats every N days from the anchor date." },
              { label: "Cycle Start", value: "In day-based mode, this date anchors the repeating N-day cycle. In week-based mode, it places Day 1 inside the current anchored week." },
              { label: "Weekday Cycle Anchor", value: "Week-based only. Pick which weekday Day 1 anchors to. Covered days show how the current cycle spans forward from that anchor." },
              { label: "Cycle Length", value: "Total routine days before the cycle repeats. In week-based mode, extra days continue into the next week." },
              { label: "Timezone", value: "Controls Today rollover, routine cycle day rollover, and routine occurrence dates." },
              { label: "Units", value: "Default weight and distance units used for routine targets, progression values, and logged workout values." },
            ]}
          />
        </ProgressionInfoMiniSection>

        <ProgressionInfoMiniSection
          title={(
            <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 text-center">
              <span>Progression type</span>
              <SignatureMiniPipe />
              <span className="text-[rgb(var(--secondary-action-rgb)/0.94)]">{selectedPlaybookId ? "Auto" : "Manual"}</span>
            </span>
          )}
          defaultOpen
          sectionKey="progression_method"
          openSectionKey={openInfoMiniSectionKey}
          onOpenSectionKeyChange={setOpenInfoMiniSectionKey}
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

        <ProgressionInfoMiniSection
          title="Session Settings"
          sectionKey="session_settings"
          openSectionKey={openInfoMiniSectionKey}
          onOpenSectionKeyChange={setOpenInfoMiniSectionKey}
        >
          <ProgressionInfoRows
            rows={[
              { label: "Purpose", value: "Controls measurement order, grouping, session count span, and direction for the measurements that can progress." },
              { label: "Grouped sessions", value: "Active AND groups share one session count and one direction until the session flow advances." },
              { label: "Empty inputs", value: "Blank measurements stay straight, do not show active direction behavior, and are omitted from active grouped session behavior." },
              { label: "Cycle effect", value: "Session Settings drive how progression advances across the routine cycle and how the progression example sequences its session steps." },
              { label: "Scope", value: "Session Settings affect progression order and qualification flow. They do not change within-session set sequencing." },
            ]}
          />
        </ProgressionInfoMiniSection>

        <ProgressionInfoMiniSection
          title="Day Settings"
          sectionKey="day_settings"
          openSectionKey={openInfoMiniSectionKey}
          onOpenSectionKeyChange={setOpenInfoMiniSectionKey}
        >
          <ProgressionInfoRows
            rows={[
              { label: "Purpose", value: "Controls how far the effective target shifts for a cycle day before Session Settings and Set Settings continue the workout flow." },
              { label: "Synced", value: "Day Settings mirror Session Settings and the day input boxes stay hidden." },
              { label: "Unsynced", value: "Day Settings use their own time, distance, rep, and load steps, shown inline beside the regression inputs." },
              { label: "Effort schedule", value: "Each day can stay straight, push up, or back off down before the workout starts." },
              { label: "Active measurements", value: "The active measurements row decides which day fields appear. Unused measurements stay hidden." },
            ]}
          />
        </ProgressionInfoMiniSection>

        <ProgressionInfoMiniSection
          title="Set Settings"
          sectionKey="set_step_settings"
          openSectionKey={openInfoMiniSectionKey}
          onOpenSectionKeyChange={setOpenInfoMiniSectionKey}
        >
          <ProgressionInfoRows
            rows={[
              { label: "Purpose", value: "Controls within-session set order, grouping, set count span, and direction for the active set measurements." },
              {
                label: "Current flow",
                value: isCustomSetFlow
                  ? "Custom order and grouping per measurement: each active metric can move independently or share grouped set behavior."
                  : `${selectedSetFlowInfo.label}: ${selectedSetFlowInfo.shortExplanation}`,
              },
              { label: "Quick Log", value: "Quick Log uses these settings to suggest the next set target inside the current set sequence." },
              { label: "Grouped sets", value: "Active AND groups share one set count and one direction until the set flow advances." },
              { label: "Empty inputs", value: "Blank measurements stay straight and are omitted from active grouped set behavior." },
              { label: SET_FLOW_DEFINITIONS.straight_sets.label, value: `${SET_FLOW_DEFINITIONS.straight_sets.shortExplanation} Best when every work set should hold the same active target.` },
              { label: SET_FLOW_DEFINITIONS.ascending_ramp.label, value: `${SET_FLOW_DEFINITIONS.ascending_ramp.shortExplanation} Set Settings define the per-set measurement movement and count span.` },
              { label: SET_FLOW_DEFINITIONS.descending_backoff.label, value: `${SET_FLOW_DEFINITIONS.descending_backoff.shortExplanation} Useful when the first set is heaviest and later sets back off across the active measurements.` },
              { label: "Scope", value: "Set Settings affect the within-session example and session suggestions. They do not change post-session qualification or target updates." },
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
            sectionKey="regression_method"
            openSectionKey={openInfoMiniSectionKey}
            onOpenSectionKeyChange={setOpenInfoMiniSectionKey}
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

        <ProgressionInfoMiniSection title="Progression terms">
          <ProgressionInfoRows rows={keyTermRows} />
        </ProgressionInfoMiniSection>
      </div>
    </div>
  );
  const progressionControlsContent = (
    <div className="rounded-[1.1rem] border border-transparent bg-[rgb(var(--surface-1-rgb)/0.2)] px-2 py-3 text-left">
      <div className="space-y-2.5">
        {showLegacyTopMethodRail ? (
        <section className={progressionInfoMiniCardClassName}>
          <div className="px-3 pb-3 pt-2.5">
          <div className="overflow-x-auto pb-1 pt-0 pl-1 pr-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto w-full max-w-full space-y-3">
              <div className="space-y-2">
                <div className="mx-auto flex min-w-max flex-nowrap items-end justify-center gap-[3px]">
                  <div className="min-w-0 shrink-0 space-y-[5px]" {...getCustomInfoHandlers(() => getProgressionMethodInfoPayload(value.progressionPlaybookId ?? ""))}>
                    <div className="space-y-[2px]">
                      <div className="px-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-strong)/0.94)]">
                        Progression
                      </div>
                      <MetricAccentBar variant="thin" className="w-full opacity-80" />
                    </div>
                    <ProgressionBinaryToggleButton
                      label={selectedPlaybookId ? "Auto" : "Manual"}
                      ariaLabel="Progression method"
                      onClick={() => {
                        const nextValue = selectedPlaybookId ? "" : "double_progression";
                        setPlaybookId(nextValue as ProgressionPlaybookId | "");
                        showCustomInfo(getProgressionMethodInfoPayload(nextValue as ProgressionPlaybookId | ""));
                      }}
                      className="min-w-[8.5rem]"
                    />
                  </div>

                  {selectedPlaybookId ? (
                    <div className="min-w-0 shrink-0 space-y-[5px]" {...getCustomInfoHandlers(() => getRegressionInfoPayload(value.progressionStallPolicy))}>
                      <div className="space-y-[2px]">
                        <div className="px-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-yellow-on))]">
                          Regression
                        </div>
                        <MetricAccentBar variant="thin" className="w-full opacity-80" />
                      </div>
                      <ProgressionBinaryToggleButton
                        label={value.progressionStallPolicy === "deload_after_stall" ? "Deload" : "None"}
                        ariaLabel="Regression policy"
                        onClick={() => {
                          const nextPolicy: ProgressionStallPolicy = value.progressionStallPolicy === "deload_after_stall"
                            ? "none"
                            : "deload_after_stall";
                          setStallPolicy(nextPolicy);
                          showCustomInfo(getRegressionInfoPayload(nextPolicy));
                        }}
                        className="min-w-[8.5rem]"
                      />
                    </div>
                  ) : null}

                  {shouldRenderPromotionStepSettings ? (
                    <div className="min-w-0 shrink-0 space-y-[5px]" {...getInfoSectionHandlers("day_settings")}>
                      <div className="space-y-[2px]">
                        <div className="px-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-strong)/0.94)]">
                          Day Sync Session
                        </div>
                        <MetricAccentBar variant="thin" className="w-full opacity-80" />
                      </div>
                      <ProgressionBinaryToggleButton
                        label={value.progressionDayMode === "synced" ? "Synced" : "Unsynced"}
                        ariaLabel="Day settings sync mode"
                        onClick={() => setDayMode(value.progressionDayMode === "synced" ? "unsynced" : "synced")}
                        className="min-w-[8.5rem]"
                      />
                    </div>
                  ) : null}

                  {showAutoApplyUpdatesControl ? (
                    <div className="min-w-0 shrink-0 space-y-[5px]">
                      <div className="space-y-[2px]">
                        <div className="px-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-strong)/0.94)]">
                          Auto Apply Updates
                        </div>
                        <MetricAccentBar variant="thin" className="w-full opacity-80" />
                      </div>
                      <ProgressionBinaryToggleButton
                        label={autoApplyUpdatesToExercises ? "Active" : "Inactive"}
                        ariaLabel="Auto apply updates to current exercises"
                        onClick={() => onAutoApplyUpdatesToExercisesChange(!autoApplyUpdatesToExercises)}
                        className="min-w-[8.5rem]"
                      />
                    </div>
                  ) : null}
                </div>
                {selectedPlaybookId && (shouldRenderDeloadSettings || shouldShowTopRowDaySettingFields) ? renderInlineSettingsFieldGroups([
                  {
                    key: "deload",
                    title: "Regression",
                    titleClassName: "text-[rgb(var(--accent-yellow-on))]",
                    fields: shouldRenderDeloadSettings ? deloadSettingFields : [],
                  },
                  { key: "day-settings", title: "Day Settings", fields: shouldShowTopRowDaySettingFields ? daySettingFields : [] },
                ], "deload_settings") : null}
              </div>
            </div>
          </div>
          </div>
        </section>
        ) : null}

        {selectedPlaybookId && supportsPromotionQualificationControls && (promotionOptions.length > 0 || sessionSettingFields.length > 0) ? (
          <ProgressionControlsSection title="Session Settings">
            {isRoutineDefaultContext ? (
              <div className="space-y-3.5">
                <PromotionMeasurementStepRow
                  measurements={routinePromotionMeasurements}
                  links={routinePromotionLinks}
                  weightUnit={weightUnit}
                  values={routinePromotionStepValues}
                  directions={value.progressionPromotionDirectionMap}
                  groupedDirections={value.progressionPromotionGroupedDirectionMap}
                  sessionCounts={value.progressionPromotionSessionCountMap}
                  groupedSessionCounts={value.progressionPromotionGroupedSessionCountMap}
                  defaultSessionCount={defaultRoutineSessionCount}
                  repRangeMin={value.progressionPromotionRepRangeMin}
                  repRangeMax={value.progressionPromotionRepRangeMax}
                  repRangeStep={value.progressionBodyweightRepIncrement}
                  onMove={moveRoutinePromotionMeasurement}
                  onToggleConnector={toggleRoutinePromotionConnector}
                  onStepChange={setRoutinePromotionStep}
                  onDirectionToggle={setRoutinePromotionDirection}
                  onGroupedDirectionToggle={setRoutinePromotionGroupedDirection}
                  onSessionCountChange={setRoutinePromotionSessionCount}
                  onGroupedSessionCountChange={setRoutinePromotionGroupedSessionCount}
                  onRepRangeMinChange={setRoutinePromotionRepRangeMin}
                  onRepRangeMaxChange={setRoutinePromotionRepRangeMax}
                  onRepRangeStepChange={(nextValue) => setRoutinePromotionStep("reps", nextValue)}
                  infoHandlers={getCustomInfoHandlers(() => getRoutinePromotionOrderInfoPayload(routinePromotionMeasurements, routinePromotionLinks))}
                />
              </div>
            ) : (
              <div className="space-y-3" {...getCustomInfoHandlers(() => getPromotionBasisInfoPayload(selectedPromotionOptionId ?? "weight_and_reps"))}>
                {sessionSettingFields.length > 0 ? renderInlineSettingsFields(sessionSettingFields, "progression_method") : null}
                {promotionOptions.length > 0 ? (
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
                              showCustomInfo(getPromotionBasisInfoPayload(option.id));
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
                ) : null}
                {promotionSummary ? (
                  <p className="px-1 text-center text-[0.72rem] leading-5 text-[rgb(var(--text-secondary)/0.9)]">
                    {promotionSummary}
                  </p>
                ) : null}
                {renderSessionMetaControls()}
              </div>
            )}
          </ProgressionControlsSection>
        ) : null}

        {shouldRenderSetStepSettings ? (
          <ProgressionControlsSection title="Set Settings">
            <div className="space-y-3">
              {setFlowSettingsRow}
            </div>
          </ProgressionControlsSection>
        ) : null}

        {false && selectedPlaybookId ? (
          <ProgressionControlsSection title="Progression Example">
            <div className="space-y-3" {...getCustomInfoHandlers(() => getRoutinePromotionOrderInfoPayload(
              visibleRoutinePromotionMeasurements,
              buildPromotionLinksFromGroups(visibleRoutinePromotionMeasurementGroups),
            ))}>
              {shouldRenderPromotionStepSettings ? (
                <div className="space-y-2">
                  <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent-divider-rgb)/0.94)]">
                    Day Settings
                  </p>
                  <LoopingScrollRail className="pb-1" innerClassName="items-start justify-center gap-4 px-1 text-center" segmentClassName="shrink-0">
                    <div className="flex w-max min-w-max flex-col gap-2">
                      {dayExampleRows.map((row) => (
                        <div key={row.label} className="flex w-max min-w-max items-center justify-center gap-2">
                          <p className="min-w-[4.5rem] text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent-divider-rgb)/0.94)]">
                            {row.label} {formatSetFlowDirectionGlyph(row.direction)}
                          </p>
                          <div className="border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                            {renderPromotionExampleMetricLine(row.before, row.after, "left")}
                          </div>
                            <span className="inline-flex min-w-4 items-center justify-center text-transparent [font-size:0]">
                              <ChevronDownIcon className="h-3 w-3 text-[rgb(var(--accent-divider-rgb)/0.95)]" />
                            →
                          </span>
                          <div className="border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                            {renderPromotionExampleMetricLine(row.after, row.before)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </LoopingScrollRail>
                </div>
              ) : null}
              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent-divider-rgb)/0.94)]">
                Post-Session
              </p>
              <LoopingScrollRail className="pb-1" innerClassName="items-start justify-center gap-6 px-1 text-center" segmentClassName="shrink-0">
                <div className="flex w-max min-w-max flex-col gap-2">
                  {progressivePromotionExampleRows.map((row, index) => (
                    <div key={`promotion-example-row-${index}`} className="flex w-max min-w-max items-center justify-center gap-2">
                      <div className="border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                        {renderPromotionExampleMetricLine(row.left, row.right, "left")}
                      </div>
                      <span className="inline-flex min-w-4 items-center justify-center text-[12px] font-bold text-[rgb(var(--accent-divider-rgb)/0.95)]">
                        →
                      </span>
                      <div className="border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                        {renderPromotionExampleMetricLine(row.right, row.left)}
                      </div>
                    </div>
                  ))}
                </div>
              </LoopingScrollRail>
              {shouldRenderSetStepSettings ? (
                <div className="space-y-2">
                  <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent-divider-rgb)/0.94)]">
                    Within Session
                  </p>
                  <div className="mx-auto flex w-fit max-w-full flex-col gap-2 text-center">
                    {setStepExampleRows.map((row) => (
                      <div key={row.label} className="flex flex-col items-center gap-1">
                        <div className="text-center">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent-divider-rgb)/0.94)]">
                            {row.label}
                          </p>
                        </div>
                        <div className="flex w-max min-w-max items-center justify-center gap-2">
                          <div className="border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                            {renderSetStepExampleMetricLine(row.before, row.after, "left")}
                          </div>
                          <span className="inline-flex min-w-4 items-center justify-center text-[12px] font-bold text-[rgb(var(--accent-divider-rgb)/0.95)]">
                            →
                          </span>
                          <div className="border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                            {renderSetStepExampleMetricLine(row.after, row.before)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </ProgressionControlsSection>
        ) : null}

        {selectedPlaybookId ? (
          <ProgressionControlsSection
            title="Progression Example"
            titleClassName={progressionExampleTitleClassName}
          >
            <div
              className="space-y-4"
              {...getCustomInfoHandlers(() => getRoutinePromotionOrderInfoPayload(
                visibleRoutinePromotionMeasurements,
                buildPromotionLinksFromGroups(visibleRoutinePromotionMeasurementGroups),
              ))}
            >
              {shouldUsePromotionRepMeasurement && uniquePreProgressionCycleShiftRows.length > 0 ? (
                <div className="hide-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]">
                  <div className="mx-auto flex w-max min-w-max flex-nowrap items-center justify-center px-1">
                    <div className="w-fit max-w-full space-y-3 rounded-[1rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.16)] px-3 py-3 text-center">
                      <div className="mx-auto flex w-fit max-w-full flex-col gap-3 text-center">
                        {uniquePreProgressionCycleShiftRows.map((row) => (
                          <div key={row.key} className="space-y-1">
                            {(() => {
                              const direction = getPreProgressionCycleShiftDirection(row.before, row.after);
                              return (
                                <div className="mx-auto flex w-fit max-w-full flex-col items-center gap-1 text-center">
                                  <p className={cn("text-center text-[10px] font-semibold uppercase tracking-[0.14em]", getEffortShiftTitleClassName(direction))}>
                                    <span>Pre Progression Cycle Shift </span>
                                    <span aria-hidden="true">
                                      {direction === "up" ? "\u2191" : direction === "down" ? "\u2193" : "\u2014"}
                                    </span>
                                  </p>
                                  <div className={cn("h-px w-full rounded-full opacity-80", getEffortShiftBarClassName(direction))} />
                                </div>
                              );
                            })()}
                            <div className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
                              <div className="min-w-0 max-w-full border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                                {renderChangedOnlyPromotionExampleMetricLine(row.before, row.after, "left")}
                              </div>
                              <span className="inline-flex min-w-4 items-center justify-center text-[rgb(var(--accent-divider-rgb)/0.95)]">
                                <span className="text-[12px] font-bold leading-none">{"\u2192"}</span>
                              </span>
                              <div className="min-w-0 max-w-full border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                                {renderChangedOnlyPromotionExampleMetricLine(row.after, row.before)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              {combinedProgressionExampleRows.map((row, rowIndex) => {
                const finalSection = row.sections[row.sections.length - 1];
                return (
                <div key={row.key} className="space-y-2">
                  <div className="hide-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]">
                    <div className="mx-auto flex w-max min-w-max flex-nowrap items-center justify-center px-1">
                      <div className="mx-auto flex w-fit max-w-full flex-col items-center gap-1 text-center">
                          <p className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", progressionExampleTitleClassName)}>
                            <span className={progressionExampleMetricUnitClassName}>{row.headingMeasurement}</span>
                          </p>
                        <MetricAccentBar variant="thin" className="mt-1 w-full opacity-80" />
                      </div>
                    </div>
                  </div>
                  <div className="hide-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]">
                    <div className="mx-auto flex w-max min-w-max flex-nowrap items-stretch justify-center gap-0 px-1">
                      {row.sections.map((section, index) => (
                        <Fragment key={section.key}>
                          {index > 0 ? (
                            <div className="mx-2 flex shrink-0 items-stretch justify-center py-2" aria-hidden="true">
                              <span className="block w-px rounded-full bg-[rgb(var(--accent-strong)/0.72)]" />
                            </div>
                          ) : null}
                          <div
                            className={cn(
                              "shrink-0 w-fit max-w-full min-w-[18rem] space-y-3 rounded-[1rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.16)] px-3 py-3",
                              row.sections.length === 1 ? "min-w-[20rem]" : "min-w-[18rem]",
                            )}
                          >
                  <div className="mx-auto flex w-fit max-w-full flex-col items-center gap-2 text-center">
                    <p className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", progressionExampleTitleClassName)}>
                      <span className={progressionExampleMeasurementLabelClassName}>{section.headingPrefix}</span>
                    </p>
                    <MetricAccentBar variant="thin" className="mt-1 w-full opacity-80" />
                    {shouldRenderPromotionStepSettings ? (
                      <ProgressionDayDirectionButton
                        dayNumber={section.dayNumber}
                        direction={section.direction}
                        className="!min-w-[1.95rem]"
                        onClick={() => {
                          toggleEffortWaveDirection(section.dayIndex);
                          setCustomInfoContent(null);
                          setActiveInfoSection("day_settings");
                          setHasInfoSelection(true);
                        }}
                      />
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    {false && section.repResetBefore && section.repResetAfter ? (
                      <div className="space-y-2">
                        <p className={cn("text-center text-[10px] font-semibold uppercase tracking-[0.14em]", progressionExampleMeasurementLabelClassName)}>
                          Rep Reset
                        </p>
                        <div className="mx-auto flex w-fit max-w-full flex-col items-center justify-center gap-y-1 text-center">
                          <div className="min-w-0 max-w-full border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                            {renderPromotionExampleMetricLine(section.repResetBefore!, section.repResetAfter!, "left")}
                          </div>
                          <span className="inline-flex min-h-4 min-w-0 rotate-90 items-center justify-center text-[12px] font-bold text-[rgb(var(--accent-divider-rgb)/0.95)]">
                            â†’
                          </span>
                          <div className="min-w-0 max-w-full border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                            {renderPromotionExampleMetricLine(section.repResetAfter!, section.repResetBefore!)}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <p className={cn("text-center text-[10px] font-semibold uppercase tracking-[0.14em]", progressionExampleMeasurementLabelClassName)}>
                      Within Session
                    </p>
                    {shouldRenderPromotionStepSettings && activeDayStepMeasurements.length > 0 && shouldShowEffortShiftLabel(section.direction) ? (
                      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-primary)/0.96)]">
                        <span className={getEffortShiftTitleClassName(section.direction)}>
                        {`Day ${section.dayNumber} Shift ${section.direction === "up" ? "↑" : "↓"}`}
                        </span>
                      </p>
                    ) : null}
                    {false && shouldRenderPromotionStepSettings && activeDayStepMeasurements.length > 0 && shouldShowEffortShiftLabel(section.direction) ? (
                      <div className="mx-auto flex w-fit max-w-full flex-col items-center justify-center gap-y-1 text-center">
                        <div className="min-w-0 max-w-full border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                          {renderPromotionExampleMetricLine(section.dayBefore, section.dayAfter, "left")}
                        </div>
                        <span className="inline-flex min-h-4 min-w-0 rotate-90 items-center justify-center text-[12px] font-bold text-[rgb(var(--accent-divider-rgb)/0.95)]">
                          →
                        </span>
                        <div className="min-w-0 max-w-full border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                          {renderPromotionExampleMetricLine(section.dayAfter, section.dayBefore)}
                        </div>
                      </div>
                    ) : null}
                    {shouldRenderPromotionStepSettings && activeDayStepMeasurements.length > 0 && shouldShowEffortShiftLabel(section.direction) ? (
                      <div className="mx-auto flex w-fit max-w-full flex-col items-center justify-center text-center">
                        <div className="min-w-0 max-w-full border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                          {renderPromotionExampleMetricLine(section.dayAfter, section.dayBefore)}
                        </div>
                      </div>
                    ) : null}
                    <div className="mx-auto flex w-fit max-w-full flex-col gap-2 text-center">
                      {section.setTargets.map((target) => (
                        <div
                          key={`${section.key}-${target.label}-value`}
                          className="flex flex-col items-center gap-1"
                        >
                          <p className={cn("text-[10px] font-semibold uppercase tracking-[0.14em]", progressionExampleMeasurementLabelClassName)}>
                            {target.label}
                          </p>
                          <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1">
                            <div className="min-w-0 max-w-full border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                              {renderSetStepExampleMetricLine(target.value, target.compareValue)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {false && section.isFinalSessionForGroup ? (
                    <div className="space-y-2">
                      <p className={cn("text-center text-[10px] font-semibold uppercase tracking-[0.14em]", progressionExampleMeasurementLabelClassName)}>
                        Post-Session
                      </p>
                      <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
                        <div className="min-w-0 max-w-full border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                          {renderPromotionExampleMetricLine(section.postBefore, section.postAfter, "left")}
                        </div>
                        <span className="inline-flex min-w-4 items-center justify-center text-[12px] font-bold text-[rgb(var(--accent-divider-rgb)/0.95)]">
                          →
                        </span>
                        <div className="min-w-0 max-w-full border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                          {renderPromotionExampleMetricLine(section.postAfter, section.postBefore)}
                        </div>
                      </div>
                    </div>
                  ) : null}
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                  {finalSection?.isFinalSessionForGroup ? (
                    <div className="hide-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]">
                      <div className="mx-auto flex w-max min-w-max flex-nowrap items-center justify-center px-1">
                        <div className="w-fit max-w-full space-y-2 rounded-[1rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.16)] px-3 py-3 text-center">
                          <p className={cn("text-center text-[10px] font-semibold uppercase tracking-[0.14em]", progressionExampleMeasurementLabelClassName)}>
                            {getPostSessionTitle(finalSection.headingMeasurement, finalSection.sessionCount)}
                          </p>
                          <div className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
                            <div className="min-w-0 max-w-full border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                              {renderPromotionExampleMetricLine(finalSection.postBefore, finalSection.postAfter, "left")}
                            </div>
                            <span className="inline-flex min-w-4 items-center justify-center text-[rgb(var(--accent-divider-rgb)/0.95)]">
                              <span className="text-[12px] font-bold leading-none">{"\u2192"}</span>
                            </span>
                            <div className="min-w-0 max-w-full border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                              {renderPromotionExampleMetricLine(finalSection.postAfter, finalSection.postBefore)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {rowIndex < combinedProgressionExampleRows.length - 1 ? (
                    <div className="flex justify-center pt-1">
                      <div className="h-px w-1/2 min-w-[10rem] max-w-[22rem] rounded-full bg-[rgb(var(--accent-divider-rgb)/0.32)]" />
                    </div>
                  ) : null}
                </div>
              );
              })}
            </div>
          </ProgressionControlsSection>
        ) : null}

        {false ? (
          <ProgressionControlsSection title="Set Flow Example Hidden">
            <div className="space-y-2" {...getCustomInfoHandlers(() => getSetFlowInfoPayload())}>
              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent-divider-rgb)/0.94)]">
                Within Session
              </p>
              <div className="mx-auto flex w-fit max-w-full flex-col gap-2 text-center">
                {setStepExampleRows.map((row) => (
                  <div key={row.label} className="flex flex-col items-center gap-1">
                    <div className="text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent-divider-rgb)/0.94)]">
                        {row.label}
                      </p>
                    </div>
                    <div className="flex w-max min-w-max items-center justify-center gap-2">
                      <div className="border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                        {renderSetStepExampleMetricLine(row.before, row.after, "left")}
                      </div>
                      <span className="inline-flex min-w-4 items-center justify-center text-[12px] font-bold text-[rgb(var(--accent-divider-rgb)/0.95)]">
                        →
                      </span>
                      <div className="border-b border-[rgb(var(--accent-divider-rgb)/0.28)] pb-1 text-[0.74rem] leading-5 text-[rgb(var(--text-primary)/0.96)]">
                        {renderSetStepExampleMetricLine(row.after, row.before)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ProgressionControlsSection>
        ) : null}

        {null}

        {null}

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
        setIsExpanded((current) => {
          const nextValue = !current;
          window.dispatchEvent(new CustomEvent("fitness:routine-editor-section-toggle", {
            detail: {
              sectionKey: "progression_method",
              isOpen: nextValue,
            },
          }));
          return nextValue;
        });
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
      <input type="hidden" name="progressionSetFlow" value={derivedSetFlowId} />
      <input
        type="hidden"
        name="progressionSetFlowDirectionsJson"
        value={JSON.stringify({
          time: setFlowDirections.time,
          distance: setFlowDirections.distance,
          reps: setFlowDirections.reps,
          weight: setFlowDirections.weight,
        })}
      />
      <input type="hidden" name="progressionAutoUpdateRoutineGoals" value="0" />
      <input type="hidden" name="progressionBarbellLoadIncrement" value={value.progressionBarbellLoadIncrement} />
      <input type="hidden" name="progressionDumbbellLoadIncrement" value={value.progressionDumbbellLoadIncrement} />
      <input type="hidden" name="progressionMachineLoadIncrement" value={value.progressionMachineLoadIncrement} />
      <input type="hidden" name="progressionCableLoadIncrement" value={value.progressionCableLoadIncrement} />
      <input type="hidden" name="progressionBodyweightRepIncrement" value={value.progressionBodyweightRepIncrement} />
      <input
        type="hidden"
        name="progressionPromotionRepRangePreviewJson"
        value={JSON.stringify({
          min: parseOptionalPositiveInteger(value.progressionPromotionRepRangeMin) ?? 8,
          max: parseOptionalPositiveInteger(value.progressionPromotionRepRangeMax) ?? 12,
        })}
      />
      <input
        type="hidden"
        name="progressionPromotionDirectionMapJson"
        value={JSON.stringify(value.progressionPromotionDirectionMap)}
      />
      <input type="hidden" name="progressionDurationIncrementSeconds" value={value.progressionDurationIncrementSeconds} />
      <input type="hidden" name="progressionDistanceIncrement" value={value.progressionDistanceIncrement} />
      <input type="hidden" name="progressionDayMode" value={value.progressionDayMode} />
      <input type="hidden" name="progressionDayLoadStep" value={value.progressionDayLoadStep} />
      <input type="hidden" name="progressionDayRepStep" value={value.progressionDayRepStep} />
      <input type="hidden" name="progressionDayDurationStep" value={value.progressionDayDurationStep} />
      <input type="hidden" name="progressionDayDistanceStep" value={value.progressionDayDistanceStep} />
      <input
        type="hidden"
        name="progressionEffortWaveDirectionsJson"
        value={JSON.stringify(value.progressionEffortWaveDirections)}
      />
      <input type="hidden" name="progressionSetFlowLoadStep" value={value.progressionSetFlowLoadStep} />
      <input type="hidden" name="progressionSetFlowRepStep" value={value.progressionSetFlowRepStep} />
      <input type="hidden" name="progressionSetFlowDurationStep" value={value.progressionSetFlowDurationStep} />
      <input type="hidden" name="progressionSetFlowDistanceStep" value={value.progressionSetFlowDistanceStep} />
      <input type="hidden" name="progressionPromotionBasis" value={value.progressionPromotionBasis} />
      <input
        type="hidden"
        name="progressionPromotionMeasurementOrdersJson"
        value={JSON.stringify({
          strength: value.progressionStrengthPromotionMeasurements,
          bodyweight: value.progressionBodyweightPromotionMeasurements,
          cardio: value.progressionCardioPromotionMeasurements,
        })}
      />
      <input
        type="hidden"
        name="progressionPromotionMeasurementSequenceJson"
        value={JSON.stringify({
          strength: buildPromotionMeasurementGroups(value.progressionStrengthPromotionMeasurements, value.progressionStrengthPromotionLinks),
          bodyweight: buildPromotionMeasurementGroups(value.progressionBodyweightPromotionMeasurements, value.progressionBodyweightPromotionLinks),
          cardio: buildPromotionMeasurementGroups(value.progressionCardioPromotionMeasurements, value.progressionCardioPromotionLinks),
        })}
      />
      <input type="hidden" name="progressionRepPromotionThreshold" value={value.progressionRepPromotionThreshold} />
      <input type="hidden" name="progressionCustomRepPromotionTarget" value={value.progressionCustomRepPromotionTarget} />
      <input type="hidden" name="progressionTargetMutation" value={value.progressionTargetMutation} />
      <input type="hidden" name="progressionHasExplicitTargetMutation" value={value.progressionHasExplicitTargetMutation ? "1" : "0"} />
      <input type="hidden" name="progressionRequiredQualifiedSessions" value={value.progressionRequiredQualifiedSessions} />
      <input type="hidden" name="progressionQualificationWindowMode" value={value.progressionQualificationWindowMode} />
      <input type="hidden" name="progressionQualificationWindowResetOnMiss" value={value.progressionQualificationWindowResetOnMiss ? "1" : "0"} />
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
