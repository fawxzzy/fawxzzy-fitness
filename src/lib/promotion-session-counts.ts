import type { ProgressionMeasurementKey } from "@/lib/progression-active-measurements";

export type PromotionSessionCountMap = Partial<Record<ProgressionMeasurementKey, number>>;
export type PromotionGroupedSessionCountMap = Record<string, number>;
export type PromotionSessionCountFieldMap = Partial<Record<ProgressionMeasurementKey, string>>;
export type PromotionGroupedSessionCountFieldMap = Record<string, string>;

const PROMOTION_SESSION_COUNT_KEYS: ProgressionMeasurementKey[] = [
  "time",
  "distance",
  "reps",
  "weight",
  "calories",
];

function parsePositiveInteger(input: unknown) {
  if (typeof input !== "number" || !Number.isInteger(input) || input <= 0) {
    return null;
  }

  return input;
}

function parsePositiveIntegerString(input: unknown) {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!/^\d+$/u.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? trimmed : null;
}

export function getPromotionMeasurementGroupKey(group: ProgressionMeasurementKey[]) {
  return group.filter((measurement) => measurement !== "calories").join("+");
}

export function buildDefaultPromotionSessionCountFieldMap(defaultValue: string): PromotionSessionCountFieldMap {
  const fallback = parsePositiveIntegerString(defaultValue) ?? "1";

  return {
    time: fallback,
    distance: fallback,
    reps: fallback,
    weight: fallback,
  };
}

export function normalizePromotionSessionCountMap(input: unknown): PromotionSessionCountMap | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const nextMap: PromotionSessionCountMap = {};
  for (const key of PROMOTION_SESSION_COUNT_KEYS) {
    const parsed = parsePositiveInteger((input as Record<string, unknown>)[key]);
    if (parsed !== null) {
      nextMap[key] = parsed;
    }
  }

  return Object.keys(nextMap).length > 0 ? nextMap : undefined;
}

export function normalizePromotionGroupedSessionCountMap(input: unknown): PromotionGroupedSessionCountMap | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const nextMap: PromotionGroupedSessionCountMap = {};
  for (const [key, rawValue] of Object.entries(input as Record<string, unknown>)) {
    const parsed = parsePositiveInteger(rawValue);
    if (parsed !== null && key.trim().length > 0) {
      nextMap[key] = parsed;
    }
  }

  return Object.keys(nextMap).length > 0 ? nextMap : undefined;
}

export function buildPromotionSessionCountFieldMap(args: {
  defaultValue: string;
  savedCounts?: PromotionSessionCountMap | undefined;
}): PromotionSessionCountFieldMap {
  const nextMap = buildDefaultPromotionSessionCountFieldMap(args.defaultValue);
  for (const key of PROMOTION_SESSION_COUNT_KEYS) {
    const savedValue = args.savedCounts?.[key];
    if (typeof savedValue === "number" && savedValue > 0) {
      nextMap[key] = String(savedValue);
    }
  }

  return nextMap;
}

export function buildPromotionGroupedSessionCountFieldMap(
  input: PromotionGroupedSessionCountMap | undefined,
): PromotionGroupedSessionCountFieldMap {
  const nextMap: PromotionGroupedSessionCountFieldMap = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (Number.isInteger(value) && value > 0) {
      nextMap[key] = String(value);
    }
  }
  return nextMap;
}

export function serializePromotionSessionCountFieldMap(
  input: PromotionSessionCountFieldMap,
): PromotionSessionCountMap | undefined {
  const nextMap: PromotionSessionCountMap = {};
  for (const key of PROMOTION_SESSION_COUNT_KEYS) {
    const parsed = parsePositiveIntegerString(input[key]);
    if (parsed) {
      nextMap[key] = Number(parsed);
    }
  }

  return Object.keys(nextMap).length > 0 ? nextMap : undefined;
}

export function serializePromotionGroupedSessionCountFieldMap(
  input: PromotionGroupedSessionCountFieldMap,
): PromotionGroupedSessionCountMap | undefined {
  const nextMap: PromotionGroupedSessionCountMap = {};
  for (const [key, rawValue] of Object.entries(input)) {
    const parsed = parsePositiveIntegerString(rawValue);
    if (parsed && key.trim().length > 0) {
      nextMap[key] = Number(parsed);
    }
  }

  return Object.keys(nextMap).length > 0 ? nextMap : undefined;
}

export function ensurePromotionGroupedSessionCountFieldMap(args: {
  groups: ProgressionMeasurementKey[][];
  measurementCounts: PromotionSessionCountFieldMap;
  groupedCounts: PromotionGroupedSessionCountFieldMap;
  fallbackValue: string;
}): PromotionGroupedSessionCountFieldMap {
  const fallback = parsePositiveIntegerString(args.fallbackValue) ?? "1";
  const nextMap: PromotionGroupedSessionCountFieldMap = { ...args.groupedCounts };

  for (const group of args.groups) {
    if (group.length < 2) {
      continue;
    }

    const key = getPromotionMeasurementGroupKey(group);
    if (!key || nextMap[key]) {
      continue;
    }

    const firstMeasurement = group[0];
    const measurementValue = firstMeasurement ? parsePositiveIntegerString(args.measurementCounts[firstMeasurement]) : null;
    nextMap[key] = measurementValue ?? fallback;
  }

  return nextMap;
}
