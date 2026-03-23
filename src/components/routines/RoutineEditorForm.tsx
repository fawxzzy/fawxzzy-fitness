import { AppListboxField } from "@/components/ui/AppListboxField";
import { controlClassName } from "@/components/ui/formClasses";
import { getRoutineTimezoneLabel, ROUTINE_TIMEZONE_OPTIONS } from "@/lib/timezones";
import { ROUTINE_START_WEEKDAYS } from "@/lib/routines";

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

export function RoutineEditorFormFields({
  nameDefaultValue,
  cycleLengthDefaultValue,
  startWeekdayDefaultValue,
  timezoneDefaultValue,
  weightUnitDefaultValue,
  titleInput = false,
  values,
  onFieldChange,
}: {
  nameDefaultValue?: string;
  cycleLengthDefaultValue: number;
  startWeekdayDefaultValue: string;
  timezoneDefaultValue: string;
  weightUnitDefaultValue: string;
  titleInput?: boolean;
  values?: Partial<{ name: string; cycleLengthDays: number; startWeekday: string; timezone: string; weightUnit: string }>;
  onFieldChange?: (field: string, value: string) => void;
}) {
  return (
    <>
      <label className="block text-sm font-medium text-text">
        Routine Name
        <input
          name="name"
          required
          defaultValue={nameDefaultValue}
          value={values?.name}
          onChange={(event) => onFieldChange?.("name", event.target.value)}
          aria-label="Routine Name"
          placeholder="Push/Pull/Legs"
          className={titleInput ? controlClassName.replace("h-11", "h-12") : controlClassName}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-text">
          Cycle Length (Days)
          <input
            type="number"
            name="cycleLengthDays"
            min={1}
            max={365}
            required
            defaultValue={cycleLengthDefaultValue}
            value={values?.cycleLengthDays ?? undefined}
            onChange={(event) => onFieldChange?.("cycleLengthDays", event.target.value)}
            className={controlClassName}
          />
        </label>

        <AppListboxField
          label="Starts On"
          name="startWeekday"
          required
          defaultValue={startWeekdayDefaultValue}
          value={values?.startWeekday}
          onValueChange={(value) => onFieldChange?.("startWeekday", value)}
          options={weekdayOptions}
        />

        <AppListboxField
          label="Timezone"
          name="timezone"
          required
          defaultValue={timezoneDefaultValue}
          value={values?.timezone}
          onValueChange={(value) => onFieldChange?.("timezone", value)}
          options={timezoneOptions}
        />

        <AppListboxField
          label="Weight Unit"
          name="weightUnit"
          defaultValue={weightUnitDefaultValue}
          value={values?.weightUnit}
          onValueChange={(value) => onFieldChange?.("weightUnit", value)}
          options={weightUnitOptions}
        />
      </div>
    </>
  );
}
