const exerciseIconPathOverrides: Record<string, string> = {};

export function getExerciseIconPath(slug: string): string {
  return exerciseIconPathOverrides[slug] ?? `/exercises/icons/${slug}.png`;
}
