import {
  FUTURE_SET_FLOW_DEFINITIONS,
  SET_FLOW_DEFINITIONS,
  TRAINING_GOAL_DEFINITIONS,
  type FutureSetFlowId,
  type ProgressionInfoTermDefinition,
  type ProgressionMeasurementType,
  type SetFlowId,
  type TrainingGoalId,
} from "@/lib/progression-playbooks";

export { FUTURE_SET_FLOW_DEFINITIONS, SET_FLOW_DEFINITIONS };
export type { FutureSetFlowId, SetFlowId };

export function listSupportedSetFlowDefinitions() {
  return Object.values(SET_FLOW_DEFINITIONS);
}

export function listFutureSetFlowDefinitions() {
  return Object.values(FUTURE_SET_FLOW_DEFINITIONS);
}

export function normalizeSetFlowId(value: unknown): SetFlowId | null {
  if (value === "top_set_backoff") {
    return "straight_sets";
  }

  return value && Object.prototype.hasOwnProperty.call(SET_FLOW_DEFINITIONS, value as PropertyKey)
    ? (value as SetFlowId)
    : null;
}

export function getDefaultSetFlowForTrainingGoal(trainingGoal: TrainingGoalId): SetFlowId {
  return TRAINING_GOAL_DEFINITIONS[trainingGoal]?.defaultModel.setFlow ?? "straight_sets";
}

export function getSetFlowDescription(setFlow: SetFlowId) {
  return SET_FLOW_DEFINITIONS[setFlow].shortExplanation;
}

export function getSetFlowInfoTerm(setFlow: SetFlowId): ProgressionInfoTermDefinition {
  switch (setFlow) {
  case "straight_sets":
    return {
      term: "Straight Sets",
      meaning: "Same target across work sets.",
      affects: "Keeps today's set arrangement simple and repeatable.",
      example: "135 x 10, 135 x 10, 135 x 10.",
    };
  case "ascending_ramp":
    return {
      term: "Ascending Sets",
      meaning: "Load increases across sets while reps usually move down.",
      affects: "Builds toward heavier work across the exercise.",
      example: "95 x 10, 115 x 8, 135 x 6.",
    };
  case "descending_backoff":
    return {
      term: "Descending Sets",
      meaning: "Start heavier, then reduce load and accumulate reps.",
      affects: "Combines a heavier first effort with cleaner volume after.",
      example: "185 x 5, 165 x 8, 155 x 10.",
    };
  }
}

export function isSetFlowSupportedForMeasurementType(
  setFlow: SetFlowId,
  measurementType: ProgressionMeasurementType,
) {
  if (measurementType === "none") {
    return false;
  }

  if (measurementType === "time" || measurementType === "distance" || measurementType === "time_distance") {
    return setFlow === "straight_sets";
  }

  return true;
}
