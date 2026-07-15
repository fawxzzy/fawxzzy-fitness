"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { HorizontalScrollHint } from "@/components/ui/HorizontalScrollHint";
import { GLOW_SWITCH_MEASUREMENT_ROW_WRAPPER_CLASS_NAME } from "@/components/ui/GlowSwitch";
import { InlineEdgeControlButton, INLINE_EDGE_CONTROL_NUMERIC_GLYPH_CLASS_NAME } from "@/components/ui/InlineEdgeControlButton";
import { labeledEditorFieldControlClassName, labeledEditorFieldFloatingLabelClassName } from "@/components/ui/LabeledEditorField";
import { cn } from "@/lib/cn";
import type { MeasurementMetrics, MeasurementValues } from "@/components/ui/measurements/ModifyMeasurements";
import { resolveScreenContract } from "@/components/ui/app/screenContract";
import { StatFieldLabel } from "@/components/ui/measurements/StatFieldLabel";
import { resolveDefaultMeasurementMetricLabel } from "@/lib/measurement-metric-labels";
import { getDistanceMetricLabel, normalizeFitnessDistanceUnit } from "@/lib/fitness-distance-units";

const METRICS: Array<{
  key: keyof MeasurementMetrics;
  title: string;
  suffix: (values: MeasurementValues) => string;
}> = [
  { key: "reps", title: "REPS", suffix: () => "range" },
  { key: "weight", title: "WEIGHT", suffix: (values) => values.weightUnit },
  { key: "time", title: "TIME", suffix: () => "mm:ss" },
  { key: "distance", title: "DISTANCE", suffix: (values) => getDistanceMetricLabel(values.distanceUnit) },
  { key: "calories", title: "CALORIES", suffix: () => "cal" },
];

const shellClassName = "space-y-0";
const metricCardClassName = appTokens.measurementField;
const valueInputClassName = appTokens.measurementInput;
const bottomRightInlineLabelClassName = appTokens.measurementInlineValueLabel;
const lowerBottomRightInlineLabelClassName = appTokens.measurementInlineValueLabelLower;
const compactTopRowInlineLabelClassName = cn(lowerBottomRightInlineLabelClassName, "right-2.5 text-[8px] tracking-[0.06em]");
const topRightInlineLabelClassName = "top-2.5 right-2.5 translate-y-0 text-[8px] tracking-[0.06em] text-[rgb(var(--accent)/0.92)]";
const floatingBorderLabelClassName = cn(
  labeledEditorFieldFloatingLabelClassName,
  "mx-auto mr-auto px-1 py-0 text-center leading-none",
);
const topRightInlineLabelBaseClassName = "pointer-events-none absolute whitespace-nowrap text-right text-[8px] font-semibold uppercase leading-[1.02] tracking-[0.06em] text-[rgb(var(--accent)/0.92)]";
const floatingBorderFieldShellClassName = "relative min-w-0 rounded-[1rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.22)] [touch-action:pan-x_pan-y] [-webkit-tap-highlight-color:transparent] transition-[border-color,box-shadow] focus-within:border-[rgb(var(--button-primary-border)/0.42)] focus-within:ring-2 focus-within:ring-[rgb(var(--button-primary-border)/0.18)]";
const horizontalRailTouchIntentThreshold = 10;
const horizontalRailTouchIntentRatio = 1.15;

function sanitizeIntegerInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole = "", ...fractionParts] = cleaned.split(".");
  if (fractionParts.length === 0) {
    return cleaned;
  }
  return `${whole}.${fractionParts.join("")}`;
}

function sanitizeDurationTextInput(value: string) {
  const cleaned = value.replace(/[^\d:]/g, "");
  const separatorIndex = cleaned.indexOf(":");
  const minutes = separatorIndex >= 0 ? cleaned.slice(0, separatorIndex) : cleaned;
  const secondsParts = separatorIndex >= 0 ? cleaned.slice(separatorIndex + 1) : "";
  if (!cleaned.includes(":")) {
    return minutes;
  }
  return `${minutes}:${secondsParts.replace(/:/g, "")}`;
}

function parseDurationSecondsForSteppedValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (!match) return 0;
  return (Number(match[1]) * 60) + Number(match[2]);
}

function formatDurationSecondsForSteppedValue(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatDecimalStepValue(value: number, precision = 2) {
  return value.toFixed(precision).replace(/\.?0+$/, "");
}

function decrementRepFieldValue(value: string | undefined) {
  const current = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(current) || current <= 1) {
    return "";
  }

  return String(current - 1);
}

type FieldWidth = "compact" | "standard" | "wide";

export type MeasurementPanelAuxiliaryField = {
  title: string;
  suffix?: string;
  input: ReactNode;
  inlineLabel?: string;
  useInlineFieldShell?: boolean;
  showEmptyValue?: boolean;
  hasValue?: boolean;
  labelClassName?: string;
  valueLabelClassName?: string;
  emptyValueClassName?: string;
  renderInput?: (options: { inputClassName: string }) => ReactNode;
  stepper?: {
    decrementAriaLabel: string;
    incrementAriaLabel: string;
    onDecrement: () => void;
    onIncrement: () => void;
  };
};

type HorizontalRailPointerState = {
  pointerId: number;
  startX: number;
  startY: number;
  startScrollLeft: number;
  intent: "pending" | "horizontal" | "vertical";
};

type HorizontalRailTouchState = {
  identifier: number;
  startX: number;
  startY: number;
  startScrollLeft: number;
  intent: "pending" | "horizontal" | "vertical";
};

function chunkFields<T>(items: T[], size: number) {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

function getFieldSpanClassName(width: FieldWidth, gridColumnCount: 2 | 3) {
  if (width !== "wide") {
    return undefined;
  }

  return gridColumnCount === 3 ? "col-span-3" : "col-span-2";
}

function getFieldChromeClassName(width: FieldWidth) {
  if (width === "compact") {
    return appTokens.measurementFieldCompact;
  }

  if (width === "wide") {
    return appTokens.measurementFieldWide;
  }

  return appTokens.measurementFieldStandard;
}

function getMetricRowLaneClassName(fieldCount: number, gridColumnCount: 2 | 3) {
  if (fieldCount >= 3) {
    return "w-full max-w-[20.25rem]";
  }

  if (fieldCount === 2) {
    return "w-full max-w-[15.25rem]";
  }

  return gridColumnCount === 3
    ? "w-[calc((100%-1rem)/3)] min-w-[5.5rem] max-w-[6.5rem]"
    : "w-[calc((100%-0.5rem)/2)] min-w-[6.75rem] max-w-[7.5rem]";
}

function getBelowRpeContentWidthClassName(width: FieldWidth = "wide") {
  if (width === "compact") {
    return "w-[7.25rem] min-w-[7.25rem] max-w-[7.25rem]";
  }

  if (width === "standard") {
    return "w-[8.75rem] min-w-[8.75rem] max-w-[9.25rem]";
  }

  return "w-[52%] min-w-[10.5rem] max-w-[14rem]";
}

function renderMetricCard({
  testId,
  width,
  gridColumnCount,
  children,
  dimmed = false,
}: {
  testId: string;
  width: FieldWidth;
  gridColumnCount: 2 | 3;
  children: ReactNode;
  dimmed?: boolean;
}) {
  return (
    <div
        className={cn(
          metricCardClassName,
          "min-h-0 min-w-0 overflow-visible border-transparent bg-transparent px-0 py-0 shadow-none",
          getFieldSpanClassName(width, gridColumnCount),
          getFieldChromeClassName(width),
          dimmed ? "opacity-55" : undefined,
        )}
      data-testid={testId}
      data-field-width={width}
    >
      <div className="h-full">
        {children}
      </div>
    </div>
  );
}

type InlineFieldLabelPlacement = "side" | "top-right" | "floating-border";

function InlineFieldLabel({
  label,
  className,
  placement = "side",
}: {
  label: string;
  className?: string;
  placement?: InlineFieldLabelPlacement;
}) {
  return (
    <span
      aria-hidden="true"
        className={cn(
          placement === "floating-border"
            ? undefined
            : placement === "top-right"
              ? topRightInlineLabelBaseClassName
              : appTokens.measurementInlineSideLabel,
        className,
      )}
    >
      {label}
    </span>
  );
}

function InlineFieldControl({
  label,
  children,
  labelClassName,
  showEmptyValue = false,
  emptyValueClassName,
  hasValue = false,
  valueLabelClassName,
  labelPlacement = "side",
}: {
  label: string;
  children: ReactNode;
  labelClassName?: string;
  showEmptyValue?: boolean;
  emptyValueClassName?: string;
  hasValue?: boolean;
  valueLabelClassName?: string;
  labelPlacement?: InlineFieldLabelPlacement;
}) {
  if (labelPlacement === "floating-border") {
    return (
      <fieldset className={floatingBorderFieldShellClassName}>
        <legend
          className={cn(
            floatingBorderLabelClassName,
            hasValue ? valueLabelClassName : labelClassName,
          )}
        >
          {label}
        </legend>
        {children}
        {showEmptyValue ? (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 flex items-center justify-center px-3.5 text-center text-[15px] font-semibold tabular-nums text-[rgb(var(--text-muted)/0.72)]",
              emptyValueClassName,
            )}
          >
            -
          </span>
        ) : null}
      </fieldset>
    );
  }

  return (
    <div className="relative min-w-0">
      {children}
      {showEmptyValue ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center px-3.5 text-center text-[15px] font-semibold tabular-nums text-[rgb(var(--text-muted)/0.72)]",
            emptyValueClassName,
          )}
        >
          -
        </span>
      ) : null}
      <InlineFieldLabel
        label={label}
        placement={labelPlacement}
        className={
          hasValue
            ? cn(
                valueLabelClassName,
              )
            : labelClassName
        }
      />
    </div>
  );
}

function resolveMetricWidth({
  metric,
  singlePrimaryMetric,
  hasRpeInput,
  shareRowWithRpe,
}: {
  metric: keyof MeasurementMetrics;
  singlePrimaryMetric: keyof MeasurementMetrics | null;
  hasRpeInput: boolean;
  shareRowWithRpe: boolean;
}): FieldWidth {
  if (shareRowWithRpe) {
    return "standard";
  }

  if (metric === "time" && hasRpeInput) {
    return "compact";
  }

  return singlePrimaryMetric === metric ? "wide" : "standard";
}

function getInputClassName({
  tripleRow = false,
  hasValue = false,
  topRightLabel = false,
  floatingBorder = false,
  withEdgeControls = false,
  extraClassName,
}: {
  tripleRow?: boolean;
  hasValue?: boolean;
  topRightLabel?: boolean;
  floatingBorder?: boolean;
  withEdgeControls?: boolean;
  extraClassName?: string;
}) {
  if (floatingBorder) {
    return cn(
      valueInputClassName,
      labeledEditorFieldControlClassName,
      cn(
        "h-11 rounded-[inherit] !border-0 !bg-transparent py-0 text-center !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
        // The edge buttons occupy 1.75rem per side including their inset. Keep
        // the numeric lane readable instead of reserving more space than needed.
        withEdgeControls ? "px-[1.95rem] text-[13px]" : "px-3",
      ),
      extraClassName,
    );
  }

  if (topRightLabel) {
    return cn(
      valueInputClassName,
      tripleRow
        ? "px-3 pb-2 pt-4 text-center"
        : "px-3 pb-2 pt-4 text-center",
      extraClassName,
    );
  }

  return cn(
    valueInputClassName,
    tripleRow
      ? hasValue
        ? "pl-3 pr-7 pb-4 pt-2.5 text-left"
        : "pl-3 pr-7 text-left"
      : hasValue
        ? "pl-3 pr-10 pb-4 pt-2.5 text-left"
        : "pl-3 pr-10 text-left",
    extraClassName,
  );
}

export function MeasurementPanelV2({
  values,
  activeMetrics,
  onChange,
  names,
  className,
  description,
  showHeader = false,
  leadingContent,
  trailingContent,
  belowRpeContent,
  belowRpeField,
  rpe,
  onRpeChange,
  betweenInputsAndFooterContent,
  footerContent,
  footerClassName,
  repRangeFooterContent,
  repReplacementContent,
  showInnerHeader = false,
  topField,
  auxiliaryFields,
  horizontalRowPrefix,
  metricLabelOverrides,
  repRangeLabels,
  visibleMetrics,
  metricOrder,
  dimmedMetrics,
  layoutMode = "grid",
  labelTreatment = "inline",
  showInlineStepControls = false,
}: {
  values: MeasurementValues;
  activeMetrics: MeasurementMetrics;
  isExpanded: boolean;
  onExpandedChange: (nextValue: boolean) => void;
  onMetricToggle?: (metric: keyof MeasurementMetrics) => void;
  onChange: (patch: Partial<MeasurementValues>) => void;
  names?: Partial<Record<"reps" | "repsMax" | "weight" | "duration" | "distance" | "calories" | "weightUnit" | "distanceUnit", string>>;
  className?: string;
  description?: string;
  collapsedLabel?: string;
  collapsedDescription?: string;
  hideInputsWhenCollapsed?: boolean;
  showHeader?: boolean;
  leadingContent?: ReactNode;
  trailingContent?: ReactNode;
  belowRpeContent?: ReactNode;
  belowRpeField?: {
    title?: string;
    suffix?: string;
    width?: FieldWidth;
  };
  rpe?: string;
  onRpeChange?: (value: string) => void;
  betweenInputsAndFooterContent?: ReactNode;
  footerContent?: ReactNode;
  footerClassName?: string;
  repRangeFooterContent?: ReactNode;
  repReplacementContent?: ReactNode;
  showInnerHeader?: boolean;
  topField?: {
    title: string;
    suffix?: string;
    input: ReactNode;
    inlineLabel?: string;
    useInlineFieldShell?: boolean;
    showEmptyValue?: boolean;
    hasValue?: boolean;
    labelClassName?: string;
    valueLabelClassName?: string;
    emptyValueClassName?: string;
    renderInput?: (options: { inputClassName: string }) => ReactNode;
    stepper?: {
      decrementAriaLabel: string;
      incrementAriaLabel: string;
      onDecrement: () => void;
      onIncrement: () => void;
    };
  };
  auxiliaryFields?: MeasurementPanelAuxiliaryField[];
  horizontalRowPrefix?: ReactNode;
  metricLabelOverrides?: Partial<Record<keyof MeasurementMetrics, string>>;
  repRangeLabels?: {
    min: string;
    max: string;
  };
  visibleMetrics?: Array<keyof MeasurementMetrics>;
  metricOrder?: Array<keyof MeasurementMetrics>;
  dimmedMetrics?: Array<keyof MeasurementMetrics>;
  layoutMode?: "grid" | "horizontal-scroll";
  labelTreatment?: "inline" | "floating-border";
  showInlineStepControls?: boolean;
}) {
  const horizontalRailRef = useRef<HTMLDivElement | null>(null);
  const horizontalRailPointerStateRef = useRef<HorizontalRailPointerState | null>(null);
  const horizontalRailTouchStateRef = useRef<HorizontalRailTouchState | null>(null);
  const suppressHorizontalRailClickRef = useRef(false);
  const enabledCount = Object.values(activeMetrics).filter(Boolean).length;
  const resolvedDistanceUnit = normalizeFitnessDistanceUnit(values.distanceUnit, "mi");

  const hasRpeInput = typeof onRpeChange === "function";
  const contract = resolveScreenContract("exerciseLog");
  const allowedMetrics = new Set<keyof MeasurementMetrics>(visibleMetrics ?? ["reps", "weight", "time", "distance", "calories"]);
  const dimmedMetricSet = new Set<keyof MeasurementMetrics>(dimmedMetrics ?? []);
  const resolvedMetricOrder = (metricOrder ?? ["reps", "weight", "time", "distance", "calories"]).filter((metric) => allowedMetrics.has(metric));
  const standardMetrics = (["reps", "weight", "time", "distance", "calories"] as const).filter((metric) => allowedMetrics.has(metric));
  const singlePrimaryMetric = standardMetrics.length === 1 ? standardMetrics[0] : null;
  const usesRepRange = "repsMax" in values;
  const resolvedRepRangeLabels = repRangeLabels ?? { min: "Min", max: "Max" };
  const repFieldCount = allowedMetrics.has("reps") ? (usesRepRange ? 2 : 1) : 0;
  const visibleInlineFieldCount = repFieldCount
    + (allowedMetrics.has("weight") ? 1 : 0)
    + (allowedMetrics.has("time") ? 1 : 0)
    + (allowedMetrics.has("distance") ? 1 : 0)
    + (allowedMetrics.has("calories") ? 1 : 0)
    + (hasRpeInput ? 1 : 0)
    + (topField ? 1 : 0);
  const shareSingleMetricRowWithRpe = hasRpeInput && standardMetrics.length === 1;
  const useThreeAcrossMetrics = visibleInlineFieldCount >= 3 && !belowRpeContent;
  const useFloatingBorderLabels = labelTreatment === "floating-border";
  const useSteppedControls = showInlineStepControls && useFloatingBorderLabels;
  const useCenteredLowerLabels = false;
  const useTopRightInlineLabels = !useFloatingBorderLabels;
  const useTopAnchoredLabels = !useCenteredLowerLabels && (useTopRightInlineLabels || useFloatingBorderLabels);
  const gridColumnCount: 2 | 3 = useThreeAcrossMetrics ? 3 : 2;
  const metricFields: Array<{ id: string; node: ReactNode }> = [];
  const resolvedFloatingLabelPlacement: InlineFieldLabelPlacement = useCenteredLowerLabels
    ? "top-right"
    : useFloatingBorderLabels
      ? "floating-border"
      : useTopRightInlineLabels
        ? "top-right"
        : "side";
  const resolveInlineLabelClassName = (fallback?: string) => (
    useFloatingBorderLabels
      ? floatingBorderLabelClassName
      : useTopRightInlineLabels
        ? topRightInlineLabelClassName
        : fallback
  );
  const resolveValueLabelClassName = (fallback?: string) => (
    useFloatingBorderLabels
      ? floatingBorderLabelClassName
      : useTopRightInlineLabels
        ? topRightInlineLabelClassName
        : fallback
  );
  const resolveMetricLabel = (metric: keyof MeasurementMetrics, fallback: string) => metricLabelOverrides?.[metric] ?? resolveDefaultMeasurementMetricLabel(metric, fallback);

  function renderStepperButtons(stepper?: {
    decrementAriaLabel: string;
    incrementAriaLabel: string;
    onDecrement: () => void;
    onIncrement: () => void;
  }) {
    if (!useSteppedControls || !stepper) {
      return null;
    }

    return (
      <>
        <InlineEdgeControlButton
          side="left"
          ariaLabel={stepper.decrementAriaLabel}
          onClick={stepper.onDecrement}
          className="left-1 h-6 w-6 z-20"
          contentClassName="text-[18px] font-semibold"
        >
          -
        </InlineEdgeControlButton>
        <InlineEdgeControlButton
          side="right"
          ariaLabel={stepper.incrementAriaLabel}
          onClick={stepper.onIncrement}
          className="right-1 h-6 w-6 z-20"
          contentClassName="text-[18px] font-semibold"
        >
          +
        </InlineEdgeControlButton>
      </>
    );
  }

  function pushAuxiliaryField(field: MeasurementPanelAuxiliaryField, index: number) {
    const useInlineFieldShell = field.useInlineFieldShell ?? true;
    metricFields.push({
      id: `aux-field-${index}`,
      node: renderMetricCard({
        testId: `measurement-field-aux-${index}`,
        width: useThreeAcrossMetrics ? "compact" : "standard",
        gridColumnCount,
        children: field.inlineLabel !== undefined && useInlineFieldShell ? (
          <InlineFieldControl
            label={field.inlineLabel}
            showEmptyValue={field.showEmptyValue}
            hasValue={field.hasValue}
            labelClassName={field.labelClassName}
            valueLabelClassName={field.valueLabelClassName}
            emptyValueClassName={field.emptyValueClassName}
            labelPlacement={resolvedFloatingLabelPlacement}
          >
            {field.renderInput
              ? field.renderInput({
                inputClassName: getInputClassName({
                  tripleRow: useThreeAcrossMetrics,
                  hasValue: field.hasValue,
                  topRightLabel: useTopAnchoredLabels,
                  floatingBorder: useFloatingBorderLabels,
                  withEdgeControls: useSteppedControls && Boolean(field.stepper),
                }),
              })
              : field.input}
            {renderStepperButtons(field.stepper)}
          </InlineFieldControl>
        ) : field.inlineLabel !== undefined ? (
          <div className="flex h-full items-center justify-center">
            {field.renderInput
              ? field.renderInput({
                inputClassName: getInputClassName({
                  tripleRow: useThreeAcrossMetrics,
                  hasValue: field.hasValue,
                  topRightLabel: false,
                  floatingBorder: false,
                }),
              })
              : field.input}
          </div>
        ) : (
          <>
            <StatFieldLabel title={field.title} suffix={field.suffix} emphasis="target" />
            <div className="mt-2">{field.input}</div>
          </>
        ),
      }),
    });
  }

  if (topField) {
    const useInlineFieldShell = topField.useInlineFieldShell ?? true;
    metricFields.push({
      id: "top-field",
      node: renderMetricCard({
        testId: "measurement-field-summary",
        width: useThreeAcrossMetrics ? "compact" : "standard",
        gridColumnCount,
        children: topField.inlineLabel !== undefined && useInlineFieldShell ? (
          <InlineFieldControl
            label={topField.inlineLabel}
            showEmptyValue={topField.showEmptyValue}
            hasValue={topField.hasValue}
            labelClassName={topField.labelClassName}
            valueLabelClassName={topField.valueLabelClassName}
            emptyValueClassName={topField.emptyValueClassName}
            labelPlacement={resolvedFloatingLabelPlacement}
          >
            {topField.renderInput
              ? topField.renderInput({
                inputClassName: getInputClassName({
                  tripleRow: useThreeAcrossMetrics,
                  hasValue: topField.hasValue,
                  topRightLabel: useTopAnchoredLabels,
                  floatingBorder: useFloatingBorderLabels,
                  withEdgeControls: useSteppedControls && Boolean(topField.stepper),
                }),
              })
              : topField.input}
            {renderStepperButtons(topField.stepper)}
          </InlineFieldControl>
        ) : topField.inlineLabel !== undefined ? (
          <div className="flex h-full items-center justify-center">
            {topField.renderInput
              ? topField.renderInput({
                inputClassName: getInputClassName({
                  tripleRow: useThreeAcrossMetrics,
                  hasValue: topField.hasValue,
                  topRightLabel: false,
                  floatingBorder: false,
                }),
              })
              : topField.input}
          </div>
        ) : (
          <>
            <StatFieldLabel title={topField.title} suffix={topField.suffix} emphasis="target" />
            <div className="mt-2">{topField.input}</div>
          </>
        ),
      }),
    });
  }

  auxiliaryFields?.forEach((field, index) => pushAuxiliaryField(field, index));

  if (allowedMetrics.has("reps")) {
    if (usesRepRange) {
      const repsMinControl = (
        <InlineFieldControl
          label={resolvedRepRangeLabels.min}
          showEmptyValue={!values.reps.trim()}
          hasValue={Boolean(values.reps.trim())}
          labelClassName={resolveInlineLabelClassName(compactTopRowInlineLabelClassName)}
          valueLabelClassName={resolveValueLabelClassName(compactTopRowInlineLabelClassName)}
          emptyValueClassName={undefined}
          labelPlacement={resolvedFloatingLabelPlacement}
        >
          <input
            name={names?.reps}
            type="text"
            inputMode="text"
            value={values.reps}
            onChange={(event) => {
              onChange({ reps: sanitizeIntegerInput(event.target.value) });
            }}
            className={getInputClassName({
              tripleRow: useThreeAcrossMetrics,
              hasValue: Boolean(values.reps.trim()),
              topRightLabel: useTopAnchoredLabels,
              floatingBorder: useFloatingBorderLabels,
              withEdgeControls: useSteppedControls,
            })}
            placeholder=""
          />
          {renderStepperButtons({
            decrementAriaLabel: `Decrease ${resolvedRepRangeLabels.min.toLowerCase()}`,
            incrementAriaLabel: `Increase ${resolvedRepRangeLabels.min.toLowerCase()}`,
            onDecrement: () => onChange({ reps: decrementRepFieldValue(values.reps) }),
            onIncrement: () => onChange({ reps: String((Number.parseInt(values.reps, 10) || 0) + 1) }),
          })}
        </InlineFieldControl>
      );
      const repsMaxControl = (
        <InlineFieldControl
          label={resolvedRepRangeLabels.max}
          showEmptyValue={!(values.repsMax ?? "").trim()}
          hasValue={Boolean((values.repsMax ?? "").trim())}
          labelClassName={resolveInlineLabelClassName(compactTopRowInlineLabelClassName)}
          valueLabelClassName={resolveValueLabelClassName(compactTopRowInlineLabelClassName)}
          emptyValueClassName={undefined}
          labelPlacement={resolvedFloatingLabelPlacement}
        >
          <input
            name={names?.repsMax}
            type="text"
            inputMode="text"
            value={values.repsMax ?? ""}
            onChange={(event) => {
              onChange({ repsMax: sanitizeIntegerInput(event.target.value) });
            }}
            className={getInputClassName({
              tripleRow: useThreeAcrossMetrics,
              hasValue: Boolean((values.repsMax ?? "").trim()),
              topRightLabel: useTopAnchoredLabels,
              floatingBorder: useFloatingBorderLabels,
              withEdgeControls: useSteppedControls,
            })}
            placeholder=""
          />
          {renderStepperButtons({
            decrementAriaLabel: `Decrease ${resolvedRepRangeLabels.max.toLowerCase()}`,
            incrementAriaLabel: `Increase ${resolvedRepRangeLabels.max.toLowerCase()}`,
            onDecrement: () => onChange({ repsMax: decrementRepFieldValue(values.repsMax) }),
            onIncrement: () => onChange({ repsMax: String((Number.parseInt(values.repsMax ?? "", 10) || 0) + 1) }),
          })}
        </InlineFieldControl>
      );

      if (repRangeFooterContent) {
        metricFields.push({
          id: "reps-group",
          node: renderMetricCard({
            testId: "measurement-field-reps-group",
            width: "wide",
            gridColumnCount,
            dimmed: dimmedMetricSet.has("reps"),
            children: (
              <div className="relative pb-[3.6rem]">
                <div className="flex items-start justify-center gap-1.5">
                  <div className="w-[7.35rem] shrink-0">{repsMinControl}</div>
                  <div className="w-[7.35rem] shrink-0">{repsMaxControl}</div>
                </div>
                <div className="absolute left-1/2 top-full flex -translate-x-1/2 -translate-y-[2.9rem] justify-center">
                  {repRangeFooterContent}
                </div>
              </div>
            ),
          }),
        });
      } else {
        metricFields.push({
          id: "reps-min",
          node: renderMetricCard({
            testId: "measurement-field-reps-min",
            width: useThreeAcrossMetrics ? "compact" : "standard",
            gridColumnCount,
            dimmed: dimmedMetricSet.has("reps"),
            children: repsMinControl,
          }),
        });
        metricFields.push({
          id: "reps-max",
          node: renderMetricCard({
            testId: "measurement-field-reps-max",
            width: useThreeAcrossMetrics ? "compact" : "standard",
            gridColumnCount,
            dimmed: dimmedMetricSet.has("reps"),
            children: repsMaxControl,
          }),
        });
      }
    } else {
      metricFields.push({ id: "reps", node: renderMetricCard({
              testId: "measurement-field-reps",
              width: shareSingleMetricRowWithRpe
                ? "standard"
                : singlePrimaryMetric === "reps"
                  ? "wide"
                  : (useThreeAcrossMetrics ? "compact" : "standard"),
              gridColumnCount,
              dimmed: dimmedMetricSet.has("reps"),
              children: (
                <InlineFieldControl
                  label={METRICS[0].title}
                  showEmptyValue={!values.reps.trim()}
                  hasValue={Boolean(values.reps.trim())}
                  labelClassName={resolveInlineLabelClassName(useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined)}
                  valueLabelClassName={resolveValueLabelClassName()}
                  emptyValueClassName={undefined}
                  labelPlacement={resolvedFloatingLabelPlacement}
                >
                  <input
                    name={names?.reps}
                    type="text"
                    inputMode="text"
                    value={values.reps}
                    onChange={(event) => {
                      onChange({ reps: sanitizeIntegerInput(event.target.value) });
                    }}
                    className={getInputClassName({
                      tripleRow: useThreeAcrossMetrics,
                      hasValue: Boolean(values.reps.trim()),
                      topRightLabel: useTopAnchoredLabels,
                      floatingBorder: useFloatingBorderLabels,
                      withEdgeControls: useSteppedControls,
                    })}
                    placeholder=""
                  />
                  {renderStepperButtons({
                    decrementAriaLabel: "Decrease reps",
                    incrementAriaLabel: "Increase reps",
                    onDecrement: () => onChange({ reps: decrementRepFieldValue(values.reps) }),
                    onIncrement: () => onChange({ reps: String((Number.parseInt(values.reps, 10) || 0) + 1) }),
                  })}
                </InlineFieldControl>
              ),
            })});
    }
  }

  if (allowedMetrics.has("weight")) {
    metricFields.push({ id: "weight", node: renderMetricCard({
            testId: "measurement-field-weight",
            width: useThreeAcrossMetrics ? "compact" : resolveMetricWidth({ metric: "weight", singlePrimaryMetric, hasRpeInput, shareRowWithRpe: shareSingleMetricRowWithRpe }),
            gridColumnCount,
            dimmed: dimmedMetricSet.has("weight"),
            children: (
              <>
                <InlineFieldControl
                  label={values.weightUnit}
                  showEmptyValue={!values.weight.trim()}
                  hasValue={Boolean(values.weight.trim())}
                  labelClassName={resolveInlineLabelClassName(useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined)}
                  valueLabelClassName={resolveValueLabelClassName()}
                  emptyValueClassName={undefined}
                  labelPlacement={resolvedFloatingLabelPlacement}
                >
                  <input
                    name={names?.weight}
                    type="text"
                    inputMode="text"
                    value={values.weight}
                    onChange={(event) => {
                      onChange({ weight: sanitizeDecimalInput(event.target.value) });
                    }}
                    className={getInputClassName({
                      tripleRow: useThreeAcrossMetrics,
                      hasValue: Boolean(values.weight.trim()),
                      topRightLabel: useTopAnchoredLabels,
                      floatingBorder: useFloatingBorderLabels,
                      withEdgeControls: useSteppedControls,
                    })}
                    placeholder=""
                  />
                  {renderStepperButtons({
                    decrementAriaLabel: "Decrease weight",
                    incrementAriaLabel: "Increase weight",
                    onDecrement: () => onChange({ weight: formatDecimalStepValue(Math.max(0, (Number.parseFloat(values.weight) || 0) - 1), 2) }),
                    onIncrement: () => onChange({ weight: formatDecimalStepValue((Number.parseFloat(values.weight) || 0) + 1, 2) }),
                  })}
                </InlineFieldControl>
                {names?.weightUnit ? <input type="hidden" name={names.weightUnit} value={values.weightUnit} /> : null}
              </>
            ),
          })});
  }

  if (allowedMetrics.has("time")) {
    metricFields.push({ id: "time", node: renderMetricCard({
            testId: "measurement-field-time",
            width: resolveMetricWidth({ metric: "time", singlePrimaryMetric, hasRpeInput, shareRowWithRpe: shareSingleMetricRowWithRpe }),
            gridColumnCount,
            dimmed: dimmedMetricSet.has("time"),
            children: (
              <>
                <InlineFieldControl
                  label={resolveMetricLabel("time", "s")}
                  showEmptyValue={!values.duration.trim()}
                  hasValue={Boolean(values.duration.trim())}
                  labelClassName={resolveInlineLabelClassName(useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined)}
                  valueLabelClassName={resolveValueLabelClassName()}
                  emptyValueClassName={undefined}
                  labelPlacement={resolvedFloatingLabelPlacement}
                >
                  <input
                    name={names?.duration}
                    type="text"
                    inputMode="text"
                    value={values.duration}
                    onChange={(event) => {
                      onChange({ duration: sanitizeDurationTextInput(event.target.value) });
                    }}
                    className={getInputClassName({
                      tripleRow: useThreeAcrossMetrics,
                      hasValue: Boolean(values.duration.trim()),
                      topRightLabel: useTopAnchoredLabels,
                      floatingBorder: useFloatingBorderLabels,
                      withEdgeControls: useSteppedControls,
                    })}
                    placeholder=""
                  />
                  {renderStepperButtons({
                    decrementAriaLabel: "Decrease time",
                    incrementAriaLabel: "Increase time",
                    onDecrement: () => onChange({ duration: formatDurationSecondsForSteppedValue(Math.max(0, parseDurationSecondsForSteppedValue(values.duration) - 15)) }),
                    onIncrement: () => onChange({ duration: formatDurationSecondsForSteppedValue(parseDurationSecondsForSteppedValue(values.duration) + 15) }),
                  })}
                </InlineFieldControl>
              </>
            ),
          })});
  }

  if (allowedMetrics.has("distance")) {
    metricFields.push({ id: "distance", node: renderMetricCard({
            testId: "measurement-field-distance",
            width: resolveMetricWidth({ metric: "distance", singlePrimaryMetric, hasRpeInput, shareRowWithRpe: shareSingleMetricRowWithRpe }),
            gridColumnCount,
            dimmed: dimmedMetricSet.has("distance"),
            children: (
              <>
                <InlineFieldControl
                  label={resolveMetricLabel("distance", resolvedDistanceUnit)}
                  showEmptyValue={!values.distance.trim()}
                  hasValue={Boolean(values.distance.trim())}
                  labelClassName={resolveInlineLabelClassName(useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined)}
                  valueLabelClassName={resolveValueLabelClassName()}
                  emptyValueClassName={undefined}
                  labelPlacement={resolvedFloatingLabelPlacement}
                >
                  <input
                    name={names?.distance}
                    type="text"
                    inputMode="text"
                    value={values.distance}
                    onChange={(event) => {
                      onChange({ distance: sanitizeDecimalInput(event.target.value) });
                    }}
                    className={getInputClassName({
                      tripleRow: useThreeAcrossMetrics,
                      hasValue: Boolean(values.distance.trim()),
                      topRightLabel: useTopAnchoredLabels,
                      floatingBorder: useFloatingBorderLabels,
                      withEdgeControls: useSteppedControls,
                    })}
                    placeholder=""
                  />
                  {renderStepperButtons({
                    decrementAriaLabel: "Decrease distance",
                    incrementAriaLabel: "Increase distance",
                    onDecrement: () => onChange({ distance: formatDecimalStepValue(Math.max(0, (Number.parseFloat(values.distance) || 0) - 1), 2) }),
                    onIncrement: () => onChange({ distance: formatDecimalStepValue((Number.parseFloat(values.distance) || 0) + 1, 2) }),
                  })}
                </InlineFieldControl>
                {names?.distanceUnit ? <input type="hidden" name={names.distanceUnit} value={resolvedDistanceUnit} /> : null}
              </>
            ),
          })});
  }

  if (allowedMetrics.has("calories")) {
    metricFields.push({ id: "calories", node: renderMetricCard({
            testId: "measurement-field-calories",
            width: resolveMetricWidth({ metric: "calories", singlePrimaryMetric, hasRpeInput, shareRowWithRpe: shareSingleMetricRowWithRpe }),
            gridColumnCount,
            dimmed: dimmedMetricSet.has("calories"),
            children: (
              <>
                <InlineFieldControl
                  label="cal"
                  showEmptyValue={!values.calories.trim()}
                  hasValue={Boolean(values.calories.trim())}
                  labelClassName={resolveInlineLabelClassName(useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined)}
                  valueLabelClassName={resolveValueLabelClassName()}
                  emptyValueClassName={undefined}
                  labelPlacement={resolvedFloatingLabelPlacement}
                >
                  <input
                    name={names?.calories}
                    type="text"
                    inputMode="text"
                    value={values.calories}
                    onChange={(event) => {
                      onChange({ calories: sanitizeIntegerInput(event.target.value) });
                    }}
                    className={getInputClassName({
                      tripleRow: useThreeAcrossMetrics,
                      hasValue: Boolean(values.calories.trim()),
                      topRightLabel: useTopAnchoredLabels,
                      floatingBorder: useFloatingBorderLabels,
                      withEdgeControls: useSteppedControls,
                      extraClassName: useThreeAcrossMetrics ? undefined : "pr-16",
                    })}
                    placeholder=""
                  />
                  {renderStepperButtons({
                    decrementAriaLabel: "Decrease calories",
                    incrementAriaLabel: "Increase calories",
                    onDecrement: () => onChange({ calories: String(Math.max(0, (Number.parseInt(values.calories, 10) || 0) - 1)) }),
                    onIncrement: () => onChange({ calories: String((Number.parseInt(values.calories, 10) || 0) + 1) }),
                  })}
                </InlineFieldControl>
              </>
            ),
          })});
  }

  if (hasRpeInput) {
    metricFields.push({ id: "rpe", node: renderMetricCard({
            testId: "measurement-field-rpe",
            width: "standard",
            gridColumnCount,
            children: (
              <>
                <InlineFieldControl
                  label="EFFORT / 10"
                  showEmptyValue={!(rpe ?? "").trim()}
                  hasValue={Boolean((rpe ?? "").trim())}
                  labelClassName={resolveInlineLabelClassName(useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined)}
                  emptyValueClassName={undefined}
                  valueLabelClassName={resolveValueLabelClassName("bottom-3 right-3 text-[9px] tracking-[0.06em]")}
                  labelPlacement={resolvedFloatingLabelPlacement}
                >
                  <input
                    type="text"
                    inputMode="text"
                    value={rpe ?? ""}
                    onChange={(event) => onRpeChange(sanitizeDecimalInput(event.target.value))}
                    className={getInputClassName({
                      tripleRow: useThreeAcrossMetrics,
                      hasValue: Boolean((rpe ?? "").trim()),
                      topRightLabel: useTopAnchoredLabels,
                      floatingBorder: useFloatingBorderLabels,
                      withEdgeControls: useSteppedControls,
                      extraClassName: useThreeAcrossMetrics ? undefined : "pl-18 pr-12 [text-indent:0.45rem]",
                    })}
                    placeholder=""
                  />
                  {renderStepperButtons({
                    decrementAriaLabel: "Decrease effort",
                    incrementAriaLabel: "Increase effort",
                    onDecrement: () => {
                      const currentValue = Number.parseFloat(rpe ?? "");
                      const nextValue = Math.max(0, (Number.isFinite(currentValue) ? currentValue : 0) - 1);
                      onRpeChange(String(nextValue));
                    },
                    onIncrement: () => {
                      const currentValue = Number.parseFloat(rpe ?? "");
                      const nextValue = Math.min(10, (Number.isFinite(currentValue) ? currentValue : 0) + 1);
                      onRpeChange(String(nextValue));
                    },
                  })}
                </InlineFieldControl>
              </>
            ),
          })});
  }

  if (!allowedMetrics.has("reps") && repReplacementContent) {
    metricFields.push({
      id: "reps-replacement",
      node: renderMetricCard({
        testId: "measurement-field-reps-replacement",
        width: "standard",
        gridColumnCount,
        children: (
          <div className={GLOW_SWITCH_MEASUREMENT_ROW_WRAPPER_CLASS_NAME}>
            {repReplacementContent}
          </div>
        ),
      }),
    });
  }

  const metricSortOrder = new Map<string, number>();
  metricSortOrder.set("top-field", -10);
  metricSortOrder.set("reps-replacement", -15);
  resolvedMetricOrder.forEach((metric, index) => {
    const baseOrder = index * 10;
    if (metric === "reps") {
      metricSortOrder.set("reps", baseOrder);
      metricSortOrder.set("reps-min", baseOrder);
      metricSortOrder.set("reps-max", baseOrder + 1);
      metricSortOrder.set("reps-group", baseOrder);
      return;
    }

    metricSortOrder.set(metric, baseOrder);
  });
  const repsOrder = metricSortOrder.get("reps-min") ?? metricSortOrder.get("reps") ?? 0;
  auxiliaryFields?.forEach((_, index) => {
    metricSortOrder.set(`aux-field-${index}`, -20 + (index * 0.01));
  });
  metricSortOrder.set("rpe", -30);

  const orderedMetricFields = [...metricFields].sort(
    (left, right) => (metricSortOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (metricSortOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );

  const metricRows = useThreeAcrossMetrics ? chunkFields(orderedMetricFields, 3) : [orderedMetricFields];
  const useHorizontalScrollLayout = layoutMode === "horizontal-scroll" && orderedMetricFields.length > 0;
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (useHorizontalScrollLayout) {
      return;
    }

    horizontalRailPointerStateRef.current = null;
    horizontalRailTouchStateRef.current = null;
    suppressHorizontalRailClickRef.current = false;
  }, [useHorizontalScrollLayout]);

  useEffect(() => {
    const rail = horizontalRailRef.current;
    if (!useHorizontalScrollLayout || !rail) {
      return;
    }

    const findTrackedTouch = (touchList: TouchList, identifier: number) => {
      for (let index = 0; index < touchList.length; index += 1) {
        const touch = touchList.item(index);
        if (touch && touch.identifier === identifier) {
          return touch;
        }
      }
      return null;
    };

    const clearTrackedTouch = () => {
      horizontalRailTouchStateRef.current = null;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 0 || rail.scrollWidth <= rail.clientWidth) {
        return;
      }

      const touch = event.touches.item(0);
      if (!touch) {
        return;
      }

      horizontalRailTouchStateRef.current = {
        identifier: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        startScrollLeft: rail.scrollLeft,
        intent: "pending",
      };
      suppressHorizontalRailClickRef.current = false;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touchState = horizontalRailTouchStateRef.current;
      if (!touchState) {
        return;
      }

      const touch = findTrackedTouch(event.touches, touchState.identifier);
      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - touchState.startX;
      const deltaY = touch.clientY - touchState.startY;

      if (touchState.intent === "pending") {
        if (Math.abs(deltaY) > horizontalRailTouchIntentThreshold && Math.abs(deltaY) > Math.abs(deltaX)) {
          touchState.intent = "vertical";
          return;
        }

        const horizontalIntentEstablished = Math.abs(deltaX) > horizontalRailTouchIntentThreshold
          && Math.abs(deltaX) > Math.abs(deltaY) * horizontalRailTouchIntentRatio;

        if (!horizontalIntentEstablished) {
          return;
        }

        touchState.intent = "horizontal";
        suppressHorizontalRailClickRef.current = true;
      }

      if (touchState.intent !== "horizontal") {
        return;
      }

      event.preventDefault();
      rail.scrollLeft = touchState.startScrollLeft - deltaX;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const touchState = horizontalRailTouchStateRef.current;
      if (!touchState) {
        return;
      }

      const releasedTouch = findTrackedTouch(event.changedTouches, touchState.identifier);
      if (!releasedTouch) {
        return;
      }

      if (touchState.intent === "horizontal") {
        window.setTimeout(() => {
          suppressHorizontalRailClickRef.current = false;
        }, 0);
      } else {
        suppressHorizontalRailClickRef.current = false;
      }

      clearTrackedTouch();
    };

    const handleTouchCancel = () => {
      clearTrackedTouch();
      suppressHorizontalRailClickRef.current = false;
    };

    rail.addEventListener("touchstart", handleTouchStart, { passive: true });
    rail.addEventListener("touchmove", handleTouchMove, { passive: false });
    rail.addEventListener("touchend", handleTouchEnd, { passive: true });
    rail.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      rail.removeEventListener("touchstart", handleTouchStart);
      rail.removeEventListener("touchmove", handleTouchMove);
      rail.removeEventListener("touchend", handleTouchEnd);
      rail.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [useHorizontalScrollLayout]);

  function getHorizontalFieldWidthClassName(fieldId: string) {
    if (fieldId === "top-field") return "w-[7.35rem]";
    if (fieldId === "aux-field-0") return "w-[7.35rem]";
    if (fieldId.startsWith("aux-field-")) return "w-[7.35rem]";
    if (fieldId === "reps-min" || fieldId === "reps-max") return "w-[7.35rem]";
    if (fieldId === "reps-group") return "w-[15.3rem]";
    if (fieldId === "reps-replacement") return "w-[10.35rem]";
    if (fieldId === "reps") return "w-[6.85rem]";
    if (fieldId === "weight") return "w-[7.2rem]";
    if (fieldId === "time") return "w-[7.15rem]";
    if (fieldId === "distance") return "w-[7.15rem]";
    if (fieldId === "calories") return "w-[7.15rem]";
    if (fieldId === "rpe") return "w-[7.6rem]";
    return "w-[6.9rem]";
  }

  function getHorizontalFieldWidthStyle(fieldId: string) {
    if (!hasHydrated) {
      return undefined;
    }

    const getBaseWidthRem = () => {
      if (fieldId === "top-field") return 7.35;
      if (fieldId === "aux-field-0") return 7.35;
      if (fieldId.startsWith("aux-field-")) return 7.35;
      if (fieldId === "reps-min" || fieldId === "reps-max") return 7.35;
      if (fieldId === "reps-group") return 15.3;
      if (fieldId === "reps-replacement") return 10.35;
      if (fieldId === "reps") return 6.85;
      if (fieldId === "weight") return 7.2;
      if (fieldId === "time") return 7.15;
      if (fieldId === "distance") return 7.15;
      if (fieldId === "calories") return 7.15;
      if (fieldId === "rpe") return 7.6;
      return 6.9;
    };

    const resolveValueLength = () => {
      if (fieldId === "reps-min") return values.reps.trim().length;
      if (fieldId === "reps-max") return (values.repsMax ?? "").trim().length;
      if (fieldId === "reps") return values.reps.trim().length;
      if (fieldId === "weight") return values.weight.trim().length;
      if (fieldId === "time") return values.duration.trim().length;
      if (fieldId === "distance") return values.distance.trim().length;
      if (fieldId === "calories") return values.calories.trim().length;
      if (fieldId === "rpe") return (rpe ?? "").trim().length;
      return 0;
    };

    const valueLength = resolveValueLength();
    if (valueLength <= 1) {
      return undefined;
    }

    const extraCharacters = Math.max(0, valueLength - 2);
    if (extraCharacters === 0) {
      return undefined;
    }

    const boundedExtraWidthRem = Math.min(extraCharacters, 4) * 0.38;
    const resolvedWidthRem = getBaseWidthRem() + boundedExtraWidthRem;

    return {
      width: `${resolvedWidthRem}rem`,
      minWidth: `${resolvedWidthRem}rem`,
      maxWidth: `${resolvedWidthRem}rem`,
    };
  }

  function releaseHorizontalRailPointerCapture(target: HTMLDivElement, pointerId: number) {
    try {
      if (target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    } catch {
      // Pointer capture is best-effort and can fail on some mobile browsers.
    }
  }

  function handleHorizontalRailPointerDownCapture(event: ReactPointerEvent<HTMLDivElement>) {
    if (!useHorizontalScrollLayout || event.pointerType === "mouse" || !event.isPrimary) {
      return;
    }

    const rail = horizontalRailRef.current;
    if (!rail || rail.scrollWidth <= rail.clientWidth) {
      return;
    }

    horizontalRailPointerStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: rail.scrollLeft,
      intent: "pending",
    };
    suppressHorizontalRailClickRef.current = false;
  }

  function handleHorizontalRailPointerMoveCapture(event: ReactPointerEvent<HTMLDivElement>) {
    const pointerState = horizontalRailPointerStateRef.current;
    if (!pointerState || pointerState.pointerId !== event.pointerId || event.pointerType === "mouse") {
      return;
    }

    const rail = horizontalRailRef.current;
    if (!rail) {
      return;
    }

    const deltaX = event.clientX - pointerState.startX;
    const deltaY = event.clientY - pointerState.startY;

    if (pointerState.intent === "pending") {
      if (Math.abs(deltaY) > horizontalRailTouchIntentThreshold && Math.abs(deltaY) > Math.abs(deltaX)) {
        pointerState.intent = "vertical";
        return;
      }

      const horizontalIntentEstablished = Math.abs(deltaX) > horizontalRailTouchIntentThreshold
        && Math.abs(deltaX) > Math.abs(deltaY) * horizontalRailTouchIntentRatio;

      if (!horizontalIntentEstablished) {
        return;
      }

      pointerState.intent = "horizontal";
      suppressHorizontalRailClickRef.current = true;

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Some mobile browsers do not permit capture for delegated pointer events.
      }
    }

    if (pointerState.intent !== "horizontal") {
      return;
    }

    event.preventDefault();
    rail.scrollLeft = pointerState.startScrollLeft - deltaX;
  }

  function handleHorizontalRailPointerUpCapture(event: ReactPointerEvent<HTMLDivElement>) {
    const pointerState = horizontalRailPointerStateRef.current;
    if (!pointerState || pointerState.pointerId !== event.pointerId || event.pointerType === "mouse") {
      return;
    }

    if (pointerState.intent === "horizontal") {
      event.preventDefault();
      window.setTimeout(() => {
        suppressHorizontalRailClickRef.current = false;
      }, 0);
    } else {
      suppressHorizontalRailClickRef.current = false;
    }

    releaseHorizontalRailPointerCapture(event.currentTarget, event.pointerId);
    horizontalRailPointerStateRef.current = null;
  }

  function handleHorizontalRailPointerCancelCapture(event: ReactPointerEvent<HTMLDivElement>) {
    releaseHorizontalRailPointerCapture(event.currentTarget, event.pointerId);
    horizontalRailPointerStateRef.current = null;
    suppressHorizontalRailClickRef.current = false;
  }

  function handleHorizontalRailClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!suppressHorizontalRailClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressHorizontalRailClickRef.current = false;
  }

  const horizontalAuxiliaryFields = useHorizontalScrollLayout
    ? orderedMetricFields.filter((field) => field.id.startsWith("aux-field-"))
    : [];
  const horizontalMetricFields = useHorizontalScrollLayout
    ? orderedMetricFields.filter((field) => !field.id.startsWith("aux-field-"))
    : orderedMetricFields;

  return (
    <section className={cn(appTokens.measurementPanelStack, "max-w-full overflow-x-hidden", useHorizontalScrollLayout ? "space-y-0.5" : undefined, className)} data-field-label-style={contract.fieldLabelStyle} data-testid="measurement-panel">
      {showHeader ? <div className={appTokens.measurementPanelGrid}>{description ? <p className={appTokens.measurementHeaderMeta}>{description}</p> : null}</div> : null}

      {leadingContent}

      <div className={shellClassName}>
        {showInnerHeader ? (
          <div className="mb-1.5 flex items-center justify-end gap-2">
            <p className={appTokens.measurementHeaderMeta}>{enabledCount}/{hasRpeInput ? "6" : "5"} active</p>
          </div>
        ) : null}

        <div className={appTokens.measurementPanelGrid} data-testid="measurement-grid">
          {belowRpeContent ? renderMetricCard({
            testId: "measurement-field-secondary",
            width: belowRpeField?.width ?? "wide",
            gridColumnCount,
            children: (
              <div className="relative flex justify-center py-2">
                <div className={getBelowRpeContentWidthClassName(belowRpeField?.width)}>{belowRpeContent}</div>
                {belowRpeField?.title ? <InlineFieldLabel label={belowRpeField.title} /> : null}
              </div>
            ),
          }) : null}

          {useHorizontalScrollLayout ? (
            <>
              {horizontalAuxiliaryFields.length > 0 ? (
                <div
                  className={cn(
                    "grid items-center gap-[3px] px-1 pb-1 pt-1",
                    horizontalAuxiliaryFields.length === 1
                      ? "grid-cols-1"
                      : horizontalAuxiliaryFields.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-3",
                  )}
                >
                  {horizontalAuxiliaryFields.map((field) => (
                    <div key={field.id} className="min-w-0">
                      {field.node}
                    </div>
                  ))}
                </div>
              ) : null}
              <HorizontalScrollHint
                className="-mx-1 relative overflow-visible"
                scrollRef={horizontalRailRef}
                scrollClassName="overflow-y-hidden overscroll-x-contain px-1 pb-1 pt-1 [touch-action:pan-x_pan-y] [overscroll-behavior-y:auto]"
                contentClassName="mx-auto flex w-max min-w-max flex-nowrap items-center justify-start gap-[3px]"
                scrollProps={{
                  "data-measurement-horizontal-rail": "true",
                  onPointerDownCapture: handleHorizontalRailPointerDownCapture,
                  onPointerMoveCapture: handleHorizontalRailPointerMoveCapture,
                  onPointerUpCapture: handleHorizontalRailPointerUpCapture,
                  onPointerCancelCapture: handleHorizontalRailPointerCancelCapture,
                  onClickCapture: handleHorizontalRailClickCapture,
                }}
              >
                  {horizontalRowPrefix ? (
                    <div className="shrink-0">
                      {horizontalRowPrefix}
                    </div>
                  ) : null}
                  {horizontalMetricFields.map((field) => (
                    <div
                      key={field.id}
                      className={cn("shrink-0", getHorizontalFieldWidthClassName(field.id))}
                      style={getHorizontalFieldWidthStyle(field.id)}
                    >
                      {field.node}
                    </div>
                  ))}
              </HorizontalScrollHint>
            </>
          ) : metricRows.map((row, rowIndex) => {
            if (row.length === 1) {
              return (
                <div key={`measurement-row-${rowIndex}`} className="flex justify-center">
                  <div className={getMetricRowLaneClassName(row.length, gridColumnCount)}>
                    {row[0]?.node}
                  </div>
                </div>
              );
            }

            const rowClassName = row.length === 3
              ? "grid grid-cols-3 gap-x-2.5 gap-y-2"
              : "grid grid-cols-2 gap-x-2.5 gap-y-2";

            return (
              <div key={`measurement-row-${rowIndex}`} className="flex justify-center">
                <div className={getMetricRowLaneClassName(row.length, gridColumnCount)}>
                  <div className={rowClassName}>
                    {row.map((field) => (
                      <div key={field.id} className="min-w-0">
                        {field.node}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {betweenInputsAndFooterContent ? (
          <div className="mt-1">
            {betweenInputsAndFooterContent}
          </div>
        ) : null}

        {footerContent ? <div className={cn("-mt-9", footerClassName)}>{footerContent}</div> : null}
      </div>

      {trailingContent ? <div>{trailingContent}</div> : null}
    </section>
  );
}

