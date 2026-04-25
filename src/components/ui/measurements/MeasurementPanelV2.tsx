"use client";

import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
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
const bottomRightInlineLabelClassName = "top-auto bottom-3 right-3 translate-y-0 text-[9px] tracking-[0.08em] text-[rgb(var(--text-muted)/0.6)]";
const lowerBottomRightInlineLabelClassName = "top-auto bottom-1 right-3 translate-y-0 text-[9px] tracking-[0.08em] text-[rgb(var(--text-muted)/0.6)]";

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
    return "w-full max-w-[22.75rem]";
  }

  if (fieldCount === 2) {
    return "w-full max-w-[20.75rem]";
  }

  return gridColumnCount === 3
    ? "w-[calc((100%-1.25rem)/3)] min-w-[6.375rem] max-w-[7.25rem]"
    : "w-[calc((100%-0.625rem)/2)] min-w-[8.75rem] max-w-[10rem]";
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
        "min-h-0 min-w-0 overflow-hidden border-transparent bg-transparent px-0 py-0 shadow-none",
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

function InlineFieldLabel({ label, className }: { label: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 whitespace-pre-line text-right text-[10px] font-semibold uppercase leading-[1.02] tracking-[0.1em] text-[rgb(var(--text-muted)/0.54)]",
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
}: {
  label: string;
  children: ReactNode;
  labelClassName?: string;
  showEmptyValue?: boolean;
  emptyValueClassName?: string;
  hasValue?: boolean;
  valueLabelClassName?: string;
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
        className={
          hasValue
            ? cn(
                "top-auto bottom-3 right-3 translate-y-0 text-[9px] tracking-[0.08em] text-[rgb(var(--text-muted)/0.6)]",
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
  extraClassName,
}: {
  tripleRow?: boolean;
  hasValue?: boolean;
  extraClassName?: string;
}) {
  return cn(
    valueInputClassName,
    tripleRow
      ? hasValue
        ? "pl-3.5 pr-8 pb-4 pt-2.5 text-left"
        : "pl-3.5 pr-8 text-left"
      : hasValue
        ? "pl-3.5 pr-14 pb-4 pt-2.5 text-left"
        : "pl-3.5 pr-14 text-left",
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
          >
            {topField.renderInput
              ? topField.renderInput({
                  inputClassName: getInputClassName({
                    tripleRow: useThreeAcrossMetrics,
                    hasValue: topField.hasValue,
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
              showEmptyValue={!values.reps.trim()}
              hasValue={Boolean(values.reps.trim())}
              labelClassName={lowerBottomRightInlineLabelClassName}
              valueLabelClassName="bottom-1"
              emptyValueClassName={useThreeAcrossMetrics ? "pr-7" : undefined}
            >
              <input
                name={names?.reps}
                type="text"
                inputMode="text"
                value={values.reps}
                onChange={(event) => {
                  onChange({ reps: sanitizeIntegerInput(event.target.value) });
                }}
                className={getInputClassName({ tripleRow: useThreeAcrossMetrics, hasValue: Boolean(values.reps.trim()) })}
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
              showEmptyValue={!(values.repsMax ?? "").trim()}
              hasValue={Boolean((values.repsMax ?? "").trim())}
              labelClassName={lowerBottomRightInlineLabelClassName}
              valueLabelClassName="bottom-1"
              emptyValueClassName={useThreeAcrossMetrics ? "pr-7" : undefined}
            >
              <input
                name={names?.repsMax}
                type="text"
                inputMode="text"
                value={values.repsMax ?? ""}
                onChange={(event) => {
                  onChange({ repsMax: sanitizeIntegerInput(event.target.value) });
                }}
                className={getInputClassName({ tripleRow: useThreeAcrossMetrics, hasValue: Boolean((values.repsMax ?? "").trim()) })}
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
                  labelClassName={useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined}
                  emptyValueClassName={useThreeAcrossMetrics ? "pr-7" : undefined}
                >
                  <input
                    name={names?.reps}
                    type="text"
                    inputMode="text"
                    value={values.reps}
                    onChange={(event) => {
                      onChange({ reps: sanitizeIntegerInput(event.target.value) });
                    }}
                    className={getInputClassName({ tripleRow: useThreeAcrossMetrics, hasValue: Boolean(values.reps.trim()) })}
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
                  labelClassName={useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined}
                  emptyValueClassName={useThreeAcrossMetrics ? "pr-7" : undefined}
                >
                  <input
                    name={names?.weight}
                    type="text"
                    inputMode="text"
                    value={values.weight}
                    onChange={(event) => {
                      onChange({ weight: sanitizeDecimalInput(event.target.value) });
                    }}
                    className={getInputClassName({ tripleRow: useThreeAcrossMetrics, hasValue: Boolean(values.weight.trim()) })}
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
                  labelClassName={useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined}
                  emptyValueClassName={useThreeAcrossMetrics ? "pr-7" : undefined}
                >
                  <input
                    name={names?.duration}
                    type="text"
                    inputMode="text"
                    value={values.duration}
                    onChange={(event) => {
                      onChange({ duration: sanitizeDurationTextInput(event.target.value) });
                    }}
                    className={getInputClassName({ tripleRow: useThreeAcrossMetrics, hasValue: Boolean(values.duration.trim()) })}
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
                  labelClassName={useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined}
                  emptyValueClassName={useThreeAcrossMetrics ? "pr-7" : undefined}
                >
                  <input
                    name={names?.distance}
                    type="text"
                    inputMode="text"
                    value={values.distance}
                    onChange={(event) => {
                      onChange({ distance: sanitizeDecimalInput(event.target.value) });
                    }}
                    className={getInputClassName({ tripleRow: useThreeAcrossMetrics, hasValue: Boolean(values.distance.trim()) })}
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
                  labelClassName={useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined}
                  emptyValueClassName={useThreeAcrossMetrics ? "pr-7" : undefined}
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
                  labelClassName={useThreeAcrossMetrics ? "right-3 text-[9px] tracking-[0.08em]" : undefined}
                  emptyValueClassName={useThreeAcrossMetrics ? "pr-8" : undefined}
                  valueLabelClassName="bottom-3 right-3 text-[9px] tracking-[0.06em]"
                >
                  <input
                    type="text"
                    inputMode="text"
                    value={rpe ?? ""}
                    onChange={(event) => onRpeChange(sanitizeDecimalInput(event.target.value))}
                    className={getInputClassName({
                      tripleRow: useThreeAcrossMetrics,
                      hasValue: Boolean((rpe ?? "").trim()),
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

  return (
    <section className={cn("space-y-2.5", className)} data-field-label-style={contract.fieldLabelStyle} data-testid="measurement-panel">
      {showHeader ? <div className="space-y-0.5">{description ? <p className={appTokens.measurementHeaderMeta}>{description}</p> : null}</div> : null}

      {leadingContent}

      <div className={shellClassName}>
        {showInnerHeader ? (
          <div className="mb-1.5 flex items-center justify-end gap-2">
            <p className={appTokens.measurementHeaderMeta}>{enabledCount}/{hasRpeInput ? "6" : "5"} active</p>
          </div>
        ) : null}

        <div className="space-y-0.5" data-testid="measurement-grid">
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

          {metricRows.map((row, rowIndex) => {
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

        {footerContent ? <div>{footerContent}</div> : null}
      </div>

      {trailingContent ? <div>{trailingContent}</div> : null}
    </section>
  );
}

