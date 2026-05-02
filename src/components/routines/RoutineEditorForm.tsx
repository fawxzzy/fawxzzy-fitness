import type { ReactNode } from "react";
import {
  ACTION_CHROME_CONTROL_CLASS_NAME,
  ACTION_CHROME_RAIL_CLASS_NAME,
  ACTION_CHROME_RAIL_GRID_CLASS_NAME,
  ACTION_CHROME_SEGMENTED_CLASS_NAME,
} from "@/components/ui/actionChrome";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { ROUTINE_START_WEEKDAYS } from "@/lib/routines";
import { getRoutineTimezoneLabel, ROUTINE_TIMEZONE_OPTIONS } from "@/lib/timezones";

const weekdayOptions = ROUTINE_START_WEEKDAYS.map((weekday) => ({
  value: weekday,
  label: weekday.slice(0, 1).toUpperCase() + weekday.slice(1, 3),
}));

const timezoneOptions = ROUTINE_TIMEZONE_OPTIONS.map((timeZoneOption) => ({
  value: timeZoneOption,
  label: getRoutineTimezoneLabel(timeZoneOption),
}));

const weightUnitOptions = [
  { value: "lbs", label: "lbs" },
  { value: "kg", label: "kg" },
] as const;

const distanceUnitOptions = [
  { value: "mi", label: "mi" },
  { value: "km", label: "km" },
] as const;

export type RoutineEditorFieldName =
  | "name"
  | "cycleLengthDays"
  | "startWeekday"
  | "timezone"
  | "weightUnit"
  | "distanceUnit";

function buildCoveredWeekdayIndexes(startWeekday: string | undefined, cycleLengthDays: number | undefined) {
  const startIndex = ROUTINE_START_WEEKDAYS.findIndex((weekday) => weekday === startWeekday);
  const normalizedStartIndex = startIndex >= 0 ? startIndex : 0;
  const normalizedCycleLength = Number.isFinite(cycleLengthDays) ? Math.max(1, Math.floor(cycleLengthDays as number)) : 1;
  const coveredIndexSet = new Set<number>();
  const visibleCoveredDays = Math.min(normalizedCycleLength, ROUTINE_START_WEEKDAYS.length);

  for (let offset = 0; offset < visibleCoveredDays; offset += 1) {
    coveredIndexSet.add((normalizedStartIndex + offset) % ROUTINE_START_WEEKDAYS.length);
  }

  return {
    coveredIndexSet,
    normalizedStartIndex,
    overflowDays: Math.max(0, normalizedCycleLength - ROUTINE_START_WEEKDAYS.length),
  };
}

function RoutineEditorControlCaption({
  label,
  detail,
}: {
  label: string;
  detail?: ReactNode;
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.92)]">{label}</p>
      {detail ? <p className="mt-1 text-[10px] text-[rgb(var(--text-muted)/0.82)]">{detail}</p> : null}
    </div>
  );
}

function RoutineEditorSegmentedField({
  label,
  ariaLabel,
  value,
  onChange,
  options,
  detail,
}: {
  label: string;
  ariaLabel: string;
  value: string | undefined;
  onChange?: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  detail?: ReactNode;
}) {
  return (
    <div>
      <RoutineEditorControlCaption label={label} detail={detail} />
      <div className="mt-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <SegmentedControl
          ariaLabel={ariaLabel}
          options={options.map((option) => ({ label: option.label, value: option.value }))}
          value={value ?? options[0]?.value ?? ""}
          onChange={onChange}
          size="sm"
          activeIntent="positive"
          className="min-w-max"
        />
      </div>
    </div>
  );
}

function RoutineEditorWeekdayField({
  value,
  cycleLengthDays,
  onChange,
}: {
  value: string | undefined;
  cycleLengthDays: number | undefined;
  onChange?: (value: string) => void;
}) {
  const { coveredIndexSet, normalizedStartIndex, overflowDays } = buildCoveredWeekdayIndexes(value, cycleLengthDays);

  return (
    <div>
      <RoutineEditorControlCaption
        label="Starts On"
        detail={overflowDays > 0 ? `+${overflowDays} more day${overflowDays === 1 ? "" : "s"} continue into next week` : undefined}
      />
      <div className="mt-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className={cn(ACTION_CHROME_RAIL_CLASS_NAME, ACTION_CHROME_RAIL_GRID_CLASS_NAME, "min-w-max")}>
          {weekdayOptions.map((option, index) => {
            const isStartDay = index === normalizedStartIndex;
            const isCoveredDay = coveredIndexSet.has(index);

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange?.(option.value)}
                data-action-chrome-intent={isStartDay ? "positive" : isCoveredDay ? "info" : "neutral"}
                data-action-chrome-selected={isStartDay || isCoveredDay ? "true" : undefined}
                data-action-chrome-segmented="true"
                className={cn(
                  ACTION_CHROME_CONTROL_CLASS_NAME,
                  ACTION_CHROME_SEGMENTED_CLASS_NAME,
                  "min-h-10 min-w-[3.35rem] rounded-[var(--action-chrome-segment-radius-compact)] px-3 text-[11px] font-semibold uppercase tracking-[0.14em] focus-visible:ring-[rgb(var(--accent)/0.2)]",
                  isStartDay
                    ? "border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] text-[rgb(var(--text-primary))] shadow-[var(--action-chrome-shadow-hover)]"
                    : isCoveredDay
                      ? "border-[rgb(var(--accent)/0.46)] bg-[linear-gradient(180deg,rgba(71,215,196,0.18),rgba(18,31,48,0.94))] ring-1 ring-[rgb(var(--accent)/0.12)] text-[rgb(var(--text-primary)/0.96)] shadow-[0_8px_18px_rgb(0_0_0_/0.18)]"
                      : "text-[rgb(var(--text-secondary)/0.9)]",
                )}
                aria-pressed={isStartDay}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RoutineEditorTextField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className="block">
      <LabeledEditorField label={label} className={className}>
        {children}
      </LabeledEditorField>
    </label>
  );
}

export function RoutineEditorFormFields({
  nameDefaultValue,
  cycleLengthDefaultValue,
  cycleLengthInputValue,
  startWeekdayDefaultValue,
  timezoneDefaultValue,
  weightUnitDefaultValue,
  distanceUnitDefaultValue,
  titleInput = false,
  values,
  onFieldChange,
  onCycleLengthInputChange,
  onCycleLengthInputCommit,
  fields,
}: {
  nameDefaultValue?: string;
  cycleLengthDefaultValue: number;
  cycleLengthInputValue?: string;
  startWeekdayDefaultValue: string;
  timezoneDefaultValue: string;
  weightUnitDefaultValue: string;
  distanceUnitDefaultValue: string;
  titleInput?: boolean;
  values?: Partial<{ name: string; cycleLengthDays: number; startWeekday: string; timezone: string; weightUnit: string; distanceUnit: string }>;
  onFieldChange?: (field: string, value: string) => void;
  onCycleLengthInputChange?: (value: string) => void;
  onCycleLengthInputCommit?: () => void;
  fields?: readonly RoutineEditorFieldName[];
}) {
  const visibleFields = new Set<RoutineEditorFieldName>(fields ?? ["name", "cycleLengthDays", "startWeekday", "timezone", "weightUnit", "distanceUnit"]);
  const showName = visibleFields.has("name");
  const showCycleLength = visibleFields.has("cycleLengthDays");
  const showStartWeekday = visibleFields.has("startWeekday");
  const showTimezone = visibleFields.has("timezone");
  const showWeightUnit = visibleFields.has("weightUnit");
  const showDistanceUnit = visibleFields.has("distanceUnit");
  const resolvedCycleLength = values?.cycleLengthDays ?? cycleLengthDefaultValue;

  return (
    <>
      {showName || showCycleLength ? (
        <div className={cn(showName && showCycleLength ? "grid grid-cols-12 gap-3 items-start" : "space-y-3")}>
          {showName ? (
            <div className={showCycleLength ? "col-span-7" : undefined}>
      <RoutineEditorTextField label="Routine">
                <input
                  name="name"
                  required
                  maxLength={15}
                  defaultValue={nameDefaultValue}
                  value={values?.name}
                  onChange={(event) => onFieldChange?.("name", event.target.value)}
                  aria-label="Routine Name"
                  placeholder="Push/Pull/Legs"
                  className={cn(
                    labeledEditorFieldControlClassName,
                    "min-h-[2.65rem] px-3.5 pt-3.5",
                    titleInput ? "text-base" : undefined,
                  )}
                />
              </RoutineEditorTextField>
            </div>
          ) : null}

          {showCycleLength ? (
            <div className={showName ? "col-span-5" : undefined}>
              <RoutineEditorTextField label="Length">
                <input
                  type="text"
                  inputMode="numeric"
                  enterKeyHint="done"
                  pattern="[0-9]*"
                  name="cycleLengthDays"
                  min={1}
                  max={365}
                  required
                  value={cycleLengthInputValue ?? String(values?.cycleLengthDays ?? cycleLengthDefaultValue)}
                  onChange={(event) => {
                    if (onCycleLengthInputChange) {
                      onCycleLengthInputChange(event.target.value);
                      return;
                    }

                    onFieldChange?.("cycleLengthDays", event.target.value);
                  }}
                  onBlur={() => onCycleLengthInputCommit?.()}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") {
                      return;
                    }

                    event.preventDefault();
                    onCycleLengthInputCommit?.();
                  }}
                  className={cn(labeledEditorFieldControlClassName, "min-h-[2.65rem] px-3.5 pt-3.5")}
                />
              </RoutineEditorTextField>
            </div>
          ) : null}
        </div>
      ) : null}

      {showStartWeekday ? (
        <div className="pt-2">
          <RoutineEditorWeekdayField
            value={values?.startWeekday ?? startWeekdayDefaultValue}
            cycleLengthDays={resolvedCycleLength}
            onChange={(nextValue) => onFieldChange?.("startWeekday", nextValue)}
          />
        </div>
      ) : null}

      {showTimezone ? (
        <RoutineEditorSegmentedField
          label="Timezone"
          ariaLabel="Routine timezone"
          value={values?.timezone ?? timezoneDefaultValue}
          onChange={(nextValue) => onFieldChange?.("timezone", nextValue)}
          options={timezoneOptions}
        />
      ) : null}

      {showWeightUnit || showDistanceUnit ? (
        <div className={cn(showWeightUnit && showDistanceUnit ? "grid grid-cols-2 gap-3 items-start" : "space-y-3")}>
          {showWeightUnit ? (
            <RoutineEditorSegmentedField
              label="Weight Unit"
              ariaLabel="Routine weight unit"
              value={values?.weightUnit ?? weightUnitDefaultValue}
              onChange={(nextValue) => onFieldChange?.("weightUnit", nextValue)}
              options={weightUnitOptions}
            />
          ) : null}

          {showDistanceUnit ? (
            <RoutineEditorSegmentedField
              label="Distance Unit"
              ariaLabel="Routine distance unit"
              value={values?.distanceUnit ?? distanceUnitDefaultValue}
              onChange={(nextValue) => onFieldChange?.("distanceUnit", nextValue)}
              options={distanceUnitOptions}
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
