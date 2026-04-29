"use client";

import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { labeledEditorFieldFloatingLabelClassName } from "@/components/ui/LabeledEditorField";
import { cn } from "@/lib/cn";
import type { MeasurementMetrics, MeasurementValues } from "@/components/ui/measurements/ModifyMeasurements";
import { resolveScreenContract } from "@/components/ui/app/screenContract";
import { StatFieldLabel } from "@/components/ui/measurements/StatFieldLabel";

const METRICS: Array<{
  key: keyof MeasurementMetrics;
  title: string;
  suffix: (values: MeasurementValues) => string;
}> = [
  { key: "reps", title: "REPS", suffix: () => "range" },
  { key: "weight", title: "WEIGHT", suffix: (values) => values.weightUnit },
  { key: "time", title: "TIME", suffix: () => "mm:ss" },
  { key: "distance", title: "DISTANCE", suffix: (values) => (values.distanceUnit === "km" || values.distanceUnit === "m" ? values.distanceUnit : "mi") },
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
  "top-[1px] -translate-y-[40%] bg-transparent px-0 py-px leading-[1.24] antialiased [text-shadow:0_0_1px_rgb(var(--surface-2-rgb)/0.98),0_-0.5px_0_rgb(var(--surface-2-rgb)/0.98)]",
);
const topRightInlineLabelBaseClassName = "pointer-events-none absolute whitespace-nowrap text-right text-[8px] font-semibold uppercase leading-[1.02] tracking-[0.06em] text-[rgb(var(--accent)/0.92)]";

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

type FieldWidth = "compact" | "standard" | "wide";

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

function renderMetricCard({
  testId,
  width,
  gridColumnCount,
  children,
}: {
  testId: string;
  width: FieldWidth;
  gridColumnCount: 2 | 3;
  children: ReactNode;
}) {
  return (
    <div
        className={cn(
          metricCardClassName,
          "min-h-0 min-w-0 overflow-visible border-transparent bg-transparent px-0 py-0 shadow-none",
          getFieldSpanClassName(width, gridColumnCount),
          getFieldChromeClassName(width),
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
  return (
    <div className="relative min-w-0">
      {children}
      {showEmptyValue ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-start pl-3.5 pr-14 text-left text-[15px] font-semibold tabular-nums text-[rgb(var(--text-muted)/0.72)]",
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
  extraClassName,
}: {
  tripleRow?: boolean;
  hasValue?: boolean;
  topRightLabel?: boolean;
  extraClassName?: string;
}) {
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
  footerContent,
  showInnerHeader = false,
  topField,
  repRangeLabels,
  visibleMetrics,
  metricOrder,
  layoutMode = "grid",
  labelTreatment = "inline",
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
  footerContent?: ReactNode;
  showInnerHeader?: boolean;
  topField?: {
    title: string;
    suffix?: string;
    input: ReactNode;
    inlineLabel?: string;
    showEmptyValue?: boolean;
    hasValue?: boolean;
    labelClassName?: string;
    valueLabelClassName?: string;
    emptyValueClassName?: string;
    renderInput?: (options: { inputClassName: string }) => ReactNode;
  };
  repRangeLabels?: {
    min: string;
    max: string;
  };
  visibleMetrics?: Array<keyof MeasurementMetrics>;
  metricOrder?: Array<keyof MeasurementMetrics>;
  layoutMode?: "grid" | "horizontal-scroll";
  labelTreatment?: "inline" | "floating-border";
}) {
  const enabledCount = Object.values(activeMetrics).filter(Boolean).length;
  const resolvedDistanceUnit = values.distanceUnit === "km" || values.distanceUnit === "m" ? values.distanceUnit : "mi";

  const hasRpeInput = typeof onRpeChange === "function";
  const contract = resolveScreenContract("exerciseLog");
  const allowedMetrics = new Set<keyof MeasurementMetrics>(visibleMetrics ?? ["reps", "weight", "time", "distance", "calories"]);
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
  const useTopRightInlineLabels = !useFloatingBorderLabels;
  const useTopAnchoredLabels = useTopRightInlineLabels || useFloatingBorderLabels;
  const gridColumnCount: 2 | 3 = useThreeAcrossMetrics ? 3 : 2;
  const metricFields: Array<{ id: string; node: ReactNode }> = [];

  if (topField) {
    metricFields.push({
      id: "top-field",
      node: renderMetricCard({
        testId: "measurement-field-summary",
        width: useThreeAcrossMetrics ? "compact" : "standard",
        gridColumnCount,
        children: topField.inlineLabel ? (
          <InlineFieldControl
            label={topField.inlineLabel}
            showEmptyValue={topField.showEmptyValue}
            hasValue={topField.hasValue}
            labelClassName={topField.labelClassName}
            valueLabelClassName={topField.valueLabelClassName}
            emptyValueClassName={topField.emptyValueClassName}
            labelPlacement={useFloatingBorderLabels ? "floating-border" : useTopRightInlineLabels ? "top-right" : "side"}
          >
            {topField.renderInput
              ? topField.renderInput({
                inputClassName: getInputClassName({
                  tripleRow: useThreeAcrossMetrics,
                  hasValue: topField.hasValue,
                  topRightLabel: useTopAnchoredLabels,
                }),
              })
              : topField.input}
          </InlineFieldControl>
        ) : (
          <>
            <StatFieldLabel title={topField.title} suffix={topField.suffix} emphasis="target" />
            <div className="mt-2">{topField.input}</div>
          </>
        ),
      }),
    });
  }

  if (allowedMetrics.has("reps")) {
    if (usesRepRange) {
      metricFields.push({
        id: "reps-min",
        node: renderMetricCard({
          testId: "measurement-field-reps-min",
          width: useThreeAcrossMetrics ? "compact" : "standard",
          gridColumnCount,
          children: (
            <InlineFieldControl
              label={resolvedRepRangeLabels.min}
              showEmptyValue={false}
              hasValue={Boolean(values.reps.trim())}
              labelClassName={useFloatingBorderLabels ? floatingBorderLabelClassName : (useTopRightInlineLabels ? topRightInlineLabelClassName : compactTopRowInlineLabelClassName)}
              valueLabelClassName={useFloatingBorderLabels ? floatingBorderLabelClassName : (useTopRightInlineLabels ? topRightInlineLabelClassName : compactTopRowInlineLabelClassName)}
              emptyValueClassName={useThreeAcrossMetrics ? "pr-7" : undefined}
              labelPlacement={useFloatingBorderLabels ? "floating-border" : useTopRightInlineLabels ? "top-right" : "side"}
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
                })}
                placeholder=""
              />
            </InlineFieldControl>
          ),
        }),
      });
      metricFields.push({
        id: "reps-max",
        node: renderMetricCard({
          testId: "measurement-field-reps-max",
          width: useThreeAcrossMetrics ? "compact" : "standard",
          gridColumnCount,
          children: (
            <InlineFieldControl
              label={resolvedRepRangeLabels.max}
              showEmptyValue={false}
              hasValue={Boolean((values.repsMax ?? "").trim())}
              labelClassName={useFloatingBorderLabels ? floatingBorderLabelClassName : (useTopRightInlineLabels ? topRightInlineLabelClassName : compactTopRowInlineLabelClassName)}
              valueLabelClassName={useFloatingBorderLabels ? floatingBorderLabelClassName : (useTopRightInlineLabels ? topRightInlineLabelClassName : compactTopRowInlineLabelClassName)}
              emptyValueClassName={useThreeAcrossMetrics ? "pr-7" : undefined}
              labelPlacement={useFloatingBorderLabels ? "floating-border" : useTopRightInlineLabels ? "top-right" : "side"}
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
                })}
                placeholder=""
              />
            </InlineFieldControl>
          ),
        }),
      });
    } else {
      metricFields.push({ id: "reps", node: renderMetricCard({
              testId: "measurement-field-reps",
              width: shareSingleMetricRowWithRpe
                ? "standard"
                : singlePrimaryMetric === "reps"
                  ? "wide"
                  : (useThreeAcrossMetrics ? "compact" : "standard"),
              gridColumnCount,
              children: (
                <InlineFieldControl
                  label={METRICS[0].title}
                  showEmptyValue={!values.reps.trim()}
                  hasValue={Boolean(values.reps.trim())}
                  labelClassName={useFloatingBorderLabels
                    ? floatingBorderLabelClassName
                    : useTopRightInlineLabels
                    ? topRightInlineLabelClassName
                    : (useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined)}
                  valueLabelClassName={useFloatingBorderLabels ? floatingBorderLabelClassName : (useTopRightInlineLabels ? topRightInlineLabelClassName : undefined)}
                  emptyValueClassName={useThreeAcrossMetrics ? "pr-7" : undefined}
                  labelPlacement={useFloatingBorderLabels ? "floating-border" : useTopRightInlineLabels ? "top-right" : "side"}
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
                    })}
                    placeholder=""
                  />
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
            children: (
              <>
                <InlineFieldControl
                  label={values.weightUnit}
                  showEmptyValue={!values.weight.trim()}
                  hasValue={Boolean(values.weight.trim())}
                  labelClassName={useFloatingBorderLabels
                    ? floatingBorderLabelClassName
                    : useTopRightInlineLabels
                    ? topRightInlineLabelClassName
                    : (useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined)}
                  valueLabelClassName={useFloatingBorderLabels ? floatingBorderLabelClassName : (useTopRightInlineLabels ? topRightInlineLabelClassName : undefined)}
                  emptyValueClassName={useThreeAcrossMetrics ? "pr-7" : undefined}
                  labelPlacement={useFloatingBorderLabels ? "floating-border" : useTopRightInlineLabels ? "top-right" : "side"}
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
                    })}
                    placeholder=""
                  />
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
            children: (
              <>
                <InlineFieldControl
                  label="s"
                  showEmptyValue={!values.duration.trim()}
                  hasValue={Boolean(values.duration.trim())}
                  labelClassName={useFloatingBorderLabels
                    ? floatingBorderLabelClassName
                    : useTopRightInlineLabels
                    ? topRightInlineLabelClassName
                    : (useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined)}
                  valueLabelClassName={useFloatingBorderLabels ? floatingBorderLabelClassName : (useTopRightInlineLabels ? topRightInlineLabelClassName : undefined)}
                  emptyValueClassName={useThreeAcrossMetrics ? "pr-7" : undefined}
                  labelPlacement={useFloatingBorderLabels ? "floating-border" : useTopRightInlineLabels ? "top-right" : "side"}
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
                    })}
                    placeholder=""
                  />
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
            children: (
              <>
                <InlineFieldControl
                  label={resolvedDistanceUnit}
                  showEmptyValue={!values.distance.trim()}
                  hasValue={Boolean(values.distance.trim())}
                  labelClassName={useFloatingBorderLabels
                    ? floatingBorderLabelClassName
                    : useTopRightInlineLabels
                    ? topRightInlineLabelClassName
                    : (useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined)}
                  valueLabelClassName={useFloatingBorderLabels ? floatingBorderLabelClassName : (useTopRightInlineLabels ? topRightInlineLabelClassName : undefined)}
                  emptyValueClassName={useThreeAcrossMetrics ? "pr-7" : undefined}
                  labelPlacement={useFloatingBorderLabels ? "floating-border" : useTopRightInlineLabels ? "top-right" : "side"}
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
                    })}
                    placeholder=""
                  />
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
            children: (
              <>
                <InlineFieldControl
                  label="cal"
                  showEmptyValue={!values.calories.trim()}
                  hasValue={Boolean(values.calories.trim())}
                  labelClassName={useFloatingBorderLabels
                    ? floatingBorderLabelClassName
                    : useTopRightInlineLabels
                    ? topRightInlineLabelClassName
                    : (useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined)}
                  valueLabelClassName={useFloatingBorderLabels ? floatingBorderLabelClassName : (useTopRightInlineLabels ? topRightInlineLabelClassName : undefined)}
                  emptyValueClassName={useThreeAcrossMetrics ? "pr-7" : undefined}
                  labelPlacement={useFloatingBorderLabels ? "floating-border" : useTopRightInlineLabels ? "top-right" : "side"}
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
                      extraClassName: useThreeAcrossMetrics ? undefined : "pr-16",
                    })}
                    placeholder=""
                  />
                </InlineFieldControl>
              </>
            ),
          })});
  }

  if (hasRpeInput) {
    metricFields.push({ id: "rpe", node: renderMetricCard({
            testId: "measurement-field-rpe",
            width: shareSingleMetricRowWithRpe ? "standard" : "compact",
            gridColumnCount,
            children: (
              <>
                <InlineFieldControl
                  label="/ 10"
                  showEmptyValue={!(rpe ?? "").trim()}
                  hasValue={Boolean((rpe ?? "").trim())}
                  labelClassName={useFloatingBorderLabels
                    ? floatingBorderLabelClassName
                    : useTopRightInlineLabels
                    ? topRightInlineLabelClassName
                    : (useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined)}
                  emptyValueClassName={useThreeAcrossMetrics ? "pr-8" : undefined}
                  valueLabelClassName={useFloatingBorderLabels ? floatingBorderLabelClassName : (useTopRightInlineLabels ? topRightInlineLabelClassName : "bottom-3 right-3 text-[9px] tracking-[0.06em]")}
                  labelPlacement={useFloatingBorderLabels ? "floating-border" : useTopRightInlineLabels ? "top-right" : "side"}
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
                      extraClassName: useThreeAcrossMetrics ? undefined : "pl-18 pr-12 [text-indent:0.45rem]",
                    })}
                    placeholder=""
                  />
                </InlineFieldControl>
              </>
            ),
          })});
  }

  const metricSortOrder = new Map<string, number>();
  metricSortOrder.set("top-field", -10);
  resolvedMetricOrder.forEach((metric, index) => {
    const baseOrder = index * 10;
    if (metric === "reps") {
      metricSortOrder.set("reps", baseOrder);
      metricSortOrder.set("reps-min", baseOrder);
      metricSortOrder.set("reps-max", baseOrder + 1);
      return;
    }

    metricSortOrder.set(metric, baseOrder);
  });
  metricSortOrder.set("rpe", resolvedMetricOrder.length * 10 + 5);

  const orderedMetricFields = [...metricFields].sort(
    (left, right) => (metricSortOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (metricSortOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );

  const metricRows = useThreeAcrossMetrics ? chunkFields(orderedMetricFields, 3) : [orderedMetricFields];
  const useHorizontalScrollLayout = layoutMode === "horizontal-scroll" && !belowRpeContent && orderedMetricFields.length > 0;

  function getHorizontalFieldWidthClassName(fieldId: string) {
    if (fieldId === "top-field") return "w-[5.65rem]";
    if (fieldId === "reps-min" || fieldId === "reps-max") return "w-[6.35rem]";
    if (fieldId === "reps") return "w-[5.85rem]";
    if (fieldId === "weight") return "w-[5.95rem]";
    if (fieldId === "time") return "w-[5.6rem]";
    if (fieldId === "distance") return "w-[5.75rem]";
    if (fieldId === "calories") return "w-[5.55rem]";
    if (fieldId === "rpe") return "w-[5.15rem]";
    return "w-[5.75rem]";
  }

  return (
    <section className={cn(appTokens.measurementPanelStack, useHorizontalScrollLayout ? "space-y-0.5" : undefined, className)} data-field-label-style={contract.fieldLabelStyle} data-testid="measurement-panel">
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
                <div className="w-[52%] min-w-[10.5rem] max-w-[14rem]">{belowRpeContent}</div>
                {belowRpeField?.title ? <InlineFieldLabel label={belowRpeField.title} /> : null}
              </div>
            ),
          }) : null}

          {useHorizontalScrollLayout ? (
            <div className="relative overflow-visible rounded-[1rem]">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-3 bg-gradient-to-r from-[rgb(var(--surface-1-rgb)/0.92)] via-[rgb(var(--surface-1-rgb)/0.38)] to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-5 bg-gradient-to-l from-[rgb(var(--surface-1-rgb)/0.98)] via-[rgb(var(--surface-1-rgb)/0.68)] to-transparent" />
              <div className="hide-scrollbar overflow-x-auto overscroll-contain pr-[0.65rem] pb-0 pt-0 touch-pan-x">
                <div className="flex min-w-max flex-nowrap gap-1.5">
                  {orderedMetricFields.map((field) => (
                    <div key={field.id} className={cn("shrink-0", getHorizontalFieldWidthClassName(field.id))}>
                      {field.node}
                    </div>
                  ))}
                </div>
              </div>
            </div>
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

        {footerContent ? <div className="-mt-9">{footerContent}</div> : null}
      </div>

      {trailingContent ? <div>{trailingContent}</div> : null}
    </section>
  );
}

