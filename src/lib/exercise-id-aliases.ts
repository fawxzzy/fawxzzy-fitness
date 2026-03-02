const LEGACY_EXERCISE_ID_ALIASES: Record<string, string> = {
  "66666666-6666-6666-6666-666666666666": "de1f9f53-120f-4f4e-88b4-bd30f6ce1240",
};

export function resolveCanonicalExerciseId(exerciseId: string): string {
  const normalized = exerciseId.trim();
  return LEGACY_EXERCISE_ID_ALIASES[normalized] ?? normalized;
}
