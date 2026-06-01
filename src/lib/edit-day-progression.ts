import { createProgressionPlaybookFormState } from "@/lib/progression-playbook-form-state";
import type { SetFlowDirection } from "@/lib/set-flow-directions";

type EditDayProgressionExerciseConfig = {
  playbookId: string | null | undefined;
  config?: Record<string, unknown> | null | undefined;
};

export function resolveEditDayConfigDayAdjustmentDirection(args: EditDayProgressionExerciseConfig & {
  dayIndex: number;
}): SetFlowDirection | null {
  if (!args.playbookId || args.dayIndex < 1) {
    return null;
  }

  const state = createProgressionPlaybookFormState({
    playbookId: args.playbookId,
    config: args.config ?? null,
  });

  if (!state.progressionPlaybookId) {
    return null;
  }

  return state.progressionEffortWaveDirections[args.dayIndex - 1] ?? "straight";
}

export function resolveEditDayAutoProgressionState(args: {
  exercises: EditDayProgressionExerciseConfig[];
  dayIndex: number;
}): {
  showDayAdjustmentControl: boolean;
  initialDayAdjustmentDirection: SetFlowDirection;
} {
  const directions = args.exercises
    .map((exercise) => resolveEditDayConfigDayAdjustmentDirection({
      playbookId: exercise.playbookId,
      config: exercise.config ?? null,
      dayIndex: args.dayIndex,
    }))
    .filter((direction): direction is SetFlowDirection => Boolean(direction));
  const uniqueDirections = Array.from(new Set(directions));

  return {
    showDayAdjustmentControl: directions.length > 0,
    initialDayAdjustmentDirection: uniqueDirections.length === 1
      ? uniqueDirections[0]!
      : "straight",
  };
}
