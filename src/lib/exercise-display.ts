import { EXERCISE_OPTIONS } from "@/lib/exercise-options";
import { resolveCanonicalExerciseId } from "@/lib/exercise-id-aliases";

export const UNKNOWN_EXERCISE_LABEL = "Unknown exercise";

const UUID_V4ISH_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLACEHOLDER_NAMES = new Set([
  "placeholder",
  "placeholder exercise",
  "unknown exercise",
  "legacy sentinel",
]);

const canonicalExerciseNameById = new Map<string, string>(
  EXERCISE_OPTIONS.map((exercise) => [resolveCanonicalExerciseId(exercise.id), exercise.name]),
);

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isUuidLike(value: string) {
  return UUID_V4ISH_PATTERN.test(value);
}

export function isExerciseDisplayArtifact(value: string | null | undefined): boolean {
  const normalized = typeof value === "string" ? normalizeWhitespace(value) : "";
  if (!normalized) return true;

  const lowered = normalized.toLowerCase();
  if (PLACEHOLDER_NAMES.has(lowered)) return true;
  if (lowered.includes("legacy sentinel")) return true;
  if (isUuidLike(normalized)) return true;

  return false;
}

export function getCanonicalExerciseName(exerciseId: string | null | undefined): string | null {
  const normalizedId = typeof exerciseId === "string" ? resolveCanonicalExerciseId(exerciseId.trim()) : "";
  if (!normalizedId) return null;
  return canonicalExerciseNameById.get(normalizedId) ?? null;
}

export function normalizeExerciseDisplayName(args: {
  exerciseId?: string | null;
  name?: string | null;
  fallbackName?: string | null;
}): string {
  const normalizedName = typeof args.name === "string" ? normalizeWhitespace(args.name) : "";
  if (normalizedName && !isExerciseDisplayArtifact(normalizedName)) {
    return normalizedName;
  }

  const normalizedFallbackName = typeof args.fallbackName === "string" ? normalizeWhitespace(args.fallbackName) : "";
  if (normalizedFallbackName && !isExerciseDisplayArtifact(normalizedFallbackName)) {
    return normalizedFallbackName;
  }

  return getCanonicalExerciseName(args.exerciseId) ?? UNKNOWN_EXERCISE_LABEL;
}
