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
}: {
  nameDefaultValue?: string;
  cycleLengthDefaultValue: number;
  startWeekdayDefaultValue: string;
  timezoneDefaultValue: string;
  weightUnitDefaultValue: string;
  titleInput?: boolean;
}) {
  return (
    <>
      <label className="block text-sm font-medium text-text">
        Routine Name
        <input
          name="name"
          required
          defaultValue={nameDefaultValue}
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
            className={controlClassName}
          />
        </label>

        <AppListboxField
          label="Starts On"
          name="startWeekday"
          required
          defaultValue={startWeekdayDefaultValue}
          options={weekdayOptions}
        />

        <AppListboxField
          label="Timezone"
          name="timezone"
          required
          defaultValue={timezoneDefaultValue}
          options={timezoneOptions}
        />

        <AppListboxField
          label="Weight Unit"
          name="weightUnit"
          defaultValue={weightUnitDefaultValue}
          options={weightUnitOptions}
        />
      </div>
    </>
  );
}
