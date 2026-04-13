import { PillButton } from "@/components/ui/Pill";
import { EQUIPMENT_ACCESS_OPTIONS } from "../constants.ts";
import type { CuratedOnboardingData, EquipmentAccess } from "../types.ts";

export function EquipmentStep({
  data,
  onToggle,
}: {
  data: CuratedOnboardingData;
  onToggle: (value: EquipmentAccess) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-slate-300">Choose every setup the routine should safely rely on.</p>
      <div className="flex flex-wrap gap-2">
        {EQUIPMENT_ACCESS_OPTIONS.map((option) => (
          <PillButton
            key={option.value}
            active={data.equipment.includes(option.value)}
            onClick={() => onToggle(option.value)}
          >
            {option.label}
          </PillButton>
        ))}
      </div>
    </div>
  );
}
