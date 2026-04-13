import { Pill } from "@/components/ui/Pill";
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
    <div className={cn("flex flex-wrap gap-1.5", density === "compact" ? "pt-0.5" : "pt-1", className)}>
      {chips.map((chip) => (
        <Pill
          key={chip.label}
          tone={toneMap[chip.tone ?? "default"]}
          className={cn(
            "normal-case tracking-[0.01em]",
            density === "compact" ? "px-2.5 py-1 text-[10px]" : "px-2.5 py-1 text-[10px]",
          )}
        >
          {chip.label}
        </Pill>
      ))}
    </div>
  );
}
