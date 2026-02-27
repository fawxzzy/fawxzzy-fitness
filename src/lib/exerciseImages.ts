export type ExerciseImageSource = {
  slug?: string | null;
  name: string;
  image_path?: string | null;
  image_icon_path?: string | null;
};

export function slugifyExerciseName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getExerciseIconSrc(exercise: ExerciseImageSource): string {
  const explicitPath = exercise.image_path?.trim() || exercise.image_icon_path?.trim();
  if (explicitPath?.startsWith("/")) {
    return explicitPath;
  }

  const sourceSlug = exercise.slug?.trim();
  if (sourceSlug) {
    return `/exercises/icons/${slugifyExerciseName(sourceSlug)}.png`;
  }

  const nameSlug = slugifyExerciseName(exercise.name);
  if (nameSlug) {
    return `/exercises/icons/${nameSlug}.png`;
  }

  return "/exercises/icons/_placeholder.svg";
}
