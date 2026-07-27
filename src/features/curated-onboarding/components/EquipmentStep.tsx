import { PillButton } from "@/components/ui/Pill";
import { EQUIPMENT_ACCESS_OPTIONS } from "../constants.ts";
import type { CuratedOnboardingData, EquipmentAccess } from "../types.ts";
import { CuratedInfoCard } from "./CuratedOnboardingPrimitives";

export function EquipmentStep({
  data,
  onToggle,
}: {
  data: CuratedOnboardingData;
  onToggle: (value: EquipmentAccess) => void;
}) {
  return (
    <CuratedInfoCard>
      <div className="flex flex-wrap justify-center gap-2">
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
    </CuratedInfoCard>
  );
}
