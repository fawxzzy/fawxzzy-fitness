import { Pill } from "@/components/ui/Pill";

export function WorkoutExerciseRowChips({ chips }: { chips: Array<"skipped" | "addedToday"> }) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      {chips.includes("addedToday") ? <Pill tone="success" className="normal-case tracking-normal">Added today</Pill> : null}
      {chips.includes("skipped") ? <Pill tone="warning" className="normal-case tracking-normal">Skipped</Pill> : null}
    </div>
  );
}
