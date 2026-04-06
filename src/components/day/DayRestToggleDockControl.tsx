"use client";

import { DockButton } from "@/components/layout/BottomActionDock";

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
      {isRest ? "Active" : "Inactive"}
    </DockButton>
  );
}
