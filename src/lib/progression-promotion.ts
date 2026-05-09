export const PROGRESSION_PROMOTION_BASES = [
  "weight_only",
  "reps_only",
  "weight_and_reps",
] as const;

export const REP_PROMOTION_THRESHOLDS = [
  "top_of_range",
  "top_half_of_range",
  "custom",
] as const;

export type ProgressionPromotionBasis = (typeof PROGRESSION_PROMOTION_BASES)[number];
export type RepPromotionThreshold = (typeof REP_PROMOTION_THRESHOLDS)[number];

export type ProgressionPromotionConfig = {
  promotionBasis?: ProgressionPromotionBasis;
  repPromotionThreshold?: RepPromotionThreshold;
  customRepPromotionTarget?: number | null;
};

export const DEFAULT_PROGRESSION_PROMOTION_BASIS: ProgressionPromotionBasis = "weight_and_reps";
export const DEFAULT_REP_PROMOTION_THRESHOLD: RepPromotionThreshold = "top_of_range";

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function normalizePositiveInteger(value: unknown) {
  return isPositiveInteger(value) ? value : null;
}

function normalizeRepRange(args: {
  minReps?: unknown;
  maxReps?: unknown;
}) {
  const minReps = normalizePositiveInteger(args.minReps);
  const maxReps = normalizePositiveInteger(args.maxReps);
  if (minReps === null && maxReps === null) {
    return null;
  }

  const normalizedMin = minReps ?? maxReps;
  const normalizedMax = maxReps ?? minReps;
  if (normalizedMin === null || normalizedMax === null || normalizedMax < normalizedMin) {
    return null;
  }

  return {
    minReps: normalizedMin,
    maxReps: normalizedMax,
  };
}

export function normalizePromotionBasis(
  input: unknown,
  fallback: ProgressionPromotionBasis = DEFAULT_PROGRESSION_PROMOTION_BASIS,
): ProgressionPromotionBasis {
  return PROGRESSION_PROMOTION_BASES.includes(input as ProgressionPromotionBasis)
    ? (input as ProgressionPromotionBasis)
    : fallback;
}

export function normalizeRepPromotionThreshold(
  input: unknown,
  fallback: RepPromotionThreshold = DEFAULT_REP_PROMOTION_THRESHOLD,
): RepPromotionThreshold {
  return REP_PROMOTION_THRESHOLDS.includes(input as RepPromotionThreshold)
    ? (input as RepPromotionThreshold)
    : fallback;
}

export function usesRepsForPromotion(promotionBasis: unknown) {
  return normalizePromotionBasis(promotionBasis) !== "weight_only";
}

export function usesWeightForPromotion(promotionBasis: unknown) {
  return normalizePromotionBasis(promotionBasis) !== "reps_only";
}

export function getRepPromotionTarget(args: {
  minReps?: unknown;
  maxReps?: unknown;
  thresholdType?: unknown;
  customTarget?: unknown;
}) {
  const range = normalizeRepRange({
    minReps: args.minReps,
    maxReps: args.maxReps,
  });
  if (!range) {
    return null;
  }

  const thresholdType = normalizeRepPromotionThreshold(args.thresholdType);
  if (thresholdType === "top_half_of_range") {
    return Math.ceil((range.minReps + range.maxReps) / 2);
  }

  if (thresholdType === "custom") {
    const customTarget = normalizePositiveInteger(args.customTarget);
    if (customTarget !== null && customTarget >= range.minReps && customTarget <= range.maxReps) {
      return customTarget;
    }
  }

  return range.maxReps;
}

export function normalizeProgressionPromotionConfig(args: {
  promotionBasis?: unknown;
  repPromotionThreshold?: unknown;
  customRepPromotionTarget?: unknown;
  fallbackBasis?: ProgressionPromotionBasis;
  fallbackThreshold?: RepPromotionThreshold;
}) {
  const fallbackBasis = args.fallbackBasis ?? DEFAULT_PROGRESSION_PROMOTION_BASIS;
  const fallbackThreshold = args.fallbackThreshold ?? DEFAULT_REP_PROMOTION_THRESHOLD;
  const promotionBasis = normalizePromotionBasis(args.promotionBasis, fallbackBasis);
  let repPromotionThreshold = normalizeRepPromotionThreshold(args.repPromotionThreshold, fallbackThreshold);
  const customRepPromotionTarget = normalizePositiveInteger(args.customRepPromotionTarget);

  if (repPromotionThreshold === "custom" && customRepPromotionTarget === null) {
    repPromotionThreshold = fallbackThreshold;
  }

  return {
    promotionBasis,
    repPromotionThreshold,
    customRepPromotionTarget: repPromotionThreshold === "custom" ? customRepPromotionTarget : null,
  };
}
