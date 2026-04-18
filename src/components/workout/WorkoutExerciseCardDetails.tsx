import { MetricGrid, type MetricDatum } from "@/components/ui/MetricItem";
import { WorkoutCardChipRow } from "@/components/workout/WorkoutCardChipRow";
import { cn } from "@/lib/cn";
import type { WorkoutCardChip, WorkoutCardDensity } from "@/lib/workout-card-view-models";

export function WorkoutExerciseCardDetails({
  chips,
  density = "compact",
  detailedMetrics = [],
  className,
}: {
  chips: WorkoutCardChip[];
  density?: WorkoutCardDensity;
  detailedMetrics?: MetricDatum[];
  className?: string;
}) {
  const visibleChips = density === "compact" ? chips.slice(0, 2) : chips;
  const visibleMetrics = density === "detailed" ? detailedMetrics : [];

  if (visibleChips.length === 0 && visibleMetrics.length === 0) {
    return null;
  }

  return (
    <div className={cn("min-w-0 space-y-1.5", density === "compact" ? "space-y-1" : undefined, className)}>
      {visibleChips.length > 0 ? <WorkoutCardChipRow density={density} chips={visibleChips} /> : null}
      {visibleMetrics.length > 0 ? (
        <MetricGrid
          items={visibleMetrics.slice(0, 4)}
          compact
          className="min-w-0 gap-1.5"
        />
      ) : null}
    </div>
  );
}
