import type { SetFlowId } from "@/lib/progression-playbooks";

export const SET_FLOW_DIRECTION_KEYS = [
  "time",
  "distance",
  "reps",
  "weight",
] as const;

export type SetFlowDirectionKey = (typeof SET_FLOW_DIRECTION_KEYS)[number];
export type SetFlowDirection = "straight" | "up" | "down";
export type SetFlowDirectionConfig = Record<SetFlowDirectionKey, SetFlowDirection>;

export const DEFAULT_SET_FLOW_DIRECTION_CONFIG: SetFlowDirectionConfig = {
  time: "straight",
  distance: "straight",
  reps: "straight",
  weight: "straight",
};

const VALID_DIRECTIONS = new Set<SetFlowDirection>(["straight", "up", "down"]);

export function isSetFlowDirection(value: unknown): value is SetFlowDirection {
  return VALID_DIRECTIONS.has(value as SetFlowDirection);
}

export function getSetFlowDirectionConfigForLegacySetFlow(setFlow?: SetFlowId | string | null): SetFlowDirectionConfig {
  switch (setFlow) {
  case "ascending_ramp":
    return {
      time: "up",
      distance: "up",
      reps: "down",
      weight: "up",
    };
  case "descending_backoff":
    return {
      time: "down",
      distance: "down",
      reps: "up",
      weight: "down",
    };
  case "straight_sets":
  default:
    return { ...DEFAULT_SET_FLOW_DIRECTION_CONFIG };
  }
}

export function normalizeSetFlowDirectionConfig(
  input: unknown,
  fallback?: SetFlowDirectionConfig | null,
): SetFlowDirectionConfig {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const fallbackConfig = fallback ?? DEFAULT_SET_FLOW_DIRECTION_CONFIG;

  return {
    time: isSetFlowDirection(source.time) ? source.time : fallbackConfig.time,
    distance: isSetFlowDirection(source.distance) ? source.distance : fallbackConfig.distance,
    reps: isSetFlowDirection(source.reps) ? source.reps : fallbackConfig.reps,
    weight: isSetFlowDirection(source.weight) ? source.weight : fallbackConfig.weight,
  };
}

export function inferLegacySetFlowFromDirections(directions: SetFlowDirectionConfig): SetFlowId {
  if (
    directions.time === "up"
    && directions.distance === "up"
    && directions.reps === "down"
    && directions.weight === "up"
  ) {
    return "ascending_ramp";
  }

  if (
    directions.time === "down"
    && directions.distance === "down"
    && directions.reps === "up"
    && directions.weight === "down"
  ) {
    return "descending_backoff";
  }

  return "straight_sets";
}

export function areSetFlowDirectionsStraight(directions: SetFlowDirectionConfig) {
  return SET_FLOW_DIRECTION_KEYS.every((key) => directions[key] === "straight");
}

export function hasSetFlowDirectionStepValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 && value.trim() !== "-";
}

export function cycleSetFlowDirection(args: {
  current: SetFlowDirection;
  hasStepValue: boolean;
}) {
  if (args.hasStepValue) {
    if (args.current === "straight") {
      return "up";
    }
    return args.current === "down" ? "up" : "down";
  }

  if (args.current === "straight") {
    return "up";
  }

  if (args.current === "up") {
    return "down";
  }

  return "straight";
}

export function normalizeSetFlowDirectionForStepValue(args: {
  current: SetFlowDirection;
  nextValue: string | null | undefined;
}) {
  if (!hasSetFlowDirectionStepValue(args.nextValue)) {
    return "straight";
  }

  if (args.current !== "straight") {
    return args.current;
  }

  return "up";
}

export function shouldShowEffortShiftLabel(direction: SetFlowDirection) {
  return direction !== "straight";
}
