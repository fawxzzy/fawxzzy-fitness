"use client";

import { DockButton } from "@/components/layout/BottomActionDock";
import { REST_DAY_TOGGLE_LABEL } from "@/lib/action-labels";

type Props = {
  isRest: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

export function DayRestToggleDockControl({ isRest, onToggle, disabled }: Props) {
  return (
    <DockButton
      type="button"
      intent={isRest ? "toggleActive" : "toggleInactive"}
      aria-pressed={isRest}
      onClick={onToggle}
      disabled={disabled}
    >
      {REST_DAY_TOGGLE_LABEL}
    </DockButton>
  );
}
