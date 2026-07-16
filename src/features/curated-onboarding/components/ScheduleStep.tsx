import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DAYS_PER_WEEK_OPTIONS, SESSION_LENGTH_OPTIONS } from "../constants.ts";
import type { CuratedOnboardingData } from "../types.ts";
import { CuratedInfoCard } from "./CuratedOnboardingPrimitives";

export function ScheduleStep({
  data,
  onDaysChange,
  onSessionLengthChange,
}: {
  data: CuratedOnboardingData;
  onDaysChange: (value: number) => void;
  onSessionLengthChange: (value: number) => void;
}) {
  return (
    <CuratedInfoCard className="space-y-4">
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent)/0.94)]">Training days</p>
        <SegmentedControl
          value={data.daysPerWeek ? String(data.daysPerWeek) : ""}
          onChange={(value) => onDaysChange(Number(value))}
          options={DAYS_PER_WEEK_OPTIONS.map((value) => ({
            value: String(value),
            label: String(value),
          }))}
          size="sm"
        />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent)/0.94)]">Session length</p>
        <SegmentedControl
          value={data.sessionLengthMinutes ? String(data.sessionLengthMinutes) : ""}
          onChange={(value) => onSessionLengthChange(Number(value))}
          options={SESSION_LENGTH_OPTIONS.map((value) => ({
            value: String(value),
            label: `${value}m`,
          }))}
          size="sm"
        />
      </div>
    </CuratedInfoCard>
  );
}
