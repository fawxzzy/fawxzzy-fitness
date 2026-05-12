"use client";

import { DockButton } from "@/components/layout/BottomActionDock";
import { NORMALIZED_ACTION_LABELS } from "@/lib/action-labels";

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
      {isRest ? NORMALIZED_ACTION_LABELS.resting : NORMALIZED_ACTION_LABELS.training}
    </DockButton>
  );
}
