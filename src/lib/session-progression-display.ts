import { detectActiveMeasurementsFromTargets } from "@/lib/progression-active-measurements";
import type { PromotionStepFieldId as SharedPromotionStepFieldId } from "@/lib/progression-playbook-ui-options";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";
import type { MeasurementSelection } from "@/lib/exercise-goal-validation";

export type PromotionStepFieldId = SharedPromotionStepFieldId;

export function deriveSessionProgressionSelectedMetrics(targets: {
  measurementType?: string | null;
  repsTarget?: number | null;
  repsMin?: number | null;
  repsMax?: number | null;
  weightMin?: number | null;
  weightMax?: number | null;
  durationSeconds?: number | null;
  distance?: number | null;
  calories?: number | null;
}) {
  return new Set<MeasurementSelection>(
    detectActiveMeasurementsFromTargets({
      measurementType: targets.measurementType,
      repsTarget: targets.repsTarget,
      repsMin: targets.repsMin,
      repsMax: targets.repsMax,
      weightMin: targets.weightMin,
      weightMax: targets.weightMax,
      durationSeconds: targets.durationSeconds,
      distance: targets.distance,
      calories: targets.calories,
    }).filter((value): value is MeasurementSelection => (
      value === "reps"
      || value === "weight"
      || value === "time"
      || value === "distance"
      || value === "calories"
    )),
  );
}

export function getSessionVisiblePromotionStepFieldIds({
  progressionStepPolicy,
  selectedMetrics,
}: {
  progressionStepPolicy?: ProgressionStepPolicy | null;
  selectedMetrics: Set<MeasurementSelection>;
}): PromotionStepFieldId[] {
  if (!progressionStepPolicy) {
    return [];
  }

  const isCardioTarget = progressionStepPolicy.kind === "duration"
    || progressionStepPolicy.kind === "distance"
    || progressionStepPolicy.kind === "pace_or_volume"
    || progressionStepPolicy.equipmentFamily === "cardio";

  if (isCardioTarget) {
    const fields: PromotionStepFieldId[] = [];
    if (selectedMetrics.has("time")) fields.push("duration");
    if (selectedMetrics.has("distance")) fields.push("distance");
    return fields;
  }

  if (progressionStepPolicy.kind === "load" && selectedMetrics.has("weight")) {
    switch (progressionStepPolicy.equipmentFamily) {
      case "barbell":
        return ["barbellLoad"];
      case "dumbbell":
        return ["dumbbellLoad"];
      case "machine":
        return ["machineLoad"];
      case "cable":
        return ["cableLoad"];
      default:
        return ["genericLoad"];
    }
  }

  if (progressionStepPolicy.kind === "reps" && selectedMetrics.has("reps")) {
    return ["bodyweightReps"];
  }

  return [];
}
