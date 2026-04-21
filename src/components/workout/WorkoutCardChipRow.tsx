import { AppBadge } from "@/components/ui/app/AppBadge";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import type { WorkoutCardChip, WorkoutCardDensity, WorkoutCardChipTone } from "@/lib/workout-card-view-models";

const toneMap: Record<WorkoutCardChipTone, "default" | "success" | "warning" | "destructive"> = {
  default: "default",
  success: "success",
  warning: "warning",
  destructive: "destructive",
};

export function WorkoutCardChipRow({
  chips,
  density = "compact",
  className,
}: {
  chips: WorkoutCardChip[];
  density?: WorkoutCardDensity;
  className?: string;
}) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        density === "compact" ? appTokens.workoutCardChipRowCompact : appTokens.workoutCardChipRowDetailed,
        className,
      )}
    >
      {chips.map((chip) => (
        <AppBadge
          key={chip.label}
          tone={toneMap[chip.tone ?? "default"]}
          className={cn(
            density === "compact" ? appTokens.workoutChipCompact : appTokens.workoutChipDetailed,
          )}
        >
          {chip.label}
        </AppBadge>
      ))}
    </div>
  );
}
