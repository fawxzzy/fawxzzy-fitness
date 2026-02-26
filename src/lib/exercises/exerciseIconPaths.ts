const exerciseIconPathOverrides: Record<string, string> = {};

export function getExerciseIconPath(slug: string): string {
  return exerciseIconPathOverrides[slug] ?? `/exercise-icons/${slug}.png`;
}
