import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import type { ProgressionPlaybookFormState } from "@/lib/progression-playbook-form-state";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";
import type { MeasurementSelection } from "@/lib/exercise-goal-validation";

export type PromotionStepFieldId =
  | "barbellLoad"
  | "dumbbellLoad"
  | "machineLoad"
  | "cableLoad"
  | "genericLoad"
  | "bodyweightReps"
  | "duration"
  | "distance";

export type SessionProgressionDisplayField = {
  label: string;
  value: string;
};

export type SessionProgressionEditorFieldId =
  | PromotionStepFieldId
  | "setFlowLoad"
  | "setFlowReps"
  | "setFlowDuration"
  | "setFlowDistance"
  | "stallThreshold";

export type SessionProgressionEditorField = SessionProgressionDisplayField & {
  id: SessionProgressionEditorFieldId;
};

export type SessionProgressionDisplayGroup = {
  key: "promotion-step-settings" | "set-step-settings" | "deload-settings";
  title: string;
  tone: "primary" | "secondary";
  fields: SessionProgressionDisplayField[];
};

export type SessionProgressionEditorGroup = {
  key: "promotion-step-settings" | "set-step-settings" | "deload-settings";
  title: string;
  tone: "primary" | "secondary";
  fields: SessionProgressionEditorField[];
};

function getVisibleSetStepFields({
  selectedMetrics,
  weightUnit,
  distanceUnit,
  state,
}: {
  selectedMetrics: Set<MeasurementSelection>;
  weightUnit: "lbs" | "kg";
  distanceUnit: FitnessDistanceUnit;
  state: ProgressionPlaybookFormState;
}): SessionProgressionEditorField[] {
  const fields: SessionProgressionEditorField[] = [];

  if (selectedMetrics.has("weight")) {
    fields.push({ id: "setFlowLoad", label: `SET WEIGHT (${weightUnit})`, value: state.progressionSetFlowLoadStep });
  }
  if (selectedMetrics.has("reps")) {
    fields.push({ id: "setFlowReps", label: "SET REPS", value: state.progressionSetFlowRepStep });
  }
  if (selectedMetrics.has("time")) {
    fields.push({ id: "setFlowDuration", label: "SET TIME (S)", value: state.progressionSetFlowDurationStep });
  }
  if (selectedMetrics.has("distance")) {
    fields.push({ id: "setFlowDistance", label: `SET DIST (${distanceUnit})`, value: state.progressionSetFlowDistanceStep });
  }

  return fields;
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

export function buildSessionProgressionDisplayGroups({
  state,
  weightUnit,
  distanceUnit,
  visiblePromotionStepFields,
  selectedMetrics,
}: {
  state: ProgressionPlaybookFormState;
  weightUnit: "lbs" | "kg";
  distanceUnit: FitnessDistanceUnit;
  visiblePromotionStepFields: PromotionStepFieldId[];
  selectedMetrics: Set<MeasurementSelection>;
}): SessionProgressionDisplayGroup[] {
  return buildSessionProgressionEditorGroups({
    state,
    weightUnit,
    distanceUnit,
    visiblePromotionStepFields,
    selectedMetrics,
  }).map((group) => ({
    ...group,
    fields: group.fields.map(({ label, value }) => ({ label, value: value || "-" })),
  }));
}

export function buildSessionProgressionEditorGroups({
  state,
  weightUnit,
  distanceUnit,
  visiblePromotionStepFields,
  selectedMetrics,
}: {
  state: ProgressionPlaybookFormState;
  weightUnit: "lbs" | "kg";
  distanceUnit: FitnessDistanceUnit;
  visiblePromotionStepFields: PromotionStepFieldId[];
  selectedMetrics: Set<MeasurementSelection>;
}): SessionProgressionEditorGroup[] {
  const groups: SessionProgressionEditorGroup[] = [];

  if (state.progressionPlaybookId && visiblePromotionStepFields.length > 0) {
    const rowsByFieldId: Record<PromotionStepFieldId, SessionProgressionEditorField> = {
      barbellLoad: { id: "barbellLoad", label: `BARBELL (${weightUnit})`, value: state.progressionBarbellLoadIncrement },
      dumbbellLoad: { id: "dumbbellLoad", label: `DUMBBELL (${weightUnit})`, value: state.progressionDumbbellLoadIncrement },
      machineLoad: { id: "machineLoad", label: `MACHINE (${weightUnit})`, value: state.progressionMachineLoadIncrement },
      cableLoad: { id: "cableLoad", label: `CABLE (${weightUnit})`, value: state.progressionCableLoadIncrement },
      genericLoad: { id: "genericLoad", label: `WEIGHT (${weightUnit})`, value: state.progressionLoadIncrement },
      bodyweightReps: { id: "bodyweightReps", label: "BODYWEIGHT REPS", value: state.progressionBodyweightRepIncrement },
      duration: { id: "duration", label: "DURATION (S)", value: state.progressionDurationIncrementSeconds },
      distance: { id: "distance", label: `DIST (${distanceUnit})`, value: state.progressionDistanceIncrement },
    };

    groups.push({
      key: "promotion-step-settings",
      title: "Promotion Step Settings",
      tone: "primary",
      fields: visiblePromotionStepFields.map((fieldId) => rowsByFieldId[fieldId]),
    });
  }

  const visibleSetStepFields = getVisibleSetStepFields({
    selectedMetrics,
    weightUnit,
    distanceUnit,
    state,
  });

  if (state.progressionPlaybookId && state.progressionSetFlow !== "straight_sets" && visibleSetStepFields.length > 0) {
    groups.push({
      key: "set-step-settings",
      title: "Set Step Settings",
      tone: "primary",
      fields: visibleSetStepFields,
    });
  }

  if (state.progressionPlaybookId && state.progressionStallPolicy === "deload_after_stall") {
    groups.push({
      key: "deload-settings",
      title: "Regression Settings",
      tone: "secondary",
      fields: [
        { id: "stallThreshold", label: "FAILURE COUNT", value: state.progressionStallThreshold },
      ],
    });
  }

  return groups;
}
