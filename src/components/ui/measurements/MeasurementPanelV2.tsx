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
  const [minutes = "", secondsParts = ""] = cleaned.split(/:(.*)/s);
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

  return gridColumnCount === 3 ? "min-[360px]:col-span-3" : "min-[360px]:col-span-2";
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
        "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-muted)/0.54)]",
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
            "pointer-events-none absolute inset-0 flex items-center justify-center text-[15px] font-semibold tabular-nums text-[rgb(var(--text-muted)/0.72)]",
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
        ? "px-4 pb-4 pt-2.5 text-center"
        : "px-4 text-center"
      : hasValue
        ? "px-4 pb-4 pt-2.5 text-center"
        : "pl-20 pr-14 text-center [text-indent:0.45rem]",
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
  visibleMetrics,
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
    title: string;
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
  };
  visibleMetrics?: Array<keyof MeasurementMetrics>;
}) {
  const enabledCount = Object.values(activeMetrics).filter(Boolean).length;
  const resolvedDistanceUnit = values.distanceUnit === "km" || values.distanceUnit === "m" ? values.distanceUnit : "mi";

  const hasRpeInput = typeof onRpeChange === "function";
  const contract = resolveScreenContract("exerciseLog");
  const allowedMetrics = new Set<keyof MeasurementMetrics>(visibleMetrics ?? ["reps", "weight", "time", "distance", "calories"]);
  const standardMetrics = (["reps", "weight", "time", "distance", "calories"] as const).filter((metric) => allowedMetrics.has(metric));
  const singlePrimaryMetric = standardMetrics.length === 1 ? standardMetrics[0] : null;
  const usesRepRange = "repsMax" in values;
  const visibleInlineFieldCount = standardMetrics.length + (hasRpeInput ? 1 : 0);
  const shareSingleMetricRowWithRpe = hasRpeInput && standardMetrics.length === 1;
  const useThreeAcrossMetrics = !topField && !usesRepRange && visibleInlineFieldCount >= 3;
  const gridColumnCount: 2 | 3 = useThreeAcrossMetrics ? 3 : 2;
  const metricFields: Array<{ id: string; node: ReactNode }> = [];

  if (allowedMetrics.has("reps")) {
    metricFields.push({ id: "reps", node: renderMetricCard({
            testId: "measurement-field-reps",
            width: usesRepRange
              ? "wide"
              : shareSingleMetricRowWithRpe
                ? "standard"
                : singlePrimaryMetric === "reps"
                  ? "wide"
                  : (useThreeAcrossMetrics ? "compact" : "standard"),
            gridColumnCount,
            children: (
              <>
                {usesRepRange ? (
                  <div className="mt-2 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                    <label className={cn("space-y-1", appTokens.measurementHeaderMeta)}>
                      <InlineFieldControl label="Min" showEmptyValue={!values.reps.trim()}>
                        <input
                          name={names?.reps}
                          type="text"
                          inputMode="text"
                          value={values.reps}
                          onChange={(event) => {
                            onChange({ reps: sanitizeIntegerInput(event.target.value) });
                          }}
                          className={getInputClassName({ extraClassName: "" })}
                          placeholder=""
                        />
                      </InlineFieldControl>
                    </label>
                    <label className={cn("space-y-1", appTokens.measurementHeaderMeta)}>
                      <InlineFieldControl label="Max" showEmptyValue={!(values.repsMax ?? "").trim()}>
                        <input
                          name={names?.repsMax}
                          type="text"
                          inputMode="text"
                          value={values.repsMax ?? ""}
                          onChange={(event) => {
                            onChange({ repsMax: sanitizeIntegerInput(event.target.value) });
                          }}
                          className={getInputClassName({ extraClassName: "" })}
                          placeholder=""
                        />
                      </InlineFieldControl>
                    </label>
                  </div>
                ) : (
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
                )}
              </>
            ),
          })});
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

  const metricRows = useThreeAcrossMetrics ? chunkFields(metricFields, 3) : [metricFields];

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

        <div className="space-y-2" data-testid="measurement-grid">
          {topField ? renderMetricCard({
            testId: "measurement-field-summary",
            width: "wide",
            gridColumnCount,
            children: (
              <>
                <StatFieldLabel title={topField.title} suffix={topField.suffix} emphasis="target" />
                <div className="mt-2">{topField.input}</div>
              </>
            ),
          }) : null}

          {metricRows.map((row, rowIndex) => {
            if (row.length === 1) {
              return (
                <div key={`measurement-row-${rowIndex}`} className="flex justify-center">
                  <div className="w-full min-[360px]:w-[calc((100%-0.625rem)/2)]">
                    {row[0]?.node}
                  </div>
                </div>
              );
            }

            const rowClassName = row.length === 3
              ? "grid grid-cols-1 gap-x-2.5 gap-y-2 min-[360px]:grid-cols-3"
              : "grid grid-cols-1 gap-x-2.5 gap-y-2 min-[360px]:grid-cols-2";

            return (
              <div key={`measurement-row-${rowIndex}`} className={rowClassName}>
                {row.map((field) => (
                  <div key={field.id} className="min-w-0">
                    {field.node}
                  </div>
                ))}
              </div>
            );
          })}

          {belowRpeContent ? renderMetricCard({
            testId: "measurement-field-secondary",
            width: belowRpeField?.width ?? "wide",
            gridColumnCount,
            children: (
              <div className="relative h-full">
                <div className="h-full">{belowRpeContent}</div>
                {belowRpeField?.title ? <InlineFieldLabel label={belowRpeField.title} /> : null}
              </div>
            ),
          }) : null}
        </div>

        {footerContent ? <div>{footerContent}</div> : null}
      </div>

      {trailingContent ? <div>{trailingContent}</div> : null}
    </section>
  );
}
