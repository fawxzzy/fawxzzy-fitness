import { Pill } from "@/components/ui/Pill";

export function WorkoutExerciseRowChips({ chips, progressLabel }: { chips: Array<"skipped" | "endedEarly" | "loggedProgress" | "addedToday">; progressLabel?: string }) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      {chips.includes("addedToday") ? <Pill tone="success" className="normal-case tracking-normal">Added today</Pill> : null}
      {chips.includes("loggedProgress") ? <Pill tone="default" className="normal-case tracking-normal">{progressLabel ?? "Logged"}</Pill> : null}
      {chips.includes("endedEarly") ? <Pill tone="warning" className="normal-case tracking-normal">Ended early</Pill> : null}
      {chips.includes("skipped") ? <Pill tone="warning" className="normal-case tracking-normal">Skipped</Pill> : null}
    </div>
  );
}
