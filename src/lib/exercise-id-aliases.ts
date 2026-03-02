import { EXERCISE_OPTIONS } from "@/lib/exercise-options";

const LEGACY_EXERCISE_ID_ALIASES: Record<string, string> = {
  "66666666-6666-6666-6666-666666666666": "de1f9f53-120f-4f4e-88b4-bd30f6ce1240",
};

const LEGACY_EXERCISE_IDS = new Set<string>([
  ...Object.keys(LEGACY_EXERCISE_ID_ALIASES),
  ...EXERCISE_OPTIONS.map((exercise) => exercise.id),
]);

export function resolveCanonicalExerciseId(exerciseId: string): string {
  const normalized = exerciseId.trim();
  return LEGACY_EXERCISE_ID_ALIASES[normalized] ?? normalized;
}

export function isKnownLegacyExerciseId(exerciseId: string): boolean {
  return LEGACY_EXERCISE_IDS.has(exerciseId.trim());
}
