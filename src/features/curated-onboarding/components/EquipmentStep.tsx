import { appTokens } from "@/components/ui/app/tokens";
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
    <div className={appTokens.curatedCompactStack}>
      <p className={appTokens.curatedBodyText}>Choose every setup the routine should safely rely on.</p>
      <div className={appTokens.curatedPillRow}>
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
