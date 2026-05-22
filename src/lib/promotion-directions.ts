import type { ProgressionMeasurementKey } from "@/lib/progression-active-measurements";
import type { SetFlowDirection } from "@/lib/set-flow-directions";

export type PromotionDirectionMap = Partial<Record<ProgressionMeasurementKey, SetFlowDirection>>;
export type PromotionDirectionFieldMap = Partial<Record<ProgressionMeasurementKey, SetFlowDirection>>;
export type PromotionGroupedDirectionMap = Record<string, SetFlowDirection>;
export type PromotionGroupedDirectionFieldMap = Record<string, SetFlowDirection>;

const PROMOTION_DIRECTION_KEYS: ProgressionMeasurementKey[] = [
  "time",
  "distance",
  "reps",
  "weight",
  "calories",
];

function normalizeDirection(input: unknown): SetFlowDirection | null {
  return input === "up" || input === "down" || input === "straight"
    ? input
    : null;
}

export function buildDefaultPromotionDirectionFieldMap(): PromotionDirectionFieldMap {
  return {
    time: "up",
    distance: "up",
    reps: "up",
    weight: "up",
  };
}

export function normalizePromotionDirectionMap(input: unknown): PromotionDirectionMap | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const nextMap: PromotionDirectionMap = {};
  for (const key of PROMOTION_DIRECTION_KEYS) {
    const parsed = normalizeDirection((input as Record<string, unknown>)[key]);
    if (parsed) {
      nextMap[key] = parsed;
    }
  }

  return Object.keys(nextMap).length > 0 ? nextMap : undefined;
}

export function buildPromotionDirectionFieldMap(
  savedDirections?: PromotionDirectionMap | undefined,
): PromotionDirectionFieldMap {
  const nextMap = buildDefaultPromotionDirectionFieldMap();

  for (const key of PROMOTION_DIRECTION_KEYS) {
    const savedValue = savedDirections?.[key];
    if (savedValue === "up" || savedValue === "down" || savedValue === "straight") {
      nextMap[key] = savedValue;
    }
  }

  return nextMap;
}

export function normalizePromotionGroupedDirectionMap(input: unknown): PromotionGroupedDirectionMap | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const nextMap: PromotionGroupedDirectionMap = {};
  for (const [key, rawValue] of Object.entries(input as Record<string, unknown>)) {
    const parsed = normalizeDirection(rawValue);
    if (parsed && key.trim().length > 0) {
      nextMap[key] = parsed;
    }
  }

  return Object.keys(nextMap).length > 0 ? nextMap : undefined;
}

export function buildPromotionGroupedDirectionFieldMap(
  savedDirections?: PromotionGroupedDirectionMap | undefined,
): PromotionGroupedDirectionFieldMap {
  const nextMap: PromotionGroupedDirectionFieldMap = {};
  for (const [key, value] of Object.entries(savedDirections ?? {})) {
    const parsed = normalizeDirection(value);
    if (parsed && key.trim().length > 0) {
      nextMap[key] = parsed;
    }
  }

  return nextMap;
}

export function serializePromotionDirectionFieldMap(
  input: PromotionDirectionFieldMap,
): PromotionDirectionMap | undefined {
  const nextMap: PromotionDirectionMap = {};

  for (const key of PROMOTION_DIRECTION_KEYS) {
    const parsed = normalizeDirection(input[key]);
    if (parsed) {
      nextMap[key] = parsed;
    }
  }

  return Object.keys(nextMap).length > 0 ? nextMap : undefined;
}

export function serializePromotionGroupedDirectionFieldMap(
  input: PromotionGroupedDirectionFieldMap,
): PromotionGroupedDirectionMap | undefined {
  const nextMap: PromotionGroupedDirectionMap = {};

  for (const [key, rawValue] of Object.entries(input)) {
    const parsed = normalizeDirection(rawValue);
    if (parsed && key.trim().length > 0) {
      nextMap[key] = parsed;
    }
  }

  return Object.keys(nextMap).length > 0 ? nextMap : undefined;
}
