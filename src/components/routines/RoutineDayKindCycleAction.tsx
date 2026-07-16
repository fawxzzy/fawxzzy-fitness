"use client";

import { cn } from "@/lib/cn";
import {
  getNextRoutineDayKind,
  getRoutineDayKindLabel,
  type RoutineDayKind,
} from "@/lib/routine-day-kind";

type Props = {
  dayKind: RoutineDayKind;
  dayName: string;
  onCycle: () => void;
  disabled?: boolean;
  isPending?: boolean;
  className: string;
};

export function RoutineDayKindCycleAction({
  dayKind,
  dayName,
  onCycle,
  disabled = false,
  isPending = false,
  className,
}: Props) {
  const nextDayKind = getNextRoutineDayKind(dayKind);

  return (
    <button
      type="button"
      data-bottom-action-intent={nextDayKind === "required" ? "toggleActive" : "toggleInactive"}
      onClick={onCycle}
      disabled={disabled}
      aria-label={`Change ${dayName} from ${getRoutineDayKindLabel(dayKind)} to ${getRoutineDayKindLabel(nextDayKind)}`}
      className={className}
    >
      <span className={cn("bottom-action__label", isPending ? "opacity-65" : undefined)}>
        {isPending ? "Saving..." : `Set ${getRoutineDayKindLabel(nextDayKind)}`}
      </span>
    </button>
  );
}
